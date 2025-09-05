const { Setting, SystemConfig } = require('../models/Setting');

// ดึงการตั้งค่าอัตราจ่ายทั้งหมด
const getAllSettings = async (req, res) => {
    try {
        const settings = await Setting.getAllSettings();
        
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Get all settings error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า'
        });
    }
};

// ดึงการตั้งค่าในรูปแบบ object
const getSettingsAsObject = async (req, res) => {
    try {
        const settings = await Setting.getSettingsAsObject();
        
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Get settings as object error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า'
        });
    }
};

// ดึงอัตราจ่ายตามประเภท
const getPayoutRate = async (req, res) => {
    try {
        const { lottoType } = req.params;
        
        const validTypes = ['2up', '2down', '3up', '3toad', 'runup', 'rundown'];
        if (!validTypes.includes(lottoType)) {
            return res.status(400).json({
                success: false,
                message: 'ประเภทหวยไม่ถูกต้อง'
            });
        }
        
        const payoutRate = await Setting.getPayoutRate(lottoType);
        
        res.json({
            success: true,
            data: {
                lotto_type: lottoType,
                payout_rate: payoutRate
            }
        });
    } catch (error) {
        console.error('Get payout rate error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลอัตราจ่าย'
        });
    }
};

// อัปเดตอัตราจ่าย
const updatePayoutRate = async (req, res) => {
    try {
        const { lottoType } = req.params;
        const { payout_rate } = req.body;
        
        const validTypes = ['2up', '2down', '3up', '3toad', 'runup', 'rundown'];
        if (!validTypes.includes(lottoType)) {
            return res.status(400).json({
                success: false,
                message: 'ประเภทหวยไม่ถูกต้อง'
            });
        }
        
        if (!payout_rate || !Number.isInteger(payout_rate) || payout_rate <= 0) {
            return res.status(400).json({
                success: false,
                message: 'อัตราจ่ายต้องเป็นจำนวนเต็มบวก'
            });
        }
        
        const result = await Setting.updatePayoutRate(lottoType, payout_rate);
        
        res.json({
            success: true,
            message: result.action === 'created' ? 'สร้างการตั้งค่าสำเร็จ' : 'อัปเดตอัตราจ่ายสำเร็จ',
            data: {
                lotto_type: lottoType,
                payout_rate: payout_rate
            }
        });
    } catch (error) {
        console.error('Update payout rate error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดตอัตราจ่าย'
        });
    }
};

// อัปเดตการตั้งค่าหลายรายการพร้อมกัน
const updateMultipleSettings = async (req, res) => {
    try {
        const { settings } = req.body;
        
        if (!settings || !Array.isArray(settings) || settings.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลการตั้งค่าไม่ถูกต้อง'
            });
        }
        
        const validTypes = ['2up', '2down', '3up', '3toad', 'runup', 'rundown'];
        
        // ตรวจสอบข้อมูลแต่ละรายการ
        for (const setting of settings) {
            if (!validTypes.includes(setting.lotto_type)) {
                return res.status(400).json({
                    success: false,
                    message: `ประเภทหวย ${setting.lotto_type} ไม่ถูกต้อง`
                });
            }
            
            if (!setting.payout_rate || !Number.isInteger(setting.payout_rate) || setting.payout_rate <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `อัตราจ่ายสำหรับ ${setting.lotto_type} ต้องเป็นจำนวนเต็มบวก`
                });
            }
        }
        
        const result = await Setting.updateMultipleSettings(settings);
        
        if (result.success) {
            const updatedSettings = await Setting.getAllSettings();
            
            res.json({
                success: true,
                message: 'อัปเดตการตั้งค่าสำเร็จ',
                data: updatedSettings
            });
        }
    } catch (error) {
        console.error('Update multiple settings error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดตการตั้งค่า'
        });
    }
};

// รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้น
const resetToDefault = async (req, res) => {
    try {
        const result = await Setting.resetToDefault();
        
        if (result.success) {
            const settings = await Setting.getAllSettings();
            
            res.json({
                success: true,
                message: 'รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นสำเร็จ',
                data: settings
            });
        }
    } catch (error) {
        console.error('Reset to default error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการรีเซ็ตการตั้งค่า'
        });
    }
};

// ดึงการตั้งค่าระบบทั้งหมด
const getSystemConfigs = async (req, res) => {
    try {
        const configs = await SystemConfig.getAllConfigs();
        
        res.json({
            success: true,
            data: configs
        });
    } catch (error) {
        console.error('Get system configs error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่าระบบ'
        });
    }
};

// อัปเดตการตั้งค่าระบบ
const updateSystemConfigs = async (req, res) => {
    try {
        const { configs } = req.body;
        
        if (!configs || !Array.isArray(configs) || configs.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลการตั้งค่าไม่ถูกต้อง'
            });
        }
        
        const result = await SystemConfig.updateMultipleConfigs(configs);
        
        if (result.success) {
            const updatedConfigs = await SystemConfig.getAllConfigs();
            
            res.json({
                success: true,
                message: 'อัปเดตการตั้งค่าระบบสำเร็จ',
                data: updatedConfigs
            });
        }
    } catch (error) {
        console.error('Update system configs error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดตการตั้งค่าระบบ'
        });
    }
};

// ตรวจสอบสถานะระบบ
const getSystemStatus = async (req, res) => {
    try {
        const isOpen = await SystemConfig.getSystemStatus();
        const currentPeriod = await SystemConfig.getCurrentPeriod();
        const nextDrawDate = await SystemConfig.getNextDrawDate();
        
        res.json({
            success: true,
            data: {
                is_open: isOpen,
                status: isOpen ? 'open' : 'closed',
                current_period: currentPeriod,
                next_draw_date: nextDrawDate
            }
        });
    } catch (error) {
        console.error('Get system status error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานะระบบ'
        });
    }
};

// เปิด/ปิดระบบ
const toggleSystemStatus = async (req, res) => {
    try {
        const { is_open } = req.body;
        
        if (typeof is_open !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'สถานะระบบต้องเป็น true หรือ false'
            });
        }
        
        const result = await SystemConfig.setSystemStatus(is_open);
        
        if (result.success) {
            res.json({
                success: true,
                message: is_open ? 'เปิดระบบรับแทงหวยแล้ว' : 'ปิดระบบรับแทงหวยแล้ว',
                data: {
                    is_open: is_open,
                    status: is_open ? 'open' : 'closed'
                }
            });
        }
    } catch (error) {
        console.error('Toggle system status error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะระบบ'
        });
    }
};

module.exports = {
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
};
