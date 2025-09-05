const { promisePool } = require('./config/database');

async function remove3StraightToad() {
    try {
        console.log('Connecting to database...');
        const connection = await promisePool.getConnection();
        console.log('✅ Database connected successfully');

        // Check if 3straight_toad exists
        const [rows] = await connection.execute(
            'SELECT * FROM tbl_setting WHERE lotto_type = ?',
            ['3straight_toad']
        );

        if (rows.length > 0) {
            console.log('Found 3straight_toad entry:', rows[0]);
            
            // Remove the 3straight_toad entry
            const [result] = await connection.execute(
                'DELETE FROM tbl_setting WHERE lotto_type = ?',
                ['3straight_toad']
            );
            
            console.log(`✅ Removed ${result.affectedRows} 3straight_toad entry from tbl_setting`);
        } else {
            console.log('✅ No 3straight_toad entry found in tbl_setting');
        }

        // Also check in tbl_ticket table
        const [ticketRows] = await connection.execute(
            'SELECT COUNT(*) as count FROM tbl_ticket WHERE lotto_type = ?',
            ['3straight_toad']
        );

        if (ticketRows[0].count > 0) {
            console.log(`Found ${ticketRows[0].count} tickets with 3straight_toad type`);
            
            // Update tickets to use 3toad instead
            const [updateResult] = await connection.execute(
                'UPDATE tbl_ticket SET lotto_type = ? WHERE lotto_type = ?',
                ['3toad', '3straight_toad']
            );
            
            console.log(`✅ Updated ${updateResult.affectedRows} tickets from 3straight_toad to 3toad`);
        } else {
            console.log('✅ No tickets with 3straight_toad type found');
        }

        connection.release();
        console.log('✅ Database connection released');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error removing 3straight_toad:', error.message);
        process.exit(1);
    }
}

remove3StraightToad();