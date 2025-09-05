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
        
        // 3. ตรวจสอบผลลัพธ์
        console.log('\n3. Checking results...');
        const [agents] = await promisePool.execute(`
            SELECT agent_id, agent_code, agent_name, status, role 
            FROM tbl_agent 
            ORDER BY agent_id
        `);
        
        console.log('Agents with roles:');
        agents.forEach(agent => {
            console.log(`  - ${agent.agent_name} (${agent.agent_code}): ${agent.role}`);
        });
        
        console.log('\n=== MIGRATION COMPLETED ===');
        
    } catch (error) {
        console.error('❌ Migration Error:', error);
    } finally {
        process.exit(0);
    }
}

// รัน Migration
runMigration();
