const mysql = require('mysql2');
require('dotenv').config();

// สร้าง connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lotto_vite_system',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// สร้าง promise-based pool
const promisePool = pool.promise();

// ทดสอบการเชื่อมต่อและสร้างตารางที่ขาดหาย
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ Database connected successfully');

    // สร้างตาราง periods (งวดหวย) ถ้ายังไม่มี
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS tbl_period (
          id INT AUTO_INCREMENT PRIMARY KEY,
          period_name VARCHAR(50) NOT NULL UNIQUE,
          period_date DATE NOT NULL,
          status ENUM('open', 'closed') DEFAULT 'open',
          is_current BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_status (status),
          INDEX idx_current (is_current)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // สร้างงวดเริ่มต้นถ้ายังไม่มี
      const [existingPeriods] = await connection.execute('SELECT COUNT(*) as count FROM tbl_period');
      if (existingPeriods[0].count === 0) {
        const currentDate = new Date().toISOString().split('T')[0];
        const periodName = `งวด${currentDate}`;
        await connection.execute(`
          INSERT INTO tbl_period (period_name, period_date, status, is_current)
          VALUES (?, ?, 'open', TRUE)
        `, [periodName, currentDate]);
      }
    } catch (error) {
      console.log('⚠️ Period table creation warning:', error.message);
    }

    // สร้างตาราง half price numbers ถ้ายังไม่มี
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS tbl_half_price_numbers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          period_id INT,
          category ENUM('2digit', '3digit') NOT NULL,
          lotto_type ENUM('2up', '2down', '3up', '3toad', 'runup', 'rundown') NOT NULL,
          number VARCHAR(10) NOT NULL,
          has_reverse BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (period_id) REFERENCES tbl_period(id) ON DELETE CASCADE,
          INDEX idx_period_category (period_id, category),
          UNIQUE KEY unique_period_type_number (period_id, lotto_type, number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // เพิ่มคอลัมน์ใหม่ในตาราง ticket ถ้ายังไม่มี
      try {
        await connection.execute(`
          ALTER TABLE tbl_ticket
          ADD COLUMN seller_name VARCHAR(100),
          ADD COLUMN price_toad INT DEFAULT 0,
          ADD COLUMN is_half_price BOOLEAN DEFAULT FALSE
        `);
      } catch (alterError) {
        // ไม่ error ถ้าคอลัมน์มีอยู่แล้ว
      }

      // เปลี่ยนประเภทของ buyer_name เป็น TEXT
      try {
        await connection.execute(`
          ALTER TABLE tbl_ticket
          MODIFY COLUMN buyer_name TEXT NOT NULL
        `);
      } catch (modifyError) {
        // ไม่ error ถ้าเปลี่ยนแล้ว
      }

      // เพิ่มคอลัมน์ income (สัดส่วนรายได้) ในตาราง tbl_agent
      try {
        // ลองเพิ่มคอลัมน์ income โดยตรง
        await connection.execute(`
          ALTER TABLE tbl_agent
          ADD COLUMN income INT(10) DEFAULT 0 COMMENT 'สัดส่วนรายได้เป็นเปอร์เซ็นต์'
        `);
        console.log('✅ Added income column to tbl_agent');
      } catch (alterError) {
        if (alterError.message.includes('Duplicate column name')) {
          console.log('✅ Income column already exists in tbl_agent');
        } else {
          console.log('⚠️ Income column error:', alterError.message);
        }
      }

      console.log('✅ Database tables updated successfully');
    } catch (error) {
      console.log('⚠️ Database table update warning:', error.message);
    }

    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// เรียกใช้ทดสอบการเชื่อมต่อแบบง่าย (ไม่ setup)
const simpleTestConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
};

simpleTestConnection();

module.exports = {
  pool,
  promisePool
};
