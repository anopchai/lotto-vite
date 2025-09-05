const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
    createTickets,
    getMyTickets,
    getAllTickets,
    getTicketsByBillId,
    getAllBills,
    deleteBill,
    updateBill
} = require('../controllers/ticketController');

// POST /api/tickets - สร้างบิลหวยใหม่
router.post('/', authenticateToken, createTickets);

// GET /api/tickets/my - ดึงข้อมูลตั๋วของตัวแทนปัจจุบัน
router.get('/my', authenticateToken, getMyTickets);

// GET /api/tickets/all - ดึงข้อมูลตั๋วทั้งหมด (Admin เท่านั้น)
router.get('/all', authenticateToken, requireAdmin, getAllTickets);

// GET /api/tickets/bill/:billId - ดึงข้อมูลตั๋วตาม bill_id
router.get('/bill/:billId', authenticateToken, getTicketsByBillId);

// PUT /api/tickets/bill/:billId - อัปเดตบิล
router.put('/bill/:billId', authenticateToken, updateBill);

// GET /api/tickets/bills - ดึงรายการบิลทั้งหมด
router.get('/bills', authenticateToken, getAllBills);

// DELETE /api/tickets/bill/:billId - ลบบิล
router.delete('/bill/:billId', authenticateToken, deleteBill);

module.exports = router;
