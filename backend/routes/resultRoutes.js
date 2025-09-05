const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
    saveResult,
    getResultByPeriod,
    getLatestResult,
    getAllResults,
    checkWinners,
    deleteResult
} = require('../controllers/resultController');

// POST /api/results - บันทึกผลรางวัล (Admin เท่านั้น)
router.post('/', authenticateToken, requireAdmin, saveResult);

// GET /api/results/latest - ดึงผลรางวัลล่าสุด
router.get('/latest', getLatestResult);

// GET /api/results - ดึงผลรางวัลทั้งหมด
router.get('/', getAllResults);

// GET /api/results/all - ดึงผลรางวัลทั้งหมด (alias)
router.get('/all', getAllResults);

// GET /api/results/period/:period - ดึงผลรางวัลตามงวด
router.get('/period/:period', getResultByPeriod);

// GET /api/results/winners/:period - ตรวจสอบผู้ชนะรางวัล
router.get('/winners/:period', authenticateToken, checkWinners);

// PUT /api/results/:id - อัปเดตผลรางวัล (Admin เท่านั้น)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
    require('../controllers/resultController').updateResult(req, res);
});

// DELETE /api/results/:id - ลบผลรางวัล (Admin เท่านั้น)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    require('../controllers/resultController').deleteResultById(req, res);
});

// DELETE /api/results/period/:period - ลบผลรางวัล (Admin เท่านั้น)
router.delete('/period/:period', authenticateToken, requireAdmin, deleteResult);

module.exports = router;
