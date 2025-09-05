const { promisePool } = require('../config/database');
const fs = require('fs');
const path = require('path');

// รัน Migration สำหรับแก้ไขโครงสร้างฐานข้อมูล
const runDatabaseMigration = async (req, res) => {
    try {
        console.log('=== STARTING DATABASE MIGRATION ===');
        
        // ตรวจสอบโครงสร้างปัจจุบัน
        const currentStructure = await checkCurrentStructure();
        console.log('Current Structure:', currentStructure);
        
        if (currentStructure.needsMigration) {
            // รัน Migration
            await runMigrationSteps();
            
            // ตรวจสอบผลลัพธ์
            const newStructure = await checkCurrentStructure();
            console.log('New Structure:', newStructure);
            
            res.json({
                success: true,
                message: 'Migration completed successfully',
                data: {
                    before: currentStructure,
                    after: newStructure
                }
            });
        } else {
            res.json({
                success: true,
                message: 'Database structure is already up to date',
                data: currentStructure
            });
        }
        
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({
            success: false,
            message: 'Migration failed: ' + error.message
        });
    }
};

// ตรวจสอบโครงสร้างปัจจุบัน
const checkCurrentStructure = async () => {
    try {
        // ตรวจสอบ tbl_half_price_numbers
        const [halfPriceColumns] = await promisePool.execute(`
            SHOW COLUMNS FROM tbl_half_price_numbers
        `);
        
        // ตรวจสอบ tbl_ticket
        const [ticketColumns] = await promisePool.execute(`
            SHOW COLUMNS FROM tbl_ticket
        `);
        
        const hasPeriodIdInHalfPrice = halfPriceColumns.some(col => col.Field === 'period_id');
        const hasPeriodIdInTicket = ticketColumns.some(col => col.Field === 'period_id');
        
        return {
            half_price_has_period_id: hasPeriodIdInHalfPrice,
            ticket_has_period_id: hasPeriodIdInTicket,
            needsMigration: !hasPeriodIdInHalfPrice || !hasPeriodIdInTicket,
            columns: {
                half_price: halfPriceColumns.map(col => col.Field),
                ticket: ticketColumns.map(col => col.Field)
            }
        };
    } catch (error) {
        throw new Error('Failed to check current structure: ' + error.message);
    }
};

// รัน Migration Steps
const runMigrationSteps = async () => {
    const connection = await promisePool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Step 1: เพิ่ม period_id ใน tbl_half_price_numbers
        console.log('Step 1: Adding period_id to tbl_half_price_numbers...');
        
        // ตรวจสอบว่ามี column period_id แล้วหรือไม่
        const [halfPriceColumns] = await connection.execute(`
            SHOW COLUMNS FROM tbl_half_price_numbers LIKE 'period_id'
        `);
        
        if (halfPriceColumns.length === 0) {
            // เพิ่ม column period_id
            await connection.execute(`
                ALTER TABLE tbl_half_price_numbers 
                ADD COLUMN period_id INT AFTER id
            `);
            
            // อัปเดตข้อมูล period_id จาก period string
            await connection.execute(`
                UPDATE tbl_half_price_numbers h 
                JOIN tbl_period p ON h.period = p.period 
                SET h.period_id = p.id
            `);
            
            // เพิ่ม foreign key constraint
            await connection.execute(`
                ALTER TABLE tbl_half_price_numbers 
                ADD CONSTRAINT fk_half_price_period 
                FOREIGN KEY (period_id) REFERENCES tbl_period(id) ON DELETE CASCADE
            `);
            
            console.log('✓ Added period_id to tbl_half_price_numbers');
        }
        
        // Step 2: เพิ่ม period_id ใน tbl_ticket
        console.log('Step 2: Adding period_id to tbl_ticket...');
        
        // ตรวจสอบว่ามี column period_id แล้วหรือไม่
        const [ticketColumns] = await connection.execute(`
            SHOW COLUMNS FROM tbl_ticket LIKE 'period_id'
        `);
        
        if (ticketColumns.length === 0) {
            // เพิ่ม column period_id
            await connection.execute(`
                ALTER TABLE tbl_ticket 
                ADD COLUMN period_id INT AFTER agent_id
            `);
            
            // อัปเดตข้อมูล period_id จากงวดปัจจุบัน
            await connection.execute(`
                UPDATE tbl_ticket t 
                JOIN tbl_period p ON p.status = 'current' 
                SET t.period_id = p.id 
                WHERE t.period_id IS NULL
            `);
            
            // เพิ่ม foreign key constraint
            await connection.execute(`
                ALTER TABLE tbl_ticket 
                ADD CONSTRAINT fk_ticket_period 
                FOREIGN KEY (period_id) REFERENCES tbl_period(id) ON DELETE RESTRICT
            `);
            
            console.log('✓ Added period_id to tbl_ticket');
        }
        
        // Step 3: เพิ่ม indexes
        console.log('Step 3: Adding indexes...');
        
        try {
            await connection.execute(`
                CREATE INDEX idx_half_price_period ON tbl_half_price_numbers(period_id)
            `);
        } catch (e) {
            if (!e.message.includes('Duplicate key name')) throw e;
        }
        
        try {
            await connection.execute(`
                CREATE INDEX idx_ticket_period ON tbl_ticket(period_id)
            `);
        } catch (e) {
            if (!e.message.includes('Duplicate key name')) throw e;
        }
        
        try {
            await connection.execute(`
                CREATE INDEX idx_ticket_period_agent ON tbl_ticket(period_id, agent_id)
            `);
        } catch (e) {
            if (!e.message.includes('Duplicate key name')) throw e;
        }
        
        console.log('✓ Added indexes');

        // Step 4: เพิ่มคอลัมน์ role ในตาราง tbl_agent
        console.log('Step 4: Adding role column to tbl_agent...');

        try {
            await connection.execute(`
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

        // อัปเดต ADMIN ให้มี role เป็น admin
        await connection.execute(`
            UPDATE tbl_agent
            SET role = 'admin'
            WHERE agent_code = 'ADMIN'
        `);
        console.log('✓ Updated ADMIN role');

        // Step 5: สร้างงวดเริ่มต้นถ้ายังไม่มี
        console.log('Step 4: Creating default period if not exists...');

        const [existingPeriods] = await connection.execute('SELECT COUNT(*) as count FROM tbl_period');
        if (existingPeriods[0].count === 0) {
            const today = new Date().toISOString().split('T')[0];
            const periodName = new Date().toLocaleDateString('th-TH', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).replace(/\//g, '/');

            await connection.execute(`
                INSERT INTO tbl_period (period, period_date, status)
                VALUES (?, ?, 'current')
            `, [periodName, today]);

            console.log('✓ Created default period:', periodName);
        } else {
            console.log('✓ Period already exists');
        }

        await connection.commit();
        console.log('=== MIGRATION COMPLETED SUCCESSFULLY ===');
        
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// เพิ่มฟิลด์ income ในตาราง tbl_agent
const addIncomeToAgents = async (req, res) => {
    try {
        console.log('🔄 Starting migration: Add income field to tbl_agent');

        // ตรวจสอบว่าฟิลด์ income มีอยู่แล้วหรือไม่
        const [columns] = await promisePool.execute(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'lotto_vite_system'
            AND TABLE_NAME = 'tbl_agent'
            AND COLUMN_NAME = 'income'
        `);

        if (columns.length > 0) {
            return res.json({
                success: true,
                message: 'ฟิลด์ income มีอยู่แล้วในตาราง tbl_agent',
                data: { already_exists: true }
            });
        }

        // เพิ่มฟิลด์ income
        await promisePool.execute(`
            ALTER TABLE tbl_agent
            ADD COLUMN income DECIMAL(10,2) DEFAULT 0.00 COMMENT 'รายได้ของตัวแทน'
            AFTER phone
        `);

        // อัปเดตข้อมูลเริ่มต้น
        await promisePool.execute(`
            UPDATE tbl_agent SET income = 0.00 WHERE income IS NULL
        `);

        console.log('✅ Migration completed successfully');

        res.json({
            success: true,
            message: 'เพิ่มฟิลด์ income ในตาราง tbl_agent สำเร็จ',
            data: {
                field_added: true,
                default_value_set: true
            }
        });

    } catch (error) {
        console.error('❌ Migration error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการ migration: ' + error.message
        });
    }
};

module.exports = {
    runDatabaseMigration,
    checkCurrentStructure,
    addIncomeToAgents
};
