const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');

// เข้าสู่ระบบ
const login = async (req, res) => {
  try {
    const { agent_code, password } = req.body;

    if (!agent_code || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกรหัสตัวแทนและรหัสผ่าน'
      });
    }

    // ตรวจสอบข้อมูลผู้ใช้
    const agent = await Agent.getAgentByCode(agent_code);
    if (!agent) {
      return res.status(401).json({
        success: false,
        message: 'รหัสตัวแทนหรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    if (agent.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'บัญชีถูกระงับการใช้งาน'
      });
    }

    // ตรวจสอบรหัสผ่าน
    const isValidPassword = await Agent.verifyPassword(agent_code, password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'รหัสตัวแทนหรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    // สร้าง JWT token
    const token = jwt.sign(
      {
        agentId: agent.agent_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        token,
        agent: {
          agent_id: agent.agent_id,
          agent_code: agent.agent_code,
          agent_name: agent.agent_name,
          phone: agent.phone,
          status: agent.status,
          role: agent.role
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
    });
  }
};

// ตรวจสอบสถานะการเข้าสู่ระบบ
const verifyToken = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        agent: req.user
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบ token'
    });
  }
};

// ออกจากระบบ
const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'ออกจากระบบสำเร็จ'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการออกจากระบบ'
    });
  }
};

// เปลี่ยนรหัสผ่าน
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const agentId = req.user.agent_id;
    const agentCode = req.user.agent_code;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'
      });
    }

    // ตรวจสอบรหัสผ่านปัจจุบัน
    const isValidPassword = await Agent.verifyPassword(agentCode, current_password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
      });
    }

    // อัปเดตรหัสผ่านใหม่
    await Agent.updateAgent(agentId, { password: new_password });

    res.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
    });
  }
};

module.exports = {
  login,
  verifyToken,
  logout,
  changePassword
};
