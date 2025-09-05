const Result = require('../models/Result');
const Winner = require('../models/Winner');
const { SystemConfig } = require('../models/Setting');

// บันทึกผลรางวัล (Admin เท่านั้น)
const saveResult = async (req, res) => {
    try {
        const { period, period_id, result_date, result_2up, result_2down, result_3up, result_3toad } = req.body;
        
        // ตรวจสอบข้อมูลที่จำเป็น
        if ((!period && !period_id) || !result_date) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกงวดและวันที่ประกาศผล'
            });
        }
        
        // ตรวจสอบว่ามีผลรางวัลอย่างน้อย 1 รายการ
        if (!result_2up && !result_2down && !result_3up) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกผลรางวัลอย่างน้อย 1 รายการ'
            });
        }
        
        // ตรวจสอบรูปแบบเลข
        if (result_2up && !/^\d{2}$/.test(result_2up)) {
            return res.status(400).json({
                success: false,
                message: 'เลข 2 ตัวบนต้องเป็นตัวเลข 2 หลัก'
            });
        }
        
        if (result_2down && !/^\d{2}$/.test(result_2down)) {
            return res.status(400).json({
                success: false,
                message: 'เลข 2 ตัวล่างต้องเป็นตัวเลข 2 หลัก'
            });
        }
        
        if (result_3up && !/^\d{3}$/.test(result_3up)) {
            return res.status(400).json({
                success: false,
                message: 'เลข 3 ตัวบนต้องเป็นตัวเลข 3 หลัก'
            });
        }
        
        // บันทึกผลรางวัล
        const result = await Result.saveResult({
            period,
            period_id,
            result_date,
            result_2up,
            result_2down,
            result_3up,
            result_3toad
        });
        
        // ตรวจสอบผู้ชนะ
        let periodForCheck = period;
        let winners = [];

        try {
            if (!periodForCheck && period_id) {
                // ดึงชื่องวดจาก period_id
                const { promisePool } = require('../config/database');
                const [periodData] = await promisePool.execute(
                    'SELECT period_name FROM tbl_period WHERE id = ?',
                    [period_id]
                );
                if (periodData.length > 0) {
                    periodForCheck = periodData[0].period_name;
                }
            }

            if (periodForCheck) {
                winners = await Result.calculateAndSaveWinners(periodForCheck);
                console.log('✅ คำนวณและบันทึกผู้ชนะสำเร็จ:', winners.length, 'รายการ');
            }
        } catch (winnerError) {
            console.log('Warning: Could not check winners:', winnerError.message);
            // ไม่ให้ error ในการตรวจสอบผู้ชนะขัดขวางการบันทึกผลรางวัล
        }
        
        res.json({
            success: true,
            message: result.message,
            data: {
                result: {
                    period: periodForCheck,
                    period_id,
                    result_date,
                    result_2up,
                    result_2down,
                    result_3up,
                    result_3toad
                },
                winners,
                total_winners: winners.length,
                total_reward: winners.reduce((sum, winner) => sum + (winner.reward || 0), 0)
            }
        });
        
    } catch (error) {
        console.error('Save result error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการบันทึกผลรางวัล'
        });
    }
};

// ดึงผลรางวัลตามงวด
const getResultByPeriod = async (req, res) => {
    try {
        const { period } = req.params;
        const decodedPeriod = decodeURIComponent(period);
        
        const result = await Result.getResultByPeriod(decodedPeriod);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบผลรางวัลของงวดนี้'
            });
        }
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Get result by period error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผลรางวัล'
        });
    }
};

// ดึงผลรางวัลล่าสุด
const getLatestResult = async (req, res) => {
    try {
        const result = await Result.getLatestResult();
        
        if (!result) {
            return res.json({
                success: true,
                message: 'ยังไม่มีการประกาศผลรางวัล',
                data: null
            });
        }
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Get latest result error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผลรางวัล'
        });
    }
};

// ดึงผลรางวัลทั้งหมด
const getAllResults = async (req, res) => {
    try {
        const results = await Result.getAllResults();
        
        res.json({
            success: true,
            data: results
        });
        
    } catch (error) {
        console.error('Get all results error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผลรางวัล'
        });
    }
};

// ตรวจสอบผู้ชนะรางวัล
const checkWinners = async (req, res) => {
    try {
        const { period } = req.params;
        const decodedPeriod = decodeURIComponent(period);
        
        const winners = await Result.checkWinners(decodedPeriod);

        // ดึงข้อมูลผลรางวัล
        const result = await Result.getResultByPeriod(decodedPeriod);
        
        // สรุปผู้ชนะแยกตามประเภท
        const winnersByType = {};
        let totalReward = 0;
        
        winners.forEach(winner => {
            if (!winnersByType[winner.result_type]) {
                winnersByType[winner.result_type] = {
                    type_name: getLottoTypeName(winner.result_type),
                    winner_count: 0,
                    total_reward: 0
                };
            }
            
            winnersByType[winner.result_type].winner_count++;
            winnersByType[winner.result_type].total_reward += winner.reward;
            totalReward += winner.reward;
        });
        
        res.json({
            success: true,
            data: {
                result,
                winners,
                summary: {
                    total_winners: winners.length,
                    total_reward: totalReward,
                    winners_by_type: Object.values(winnersByType)
                }
            }
        });
        
    } catch (error) {
        console.error('Check winners error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบผู้ชนะ'
        });
    }
};

// ลบผลรางวัล (Admin เท่านั้น)
const deleteResult = async (req, res) => {
    try {
        const { period } = req.params;
        const decodedPeriod = decodeURIComponent(period);

        const result = await Result.deleteResult(decodedPeriod);
        
        res.json({
            success: true,
            message: result.message
        });
        
    } catch (error) {
        console.error('Delete result error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการลบผลรางวัล'
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

// อัปเดตผลรางวัล (Admin เท่านั้น)
const updateResult = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const result = await Result.updateResult(id, updateData);

        res.json({
            success: true,
            message: 'อัปเดตผลรางวัลสำเร็จ',
            data: result
        });
    } catch (error) {
        console.error('Update result error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดตผลรางวัล'
        });
    }
};

// ลบผลรางวัลตาม ID (Admin เท่านั้น)
const deleteResultById = async (req, res) => {
    try {
        const { id } = req.params;

        await Result.deleteResultById(id);

        res.json({
            success: true,
            message: 'ลบผลรางวัลสำเร็จ'
        });
    } catch (error) {
        console.error('Delete result by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบผลรางวัล'
        });
    }
};

module.exports = {
    saveResult,
    getResultByPeriod,
    getLatestResult,
    getAllResults,
    checkWinners,
    deleteResult,
    updateResult,
    deleteResultById
};
