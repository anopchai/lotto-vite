const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    login,
    verifyToken,
    logout,
    changePassword
} = require('../controllers/authController');

// POST /api/auth/login - เข้าสู่ระบบ
router.post('/login', login);

// GET /api/auth/verify - ตรวจสอบ token
router.get('/verify', authenticateToken, verifyToken);

// POST /api/auth/logout - ออกจากระบบ
router.post('/logout', authenticateToken, logout);

// POST /api/auth/change-password - เปลี่ยนรหัสผ่าน
router.post('/change-password', authenticateToken, changePassword);

module.exports = router;
