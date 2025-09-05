const Period = require('../models/Period');

// ดึงงวดปัจจุบัน
const getCurrentPeriod = async (req, res) => {
    try {
        const period = await Period.getCurrentPeriod();
        
        if (!period) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบงวดปัจจุบัน'
            });
        }

        res.json({
            success: true,
            data: period
        });
    } catch (error) {
        console.error('Get current period error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลงวดปัจจุบัน'
        });
    }
};

// ดึงงวดทั้งหมด
const getAllPeriods = async (req, res) => {
    try {
        const periods = await Period.getAllPeriods();
        
        res.json({
            success: true,
            data: periods
        });
    } catch (error) {
        console.error('Get all periods error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลงวด'
        });
    }
};

// สร้างงวดใหม่
const createPeriod = async (req, res) => {
    try {
        const { period_name, period_date, status } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!period_name || !period_date) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกชื่องวดและวันที่'
            });
        }

        const period = await Period.createPeriod({
            period_name,
            period_date,
            status: status || 'open'
        });

        res.status(201).json({
            success: true,
            message: 'สร้างงวดใหม่สำเร็จ',
            data: period
        });
    } catch (error) {
        console.error('Create period error:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'ชื่องวดนี้มีอยู่แล้ว'
            });
        }

        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างงวด'
        });
    }
};

// อัปเดตงวด
const updatePeriod = async (req, res) => {
    try {
        const { id } = req.params;
        const { period_name, period_date, status } = req.body;

        await Period.updatePeriod(id, {
            period_name,
            period_date,
            status
        });

        res.json({
            success: true,
            message: 'อัปเดตงวดสำเร็จ'
        });
    } catch (error) {
        console.error('Update period error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดตงวด'
        });
    }
};

// ลบงวด
const deletePeriod = async (req, res) => {
    try {
        const { id } = req.params;

        await Period.deletePeriod(id);

        res.json({
            success: true,
            message: 'ลบงวดสำเร็จ'
        });
    } catch (error) {
        console.error('Delete period error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการลบงวด'
        });
    }
};

// เปลี่ยนงวดปัจจุบัน
const setCurrentPeriod = async (req, res) => {
    try {
        const { id } = req.params;

        await Period.setCurrentPeriod(id);

        res.json({
            success: true,
            message: 'เปลี่ยนงวดปัจจุบันสำเร็จ'
        });
    } catch (error) {
        console.error('Set current period error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเปลี่ยนงวดปัจจุบัน'
        });
    }
};

// เปิด/ปิดรับแทงงวด
const togglePeriodStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await Period.togglePeriodStatus(id);

        res.json({
            success: true,
            message: `${result.status === 'open' ? 'เปิด' : 'ปิด'}รับแทงงวดสำเร็จ`,
            data: { status: result.status }
        });
    } catch (error) {
        console.error('Toggle period status error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะงวด'
        });
    }
};

// ดึงงวดที่เปิดรับแทง
const getOpenPeriod = async (req, res) => {
    try {
        const period = await Period.getOpenPeriod();

        res.json({
            success: true,
            data: period
        });
    } catch (error) {
        console.error('Get open period error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลงวดที่เปิดรับแทง'
        });
    }
};

// ปิดงวดทั้งหมด
const closeAllPeriods = async (req, res) => {
    try {
        await Period.closeAllPeriods();

        res.json({
            success: true,
            message: 'ปิดงวดทั้งหมดสำเร็จ'
        });
    } catch (error) {
        console.error('Close all periods error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการปิดงวด'
        });
    }
};

module.exports = {
    getCurrentPeriod,
    getAllPeriods,
    createPeriod,
    updatePeriod,
    deletePeriod,
    setCurrentPeriod,
    togglePeriodStatus,
    getOpenPeriod,
    closeAllPeriods
};
