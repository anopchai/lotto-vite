const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
    addHalfPriceNumbers,
    getHalfPriceByPeriod,
    getHalfPriceByPeriodAndCategory,
    getHalfPriceByPeriodName,
    getAllHalfPriceNumbers,
    deleteHalfPriceNumbers,
    deleteHalfPriceByCategory,
    deleteHalfPriceByPeriodName,
    testHalfPriceAPI
} = require('../controllers/halfPriceController');

// POST /api/half-price - เพิ่มเลขจ่ายครึ่งราคา (Admin เท่านั้น)
router.post('/', authenticateToken, requireAdmin, addHalfPriceNumbers);

// GET /api/half-price/test - ทดสอบ API (สำหรับ debugging)
router.get('/test', testHalfPriceAPI);

// GET /api/half-price/all - ดึงเลขจ่ายครึ่งราคาทั้งหมด
router.get('/all', authenticateToken, getAllHalfPriceNumbers);

// GET /api/half-price/period/:period_id - ดึงเลขจ่ายครึ่งราคาตามงวด (แบบใหม่)
router.get('/period/:period_id', authenticateToken, getHalfPriceByPeriod);

// GET /api/half-price/period/:period_id/category/:category - ดึงเลขจ่ายครึ่งราคาตามงวดและหมวดหมู่
router.get('/period/:period_id/category/:category', authenticateToken, getHalfPriceByPeriodAndCategory);

// GET /api/half-price/period-name/:period - ดึงเลขจ่ายครึ่งราคาตามงวด (แบบเก่า)
router.get('/period-name/:period', authenticateToken, getHalfPriceByPeriodName);

// DELETE /api/half-price/period/:period_id - ลบเลขจ่ายครึ่งราคาทั้งงวด (Admin เท่านั้น)
router.delete('/period/:period_id', authenticateToken, requireAdmin, deleteHalfPriceNumbers);

// DELETE /api/half-price/period/:period_id/category/:category - ลบเลขจ่ายครึ่งราคาตามหมวดหมู่ (Admin เท่านั้น)
router.delete('/period/:period_id/category/:category', authenticateToken, requireAdmin, deleteHalfPriceByCategory);

// DELETE /api/half-price/period-name/:period - ลบเลขจ่ายครึ่งราคา (แบบเก่า - Admin เท่านั้น)
router.delete('/period-name/:period', authenticateToken, requireAdmin, deleteHalfPriceByPeriodName);

module.exports = router;
