import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Save, ArrowLeft, Edit3 } from 'lucide-react'
import { ticketsAPI } from '../services/api'
import { getLottoTypeName, formatCurrency } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import toast from 'react-hot-toast'

const EditBillPage = () => {
  const { billId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { systemStatus } = useSettings()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [billData, setBillData] = useState(null)
  const [tickets, setTickets] = useState([])
  
  // Form states for adding new tickets
  const [selectedNumberType, setSelectedNumberType] = useState('2digit')
  const [selectedBetTypes, setSelectedBetTypes] = useState(['straight'])
  const [currentNumber, setCurrentNumber] = useState('')
  const [globalPrice, setGlobalPrice] = useState(50)

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors }
  } = useForm({
    defaultValues: {
      buyer_name: '',
    }
  })

  useEffect(() => {
    loadBillData()
  }, [billId])

  const loadBillData = async () => {
    try {
      setLoading(true)
      const response = await ticketsAPI.getBillById(billId)
      const data = response.data.data
      
      setBillData(data)
      setTickets(data.tickets || [])
      setValue('buyer_name', data.buyer_name || '')
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลบิล')
      navigate('/bills')
    } finally {
      setLoading(false)
    }
  }

  const handleBetTypeSelection = (numberType, betType) => {
    if (selectedNumberType !== numberType) {
      setSelectedNumberType(numberType)
      setSelectedBetTypes([betType])
      return
    }

    setSelectedBetTypes(prev => {
      if (prev.includes(betType)) {
        const newSelection = prev.filter(type => type !== betType)
        return newSelection.length > 0 ? newSelection : [betType]
      } else {
        return [...prev, betType]
      }
    })
  }

  const handleNumberInput = (num) => {
    const maxLength = selectedNumberType === 'running' ? 1 : selectedNumberType === '2digit' ? 2 : 3
    
    if (currentNumber.length < maxLength) {
      setCurrentNumber(prev => prev + num.toString())
    }
  }

  const handleBackspace = () => {
    setCurrentNumber(prev => prev.slice(0, -1))
  }

  const clearCurrentNumber = () => {
    setCurrentNumber('')
  }

  const isNumberComplete = (numberString) => {
    const requiredLength = selectedNumberType === 'running' ? 1 : selectedNumberType === '2digit' ? 2 : 3
    return numberString && numberString.trim().length === requiredLength && /^\d+$/.test(numberString.trim())
  }

  const addNewTicket = () => {
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

    if (!isNumberComplete(currentNumber)) {
      toast.error('กรุณากรอกเลขให้ครบ')
      return
    }

    const ticketsToAdd = []
    
    selectedBetTypes.forEach(betType => {
      let lottoType = ''
      
      if (selectedNumberType === '2digit') {
        if (betType === 'straight') lottoType = '2up'
        else if (betType === 'reverse') lottoType = '2down'
        else if (betType === 'both') lottoType = '2updown'
      } else if (selectedNumberType === '3digit') {
        if (betType === 'straight') lottoType = '3up'
        else if (betType === 'toad') lottoType = '3toad'
      } else if (selectedNumberType === 'running') {
        if (betType === 'straight') lottoType = 'runup'
        else if (betType === 'reverse') lottoType = 'rundown'
      }

      const newTicket = {
        id: Date.now() + Math.random(),
        ticket_id: `temp_${Date.now()}_${Math.random()}`,
        lotto_number: currentNumber,
        lotto_type: lottoType,
        price: globalPrice,
        is_new: true // Mark as new ticket
      }
      
      ticketsToAdd.push(newTicket)
    })

    setTickets(prev => [...prev, ...ticketsToAdd])
    setCurrentNumber('')
    toast.success(`เพิ่มรายการ ${currentNumber} แล้ว`)
  }

  const removeTicket = (ticketId) => {
    setTickets(prev => prev.filter(ticket => 
      ticket.ticket_id !== ticketId && ticket.id !== ticketId
    ))
    toast.success('ลบรายการแล้ว')
  }

  const updateTicketPrice = (ticketId, field, value) => {
    setTickets(prev => prev.map(ticket => {
      if (ticket.ticket_id === ticketId || ticket.id === ticketId) {
        return { ...ticket, [field]: parseFloat(value) || 0 }
      }
      return ticket
    }))
  }

  const getTotalAmount = () => {
    return tickets.reduce((sum, ticket) => sum + parseFloat(ticket.price || 0), 0)
  }

  const saveBill = async (data) => {
    if (tickets.length === 0) {
      toast.error('กรุณาเพิ่มรายการหวยอย่างน้อย 1 รายการ')
      return
    }

    try {
      setSaving(true)
      
      const updateData = {
        buyer_name: data.buyer_name.trim(),
        tickets: tickets.map(ticket => ({
          ticket_id: ticket.ticket_id,
          lotto_number: ticket.lotto_number,
          lotto_type: ticket.lotto_type,
          price: parseFloat(ticket.price),
          is_new: ticket.is_new || false
        })),
        total_amount: getTotalAmount()
      }

      await ticketsAPI.updateBill(billId, updateData)
      toast.success('อัปเดตบิลสำเร็จ')
      navigate(`/bills?highlight=${billId}`)
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการอัปเดตบิล')
    } finally {
      setSaving(false)
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  if (!billData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">ไม่พบข้อมูลบิล</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(saveBill)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => navigate('/bills')}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">แก้ไขบิล</h1>
            <p className="text-gray-600">รหัสบิล: {billData.bill_id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">แก้ไขข้อมูลบิล</h3>
            </div>
            <div className="card-body">
              {/* Buyer Name */}
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

              {/* Number Type Selection */}
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

              {/* Bet Type Buttons */}
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
                      <div className="text-sm font-semibold">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Keypad Section */}
              <div className="bg-blue-100 border-2 border-blue-300 rounded-xl p-6">
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

                {/* Price Control */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">ราคา</label>
                  <div className="grid grid-cols-3 md:grid-cols-7 gap-2 mb-3">
                    {[5, 10, 20, 30, 50, 100, 500].map((price) => (
                      <button
                        key={price}
                        type="button"
                        onClick={() => setGlobalPrice(price)}
                        className={`px-3 py-2 rounded-lg border-2 font-semibold transition-all ${
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

                {/* Add Button */}
                <button
                  type="button"
                  onClick={addNewTicket}
                  disabled={!isNumberComplete(currentNumber) || selectedBetTypes.length === 0}
                  className="btn-primary w-full py-4 text-lg font-semibold"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  เพิ่มรายการ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary and Tickets */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">สรุป</h3>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">จำนวนรายการ:</span>
                <span className="font-semibold">{tickets.length}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-900 font-medium">ยอดรวม:</span>
                <span className="text-lg font-bold text-primary-600">
                  {formatCurrency(getTotalAmount())}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={saving || tickets.length === 0}
              className="btn-success w-full py-4 text-lg font-semibold"
            >
              {saving ? (
                <div className="flex items-center justify-center">
                  <div className="spinner mr-2"></div>
                  กำลังบันทึก...
                </div>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  บันทึกการแก้ไข
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      {tickets.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">รายการหวย</h3>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>ลำดับ</th>
                    <th>เลข</th>
                    <th>ประเภท</th>
                    <th>ราคา</th>
                    <th>สถานะ</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket, index) => (
                    <tr key={ticket.ticket_id || ticket.id}>
                      <td>{index + 1}</td>
                      <td className="font-mono font-bold text-lg">
                        {ticket.lotto_number}
                      </td>
                      <td>
                        <span className="badge-primary text-xs">
                          {getLottoTypeName(ticket.lotto_type)}
                        </span>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={ticket.price}
                          onChange={(e) => updateTicketPrice(ticket.ticket_id || ticket.id, 'price', e.target.value)}
                          className="w-20 p-2 text-sm border border-gray-300 rounded focus:border-blue-500 text-center"
                        />
                      </td>
                      <td>
                        {ticket.is_new ? (
                          <span className="badge-success text-xs">ใหม่</span>
                        ) : (
                          <span className="badge-secondary text-xs">เดิม</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeTicket(ticket.ticket_id || ticket.id)}
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
      )}
    </form>
  )
}

export default EditBillPage