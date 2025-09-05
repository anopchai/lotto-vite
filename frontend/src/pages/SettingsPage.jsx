import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Settings, Save, RotateCcw, Power, PowerOff, Calendar, Plus } from 'lucide-react'
import { settingsAPI, halfPriceAPI, periodAPI } from '../services/api'
import { formatCurrency, getLottoTypeName } from '../utils/helpers'
import { useSettings } from '../contexts/SettingsContext'
import toast from 'react-hot-toast'

const SettingsPage = () => {
  const { systemStatus, toggleSystemStatus } = useSettings()
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('payout')
  const [halfPriceNumbers, setHalfPriceNumbers] = useState([])
  const [newHalfPrice, setNewHalfPrice] = useState({
    category: '2digit',
    number: '',
    has_reverse: false
  })
  const [currentPeriod, setCurrentPeriod] = useState(null)
  const [openPeriod, setOpenPeriod] = useState(null)
  const [periods, setPeriods] = useState([])
  const [newPeriod, setNewPeriod] = useState({
    period_name: '',
    period_date: '',
    status: 'open'
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm()

  useEffect(() => {
    loadSettings()
    loadCurrentPeriod()
    loadOpenPeriod()
  }, [])

  useEffect(() => {
    if (activeTab === 'halfprice' && openPeriod) {
      loadHalfPriceNumbers()
    }
    if (activeTab === 'periods') {
      loadPeriods()
    }
  }, [activeTab, openPeriod])

  const loadSettings = async () => {
    try {
      const response = await settingsAPI.getAll()
      setSettings(response.data.data)
      
      // Set form values
      const formData = {}
      response.data.data.forEach(setting => {
        formData[setting.lotto_type] = setting.payout_rate
      })
      reset(formData)
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการโหลดการตั้งค่า')
    }
  }



  const saveSettings = async (data) => {
    setLoading(true)
    try {
      const settingsData = Object.keys(data).map(lottoType => ({
        lotto_type: lottoType,
        payout_rate: parseInt(data[lottoType])
      }))

      await settingsAPI.updateMultiple({ settings: settingsData })
      toast.success('บันทึกการตั้งค่าสำเร็จ')
      loadSettings()
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า')
    } finally {
      setLoading(false)
    }
  }

  const resetToDefault = async () => {
    if (!confirm('คุณต้องการรีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นหรือไม่?')) return

    setLoading(true)
    try {
      await settingsAPI.resetToDefault()
      toast.success('รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นสำเร็จ')
      loadSettings()
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการรีเซ็ตการตั้งค่า')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSystemStatus = async () => {
    const newStatus = !systemStatus.is_open
    const message = newStatus ? 'เปิดระบบรับแทงหวย' : 'ปิดระบบรับแทงหวย'

    if (!confirm(`คุณต้องการ${message}หรือไม่?`)) return

    try {
      const success = await toggleSystemStatus()
      if (success) {
        toast.success(`${message}สำเร็จ`)
      } else {
        toast.error(`เกิดข้อผิดพลาดในการ${message}`)
      }
    } catch (error) {
      toast.error(`เกิดข้อผิดพลาดในการ${message}`)
    }
  }

  const loadCurrentPeriod = async () => {
    try {
      const response = await periodAPI.getCurrentPeriod()
      setCurrentPeriod(response.data.data)
    } catch (error) {
      setCurrentPeriod(null)
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

      // ใช้ API เก่าก่อน (period name)
      const response = await halfPriceAPI.getByPeriodName(openPeriod.period_name)
      setHalfPriceNumbers(response.data.data || [])
    } catch (error) {
      setHalfPriceNumbers([])
    }
  }

  const addHalfPriceNumber = async () => {
    try {
      if (!newHalfPrice.number.trim()) {
        toast.error('กรุณากรอกเลข')
        return
      }

      if (!openPeriod?.period_name) {
        toast.error('ไม่พบงวดที่เปิดรับแทง กรุณาเปิดรับแทงงวดก่อน')
        return
      }

      // ตรวจสอบความยาวของเลข
      const expectedLength = newHalfPrice.category === '2digit' ? 2 : 3
      if (newHalfPrice.number.length !== expectedLength) {
        toast.error(`กรุณากรอกเลข ${expectedLength} หลัก`)
        return
      }

      setLoading(true)

      // สร้างรายการเลขที่จะบันทึก
      let numbersToAdd = [newHalfPrice.number]

      if (newHalfPrice.has_reverse) {
        if (newHalfPrice.category === '2digit') {
          // กลับเลข 2 ตัว: 25 -> [25, 52]
          const reversed = newHalfPrice.number.split('').reverse().join('')
          if (reversed !== newHalfPrice.number) {
            numbersToAdd.push(reversed)
          }
        } else {
          // กลับเลข 3 ตัว: 123 -> [123, 132, 213, 231, 312, 321]
          const generateReverseNumbers = (number) => {
            const digits = number.split('')
            const permutations = []

            // ฟังก์ชันสร้างการเรียงสับเปลี่ยน
            const permute = (arr) => {
              if (arr.length <= 1) {
                return [arr]
              }

              const result = []
              for (let i = 0; i < arr.length; i++) {
                const current = arr[i]
                const remaining = arr.slice(0, i).concat(arr.slice(i + 1))
                const perms = permute(remaining)

                for (const perm of perms) {
                  result.push([current, ...perm])
                }
              }
              return result
            }

            const allPermutations = permute(digits)
            const uniqueNumbers = [...new Set(allPermutations.map(perm => perm.join('')))]

            return uniqueNumbers
          }

          numbersToAdd = generateReverseNumbers(newHalfPrice.number)
        }
      }

      // ดึงเลขที่มีอยู่แล้วในหมวดหมู่นี้
      const existingNumbers = halfPriceNumbers
        .filter(item => item.category === newHalfPrice.category)
        .map(item => item.number)

      // เพิ่มเลขใหม่ที่ไม่ซ้ำ
      const newNumbers = numbersToAdd.filter(num => !existingNumbers.includes(num))

      if (newNumbers.length === 0) {
        toast.error('เลขนี้มีอยู่แล้ว')
        setLoading(false)
        return
      }

      // สร้างรายการเลขสำหรับส่งไป API
      const numbersForAPI = newNumbers.map(number => ({
        lotto_type: newHalfPrice.category === '2digit' ? '2up' : '3up', // ใช้เป็น placeholder
        number: number,
        has_reverse: newHalfPrice.has_reverse
      }))

      // ใช้ระบบเก่าก่อน (period name) เพื่อความเข้ากันได้
      const allNumbers = halfPriceNumbers.concat(numbersForAPI.map(item => ({
        lotto_type: item.lotto_type,
        number: item.number
      })))

      await halfPriceAPI.add({
        period: openPeriod.period_name,
        numbers: allNumbers
      })

      setNewHalfPrice({
        category: '2digit',
        number: '',
        has_reverse: false
      })
      loadHalfPriceNumbers()
      toast.success(`เพิ่มเลขจ่ายครึ่งราคาสำเร็จ (${newNumbers.length} เลข)`)
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเพิ่มเลขจ่ายครึ่งราคา')
    } finally {
      setLoading(false)
    }
  }

  const deleteHalfPriceNumber = async (numberToDelete, category) => {
    try {
      setLoading(true)

      // ลบเลขออกจากรายการ (ใช้ระบบเก่า)
      const updatedNumbers = halfPriceNumbers
        .filter(item => item.number !== numberToDelete)
        .map(item => ({
          lotto_type: item.lotto_type,
          number: item.number
        }))

      if (updatedNumbers.length === 0) {
        // ถ้าไม่มีเลขเหลือ ให้ลบทั้งหมด
        await halfPriceAPI.deleteByPeriodName(openPeriod.period_name)
      } else {
        // อัปเดตรายการใหม่
        await halfPriceAPI.add({
          period: openPeriod.period_name,
          numbers: updatedNumbers
        })
      }

      loadHalfPriceNumbers()
      toast.success('ลบเลขจ่ายครึ่งราคาสำเร็จ')
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการลบเลขจ่ายครึ่งราคา')
    } finally {
      setLoading(false)
    }
  }

  const loadPeriods = async () => {
    try {
      const response = await periodAPI.getAllPeriods()
      setPeriods(response.data.data || [])
    } catch (error) {
      setPeriods([])
    }
  }

  const createPeriod = async () => {
    try {
      if (!newPeriod.period_name.trim() || !newPeriod.period_date) {
        toast.error('กรุณากรอกชื่องวดและวันที่')
        return
      }

      setLoading(true)

      await periodAPI.createPeriod(newPeriod)

      setNewPeriod({
        period_name: '',
        period_date: '',
        status: 'open'
      })

      loadPeriods()
      loadCurrentPeriod() // รีโหลดงวดปัจจุบัน
      loadOpenPeriod() // รีโหลดงวดที่เปิดรับแทง
      toast.success('สร้างงวดใหม่สำเร็จ')
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการสร้างงวด')
    } finally {
      setLoading(false)
    }
  }

  const setCurrentPeriodHandler = async (periodId) => {
    try {
      setLoading(true)

      await periodAPI.setCurrentPeriod(periodId)

      loadPeriods()
      loadCurrentPeriod()
      loadOpenPeriod()
      toast.success('เปลี่ยนงวดปัจจุบันสำเร็จ')
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนงวดปัจจุบัน')
    } finally {
      setLoading(false)
    }
  }

  const togglePeriodStatus = async (periodId) => {
    try {
      const period = periods.find(p => p.id === periodId)

      // ถ้าจะเปิดรับแทง ให้เตือนว่าจะปิดงวดอื่น
      if (period?.status === 'closed' && openPeriod) {
        const confirmMessage = `การเปิดรับแทงงวดนี้จะปิดรับแทงงวด "${openPeriod.period_name}" อัตโนมัติ\n\nคุณแน่ใจหรือไม่?`
        if (!confirm(confirmMessage)) {
          return
        }
      }

      setLoading(true)

      await periodAPI.togglePeriodStatus(periodId)

      loadPeriods()
      loadCurrentPeriod()
      loadOpenPeriod()

      if (period?.status === 'closed') {
        toast.success('เปิดรับแทงงวดสำเร็จ (งวดอื่นถูกปิดอัตโนมัติ)')
      } else {
        toast.success('ปิดรับแทงงวดสำเร็จ')
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนสถานะงวด')
    } finally {
      setLoading(false)
    }
  }

  // Format Data - รีเซ็ตระบบกลับไปเป็น 0 ยกเว้นอัตราจ่าย
  const formatData = async () => {
    if (!window.confirm('⚠️ คำเตือน: คุณกำลังจะ Format Data ระบบทั้งหมด!\n\nการกระทำนี้จะ:\n✅ ลบข้อมูลตั๋วหวยทั้งหมด\n✅ ลบผลรางวัลทั้งหมด\n✅ ลบข้อมูลงวดทั้งหมด\n✅ ลบเลขจ่ายครึ่งราคาทั้งหมด\n✅ ลบข้อมูลผู้ชนะทั้งหมด\n✅ ปิดระบบ (สถานะ = 0)\n\n❌ ไม่ลบการตั้งค่าอัตราจ่าย\n\nการกระทำนี้ไม่สามารถยกเลิกได้ คุณแน่ใจหรือไม่?')) {
      return
    }

    // ยืนยันอีกครั้ง
    if (!window.confirm('ยืนยันอีกครั้ง: คุณต้องการ Format Data ระบบทั้งหมดจริงหรือไม่?\n\nระบบจะกลับไปเป็นสถานะเริ่มต้น (0) พร้อมใช้งานใหม่')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/admin/format-data', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`)
      }

      const data = await response.json()
      if (data.success) {
        toast.success(`🎉 Format Data สำเร็จ!\n\n📊 ข้อมูลที่ลบ:\n• ตั๋วหวย: ${data.data.tickets_deleted} ใบ\n• ผลรางวัล: ${data.data.results_deleted} งวด\n• งวด: ${data.data.periods_deleted} งวด\n• เลขครึ่งราคา: ${data.data.half_price_deleted} เลข\n• ผู้ชนะ: ${data.data.winners_deleted} คน\n\n🔄 ระบบพร้อมใช้งานใหม่!`)

        // รีโหลดข้อมูลทั้งหมด
        loadSettings()
        loadCurrentPeriod()
        loadOpenPeriod()
        loadHalfPriceNumbers()
        loadPeriods()
      } else {
        toast.error(data.message || 'เกิดข้อผิดพลาดในการ Format Data')
      }
    } catch (error) {
      toast.error(`เกิดข้อผิดพลาดในการ Format Data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const deletePeriod = async (periodId) => {
    try {
      if (!confirm('คุณแน่ใจหรือไม่ที่จะลบงวดนี้?')) {
        return
      }

      setLoading(true)

      await periodAPI.deletePeriod(periodId)

      loadPeriods()
      loadCurrentPeriod()
      loadOpenPeriod()
      toast.success('ลบงวดสำเร็จ')
    } catch (error) {
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการลบงวด')
    } finally {
      setLoading(false)
    }
  }







  const tabs = [
    { id: 'payout', name: 'อัตราจ่าย', icon: Settings },
    { id: 'system', name: 'ระบบ', icon: Power },
    { id: 'periods', name: 'จัดการงวด', icon: Calendar },
    { id: 'halfprice', name: 'เลขจ่ายครึ่งราคา', icon: Settings }
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ตั้งค่า</h1>
          <p className="text-gray-600">จัดการการตั้งค่าระบบและอัตราจ่าย</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Payout Settings */}
      {activeTab === 'payout' && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">ตั้งค่าอัตราจ่าย</h3>
              <p className="text-sm text-gray-600">กำหนดอัตราจ่ายสำหรับแต่ละประเภทหวย</p>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit(saveSettings)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {settings.map((setting) => (
                    <div key={setting.lotto_type} className="space-y-2">
                      <label className="label">
                        {getLottoTypeName(setting.lotto_type)}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          className={`input ${errors[setting.lotto_type] ? 'input-error' : ''}`}
                          placeholder="อัตราจ่าย"
                          {...register(setting.lotto_type, {
                            required: 'กรุณากรอกอัตราจ่าย',
                            min: {
                              value: 1,
                              message: 'อัตราจ่ายต้องมากกว่า 0'
                            }
                          })}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">บาท</span>
                        </div>
                      </div>
                      {errors[setting.lotto_type] && (
                        <p className="form-error">{errors[setting.lotto_type].message}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        ตัวอย่าง: แทง 100 บาท ได้รางวัล {formatCurrency(100 * (setting.payout_rate || 0))}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="spinner mr-2"></div>
                        กำลังบันทึก...
                      </div>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        บันทึกการตั้งค่า
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={resetToDefault}
                    disabled={loading}
                    className="btn-outline"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    รีเซ็ตเป็นค่าเริ่มต้น
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Default rates info */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">อัตราจ่ายมาตรฐาน</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900">2 ตัวบน/ล่าง</h4>
                  <p className="text-2xl font-bold text-blue-600">70 บาท</p>
                  <p className="text-sm text-blue-600">แทง 100 ได้ 7,000</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900">3 ตัวตรง</h4>
                  <p className="text-2xl font-bold text-green-600">500 บาท</p>
                  <p className="text-sm text-green-600">แทง 100 ได้ 50,000</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900">3 ตัวตรงโต๊ด</h4>
                  <p className="text-2xl font-bold text-yellow-600">90 บาท</p>
                  <p className="text-sm text-yellow-600">แทง 100 ได้ 9,000</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900">วิ่งบน/ล่าง</h4>
                  <p className="text-2xl font-bold text-purple-600">3 บาท</p>
                  <p className="text-sm text-purple-600">แทง 100 ได้ 300</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Settings */}
      {activeTab === 'system' && systemStatus && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">สถานะระบบ</h3>
            </div>
            <div className="card-body">
              <div className="space-y-6">
                {/* System status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {systemStatus.is_open ? (
                      <Power className="w-8 h-8 text-green-600" />
                    ) : (
                      <PowerOff className="w-8 h-8 text-red-600" />
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">
                        สถานะการรับแทง: {systemStatus.is_open ? 'เปิด' : 'ปิด'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {systemStatus.is_open
                          ? 'ระบบเปิดรับแทงหวยปกติ'
                          : 'ระบบปิดรับแทงหวยชั่วคราว'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleToggleSystemStatus}
                      className={`btn ${systemStatus.is_open ? 'btn-danger' : 'btn-success'}`}
                    >
                      {systemStatus.is_open ? (
                        <>
                          <PowerOff className="w-4 h-4 mr-2" />
                          ปิดระบบ
                        </>
                      ) : (
                        <>
                          <Power className="w-4 h-4 mr-2" />
                          เปิดระบบ
                        </>
                      )}
                    </button>

                    <button
                      onClick={formatData}
                      disabled={loading}
                      className="btn-outline text-red-600 border-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="รีเซ็ตระบบกลับไปเป็น 0 ยกเว้นอัตราจ่าย"
                    >
                      {loading ? (
                        <>
                          <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                          กำลัง Format...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Format Data
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* งวดที่เปิดรับแทง */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    งวดที่เปิดรับแทง
                  </h4>
                  {openPeriod ? (
                    <div className="space-y-2">
                      <p className="text-lg font-bold text-blue-700">
                        {openPeriod.period_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        วันที่: {new Date(openPeriod.period_date).toLocaleDateString('th-TH')}
                      </p>
                      <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                        เปิดรับแทง
                      </span>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600 mb-2">ไม่มีงวดที่เปิดรับแทง</p>
                      <p className="text-xs text-red-600">กรุณาไปที่หน้า "จัดการงวด" เพื่อเปิดรับแทงงวด</p>
                    </div>
                  )}
                </div>

              
              </div>
            </div>
          </div>

          {/* System info */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">ข้อมูลระบบ</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">ประเภทหวยที่รองรับ</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span className="text-blue-900">2 ตัวบน</span>
                      <span className="badge-primary">ใช้งาน</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-green-900">2 ตัวล่าง</span>
                      <span className="badge-primary">ใช้งาน</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <span className="text-yellow-900">3 ตัวตรง</span>
                      <span className="badge-primary">ใช้งาน</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <span className="text-red-900">3 ตัวตรงโต๊ด</span>
                      <span className="badge-primary">ใช้งาน</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <span className="text-purple-900">วิ่งบน</span>
                      <span className="badge-primary">ใช้งาน</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-indigo-50 rounded">
                      <span className="text-indigo-900">วิ่งล่าง</span>
                      <span className="badge-primary">ใช้งาน</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">ฟีเจอร์พิเศษ</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>ระบบกลับเลข</span>
                      <span className="badge-success">เปิดใช้งาน</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>ตรวจสอบผู้ชนะอัตโนมัติ</span>
                      <span className="badge-success">เปิดใช้งาน</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>รายงานแบบเรียลไทม์</span>
                      <span className="badge-success">เปิดใช้งาน</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>ระบบตัวแทนจำหน่าย</span>
                      <span className="badge-success">เปิดใช้งาน</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


        </div>
      )}

      {/* Periods Management Tab */}
      {activeTab === 'periods' && (
        <div className="space-y-6">
          {/* Create new period */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">สร้างงวดใหม่</h3>
              <p className="text-sm text-gray-600">งวดปัจจุบัน: {currentPeriod?.period_name || 'ไม่มี'}</p>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">ชื่องวด</label>
                    <input
                      type="text"
                      value={newPeriod.period_name}
                      onChange={(e) => setNewPeriod(prev => ({ ...prev, period_name: e.target.value }))}
                      className="input"
                      placeholder="เช่น งวด01/01/2568"
                    />
                  </div>
                  <div>
                    <label className="label">วันที่งวด</label>
                    <input
                      type="date"
                      value={newPeriod.period_date}
                      onChange={(e) => setNewPeriod(prev => ({ ...prev, period_date: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">สถานะ</label>
                    <select
                      value={newPeriod.status}
                      onChange={(e) => setNewPeriod(prev => ({ ...prev, status: e.target.value }))}
                      className="input"
                    >
                      <option value="open">เปิดรับแทง</option>
                      <option value="closed">ปิดรับแทง</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={createPeriod}
                    disabled={loading || !newPeriod.period_name.trim() || !newPeriod.period_date}
                    className="btn-primary"
                  >
                    สร้างงวด
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Periods list */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">รายการงวดทั้งหมด</h3>
            </div>
            <div className="card-body">
              {periods.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  ยังไม่มีงวด
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ชื่องวด
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          วันที่
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          สถานะ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          งวดปัจจุบัน
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          การจัดการ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {periods.map((period) => (
                        <tr key={period.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {period.period_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(period.period_date).toLocaleDateString('th-TH')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              period.status === 'open'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {period.status === 'open' ? 'เปิดรับแทง' : 'ปิดรับแทง'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {period.is_current ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                งวดปัจจุบัน
                              </span>
                            ) : (
                              <button
                                onClick={() => setCurrentPeriodHandler(period.id)}
                                disabled={loading}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                ตั้งเป็นงวดปัจจุบัน
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button
                              onClick={() => togglePeriodStatus(period.id)}
                              disabled={loading}
                              className={`${
                                period.status === 'open'
                                  ? 'text-red-600 hover:text-red-800'
                                  : 'text-green-600 hover:text-green-800'
                              }`}
                            >
                              {period.status === 'open' ? 'ปิดรับแทง' : 'เปิดรับแทง'}
                            </button>
                            {!period.is_current && (
                              <button
                                onClick={() => deletePeriod(period.id)}
                                disabled={loading}
                                className="text-red-600 hover:text-red-800"
                              >
                                ลบ
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Half Price Numbers Tab */}
      {activeTab === 'halfprice' && (
        <div className="space-y-6">
          {/* Add new half price number */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">เพิ่มเลขจ่ายครึ่งราคา</h3>
              <p className="text-sm text-gray-600">
                งวดที่เปิดรับแทง: {openPeriod?.period_name || 'ไม่มีงวดที่เปิดรับแทง'}
              </p>
              {!openPeriod && (
                <p className="text-xs text-red-600 mt-1">
                  กรุณาไปหน้า "จัดการงวด" เพื่อเปิดรับแทงงวดก่อน
                </p>
              )}
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">ประเภทหวย</label>
                    <select
                      value={newHalfPrice.category}
                      onChange={(e) => setNewHalfPrice(prev => ({
                        ...prev,
                        category: e.target.value,
                        number: '',
                        has_reverse: false
                      }))}
                      className="input"
                    >
                      <option value="2digit">เลข 2 ตัว</option>
                      <option value="3digit">เลข 3 ตัว</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">เลข</label>
                    <input
                      type="text"
                      value={newHalfPrice.number}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '') // เฉพาะตัวเลข
                        setNewHalfPrice(prev => ({ ...prev, number: value }))
                      }}
                      className="input"
                      placeholder={newHalfPrice.category === '2digit' ? 'เช่น 25' : 'เช่น 123'}
                      maxLength={newHalfPrice.category === '2digit' ? 2 : 3}
                    />
                  </div>
                </div>

                {/* Checkbox กลับเลข */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="has_reverse"
                    checked={newHalfPrice.has_reverse}
                    onChange={(e) => setNewHalfPrice(prev => ({ ...prev, has_reverse: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="has_reverse" className="text-sm font-medium text-gray-700">
                    {newHalfPrice.category === '2digit'
                      ? 'กลับเลขด้วยไหม (เช่น 25 → 25, 52)'
                      : '6 กลับด้วยไหม (เช่น 123 → 123, 132, 213, 231, 312, 321)'
                    }
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={addHalfPriceNumber}
                    disabled={loading || !newHalfPrice.number.trim() || !openPeriod}
                    className="btn-primary"
                  >
                    เพิ่มเลข
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Half price numbers list */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">รายการเลขจ่ายครึ่งราคา</h3>
            </div>
            <div className="card-body">
              {halfPriceNumbers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  ยังไม่มีเลขจ่ายครึ่งราคา
                </div>
              ) : (
                <div className="space-y-6">
                  {/* เลข 2 ตัว */}
                  {(() => {
                    const twoDigitNumbers = halfPriceNumbers.filter(item =>
                      ['2up', '2down'].includes(item.lotto_type) || item.number?.length === 2
                    )
                    if (twoDigitNumbers.length === 0) return null

                    return (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mr-2">
                            เลข 2 ตัว
                          </span>
                          <span className="text-sm text-gray-600">
                            (ใช้ได้ทั้ง 2 ตัวบน และ 2 ตัวล่าง)
                          </span>
                        </h4>
                        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">
                          {twoDigitNumbers.map((item, index) => (
                            <div key={index} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded p-2">
                              <span className="font-mono font-bold text-blue-700">{item.number}</span>
                              <button
                                onClick={() => deleteHalfPriceNumber(item.number, '2digit')}
                                disabled={loading}
                                className="text-red-600 hover:text-red-800 ml-2"
                                title="ลบ"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* เลข 3 ตัว */}
                  {(() => {
                    const threeDigitNumbers = halfPriceNumbers.filter(item =>
                      ['3up', '3toad'].includes(item.lotto_type) || item.number?.length === 3
                    )
                    if (threeDigitNumbers.length === 0) return null

                    return (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm mr-2">
                            เลข 3 ตัว
                          </span>
                          <span className="text-sm text-gray-600">
                            (ใช้ได้ทั้ง 3 ตัวตรง และ 3 ตัวตรงโต๊ด)
                          </span>
                        </h4>
                        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">
                          {threeDigitNumbers.map((item, index) => (
                            <div key={index} className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-2">
                              <span className="font-mono font-bold text-green-700">{item.number}</span>
                              <button
                                onClick={() => deleteHalfPriceNumber(item.number, '3digit')}
                                disabled={loading}
                                className="text-red-600 hover:text-red-800 ml-2"
                                title="ลบ"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage
