import { useState, useRef, useEffect } from 'react'
import { X, Download, Share2 } from 'lucide-react'
import { formatCurrency, formatReceiptAmount, getLottoTypeName, generateReverseNumbers } from '../utils/helpers'
import { halfPriceAPI, settingsAPI } from '../services/api'
import html2canvas from 'html2canvas'

const ReceiptModal = ({ isOpen, onClose, billData, isPreview = false }) => {
  const [isExporting, setIsExporting] = useState(false)
  const [halfPriceNumbers, setHalfPriceNumbers] = useState([])
  const [currentPeriod, setCurrentPeriod] = useState('')
  const receiptRef = useRef(null)

  useEffect(() => {
    if (isOpen && billData) {
      loadHalfPriceData()
    }
  }, [isOpen, billData])

  const loadHalfPriceData = async () => {
    try {
      // ใช้ period_id จาก billData หรือดึงงวดปัจจุบัน
      let periodId = billData?.period_id
      let periodName = billData?.period

      if (!periodId) {
        const systemResponse = await settingsAPI.getSystemStatus()
        periodName = systemResponse.data.data.current_period
        setCurrentPeriod(periodName)

        // หา period_id จาก period_name
        const halfPriceResponse = await halfPriceAPI.getByPeriodName(periodName)
        setHalfPriceNumbers(halfPriceResponse.data.data || [])
        return
      }

      setCurrentPeriod(periodName)

      // ดึงเลขจ่ายครึ่งราคาตาม period_id
      const halfPriceResponse = await halfPriceAPI.getByPeriod(periodId)
      setHalfPriceNumbers(halfPriceResponse.data.data || [])
    } catch (error) {
      // Error loading half price data
      setHalfPriceNumbers([])
    }
  }

  const isHalfPrice = (number, lottoType) => {
    return halfPriceNumbers.some(item => {
      // ตรวจสอบตามประเภทหวย
      if (lottoType === '2up' || lottoType === '2down') {
        // เลข 2 ตัว - ตรวจสอบกับเลข 2 หลัก
        return item.number === number && item.number.length === 2
      } else if (lottoType === '3up' || lottoType === '3toad') {
        // เลข 3 ตัว - ตรวจสอบกับเลข 3 หลัก
        return item.number === number && item.number.length === 3
      }
      return false
    })
  }

  // คำนวณยอดรวมใหม่
  const calculateTotalAmount = () => {
    let total = 0

    billData.tickets.forEach(ticket => {
      // สำหรับ reverse_enabled ให้คำนวณตามจำนวนเลขที่สร้างขึ้น
      const allNumbers = ticket.reverse_enabled
        ? generateReverseNumbers(ticket.lotto_number, ticket.lotto_type)
        : [ticket.lotto_number]

      // คำนวณราคาต่อเลข
      let pricePerNumber = parseFloat(ticket.price || 0)
      if ((ticket.lotto_type === '3toad' || ticket.lotto_type === '3straight_toad') && ticket.price_toad > 0) {
        pricePerNumber += parseFloat(ticket.price_toad || 0)
      }

      // คูณด้วยจำนวนเลขทั้งหมด
      total += pricePerNumber * allNumbers.length
    })

    return total
  }

  if (!isOpen || !billData) return null

  const handleExportImage = async () => {
    if (!receiptRef.current) return
    
    setIsExporting(true)
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true
      })
      
      const link = document.createElement('a')
      link.download = `receipt-${billData.bill_id}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (error) {
      // Error exporting image
    } finally {
      setIsExporting(false)
    }
  }

  const handleShare = async () => {
    if (!receiptRef.current) return
    
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true
      })
      
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `receipt-${billData.bill_id}.png`, { type: 'image/png' })
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'ใบเสร็จหวย',
            text: `ใบเสร็จหวย ${billData.bill_id}`
          })
        } else {
          // Fallback: download the image
          handleExportImage()
        }
      })
    } catch (error) {
      // Error sharing
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isPreview ? 'ตัวอย่างใบเสร็จหวย' : 'ใบเสร็จหวย'}
          </h2>
          <div className="flex gap-2">
            {!isPreview && (
              <>
                <button
                  onClick={handleShare}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="แชร์"
                >
                  <Share2 size={20} />
                </button>
                <button
                  onClick={handleExportImage}
                  disabled={isExporting}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                  title="บันทึกรูป"
                >
                  <Download size={20} />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="p-6 bg-white">
          {/* Header */}
          <div className="text-center mb-6">

            <div className="text-sm text-gray-600">รัฐบาลไทย</div>
            <div className="text-center mt-2 mb-3">
              <div className="text-lg font-bold text-blue-600">
               {billData.period || currentPeriod || 'ไม่ระบุงวด'}
              </div>
            </div>
            <div className="border-t border-b border-gray-300 py-2 mt-3">
              <div className="text-xs text-gray-500">
                รหัสบิล: {isPreview ? 'ตัวอย่าง' : billData.bill_id}
              </div>
              <div className="text-xs text-gray-500">
                {new Date().toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
              {isPreview && (
                <div className="text-xs text-red-500 mt-1">
                  * นี่เป็นเพียงตัวอย่าง ยังไม่ได้บันทึกจริง
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="font-semibold">ผู้ซื้อ: {billData.buyer_name}</div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
              {(() => {
                // จัดกลุ่ม tickets ตามความต้องการใหม่
                const groups = {
                  '2 ตัวบน': [],    // 2 ตัวบน
                  '2 ตัวล่าง': [],   // 2 ตัวล่าง
                  'วิ่งบน': [],     // วิ่งบน
                  'วิ่งล่าง': []     // วิ่งล่าง
                }

                // สร้างกลุ่มพิเศษสำหรับเลข 2 ตัวที่เหมือนกันทั้งบนและล่าง
                const twoDigitSameGroups = []
                // สร้างกลุ่มพิเศษสำหรับเลข 3 ตัวทั้งหมด (ตรงและโต๊ด)
                const threeDigitAllGroups = []

                // รวบรวมข้อมูล tickets
                const ticketData = []
                billData.tickets.forEach(ticket => {
                  const allNumbers = ticket.reverse_enabled
                    ? generateReverseNumbers(ticket.lotto_number, ticket.lotto_type)
                    : [ticket.lotto_number]

                  allNumbers.forEach(number => {
                    const price = parseFloat(ticket.price || 0)
                    const priceToad = parseFloat(ticket.price_toad || 0)
                    
                    ticketData.push({
                      number,
                      price,
                      priceToad,
                      lotto_type: ticket.lotto_type,
                      display: priceToad > 0 ? `${formatReceiptAmount(price)}/${formatReceiptAmount(priceToad)}` : `${formatReceiptAmount(price)}`
                    })
                  })
                })

                // จัดกลุ่มเลข 2 ตัวที่เหมือนกันทั้งบนและล่าง
                const twoUpNumbers = ticketData.filter(item => item.lotto_type === '2up')
                const twoDownNumbers = ticketData.filter(item => item.lotto_type === '2down')

                twoUpNumbers.forEach(upItem => {
                  const matchingDownItem = twoDownNumbers.find(downItem => downItem.number === upItem.number)
                  if (matchingDownItem) {
                    // ถ้ามีเลขตรงกัน ให้สร้างกลุ่มพิเศษ
                    twoDigitSameGroups.push({
                      number: upItem.number,
                      upPrice: upItem.price,
                      downPrice: matchingDownItem.price
                    })
                  } else {
                    // ถ้าไม่มีเลขตรงกัน ให้ใส่ในกลุ่มปกติ
                    groups['2 ตัวบน'].push({
                      number: upItem.number,
                      price: upItem.price,
                      lotto_type: '2up',
                      display: `${formatReceiptAmount(upItem.price)}`
                    })
                  }
                })

                // ใส่เลขล่างที่ไม่ตรงกับเลขบนในกลุ่มปกติ
                twoDownNumbers.forEach(downItem => {
                  const hasMatchingUp = twoUpNumbers.some(upItem => upItem.number === downItem.number)
                  if (!hasMatchingUp) {
                    groups['2 ตัวล่าง'].push({
                      number: downItem.number,
                      price: downItem.price,
                      lotto_type: '2down',
                      display: `${formatReceiptAmount(downItem.price)}`
                    })
                  }
                })

                // จัดกลุ่มเลข 3 ตัวทั้งหมด (ทั้งตรงและโต๊ด) ในกลุ่มเดียว
                const threeUpNumbers = ticketData.filter(item => item.lotto_type === '3up')
                const threeToadNumbers = ticketData.filter(item => item.lotto_type === '3toad' || item.lotto_type === '3straight_toad')

                // เพิ่มเลข 3 ตัวตรงทั้งหมดในกลุ่ม
                threeUpNumbers.forEach(upItem => {
                  const matchingToadItem = threeToadNumbers.find(toadItem => toadItem.number === upItem.number)
                  if (matchingToadItem) {
                    // ถ้ามีเลขตรงกันกับโต๊ด
                    threeDigitAllGroups.push({
                      number: upItem.number,
                      straightPrice: upItem.price,
                      toadPrice: matchingToadItem.price
                    })
                  } else {
                    // ถ้าไม่มีเลขตรงกันกับโต๊ด ให้แสดงเฉพาะราคาตรง
                    threeDigitAllGroups.push({
                      number: upItem.number,
                      straightPrice: upItem.price,
                      toadPrice: null
                    })
                  }
                })

                // เพิ่มเลขโต๊ดที่ไม่ตรงกับเลขตรง
                threeToadNumbers.forEach(toadItem => {
                  const hasMatchingUp = threeUpNumbers.some(upItem => upItem.number === toadItem.number)
                  if (!hasMatchingUp) {
                    threeDigitAllGroups.push({
                      number: toadItem.number,
                      straightPrice: null,
                      toadPrice: toadItem.price
                    })
                  }
                })

                // ใส่ประเภทหวยอื่นๆ ในกลุ่มปกติ
                ticketData.forEach(item => {
                  if (item.lotto_type === 'runup') {
                    groups['วิ่งบน'].push({
                      number: item.number,
                      price: item.price,
                      lotto_type: 'runup',
                      display: `${formatReceiptAmount(item.price)}`
                    })
                  } else if (item.lotto_type === 'rundown') {
                    groups['วิ่งล่าง'].push({
                      number: item.number,
                      price: item.price,
                      lotto_type: 'rundown',
                      display: `${formatReceiptAmount(item.price)}`
                    })
                  }
                })

                // กำหนดลำดับการแสดงผลตามความต้องการ
                const displayOrder = ['2 ตัวบน', '2 ตัวล่าง', 'วิ่งบน', 'วิ่งล่าง']
                
                return (
                  <>
                    {/* กลุ่มเลข 3 ตัวทั้งหมด (ตรงและโต๊ด) */}
                    {threeDigitAllGroups.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-bold text-gray-700 mb-2 text-center border-b border-gray-200 pb-1">
                          3 ตัวตรง/โต๊ด
                        </div>
                        {threeDigitAllGroups.map((item, index) => {
                          const isHalf = isHalfPrice(item.number, '3up') || isHalfPrice(item.number, '3toad')
                          return (
                            <div key={index} className="grid grid-cols-3 gap-2 text-sm py-1">
                              <div className="font-mono font-bold">
                                {item.number}
                                {isHalf && <span className="text-xs text-red-500 ml-1">จ่ายครึ่ง</span>}
                              </div>
                              <div></div>
                              <div className="text-right font-bold">
                                {item.toadPrice !== null ? 
                                  (item.straightPrice !== null ? 
                                    `${formatReceiptAmount(item.straightPrice)}X${formatReceiptAmount(item.toadPrice)}` : 
                                    `${formatReceiptAmount(item.toadPrice)}`) : 
                                  `${formatReceiptAmount(item.straightPrice)}`}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* กลุ่มเลข 2 ตัวที่เหมือนกันทั้งบนและล่าง */}
                    {twoDigitSameGroups.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-bold text-gray-700 mb-2 text-center border-b border-gray-200 pb-1">
                          บน/ล่าง
                        </div>
                        {twoDigitSameGroups.map((item, index) => {
                          const isHalf = isHalfPrice(item.number, '2up') || isHalfPrice(item.number, '2down')
                          return (
                            <div key={index} className="grid grid-cols-3 gap-2 text-sm py-1">
                              <div className="font-mono font-bold">
                                {item.number}
                                {isHalf && <span className="text-xs text-red-500 ml-1">จ่ายครึ่ง</span>}
                              </div>
                              <div></div>
                              <div className="text-right font-bold">{formatReceiptAmount(item.upPrice)}X{formatReceiptAmount(item.downPrice)}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* กลุ่มปกติ */}
                    {displayOrder.map(groupName => {
                      const items = groups[groupName]
                      if (items.length === 0) return null

                      return (
                        <div key={groupName} className="mb-4">
                          <div className="text-sm font-bold text-gray-700 mb-2 text-center border-b border-gray-200 pb-1">
                            {groupName}
                          </div>
                          {items.map((item, index) => {
                            // ตรวจสอบว่าเลขนี้เป็นเลขจ่ายครึ่งหรือไม่
                            const isHalf = isHalfPrice(item.number, item.lotto_type)

                            return (
                              <div key={index} className="grid grid-cols-3 gap-2 text-sm py-1">
                                <div className="font-mono font-bold">
                                  {item.number}
                                  {isHalf && <span className="text-xs text-red-500 ml-1">จ่ายครึ่ง</span>}
                                </div>
                                <div></div>
                                <div className="text-right font-bold">{item.display}</div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    }).filter(Boolean)}
                  </>
                )
              })()}
            </div>

          {/* Total */}
          <div className="border-t pt-3">
            <div className="flex justify-between items-center font-bold text-lg text-blue-600">
              <span>ยอดรวมทั้งหมด:</span>
              <span>{formatReceiptAmount(billData.total_amount || calculateTotalAmount())}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 pt-4 border-t">
             <div className="text-xs text-gray-500">
           ⚠️ กรุณาตรวจสอบโพยทุกครั้ง ⚠️
            </div>
            <div className="text-xs text-gray-500">
             📌 ยึดโพยที่ส่งกลับเป็นหลัก 📌
            </div>
            <div className="text-xs text-gray-500">
              ⚡️ หากมีข้อผิดพลาด ไม่ได้รับโพย ให้รีบแจ้งทันที ⚡️
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceiptModal
