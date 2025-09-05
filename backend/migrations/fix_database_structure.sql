-- Migration Script: แก้ไขโครงสร้างฐานข้อมูล
-- วันที่: 2025-01-20
-- วัตถุประสงค์: เพิ่ม period_id ใน tbl_half_price_numbers และ tbl_ticket

-- ===== ขั้นตอนที่ 1: เพิ่ม period_id ใน tbl_half_price_numbers =====

-- เพิ่ม column period_id
ALTER TABLE tbl_half_price_numbers 
ADD COLUMN period_id INT AFTER id;

-- อัปเดตข้อมูล period_id จาก period string
UPDATE tbl_half_price_numbers h 
JOIN tbl_period p ON h.period = p.period 
SET h.period_id = p.id;

-- เพิ่ม foreign key constraint
ALTER TABLE tbl_half_price_numbers 
ADD CONSTRAINT fk_half_price_period 
FOREIGN KEY (period_id) REFERENCES tbl_period(id) ON DELETE CASCADE;

-- ลบ column period เก่า (หลังจากย้ายข้อมูลแล้ว)
-- ALTER TABLE tbl_half_price_numbers DROP COLUMN period;

-- ===== ขั้นตอนที่ 2: เพิ่ม period_id ใน tbl_ticket =====

-- เพิ่ม column period_id
ALTER TABLE tbl_ticket 
ADD COLUMN period_id INT AFTER agent_id;

-- อัปเดตข้อมูล period_id จากงวดปัจจุบัน (สำหรับข้อมูลเก่า)
UPDATE tbl_ticket t 
JOIN tbl_period p ON p.status = 'current' 
SET t.period_id = p.id 
WHERE t.period_id IS NULL;

-- เพิ่ม foreign key constraint
ALTER TABLE tbl_ticket 
ADD CONSTRAINT fk_ticket_period 
FOREIGN KEY (period_id) REFERENCES tbl_period(id) ON DELETE RESTRICT;

-- ===== ขั้นตอนที่ 3: เพิ่ม index เพื่อประสิทธิภาพ =====

-- Index สำหรับ tbl_half_price_numbers
CREATE INDEX idx_half_price_period ON tbl_half_price_numbers(period_id);

-- Index สำหรับ tbl_ticket
CREATE INDEX idx_ticket_period ON tbl_ticket(period_id);
CREATE INDEX idx_ticket_period_agent ON tbl_ticket(period_id, agent_id);
CREATE INDEX idx_ticket_period_lotto ON tbl_ticket(period_id, lotto_type, lotto_number);

-- ===== ขั้นตอนที่ 4: ตรวจสอบข้อมูล =====

-- ตรวจสอบ tbl_half_price_numbers
SELECT 
    h.id,
    h.number,
    h.period_id,
    p.period,
    p.period_date
FROM tbl_half_price_numbers h
JOIN tbl_period p ON h.period_id = p.id
ORDER BY p.period_date DESC, h.number;

-- ตรวจสอบ tbl_ticket
SELECT 
    t.ticket_id,
    t.bill_id,
    t.lotto_type,
    t.lotto_number,
    t.price,
    t.period_id,
    p.period,
    p.period_date,
    a.agent_name
FROM tbl_ticket t
JOIN tbl_period p ON t.period_id = p.id
JOIN tbl_agent a ON t.agent_id = a.agent_id
ORDER BY t.created_at DESC
LIMIT 10;

-- ตรวจสอบจำนวนข้อมูล
SELECT 
    'tbl_period' as table_name,
    COUNT(*) as count
FROM tbl_period
UNION ALL
SELECT 
    'tbl_half_price_numbers' as table_name,
    COUNT(*) as count
FROM tbl_half_price_numbers
UNION ALL
SELECT 
    'tbl_ticket' as table_name,
    COUNT(*) as count
FROM tbl_ticket;
