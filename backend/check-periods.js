const { promisePool } = require('./config/database');

async function checkPeriods() {
    console.log('=== CHECKING PERIODS ===');
    
    try {
        // 1. ตรวจสอบงวดทั้งหมด
        console.log('\n1. All periods:');
        const [allPeriods] = await promisePool.execute(`
            SELECT * FROM tbl_period ORDER BY period_date DESC
        `);
        
        allPeriods.forEach(period => {
            console.log(`  - ID: ${period.id}, Name: ${period.period_name}, Date: ${period.period_date}, Status: ${period.status}, Current: ${period.is_current}`);
        });
        
        // 2. ตรวจสอบงวดปัจจุบัน
        console.log('\n2. Current period:');
        const [currentPeriods] = await promisePool.execute(`
            SELECT * FROM tbl_period WHERE (status = 'current' OR status = 'open') AND is_current = 1
        `);
        
        if (currentPeriods.length === 0) {
            console.log('❌ No current period found!');
        } else {
            currentPeriods.forEach(period => {
                console.log(`  ✓ Current: ${period.period_name} (${period.period_date})`);
            });
        }
        
        // 3. สร้างงวดใหม่ที่ถูกต้อง
        console.log('\n3. Creating new current period...');
        
        // ปิดงวดเก่าทั้งหมด
        await promisePool.execute(`
            UPDATE tbl_period SET status = 'closed', is_current = 0
        `);
        
        // สร้างงวดใหม่
        const today = new Date();
        const thaiYear = today.getFullYear() + 543;
        const day = today.getDate().toString().padStart(2, '0');
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        
        const periodName = `${day}/${month}/${thaiYear}`;
        const periodDate = today.toISOString().split('T')[0];
        
        // คำนวณวันที่ออกรางวัล (15 วันข้างหน้า)
        const drawDate = new Date(today);
        drawDate.setDate(drawDate.getDate() + 15);
        const drawDateStr = drawDate.toISOString().split('T')[0];
        
        await promisePool.execute(`
            INSERT INTO tbl_period (period_name, period, period_date, draw_date, status, is_current) 
            VALUES (?, ?, ?, ?, 'open', 1)
        `, [periodName, periodName, periodDate, drawDateStr]);
        
        console.log(`✓ Created new period: ${periodName}`);
        console.log(`  - Period Date: ${periodDate}`);
        console.log(`  - Draw Date: ${drawDateStr}`);
        
        // 4. ตรวจสอบผลลัพธ์
        console.log('\n4. Final check:');
        const [finalPeriods] = await promisePool.execute(`
            SELECT * FROM tbl_period WHERE is_current = 1
        `);
        
        finalPeriods.forEach(period => {
            console.log(`  ✓ Active period: ${period.period_name} (${period.period_date})`);
        });
        
        console.log('\n=== PERIODS CHECK COMPLETED ===');
        
    } catch (error) {
        console.error('❌ Periods Check Error:', error);
    } finally {
        process.exit(0);
    }
}

// รันตรวจสอบ
checkPeriods();
