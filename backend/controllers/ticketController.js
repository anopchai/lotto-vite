const Ticket = require('../models/Ticket');
const { SystemConfig } = require('../models/Setting');

// สร้างบิลหวยใหม่
const createTickets = async (req, res) => {
    try {
        // console.log('=== CREATE TICKETS REQUEST ===');
        // console.log('User:', req.user);
        // console.log('Body:', JSON.stringify(req.body, null, 2));
        // ตรวจสอบสถานะระบบก่อน
        const isSystemOpen = await SystemConfig.getSystemStatus();
        if (!isSystemOpen) {
            return res.status(403).json({
                success: false,
                message: 'ระบบปิดรับแทงหวยในขณะนี้'
            });
        }
        
        const { buyer_name, seller_name, tickets, period_id } = req.body;
        const agent_id = req.user.agent_id;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!buyer_name || !tickets || !Array.isArray(tickets) || tickets.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลไม่ครบถ้วน'
            });
        }

        // ตรวจสอบชื่อผู้ซื้อ (ไม่จำกัดความยาวแล้ว)
        if (buyer_name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกชื่อผู้ซื้อ'
            });
        }
        
        // ตรวจสอบข้อมูลแต่ละตั๋ว
        for (const ticket of tickets) {
            let { lotto_number, lotto_type, price, price_toad } = ticket;

            // แปลง price และ price_toad เป็น number
            price = parseFloat(price) || 0;
            price_toad = parseFloat(price_toad) || 0;

            if (!lotto_number || !lotto_type || price <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลตั๋วไม่ครบถ้วน'
                });
            }
            
            // ตรวจสอบประเภทหวย
            const validTypes = ['2up', '2down', '3up', '3toad', '3straight_toad', 'runup', 'rundown'];
            if (!validTypes.includes(lotto_type)) {
                return res.status(400).json({
                    success: false,
                    message: 'ประเภทหวยไม่ถูกต้อง'
                });
            }
            
            // ตรวจสอบรูปแบบเลขหวย
            if (lotto_type === '2up' || lotto_type === '2down') {
                if (!/^\d{2}$/.test(lotto_number)) {
                    return res.status(400).json({
                        success: false,
                        message: 'เลข 2 ตัวต้องเป็นตัวเลข 2 หลัก'
                    });
                }
            } else if (lotto_type === '3up' || lotto_type === '3toad' || lotto_type === '3straight_toad') {
                if (!/^\d{3}$/.test(lotto_number)) {
                    return res.status(400).json({
                        success: false,
                        message: 'เลข 3 ตัวต้องเป็นตัวเลข 3 หลัก'
                    });
                }
            } else if (lotto_type === 'runup' || lotto_type === 'rundown') {
                if (!/^\d{1}$/.test(lotto_number)) {
                    return res.status(400).json({
                        success: false,
                        message: 'เลขวิ่งต้องเป็นตัวเลข 1 หลัก'
                    });
                }
            }
            
            // ตรวจสอบราคา
            if (!Number.isInteger(price) || price <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ราคาต้องเป็นจำนวนเต็มบวก'
                });
            }
        }

        // แปลง price และ price_toad ในทุก ticket
        const processedTickets = tickets.map(ticket => ({
            ...ticket,
            price: parseFloat(ticket.price) || 0,
            price_toad: parseFloat(ticket.price_toad) || 0
        }));

        // บันทึกตั๋ว
        const result = await Ticket.createTickets({
            agent_id,
            buyer_name,
            seller_name,
            tickets: processedTickets,
            period_id
        });
        
        res.status(201).json({
            success: true,
            message: result.message,
            data: result
        });
        
    } catch (error) {
        console.error('=== CREATE TICKETS ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error code:', error.code);
        console.error('Error sql:', error.sql);
        console.error('================================');

        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการบันทึกหวย: ' + error.message
        });
    }
};

// ดึงข้อมูลตั๋วของตัวแทน
const getMyTickets = async (req, res) => {
    try {
        const agentId = req.user.agent_id;
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        
        const tickets = await Ticket.getTicketsByAgent(agentId, limit, offset);
        
        res.json({
            success: true,
            data: tickets,
            pagination: {
                limit,
                offset,
                total: tickets.length
            }
        });
        
    } catch (error) {
        console.error('Get my tickets error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตั๋ว'
        });
    }
};

// ดึงข้อมูลตั๋วทั้งหมด (Admin เท่านั้น)
const getAllTickets = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        
        const tickets = await Ticket.getAllTickets(limit, offset);
        
        res.json({
            success: true,
            data: tickets,
            pagination: {
                limit,
                offset,
                total: tickets.length
            }
        });
        
    } catch (error) {
        console.error('Get all tickets error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตั๋ว'
        });
    }
};

// ดึงข้อมูลตั๋วตาม bill_id
const getTicketsByBillId = async (req, res) => {
    try {
        const { billId } = req.params;
        const agentId = req.user.agent_code === 'ADMIN' ? null : req.user.agent_id;

        const tickets = await Ticket.getTicketsByBillId(billId, agentId);

        if (tickets.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบบิลที่ต้องการ'
            });
        }

        // คำนวณยอดรวม
        let totalAmount = 0;
        tickets.forEach(ticket => {
            totalAmount += ticket.price;
            if (ticket.price_toad) {
                totalAmount += ticket.price_toad;
            }
        });

        res.json({
            success: true,
            data: {
                bill_id: billId,
                buyer_name: tickets[0].buyer_name,
                seller_name: tickets[0].seller_name,
                agent_id: tickets[0].agent_id,
                period_id: tickets[0].period_id,
                period: tickets[0].period_name,
                created_at: tickets[0].created_at,
                tickets: tickets,
                total_amount: totalAmount,
                ticket_count: tickets.length
            }
        });

    } catch (error) {
        console.error('Get tickets by bill ID error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลบิล'
        });
    }
};

// ดึงรายการบิลทั้งหมด
const getAllBills = async (req, res) => {
    try {
        const { start_date, end_date, period_id } = req.query;
        const agentId = req.user.agent_code === 'ADMIN' ? null : req.user.agent_id;

        // console.log('=== GET ALL BILLS REQUEST ===');
        // console.log('User:', req.user.agent_name, '(' + req.user.agent_code + ')');
        // console.log('Agent ID:', agentId);
        // console.log('Query params:', { start_date, end_date, period_id });

        const bills = await Ticket.getAllBills(agentId, start_date, end_date, period_id);

        // console.log('📋 Bills found:', bills.length);
        // console.log('📊 Bills data:', bills);

        res.json({
            success: true,
            data: bills
        });

    } catch (error) {
        console.error('Get all bills error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลบิล'
        });
    }
};

// ลบบิล
const deleteBill = async (req, res) => {
    try {
        const { billId } = req.params;
        const agentId = req.user.agent_code === 'ADMIN' ? null : req.user.agent_id;
        
        const result = await Ticket.deleteBill(billId, agentId);
        
        res.json({
            success: true,
            message: result.message,
            data: {
                deleted_tickets: result.deleted_tickets
            }
        });
        
    } catch (error) {
        console.error('Delete bill error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการลบบิล'
        });
    }
};

// อัปเดตบิล
const updateBill = async (req, res) => {
    try {
        const { billId } = req.params;
        const { buyer_name, tickets, total_amount } = req.body;
        const agentId = req.user.agent_code === 'ADMIN' ? null : req.user.agent_id;
        
        // ตรวจสอบข้อมูลที่จำเป็น
        if (!buyer_name || !buyer_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกชื่อผู้ซื้อ'
            });
        }
        
        if (!tickets || tickets.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเพิ่มรายการหวยอย่างน้อย 1 รายการ'
            });
        }
        
        const result = await Ticket.updateBill(billId, {
            buyer_name: buyer_name.trim(),
            tickets,
            total_amount
        }, agentId);
        
        res.json({
            success: true,
            message: 'อัปเดตบิลสำเร็จ',
            data: result
        });
        
    } catch (error) {
        console.error('Update bill error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการอัปเดตบิล'
        });
    }
};

module.exports = {
    createTickets,
    getMyTickets,
    getAllTickets,
    getTicketsByBillId,
    getAllBills,
    deleteBill,
    updateBill
};
