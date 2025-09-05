const { promisePool } = require('../config/database');

class Period {
    // ดึงงวดปัจจุบัน
    static async getCurrentPeriod() {
        const [rows] = await promisePool.execute(
            'SELECT * FROM tbl_period WHERE is_current = TRUE LIMIT 1'
        );
        return rows[0] || null;
    }

    // ดึงงวดทั้งหมด
    static async getAllPeriods() {
        const [rows] = await promisePool.execute(
            'SELECT * FROM tbl_period ORDER BY period_date DESC, created_at DESC'
        );
        return rows;
    }

    // สร้างงวดใหม่
    static async createPeriod(periodData) {
        const { period_name, period_date, status = 'open' } = periodData;
        
        const connection = await promisePool.getConnection();
        try {
            await connection.beginTransaction();

            // ถ้าสร้างงวดใหม่เป็น current ให้ปิด current เก่า
            if (status === 'open') {
                await connection.execute(
                    'UPDATE tbl_period SET is_current = FALSE WHERE is_current = TRUE'
                );
            }

            // สร้างงวดใหม่
            const [result] = await connection.execute(
                'INSERT INTO tbl_period (period_name, period_date, status, is_current) VALUES (?, ?, ?, ?)',
                [period_name, period_date, status, status === 'open']
            );

            await connection.commit();
            return { id: result.insertId, period_name, period_date, status };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // อัปเดตงวด
    static async updatePeriod(id, updateData) {
        const { period_name, period_date, status } = updateData;
        
        const connection = await promisePool.getConnection();
        try {
            await connection.beginTransaction();

            // ถ้าเปลี่ยนเป็น current ให้ปิด current เก่า
            if (status === 'open') {
                await connection.execute(
                    'UPDATE tbl_period SET is_current = FALSE WHERE is_current = TRUE AND id != ?',
                    [id]
                );
            }

            // อัปเดตงวด
            await connection.execute(
                'UPDATE tbl_period SET period_name = ?, period_date = ?, status = ?, is_current = ? WHERE id = ?',
                [period_name, period_date, status, status === 'open', id]
            );

            await connection.commit();
            return { success: true };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // ลบงวด
    static async deletePeriod(id) {
        // ตรวจสอบว่าเป็นงวดปัจจุบันหรือไม่
        const [current] = await promisePool.execute(
            'SELECT is_current FROM tbl_period WHERE id = ?',
            [id]
        );

        if (current[0]?.is_current) {
            throw new Error('ไม่สามารถลบงวดปัจจุบันได้');
        }

        const [result] = await promisePool.execute(
            'DELETE FROM tbl_period WHERE id = ?',
            [id]
        );

        return { success: true, affected: result.affectedRows };
    }

    // เปลี่ยนงวดปัจจุบัน
    static async setCurrentPeriod(id) {
        const connection = await promisePool.getConnection();
        try {
            await connection.beginTransaction();

            // ปิด current เก่า
            await connection.execute(
                'UPDATE tbl_period SET is_current = FALSE WHERE is_current = TRUE'
            );

            // ตั้งงวดใหม่เป็น current และเปิดรับแทง
            await connection.execute(
                'UPDATE tbl_period SET is_current = TRUE, status = "open" WHERE id = ?',
                [id]
            );

            await connection.commit();
            return { success: true };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // เปิด/ปิดรับแทงงวด (เปิดได้แค่ 1 งวด)
    static async togglePeriodStatus(id) {
        const connection = await promisePool.getConnection();
        try {
            await connection.beginTransaction();

            const [period] = await connection.execute(
                'SELECT status FROM tbl_period WHERE id = ?',
                [id]
            );

            if (!period[0]) {
                throw new Error('ไม่พบงวดที่ต้องการ');
            }

            const newStatus = period[0].status === 'open' ? 'closed' : 'open';

            if (newStatus === 'open') {
                // ถ้าจะเปิดรับแทง ให้ปิดงวดอื่นทั้งหมดก่อน
                await connection.execute(
                    'UPDATE tbl_period SET status = "closed" WHERE status = "open"'
                );
            }

            // เปิด/ปิดงวดที่เลือก
            await connection.execute(
                'UPDATE tbl_period SET status = ? WHERE id = ?',
                [newStatus, id]
            );

            await connection.commit();
            return { success: true, status: newStatus };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // ดึงงวดที่เปิดรับแทง
    static async getOpenPeriod() {
        const [rows] = await promisePool.execute(
            'SELECT * FROM tbl_period WHERE status = "open" AND is_current = 1 LIMIT 1'
        );
        return rows[0] || null;
    }

    // ปิดงวดทั้งหมด
    static async closeAllPeriods() {
        const [result] = await promisePool.execute(
            'UPDATE tbl_period SET status = "closed", is_current = 0'
        );
        return result;
    }
}

module.exports = Period;
