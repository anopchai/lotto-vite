const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
    getAllSettings,
    getSettingsAsObject,
    getPayoutRate,
    updatePayoutRate,
    updateMultipleSettings,
    resetToDefault,
    getSystemConfigs,
    updateSystemConfigs,
    getSystemStatus,
    toggleSystemStatus
} = require('../controllers/settingController');

// GET /api/settings - ดึงการตั้งค่าอัตราจ่ายทั้งหมด
router.get('/', getAllSettings);

// GET /api/settings/object - ดึงการตั้งค่าในรูปแบบ object
router.get('/object', getSettingsAsObject);

// GET /api/settings/payout/:lottoType - ดึงอัตราจ่ายตามประเภท
router.get('/payout/:lottoType', getPayoutRate);

// PUT /api/settings/payout/:lottoType - อัปเดตอัตราจ่าย (Admin เท่านั้น)
router.put('/payout/:lottoType', authenticateToken, requireAdmin, updatePayoutRate);

// PUT /api/settings/multiple - อัปเดตการตั้งค่าหลายรายการ (Admin เท่านั้น)
router.put('/multiple', authenticateToken, requireAdmin, updateMultipleSettings);

// POST /api/settings/reset - รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้น (Admin เท่านั้น)
router.post('/reset', authenticateToken, requireAdmin, resetToDefault);

// GET /api/settings/system - ดึงการตั้งค่าระบบ
router.get('/system', getSystemConfigs);

// PUT /api/settings/system - อัปเดตการตั้งค่าระบบ (Admin เท่านั้น)
router.put('/system', authenticateToken, requireAdmin, updateSystemConfigs);

// GET /api/settings/status - ตรวจสอบสถานะระบบ
router.get('/status', getSystemStatus);

// POST /api/settings/toggle-status - เปิด/ปิดระบบ (Admin เท่านั้น)
router.post('/toggle-status', authenticateToken, requireAdmin, toggleSystemStatus);

module.exports = router;
