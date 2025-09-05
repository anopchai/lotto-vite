const { promisePool } = require('../config/database');

class Winner {
    // บันทึกผู้ชนะลงฐานข้อมูล
    static async saveWinners(winners) {
        try {
            // เคลียร์ผู้ชนะเก่าของงวดนี้
            if (winners.length > 0) {
                const periodId = winners[0].period_id;
                await promisePool.execute(
                    'DELETE FROM tbl_winners WHERE period_id = ?',
                    [periodId]
                );
            }

            // บันทึกผู้ชนะใหม่
            for (const winner of winners) {
                await promisePool.execute(`
                    INSERT INTO tbl_winners (
                        period_id, agent_id, bill_id, ticket_id, lotto_type, lotto_number,
                        bet_amount, payout_rate, is_half_price, final_payout_rate, 
                        reward_amount, winning_number, result_type
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    winner.period_id,
                    winner.agent_id,
                    winner.bill_id,
                    winner.ticket_id,
                    winner.lotto_type,
                    winner.lotto_number,
                    winner.bet_amount,
                    winner.payout_rate,
                    winner.is_half_price,
                    winner.final_payout_rate,
                    winner.reward_amount,
                    winner.winning_number,
                    winner.result_type
                ]);
            }

            console.log(`✅ บันทึกผู้ชนะ ${winners.length} รายการสำเร็จ`);
            return true;
        } catch (error) {
            console.error('❌ Error saving winners:', error);
            throw error;
        }
    }

    // ดึงผู้ชนะตามงวด
    static async getWinnersByPeriod(periodId, agentId = null) {
        try {
            let query = `
                SELECT w.*, a.agent_name, a.agent_code
                FROM tbl_winners w
                JOIN tbl_agent a ON w.agent_id = a.agent_id
                WHERE w.period_id = ?
            `;
            let params = [periodId];

            if (agentId) {
                query += ' AND w.agent_id = ?';
                params.push(agentId);
            }

            query += ' ORDER BY w.created_at DESC';

            const [rows] = await promisePool.execute(query, params);
            return rows;
        } catch (error) {
            // Error getting winners by period;
            throw error;
        }
    }

    // สรุปผู้ชนะตามงวด
    static async getWinnersSummary(periodId, agentId = null) {
        try {
            let query = `
                SELECT 
                    COUNT(*) as total_winners,
                    SUM(reward_amount) as total_reward,
                    COUNT(DISTINCT agent_id) as total_agents,
                    COUNT(DISTINCT lotto_type) as total_types
                FROM tbl_winners 
                WHERE period_id = ?
            `;
            let params = [periodId];

            if (agentId) {
                query += ' AND agent_id = ?';
                params.push(agentId);
            }

            const [rows] = await promisePool.execute(query, params);
            return rows[0] || {
                total_winners: 0,
                total_reward: 0,
                total_agents: 0,
                total_types: 0
            };
        } catch (error) {
            // Error getting winners summary;
            throw error;
        }
    }

    // สรุปผู้ชนะแยกตามประเภท
    static async getWinnersByType(periodId, agentId = null) {
        try {
            let query = `
                SELECT 
                    lotto_type,
                    result_type,
                    COUNT(*) as winner_count,
                    SUM(reward_amount) as total_reward
                FROM tbl_winners 
                WHERE period_id = ?
            `;
            let params = [periodId];

            if (agentId) {
                query += ' AND agent_id = ?';
                params.push(agentId);
            }

            query += ' GROUP BY lotto_type, result_type ORDER BY total_reward DESC';

            const [rows] = await promisePool.execute(query, params);
            return rows;
        } catch (error) {
            // Error getting winners by type;
            throw error;
        }
    }

    // สรุปผู้ชนะตามตัวแทน
    static async getAgentsSummary(periodId = null) {
        try {
            let query = `
                SELECT 
                    a.agent_id,
                    a.agent_name,
                    a.agent_code,
                    a.income,
                    COALESCE(sales.total_sales, 0) as total_sales,
                    COALESCE(sales.total_tickets, 0) as total_tickets,
                    COALESCE(sales.total_bills, 0) as total_bills,
                    COALESCE(winners.total_winners, 0) as total_winners,
                    COALESCE(winners.total_reward, 0) as total_reward,
                    (COALESCE(sales.total_sales, 0) - COALESCE(winners.total_reward, 0)) as profit_loss,
                    (COALESCE(sales.total_sales, 0) * (a.income / 100)) as commission
                FROM tbl_agent a
                LEFT JOIN (
                    SELECT 
                        agent_id,
                        SUM(price) as total_sales,
                        COUNT(*) as total_tickets,
                        COUNT(DISTINCT bill_id) as total_bills
                    FROM tbl_ticket
                    ${periodId ? 'WHERE period_id = ?' : ''}
                    GROUP BY agent_id
                ) sales ON a.agent_id = sales.agent_id
                LEFT JOIN (
                    SELECT 
                        agent_id,
                        COUNT(*) as total_winners,
                        SUM(reward_amount) as total_reward
                    FROM tbl_winners
                    ${periodId ? 'WHERE period_id = ?' : ''}
                    GROUP BY agent_id
                ) winners ON a.agent_id = winners.agent_id
                ORDER BY total_sales DESC
            `;

            const params = periodId ? [periodId, periodId] : [];
            const [rows] = await promisePool.execute(query, params);
            return rows;
        } catch (error) {
            // Error getting agents summary;
            throw error;
        }
    }

    // สรุปรวมทั้งระบบ
    static async getSystemSummary(periodId = null) {
        try {
            let salesQuery = `
                SELECT 
                    SUM(price) as total_sales,
                    COUNT(*) as total_tickets,
                    COUNT(DISTINCT bill_id) as total_bills,
                    COUNT(DISTINCT agent_id) as total_agents
                FROM tbl_ticket
                ${periodId ? 'WHERE period_id = ?' : ''}
            `;

            let winnersQuery = `
                SELECT 
                    COUNT(*) as total_winners,
                    SUM(reward_amount) as total_reward
                FROM tbl_winners
                ${periodId ? 'WHERE period_id = ?' : ''}
            `;

            const params = periodId ? [periodId] : [];
            
            const [salesRows] = await promisePool.execute(salesQuery, params);
            const [winnersRows] = await promisePool.execute(winnersQuery, params);

            const sales = salesRows[0] || {};
            const winners = winnersRows[0] || {};

            return {
                total_sales: sales.total_sales || 0,
                total_tickets: sales.total_tickets || 0,
                total_bills: sales.total_bills || 0,
                total_agents: sales.total_agents || 0,
                total_winners: winners.total_winners || 0,
                total_reward: winners.total_reward || 0,
                profit_loss: (sales.total_sales || 0) - (winners.total_reward || 0)
            };
        } catch (error) {
            // Error getting system summary;
            throw error;
        }
    }
}

module.exports = Winner;
