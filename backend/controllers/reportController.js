const Ticket = require('../models/Ticket');
const Result = require('../models/Result');
const Agent = require('../models/Agent');
const Winner = require('../models/Winner');

// รายงานยอดขาย
const getSalesReport = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const agentId = req.user.agent_code === 'ADMIN' ? null : req.user.agent_id;
        
        // ดึงสถิติยอดขาย
        const stats = await Ticket.getSalesStats(agentId, start_date, end_date);
        
        // ดึงยอดขายแยกตามประเภท
        const salesByType = await Ticket.getSalesByType(agentId, start_date, end_date);
        
        // ดึงรายการบิลทั้งหมด
        const bills = await Ticket.getAllBills(agentId, start_date, end_date);
        
        res.json({
            success: true,
            data: {
                summary: {
                    period: {
                        start_date: start_date || 'ทั้งหมด',
                        end_date: end_date || 'ทั้งหมด'
                    },
                    total_sales: stats.total_sales || 0,
                    total_tickets: stats.total_tickets || 0,
                    total_bills: stats.total_bills || 0,
                    total_buyers: stats.total_buyers || 0,
                    sales_by_type: salesByType.map(item => ({
                        ...item,
                        type_name: getLottoTypeName(item.lotto_type)
                    }))
                },
                bills: bills.map(bill => ({
                    ...bill,
                    created_at: bill.created_at
                }))
            }
        });
        
    } catch (error) {
        console.error('Get sales report error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงรายงานยอดขาย'
        });
    }
};

// รายงานผู้ชนะรางวัล
const getWinnersReport = async (req, res) => {
    try {
        const { period } = req.query;

        // ถ้าไม่ระบุงวด ให้ใช้งวดปัจจุบัน
        let targetPeriod = period;
        if (!targetPeriod) {
            // หาผลรางวัลล่าสุด
            const latestResult = await Result.getLatestResult();
            if (!latestResult) {
                return res.json({
                    success: true,
                    message: 'ยังไม่ประกาศรางวัล',
                    data: {
                        result: null,
                        winners: [],
                        summary: {
                            period: null,
                            result_numbers: {
                                result_2up: null,
                                result_2down: null,
                                result_3up: null
                            },
                            total_winners: 0,
                            total_reward: 0,
                            winners_by_type: []
                        }
                    }
                });
            }
            targetPeriod = latestResult.period;
        }

        // ดึงผลรางวัล
        const result = await Result.getResultByPeriod(targetPeriod);
        if (!result) {
            return res.json({
                success: true,
                message: 'ยังไม่ประกาศรางวัล',
                data: {
                    result: null,
                    winners: [],
                    summary: {
                        period: targetPeriod,
                        result_numbers: {
                            result_2up: null,
                            result_2down: null,
                            result_3up: null
                        },
                        total_winners: 0,
                        total_reward: 0,
                        winners_by_type: []
                    }
                }
            });
        }

        // ตรวจสอบผู้ชนะ
        const winners = await Result.checkWinners(targetPeriod);

        // console.log('=== WINNERS REPORT DEBUG ===');
        // console.log('Total winners found:', winners.length);

        // สรุปผู้ชนะแยกตามประเภท
        const winnersByType = {};
        let totalReward = 0;
        
        winners.forEach(winner => {
            if (!winnersByType[winner.result_type]) {
                // ใช้ type_name ที่ส่งมาจาก Result.checkWinners แทน
                const typeName = winner.type_name || getLottoTypeName(winner.result_type);
                winnersByType[winner.result_type] = {
                    lotto_type: winner.result_type,
                    type_name: typeName,
                    winner_count: 0,
                    total_reward: 0
                };
            }

            winnersByType[winner.result_type].winner_count++;
            winnersByType[winner.result_type].total_reward += winner.reward;
            totalReward += winner.reward;
        });

        // console.log('Total reward calculated:', totalReward);
        // console.log('Winners by type:', winnersByType);

        // ถ้าไม่ใช่ Admin ให้แสดงเฉพาะผู้ชนะของตัวแทนนั้น
        let filteredWinners = winners;
        if (req.user.agent_code !== 'ADMIN') {
            filteredWinners = winners.filter(winner => winner.agent_id === req.user.agent_id);
        }
        
        res.json({
            success: true,
            data: {
                result,
                winners: filteredWinners.map(winner => ({
                    ...winner,
                    type_name: winner.type_name || getLottoTypeName(winner.result_type)
                })),
                summary: {
                    period: targetPeriod,
                    result_numbers: {
                        result_2up: result.result_2up,
                        result_2down: result.result_2down,
                        result_3up: result.result_3up
                    },
                    total_winners: req.user.agent_code === 'ADMIN' ? winners.length : filteredWinners.length,
                    total_reward: req.user.agent_code === 'ADMIN' ? totalReward : filteredWinners.reduce((sum, w) => sum + w.reward, 0),
                    winners_by_type: Object.values(winnersByType)
                }
            }
        });
        
    } catch (error) {
        console.error('Get winners report error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการดึงรายงานผู้ชนะ'
        });
    }
};

// รายงานสรุปรายวัน
const getDailySummary = async (req, res) => {
    try {
        const { date, period_id } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];
        const agentId = req.user.agent_code === 'ADMIN' ? null : req.user.agent_id;

        // ดึงสถิติยอดขายของวันนั้น (กรองตาม period_id ถ้ามี)
        const salesStats = period_id
            ? await Ticket.getSalesStatsByPeriod(agentId, period_id)
            : await Ticket.getSalesStats(agentId, targetDate, targetDate);

        // ดึงยอดขายแยกตามประเภท (กรองตาม period_id ถ้ามี)
        const salesByType = period_id
            ? await Ticket.getSalesByTypePeriod(agentId, period_id)
            : await Ticket.getSalesByType(agentId, targetDate, targetDate);
        
        // ดึงผลรางวัลล่าสุด
        const latestResult = await Result.getLatestResult();
        
        // ถ้ามีผลรางวัลและเป็นวันเดียวกัน ให้ตรวจสอบผู้ชนะ
        let winnersData = null;
        if (latestResult && latestResult.result_date === targetDate) {
            try {
                const winners = await Result.checkWinners(latestResult.period);
                
                // ถ้าไม่ใช่ Admin ให้แสดงเฉพาะผู้ชนะของตัวแทนนั้น
                let filteredWinners = winners;
                if (req.user.agent_code !== 'ADMIN') {
                    filteredWinners = winners.filter(winner => winner.agent_id === req.user.agent_id);
                }
                
                winnersData = {
                    total_winners: filteredWinners.length,
                    total_reward: filteredWinners.reduce((sum, winner) => sum + winner.reward, 0)
                };
            } catch (error) {
                console.warn('Error checking winners for daily summary:', error);
            }
        }
        
        // คำนวณกำไร/ขาดทุน
        const totalSales = salesStats.total_sales || 0;
        const totalReward = winnersData ? winnersData.total_reward : 0;
        const profit = totalSales - totalReward;
        
        res.json({
            success: true,
            data: {
                date: targetDate,
                sales: {
                    total_amount: totalSales,
                    total_tickets: salesStats.total_tickets || 0,
                    total_bills: salesStats.total_bills || 0,
                    by_type: salesByType.map(item => ({
                        ...item,
                        type_name: getLottoTypeName(item.lotto_type)
                    }))
                },
                winners: winnersData,
                profit,
                latest_result: latestResult
            }
        });
        
    } catch (error) {
        console.error('Get daily summary error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงรายงานสรุปรายวัน'
        });
    }
};

// รายงานตัวแทน (Admin เท่านั้น)
const getAgentsReport = async (req, res) => {
    try {
        // แสดงข้อมูลปัจจุบันทั้งหมด ไม่ใช้ filters

        // ดึงข้อมูลตัวแทนทั้งหมด
        const agents = await Agent.getAllAgents();

        // ดึงสถิติของแต่ละตัวแทน (ไม่ส่ง date filters)
        const agentsWithStats = await Promise.all(
            agents.map(async (agent) => {
                const stats = await Agent.getAgentStats(agent.agent_id);
                const salesByType = await Agent.getAgentSalesByType(agent.agent_id);

                // ดึงข้อมูลผู้ชนะของตัวแทนนี้
                const winnerStats = await Agent.getAgentWinnerStats(agent.agent_id);

                // คำนวณกำไร/ขาดทุน (แปลงเป็น number ก่อนคำนวณ)
                const totalSales = parseFloat(stats.total_sales || 0);
                const totalReward = parseFloat(winnerStats.total_reward || 0);
                const profitLoss = totalSales - totalReward;

                return {
                    ...agent,
                    stats: {
                        ...stats,
                        ...winnerStats,
                        profit_loss: profitLoss,
                        sales_by_type: salesByType.map(item => ({
                            ...item,
                            type_name: getLottoTypeName(item.lotto_type)
                        }))
                    }
                };
            })
        );
        
        // // Debug: แสดงข้อมูลของแต่ละตัวแทน
        // console.log('=== DEBUG AGENTS REPORT ===');
        // agentsWithStats.forEach(agent => {
        //     console.log(`Agent: ${agent.agent_name} (${agent.agent_code})`);
        //     console.log(`  - Total Sales: ${agent.stats.total_sales || 0}`);
        //     console.log(`  - Total Tickets: ${agent.stats.total_tickets || 0}`);
        //     console.log(`  - Total Winners: ${agent.stats.total_winners || 0}`);
        //     console.log(`  - Total Reward: ${agent.stats.total_reward || 0}`);
        //     console.log(`  - Profit/Loss: ${agent.stats.profit_loss || 0}`);
        // });

        // คำนวณสถิติรวม (แปลงเป็น number ก่อนบวก)
        const totalStats = agentsWithStats.reduce((acc, agent) => {
            acc.total_tickets += parseInt(agent.stats.total_tickets || 0);
            acc.total_sales += parseFloat(agent.stats.total_sales || 0);
            acc.total_bills += parseInt(agent.stats.total_bills || 0);
            acc.total_buyers += parseInt(agent.stats.total_buyers || 0);
            acc.total_winners += parseInt(agent.stats.total_winners || 0);
            acc.total_reward += parseFloat(agent.stats.total_reward || 0);
            return acc;
        }, {
            total_tickets: 0,
            total_sales: 0,
            total_bills: 0,
            total_buyers: 0,
            total_winners: 0,
            total_reward: 0
        });

        // console.log('=== TOTAL STATS ===');
        // console.log('Total Sales:', totalStats.total_sales);
        // console.log('Total Reward:', totalStats.total_reward);
        // console.log('Profit/Loss:', totalStats.total_sales - totalStats.total_reward);

        // console.log('=== TOTAL STATS ===');
        // console.log(`Total Sales: ${totalStats.total_sales}`);
        // console.log(`Total Tickets: ${totalStats.total_tickets}`);
        // console.log(`Total Winners: ${totalStats.total_winners}`);
        // console.log(`Total Reward: ${totalStats.total_reward}`);
        // console.log('========================');
        
        res.json({
            success: true,
            data: {
                summary: {
                    period: {
                        start_date: 'ทั้งหมด',
                        end_date: 'ทั้งหมด'
                    },
                    total_agents: agents.length,
                    active_agents: agents.filter(a => a.status === 'active').length,
                    ...totalStats
                },
                agents: agentsWithStats
            }
        });
        
    } catch (error) {
        console.error('Get agents report error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงรายงานตัวแทน'
        });
    }
};

// ฟังก์ชันช่วยแปลงชื่อประเภทหวย
const getLottoTypeName = (lottoType) => {
    const typeNames = {
        '2up': '2 ตัวบน',
        '2down': '2 ตัวล่าง',
        '3up': '3 ตัวตรง',
        '3toad': '3 ตัวโต๊ด',
        '3straight_toad': 'ตรงโต๊ด',
        'runup': 'วิ่งบน',
        'rundown': 'วิ่งล่าง'
    };
    return typeNames[lottoType] || lottoType;
};

// รายงานสำหรับ User (ตัวแทน)
const getUserReport = async (req, res) => {
    try {
        // แสดงข้อมูลปัจจุบันทั้งหมด ไม่ใช้ filters
        const agentId = req.user.agent_id;

        // ดึงข้อมูลตัวแทน
        const agent = await Agent.getAgentById(agentId);
        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลตัวแทน'
            });
        }

        // ดึงสถิติการขาย (ไม่ส่ง date filters)
        const salesStats = await Agent.getAgentStats(agentId);
        const salesByType = await Agent.getAgentSalesByType(agentId);

        // ดึงข้อมูลผู้ชนะ
        const winnerStats = await Agent.getAgentWinnerStats(agentId);

        // คำนวณกำไร/ขาดทุน
        const totalSales = salesStats.total_sales || 0;
        const totalReward = winnerStats.total_reward || 0;
        const profitLoss = totalSales - totalReward;

        const responseData = {
            success: true,
            data: {
                agent_info: {
                    agent_code: agent.agent_code,
                    agent_name: agent.agent_name,
                    status: agent.status,
                    income: agent.income || 0
                },
                summary: {
                    period: {
                        start_date: 'ทั้งหมด',
                        end_date: 'ทั้งหมด'
                    },
                    total_sales: totalSales,
                    total_tickets: salesStats.total_tickets || 0,
                    total_bills: salesStats.total_bills || 0,
                    total_buyers: salesStats.total_buyers || 0,
                    total_winners: winnerStats.total_winners || 0,
                    total_reward: totalReward,
                    profit_loss: profitLoss
                },
                sales_by_type: salesByType.map(item => ({
                    ...item,
                    type_name: getLottoTypeName(item.lotto_type)
                }))
            }
        };

        res.json(responseData);

    } catch (error) {
        console.error('Get user report error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงรายงาน'
        });
    }
};

// ดึงข้อมูลสรุปจากตาราง winners (ระบบใหม่)
const getNewAgentsReport = async (req, res) => {
    try {
        const { period_id } = req.query;
        const isAdmin = req.user.role === 'admin';

        // ดึงข้อมูลสรุปตัวแทน
        const agents = await Winner.getAgentsSummary(period_id);

        // ถ้าไม่ใช่ Admin ให้แสดงเฉพาะข้อมูลของตัวเอง
        const filteredAgents = isAdmin ? agents : agents.filter(agent => agent.agent_id === req.user.agent_id);

        // ดึงข้อมูลสรุประบบ
        const systemSummary = await Winner.getSystemSummary(period_id);

        res.json({
            success: true,
            data: {
                agents: filteredAgents,
                summary: systemSummary
            }
        });
    } catch (error) {
        console.error('Error getting new agents report:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงานตัวแทน'
        });
    }
};

// ดึงข้อมูลผู้ชนะจากตาราง winners (ระบบใหม่)
const getNewWinnersReport = async (req, res) => {
    try {
        const { period_id } = req.query;
        const isAdmin = req.user.role === 'admin';
        const agentId = isAdmin ? null : req.user.agent_id;

        // ดึงรายการผู้ชนะ
        const winners = await Winner.getWinnersByPeriod(period_id, agentId);

        // ดึงข้อมูลสรุป
        const summary = await Winner.getWinnersSummary(period_id, agentId);

        // ดึงข้อมูลแยกตามประเภท
        const byType = await Winner.getWinnersByType(period_id, agentId);

        res.json({
            success: true,
            data: {
                winners,
                summary,
                by_type: byType
            }
        });
    } catch (error) {
        console.error('Error getting new winners report:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงานผู้ชนะ'
        });
    }
};

// ดึงข้อมูลสรุปสำหรับ Dashboard
const getDashboardSummary = async (req, res) => {
    try {
        const { period_id } = req.query;
        const isAdmin = req.user.role === 'admin';
        const agentId = isAdmin ? null : req.user.agent_id;

        // ดึงข้อมูลสรุประบบ
        const systemSummary = await Winner.getSystemSummary(period_id);

        // ถ้าไม่ใช่ Admin ให้ดึงข้อมูลเฉพาะตัวแทนนั้น
        if (!isAdmin) {
            const agentSummary = await Winner.getAgentsSummary(period_id);
            const myData = agentSummary.find(agent => agent.agent_id === agentId) || {};

            return res.json({
                success: true,
                data: {
                    total_sales: myData.total_sales || 0,
                    total_tickets: myData.total_tickets || 0,
                    total_bills: myData.total_bills || 0,
                    total_winners: myData.total_winners || 0,
                    total_reward: myData.total_reward || 0,
                    profit_loss: myData.profit_loss || 0,
                    commission: myData.commission || 0,
                    total_agents: 1
                }
            });
        }

        res.json({
            success: true,
            data: systemSummary
        });
    } catch (error) {
        console.error('Error getting dashboard summary:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุป'
        });
    }
};

// รายงานความถี่ของหมายเลขหวย
const getLottoNumberFrequency = async (req, res) => {
    try {
        const { start_date, end_date, lotto_type, page = 1, limit = 50, export_csv } = req.query;
        const agentId = req.user.agent_code === 'ADMIN' ? null : req.user.agent_id;

        // ดึงข้อมูลความถี่ของหมายเลขหวย
        const result = await Ticket.getLottoNumberFrequency(agentId, start_date, end_date, lotto_type, page, limit);

        // ถ้าเป็นการ export CSV
        if (export_csv === 'true') {
            const csvData = result.data.map(item => ({
                หมายเลข: item.lotto_number,
                ประเภท: getLottoTypeName(item.lotto_type),
                ความถี่: item.frequency,
                ยอดขายรวม: item.total_price
            }));

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="lottery_frequency_report.csv"');
            
            // Convert to CSV
            const csvHeader = Object.keys(csvData[0] || {}).join(',');
            const csvRows = csvData.map(row => Object.values(row).join(','));
            const csvContent = [csvHeader, ...csvRows].join('\n');
            
            return res.send('\uFEFF' + csvContent); // Add BOM for UTF-8
        }

        res.json({
            success: true,
            data: {
                summary: {
                    period: {
                        start_date: start_date || 'ทั้งหมด',
                        end_date: end_date || 'ทั้งหมด'
                    },
                    lotto_type: lotto_type || 'ทั้งหมด',
                    total_numbers: result.pagination.totalRecords
                },
                frequency: result.data.map(item => ({
                    ...item,
                    type_name: getLottoTypeName(item.lotto_type)
                })),
                pagination: result.pagination
            }
        });
        
    } catch (error) {
        console.error('Get lotto number frequency error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงรายงานความถี่หมายเลขหวย'
        });
    }
};

module.exports = {
    getSalesReport,
    getWinnersReport,
    getDailySummary,
    getAgentsReport,
    getUserReport,
    getNewAgentsReport,
    getNewWinnersReport,
    getDashboardSummary,
    getLottoNumberFrequency
};
