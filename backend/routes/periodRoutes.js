const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
    getCurrentPeriod,
    getAllPeriods,
    createPeriod,
    updatePeriod,
    deletePeriod,
    setCurrentPeriod,
    togglePeriodStatus,
    getOpenPeriod
} = require('../controllers/periodController');

// GET /api/periods/current - ดึงงวดปัจจุบัน
router.get('/current', authenticateToken, getCurrentPeriod);

// GET /api/periods/open - ดึงงวดที่เปิดรับแทง
router.get('/open', authenticateToken,  getOpenPeriod);

// GET /api/periods - ดึงงวดทั้งหมด (สำหรับแสดงผลรางวัล)
router.get('/', authenticateToken, getAllPeriods);

// POST /api/periods - สร้างงวดใหม่ (Admin เท่านั้น)
router.post('/', authenticateToken, requireAdmin, createPeriod);

// PUT /api/periods/:id - อัปเดตงวด (Admin เท่านั้น)
router.put('/:id', authenticateToken, requireAdmin, updatePeriod);

// DELETE /api/periods/:id - ลบงวด (Admin เท่านั้น)
router.delete('/:id', authenticateToken, requireAdmin, deletePeriod);

// PUT /api/periods/:id/set-current - เปลี่ยนงวดปัจจุบัน (Admin เท่านั้น)
router.put('/:id/set-current', authenticateToken, requireAdmin, setCurrentPeriod);

// PUT /api/periods/:id/toggle-status - เปิด/ปิดรับแทงงวด (Admin เท่านั้น)
router.put('/:id/toggle-status', authenticateToken, requireAdmin, togglePeriodStatus);

// PUT /api/periods/close-all - ปิดงวดทั้งหมด (Admin เท่านั้น)
router.put('/close-all', authenticateToken, requireAdmin, (req, res) => {
    // ฟังก์ชันปิดงวดทั้งหมด
    require('../controllers/periodController').closeAllPeriods(req, res);
});

module.exports = router;
