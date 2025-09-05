import { useState, useEffect } from 'react'
import { Calendar, Plus, Edit, Check, X, Clock } from 'lucide-react'
import { periodsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { formatDate } from '../utils/helpers'
import toast from 'react-hot-toast'

const PeriodManagementPage = () => {
  const { isAdmin } = useAuth()
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPeriod, setNewPeriod] = useState({
    period: '',
    period_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (isAdmin()) {
      loadPeriods()
    }
  }, [])

  const loadPeriods = async () => {
    try {
      setLoading(true)
      const response = await periodsAPI.getAll()
      setPeriods(response.data.data)
    } catch (error) {
      // Error loading periods
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลงวด')
    } finally {
      setLoading(false)
    }
  }

  const createPeriod = async () => {
    if (!newPeriod.period.trim()) {
      toast.error('กรุณากรอกชื่องวด')
      return
    }

    try {
      setLoading(true)
      const response = await periodsAPI.create(newPeriod)
      if (response.data.success) {
        toast.success('สร้างงวดใหม่สำเร็จ')
        setShowCreateForm(false)
        setNewPeriod({
          period: '',
          period_date: new Date().toISOString().split('T')[0]
        })
        loadPeriods()
      }
    } catch (error) {
      // Error creating period
      toast.error('เกิดข้อผิดพลาดในการสร้างงวด')
    } finally {
      setLoading(false)
    }
  }

  const setCurrentPeriod = async (periodId) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะเปลี่ยนงวดปัจจุบัน?')) {
      return
    }

    try {
      setLoading(true)
      const response = await periodsAPI.setCurrent(periodId)
      if (response.data.success) {
        toast.success('เปลี่ยนงวดปัจจุบันสำเร็จ')
        loadPeriods()
      }
    } catch (error) {
      // Error setting current period
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนงวด')
    } finally {
      setLoading(false)
    }
  }

  const closePeriod = async (periodId) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะปิดงวดนี้? การกระทำนี้ไม่สามารถยกเลิกได้')) {
      return
    }

    try {
      setLoading(true)
      const response = await periodsAPI.close(periodId)
      if (response.data.success) {
        toast.success('ปิดงวดสำเร็จ')
        loadPeriods()
      }
    } catch (error) {
      // Error closing period
      toast.error('เกิดข้อผิดพลาดในการปิดงวด')
    } finally {
      setLoading(false)
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900">จัดการงวดหวย</h1>
          <p className="text-gray-600">สร้างและจัดการงวดหวย</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center space-x-2"
          disabled={loading}
        >
          <Plus className="w-4 h-4" />
          <span>สร้างงวดใหม่</span>
        </button>
      </div>

      {/* Create Period Form */}
      {showCreateForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">สร้างงวดใหม่</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">ชื่องวด</label>
                <input
                  type="text"
                  className="input"
                  placeholder="เช่น 16/01/2568"
                  value={newPeriod.period}
                  onChange={(e) => setNewPeriod({ ...newPeriod, period: e.target.value })}
                />
              </div>
              <div>
                <label className="label">วันที่งวด</label>
                <input
                  type="date"
                  className="input"
                  value={newPeriod.period_date}
                  onChange={(e) => setNewPeriod({ ...newPeriod, period_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                onClick={createPeriod}
                className="btn-primary"
                disabled={loading}
              >
                สร้างงวด
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="btn-outline"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Periods List */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">รายการงวดหวย</h3>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">กำลังโหลด...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>ชื่องวด</th>
                    <th>วันที่งวด</th>
                    <th>สถานะ</th>
                    <th>วันที่สร้าง</th>
                    <th>การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr key={period.id}>
                      <td className="font-mono">{period.id}</td>
                      <td className="font-semibold">{period.period}</td>
                      <td>{formatDate(period.period_date)}</td>
                      <td>
                        <span className={`badge ${
                          period.status === 'current' 
                            ? 'badge-success' 
                            : 'badge-secondary'
                        }`}>
                          {period.status === 'current' ? 'ปัจจุบัน' : 'ปิดแล้ว'}
                        </span>
                      </td>
                      <td>{formatDate(period.created_at)}</td>
                      <td>
                        <div className="flex space-x-2">
                          {period.status === 'closed' && (
                            <button
                              onClick={() => setCurrentPeriod(period.id)}
                              className="btn-sm btn-outline text-green-600 border-green-600 hover:bg-green-50"
                              disabled={loading}
                            >
                              <Check className="w-3 h-3" />
                              เปิดใช้
                            </button>
                          )}
                          {period.status === 'current' && (
                            <button
                              onClick={() => closePeriod(period.id)}
                              className="btn-sm btn-outline text-red-600 border-red-600 hover:bg-red-50"
                              disabled={loading}
                            >
                              <X className="w-3 h-3" />
                              ปิดงวด
                            </button>
                          )}
                        </div>
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
  )
}

export default PeriodManagementPage
