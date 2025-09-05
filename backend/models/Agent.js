const { promisePool } = require('../config/database');
const bcrypt = require('bcryptjs');

class Agent {
    // ดึงข้อมูลตัวแทนทั้งหมด
    static async getAllAgents() {
        const [rows] = await promisePool.execute(
            'SELECT agent_id, agent_code, agent_name, phone, income, status, role, created_at FROM tbl_agent ORDER BY created_at DESC'
        );
        return rows;
    }

    // ดึงข้อมูลตัวแทนตาม ID
    static async getAgentById(agentId) {
        const [rows] = await promisePool.execute(
            'SELECT agent_id, agent_code, agent_name, phone, income, status, role, created_at FROM tbl_agent WHERE agent_id = ?',
            [agentId]
        );
        return rows[0] || null;
    }

    // ดึงข้อมูลตัวแทนตาม agent_code
    static async getAgentByCode(agentCode) {
        const [rows] = await promisePool.execute(
            'SELECT * FROM tbl_agent WHERE agent_code = ?',
            [agentCode]
        );
        return rows[0] || null;
    }

    // สร้างตัวแทนใหม่
    static async createAgent(agentData) {
        const { agent_code, agent_name, password, phone, income = 0.00, role = 'user' } = agentData;

        // ตรวจสอบว่า agent_code ซ้ำหรือไม่
        const existingAgent = await this.getAgentByCode(agent_code);
        if (existingAgent) {
            throw new Error('รหัสตัวแทนนี้มีอยู่แล้ว');
        }

        // เข้ารหัสรหัสผ่าน
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await promisePool.execute(
            'INSERT INTO tbl_agent (agent_code, agent_name, password, phone, income, role) VALUES (?, ?, ?, ?, ?, ?)',
            [agent_code, agent_name, hashedPassword, phone, parseInt(income) || 0, role]
        );

        return {
            success: true,
            agentId: result.insertId,
            message: 'สร้างตัวแทนสำเร็จ'
        };
    }

    // อัปเดตข้อมูลตัวแทน
    static async updateAgent(agentId, updateData) {
        const { agent_name, phone, income, status, password } = updateData;

        let query = 'UPDATE tbl_agent SET agent_name = ?, phone = ?, income = ?, status = ?';
        let params = [agent_name, phone, parseInt(income) || 0, status];

        // ถ้ามีการเปลี่ยนรหัสผ่าน
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE agent_id = ?';
        params.push(agentId);

        const [result] = await promisePool.execute(query, params);

        if (result.affectedRows === 0) {
            throw new Error('ไม่พบตัวแทนที่ต้องการอัปเดต');
        }

        return {
            success: true,
            message: 'อัปเดตข้อมูลตัวแทนสำเร็จ'
        };
    }

    // ลบตัวแทน
    static async deleteAgent(agentId) {
        // ตรวจสอบว่ามีการซื้อหวยหรือไม่
        const [tickets] = await promisePool.execute(
            'SELECT COUNT(*) as count FROM tbl_ticket WHERE agent_id = ?',
            [agentId]
        );

        if (tickets[0].count > 0) {
            throw new Error('ไม่สามารถลบตัวแทนที่มีประวัติการขายได้');
        }

        const [result] = await promisePool.execute(
            'DELETE FROM tbl_agent WHERE agent_id = ? AND agent_code != "ADMIN"',
            [agentId]
        );

        if (result.affectedRows === 0) {
            throw new Error('ไม่สามารถลบตัวแทนได้');
        }

        return {
            success: true,
            message: 'ลบตัวแทนสำเร็จ'
        };
    }

    // ตรวจสอบรหัสผ่าน
    static async verifyPassword(agentCode, password) {
        const agent = await this.getAgentByCode(agentCode);
        if (!agent) {
            return false;
        }

        return await bcrypt.compare(password, agent.password);
    }

    // ดึงสถิติของตัวแทน
    static async getAgentStats(agentId, startDate = null, endDate = null, periodId = null) {
        let query = `
            SELECT
                COUNT(*) as total_tickets,
                SUM(price) as total_sales,
                COUNT(DISTINCT bill_id) as total_bills,
                COUNT(DISTINCT buyer_name) as total_buyers
            FROM tbl_ticket
            WHERE agent_id = ?
        `;

        let params = [agentId];

        if (periodId) {
            query += ' AND period_id = ?';
            params.push(periodId);
        } else if (startDate && endDate) {
            query += ' AND DATE(created_at) BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        const [rows] = await promisePool.execute(query, params);
        return rows[0];
    }

    // ดึงยอดขายแยกตามประเภท
    static async getAgentSalesByType(agentId, startDate = null, endDate = null, periodId = null) {
        let query = `
            SELECT
                lotto_type,
                COUNT(*) as ticket_count,
                SUM(price) as total_amount
            FROM tbl_ticket 
            WHERE agent_id = ?
        `;
        
        let params = [agentId];

        if (periodId) {
            query += ' AND period_id = ?';
            params.push(periodId);
        } else if (startDate && endDate) {
            query += ' AND DATE(created_at) BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        query += ' GROUP BY lotto_type ORDER BY total_amount DESC';

        const [rows] = await promisePool.execute(query, params);
        return rows;
    }

    // ดึงสถิติผู้ชนะของตัวแทน
    static async getAgentWinnerStats(agentId, startDate = null, endDate = null, periodId = null) {
        try {
            // ดึงผลรางวัลทั้งหมดในช่วงเวลาที่กำหนด
            let resultQuery = 'SELECT * FROM tbl_result WHERE status = "announced"';
            let resultParams = [];

            if (periodId) {
                resultQuery += ' AND period_id = ?';
                resultParams.push(periodId);
            } else if (startDate && endDate) {
                resultQuery += ' AND DATE(result_date) BETWEEN ? AND ?';
                resultParams.push(startDate, endDate);
            }

            const [results] = await promisePool.execute(resultQuery, resultParams);

            let totalWinners = 0;
            let totalReward = 0;

            // ตรวจสอบผู้ชนะในแต่ละงวด
            for (const result of results) {
                // ดึงเลขจ่ายครึ่งราคาของงวดนี้
                const [halfPriceRows] = await promisePool.execute(
                    'SELECT * FROM tbl_half_price_numbers WHERE period = ?',
                    [result.period]
                );

                const halfPriceNumbers = halfPriceRows.map(row => row.number);
                const isHalfPrice = (number) => halfPriceNumbers.includes(number);

                // ตรวจสอบ 2 ตัวบน
                if (result.result_2up) {
                    const [tickets] = await promisePool.execute(
                        `SELECT t.*, s.payout_rate
                         FROM tbl_ticket t
                         JOIN tbl_setting s ON t.lotto_type = s.lotto_type
                         WHERE t.agent_id = ? AND t.lotto_type = '2up' AND t.lotto_number = ?`,
                        [agentId, result.result_2up]
                    );

                    tickets.forEach(ticket => {
                        const isHalf = isHalfPrice(ticket.lotto_number);
                        const finalPayoutRate = isHalf ? ticket.payout_rate / 2 : ticket.payout_rate;
                        totalWinners++;
                        totalReward += ticket.price * finalPayoutRate;
                    });
                }

                // ตรวจสอบ 2 ตัวล่าง
                if (result.result_2down) {
                    const [tickets] = await promisePool.execute(
                        `SELECT t.*, s.payout_rate
                         FROM tbl_ticket t
                         JOIN tbl_setting s ON t.lotto_type = s.lotto_type
                         WHERE t.agent_id = ? AND t.lotto_type = '2down' AND t.lotto_number = ?`,
                        [agentId, result.result_2down]
                    );

                    tickets.forEach(ticket => {
                        const isHalf = isHalfPrice(ticket.lotto_number);
                        const finalPayoutRate = isHalf ? ticket.payout_rate / 2 : ticket.payout_rate;
                        totalWinners++;
                        totalReward += ticket.price * finalPayoutRate;
                    });
                }

                // ตรวจสอบ 3 ตัวตรง
                if (result.result_3up) {
                    const [tickets] = await promisePool.execute(
                        `SELECT t.*, s.payout_rate
                         FROM tbl_ticket t
                         JOIN tbl_setting s ON t.lotto_type = s.lotto_type
                         WHERE t.agent_id = ? AND t.lotto_type = '3up' AND t.lotto_number = ?`,
                        [agentId, result.result_3up]
                    );

                    tickets.forEach(ticket => {
                        const isHalf = isHalfPrice(ticket.lotto_number);
                        const finalPayoutRate = isHalf ? ticket.payout_rate / 2 : ticket.payout_rate;
                        totalWinners++;
                        totalReward += ticket.price * finalPayoutRate;
                    });

                    // ตรวจสอบ 3 ตัวโต๊ด
                    const permutations = this.generatePermutations(result.result_3up);
                    for (const perm of permutations) {
                        const [tickets] = await promisePool.execute(
                            `SELECT t.*, s.payout_rate
                             FROM tbl_ticket t
                             JOIN tbl_setting s ON t.lotto_type = s.lotto_type
                             WHERE t.agent_id = ? AND t.lotto_type = '3toad' AND t.lotto_number = ?`,
                            [agentId, perm]
                        );

                        tickets.forEach(ticket => {
                            const isHalf = isHalfPrice(ticket.lotto_number);
                            const finalPayoutRate = isHalf ? ticket.payout_rate / 2 : ticket.payout_rate;
                            totalWinners++;
                            totalReward += ticket.price * finalPayoutRate;
                        });
                    }
                }

                // ตรวจสอบวิ่งบน (runup) - นับจำนวนครั้งที่ตรง
                if (result.result_3up) {
                    const [runupTickets] = await promisePool.execute(
                        `SELECT t.*, s.payout_rate
                         FROM tbl_ticket t
                         JOIN tbl_setting s ON t.lotto_type = s.lotto_type
                         WHERE t.agent_id = ? AND t.lotto_type = 'runup'`,
                        [agentId]
                    );

                    runupTickets.forEach(ticket => {
                        const betNumber = ticket.lotto_number;
                        const result3upArray = result.result_3up.split('');
                        const matchCount = result3upArray.filter(digit => digit === betNumber).length;

                        if (matchCount > 0) {
                            const isHalf = isHalfPrice(ticket.lotto_number);
                            const finalPayoutRate = isHalf ? ticket.payout_rate / 2 : ticket.payout_rate;
                            const rewardPerMatch = ticket.price * finalPayoutRate;

                           // console.log(`🔍 วิ่งบน: เลข ${betNumber}, ผลรางวัล ${result.result_3up}, ตรง ${matchCount} ครั้ง, รางวัลรวม ${rewardPerMatch * matchCount}`);

                            // เพิ่มผู้ชนะตามจำนวนครั้งที่ตรง
                            for (let i = 0; i < matchCount; i++) {
                                totalWinners++;
                                totalReward += rewardPerMatch;
                            }
                        }
                    });
                }

                // ตรวจสอบวิ่งล่าง (rundown) - นับจำนวนครั้งที่ตรง
                if (result.result_2down) {
                    const [rundownTickets] = await promisePool.execute(
                        `SELECT t.*, s.payout_rate
                         FROM tbl_ticket t
                         JOIN tbl_setting s ON t.lotto_type = s.lotto_type
                         WHERE t.agent_id = ? AND t.lotto_type = 'rundown'`,
                        [agentId]
                    );

                    rundownTickets.forEach(ticket => {
                        const betNumber = ticket.lotto_number;
                        const result2downArray = result.result_2down.split('');
                        const matchCount = result2downArray.filter(digit => digit === betNumber).length;

                        if (matchCount > 0) {
                            const isHalf = isHalfPrice(ticket.lotto_number);
                            const finalPayoutRate = isHalf ? ticket.payout_rate / 2 : ticket.payout_rate;
                            const rewardPerMatch = ticket.price * finalPayoutRate;

                           // console.log(`🔍 วิ่งล่าง: เลข ${betNumber}, ผลรางวัล ${result.result_2down}, ตรง ${matchCount} ครั้ง, รางวัลรวม ${rewardPerMatch * matchCount}`);

                            // เพิ่มผู้ชนะตามจำนวนครั้งที่ตรง
                            for (let i = 0; i < matchCount; i++) {
                                totalWinners++;
                                totalReward += rewardPerMatch;
                            }
                        }
                    });
                }
            }

            // console.log(`🔍 Agent ${agentId} - Total Winners: ${totalWinners}, Total Reward: ${totalReward}`);

            return {
                total_winners: totalWinners,
                total_reward: totalReward,
                profit_loss: 0 // จะคำนวณใน controller
            };

        } catch (error) {
            // Error getting agent winner stats;
            return {
                total_winners: 0,
                total_reward: 0,
                profit_loss: 0
            };
        }
    }

    // สร้างการเรียงสับเปลี่ยนสำหรับ 3 ตัวโต๊ด
    static generatePermutations(number) {
        const digits = number.split('');
        const permutations = [];

        // สร้างการเรียงสับเปลี่ยนทั้งหมด
        const permute = (arr, start = 0) => {
            if (start === arr.length - 1) {
                permutations.push(arr.join(''));
                return;
            }

            for (let i = start; i < arr.length; i++) {
                [arr[start], arr[i]] = [arr[i], arr[start]];
                permute([...arr], start + 1);
                [arr[start], arr[i]] = [arr[i], arr[start]];
            }
        };

        permute(digits);
        return [...new Set(permutations)]; // ลบค่าซ้ำ
    }
}

module.exports = Agent;
