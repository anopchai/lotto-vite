const Agent = require('../models/Agent');

// ดึงข้อมูลตัวแทนทั้งหมด (Admin เท่านั้น)
const getAllAgents = async (req, res) => {
    try {
        const agents = await Agent.getAllAgents();
        
        res.json({
            success: true,
            data: agents
        });
    } catch (error) {
        console.error('Get all agents error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตัวแทน'
        });
    }
};

// ดึงข้อมูลตัวแทนตาม ID
const getAgentById = async (req, res) => {
    try {
        const { agentId } = req.params;
        
        const agent = await Agent.getAgentById(agentId);
        
        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบตัวแทนที่ต้องการ'
            });
        }
        
        res.json({
            success: true,
            data: agent
        });
    } catch (error) {
        console.error('Get agent by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตัวแทน'
        });
    }
};

// สร้างตัวแทนใหม่ (Admin เท่านั้น)
const createAgent = async (req, res) => {
    try {
        const { agent_code, agent_name, password, phone, income = 0.00, role = 'user' } = req.body;
        
        // ตรวจสอบข้อมูลที่จำเป็น
        if (!agent_code || !agent_name || !password) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกรหัสตัวแทน ชื่อ และรหัสผ่าน'
            });
        }
        
        // ตรวจสอบรูปแบบรหัสตัวแทน
        if (!/^[A-Z0-9]{3,10}$/.test(agent_code)) {
            return res.status(400).json({
                success: false,
                message: 'รหัสตัวแทนต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์ใหญ่และตัวเลข 3-10 ตัว'
            });
        }
        
        // ตรวจสอบความยาวรหัสผ่าน
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
            });
        }
        
        // ห้ามใช้รหัส ADMIN
        if (agent_code === 'ADMIN') {
            return res.status(400).json({
                success: false,
                message: 'ไม่สามารถใช้รหัส ADMIN ได้'
            });
        }

        // ตรวจสอบรายได้ (ต้องเป็นตัวเลขจำนวนเต็ม)
        if (income !== undefined && (isNaN(income) || parseInt(income) < 0 || parseInt(income) > 100)) {
            return res.status(400).json({
                success: false,
                message: 'สัดส่วนรายได้ต้องเป็นตัวเลขจำนวนเต็มระหว่าง 0-100'
            });
        }

        const result = await Agent.createAgent({
            agent_code,
            agent_name,
            password,
            phone,
            income,
            role
        });
        
        res.status(201).json({
            success: true,
            message: result.message,
            data: {
                agent_id: result.agentId
            }
        });
        
    } catch (error) {
        console.error('Create agent error:', error);
        
        if (error.message.includes('มีอยู่แล้ว')) {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างตัวแทน'
        });
    }
};

// อัปเดตข้อมูลตัวแทน
const updateAgent = async (req, res) => {
    try {
        const { agentId } = req.params;
        const { agent_name, phone, income, status, password } = req.body;
        
        // ตรวจสอบข้อมูลที่จำเป็น
        if (!agent_name) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกชื่อตัวแทน'
            });
        }
        
        // ตรวจสอบสถานะ
        if (status && !['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'สถานะต้องเป็น active หรือ inactive'
            });
        }
        
        // ตรวจสอบรหัสผ่านใหม่ (ถ้ามี)
        if (password && password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
            });
        }

        // ตรวจสอบรายได้ (ถ้ามี)
        if (income !== undefined && (isNaN(income) || parseInt(income) < 0 || parseInt(income) > 100)) {
            return res.status(400).json({
                success: false,
                message: 'สัดส่วนรายได้ต้องเป็นตัวเลขจำนวนเต็มระหว่าง 0-100'
            });
        }

        const result = await Agent.updateAgent(agentId, {
            agent_name,
            phone,
            income,
            status,
            password
        });
        
        res.json({
            success: true,
            message: result.message
        });
        
    } catch (error) {
        console.error('Update agent error:', error);
        
        if (error.message.includes('ไม่พบ')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดตตัวแทน'
        });
    }
};

// ลบตัวแทน (Admin เท่านั้น)
const deleteAgent = async (req, res) => {
    try {
        const { agentId } = req.params;
        
        const result = await Agent.deleteAgent(agentId);
        
        res.json({
            success: true,
            message: result.message
        });
        
    } catch (error) {
        console.error('Delete agent error:', error);
        
        if (error.message.includes('ไม่สามารถลบ') || error.message.includes('ไม่พบ')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบตัวแทน'
        });
    }
};

// ดึงสถิติของตัวแทน
const getAgentStats = async (req, res) => {
    try {
        const { agentId } = req.params;
        const { start_date, end_date } = req.query;
        
        // ตรวจสอบสิทธิ์ (เจ้าของหรือ Admin)
        if (req.user.role !== 'admin' && req.user.agent_id !== parseInt(agentId)) {
            return res.status(403).json({
                success: false,
                message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
            });
        }
        
        const stats = await Agent.getAgentStats(agentId, start_date, end_date);
        const salesByType = await Agent.getAgentSalesByType(agentId, start_date, end_date);
        
        res.json({
            success: true,
            data: {
                summary: stats,
                sales_by_type: salesByType.map(item => ({
                    ...item,
                    type_name: getLottoTypeName(item.lotto_type)
                }))
            }
        });
        
    } catch (error) {
        console.error('Get agent stats error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงสถิติตัวแทน'
        });
    }
};

// ดึงข้อมูลตัวแทนปัจจุบัน
const getMyProfile = async (req, res) => {
    try {
        const agentId = req.user.agent_id;
        
        const agent = await Agent.getAgentById(agentId);
        
        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลตัวแทน'
            });
        }
        
        res.json({
            success: true,
            data: agent
        });
        
    } catch (error) {
        console.error('Get my profile error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์'
        });
    }
};

// อัปเดตโปรไฟล์ตัวแทนปัจจุบัน
const updateMyProfile = async (req, res) => {
    try {
        const agentId = req.user.agent_id;
        const { agent_name, phone } = req.body;
        
        if (!agent_name) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกชื่อ'
            });
        }
        
        const result = await Agent.updateAgent(agentId, {
            agent_name,
            phone
        });
        
        res.json({
            success: true,
            message: 'อัปเดตโปรไฟล์สำเร็จ'
        });
        
    } catch (error) {
        console.error('Update my profile error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์'
        });
    }
};

// ฟังก์ชันช่วยแปลงชื่อประเภทหวย
const getLottoTypeName = (type) => {
    const names = {
        '2up': '2 ตัวบน',
        '2down': '2 ตัวล่าง',
        '3up': '3 ตัวตรง',
        '3toad': '3 ตัวโต๊ด',
        '3straight_toad': 'ตรงโต๊ด',
        'runup': 'วิ่งบน',
        'rundown': 'วิ่งล่าง'
    };
    return names[type] || type;
};

module.exports = {
    getAllAgents,
    getAgentById,
    createAgent,
    updateAgent,
    deleteAgent,
    getAgentStats,
    getMyProfile,
    updateMyProfile
};
