-- Lotto Vite System Database Schema
-- Version: 1.0
-- Date: 2025-09-02

-- Create database
CREATE DATABASE IF NOT EXISTS lotto_vite_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lotto_vite_system;

-- Table: tbl_agent (ตัวแทนขายหวย)
CREATE TABLE IF NOT EXISTS tbl_agent (
    agent_id INT AUTO_INCREMENT PRIMARY KEY,
    agent_code VARCHAR(50) NOT NULL UNIQUE,
    agent_name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    income INT(10) DEFAULT 0 COMMENT 'สัดส่วนรายได้เป็นเปอร์เซ็นต์',
    status ENUM('active', 'inactive') DEFAULT 'active',
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_agent_code (agent_code),
    INDEX idx_status (status),
    INDEX idx_role (role)
);

-- Insert default admin user
INSERT INTO tbl_agent (agent_code, agent_name, password, role) VALUES 
('ADMIN', 'Administrator', '$2a$10$rOzJqQZ8QxQZ8QxQZ8QxQeOu7v6Z8QxQZ8QxQZ8QxQZ8QxQZ8', 'admin');

-- Table: tbl_period (งวดหวย)
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
);

-- Insert default period
INSERT INTO tbl_period (period_name, period_date, status, is_current) VALUES 
(CONCAT('งวด', DATE_FORMAT(NOW(), '%Y-%m-%d')), CURDATE(), 'open', TRUE);

-- Table: tbl_ticket (ตั๋วหวย)
CREATE TABLE IF NOT EXISTS tbl_ticket (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id VARCHAR(50) NOT NULL,
    agent_id INT NOT NULL,
    period_id INT NOT NULL,
    buyer_name TEXT NOT NULL,
    seller_name VARCHAR(100),
    lotto_number VARCHAR(10) NOT NULL,
    lotto_type ENUM('2up', '2down', '3up', '3toad', '3straight_toad', 'runup', 'rundown') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    price_toad DECIMAL(10,2) DEFAULT 0,
    is_reverse BOOLEAN DEFAULT FALSE,
    is_half_price BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (agent_id) REFERENCES tbl_agent(agent_id) ON DELETE CASCADE,
    FOREIGN KEY (period_id) REFERENCES tbl_period(id) ON DELETE RESTRICT,
    
    INDEX idx_bill_id (bill_id),
    INDEX idx_agent_id (agent_id),
    INDEX idx_period_id (period_id),
    INDEX idx_lotto_type (lotto_type),
    INDEX idx_created_at (created_at),
    INDEX idx_period_agent (period_id, agent_id),
    INDEX idx_period_lotto (period_id, lotto_type, lotto_number)
);

-- Table: tbl_result (ผลหวย)
CREATE TABLE IF NOT EXISTS tbl_result (
    id INT AUTO_INCREMENT PRIMARY KEY,
    period_id INT NOT NULL,
    period VARCHAR(50) NOT NULL,
    result_date DATE NOT NULL,
    result_2up VARCHAR(2),
    result_2down VARCHAR(2),
    result_3up VARCHAR(3),
    status ENUM('pending', 'announced') DEFAULT 'pending',
    announced_by INT,
    announced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (period_id) REFERENCES tbl_period(id) ON DELETE CASCADE,
    FOREIGN KEY (announced_by) REFERENCES tbl_agent(agent_id) ON DELETE SET NULL,
    
    INDEX idx_period (period),
    INDEX idx_status (status),
    INDEX idx_result_date (result_date)
);

-- Table: tbl_half_price_numbers (เลขจ่ายครึ่งราคา)
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
);

-- Table: tbl_setting (ตั้งค่าระบบ)
CREATE TABLE IF NOT EXISTS tbl_setting (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key)
);

-- Insert default settings
INSERT INTO tbl_setting (setting_key, setting_value, description) VALUES
('2up', '70', 'อัตราจ่าย 2 ตัวบน'),
('2down', '70', 'อัตราจ่าย 2 ตัวล่าง'),
('3up', '500', 'อัตราจ่าย 3 ตัวบน'),
('3toad', '90', 'อัตราจ่าย 3 ตัวโต๊ด'),
('runup', '3', 'อัตราจ่ายวิ่งบน'),
('rundown', '3', 'อัตราจ่ายวิ่งล่าง'),
('system_status', 'open', 'สถานะระบบ (open/closed)'),
('current_period', '', 'งวดปัจจุบัน');

-- Table: tbl_winners (ผู้ชนะ)
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