import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Save, Receipt, ArrowLeft } from 'lucide-react'
import { ticketsAPI, settingsAPI, halfPriceAPI, periodAPI } from '../services/api'
import { getLottoTypeName, validateLottoNumber, formatCurrency, generateReverseNumbers } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import ReceiptModal from '../components/ReceiptModal'
import toast from 'react-hot-toast'

const TicketPage = () => {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [payoutRates, setPayoutRates] = useState({})
  const [loading, setLoading] = useState(false)
  const [systemStatus, setSystemStatus] = useState(null)
  const [halfPriceNumbers, setHalfPriceNumbers] = useState([])
  const [openPeriod, setOpenPeriod] = useState(null)
  const [showPreviewReceipt, setShowPreviewReceipt] = useState(false)
  const [showSavedReceipt, setShowSavedReceipt] = useState(false)
  const [savedBillData, setSavedBillData] = useState(null)

  // สถานะการเลือกประเภทเลข
  const [selectedNumberType, setSelectedNumberType] = useState('2digit') // '2digit', '3digit', 'running'
  
  // สถานะการเลือกประเภทการแทง (เปลี่ยนเป็น array เพื่อรองรับหลายตัวเลือก)
  const [selectedBetTypes, setSelectedBetTypes] = useState(['straight']) // array ของ bet types
  
  // ข้อมูลเลขที่กำลังกรอก
  const [currentNumber, setCurrentNumber] = useState('')
  const [currentPrice, setCurrentPrice] = useState('')
  const [globalPrice, setGlobalPrice] = useState(20) // ราคากลางสำหรับทุกรายการ
  
  // สถานะสำหรับฟังก์ชัน auto (ปิดการใช้งาน)
  const [autoAddEnabled, setAutoAddEnabled] = useState(false)

  // ฟังก์ชันจัดการการเลือกประเภทการแทง
  const handleBetTypeSelection = (numberType, betType) => {
    // ถ้าเปลี่ยนประเภทเลข ให้รีเซ็ตการเลือก
    if (selectedNumberType !== numberType) {
      setSelectedNumberType(numberType)
      setSelectedBetTypes([betType])
      return
    }

    // ถ้าเป็นประเภทเลขเดียวกัน ให้ toggle การเลือก
    setSelectedBetTypes(prev => {
      if (prev.includes(betType)) {
        // ถ้าเลือกอยู่แล้ว ให้ลบออก (แต่ต้องมีอย่างน้อย 1 ตัวเลือก)
        const newSelection = prev.filter(type => type !== betType)
        return newSelection.length > 0 ? newSelection : [betType]
      } else {
        // ถ้ายังไม่เลือก ให้เพิ่มเข้าไป
        return [...prev, betType]
      }
    })
  }

  // ฟังก์ชันตรวจสอบว่าปุ่มถูกเลือกหรือไม่
  const isBetTypeSelected = (numberType, betType) => {
    return selectedNumberType === numberType && selectedBetTypes.includes(betType)
  }

  // ฟังก์ชันสร้างชื่อรายการที่เลือก
  const getSelectedBetTypeNames = () => {
    const names = []
    
    if (selectedNumberType === '2digit') {
      if (selectedBetTypes.includes('straight')) names.push('2 ตัวบน')
      if (selectedBetTypes.includes('reverse')) names.push('2 ตัวล่าง')
      if (selectedBetTypes.includes('both')) names.push('2 ตัวกลับ')
    } else if (selectedNumberType === '3digit') {
      if (selectedBetTypes.includes('straight')) names.push('3 ตัวบน')
      if (selectedBetTypes.includes('toad')) names.push('3 ตัวโต๊ด')
      if (selectedBetTypes.includes('reverse')) names.push('3 ตัวกลับ')
    } else if (selectedNumberType === 'running') {
      if (selectedBetTypes.includes('straight')) names.push('วิ่งบน')
      if (selectedBetTypes.includes('reverse')) names.push('วิ่งล่าง')
    }
    
    return names.join(', ')
  }

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { errors }
  } = useForm({
    defaultValues: {
      buyer_name: '',
      lotto_number: '',
      lotto_type: '2up',
      price: '',
      price_toad: '',
      price_up: '',
      price_down: '',
      reverse_enabled: false
    }
  })

  const watchedValues = watch()

  useEffect(() => {
    loadInitialData()
    loadOpenPeriod()
  }, [])

  useEffect(() => {
    if (openPeriod) {
      loadHalfPriceNumbers()
    }
  }, [openPeriod])

  // ฟังก์ชันโหลดข้อมูลเริ่มต้น
  const loadInitialData = async () => {
    try {
      const [ratesResponse, statusResponse] = await Promise.all([
        settingsAPI.getAsObject(),
        settingsAPI.getSystemStatus()
      ])

      setPayoutRates(ratesResponse.data.data)
      setSystemStatus(statusResponse.data.data)
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    }
  }

  const loadOpenPeriod = async () => {
    try {
      const response = await periodAPI.getOpenPeriod()
      setOpenPeriod(response.data.data)
    } catch (error) {
      setOpenPeriod(null)
    }
  }

  const loadHalfPriceNumbers = async () => {
    try {
      if (!openPeriod?.period_name) return

      const response = await halfPriceAPI.getByPeriodName(openPeriod.period_name)
      setHalfPriceNumbers(response.data.data || [])
    } catch (error) {
      setHalfPriceNumbers([])
    }
  }

  // ฟังก์ชันตรวจสอบว่าเลขหวยตรงกับเลขจ่ายครึ่งราคาหรือไม่
  const isHalfPriceNumber = (lottoNumber, lottoType) => {
    return halfPriceNumbers.some(item => {
      if (lottoType === '2up' || lottoType === '2down') {
        return item.number === lottoNumber && item.number.length === 2
      } else if (lottoType === '3up' || lottoType === '3toad') {
        return item.number === lottoNumber && item.number.length === 3
      }
      return false
    })
  }

  // ฟังก์ชันสร้างข้อมูลใบเสร็จสำหรับ preview
  const generatePreviewReceiptData = () => {
    const { buyer_name } = getValues()
    const totalAmount = tickets.reduce((sum, ticket) => {
      let amount = parseFloat(ticket.price || 0)
      if ((ticket.lotto_type === '3toad' || ticket.lotto_type === '3straight_toad') && ticket.price_toad > 0) {
        amount += parseFloat(ticket.price_toad || 0)
      }
      return sum + amount
    }, 0)

    return {
      bill_id: 'PREVIEW',
      buyer_name: buyer_name || 'ไม่ระบุชื่อ',
      seller_name: user?.username || 'ไม่ระบุ',
      tickets: tickets,
      total_amount: totalAmount,
      created_at: new Date(),
      period: openPeriod?.period_name || 'ไม่ระบุงวด'
    }
  }

  // ฟังก์ชันเพิ่มรายการหวยใหม่
  const addTicket = (data) => {
    if (!systemStatus?.is_open) {
      toast.error('ระบบปิดรับแทงหวยในขณะนี้')
      return
    }

    // ตรวจสอบความถูกต้องของเลขหวย
    if (!validateLottoNumber(data.lotto_number, data.lotto_type)) {
      toast.error('รูปแบบเลขหวยไม่ถูกต้อง')
      return
    }

    // ตรวจสอบชื่อผู้ซื้อ
    if (!data.buyer_name.trim()) {
      toast.error('กรุณากรอกชื่อผู้ซื้อ')
      return
    }

    // ถ้าเป็น "บนล่าง" ให้สร้าง 2 tickets
    if (data.lotto_type === '2updown') {
      const upTicket = {
        id: Date.now(),
        ...data,
        lotto_type: '2up',
        price: data.price_up,
        reverse_enabled: false,
        seller_name: user?.agent_name || '',
        total_numbers: 1,
        total_amount: parseFloat(data.price_up)
      }

      const downTicket = {
        id: Date.now() + 1,
        ...data,
        lotto_type: '2down',
        price: data.price_down,
        reverse_enabled: false,
        seller_name: user?.agent_name || '',
        total_numbers: 1,
        total_amount: parseFloat(data.price_down)
      }

      setTickets([...tickets, upTicket, downTicket])
    } else {
      const newTicket = {
        id: Date.now(),
        ...data,
        seller_name: user?.agent_name || '',
        total_numbers: calculateTotalNumbers(data.lotto_number, data.lotto_type, data.reverse_enabled),
        total_amount: calculateTotalAmount(data.price, data.price_toad, data.lotto_number, data.lotto_type, data.reverse_enabled)
      }

      setTickets([...tickets, newTicket])
    }
    reset({
      buyer_name: data.buyer_name,
      lotto_number: '',
      lotto_type: data.lotto_type,
      price: data.price,
      price_toad: 0,
      price_up: '',
      price_down: '',
      reverse_enabled: false
    })
    toast.success('เพิ่มรายการหวยแล้ว')
  }

  // ฟังก์ชันเพิ่มรายการจากฟอร์มใหม่
  const addTicketFromNewForm = () => {
    if (!systemStatus?.is_open) {
      toast.error('ระบบปิดรับแทงหวยในขณะนี้')
      return
    }

    if (!currentNumber.trim()) {
      toast.error('กรุณากรอกเลขหวย')
      return
    }

    if (!currentPrice.trim() || parseFloat(currentPrice) <= 0) {
      toast.error('กรุณากรอกราคาที่ถูกต้อง')
      return
    }

    // สร้าง lotto_type จากประเภทที่เลือก
    let lottoType = ''
    if (selectedNumberType === '2digit') {
      if (selectedBetTypes.includes('straight')) lottoType = '2up'
      else if (selectedBetTypes.includes('reverse')) lottoType = '2down'
      else if (selectedBetTypes.includes('both')) lottoType = '2updown'
    } else if (selectedNumberType === '3digit') {
      if (selectedBetTypes.includes('straight')) lottoType = '3up'
      else if (selectedBetTypes.includes('toad')) lottoType = '3toad'
      else if (selectedBetTypes.includes('reverse')) lottoType = '3up' // 3up with reverse
    } else if (selectedNumberType === 'running') {
      if (selectedBetTypes.includes('straight')) lottoType = 'runup'
      else if (selectedBetTypes.includes('reverse')) lottoType = 'rundown'
    }

    // ตรวจสอบความถูกต้องของเลขหวย
    if (!validateLottoNumber(currentNumber, lottoType)) {
      toast.error('รูปแบบเลขหวยไม่ถูกต้อง')
      return
    }

    const newTicket = {
      id: Date.now(),
      buyer_name: getValues('buyer_name') || 'ไม่ระบุชื่อ',
      lotto_number: currentNumber,
      lotto_type: lottoType,
      price: parseFloat(currentPrice),
      price_toad: 0,
      reverse_enabled: selectedNumberType === '3digit' && selectedBetTypes.includes('reverse'),
      seller_name: user?.agent_name || '',
      total_numbers: selectedNumberType === '3digit' && selectedBetTypes.includes('reverse') ? 6 : 1,
      total_amount: selectedNumberType === '3digit' && selectedBetTypes.includes('reverse') ? 
        parseFloat(currentPrice) * 6 : parseFloat(currentPrice)
    }

    setTickets([...tickets, newTicket])
    
    // รีเซ็ตฟอร์ม
    setCurrentNumber('')
    setCurrentPrice('')
    
    toast.success('เพิ่มรายการหวยแล้ว')
  }

  // ฟังก์ชันลบรายการ
  const removeTicket = (id) => {
    setTickets(tickets.filter(ticket => ticket.id !== id))
    toast.success('ลบรายการแล้ว')
  }

  // ฟังก์ชันคำนวณจำนวนตั๋ว
  const calculateTotalNumbers = (number, type, reverseEnabled) => {
    if (!reverseEnabled) return 1
    return generateReverseNumbers(number, type).length
  }

  // ฟังก์ชันคำนวณยอดรวม
  const calculateTotalAmount = (price, priceToad, number, type, reverseEnabled) => {
    const totalNumbers = calculateTotalNumbers(number, type, reverseEnabled)
    let total = price * totalNumbers
    if (priceToad && (type === '3toad' || type === '3straight_toad')) {
      total += priceToad * totalNumbers
    }
    return total
  }

  // ฟังก์ชันคำนวณยอดรวมทั้งหมด
  const getTotalAmount = () => {
    return tickets.reduce((sum, ticket) => {
      let amount = parseFloat(ticket.price || 0)
      if (ticket.lotto_type === '3toad' && ticket.price_toad > 0) {
        amount += parseFloat(ticket.price_toad || 0)
      }
      return sum + amount
    }, 0)
  }

  // ฟังก์ชันคำนวณจำนวนตั๋วทั้งหมด
  const getTotalTickets = () => {
    return tickets.reduce((sum, ticket) => sum + parseInt(ticket.total_numbers || 0), 0)
  }

  // ฟังก์ชันบันทึกตั๋ว
  const saveTickets = async () => {
    if (tickets.length === 0) {
      toast.error('กรุณาเพิ่มรายการหวยก่อน')
      return
    }

    if (!systemStatus?.is_open) {
      toast.error('ระบบปิดรับแทงหวยในขณะนี้')
      return
    }

    setLoading(true)
    try {
      let currentPeriodId = null
      if (openPeriod?.id) {
        currentPeriodId = openPeriod.id
      }

      const ticketData = {
        buyer_name: tickets[0].buyer_name,
        seller_name: user?.agent_name || '',
        period_id: currentPeriodId,
        tickets: tickets.map(ticket => ({
          lotto_number: ticket.lotto_number,
          lotto_type: ticket.lotto_type,
          price: ticket.price,
          price_toad: ticket.price_toad || 0,
          reverse_enabled: ticket.reverse_enabled,
          is_half_price: ticket.is_half_price || false
        }))
      }

      const response = await ticketsAPI.create(ticketData)

      if (response.data.success) {
        toast.success('บันทึกหวยสำเร็จ')

        const billData = {
          bill_id: response.data.data.bill_id,
          buyer_name: ticketData.buyer_name,
          seller_name: ticketData.seller_name,
          tickets: ticketData.tickets,
          total_amount: response.data.data.total_amount,
          created_at: new Date(),
          period: openPeriod?.period_name || 'ไม่ระบุงวด'
        }

        setSavedBillData(billData)
        setShowSavedReceipt(true)

        setTickets([])
        reset()
        toast.success('บันทึกหวยสำเร็จ')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกหวย')
    } finally {
      setLoading(false)
    }
  }

  // ฟังก์ชันล้างทั้งหมด
  const clearAll = () => {
    setTickets([])
    reset()
    setCurrentNumber('')
    setCurrentPrice('')
    toast.success('ล้างรายการทั้งหมดแล้ว')
  }

  // ฟังก์ชันจัดการการกด Enter ใน input field
  const handleNumberKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isNumberComplete(currentNumber) && selectedBetTypes.length > 0) {
        addTicketFromForm()
      }
    }
  }

  const handlePriceKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (currentPrice.trim() && parseFloat(currentPrice) > 0) {
        addTicketFromNewForm()
      }
    }
  }

  // ฟังก์ชันคำนวณอัตราจ่าย
  const getPayoutRate = () => {
    if (selectedNumberType === '2digit') {
      if (selectedBetTypes.includes('straight')) return payoutRates['2up'] || 70
      else if (selectedBetTypes.includes('reverse')) return payoutRates['2down'] || 70
      else if (selectedBetTypes.includes('both')) return `${payoutRates['2up'] || 70}+${payoutRates['2down'] || 70}`
    } else if (selectedNumberType === '3digit') {
      if (selectedBetTypes.includes('straight')) return payoutRates['3up'] || 500
      else if (selectedBetTypes.includes('toad')) return payoutRates['3toad'] || 90
      else if (selectedBetTypes.includes('reverse')) return payoutRates['3up'] || 500
    } else if (selectedNumberType === 'running') {
      if (selectedBetTypes.includes('straight')) return payoutRates['runup'] || 3
      else if (selectedBetTypes.includes('reverse')) return payoutRates['rundown'] || 3
    }
    return 0
  }

  // ฟังก์ชันจัดการ input โดยตรง (ไม่ auto-add)
  const handleDirectInput = (e) => {
    const value = e.target.value
    const maxLength = selectedNumberType === 'running' ? 1 : selectedNumberType === '2digit' ? 2 : 3
    
    // อนุญาตเฉพาะตัวเลขและจำกัดความยาว
    if (/^\d*$/.test(value) && value.length <= maxLength) {
      setCurrentNumber(value)
    }
  }
  
  // ฟังก์ชันตรวจสอบว่าเลขครบแล้วหรือไม่
  const isNumberComplete = (numberString) => {
    const requiredLength = selectedNumberType === 'running' ? 1 : selectedNumberType === '2digit' ? 2 : 3
    // ตรวจสอบว่าความยาวตรงกับที่ต้องการ และไม่มีช่องว่าง
    return numberString && numberString.trim().length === requiredLength && /^\d+$/.test(numberString.trim())
  }

  const handleBackspace = () => {
    setCurrentNumber(prev => prev.slice(0, -1))
  }

  // Handle keypad number input
  const handleNumberInput = (num) => {
    const maxLength = selectedNumberType === 'running' ? 1 : selectedNumberType === '2digit' ? 2 : 3
    
    if (currentNumber.length < maxLength) {
      setCurrentNumber(prev => prev + num.toString())
    }
  }

  // Clear current number
  const clearCurrentNumber = () => {
    setCurrentNumber('')
  }

  // ฟังก์ชันจัดการราคากลาง
  const handleGlobalPriceChange = (newPrice) => {
    setGlobalPrice(newPrice)
  }

  // ฟังก์ชันปรับราคาด้วย + -
  const adjustGlobalPrice = (amount) => {
    const newPrice = Math.max(1, globalPrice + amount)
    setGlobalPrice(newPrice)
  }

  // ฟังก์ชันอัปเดตราคาทุกรายการให้เท่ากัน
  const updateAllTicketPrices = () => {
    if (tickets.length === 0) {
      toast.error('ไม่มีรายการหวยให้อัปเดต')
      return
    }

    setTickets(prev => prev.map(ticket => ({
      ...ticket,
      price: globalPrice,
      total_amount: globalPrice
    })))
    
    toast.success(`อัปเดตราคาทุกรายการเป็น ${globalPrice} บาทแล้ว`)
  }

  // ฟังก์ชันสร้าง input fields ตามประเภทเลข
  const renderInputFields = () => {
    const maxLength = selectedNumberType === 'running' ? 1 : selectedNumberType === '2digit' ? 2 : 3
    const fields = []
    
    for (let i = 0; i < maxLength; i++) {
      fields.push(
        <div key={i} className="flex-1 max-w-20">
          <input
            type="text"
            value={currentNumber[i] || ''}
            readOnly
            className="w-full h-16 md:h-12 text-center text-2xl md:text-xl font-bold border-2 border-blue-300 rounded-lg bg-white focus:border-blue-500"
            placeholder="?"
          />
        </div>
      )
    }
    
    return (
      <div className="flex justify-center gap-2 mb-4">
        {fields}
      </div>
    )
  }

  // ฟังก์ชันตรวจสอบเลขซ้ำในหมวดเดียวกัน
  const checkDuplicateNumber = (number, lottoType) => {
    return tickets.some(ticket => 
      ticket.lotto_number === number && ticket.lotto_type === lottoType
    )
  }

  // ฟังก์ชันเพิ่มรายการจากฟอร์ม
  const addTicketFromForm = () => {
    const buyerName = getValues('buyer_name')
    if (!buyerName || !buyerName.trim()) {
      toast.error('กรุณากรอกชื่อผู้ซื้อก่อน')
      return
    }

    if (selectedBetTypes.length === 0) {
      toast.error('กรุณาเลือกประเภทการแทง')
      return
    }

    if (!currentNumber.trim()) {
      toast.error('กรุณากรอกเลข')
      return
    }

    if (!systemStatus?.is_open) {
      toast.error('ระบบปิดรับแทงหวยในขณะนี้')
      return
    }

    // ใช้ราคากลาง (สามารถแก้ไขในตารางทีหลัง)
    const defaultPrice = globalPrice

    // สร้างรายการสำหรับแต่ละประเภทการแทงที่เลือก
    const ticketsToAdd = []
    
    selectedBetTypes.forEach(betType => {
      // แปลงประเภทการแทงเป็น lotto_type
      if (selectedNumberType === '2digit') {
        if (betType === 'straight') {
          // ตรวจสอบเลขซ้ำสำหรับ 2 ตัวบน
          if (checkDuplicateNumber(currentNumber, '2up')) {
            toast.error(`เลข ${currentNumber} มีอยู่ในรายการ 2 ตัวบน แล้ว`)
            return
          }
          
          // 2 ตัวบน - เพิ่มเฉพาะเลขต้นฉบับ
          const upTicket = {
            id: Date.now() + Math.random(),
            buyer_name: buyerName.trim(),
            lotto_number: currentNumber,
            lotto_type: '2up',
            price: defaultPrice,
            price_toad: 0,
            reverse_enabled: false,
            seller_name: user?.agent_name || '',
            total_numbers: 1,
            total_amount: defaultPrice
          }
          
          ticketsToAdd.push(upTicket)
        }
        else if (betType === 'reverse') {
          // ตรวจสอบเลขซ้ำสำหรับ 2 ตัวล่าง
          if (checkDuplicateNumber(currentNumber, '2down')) {
            toast.error(`เลข ${currentNumber} มีอยู่ในรายการ 2 ตัวล่าง แล้ว`)
            return
          }
          
          // 2 ตัวล่าง - เพิ่มเฉพาะเลขต้นฉบับ
          const downTicket = {
            id: Date.now() + Math.random(),
            buyer_name: buyerName.trim(),
            lotto_number: currentNumber,
            lotto_type: '2down',
            price: defaultPrice,
            price_toad: 0,
            reverse_enabled: false,
            seller_name: user?.agent_name || '',
            total_numbers: 1,
            total_amount: defaultPrice
          }
          
          ticketsToAdd.push(downTicket)
        }
        else if (betType === 'both') {
          // 2 ตัวกลับ - เพิ่มเลขกลับในทั้งบนและล่าง (ถ้ามีการเลือกบนหรือล่าง)
          const reversedNumber = currentNumber.split('').reverse().join('')
          
          // ตรวจสอบว่ามีการเลือก บน หรือ ล่าง ด้วยหรือไม่
          if (selectedBetTypes.includes('straight')) {
            // ตรวจสอบเลขกลับซ้ำใน 2 ตัวบน
            if (checkDuplicateNumber(reversedNumber, '2up')) {
              toast.error(`เลขกลับ ${reversedNumber} มีอยู่ในรายการ 2 ตัวบน แล้ว`)
              return
            }
            
            // เพิ่มเลขกลับใน 2 ตัวบน
            const upReverseTicket = {
              id: Date.now() + Math.random(),
              buyer_name: buyerName.trim(),
              lotto_number: reversedNumber,
              lotto_type: '2up',
              price: defaultPrice,
              price_toad: 0,
              reverse_enabled: false,
              seller_name: user?.agent_name || '',
              total_numbers: 1,
              total_amount: defaultPrice
            }
            ticketsToAdd.push(upReverseTicket)
          }
          
          if (selectedBetTypes.includes('reverse')) {
            // ตรวจสอบเลขกลับซ้ำใน 2 ตัวล่าง
            if (checkDuplicateNumber(reversedNumber, '2down')) {
              toast.error(`เลขกลับ ${reversedNumber} มีอยู่ในรายการ 2 ตัวล่าง แล้ว`)
              return
            }
            
            // เพิ่มเลขกลับใน 2 ตัวล่าง
            const downReverseTicket = {
              id: Date.now() + Math.random() + 1,
              buyer_name: buyerName.trim(),
              lotto_number: reversedNumber,
              lotto_type: '2down',
              price: defaultPrice,
              price_toad: 0,
              reverse_enabled: false,
              seller_name: user?.agent_name || '',
              total_numbers: 1,
              total_amount: defaultPrice
            }
            ticketsToAdd.push(downReverseTicket)
          }
        }
      } else if (selectedNumberType === '3digit') {
        // สำหรับ 3 ตัว ต้องจัดการการเลือกหลายประเภทพร้อมกันเพื่อป้องกันเลขซ้ำ
        const has3Reverse = selectedBetTypes.includes('reverse')
        const has3Straight = selectedBetTypes.includes('straight')
        const has3Toad = selectedBetTypes.includes('toad')
        
        // สร้างรายการเลขทั้งหมด (รวมทั้งเลขต้นฉบับและเลขกลับ)
        let allNumbers = [currentNumber]
        if (has3Reverse) {
          allNumbers = generateReverseNumbers(currentNumber, '3up')
        }
        
        if (betType === 'straight') {
          // ตรวจสอบเลขซ้ำใน 3 ตัวตรง
          const duplicatesIn3Up = allNumbers.filter(number => checkDuplicateNumber(number, '3up'))
          if (duplicatesIn3Up.length > 0) {
            toast.error(`เลข ${duplicatesIn3Up.join(', ')} มีอยู่ในรายการ 3 ตัวตรง แล้ว`)
            return
          }
          
          // เพิ่มเลขทั้งหมดใน 3 ตัวตรง
          allNumbers.forEach((number, index) => {
            const straightTicket = {
              id: Date.now() + Math.random() + index,
              buyer_name: buyerName.trim(),
              lotto_number: number,
              lotto_type: '3up',
              price: defaultPrice,
              price_toad: 0,
              reverse_enabled: false,
              seller_name: user?.agent_name || '',
              total_numbers: 1,
              total_amount: defaultPrice
            }
            ticketsToAdd.push(straightTicket)
          })
        }
        else if (betType === 'toad') {
          // ตรวจสอบเลขซ้ำใน 3 ตัวโต๊ด
          const duplicatesInToad = allNumbers.filter(number => checkDuplicateNumber(number, '3toad'))
          if (duplicatesInToad.length > 0) {
            toast.error(`เลข ${duplicatesInToad.join(', ')} มีอยู่ในรายการ 3 ตัวโต๊ด แล้ว`)
            return
          }
          
          // เพิ่มเลขทั้งหมดใน 3 ตัวโต๊ด
          allNumbers.forEach((number, index) => {
            const toadTicket = {
              id: Date.now() + Math.random() + index + 100,
              buyer_name: buyerName.trim(),
              lotto_number: number,
              lotto_type: '3toad',
              price: defaultPrice,
              price_toad: 0,
              reverse_enabled: false,
              seller_name: user?.agent_name || '',
              total_numbers: 1,
              total_amount: defaultPrice
            }
            ticketsToAdd.push(toadTicket)
          })
        }
        // หมายเหตุ: ไม่ต้องมี betType === 'reverse' เพราะมันจะถูกจัดการในส่วนของ straight และ toad แล้ว
      } else if (selectedNumberType === 'running') {
        if (betType === 'straight') {
          // ตรวจสอบเลขซ้ำสำหรับ วิ่งบน
          if (checkDuplicateNumber(currentNumber, 'runup')) {
            toast.error(`เลข ${currentNumber} มีอยู่ในรายการวิ่งบน แล้ว`)
            return
          }
          
          // วิ่งบน - เพิ่มเฉพาะเลขต้นฉบับ
          const runUpTicket = {
            id: Date.now() + Math.random(),
            buyer_name: buyerName.trim(),
            lotto_number: currentNumber,
            lotto_type: 'runup',
            price: defaultPrice,
            price_toad: 0,
            reverse_enabled: false,
            seller_name: user?.agent_name || '',
            total_numbers: 1,
            total_amount: defaultPrice
          }
          ticketsToAdd.push(runUpTicket)
        }
        else if (betType === 'reverse') {
          // ตรวจสอบเลขซ้ำสำหรับ วิ่งล่าง
          if (checkDuplicateNumber(currentNumber, 'rundown')) {
            toast.error(`เลข ${currentNumber} มีอยู่ในรายการวิ่งล่าง แล้ว`)
            return
          }
          
          // วิ่งล่าง - เพิ่มเฉพาะเลขต้นฉบับ
          const runDownTicket = {
            id: Date.now() + Math.random(),
            buyer_name: buyerName.trim(),
            lotto_number: currentNumber,
            lotto_type: 'rundown',
            price: defaultPrice,
            price_toad: 0,
            reverse_enabled: false,
            seller_name: user?.agent_name || '',
            total_numbers: 1,
            total_amount: defaultPrice
          }
          ticketsToAdd.push(runDownTicket)
        }
      }
    })
    
    // เพิ่มตั๋วทั้งหมดลงในรายการหวย
    if (ticketsToAdd.length > 0) {
      setTickets(prev => [...prev, ...ticketsToAdd])
    }

    // ล้างเลขหลังเพิ่มรายการ
    setCurrentNumber('')
    toast.success(`เพิ่มรายการ ${currentNumber} แล้ว`)
  }

  // ฟังก์ชันแก้ไขราคาในตาราง
  const updateTicketPrice = (ticketId, field, value) => {
    setTickets(prev => prev.map(ticket => {
      if (ticket.id === ticketId) {
        const updatedTicket = { ...ticket, [field]: parseFloat(value) || 0 }
        // คำนวณยอดรวมใหม่
        updatedTicket.total_amount = updatedTicket.price
        if (ticket.lotto_type === '3toad' && updatedTicket.price_toad > 0) {
          updatedTicket.total_amount += updatedTicket.price_toad
        }
        return updatedTicket
      }
      return ticket
    }))
  }

  // ฟังก์ชันจัดกลุ่มตั๋วตามประเภท
  const getTicketsByType = (lottoType) => {
    return tickets.filter(ticket => ticket.lotto_type === lottoType)
  }

  // ฟังก์ชันสร้างตารางสำหรับแต่ละประเภท
  const renderTicketTable = (lottoType, title, bgColor = 'bg-blue-50') => {
    const typeTickets = getTicketsByType(lottoType)
    if (typeTickets.length === 0) return null

    return (
      <div className="card mb-4">
        <div className={`card-header ${bgColor}`}>
          <h4 className="text-md font-semibold text-gray-900">{title}</h4>
          <span className="text-sm text-gray-600">({typeTickets.length} รายการ)</span>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>เลข</th>
                  <th>ราคา</th>
                  <th>ยอดรวม</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {typeTickets.map((ticket, index) => (
                  <tr key={ticket.id}>
                    <td>{index + 1}</td>
                    <td className="font-mono font-bold text-lg">
                      {ticket.lotto_number}
                      {isHalfPriceNumber(ticket.lotto_number, ticket.lotto_type) && (
                        <span className="text-xs text-red-500 ml-1">จ่ายครึ่ง</span>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={ticket.price}
                        onChange={(e) => updateTicketPrice(ticket.id, 'price', e.target.value)}
                        className="w-20 p-2 text-sm border border-gray-300 rounded focus:border-blue-500 text-center"
                      />
                    </td>
                    <td className="font-semibold text-green-600">{formatCurrency(ticket.total_amount)}</td>
                    <td>
                      <button
                        onClick={() => removeTicket(ticket.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }



  // ฟังก์ชันสร้างปุ่มประเภทการแทง
  const renderBetTypeButtons = () => {
    if (selectedNumberType === '2digit') {
      return [
        { value: 'straight', label: '2 ตัวบน', color: 'bg-green-500' },
        { value: 'reverse', label: '2 ตัวล่าง', color: 'bg-green-500' },
        { value: 'both', label: '2 ตัวกลับ', color: 'bg-green-500' }
      ]
    } else if (selectedNumberType === '3digit') {
      return [
        { value: 'straight', label: '3 ตัวตรง', color: 'bg-green-500' },
        { value: 'toad', label: '3 ตัวโต๊ด', color: 'bg-green-500' },
        { value: 'reverse', label: '3 ตัวกลับ', color: 'bg-green-500' }
      ]
    } else if (selectedNumberType === 'running') {
      return [
        { value: 'straight', label: 'วิ่งบน', color: 'bg-green-500' },
        { value: 'reverse', label: 'วิ่งล่าง', color: 'bg-green-500' }
      ]
    }
    return []
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">บันทึกหวย</h1>
          <p className="text-gray-600">เพิ่มรายการหวยและบันทึกเป็นบิล</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-medium ${systemStatus?.is_open ? 'text-green-600' : 'text-red-600'}`}>
            สถานะ: {systemStatus?.is_open ? 'เปิดรับแทง' : 'ปิดรับแทง'}
          </p>
          <p className="text-xs text-gray-500">
            งวด: {systemStatus?.current_period}
          </p>
        </div>
      </div>

      {/* System status alert */}
      {!systemStatus?.is_open && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600">
              <p className="font-medium">ระบบปิดรับแทงหวย</p>
              <p className="text-sm">ไม่สามารถบันทึกหวยได้ในขณะนี้</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ฟอร์มใหม่ - แสดงเฉพาะเมื่อระบบเปิดรับแทง */}
        {systemStatus?.is_open && (
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">ฟอร์มบันทึกหวยใหม่</h3>
              </div>
              <div className="card-body">
              {/* ชื่อผู้ซื้อ */}
              <div className="mb-6">
                <label className="block text-base md:text-lg font-semibold text-gray-700 mb-2 md:mb-3">ชื่อผู้ซื้อ</label>
                <input
                  type="text"
                  className={`w-full p-4 md:p-6 text-lg md:text-xl border-2 rounded-xl ${errors.buyer_name ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="ชื่อผู้ซื้อ"
                  {...register('buyer_name', {
                    required: 'กรุณากรอกชื่อผู้ซื้อ'
                  })}
                />
                {errors.buyer_name && (
                  <p className="form-error">{errors.buyer_name.message}</p>
                )}
              </div>

              {/* Checkbox เลือกประเภทเลข */}
              <div className="mb-6">
                <label className="block text-base md:text-lg font-semibold text-gray-700 mb-3">เลือกประเภทการแทง</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { value: '2digit', label: '2 ตัว', emoji: '🔢', color: 'text-blue-600', bgColor: 'bg-blue-50' },
                    { value: '3digit', label: '3 ตัว', emoji: '🎯', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
                    { value: 'running', label: 'เลขวิ่ง', emoji: '🏃‍♂️', color: 'text-green-600', bgColor: 'bg-green-50' }
                  ].map((type) => (
                    <label
                      key={type.value}
                      className={`relative cursor-pointer rounded-lg p-4 transition-all border-2 ${
                        selectedNumberType === type.value
                          ? `bg-white border-blue-500 shadow-md ${type.color}`
                          : `${type.bgColor} border-gray-200 hover:border-gray-300 ${type.color}`
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">
                          {selectedNumberType === type.value ? '✅' : type.emoji}
                        </div>
                        <input
                          type="radio"
                          value={type.value}
                          className="sr-only"
                          checked={selectedNumberType === type.value}
                          onChange={(e) => setSelectedNumberType(e.target.value)}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold">{type.label}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* ปุ่มประเภทการแทง */}
              <div className="mb-6">
                <label className="block text-base md:text-lg font-semibold text-gray-700 mb-3">เลือกประเภทการแทง</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {renderBetTypeButtons().map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      className={`relative rounded-lg p-4 transition-all border-2 ${
                        selectedBetTypes.includes(type.value)
                          ? `bg-white border-blue-500 shadow-md text-blue-600`
                          : `${type.color} border-gray-200 hover:border-gray-300 text-white`
                      }`}
                      onClick={() => handleBetTypeSelection(selectedNumberType, type.value)}
                    >
                      <div className="text-sm font-semibold">
                        {/* เพิ่มอิโมจินำหน้าเมนูเลือกประเภทการแทง */}
                        {selectedBetTypes.includes(type.value) ? '✅ ' : '⚪ '}
                        {type.label}
                      </div>
                      <div className="text-xs opacity-75">อัตรา {getPayoutRate()}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Keypad และ Input Fields */}
              <div className="bg-blue-100 border-2 border-blue-300 rounded-xl p-6">
                {/* แสดงชื่อรายการที่เลือก */}
                <div className="mb-4 text-center">
                  <div className="bg-white rounded-lg p-3 border-2 border-blue-300 relative">
                    <span className="text-sm font-medium text-gray-600">รายการที่เลือก:</span>
                    {/* เพิ่ม span สำหรับรายการที่เลือก */}
                    <span className="ml-2 text-lg font-bold text-blue-600">
                      {getSelectedBetTypeNames() || <span className="text-gray-400">กรุณาเลือกประเภทการแทง</span>}
                    </span>
                  </div>
                </div>

                {/* Input Fields Display */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เลขหวย (
                    {selectedNumberType === 'running' ? '1 หลัก' : 
                     selectedNumberType === '2digit' ? '2 หลัก' : '3 หลัก'}
                    )
                  </label>
                  {renderInputFields()}
                  {currentNumber && (
                    <div className="mt-2 text-center">
                      <span className="text-lg font-bold text-blue-600">
                        เลขที่กรอก: {currentNumber}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mobile Keypad */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumberInput(num)}
                      className="keypad-btn h-16 md:h-12 text-2xl md:text-xl font-bold bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-colors"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearCurrentNumber}
                    className="keypad-btn h-16 md:h-12 text-lg md:text-base font-semibold bg-red-500 text-white border-2 border-red-600 rounded-lg hover:bg-red-600 active:bg-red-700 transition-colors"
                  >
                    ลบ
                  </button>
                  <button
                    key={0}
                    type="button"
                    onClick={() => handleNumberInput(0)}
                    className="keypad-btn h-16 md:h-12 text-2xl md:text-xl font-bold bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-colors"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="keypad-btn h-16 md:h-12 text-lg md:text-base font-semibold bg-yellow-500 text-white border-2 border-yellow-600 rounded-lg hover:bg-yellow-600 active:bg-yellow-700 transition-colors"
                  >
                    ←
                  </button>
                </div>
              </div>

              {/* ปุ่มเพิ่มรายการ */}
              <button
                onClick={addTicketFromForm}
                disabled={!systemStatus?.is_open || !isNumberComplete(currentNumber) || selectedBetTypes.length === 0}
                className="btn-primary w-full py-4 md:py-3 text-lg md:text-base font-semibold mt-4"
              >
                <Plus className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                เพิ่มรายการ
              </button>

            </div>
          </div>
        </div>
        )}

        {/* Summary - แสดงตลอดเวลา */}
        <div className={systemStatus?.is_open ? "space-y-6" : "lg:col-span-3 space-y-6"}>
          {/* Stats */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">สรุป</h3>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">จำนวนรายการ:</span>
                <span className="font-semibold">{tickets.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">จำนวนตั๋ว:</span>
                <span className="font-semibold">{getTotalTickets()}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-900 font-medium">ยอดรวม:</span>
                <span className="text-lg font-bold text-primary-600">
                  {formatCurrency(getTotalAmount())}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* รายการหวยแยกตามประเภท */}
      {tickets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">รายการหวย</h3>
            <div className="text-sm text-gray-600">
              รวม {tickets.length} รายการ | ยอดรวม {formatCurrency(getTotalAmount())}
            </div>
          </div>
          
          {/* ตาราง 2 ตัวบน */}
          {renderTicketTable('2up', '2 ตัวบน', 'bg-blue-50')}
          
          {/* ตาราง 2 ตัวล่าง */}
          {renderTicketTable('2down', '2 ตัวล่าง', 'bg-green-50')}
          
          {/* ตาราง 3 ตัวตรง */}
          {renderTicketTable('3up', '3 ตัวตรง', 'bg-yellow-50')}
          
          {/* ตาราง 3 ตัวโต๊ด */}
          {renderTicketTable('3toad', '3 ตัวโต๊ด', 'bg-purple-50')}
          
          {/* ตารางวิ่งบน */}
          {renderTicketTable('runup', 'วิ่งบน', 'bg-orange-50')}
          
          {/* ตารางวิ่งล่าง */}
          {renderTicketTable('rundown', 'วิ่งล่าง', 'bg-red-50')}
          
          {/* การควบคุมราคาและปุ่มจัดการ - Mobile Optimized */}
          <div className="space-y-4">
            {/* การควบคุมราคากลาง */}
            <div className="card">
              <div className="card-header">
                <h4 className="text-lg font-semibold text-gray-900">ควบคุมราคา</h4>
                <p className="text-sm text-gray-600">กำหนดราคาสำหรับทุกรายการ</p>
              </div>
              <div className="card-body space-y-4">
                {/* ปุ่มราคาด่วน */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ราคาด่วน</label>
                  <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                    {[5, 10, 20, 30, 50, 100, 500].map((price) => (
                      <button
                        key={price}
                        type="button"
                        onClick={() => handleGlobalPriceChange(price)}
                        className={`px-3 py-3 md:py-2 text-lg md:text-base rounded-lg border-2 font-semibold transition-all ${
                          globalPrice === price
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {price}B
                      </button>
                    ))}
                  </div>
                </div>

                {/* ควบคุมราคาด้วย + - */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ปรับราคา</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => adjustGlobalPrice(-5)}
                      className="w-12 h-12 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustGlobalPrice(-1)}
                      className="w-12 h-12 bg-red-400 text-white rounded-lg font-bold hover:bg-red-500 transition-colors"
                    >
                      -1
                    </button>
                    
                    <div className="flex-1">
                      <input
                        type="number"
                        value={globalPrice}
                        onChange={(e) => handleGlobalPriceChange(parseInt(e.target.value) || 1)}
                        className="w-full p-3 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        min="1"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => adjustGlobalPrice(1)}
                      className="w-12 h-12 bg-green-400 text-white rounded-lg font-bold hover:bg-green-500 transition-colors"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustGlobalPrice(5)}
                      className="w-12 h-12 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors"
                    >
                      +5
                    </button>
                  </div>
                </div>

                {/* ปุ่มอัปเดตราคาทุกรายการ */}
                <button
                  type="button"
                  onClick={updateAllTicketPrices}
                  disabled={tickets.length === 0}
                  className="w-full py-4 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500 transition-colors text-lg"
                >
                  อัปเดตราคาทุกรายการเป็น {globalPrice} บาท<br />
                  <span className="text-sm">({tickets.length} รายการ)</span>
                </button>
              </div>
            </div>

            {/* ปุ่มจัดการ */}
            {tickets.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={saveTickets}
                  disabled={loading || !systemStatus?.is_open}
                  className="btn-success w-full py-4 text-lg font-semibold"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="spinner mr-2"></div>
                      กำลังบันทึก...
                    </div>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      บันทึกบิล
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowPreviewReceipt(true)}
                  disabled={loading}
                  className="btn-secondary w-full py-4 text-lg font-semibold"
                >
                  <Receipt className="w-5 h-5 mr-2" />
                  ดูใบเสร็จ
                </button>

                <button
                  onClick={clearAll}
                  disabled={loading}
                  className="btn-outline w-full py-4 text-lg font-semibold"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  ล้างทั้งหมด
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Receipt Modal */}
      <ReceiptModal
        isOpen={showPreviewReceipt}
        onClose={() => setShowPreviewReceipt(false)}
        billData={generatePreviewReceiptData()}
        isPreview={true}
      />

      {/* Saved Receipt Modal */}
      <ReceiptModal
        isOpen={showSavedReceipt}
        onClose={() => setShowSavedReceipt(false)}
        billData={savedBillData}
        isPreview={false}
      />
    </div>
  )
}

export default TicketPage
