const { promisePool } = require('../config/database');
const moment = require('moment');

class Ticket {
    // สร้างบิลหวยใหม่
    static async createTickets(ticketData) {
        const { agent_id, buyer_name, seller_name, tickets, period_id: providedPeriodId } = ticketData;
        const bill_id = `BILL${Date.now()}`;

        const connection = await promisePool.getConnection();

        try {
            await connection.beginTransaction();

            // ใช้ period_id ที่ส่งมา หรือดึงงวดปัจจุบัน
            let period_id = providedPeriodId;

            if (!period_id) {
                const [currentPeriod] = await connection.execute(
                    'SELECT id FROM tbl_period WHERE (status = "current" OR status = "open") AND is_current = 1 LIMIT 1'
                );

                if (currentPeriod.length === 0) {
                    throw new Error('ไม่พบงวดปัจจุบัน กรุณาตั้งค่างวดก่อน');
                }

                period_id = currentPeriod[0].id;
            }

            let totalTickets = 0;
            let totalAmount = 0;

            for (const ticket of tickets) {
                const { lotto_number, lotto_type, price, price_toad, reverse_enabled, is_half_price } = ticket;

                // สำหรับการแทงตรงโต๊ด จะบันทึกเป็น 1 รายการแต่มี price_toad
                if (lotto_type === '3straight_toad') {
                    // บันทึกเป็นรายการเดียวแต่มีทั้ง price และ price_toad
                    await connection.execute(
                        'INSERT INTO tbl_ticket (bill_id, agent_id, period_id, buyer_name, seller_name, lotto_number, lotto_type, price, price_toad, is_reverse, is_half_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [bill_id, agent_id, period_id, buyer_name, seller_name || null, lotto_number, '3straight_toad', price, price_toad || 0, false, is_half_price || false]
                    );
                    totalTickets++;
                    totalAmount += price + (price_toad || 0);
                } else {
                    // สร้างรายการเลขที่จะบันทึก
                    let numbersToSave = [lotto_number];

                    if (reverse_enabled) {
                        numbersToSave = this.generateReverseNumbers(lotto_number, lotto_type);
                    }

                    // บันทึกแต่ละเลข
                    for (const number of numbersToSave) {
                        await connection.execute(
                            'INSERT INTO tbl_ticket (bill_id, agent_id, period_id, buyer_name, seller_name, lotto_number, lotto_type, price, price_toad, is_reverse, is_half_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [bill_id, agent_id, period_id, buyer_name, seller_name || null, number, lotto_type, price, price_toad || 0, reverse_enabled, is_half_price || false]
                        );
                        totalTickets++;
                        totalAmount += price;
                        if (price_toad) totalAmount += price_toad;
                    }
                }
            }
            
            await connection.commit();
            
            return {
                success: true,
                bill_id,
                total_tickets: totalTickets,
                total_amount: totalAmount,
                message: 'บันทึกหวยสำเร็จ'
            };
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    
    // สร้างเลขกลับ
    static generateReverseNumbers(number, lottoType) {
        const numbers = [number];

        if (lottoType === '2up' || lottoType === '2down') {
            // สำหรับ 2 ตัว: 12 -> [12, 21]
            if (number.length === 2) {
                const reversed = number.split('').reverse().join('');
                if (reversed !== number) {
                    numbers.push(reversed);
                }
            }
        } else if (lottoType === '3up') {
            // สำหรับ 3 ตัวตรง: 123 -> [123, 132, 213, 231, 312, 321]
            if (number.length === 3) {
                const chars = number.split('');
                const permutations = [
                    chars[0] + chars[1] + chars[2], // 123
                    chars[0] + chars[2] + chars[1], // 132
                    chars[1] + chars[0] + chars[2], // 213
                    chars[1] + chars[2] + chars[0], // 231
                    chars[2] + chars[0] + chars[1], // 312
                    chars[2] + chars[1] + chars[0]  // 321
                ];

                return [...new Set(permutations)];
            }
        } else if (lottoType === '3toad') {
            // สำหรับ 3 ตัวโต๊ด: ไม่มีกลับเลขแล้ว
            return [number];
        }

        return numbers;
    }
    
    // ดึงข้อมูลตั๋วทั้งหมด (สำหรับ Admin)
    static async getAllTickets(limit = 100, offset = 0) {
        const [rows] = await promisePool.execute(
            `SELECT t.*, a.agent_name 
             FROM tbl_ticket t 
             JOIN tbl_agent a ON t.agent_id = a.agent_id 
             ORDER BY t.created_at DESC 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return rows;
    }
    
    // ดึงข้อมูลตั๋วของตัวแทนเฉพาะ
    static async getTicketsByAgent(agentId, limit = 100, offset = 0) {
        const [rows] = await promisePool.execute(
            `SELECT * FROM tbl_ticket 
             WHERE agent_id = ? 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [agentId, limit, offset]
        );
        return rows;
    }
    
    // ดึงข้อมูลตั๋วตาม bill_id
    static async getTicketsByBillId(billId, agentId = null) {
        let query = `
            SELECT t.*, p.period_name
            FROM tbl_ticket t
            LEFT JOIN tbl_period p ON t.period_id = p.id
            WHERE t.bill_id = ?
        `;
        let params = [billId];

        if (agentId) {
            query += ' AND t.agent_id = ?';
            params.push(agentId);
        }

        query += ' ORDER BY t.created_at ASC';

        const [rows] = await promisePool.execute(query, params);
        return rows;
    }
    
    // ดึงสถิติยอดขาย
    static async getSalesStats(agentId = null, startDate = null, endDate = null) {
        let query = `
            SELECT 
                COUNT(*) as total_tickets,
                SUM(price) as total_sales,
                COUNT(DISTINCT bill_id) as total_bills,
                COUNT(DISTINCT buyer_name) as total_buyers
            FROM tbl_ticket
        `;
        
        let params = [];
        let conditions = [];
        
        if (agentId) {
            conditions.push('agent_id = ?');
            params.push(agentId);
        }
        
        if (startDate && endDate) {
            conditions.push('DATE(created_at) BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        const [rows] = await promisePool.execute(query, params);
        return rows[0];
    }

    // ดึงสถิติยอดขายตาม period_id
    static async getSalesStatsByPeriod(agentId = null, periodId = null) {
        let query = `
            SELECT
                COUNT(*) as total_tickets,
                SUM(price) as total_sales,
                COUNT(DISTINCT bill_id) as total_bills,
                COUNT(DISTINCT buyer_name) as total_buyers
            FROM tbl_ticket
        `;

        let params = [];
        let conditions = [];

        if (agentId) {
            conditions.push('agent_id = ?');
            params.push(agentId);
        }

        if (periodId) {
            conditions.push('period_id = ?');
            params.push(periodId);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        const [rows] = await promisePool.execute(query, params);
        return rows[0];
    }

    // ดึงยอดขายแยกตามประเภท
    static async getSalesByType(agentId = null, startDate = null, endDate = null) {
        let query = `
            SELECT 
                lotto_type,
                COUNT(*) as ticket_count,
                SUM(price) as total_amount
            FROM tbl_ticket
        `;
        
        let params = [];
        let conditions = [];
        
        if (agentId) {
            conditions.push('agent_id = ?');
            params.push(agentId);
        }
        
        if (startDate && endDate) {
            conditions.push('DATE(created_at) BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' GROUP BY lotto_type ORDER BY total_amount DESC';
        
        const [rows] = await promisePool.execute(query, params);
        return rows;
    }
    
    // ดึงรายการบิลทั้งหมด
    static async getAllBills(agentId = null, startDate = null, endDate = null, periodId = null) {
        let query = `
            SELECT
                bill_id,
                agent_id,
                buyer_name,
                MIN(created_at) as created_at,
                COUNT(*) as ticket_count,
                SUM(price) as total_amount
            FROM tbl_ticket
        `;

        let params = [];
        let conditions = [];

        if (agentId) {
            conditions.push('agent_id = ?');
            params.push(agentId);
        }

        if (periodId) {
            conditions.push('period_id = ?');
            params.push(periodId);
        } else if (startDate && endDate) {
            conditions.push('DATE(created_at) BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' GROUP BY bill_id, agent_id, buyer_name ORDER BY created_at DESC';

        const [rows] = await promisePool.execute(query, params);
        return rows;
    }
    
    // ลบบิล (เฉพาะเจ้าของหรือ Admin)
    static async deleteBill(billId, agentId = null) {
        let query = 'DELETE FROM tbl_ticket WHERE bill_id = ?';
        let params = [billId];
        
        if (agentId) {
            query += ' AND agent_id = ?';
            params.push(agentId);
        }
        
        const [result] = await promisePool.execute(query, params);
        
        if (result.affectedRows === 0) {
            throw new Error('ไม่พบบิลที่ต้องการลบ');
        }
        
        return {
            success: true,
            message: 'ลบบิลสำเร็จ',
            deleted_tickets: result.affectedRows
        };
    }
    
    // อัปเดตบิล
    static async updateBill(billId, updateData, agentId = null) {
        const connection = await promisePool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const { buyer_name, tickets, total_amount } = updateData;
            
            // ตรวจสอบว่ามีบิลนี้จริงหรือไม่
            let checkQuery = 'SELECT COUNT(*) as count FROM tbl_ticket WHERE bill_id = ?';
            let checkParams = [billId];
            
            if (agentId) {
                checkQuery += ' AND agent_id = ?';
                checkParams.push(agentId);
            }
            
            const [checkResult] = await connection.execute(checkQuery, checkParams);
            
            if (checkResult[0].count === 0) {
                throw new Error('ไม่พบบิลที่ต้องการอัปเดต หรือคุณไม่มีสิทธิ์ในการแก้ไขบิลนี้');
            }
            
            // ลบตั๋วเก่าทั้งหมดของบิลนี้
            let deleteQuery = 'DELETE FROM tbl_ticket WHERE bill_id = ?';
            let deleteParams = [billId];
            
            if (agentId) {
                deleteQuery += ' AND agent_id = ?';
                deleteParams.push(agentId);
            }
            
            await connection.execute(deleteQuery, deleteParams);
            
            // เพิ่มตั๋วใหม่
            let totalTickets = 0;
            let calculatedTotal = 0;
            
            for (const ticket of tickets) {
                const {
                    lotto_number,
                    lotto_type,
                    price,
                    price_toad = 0,
                    is_new = false
                } = ticket;
                
                // ตรวจสอบข้อมูลตั๋ว
                if (!lotto_number || !lotto_type || !price || price <= 0) {
                    throw new Error('ข้อมูลตั๋วไม่ถูกต้อง');
                }
                
                // ดึงข้อมูลของตัวแทนจากบิลเดิม
                const [billInfo] = await connection.execute(
                    'SELECT agent_id, period_id FROM tbl_ticket WHERE bill_id = ? LIMIT 1',
                    [billId]
                );
                
                let targetAgentId = agentId;
                let targetPeriodId = null;
                
                if (billInfo.length > 0) {
                    targetAgentId = billInfo[0].agent_id;
                    targetPeriodId = billInfo[0].period_id;
                } else {
                    // ถ้าไม่มีข้อมูลเดิม ใช้ข้อมูลจาก request
                    if (!agentId) {
                        // หา agent_id จาก token
                        const [userInfo] = await connection.execute(
                            'SELECT agent_id FROM tbl_agent WHERE agent_code = "ADMIN" LIMIT 1'
                        );
                        targetAgentId = userInfo.length > 0 ? userInfo[0].agent_id : 1;
                    }
                    
                    // ดึงงวดปัจจุบัน
                    const [currentPeriod] = await connection.execute(
                        'SELECT id FROM tbl_period WHERE is_current = 1 LIMIT 1'
                    );
                    targetPeriodId = currentPeriod.length > 0 ? currentPeriod[0].id : null;
                }
                
                // เพิ่มตั๋วใหม่
                await connection.execute(
                    'INSERT INTO tbl_ticket (bill_id, agent_id, period_id, buyer_name, seller_name, lotto_number, lotto_type, price, price_toad, is_reverse, is_half_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        billId,
                        targetAgentId,
                        targetPeriodId,
                        buyer_name,
                        null, // seller_name
                        lotto_number,
                        lotto_type,
                        parseFloat(price),
                        parseFloat(price_toad) || 0,
                        false, // is_reverse
                        false  // is_half_price
                    ]
                );
                
                totalTickets++;
                calculatedTotal += parseFloat(price);
                if (price_toad) {
                    calculatedTotal += parseFloat(price_toad);
                }
            }
            
            await connection.commit();
            
            return {
                success: true,
                bill_id: billId,
                total_tickets: totalTickets,
                total_amount: calculatedTotal,
                message: 'อัปเดตบิลสำเร็จ'
            };
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // ดึงยอดขายแยกตามประเภทตาม period_id
    static async getSalesByTypePeriod(agentId = null, periodId = null) {
        let query = `
            SELECT
                lotto_type,
                COUNT(*) as ticket_count,
                SUM(price) as total_amount
            FROM tbl_ticket
        `;

        let params = [];
        let conditions = [];

        if (agentId) {
            conditions.push('agent_id = ?');
            params.push(agentId);
        }

        if (periodId) {
            conditions.push('period_id = ?');
            params.push(periodId);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' GROUP BY lotto_type ORDER BY total_amount DESC';

        const [rows] = await promisePool.execute(query, params);
        return rows;
    }

    // ดึงความถี่ของหมายเลขหวยที่มีการบันทึกมากที่สุด
    static async getLottoNumberFrequency(agentId = null, startDate = null, endDate = null, lottoType = null, page = 1, limit = 50) {
        let query = `
            SELECT 
                lotto_number,
                lotto_type,
                COUNT(*) as frequency,
                SUM(price + COALESCE(price_toad, 0)) as total_price
            FROM tbl_ticket
        `;
        
        let params = [];
        let conditions = [];
        
        if (agentId) {
            conditions.push('agent_id = ?');
            params.push(agentId);
        }
        
        if (startDate && endDate) {
            conditions.push('DATE(created_at) BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }
        
        if (lottoType) {
            if (lottoType === '2digit') {
                conditions.push('lotto_type IN ("2up", "2down")');
            } else if (lottoType === '3digit') {
                conditions.push('lotto_type IN ("3up", "3toad", "3straight_toad")');
            } else if (lottoType === 'run') {
                conditions.push('lotto_type IN ("runup", "rundown")');
            } else {
                conditions.push('lotto_type = ?');
                params.push(lottoType);
            }
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' GROUP BY lotto_number, lotto_type ORDER BY frequency DESC, total_price DESC';
        
        // Count total records for pagination
        let countQuery = query.replace(
            'SELECT \n                lotto_number,\n                lotto_type,\n                COUNT(*) as frequency,\n                SUM(price + COALESCE(price_toad, 0)) as total_price\n            FROM tbl_ticket',
            'SELECT COUNT(*) as total FROM (SELECT lotto_number, lotto_type FROM tbl_ticket'
        );
        countQuery = countQuery.replace('GROUP BY lotto_number, lotto_type ORDER BY frequency DESC, total_price DESC', 'GROUP BY lotto_number, lotto_type) as subquery');
        
        const [countResult] = await promisePool.execute(countQuery, params);
        const totalRecords = countResult[0].total;
        
        // Add pagination
        const offset = (page - 1) * limit;
        query += ` LIMIT ${limit} OFFSET ${offset}`;
        
        const [rows] = await promisePool.execute(query, params);
        
        return {
            data: rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalRecords / limit),
                totalRecords: totalRecords,
                limit: parseInt(limit)
            }
        };
    }
}

module.exports = Ticket;
