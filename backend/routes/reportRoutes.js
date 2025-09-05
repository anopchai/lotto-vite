const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
    getSalesReport,
    getWinnersReport,
    getDailySummary,
    getAgentsReport,
    getUserReport,
    getNewAgentsReport,
    getNewWinnersReport,
    getDashboardSummary,
    getLottoNumberFrequency
} = require('../controllers/reportController');

// GET /api/reports/sales - รายงานยอดขาย
router.get('/sales', authenticateToken, getSalesReport);

// GET /api/reports/winners - รายงานผู้ชนะรางวัล
router.get('/winners', authenticateToken, getWinnersReport);

// GET /api/reports/daily - รายงานสรุปรายวัน
router.get('/daily', authenticateToken, getDailySummary);

// GET /api/reports/agents - รายงานตัวแทน (Admin เท่านั้น)
router.get('/agents', authenticateToken, requireAdmin, getAgentsReport);

// GET /api/reports/user - รายงานตัวแทน (User)
router.get('/user', authenticateToken, getUserReport);

// === API ใหม่ (ระบบปรับปรุง) ===
// GET /api/reports/new-agents - รายงานตัวแทนจากตาราง winners
router.get('/new-agents', authenticateToken, getNewAgentsReport);

// GET /api/reports/new-winners - รายงานผู้ชนะจากตาราง winners
router.get('/new-winners', authenticateToken, getNewWinnersReport);

// GET /api/reports/dashboard - สรุปสำหรับ Dashboard
router.get('/dashboard', authenticateToken, getDashboardSummary);

// GET /api/reports/number-frequency - รายงานความถี่ของหมายเลขหวย
router.get('/number-frequency', authenticateToken, getLottoNumberFrequency);

module.exports = router;
