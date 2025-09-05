import { useState, useEffect } from 'react'
import {
  Trophy, Plus, Calendar, Sparkles,
  TrendingUp, Target, Gift, Star, Crown, Zap, CheckCircle,
  Clock, AlertCircle, X, Save, Trash2, Edit3
} from 'lucide-react'
import { resultsAPI, periodAPI, reportsAPI } from '../services/api'
import { formatDate, formatDateTime, getLottoTypeName, formatCurrency } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

// Function to generate all permutations of 3 digits (6 กลับ)
const generateToadNumbers = (number) => {
  if (!number || number.length !== 3) return []

  const digits = number.split('')
  const permutations = new Set()

  // Generate all permutations
  for (let i = 0; i < digits.length; i++) {
    for (let j = 0; j < digits.length; j++) {
      for (let k = 0; k < digits.length; k++) {
        if (i !== j && j !== k && i !== k) {
          permutations.add(digits[i] + digits[j] + digits[k])
        }
      }
    }
  }

  return Array.from(permutations).sort()
}

const ResultPage = () => {
  const { isAdmin } = useAuth()

  // States
  const [results, setResults] = useState([])
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const [newResult, setNewResult] = useState({
    period_id: '',
    result_2up: '',
    result_2down: '',
    result_3up: '',
    result_date: new Date().toISOString().split('T')[0]
  })

  // Load data on mount
  useEffect(() => {
    loadResults()
    loadPeriods()
  }, [])

  // API Functions
  const loadResults = async () => {
    try {
      setLoading(true)
      const response = await resultsAPI.getAll()
      setResults(response.data.data || [])
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการโหลดผลรางวัล')
    } finally {
      setLoading(false)
    }
  }

  const loadPeriods = async () => {
    try {
      const response = await periodAPI.getAll()
      setPeriods(response.data.data || [])
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการโหลดงวด')
    }
  }

  const createResult = async () => {
    try {
      setLoading(true)

      // Validation
      if (!newResult.period_id) {
        toast.error('กรุณาเลือกงวด')
        return
      }

      if (!newResult.result_2up || !newResult.result_2down || !newResult.result_3up) {
        toast.error('กรุณากรอกผลรางวัลให้ครบถ้วน')
        return
      }

      // Validate number format
      if (!/^\d{2}$/.test(newResult.result_2up)) {
        toast.error('เลข 2 ตัวบนต้องเป็นตัวเลข 2 หลัก')
        return
      }

      if (!/^\d{2}$/.test(newResult.result_2down)) {
        toast.error('เลข 2 ตัวล่างต้องเป็นตัวเลข 2 หลัก')
        return
      }

      if (!/^\d{3}$/.test(newResult.result_3up)) {
        toast.error('เลข 3 ตัวตรงต้องเป็นตัวเลข 3 หลัก')
        return
      }

      // Generate toad numbers
      const toadNumbers = generateToadNumbers(newResult.result_3up)
      const resultData = {
        ...newResult,
        result_3toad: toadNumbers.join(',')
      }

      const response = await resultsAPI.create(resultData)

      if (response.data && response.data.success) {
        toast.success(`ประกาศผลรางวัลสำเร็จ! สร้างเลข 3 ตัวโต๊ด ${toadNumbers.length} เลข`)
        setShowCreateModal(false)
        setNewResult({
          period_id: '',
          result_2up: '',
          result_2down: '',
          result_3up: '',
          result_date: new Date().toISOString().split('T')[0]
        })
        loadResults()
      } else {
        toast.error(response.data?.message || 'การประกาศผลรางวัลไม่สำเร็จ')
      }
    } catch (error) {

      if (error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else if (error.response?.status === 401) {
        toast.error('ไม่มีสิทธิ์ในการประกาศผลรางวัล กรุณาเข้าสู่ระบบใหม่')
      } else if (error.response?.status === 403) {
        toast.error('ไม่มีสิทธิ์ Admin ในการประกาศผลรางวัล')
      } else if (error.message.includes('Network Error')) {
        toast.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
      } else {
        toast.error(`เกิดข้อผิดพลาด: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }



  const deleteResult = async (resultId) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบผลรางวัลนี้?')) {
      return
    }

    try {
      setLoading(true)
      await resultsAPI.delete(resultId)
      toast.success('ลบผลรางวัลสำเร็จ!')
      loadResults()
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการลบผลรางวัล')
    } finally {
      setLoading(false)
    }
  }

  const getPeriodName = (periodId) => {
    const period = periods.find(p => p.id === periodId)
    return period ? period.period_name : 'ไม่ระบุ'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ผลรางวัล
                </h1>
                <p className="text-gray-600 mt-1">จัดการและประกาศผลรางวัลหวย</p>
              </div>
            </div>

            {isAdmin() && (
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={loading}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Plus className="w-5 h-5" />
                <span>ประกาศผลรางวัล</span>
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">งวดทั้งหมด</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{results.length}</p>
                <p className="text-xs text-gray-500 mt-1">งวดที่ประกาศแล้ว</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">งวดล่าสุด</p>
                <p className="text-lg font-bold text-green-600 mt-1">
                  {results.length > 0 ? getPeriodName(results[0].period_id) : 'ยังไม่มี'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {results.length > 0 ? formatDate(results[0].result_date) : 'ไม่มีข้อมูล'}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Star className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">สถานะระบบ</p>
                <p className="text-lg font-bold text-purple-600 mt-1">
                  {loading ? 'กำลังโหลด...' : 'พร้อมใช้งาน'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {isAdmin() ? 'ผู้ดูแลระบบ' : 'ผู้ใช้ทั่วไป'}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                {loading ? (
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">รายการผลรางวัล</h2>
                  <p className="text-sm text-gray-600">ผลรางวัลที่ประกาศแล้วทั้งหมด</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {results.length} งวด
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 font-medium">กำลังโหลดข้อมูล...</p>
                <p className="text-sm text-gray-500 mt-1">โปรดรอสักครู่</p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">ยังไม่มีผลรางวัล</p>
                <p className="text-sm text-gray-500 mt-1">เริ่มต้นด้วยการประกาศผลรางวัลงวดแรก</p>
                {isAdmin() && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-200"
                  >
                    ประกาศผลรางวัล
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {results.map((result, index) => (
                  <div
                    key={result.result_id || index}
                    className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-300 group"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg group-hover:shadow-lg transition-shadow duration-300">
                          <Crown className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{getPeriodName(result.period_id)}</h3>
                          <p className="text-xs text-gray-500">{formatDate(result.result_date)}</p>
                        </div>
                      </div>
                      {isAdmin() && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => deleteResult(result.result_id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                            title="ลบผลรางวัล"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Results */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-blue-600 font-medium mb-1">2 ตัวบน</p>
                          <p className="text-xl font-bold text-blue-700">{result.result_2up || '-'}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-green-600 font-medium mb-1">2 ตัวล่าง</p>
                          <p className="text-xl font-bold text-green-700">{result.result_2down || '-'}</p>
                        </div>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-orange-600 font-medium mb-1">3 ตัวตรง</p>
                        <p className="text-2xl font-bold text-orange-700">{result.result_3up || '-'}</p>
                      </div>

                      {result.result_3toad && (
                        <div className="bg-purple-50 rounded-lg p-3">
                          <p className="text-xs text-purple-600 font-medium mb-2">3 ตัวโต๊ด (6 กลับ)</p>
                          <div className="grid grid-cols-3 gap-1 text-center">
                            {result.result_3toad.split(',').map((num, idx) => (
                              <span key={idx} className="text-sm font-bold text-purple-700 bg-white rounded px-2 py-1">
                                {num}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>ประกาศเมื่อ {formatDateTime(result.created_at)}</span>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-green-600 font-medium">ประกาศแล้ว</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Result Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">ประกาศผลรางวัล</h3>
                    <p className="text-blue-100 text-sm">กรอกผลรางวัลและประกาศให้ผู้เล่นทราบ</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side - Form */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      เลือกงวด <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newResult.period_id}
                      onChange={(e) => setNewResult({ ...newResult, period_id: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">-- เลือกงวด --</option>
                      {periods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.period_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      วันที่ประกาศ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newResult.result_date}
                      onChange={(e) => setNewResult({ ...newResult, result_date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        2 ตัวบน <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newResult.result_2up}
                        onChange={(e) => setNewResult({ ...newResult, result_2up: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                        placeholder="00"
                        maxLength="2"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-xl font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        2 ตัวล่าง <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newResult.result_2down}
                        onChange={(e) => setNewResult({ ...newResult, result_2down: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                        placeholder="00"
                        maxLength="2"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-xl font-bold text-green-600 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      3 ตัวตรง <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newResult.result_3up}
                      onChange={(e) => setNewResult({ ...newResult, result_3up: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                      placeholder="000"
                      maxLength="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl font-bold text-orange-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Right Side - Preview */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <Crown className="w-5 h-5 mr-2 text-blue-600" />
                      ตัวอย่างผลรางวัล
                    </h4>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-lg p-4 text-center border-2 border-blue-200">
                          <p className="text-sm text-blue-600 font-medium mb-2">2 ตัวบน</p>
                          <p className="text-2xl font-bold text-blue-700">
                            {newResult.result_2up || '--'}
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center border-2 border-green-200">
                          <p className="text-sm text-green-600 font-medium mb-2">2 ตัวล่าง</p>
                          <p className="text-2xl font-bold text-green-700">
                            {newResult.result_2down || '--'}
                          </p>
                        </div>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-4 text-center border-2 border-orange-200">
                        <p className="text-sm text-orange-600 font-medium mb-2">3 ตัวตรง</p>
                        <p className="text-3xl font-bold text-orange-700">
                          {newResult.result_3up || '---'}
                        </p>
                      </div>

                      {newResult.result_3up && newResult.result_3up.length === 3 && (
                        <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                          <p className="text-sm text-purple-600 font-medium mb-3 flex items-center">
                            <Zap className="w-4 h-4 mr-1" />
                            3 ตัวโต๊ด (6 กลับ) - สร้างอัตโนมัติ
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {generateToadNumbers(newResult.result_3up).map((num, idx) => (
                              <div key={idx} className="bg-white rounded-lg p-2 text-center border border-purple-300">
                                <span className="text-sm font-bold text-purple-700">{num}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-purple-600 mt-2 text-center">
                            รวม {generateToadNumbers(newResult.result_3up).length} เลข
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors duration-200"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={createResult}
                  disabled={loading || !newResult.period_id || !newResult.result_2up || !newResult.result_2down || !newResult.result_3up}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>กำลังประกาศ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>ประกาศผลรางวัล</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



    </div>
  )
}

export default ResultPage