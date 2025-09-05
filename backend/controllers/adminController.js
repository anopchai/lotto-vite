const { promisePool } = require('../config/database');

// ล้างข้อมูลทดสอบ (Admin เท่านั้น)
const clearTestData = async (req, res) => {
    try {
        // ล้างข้อมูลตั๋วหวย
        const [ticketResult] = await promisePool.execute('DELETE FROM tbl_ticket');

        // ล้างข้อมูลผลรางวัล
        const [resultResult] = await promisePool.execute('DELETE FROM tbl_result');

        // ล้างข้อมูลเลขจ่ายครึ่งราคา
        const [halfPriceResult] = await promisePool.execute('DELETE FROM tbl_half_price_numbers');

        // ล้างข้อมูลงวด (ยกเว้นงวดปัจจุบัน)
        const [periodResult] = await promisePool.execute('DELETE FROM tbl_period WHERE status != "current"');

        res.json({
            success: true,
            message: 'ล้างข้อมูลทดสอบสำเร็จ',
            data: {
                tickets_deleted: ticketResult.affectedRows,
                results_deleted: resultResult.affectedRows,
                half_price_deleted: halfPriceResult.affectedRows,
                periods_deleted: periodResult.affectedRows
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการล้างข้อมูลทดสอบ'
        });
    }
};

// รีเซ็ตข้อมูลทั้งหมด (Admin เท่านั้น)
const resetAllData = async (req, res) => {
    try {
        // ปิด foreign key checks ชั่วคราว
        await promisePool.execute('SET FOREIGN_KEY_CHECKS = 0');

        // ล้างข้อมูลทั้งหมด
        const [ticketResult] = await promisePool.execute('DELETE FROM tbl_ticket');

        const [resultResult] = await promisePool.execute('DELETE FROM tbl_result');

        const [halfPriceResult] = await promisePool.execute('DELETE FROM tbl_half_price_numbers');

        const [periodResult] = await promisePool.execute('DELETE FROM tbl_period');

        // ตรวจสอบว่าตาราง tbl_winners มีอยู่หรือไม่
        let winnersResult = { affectedRows: 0 };
        try {
            [winnersResult] = await promisePool.execute('DELETE FROM tbl_winners');
        } catch (winnersError) {
            // ตาราง tbl_winners อาจยังไม่ถูกสร้าง
        }

        // รีเซ็ต AUTO_INCREMENT
        await promisePool.execute('ALTER TABLE tbl_ticket AUTO_INCREMENT = 1');
        await promisePool.execute('ALTER TABLE tbl_result AUTO_INCREMENT = 1');
        await promisePool.execute('ALTER TABLE tbl_half_price_numbers AUTO_INCREMENT = 1');
        await promisePool.execute('ALTER TABLE tbl_period AUTO_INCREMENT = 1');

        // รีเซ็ต AUTO_INCREMENT สำหรับ tbl_winners (ถ้ามี)
        try {
            await promisePool.execute('ALTER TABLE tbl_winners AUTO_INCREMENT = 1');
        } catch (winnersAutoIncError) {
            // ตาราง tbl_winners อาจยังไม่ถูกสร้าง
        }

        // เปิด foreign key checks กลับ
        await promisePool.execute('SET FOREIGN_KEY_CHECKS = 1');

        res.json({
            success: true,
            message: 'รีเซ็ตข้อมูลทั้งหมดสำเร็จ',
            data: {
                tickets_deleted: ticketResult.affectedRows,
                results_deleted: resultResult.affectedRows,
                half_price_deleted: halfPriceResult.affectedRows,
                periods_deleted: periodResult.affectedRows,
                winners_deleted: winnersResult.affectedRows
            }
        });

    } catch (error) {
        // เปิด foreign key checks กลับในกรณี error
        try {
            await promisePool.execute('SET FOREIGN_KEY_CHECKS = 1');
        } catch (fkError) {
            // Ignore foreign key reset error
        }

        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ดูข้อมูลในฐานข้อมูล
const getDatabaseInfo = async (req, res) => {
    try {
        // นับจำนวนข้อมูลในแต่ละตาราง
        const [ticketCount] = await promisePool.execute('SELECT COUNT(*) as count FROM tbl_ticket');
        const [resultCount] = await promisePool.execute('SELECT COUNT(*) as count FROM tbl_result');
        const [agentCount] = await promisePool.execute('SELECT COUNT(*) as count FROM tbl_agent WHERE agent_code != "ADMIN"');
        const [periodCount] = await promisePool.execute('SELECT COUNT(*) as count FROM tbl_period');
        const [halfPriceCount] = await promisePool.execute('SELECT COUNT(*) as count FROM tbl_half_price_numbers');
        
        // ดูข้อมูลตั๋วล่าสุด
        const [recentTickets] = await promisePool.execute(`
            SELECT t.*, a.agent_name 
            FROM tbl_ticket t 
            JOIN tbl_agent a ON t.agent_id = a.agent_id 
            ORDER BY t.created_at DESC 
            LIMIT 10
        `);
        
        // ดูยอดขายรวมของแต่ละตัวแทน
        const [salesByAgent] = await promisePool.execute(`
            SELECT 
                a.agent_code,
                a.agent_name,
                COUNT(t.ticket_id) as total_tickets,
                SUM(t.price) as total_sales
            FROM tbl_agent a
            LEFT JOIN tbl_ticket t ON a.agent_id = t.agent_id
            WHERE a.agent_code != 'ADMIN'
            GROUP BY a.agent_id
            ORDER BY total_sales DESC
        `);
        
        res.json({
            success: true,
            data: {
                counts: {
                    tickets: ticketCount[0].count,
                    results: resultCount[0].count,
                    agents: agentCount[0].count,
                    periods: periodCount[0].count,
                    half_price_numbers: halfPriceCount[0].count
                },
                recent_tickets: recentTickets,
                sales_by_agent: salesByAgent
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

// Format Data - รีเซ็ตระบบกลับไปเป็น 0 ยกเว้นอัตราจ่าย (Admin เท่านั้น)
const formatData = async (req, res) => {
    console.log('🔄 Format Data API called');

    try {
        // ทดสอบการเชื่อมต่อฐานข้อมูลก่อน
        console.log('📝 Testing database connection...');
        await promisePool.execute('SELECT 1 as test');
        console.log('✅ Database connection OK');

        console.log('📝 Step 1: Disabling foreign key checks...');
        await promisePool.execute('SET FOREIGN_KEY_CHECKS = 0');
        console.log('✅ Foreign key checks disabled');

        // ลบข้อมูลทีละตาราง พร้อม error handling
        let ticketResult = { affectedRows: 0 };
        let resultResult = { affectedRows: 0 };
        let halfPriceResult = { affectedRows: 0 };
        let periodResult = { affectedRows: 0 };

        try {
            console.log('📝 Step 2: Deleting tickets...');
            [ticketResult] = await promisePool.execute('DELETE FROM tbl_ticket');
            console.log(`✅ Deleted ${ticketResult.affectedRows} tickets`);
        } catch (ticketError) {
            console.log('⚠️ Ticket table error:', ticketError.message);
        }

        try {
            console.log('📝 Step 3: Deleting results...');
            [resultResult] = await promisePool.execute('DELETE FROM tbl_result');
            console.log(`✅ Deleted ${resultResult.affectedRows} results`);
        } catch (resultError) {
            console.log('⚠️ Result table error:', resultError.message);
        }

        try {
            console.log('📝 Step 4: Deleting half price numbers...');
            [halfPriceResult] = await promisePool.execute('DELETE FROM tbl_half_price_numbers');
            console.log(`✅ Deleted ${halfPriceResult.affectedRows} half price numbers`);
        } catch (halfPriceError) {
            console.log('⚠️ Half price table error:', halfPriceError.message);
        }

        try {
            console.log('📝 Step 5: Deleting periods...');
            [periodResult] = await promisePool.execute('DELETE FROM tbl_period');
            console.log(`✅ Deleted ${periodResult.affectedRows} periods`);
        } catch (periodError) {
            console.log('⚠️ Period table error:', periodError.message);
        }

        // ตรวจสอบว่าตาราง tbl_winners มีอยู่หรือไม่
        let winnersResult = { affectedRows: 0 };
        try {
            [winnersResult] = await promisePool.execute('DELETE FROM tbl_winners');
        } catch (winnersError) {
            // ตาราง tbl_winners อาจยังไม่ถูกสร้าง
        }

        // รีเซ็ต AUTO_INCREMENT
        await promisePool.execute('ALTER TABLE tbl_ticket AUTO_INCREMENT = 1');
        await promisePool.execute('ALTER TABLE tbl_result AUTO_INCREMENT = 1');
        await promisePool.execute('ALTER TABLE tbl_half_price_numbers AUTO_INCREMENT = 1');
        await promisePool.execute('ALTER TABLE tbl_period AUTO_INCREMENT = 1');

        // รีเซ็ต AUTO_INCREMENT สำหรับ tbl_winners (ถ้ามี)
        try {
            await promisePool.execute('ALTER TABLE tbl_winners AUTO_INCREMENT = 1');
        } catch (winnersAutoIncError) {
            // ตาราง tbl_winners อาจยังไม่ถูกสร้าง
        }

        // รีเซ็ตสถานะระบบเป็นปิด (ถ้าตาราง tbl_settings มีอยู่)
        try {
            await promisePool.execute('UPDATE tbl_settings SET setting_value = "0" WHERE setting_key = "system_status"');
        } catch (settingsError) {
            // ตาราง tbl_settings อาจยังไม่มี หรือไม่มี system_status
        }

        // เปิด foreign key checks กลับ
        await promisePool.execute('SET FOREIGN_KEY_CHECKS = 1');

        res.json({
            success: true,
            message: 'Format Data สำเร็จ - ระบบถูกรีเซ็ตกลับไปเป็น 0',
            data: {
                tickets_deleted: ticketResult.affectedRows,
                results_deleted: resultResult.affectedRows,
                half_price_deleted: halfPriceResult.affectedRows,
                periods_deleted: periodResult.affectedRows,
                winners_deleted: winnersResult.affectedRows,
                system_status: 'ปิด'
            }
        });

    } catch (error) {
        console.error('❌ Format Data Error:', error);

        // เปิด foreign key checks กลับในกรณี error
        try {
            await promisePool.execute('SET FOREIGN_KEY_CHECKS = 1');
        } catch (fkError) {
            console.error('❌ FK Reset Error:', fkError);
        }

        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการ Format Data',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    clearTestData,
    resetAllData,
    getDatabaseInfo,
    formatData
};
