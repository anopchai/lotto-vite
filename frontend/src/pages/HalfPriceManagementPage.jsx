import { useState, useEffect } from 'react'
import { Calculator, Plus, Trash2, Save } from 'lucide-react'
import { halfPriceAPI, periodsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { formatDate } from '../utils/helpers'
import toast from 'react-hot-toast'

const HalfPriceManagementPage = () => {
  const { isAdmin } = useAuth()
  const [periods, setPeriods] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [halfPriceNumbers, setHalfPriceNumbers] = useState([])
  const [loading, setLoading] = useState(false)
  const [newNumbers, setNewNumbers] = useState({
    '2up': '',
    '2down': '',
    '3up': '',
    '3toad': ''
  })

  useEffect(() => {
    if (isAdmin()) {
      loadPeriods()
    }
  }, [])

  useEffect(() => {
    if (selectedPeriod) {
      loadHalfPriceNumbers()
    }
  }, [selectedPeriod])

  const loadPeriods = async () => {
    try {
      const response = await periodsAPI.getAll()
      setPeriods(response.data.data)
      
      // เลือกงวดปัจจุบันอัตโนมัติ
      const currentPeriod = response.data.data.find(p => p.status === 'current')
      if (currentPeriod) {
        setSelectedPeriod(currentPeriod.id.toString())
      }
    } catch (error) {
      // Error loading periods
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลงวด')
    }
  }

  const loadHalfPriceNumbers = async () => {
    try {
      setLoading(true)
      const response = await halfPriceAPI.getByPeriod(selectedPeriod)
      setHalfPriceNumbers(response.data.data)
    } catch (error) {
      // Error loading half price numbers
      setHalfPriceNumbers([])
    } finally {
      setLoading(false)
    }
  }

  const addNumbers = async (lottoType) => {
    const numbersText = newNumbers[lottoType].trim()
    if (!numbersText) {
      toast.error('กรุณากรอกเลข')
      return
    }

    if (!selectedPeriod) {
      toast.error('กรุณาเลือกงวด')
      return
    }

    // แยกเลขด้วย comma หรือ space
    const numbers = numbersText.split(/[,\s]+/).filter(n => n.trim())
    
    // ตรวจสอบรูปแบบเลข
    const validNumbers = []
    for (const number of numbers) {
      const trimmed = number.trim()
      if (lottoType === '2up' || lottoType === '2down') {
        if (!/^\d{2}$/.test(trimmed)) {
          toast.error(`เลข "${trimmed}" ไม่ถูกต้อง (ต้องเป็นเลข 2 หลัก)`)
          return
        }
      } else if (lottoType === '3up' || lottoType === '3toad') {
        if (!/^\d{3}$/.test(trimmed)) {
          toast.error(`เลข "${trimmed}" ไม่ถูกต้อง (ต้องเป็นเลข 3 หลัก)`)
          return
        }
      }
      validNumbers.push(trimmed)
    }

    try {
      setLoading(true)
      const response = await halfPriceAPI.add({
        period_id: parseInt(selectedPeriod),
        lotto_type: lottoType,
        numbers: validNumbers
      })

      if (response.data.success) {
        toast.success(`เพิ่มเลขจ่ายครึ่ง ${getTypeName(lottoType)} สำเร็จ`)
        setNewNumbers({ ...newNumbers, [lottoType]: '' })
        loadHalfPriceNumbers()
      }
    } catch (error) {
      // Error adding half price numbers
      toast.error('เกิดข้อผิดพลาดในการเพิ่มเลข')
    } finally {
      setLoading(false)
    }
  }

  const removeNumber = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบเลขนี้?')) {
      return
    }

    try {
      setLoading(true)
      const response = await halfPriceAPI.remove(id)
      if (response.data.success) {
        toast.success('ลบเลขสำเร็จ')
        loadHalfPriceNumbers()
      }
    } catch (error) {
      // Error removing half price number
      toast.error('เกิดข้อผิดพลาดในการลบเลข')
    } finally {
      setLoading(false)
    }
  }

  const getTypeName = (type) => {
    const names = {
      '2up': '2 ตัวบน',
      '2down': '2 ตัวล่าง',
      '3up': '3 ตัวตรง',
      '3toad': '3 ตัวตรงโต๊ด'
    }
    return names[type] || type
  }

  const groupedNumbers = halfPriceNumbers.reduce((acc, item) => {
    if (!acc[item.lotto_type]) {
      acc[item.lotto_type] = []
    }
    acc[item.lotto_type].push(item)
    return acc
  }, {})

  if (!isAdmin()) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการเลขจ่ายครึ่งราคา</h1>
          <p className="text-gray-600">กำหนดเลขที่จ่ายครึ่งราคาสำหรับแต่ละงวด</p>
        </div>
      </div>

      {/* Period Selection */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">เลือกงวด</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">งวดหวย</label>
              <select
                className="input"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="">เลือกงวด</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.period} ({formatDate(period.period_date)}) 
                    {period.status === 'current' && ' - ปัจจุบัน'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {selectedPeriod && (
        <>
          {/* Add Numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.keys(newNumbers).map((lottoType) => (
              <div key={lottoType} className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getTypeName(lottoType)}
                  </h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    <div>
                      <label className="label">เลขจ่ายครึ่ง</label>
                      <input
                        type="text"
                        className="input"
                        placeholder={`เช่น ${lottoType.includes('2') ? '01, 25, 99' : '123, 456, 789'}`}
                        value={newNumbers[lottoType]}
                        onChange={(e) => setNewNumbers({ 
                          ...newNumbers, 
                          [lottoType]: e.target.value 
                        })}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        คั่นด้วยเครื่องหมายจุลภาค (,) หรือช่องว่าง
                      </p>
                    </div>
                    <button
                      onClick={() => addNumbers(lottoType)}
                      className="btn-primary w-full"
                      disabled={loading}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      เพิ่มเลข
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Current Numbers */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">เลขจ่ายครึ่งปัจจุบัน</h3>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">กำลังโหลด...</p>
                </div>
              ) : Object.keys(groupedNumbers).length === 0 ? (
                <div className="text-center py-8">
                  <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">ยังไม่มีเลขจ่ายครึ่งในงวดนี้</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Object.keys(groupedNumbers).map((lottoType) => (
                    <div key={lottoType}>
                      <h4 className="font-semibold text-gray-900 mb-3">
                        {getTypeName(lottoType)}
                      </h4>
                      <div className="space-y-2">
                        {groupedNumbers[lottoType].map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                          >
                            <span className="font-mono font-bold text-lg">
                              {item.number}
                            </span>
                            <button
                              onClick={() => removeNumber(item.id)}
                              className="text-red-600 hover:text-red-800"
                              disabled={loading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default HalfPriceManagementPage
