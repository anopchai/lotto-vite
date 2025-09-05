const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');

// Middleware ตรวจสอบ JWT Token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // ตรวจสอบ token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ดึงข้อมูลผู้ใช้จากฐานข้อมูล
    const [rows] = await promisePool.execute(
      'SELECT agent_id, agent_code, agent_name, phone, status, role FROM tbl_agent WHERE agent_id = ?',
      [decoded.agentId]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = rows[0];

    // ตรวจสอบและกำหนด role ให้ถูกต้อง
    if (!user.role) {
      user.role = user.agent_code === 'ADMIN' ? 'admin' : 'user';
      
      // อัปเดตฐานข้อมูลให้มี role
      await promisePool.execute(
        'UPDATE tbl_agent SET role = ? WHERE agent_id = ?',
        [user.role, user.agent_id]
      );
    }

    // เพิ่มข้อมูลผู้ใช้ใน request object
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// ตรวจสอบสิทธิ์ Admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      userRole: req.user.role
    });
  }
  next();
};

// ตรวจสอบว่าเป็นเจ้าของข้อมูลหรือ Admin
const requireOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User authentication required'
    });
  }

  const agentId = parseInt(req.params.agentId) || parseInt(req.body.agent_id);

  if (req.user.role === 'admin' || req.user.agent_id === agentId) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied - insufficient permissions',
      userRole: req.user.role,
      userId: req.user.agent_id
    });
  }
};

// ตรวจสอบสิทธิ์ตาม role ที่กำหนด
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const userRole = req.user.role;
    
    // รองรับทั้ง string และ array
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied - requires one of: ${roles.join(', ')}`,
        userRole: userRole,
        requiredRoles: roles
      });
    }
    
    next();
  };
};

// Helper function สำหรับตรวจสอบ role
const hasRole = (user, role) => {
  if (!user || !user.role) return false;
  return user.role === role;
};

// Helper function สำหรับตรวจสอบหลาย roles
const hasAnyRole = (user, roles) => {
  if (!user || !user.role || !Array.isArray(roles)) return false;
  return roles.includes(user.role);
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireOwnerOrAdmin,
  requireRole,
  hasRole,
  hasAnyRole
};
