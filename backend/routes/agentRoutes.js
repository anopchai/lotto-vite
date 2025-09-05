const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');
const {
    getAllAgents,
    getAgentById,
    createAgent,
    updateAgent,
    deleteAgent,
    getAgentStats,
    getMyProfile,
    updateMyProfile
} = require('../controllers/agentController');

// GET /api/agents - ดึงข้อมูลตัวแทนทั้งหมด (Admin เท่านั้น)
router.get('/', authenticateToken, requireAdmin, getAllAgents);

// GET /api/agents/me - ดึงข้อมูลตัวแทนปัจจุบัน
router.get('/me', authenticateToken, getMyProfile);

// PUT /api/agents/me - อัปเดตโปรไฟล์ตัวแทนปัจจุบัน
router.put('/me', authenticateToken, updateMyProfile);

// POST /api/agents - สร้างตัวแทนใหม่ (Admin เท่านั้น)
router.post('/', authenticateToken, requireAdmin, createAgent);

// GET /api/agents/:agentId - ดึงข้อมูลตัวแทนตาม ID
router.get('/:agentId', authenticateToken, requireOwnerOrAdmin, getAgentById);

// PUT /api/agents/:agentId - อัปเดตข้อมูลตัวแทน (Admin เท่านั้น)
router.put('/:agentId', authenticateToken, requireAdmin, updateAgent);

// DELETE /api/agents/:agentId - ลบตัวแทน (Admin เท่านั้น)
router.delete('/:agentId', authenticateToken, requireAdmin, deleteAgent);

// GET /api/agents/:agentId/stats - ดึงสถิติของตัวแทน
router.get('/:agentId/stats', authenticateToken, requireOwnerOrAdmin, getAgentStats);

module.exports = router;
