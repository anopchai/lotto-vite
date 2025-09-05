const mysql = require('mysql2');
require('dotenv').config();

// สร้าง connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'host.docker.internal',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'lotto_vite_system',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// สร้าง promise-based pool
const promisePool = pool.promise();

async function remove3StraightToad() {
    try {
        console.log('Connecting to database...');
        
        // Check if 3straight_toad exists
        const [rows] = await promisePool.execute(
            'SELECT * FROM tbl_setting WHERE lotto_type = ?',
            ['3straight_toad']
        );

        if (rows.length > 0) {
            console.log('Found 3straight_toad entry:', rows[0]);
            
            // Remove the 3straight_toad entry
            const [result] = await promisePool.execute(
                'DELETE FROM tbl_setting WHERE lotto_type = ?',
                ['3straight_toad']
            );
            
            console.log(`✅ Removed ${result.affectedRows} 3straight_toad entry from tbl_setting`);
        } else {
            console.log('✅ No 3straight_toad entry found in tbl_setting');
        }

        // Also check in tbl_ticket table
        const [ticketRows] = await promisePool.execute(
            'SELECT COUNT(*) as count FROM tbl_ticket WHERE lotto_type = ?',
            ['3straight_toad']
        );

        if (ticketRows[0].count > 0) {
            console.log(`Found ${ticketRows[0].count} tickets with 3straight_toad type`);
            
            // Update tickets to use 3toad instead
            const [updateResult] = await promisePool.execute(
                'UPDATE tbl_ticket SET lotto_type = ? WHERE lotto_type = ?',
                ['3toad', '3straight_toad']
            );
            
            console.log(`✅ Updated ${updateResult.affectedRows} tickets from 3straight_toad to 3toad`);
        } else {
            console.log('✅ No tickets with 3straight_toad type found');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error removing 3straight_toad:', error.message);
        process.exit(1);
    }
}

remove3StraightToad();