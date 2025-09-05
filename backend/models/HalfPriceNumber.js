const { promisePool } = require('../config/database');

class HalfPriceNumber {
    // เพิ่มเลขจ่ายครึ่งราคา (แบบใหม่ - แยกหมวดหมู่)
    static async add(data) {
        const { period_id, category, numbers } = data;

        const connection = await promisePool.getConnection();
        try {
            await connection.beginTransaction();

            // ลบเลขเก่าของงวดและประเภทนี้ก่อน
            await connection.execute(
                'DELETE FROM tbl_half_price_numbers WHERE period_id = ? AND lotto_type = ?',
                [period_id, category]
            );

            // เพิ่มเลขใหม่
            for (const number of numbers) {
                await connection.execute(
                    'INSERT INTO tbl_half_price_numbers (period_id, lotto_type, number) VALUES (?, ?, ?)',
                    [period_id, number.lotto_type, number.number]
                );
            }

            await connection.commit();
            return { success: true, message: 'บันทึกเลขจ่ายครึ่งราคาสำเร็จ' };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // เพิ่มเลขจ่ายครึ่งราคา (แบบเก่า - รองรับ backward compatibility)
    static async addHalfPriceNumbers(period, numbers) {
        // แปลง period string เป็น period_id
        const [periodRows] = await promisePool.execute(
            'SELECT id FROM tbl_period WHERE period_name = ?',
            [period]
        );

        if (periodRows.length === 0) {
            throw new Error('ไม่พบงวดที่ระบุ');
        }

        const period_id = periodRows[0].id;

        const connection = await promisePool.getConnection();
        try {
            await connection.beginTransaction();

            // ลบเลขครึ่งราคาเก่าของงวดนี้
            await connection.execute(
                'DELETE FROM tbl_half_price_numbers WHERE period = ?',
                [period]
            );

            // เพิ่มเลขครึ่งราคาใหม่
            for (const item of numbers) {
                await connection.execute(
                    'INSERT INTO tbl_half_price_numbers (period, lotto_type, number) VALUES (?, ?, ?)',
                    [period, item.lotto_type, item.number]
                );
            }

            await connection.commit();
            return { success: true, message: 'เพิ่มเลขจ่ายครึ่งราคาสำเร็จ' };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // ดึงเลขจ่ายครึ่งราคาตามงวด (แบบใหม่)
    static async getByPeriod(period_id) {
        const [rows] = await promisePool.execute(
            'SELECT * FROM tbl_half_price_numbers WHERE period_id = ? ORDER BY lotto_type, number',
            [period_id]
        );
        return rows;
    }

    // ดึงเลขจ่ายครึ่งราคาตามงวดและหมวดหมู่
    static async getByPeriodAndCategory(period_id, category) {
        const [rows] = await promisePool.execute(
            'SELECT * FROM tbl_half_price_numbers WHERE period_id = ? AND lotto_type = ? ORDER BY lotto_type, number',
            [period_id, category]
        );
        return rows;
    }

    // ดึงเลขจ่ายครึ่งราคาตามงวด (แบบเก่า - รองรับ period name)
    static async getByPeriodName(period) {
        const [rows] = await promisePool.execute(`
            SELECT * FROM tbl_half_price_numbers
            WHERE period = ?
            ORDER BY lotto_type, number
        `, [period]);

        // แปลงข้อมูลให้เข้ากับรูปแบบใหม่
        return rows.map(row => ({
            ...row,
            category: ['2up', '2down'].includes(row.lotto_type) ? '2digit' : '3digit'
        }));
    }

    // ตรวจสอบว่าเลขนี้จ่ายครึ่งราคาหรือไม่
    static async isHalfPrice(period_id, lottoType, number) {
        const [rows] = await promisePool.execute(
            'SELECT COUNT(*) as count FROM tbl_half_price_numbers WHERE period_id = ? AND lotto_type = ? AND number = ?',
            [period_id, lottoType, number]
        );
        return rows[0].count > 0;
    }

    // ลบเลขจ่ายครึ่งราคาทั้งงวด
    static async delete(period_id) {
        const [result] = await promisePool.execute(
            'DELETE FROM tbl_half_price_numbers WHERE period_id = ?',
            [period_id]
        );
        return { success: true, deleted: result.affectedRows };
    }

    // ลบเลขจ่ายครึ่งราคาตามประเภท
    static async deleteByCategory(period_id, category) {
        const [result] = await promisePool.execute(
            'DELETE FROM tbl_half_price_numbers WHERE period_id = ? AND lotto_type = ?',
            [period_id, category]
        );
        return { success: true, deleted: result.affectedRows };
    }

    // ลบเลขจ่ายครึ่งราคา (แบบเก่า)
    static async deleteByPeriod(period) {
        const [periodRows] = await promisePool.execute(
            'SELECT id FROM tbl_period WHERE period_name = ?',
            [period]
        );

        if (periodRows.length === 0) {
            return { success: false, message: 'ไม่พบงวดที่ระบุ' };
        }

        const [result] = await promisePool.execute(
            'DELETE FROM tbl_half_price_numbers WHERE period_id = ?',
            [periodRows[0].id]
        );
        return { success: true, message: 'ลบเลขจ่ายครึ่งราคาสำเร็จ', affectedRows: result.affectedRows };
    }

    // ดึงเลขจ่ายครึ่งราคาทั้งหมด
    static async getAll() {
        const [rows] = await promisePool.execute(`
            SELECT h.*, p.period_name, p.period_date
            FROM tbl_half_price_numbers h
            JOIN tbl_period p ON h.period_id = p.id
            ORDER BY p.period_date DESC, h.lotto_type, h.number
        `);
        return rows;
    }

    // Alias สำหรับ Controller
    static async getAllHalfPriceNumbers() {
        return await this.getAll();
    }
}

module.exports = HalfPriceNumber;
