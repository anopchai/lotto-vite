const { promisePool } = require('./config/database');

async function runMigration() {
    console.log('=== RUNNING ROLE MIGRATION ===');
    
    try {
        // 1. เพิ่มคอลัมน์ role ในตาราง tbl_agent
        console.log('\n1. Adding role column to tbl_agent...');
        
        try {
            await promisePool.execute(`
                ALTER TABLE tbl_agent 
                ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user' 
                AFTER status
            `);
            console.log('✓ Added role column to tbl_agent');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('✓ Role column already exists');
            } else {
                throw error;
            }
        }
        
        // 2. อัปเดต ADMIN ให้มี role เป็น admin
        console.log('\n2. Updating ADMIN role...');
        await promisePool.execute(`
            UPDATE tbl_agent 
            SET role = 'admin' 
            WHERE agent_code = 'ADMIN'
        `);
        console.log('✓ Updated ADMIN role to admin');
        
        // 3. ลบรายการ 3straight_toad ออกจาก tbl_setting
        console.log('\n3. Removing 3straight_toad from tbl_setting...');
        try {
            const [result] = await promisePool.execute(`
                DELETE FROM tbl_setting 
                WHERE lotto_type = '3straight_toad'
            `);
            console.log(`✓ Removed ${result.affectedRows} 3straight_toad entries from tbl_setting`);
        } catch (error) {
            console.log('⚠️ Error removing 3straight_toad from tbl_setting:', error.message);
        }
        
        // 4. อัปเดตตั๋วที่มี lotto_type เป็น 3straight_toad ให้เป็น 3toad
        console.log('\n4. Updating tickets with 3straight_toad to 3toad...');
        try {
            const [result] = await promisePool.execute(`
                UPDATE tbl_ticket 
                SET lotto_type = '3toad' 
                WHERE lotto_type = '3straight_toad'
            `);
            console.log(`✓ Updated ${result.affectedRows} tickets from 3straight_toad to 3toad`);
        } catch (error) {
            console.log('⚠️ Error updating tickets from 3straight_toad to 3toad:', error.message);
        }
        
        // 5. ตรวจสอบผลลัพธ์
        console.log('\n5. Checking results...');
        const [agents] = await promisePool.execute(`
            SELECT agent_id, agent_code, agent_name, status, role 
            FROM tbl_agent 
            ORDER BY agent_id
        `);
        
        console.log('Agents with roles:');
        agents.forEach(agent => {
            console.log(`  - ${agent.agent_name} (${agent.agent_code}): ${agent.role}`);
        });
        
        // ตรวจสอบการตั้งค่าปัจจุบัน
        console.log('\nCurrent settings:');
        const [settings] = await promisePool.execute(`
            SELECT lotto_type, payout_rate 
            FROM tbl_setting 
            ORDER BY lotto_type
        `);
        
        settings.forEach(setting => {
            console.log(`  - ${setting.lotto_type}: ${setting.payout_rate}`);
        });
        
        console.log('\n=== MIGRATION COMPLETED ===');
        
    } catch (error) {
        console.error('❌ Migration Error:', error);
        process.exit(1);
    } finally {
        // Don't exit here, let the process continue
    }
}

// รัน Migration
runMigration().then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
}).catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
});