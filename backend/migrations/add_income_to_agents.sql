-- Migration: เพิ่มฟิลด์ income ในตาราง tbl_agent
-- วันที่: 2025-08-21

-- เพิ่มฟิลด์ income ในตาราง tbl_agent
ALTER TABLE tbl_agent 
ADD COLUMN income DECIMAL(10,2) DEFAULT 0.00 COMMENT 'รายได้ของตัวแทน' 
AFTER phone;

-- อัปเดตข้อมูลเริ่มต้น (ถ้าต้องการ)
UPDATE tbl_agent SET income = 0.00 WHERE income IS NULL;
