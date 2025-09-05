-- สร้างตาราง winners เพื่อเก็บข้อมูลผู้ชนะ
CREATE TABLE IF NOT EXISTS tbl_winners (
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
    INDEX idx_result_type (result_type),
    
    FOREIGN KEY (period_id) REFERENCES tbl_period(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES tbl_agent(agent_id) ON DELETE CASCADE,
    FOREIGN KEY (ticket_id) REFERENCES tbl_ticket(id) ON DELETE CASCADE
);

-- เคลียร์ข้อมูลเก่า (ถ้ามี)
TRUNCATE TABLE tbl_winners;
