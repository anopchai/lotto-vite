const HalfPriceNumber = require('../models/HalfPriceNumber');

// เพิ่มเลขจ่ายครึ่งราคา (แบบใหม่)
const addHalfPriceNumbers = async (req, res) => {
    try {
        const { period_id, category, numbers, period } = req.body;

        // รองรับทั้งแบบใหม่ (period_id, category) และแบบเก่า (period)
        if (period_id && category) {
            // แบบใหม่
            if (!numbers || !Array.isArray(numbers)) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลไม่ครบถ้วน'
                });
            }

            const result = await HalfPriceNumber.add({
                period_id,
                category,
                numbers
            });

            res.json({
                success: true,
                message: result.message
            });
        } else if (period) {
            // แบบเก่า - backward compatibility
            if (!numbers || !Array.isArray(numbers)) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลไม่ครบถ้วน'
                });
            }

            const result = await HalfPriceNumber.addHalfPriceNumbers(period, numbers);

            res.json({
                success: true,
                message: result.message
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลไม่ครบถ้วน'
            });
        }

    } catch (error) {
        console.error('Add half price numbers error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการเพิ่มเลขจ่ายครึ่งราคา'
        });
    }
};

// ดึงเลขจ่ายครึ่งราคาตามงวด (แบบใหม่ - ใช้ period_id)
const getHalfPriceByPeriod = async (req, res) => {
    try {
        const { period_id } = req.params;

        const numbers = await HalfPriceNumber.getByPeriod(period_id);

        res.json({
            success: true,
            data: numbers
        });

    } catch (error) {
        console.error('Get half price numbers error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการดึงเลขจ่ายครึ่งราคา'
        });
    }
};

// ดึงเลขจ่ายครึ่งราคาตามงวดและหมวดหมู่
const getHalfPriceByPeriodAndCategory = async (req, res) => {
    try {
        const { period_id, category } = req.params;

        const numbers = await HalfPriceNumber.getByPeriodAndCategory(period_id, category);

        res.json({
            success: true,
            data: numbers
        });

    } catch (error) {
        console.error('Get half price numbers by category error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการดึงเลขจ่ายครึ่งราคา'
        });
    }
};

// ดึงเลขจ่ายครึ่งราคาตามงวด (แบบเก่า - รองรับ period name)
const getHalfPriceByPeriodName = async (req, res) => {
    try {
        const { period } = req.params;
        const decodedPeriod = decodeURIComponent(period);

        const numbers = await HalfPriceNumber.getByPeriodName(decodedPeriod);

        res.json({
            success: true,
            data: numbers
        });

    } catch (error) {
        console.error('Get half price numbers by period name error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการดึงเลขจ่ายครึ่งราคา'
        });
    }
};

// ดึงเลขจ่ายครึ่งราคาทั้งหมด
const getAllHalfPriceNumbers = async (req, res) => {
    try {
        const numbers = await HalfPriceNumber.getAll();
        
        res.json({
            success: true,
            data: numbers
        });
        
    } catch (error) {
        console.error('Get all half price numbers error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการดึงเลขจ่ายครึ่งราคา'
        });
    }
};

// ลบเลขจ่ายครึ่งราคาทั้งงวด (แบบใหม่)
const deleteHalfPriceNumbers = async (req, res) => {
    try {
        const { period_id } = req.params;

        const result = await HalfPriceNumber.delete(period_id);

        res.json({
            success: true,
            message: 'ลบเลขจ่ายครึ่งราคาสำเร็จ'
        });

    } catch (error) {
        console.error('Delete half price numbers error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการลบเลขจ่ายครึ่งราคา'
        });
    }
};

// ลบเลขจ่ายครึ่งราคาตามหมวดหมู่
const deleteHalfPriceByCategory = async (req, res) => {
    try {
        const { period_id, category } = req.params;

        const result = await HalfPriceNumber.deleteByCategory(period_id, category);

        res.json({
            success: true,
            message: 'ลบเลขจ่ายครึ่งราคาสำเร็จ'
        });

    } catch (error) {
        console.error('Delete half price numbers by category error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการลบเลขจ่ายครึ่งราคา'
        });
    }
};

// ลบเลขจ่ายครึ่งราคา (แบบเก่า)
const deleteHalfPriceByPeriodName = async (req, res) => {
    try {
        const { period } = req.params;
        const decodedPeriod = decodeURIComponent(period);

        const result = await HalfPriceNumber.deleteByPeriod(decodedPeriod);

        res.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('Delete half price numbers by period name error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการลบเลขจ่ายครึ่งราคา'
        });
    }
};

// Test endpoint for debugging
const testHalfPriceAPI = async (req, res) => {
    try {
        console.log('Testing half price API...');
        
        // Test database connection
        const { promisePool } = require('../config/database');
        
        // Check table structure
        const [columns] = await promisePool.execute(`
            DESCRIBE tbl_half_price_numbers
        `);
        
        // Check data count
        const [countResult] = await promisePool.execute('SELECT COUNT(*) as count FROM tbl_half_price_numbers');
        
        // Check periods
        const [periods] = await promisePool.execute('SELECT id, period_name, status FROM tbl_period LIMIT 3');
        
        // Test model methods
        const HalfPriceNumber = require('../models/HalfPriceNumber');
        const allNumbers = await HalfPriceNumber.getAll();
        
        res.json({
            success: true,
            debug: {
                tableExists: columns.length > 0,
                columnCount: columns.length,
                dataCount: countResult[0].count,
                periodsCount: periods.length,
                modelResults: allNumbers.length,
                sampleData: allNumbers.slice(0, 3),
                periods: periods
            }
        });
        
    } catch (error) {
        console.error('Test half price API error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
};

module.exports = {
    addHalfPriceNumbers,
    getHalfPriceByPeriod,
    getHalfPriceByPeriodAndCategory,
    getHalfPriceByPeriodName,
    getAllHalfPriceNumbers,
    deleteHalfPriceNumbers,
    deleteHalfPriceByCategory,
    deleteHalfPriceByPeriodName,
    testHalfPriceAPI
};
