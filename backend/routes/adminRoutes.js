const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { clearTestData, resetAllData, getDatabaseInfo, formatData } = require('../controllers/adminController');
const { runDatabaseMigration, checkCurrentStructure, addIncomeToAgents } = require('../controllers/migrationController');

// DELETE /api/admin/clear-test-data - ล้างข้อมูลทดสอบ (Admin เท่านั้น)
router.delete('/clear-test-data', authenticateToken, requireAdmin, clearTestData);

// DELETE /api/admin/reset-all-data - รีเซ็ตข้อมูลทั้งหมด (Admin เท่านั้น)
router.delete('/reset-all-data', authenticateToken, requireAdmin, resetAllData);

// GET /api/admin/database-info - ดูข้อมูลในฐานข้อมูล (Admin เท่านั้น)
router.get('/database-info', authenticateToken, requireAdmin, getDatabaseInfo);

// DELETE /api/admin/format-data - Format Data รีเซ็ตระบบกลับไปเป็น 0 ยกเว้นอัตราจ่าย (Admin เท่านั้น)
router.delete('/format-data', authenticateToken, requireAdmin, formatData);

// POST /api/admin/migrate-database - รัน Migration ฐานข้อมูล (Admin เท่านั้น)
router.post('/migrate-database', authenticateToken, requireAdmin, runDatabaseMigration);

// POST /api/admin/add-income-field - เพิ่มฟิลด์ income ในตาราง tbl_agent (Admin เท่านั้น)
router.post('/add-income-field', addIncomeToAgents);

// GET /api/admin/add-income-field - เพิ่มฟิลด์ income ในตาราง tbl_agent (สำหรับทดสอบ)
router.get('/add-income-field', addIncomeToAgents);

// GET /api/admin/check-structure - ตรวจสอบโครงสร้างฐานข้อมูล (Admin เท่านั้น)
router.get('/check-structure', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const structure = await checkCurrentStructure();
        res.json({
            success: true,
            data: structure
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
