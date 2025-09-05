const { promisePool } = require('./config/database');

async function setupWinnersTable() {
    try {
        console.log('🔧 กำลังสร้างตาราง tbl_winners...');

        // ลบตารางเก่า (ถ้ามี)
        await promisePool.execute('DROP TABLE IF EXISTS tbl_winners');

        // สร้างตาราง winners ใหม่
        await promisePool.execute(`
            CREATE TABLE tbl_winners (
                id INT AUTO_INCREMENT PRIMARY KEY,
                period_id INT NOT NULL,
                agent_id INT NOT NULL,
                bill_id VARCHAR(50) NOT NULL,
                ticket_id INT NOT NULL,
                lotto_type VARCHAR(20) NOT NULL,
                lotto_number VARCHAR(10) NOT NULL,
                bet_amount DECIMAL(10,2) NOT NULL,
                payout_rate DECIMAL(10,2) NOT NULL,
                is_half_price BOOLEAN DEFAULT FALSE,
                final_payout_rate DECIMAL(10,2) NOT NULL,
                reward_amount DECIMAL(10,2) NOT NULL,
                winning_number VARCHAR(10) NOT NULL,
                result_type VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                INDEX idx_period_id (period_id),
                INDEX idx_agent_id (agent_id),
                INDEX idx_bill_id (bill_id),
                INDEX idx_lotto_type (lotto_type),
                INDEX idx_result_type (result_type)
            )
        `);

        console.log('✅ สร้างตาราง tbl_winners สำเร็จ');

        // เคลียร์ข้อมูลเก่า (ถ้ามี)
        await promisePool.execute('TRUNCATE TABLE tbl_winners');
        console.log('✅ เคลียร์ข้อมูลเก่าในตาราง tbl_winners สำเร็จ');

        console.log('🎉 Setup เสร็จสิ้น!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error setting up winners table:', error);
        process.exit(1);
    }
}

setupWinnersTable();
