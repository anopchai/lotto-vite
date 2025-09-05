const { promisePool } = require('./config/database');

async function addPeriodIdToResult() {
    console.log('=== ADDING PERIOD_ID TO TBL_RESULT ===');
    
    try {
        // 1. ตรวจสอบว่ามี period_id หรือไม่
        console.log('\n1. Checking if period_id exists...');
        const [columns] = await promisePool.execute('SHOW COLUMNS FROM tbl_result');
        const hasPeriodId = columns.some(col => col.Field === 'period_id');
        
        if (!hasPeriodId) {
            console.log('\n2. Adding period_id column...');
            await promisePool.execute(`
                ALTER TABLE tbl_result 
                ADD COLUMN period_id INT AFTER period
            `);
            console.log('✓ Added period_id column');
        } else {
            console.log('✓ period_id column already exists');
        }
        
        // 3. ตรวจสอบข้อมูลที่ไม่มี period_id
        console.log('\n3. Checking results without period_id...');
        const [orphanResults] = await promisePool.execute(`
            SELECT * FROM tbl_result WHERE period_id IS NULL
        `);
        
        console.log(`Found ${orphanResults.length} results without period_id`);
        
        if (orphanResults.length > 0) {
            console.log('\n4. Updating results with period_id...');
            
            for (const result of orphanResults) {
                // หา period_id จาก period_name
                const [matchingPeriods] = await promisePool.execute(`
                    SELECT id FROM tbl_period WHERE period_name = ?
                `, [result.period]);
                
                if (matchingPeriods.length > 0) {
                    await promisePool.execute(`
                        UPDATE tbl_result 
                        SET period_id = ? 
                        WHERE result_id = ?
                    `, [matchingPeriods[0].id, result.result_id]);
                    
                    console.log(`  ✓ Updated result for period "${result.period}" with period_id ${matchingPeriods[0].id}`);
                } else {
                    console.log(`  ⚠️ Could not find period for "${result.period}"`);
                }
            }
        }
        
        // 5. สร้างข้อมูลตัวอย่างถ้าไม่มี
        console.log('\n5. Checking if we need sample data...');
        const [allResults] = await promisePool.execute('SELECT * FROM tbl_result');
        
        if (allResults.length === 0) {
            console.log('\n6. Creating sample result...');
            
            // หางวดปัจจุบัน
            const [currentPeriods] = await promisePool.execute(`
                SELECT id, period_name FROM tbl_period WHERE is_current = 1 LIMIT 1
            `);
            
            if (currentPeriods.length > 0) {
                const currentPeriod = currentPeriods[0];
                
                await promisePool.execute(`
                    INSERT INTO tbl_result (period, period_id, result_date, result_2up, result_2down, result_3up, result_3toad, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                `, [currentPeriod.period_name, currentPeriod.id, '2025-08-20', '12', '34', '123', '456', 'announced']);
                
                console.log(`✓ Created sample result for period: ${currentPeriod.period_name}`);
            } else {
                console.log('⚠️ No current period found');
            }
        }
        
        // 6. ทดสอบ API
        console.log('\n7. Testing Result API...');
        const Result = require('./models/Result');
        
        const latestResult = await Result.getLatestResult();
        if (latestResult) {
            console.log('✓ getLatestResult works:');
            console.log(`  - Period: ${latestResult.period}`);
            console.log(`  - 2up: ${latestResult.result_2up}`);
        } else {
            console.log('❌ getLatestResult returned null');
        }
        
        const allResults2 = await Result.getAllResults();
        console.log(`✓ getAllResults returned ${allResults2.length} results`);
        
        console.log('\n=== PERIOD_ID ADDITION COMPLETED ===');
        
    } catch (error) {
        console.error('❌ Period ID Addition Error:', error);
    } finally {
        process.exit(0);
    }
}

// รันการเพิ่ม period_id
addPeriodIdToResult();
