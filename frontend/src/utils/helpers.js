import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'

// แปลงชื่อประเภทหวย
export const getLottoTypeName = (type) => {
  const names = {
    '2up': '2 ตัวบน',
    '2down': '2 ตัวล่าง',
    '3up': '3 ตัวตรง',
    '3toad': '3 ตัวโต๊ด',
    '3straight_toad': 'ตรงโต๊ด',
    'runup': 'วิ่งบน',
    'rundown': 'วิ่งล่าง'
  }
  return names[type] || type
}

// ตรวจสอบรูปแบบเลขหวย
export const validateLottoNumber = (number, type) => {
  if (type === '2up' || type === '2down' || type === '2updown') {
    return /^\d{2}$/.test(number)
  } else if (type === '3up' || type === '3toad' || type === '3straight_toad') {
    return /^\d{3}$/.test(number)
  } else if (type === 'runup' || type === 'rundown') {
    return /^\d{1}$/.test(number)
  }
  return false
}

// สร้างเลขกลับสำหรับแสดงผล
export const generateReverseNumbers = (number, lottoType) => {
  if (lottoType === '2up' || lottoType === '2down') {
    if (number.length === 2) {
      const reversed = number.split('').reverse().join('')
      // สำหรับ 2 ตัวกลับ คืนเฉพาะเลขกลับ (เช่น 25 → 52)
      return [reversed]
    }
  } else if (lottoType === '3up') {
    // 3 ตัวกลับ - สลับตำแหน่งทั้งหมด (ทุกการเรียงสับเปลี่ยน)
    if (number.length === 3) {
      const chars = number.split('')
      const permutations = [
        chars[0] + chars[1] + chars[2], // 123
        chars[0] + chars[2] + chars[1], // 132
        chars[1] + chars[0] + chars[2], // 213
        chars[1] + chars[2] + chars[0], // 231
        chars[2] + chars[0] + chars[1], // 312
        chars[2] + chars[1] + chars[0]  // 321
      ]
      return [...new Set(permutations)] // ลบเลขซ้ำออก
    }
  } else if (lottoType === '3toad') {
    // 3 ตัวโต๊ด - ไม่มีการกลับเลข
    return [number]
  }

  return [number]
}

// จัดรูปแบบเงิน
export const formatCurrency = (amount) => {
  // แปลงเป็น number ก่อน (กรณีที่ได้ string จาก database)
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0)
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount)
}

// จัดรูปแบบเงินสำหรับใบเสร็จ (ไม่มี ฿)
export const formatReceiptAmount = (amount) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0)
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount)
}

// จัดรูปแบบตัวเลข
export const formatNumber = (number) => {
  return new Intl.NumberFormat('th-TH').format(number || 0)
}

// จัดรูปแบบวันที่
export const formatDate = (date, formatStr = 'dd/MM/yyyy') => {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatStr, { locale: th })
  } catch (error) {
    // Date formatting error
    return ''
  }
}

// จัดรูปแบบวันที่และเวลา
export const formatDateTime = (date, formatStr = 'dd/MM/yyyy HH:mm') => {
  return formatDate(date, formatStr)
}

// แปลงสถานะเป็นสี
export const getStatusColor = (status) => {
  const colors = {
    'active': 'success',
    'inactive': 'danger',
    'pending': 'warning',
    'announced': 'success',
    'open': 'success',
    'closed': 'danger'
  }
  return colors[status] || 'gray'
}

// แปลงสถานะเป็นข้อความ
export const getStatusText = (status) => {
  const texts = {
    'active': 'ใช้งาน',
    'inactive': 'ไม่ใช้งาน',
    'pending': 'รอประกาศ',
    'announced': 'ประกาศแล้ว',
    'open': 'เปิดรับแทง',
    'closed': 'ปิดรับแทง'
  }
  return texts[status] || status
}

// สร้าง Bill ID
export const generateBillId = () => {
  const now = new Date()
  const timestamp = now.getTime()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `BILL${timestamp}${random}`
}

// ตรวจสอบว่าเป็นเลขหวยที่ถูกต้องหรือไม่
export const isValidLottoNumber = (number, type) => {
  if (!number || !type) return false
  
  const trimmedNumber = number.trim()
  
  switch (type) {
    case '2up':
    case '2down':
      return /^\d{2}$/.test(trimmedNumber)
    case '3up':
    case '3toad':
      return /^\d{3}$/.test(trimmedNumber)
    case 'runup':
    case 'rundown':
      return /^\d{1}$/.test(trimmedNumber)
    default:
      return false
  }
}

// คำนวณจำนวนเลขที่จะได้จากการกลับเลข
export const calculateReverseCount = (number, type, reverseEnabled) => {
  if (!reverseEnabled) return 1
  
  if (type === '2up' || type === '2down') {
    if (number.length === 2) {
      const reversed = number.split('').reverse().join('')
      return reversed !== number ? 2 : 1
    }
  } else if (type === '3toad') {
    if (number.length === 3) {
      const chars = number.split('')
      const permutations = [
        chars[0] + chars[1] + chars[2],
        chars[0] + chars[2] + chars[1],
        chars[1] + chars[0] + chars[2],
        chars[1] + chars[2] + chars[0],
        chars[2] + chars[0] + chars[1],
        chars[2] + chars[1] + chars[0]
      ]
      return new Set(permutations).size
    }
  }
  
  return 1
}

// ตรวจสอบว่าเป็นชื่อผู้ซื้อที่ถูกต้องหรือไม่
export const isValidBuyerName = (name) => {
  return /^[A-Za-z0-9]{3}$/.test(name)
}

// แปลงข้อผิดพลาดเป็นข้อความ
export const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  
  if (error.message) {
    return error.message
  }
  
  return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
}

// สร้างตัวเลือกสำหรับ Select
export const createSelectOptions = (items, valueKey = 'value', labelKey = 'label') => {
  return items.map(item => ({
    value: item[valueKey],
    label: item[labelKey]
  }))
}

// ตรวจสอบว่าเป็นอีเมลที่ถูกต้องหรือไม่
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// ตรวจสอบว่าเป็นเบอร์โทรที่ถูกต้องหรือไม่
export const isValidPhone = (phone) => {
  const phoneRegex = /^[0-9]{9,10}$/
  return phoneRegex.test(phone.replace(/[-\s]/g, ''))
}

// สร้างสีแบบสุ่ม
export const generateRandomColor = () => {
  const colors = [
    'bg-red-100 text-red-800',
    'bg-yellow-100 text-yellow-800',
    'bg-green-100 text-green-800',
    'bg-blue-100 text-blue-800',
    'bg-indigo-100 text-indigo-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// ดาวน์โหลดไฟล์
export const downloadFile = (data, filename, type = 'text/csv') => {
  const blob = new Blob([data], { type })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
