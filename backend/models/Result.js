const { promisePool } = require('../config/database');
const Winner = require('./Winner');
const moment = require('moment');

class Result {
    // บันทึกผลรางวัล
    static async saveResult(resultData) {
        const { period, period_id, result_date, result_2up, result_2down, result_3up, result_3toad } = resultData;
        
        try {
            // ใช้ period_id หรือ period ในการตรวจสอบ
            let checkQuery, checkParams;
            if (period_id) {
                checkQuery = 'SELECT * FROM tbl_result WHERE period_id = ?';
                checkParams = [period_id];
            } else {
                checkQuery = 'SELECT * FROM tbl_result WHERE period = ?';
                checkParams = [period];
            }

            const [existing] = await promisePool.execute(checkQuery, checkParams);
            
            if (existing.length > 0) {
                // อัปเดตผลรางวัล
                let updateQuery, updateParams;
                if (period_id) {
                    updateQuery = 'UPDATE tbl_result SET result_date = ?, result_2up = ?, result_2down = ?, result_3up = ?, result_3toad = ?, status = "announced" WHERE period_id = ?';
                    updateParams = [result_date, result_2up, result_2down, result_3up, result_3toad, period_id];
                } else {
                    updateQuery = 'UPDATE tbl_result SET result_date = ?, result_2up = ?, result_2down = ?, result_3up = ?, result_3toad = ?, status = "announced" WHERE period = ?';
                    updateParams = [result_date, result_2up, result_2down, result_3up, result_3toad, period];
                }

                await promisePool.execute(updateQuery, updateParams);

                return {
                    success: true,
                    action: 'updated',
                    message: 'อัปเดตผลรางวัลสำเร็จ'
                };
            } else {
                // เพิ่มผลรางวัลใหม่
                // ดึงชื่องวดจาก period_id ถ้ามี
                let periodName = period;
                if (period_id && !period) {
                    const [periodData] = await promisePool.execute(
                        'SELECT period_name FROM tbl_period WHERE id = ?',
                        [period_id]
                    );
                    if (periodData.length > 0) {
                        periodName = periodData[0].period_name;
                    }
                }

                await promisePool.execute(
                    'INSERT INTO tbl_result (period, period_id, result_date, result_2up, result_2down, result_3up, result_3toad, status) VALUES (?, ?, ?, ?, ?, ?, ?, "announced")',
                    [periodName, period_id, result_date, result_2up, result_2down, result_3up, result_3toad]
                );

                return {
                    success: true,
                    action: 'created',
                    message: 'บันทึกผลรางวัลสำเร็จ'
                };
            }
        } catch (error) {
            throw error;
        }
    }
    
    // ดึงผลรางวัลตามงวด
    static async getResultByPeriod(period) {
        const [rows] = await promisePool.execute(
            'SELECT * FROM tbl_result WHERE period = ?',
            [period]
        );
        return rows[0] || null;
    }
    
    // ดึงผลรางวัลล่าสุด
    static async getLatestResult() {
        const [rows] = await promisePool.execute(
            'SELECT * FROM tbl_result ORDER BY result_date DESC, created_at DESC LIMIT 1'
        );
        return rows[0] || null;
    }
    
    // ดึงผลรางวัลทั้งหมด
    static async getAllResults() {
        const [rows] = await promisePool.execute(
            'SELECT * FROM tbl_result ORDER BY result_date DESC, created_at DESC'
        );
        return rows;
    }
    
    // คำนวณและบันทึกผู้ชนะแบบใหม่ (ง่ายและชัดเจน)
    static async calculateAndSaveWinners(period) {
        try {
           // console.log(`🎯 เริ่มคำนวณผู้ชนะสำหรับงวด ${period}`);

            // ดึงผลรางวัล
            const result = await this.getResultByPeriod(period);
            if (!result) {
                throw new Error('ไม่พบผลรางวัลของงวดนี้');
            }

            // ดึงเลขจ่ายครึ่งราคา
            const [halfPriceRows] = await promisePool.execute(
                'SELECT number FROM tbl_half_price_numbers WHERE period = ?',
                [period]
            );
            const halfPriceNumbers = halfPriceRows.map(row => row.number);

          //  console.log(`📋 เลขจ่ายครึ่งราคา: ${halfPriceNumbers.join(', ')}`);

            const winners = [];

            // 1. ตรวจสอบ 2 ตัวบน
            if (result.result_2up) {
                const twoUpWinners = await this.findWinners('2up', result.result_2up, result.result_2up, period, halfPriceNumbers);
                winners.push(...twoUpWinners);
              //  console.log(`🎯 2 ตัวบน (${result.result_2up}): ${twoUpWinners.length} ผู้ชนะ`);
            }

            // 2. ตรวจสอบ 2 ตัวล่าง
            if (result.result_2down) {
                const twoDownWinners = await this.findWinners('2down', result.result_2down, result.result_2down, period, halfPriceNumbers);
                winners.push(...twoDownWinners);
              //  console.log(`🎯 2 ตัวล่าง (${result.result_2down}): ${twoDownWinners.length} ผู้ชนะ`);
            }

            // 3. ตรวจสอบ 3 ตัวตรง
            if (result.result_3up) {
                const threeUpWinners = await this.findWinners('3up', result.result_3up, result.result_3up, period, halfPriceNumbers);
                winners.push(...threeUpWinners);
               // console.log(`🎯 3 ตัวตรง (${result.result_3up}): ${threeUpWinners.length} ผู้ชนะ`);

                // 4. ตรวจสอบ 3 ตัวโต๊ด (6 กลับ)
                const permutations = this.generateToadNumbers(result.result_3up);
                for (const perm of permutations) {
                    const toadWinners = await this.findWinners('3toad', perm, result.result_3up, period, halfPriceNumbers);
                    winners.push(...toadWinners);
                }
              //  console.log(`🎯 3 ตัวโต๊ด (${permutations.join(', ')}): ${winners.filter(w => w.lotto_type === '3toad').length} ผู้ชนะ`);

                // 5. ตรวจสอบวิ่งบน
                const runUpWinners = await this.findRunningWinners('runup', result.result_3up, period, halfPriceNumbers);
                winners.push(...runUpWinners);
               // console.log(`🎯 วิ่งบน (${result.result_3up}): ${runUpWinners.length} ผู้ชนะ`);
            }

            // 6. ตรวจสอบวิ่งล่าง
            if (result.result_2down) {
                const runDownWinners = await this.findRunningWinners('rundown', result.result_2down, period, halfPriceNumbers);
                winners.push(...runDownWinners);
              //  console.log(`🎯 วิ่งล่าง (${result.result_2down}): ${runDownWinners.length} ผู้ชนะ`);
            }

            // บันทึกผู้ชนะลงฐานข้อมูล
            await Winner.saveWinners(winners);

           // console.log(`✅ คำนวณผู้ชนะเสร็จสิ้น: ${winners.length} รายการ`);
            return winners;

        } catch (error) {
            console.error('❌ Error calculating winners:', error);
            throw error;
        }
    }

    // ตรวจสอบผู้ชนะรางวัล (เก่า - ใช้สำหรับ backward compatibility)
    static async checkWinners(period) {
        const result = await this.getResultByPeriod(period);
        if (!result) {
            throw new Error('ไม่พบผลรางวัลของงวดนี้');
        }
        
        const winners = [];

        // ดึง period_id จาก period string (แก้ไขใช้ period_name แทน period)
        const [periodRows] = await promisePool.execute(
            'SELECT id FROM tbl_period WHERE period_name = ?',
            [period]
        );

        const period_id = periodRows.length > 0 ? periodRows[0].id : null;

        // ดึงเลขจ่ายครึ่งราคาของงวดนี้
        const [halfPriceRows] = await promisePool.execute(
            'SELECT * FROM tbl_half_price_numbers WHERE period_id = ?',
            [period_id]
        );

        const halfPriceNumbers = halfPriceRows.map(row => row.number);

        // ฟังก์ชันตรวจสอบว่าเป็นเลขจ่ายครึ่งหรือไม่
        const isHalfPrice = (number) => halfPriceNumbers.includes(number);

        try {
            // ตรวจสอบ 2 ตัวบน
            if (result.result_2up) {
                const [tickets2up] = await promisePool.execute(
                    `SELECT t.*, s.payout_rate, a.agent_name, t.bill_id
                     FROM tbl_ticket t
                     JOIN tbl_setting s ON t.lotto_type = s.lotto_type
                     JOIN tbl_agent a ON t.agent_id = a.agent_id
                     WHERE t.period_id = ? AND t.lotto_type = '2up' AND t.lotto_number = ?`,
                    [period_id, result.result_2up]
                );
                
                tickets2up.forEach(ticket => {
                    const isHalf = isHalfPrice(ticket.lotto_number);
                    const finalPayoutRate = isHalf ? ticket.payout_rate / 2 : ticket.payout_rate;

                    winners.push({
                        ...ticket,
                        reward: ticket.price * finalPayoutRate,
                        winning_number: result.result_2up,
                        result_type: '2up',
                        is_half_price: isHalf,
                        original_payout_rate: ticket.payout_rate,
                        final_payout_rate: finalPayoutRate
                    });
                });
            }
            
            // ตรวจสอบ 2 ตัวล่าง
            if (result.result_2down) {
                const [tickets2down] = await promisePool.execute(
                    `SELECT t.*, s.payout_rate, a.agent_name, t.bill_id
                     FROM tbl_ticket t
                     JOIN tbl_setting s ON t.lotto_type = s.lotto_type
                     JOIN tbl_agent a ON t.agent_id = a.agent_id
                     WHERE t.period_id = ? AND t.lotto_type = '2down' AND t.lotto_number = ?`,
                    [period_id, result.result_2down]
                );
                
                tickets2down.forEach(ticket => {
                    const isHalf = isHalfPrice(ticket.lotto_number);
                    const finalPayoutRate = isHalf ? ticket.payout_rate / 2 : ticket.payout_rate;

                    winners.push({
                        ...ticket,
                        reward: ticket.price * finalPayoutRate,
                        winning_number: result.result_2down,
                        result_type: '2down',
                        is_half_price: isHalf,
                        original_payout_rate: ticket.payout_rate,
                        final_payout_rate: finalPayoutRate
                    });
                });
            }
            
            // ตรวจสอบ 3 ตัวบน
            if (result.result_3up) {
                const [tickets3up] = await promisePool.execute(
                    `SELECT t.*, s.payout_rate, a.agent_name, t.bill_id
                     FROM tbl_ticket t
                     JOIN tbl_setting s ON t.lotto_type = s.lotto_type
                     JOIN tbl_agent a ON t.agent_id = a.agent_id
                     WHERE t.period_id = ? AND t.lotto_type = '3up' AND t.lotto_number = ?`,
                    [period_id, result.result_3up]
                );
                
                tickets3up.forEach(ticket => {
                    const isHalf = isHalfPrice(ticket.lotto_number);
                    const finalPayoutRate = isHalf ? ticket.payout_rate / 2 : ticket.payout_rate;

                    winners.push({
                        ...ticket,
                        reward: ticket.price * finalPayoutRate,
                        winning_number: result.result_3up,
                        result_type: '3up',
                        is_half_price: isHalf,
                        original_payout_rate: ticket.payout_rate,
                        final_payout_rate: finalPayoutRate
                    });
                });
                
                // ตรวจสอบ 3 ตัวโต๊ด (ตรวจทุกการเรียงสับเปลี่ยน)
                const permutations = this.generatePermutations(result.result_3up);
                
                for (const perm of permutations) {
                    const [tickets3toad] = await promisePool.execute(
                        `SELECT t.*, s.payout_rate, a.agent_name, t.bill_id
                         FROM tbl_ticket t
                         JOIN tbl_setting s ON t.lotto_type = s.lotto_type
                         JOIN tbl_agent a ON t.agent_id = a.agent_id
                         WHERE t.period_id = ? AND t.lotto_type = '3toad' AND t.lotto_number = ?`,
                        [period_id, perm]
                    );
                    
                    tickets3toad.forEach(ticket => {
                        const isHalf = isHalfPrice(ticket.lotto_number);
                        const finalPayoutRate = isHalf ? ticket.payout_rate / 2 : ticket.payout_rate;

                        // สำหรับ 3 ตัวโต๊ด ให้ใช้ price เสมอ (เพราะเป็นการแทงโต๊ดแยก)
                        const priceToUse = ticket.price;

                        winners.push({
                            ...ticket,
                            reward: priceToUse * finalPayoutRate,
                            winning_number: result.result_3up,
                            result_type: '3toad',
                            is_half_price: isHalf,
                            original_payout_rate: ticket.payout_rate,
                            final_payout_rate: finalPayoutRate
                        });
                    });
                }

                // ตรวจสอบ 3 ตัวตรงโต๊ด
                const [tickets3straightToad] = await promisePool.execute(
                    `SELECT t.*, s.payout_rate, a.agent_name, t.bill_id
                     FROM tbl_ticket t
                     JOIN tbl_setting s ON s.lotto_type = '3up'
                     JOIN tbl_agent a ON t.agent_id = a.agent_id
                     WHERE t.period_id = ? AND t.lotto_type = '3straight_toad' AND t.lotto_number = ?`,
                    [period_id, result.result_3up]
                );

                tickets3straightToad.forEach(ticket => {
                    const isHalf = isHalfPrice(ticket.lotto_number);

                    // คำนวณรางวัลตรง (ใช้อัตราจ่าย 3up)
                    const straightPayoutRate = isHalf ? 500 / 2 : 500;
                    const straightReward = ticket.price * straightPayoutRate;

                    // คำนวณรางวัลโต๊ด (ใช้อัตราจ่าย 3toad)
                    const toadPayoutRate = isHalf ? 90 / 2 : 90;
                    const toadReward = ticket.price_toad * toadPayoutRate;

                    winners.push({
                        ...ticket,
                        reward: straightReward + toadReward,
                        winning_number: result.result_3up,
                        result_type: '3straight_toad',
                        type_name: 'ตรงโต๊ด',
                        is_half_price: isHalf,
                        original_payout_rate: '500+90',
                        final_payout_rate: `${straightPayoutRate}+${toadPayoutRate}`,
                        straight_reward: straightReward,
                        toad_reward: toadReward
                    });
                });

                // ตรวจสอบ 3 ตัวตรงโต๊ด (ส่วนโต๊ด - ตรวจทุกการเรียงสับเปลี่ยน)
                for (const perm of permutations) {
                    if (perm !== result.result_3up) { // ไม่ใช่เลขตรง
                        const [tickets3straightToadPerm] = await promisePool.execute(
                            `SELECT t.*, s.payout_rate, a.agent_name, t.bill_id
                             FROM tbl_ticket t
                             JOIN tbl_setting s ON s.lotto_type = '3toad'
                             JOIN tbl_agent a ON t.agent_id = a.agent_id
                             WHERE t.period_id = ? AND t.lotto_type = '3straight_toad' AND t.lotto_number = ?`,
                            [period_id, perm]
                        );

                        tickets3straightToadPerm.forEach(ticket => {
                            const isHalf = isHalfPrice(ticket.lotto_number);

                            // ได้แค่รางวัลโต๊ด (ไม่ได้รางวัลตรง)
                            const toadPayoutRate = isHalf ? 90 / 2 : 90;
                            const toadReward = ticket.price_toad * toadPayoutRate;

                            winners.push({
                                ...ticket,
                                reward: toadReward,
                                winning_number: result.result_3up,
                                result_type: '3straight_toad_toad_only',
                                type_name: 'โต๊ด (จากตรงโต๊ด)',
                                is_half_price: isHalf,
                                original_payout_rate: '90',
                                final_payout_rate: toadPayoutRate,
                                straight_reward: 0,
                                toad_reward: toadReward
                            });
                        });
                    }
                }

                // ตรวจสอบวิ่งบน (เทียบกับ 3 ตัวบน ถ้ามีเลขตัวใดตัวหนึ่งเหมือนกัน)
                const result3up = result.result_3up; // เช่น "123"
                const [ticketsRunUp] = await promisePool.execute(
                    `SELECT t.*, s.payout_rate, a.agent_name, t.bill_id
                     FROM tbl_ticket t
                     JOIN tbl_setting s ON t.lotto_type = s.lotto_type
                     JOIN tbl_agent a ON t.agent_id = a.agent_id
                     WHERE t.period_id = ? AND t.lotto_type = 'runup'`,
                    [period_id]
                );

                ticketsRunUp.forEach(ticket => {
                    // ตรวจสอบว่าเลขที่แทงมีอยู่ใน 3 ตัวบนหรือไม่ และนับจำนวนครั้งที่ปรากฏ
                    const betNumber = ticket.lotto_number; // เลขที่แทง เช่น "7"
                    const result3upArray = result3up.split(''); // แปลง "779" เป็น ["7", "7", "9"]

                    // นับจำนวนครั้งที่เลขที่แทงปรากฏในผลรางวัล
                    const matchCount = result3upArray.filter(digit => digit === betNumber).length;

                    // console.log(`🔍 วิ่งบน: เลขที่แทง ${betNumber}, ผลรางวัล ${result3up}, จำนวนที่ตรง ${matchCount}`);

                    if (matchCount > 0) {
                        const isHalf = isHalfPrice(ticket.lotto_number);
                        const finalPayoutRate = isHalf ? ticket.payout_rate / 2 : ticket.payout_rate;

                        // สร้างรางวัลตามจำนวนครั้งที่เลขปรากฏ
                        for (let i = 0; i < matchCount; i++) {
                            winners.push({
                                ...ticket,
                                reward: ticket.price * finalPayoutRate,
                                winning_number: result3up,
                                result_type: 'runup',
                                is_half_price: isHalf,
                                original_payout_rate: ticket.payout_rate,
                                final_payout_rate: finalPayoutRate,
                                match_count: matchCount,
                                match_position: i + 1
                            });
                        }
                    }
                });
                
                // ตรวจสอบวิ่งล่าง (เทียบกับ 2 ตัวล่าง ถ้ามีเลขตัวใดตัวหนึ่งเหมือนกัน)
                const result2down = result.result_2down; // เช่น "89"
                const [ticketsRunDown] = await promisePool.execute(
                    `SELECT t.*, s.payout_rate, a.agent_name, t.bill_id
                     FROM tbl_ticket t
                     JOIN tbl_setting s ON t.lotto_type = s.lotto_type
                     JOIN tbl_agent a ON t.agent_id = a.agent_id
                     WHERE t.period_id = ? AND t.lotto_type = 'rundown'`,
                    [period_id]
                );

                ticketsRunDown.forEach(ticket => {
                    // ตรวจสอบว่าเลขที่แทงมีอยู่ใน 2 ตัวล่างหรือไม่ และนับจำนวนครั้งที่ปรากฏ
                    const betNumber = ticket.lotto_number; // เลขที่แทง เช่น "0"
                    const result2downArray = result2down.split(''); // แปลง "00" เป็น ["0", "0"]

                    // นับจำนวนครั้งที่เลขที่แทงปรากฏในผลรางวัล
                    const matchCount = result2downArray.filter(digit => digit === betNumber).length;

                  //  console.log(`🔍 วิ่งล่าง: เลขที่แทง ${betNumber}, ผลรางวัล ${result2down}, จำนวนที่ตรง ${matchCount}`);

                    if (matchCount > 0) {
                        const isHalf = isHalfPrice(ticket.lotto_number);
                        const finalPayoutRate = isHalf ? ticket.payout_rate / 2 : ticket.payout_rate;

                        // สร้างรางวัลตามจำนวนครั้งที่เลขปรากฏ
                        for (let i = 0; i < matchCount; i++) {
                            winners.push({
                                ...ticket,
                                reward: ticket.price * finalPayoutRate,
                                winning_number: result2down,
                                result_type: 'rundown',
                                is_half_price: isHalf,
                                original_payout_rate: ticket.payout_rate,
                                final_payout_rate: finalPayoutRate,
                                match_count: matchCount,
                                match_position: i + 1
                            });
                        }
                    }
                });
            }
            
            return winners;
            
        } catch (error) {
            throw error;
        }
    }
    
    // สร้างการเรียงสับเปลี่ยนของเลข 3 ตัว
    static generatePermutations(str) {
        if (str.length !== 3) return [str];
        
        const chars = str.split('');
        const permutations = [];
        
        permutations.push(chars[0] + chars[1] + chars[2]); // 123
        permutations.push(chars[0] + chars[2] + chars[1]); // 132
        permutations.push(chars[1] + chars[0] + chars[2]); // 213
        permutations.push(chars[1] + chars[2] + chars[0]); // 231
        permutations.push(chars[2] + chars[0] + chars[1]); // 312
        permutations.push(chars[2] + chars[1] + chars[0]); // 321
        
        return [...new Set(permutations)];
    }
    
    // ลบผลรางวัล
    static async deleteResult(period) {
        const [result] = await promisePool.execute(
            'DELETE FROM tbl_result WHERE period = ?',
            [period]
        );
        
        if (result.affectedRows === 0) {
            throw new Error('ไม่พบผลรางวัลที่ต้องการลบ');
        }
        
        return {
            success: true,
            message: 'ลบผลรางวัลสำเร็จ'
        };
    }

    // อัปเดตผลรางวัลตาม ID
    static async updateResult(id, updateData) {
        const { result_2up, result_2down, result_3up, result_3toad, result_date, status } = updateData;

        const [result] = await promisePool.execute(
            'UPDATE tbl_result SET result_2up = ?, result_2down = ?, result_3up = ?, result_3toad = ?, result_date = ?, status = ? WHERE result_id = ?',
            [result_2up, result_2down, result_3up, result_3toad, result_date, status || 'announced', id]
        );

        if (result.affectedRows === 0) {
            throw new Error('ไม่พบผลรางวัลที่ต้องการอัปเดต');
        }

        return {
            success: true,
            message: 'อัปเดตผลรางวัลสำเร็จ'
        };
    }

    // ลบผลรางวัลตาม ID
    static async deleteResultById(id) {
        const [result] = await promisePool.execute(
            'DELETE FROM tbl_result WHERE result_id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            throw new Error('ไม่พบผลรางวัลที่ต้องการลบ');
        }

        return {
            success: true,
            message: 'ลบผลรางวัลสำเร็จ'
        };
    }

    // Helper: หาผู้ชนะสำหรับประเภทปกติ (2up, 2down, 3up, 3toad)
    static async findWinners(lottoType, winningNumber, resultNumber, period, halfPriceNumbers) {
        try {
            const [tickets] = await promisePool.execute(`
                SELECT t.*, s.payout_rate, a.agent_name, a.agent_code
                FROM tbl_ticket t
                JOIN tbl_setting s ON t.lotto_type = s.lotto_type
                JOIN tbl_agent a ON t.agent_id = a.agent_id
                WHERE t.lotto_type = ? AND t.lotto_number = ? AND t.period_id = ?
            `, [lottoType, winningNumber, period]);

            const winners = [];
            for (const ticket of tickets) {
                const isHalfPrice = halfPriceNumbers.includes(ticket.lotto_number);
                const finalPayoutRate = isHalfPrice ? ticket.payout_rate / 2 : ticket.payout_rate;
                const rewardAmount = ticket.price * finalPayoutRate;

                winners.push({
                    period_id: period,
                    agent_id: ticket.agent_id,
                    bill_id: ticket.bill_id,
                    ticket_id: ticket.id,
                    lotto_type: ticket.lotto_type,
                    lotto_number: ticket.lotto_number,
                    bet_amount: ticket.price,
                    payout_rate: ticket.payout_rate,
                    is_half_price: isHalfPrice,
                    final_payout_rate: finalPayoutRate,
                    reward_amount: rewardAmount,
                    winning_number: resultNumber,
                    result_type: lottoType
                });
            }

            return winners;
        } catch (error) {
            // Error finding winners;
            return [];
        }
    }

    // Helper: หาผู้ชนะสำหรับเลขวิ่ง (runup, rundown)
    static async findRunningWinners(lottoType, resultNumber, period, halfPriceNumbers) {
        try {
            const [tickets] = await promisePool.execute(`
                SELECT t.*, s.payout_rate, a.agent_name, a.agent_code
                FROM tbl_ticket t
                JOIN tbl_setting s ON t.lotto_type = s.lotto_type
                JOIN tbl_agent a ON t.agent_id = a.agent_id
                WHERE t.lotto_type = ? AND t.period_id = ?
            `, [lottoType, period]);

            const winners = [];
            for (const ticket of tickets) {
                const betNumber = ticket.lotto_number;
                const resultArray = resultNumber.split('');
                const matchCount = resultArray.filter(digit => digit === betNumber).length;

                if (matchCount > 0) {
                    const isHalfPrice = halfPriceNumbers.includes(ticket.lotto_number);
                    const finalPayoutRate = isHalfPrice ? ticket.payout_rate / 2 : ticket.payout_rate;
                    const rewardAmount = ticket.price * finalPayoutRate;

                    // สร้างรายการผู้ชนะตามจำนวนครั้งที่ตรง
                    for (let i = 0; i < matchCount; i++) {
                        winners.push({
                            period_id: period,
                            agent_id: ticket.agent_id,
                            bill_id: ticket.bill_id,
                            ticket_id: ticket.id,
                            lotto_type: ticket.lotto_type,
                            lotto_number: ticket.lotto_number,
                            bet_amount: ticket.price,
                            payout_rate: ticket.payout_rate,
                            is_half_price: isHalfPrice,
                            final_payout_rate: finalPayoutRate,
                            reward_amount: rewardAmount,
                            winning_number: resultNumber,
                            result_type: lottoType
                        });
                    }
                }
            }

            return winners;
        } catch (error) {
            // Error finding running winners;
            return [];
        }
    }

    // Helper: สร้างเลข 3 ตัวโต๊ด (6 กลับ)
    static generateToadNumbers(number) {
        if (!number || number.length !== 3) return [];

        const digits = number.split('');
        const permutations = new Set();

        // Generate all permutations
        for (let i = 0; i < digits.length; i++) {
            for (let j = 0; j < digits.length; j++) {
                for (let k = 0; k < digits.length; k++) {
                    if (i !== j && j !== k && i !== k) {
                        permutations.add(digits[i] + digits[j] + digits[k]);
                    }
                }
            }
        }

        return Array.from(permutations).sort();
    }
}

module.exports = Result;
