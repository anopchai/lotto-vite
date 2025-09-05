const { promisePool } = require('../config/database');

class Setting {
    // ดึงการตั้งค่าทั้งหมด
    static async getAllSettings() {
        const [rows] = await promisePool.execute(
            'SELECT * FROM tbl_setting ORDER BY lotto_type'
        );
        return rows;
    }
    
    // ดึงอัตราจ่ายตามประเภท
    static async getPayoutRate(lottoType) {
        const [rows] = await promisePool.execute(
            'SELECT payout_rate FROM tbl_setting WHERE lotto_type = ?',
            [lottoType]
        );
        return rows[0]?.payout_rate || 0;
    }
    
    // อัปเดตอัตราจ่าย
    static async updatePayoutRate(lottoType, payoutRate) {
        try {
            const [result] = await promisePool.execute(
                'UPDATE tbl_setting SET payout_rate = ? WHERE lotto_type = ?',
                [payoutRate, lottoType]
            );
            
            if (result.affectedRows === 0) {
                // ถ้าไม่มีข้อมูล ให้เพิ่มใหม่
                await promisePool.execute(
                    'INSERT INTO tbl_setting (lotto_type, payout_rate) VALUES (?, ?)',
                    [lottoType, payoutRate]
                );
                return { success: true, action: 'created' };
            }
            
            return { success: true, action: 'updated' };
        } catch (error) {
            throw error;
        }
    }
    
    // อัปเดตการตั้งค่าหลายรายการพร้อมกัน
    static async updateMultipleSettings(settings) {
        const connection = await promisePool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            for (const setting of settings) {
                await connection.execute(
                    'UPDATE tbl_setting SET payout_rate = ? WHERE lotto_type = ?',
                    [setting.payout_rate, setting.lotto_type]
                );
            }
            
            await connection.commit();
            return { success: true };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    
    // ดึงการตั้งค่าในรูปแบบ object
    static async getSettingsAsObject() {
        const settings = await this.getAllSettings();
        const settingsObj = {};
        
        settings.forEach(setting => {
            settingsObj[setting.lotto_type] = setting.payout_rate;
        });
        
        return settingsObj;
    }
    
    // รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้น
    static async resetToDefault() {
        const defaultSettings = [
            { lotto_type: '2up', payout_rate: 70 },
            { lotto_type: '2down', payout_rate: 70 },
            { lotto_type: '3up', payout_rate: 500 },
            { lotto_type: '3toad', payout_rate: 90 },
            { lotto_type: 'runup', payout_rate: 3 },
            { lotto_type: 'rundown', payout_rate: 3 }
        ];
        
        return await this.updateMultipleSettings(defaultSettings);
    }
}

// System Config Class
class SystemConfig {
    // ดึงการตั้งค่าระบบทั้งหมด
    static async getAllConfigs() {
        const [rows] = await promisePool.execute(
            'SELECT * FROM tbl_system_config ORDER BY config_key'
        );
        return rows;
    }
    
    // ดึงค่าการตั้งค่าตาม key
    static async getConfigValue(key) {
        const [rows] = await promisePool.execute(
            'SELECT config_value FROM tbl_system_config WHERE config_key = ?',
            [key]
        );
        return rows[0]?.config_value || null;
    }
    
    // อัปเดตค่าการตั้งค่า
    static async updateConfig(key, value) {
        try {
            const [result] = await promisePool.execute(
                'UPDATE tbl_system_config SET config_value = ? WHERE config_key = ?',
                [value, key]
            );
            
            if (result.affectedRows === 0) {
                await promisePool.execute(
                    'INSERT INTO tbl_system_config (config_key, config_value) VALUES (?, ?)',
                    [key, value]
                );
                return { success: true, action: 'created' };
            }
            
            return { success: true, action: 'updated' };
        } catch (error) {
            throw error;
        }
    }
    
    // อัปเดตการตั้งค่าหลายรายการพร้อมกัน
    static async updateMultipleConfigs(configs) {
        const connection = await promisePool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            for (const config of configs) {
                await connection.execute(
                    'UPDATE tbl_system_config SET config_value = ? WHERE config_key = ?',
                    [config.config_value, config.config_key]
                );
            }
            
            await connection.commit();
            return { success: true };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    
    // ดึงการตั้งค่าในรูปแบบ object
    static async getConfigsAsObject() {
        const configs = await this.getAllConfigs();
        const configsObj = {};
        
        configs.forEach(config => {
            configsObj[config.config_key] = config.config_value;
        });
        
        return configsObj;
    }
    
    // ตรวจสอบสถานะระบบ
    static async getSystemStatus() {
        const status = await this.getConfigValue('system_status');
        return status === 'open';
    }
    
    // เปิด/ปิดระบบ
    static async setSystemStatus(isOpen) {
        const status = isOpen ? 'open' : 'closed';
        return await this.updateConfig('system_status', status);
    }
    
    // ดึงงวดปัจจุบัน
    static async getCurrentPeriod() {
        const [rows] = await promisePool.execute(`
            SELECT period_name FROM tbl_period
            WHERE is_current = 1 AND status = 'open'
            LIMIT 1
        `);
        return rows.length > 0 ? rows[0].period_name : null;
    }
    
    // ตั้งค่างวดปัจจุบัน
    static async setCurrentPeriod(period) {
        return await this.updateConfig('current_period', period);
    }
    
    // ดึงวันที่ออกรางวัลถัดไป
    static async getNextDrawDate() {
        const [rows] = await promisePool.execute(`
            SELECT period_date FROM tbl_period
            WHERE is_current = 1 AND status = 'open'
            LIMIT 1
        `);

        if (rows.length > 0) {
            // คำนวณวันที่ออกรางวัล (15 วันข้างหน้า)
            const periodDate = new Date(rows[0].period_date);
            const drawDate = new Date(periodDate);
            drawDate.setDate(drawDate.getDate() + 15);
            return drawDate.toISOString().split('T')[0];
        }

        return null;
    }
    
    // ตั้งค่าวันที่ออกรางวัลถัดไป
    static async setNextDrawDate(date) {
        return await this.updateConfig('next_draw_date', date);
    }
}

module.exports = {
    Setting,
    SystemConfig
};
