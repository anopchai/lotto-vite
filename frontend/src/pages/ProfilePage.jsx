import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { User, Save, Lock, Eye, EyeOff } from 'lucide-react'
import { agentsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTime } from '../utils/helpers'
import toast from 'react-hot-toast'

const ProfilePage = () => {
  const { user, changePassword } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  })

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors }
  } = useForm()

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    watch,
    formState: { errors: passwordErrors }
  } = useForm()

  const newPassword = watch('new_password')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await agentsAPI.getMyProfile()
      setProfile(response.data.data)
      resetProfile({
        agent_name: response.data.data.agent_name,
        phone: response.data.data.phone
      })
    } catch (error) {
      // Error loading profile
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลโปรไฟล์')
    }
  }

  const updateProfile = async (data) => {
    setLoading(true)
    try {
      await agentsAPI.updateMyProfile(data)
      toast.success('อัปเดตโปรไฟล์สำเร็จ')
      loadProfile()
    } catch (error) {
      // Error updating profile
      toast.error('เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์')
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (data) => {
    setLoading(true)
    try {
      const result = await changePassword({
        current_password: data.current_password,
        new_password: data.new_password
      })
      
      if (result.success) {
        resetPassword()
        toast.success('เปลี่ยนรหัสผ่านสำเร็จ')
      }
    } catch (error) {
      // Error changing password
    } finally {
      setLoading(false)
    }
  }

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">โปรไฟล์</h1>
          <p className="text-gray-600">จัดการข้อมูลส่วนตัวและรหัสผ่าน</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile info */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">ข้อมูลส่วนตัว</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmitProfile(updateProfile)} className="space-y-4">
              <div>
                <label className="label">รหัสตัวแทน</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-mono font-medium">{profile.agent_code}</p>
                </div>
                <p className="text-sm text-gray-500 mt-1">ไม่สามารถเปลี่ยนแปลงได้</p>
              </div>

              <div>
                <label className="label">ชื่อ</label>
                <input
                  type="text"
                  className={`input ${profileErrors.agent_name ? 'input-error' : ''}`}
                  placeholder="ชื่อของคุณ"
                  {...registerProfile('agent_name', {
                    required: 'กรุณากรอกชื่อ'
                  })}
                />
                {profileErrors.agent_name && (
                  <p className="form-error">{profileErrors.agent_name.message}</p>
                )}
              </div>

              <div>
                <label className="label">เบอร์โทร</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="เบอร์โทรของคุณ"
                  {...registerProfile('phone')}
                />
              </div>

              <div>
                <label className="label">สถานะ</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className={`badge ${profile.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {profile.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                  </span>
                </div>
              </div>

              <div>
                <label className="label">วันที่สร้างบัญชี</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p>{formatDateTime(profile.created_at)}</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner mr-2"></div>
                    กำลังบันทึก...
                  </div>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    บันทึกข้อมูล
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Change password */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">เปลี่ยนรหัสผ่าน</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmitPassword(updatePassword)} className="space-y-4">
              <div>
                <label className="label">รหัสผ่านปัจจุบัน</label>
                <div className="relative">
                  <input
                    type={showPassword.current ? 'text' : 'password'}
                    className={`input pr-10 ${passwordErrors.current_password ? 'input-error' : ''}`}
                    placeholder="รหัสผ่านปัจจุบัน"
                    {...registerPassword('current_password', {
                      required: 'กรุณากรอกรหัสผ่านปัจจุบัน'
                    })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => togglePasswordVisibility('current')}
                  >
                    {showPassword.current ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {passwordErrors.current_password && (
                  <p className="form-error">{passwordErrors.current_password.message}</p>
                )}
              </div>

              <div>
                <label className="label">รหัสผ่านใหม่</label>
                <div className="relative">
                  <input
                    type={showPassword.new ? 'text' : 'password'}
                    className={`input pr-10 ${passwordErrors.new_password ? 'input-error' : ''}`}
                    placeholder="รหัสผ่านใหม่"
                    {...registerPassword('new_password', {
                      required: 'กรุณากรอกรหัสผ่านใหม่',
                      minLength: {
                        value: 6,
                        message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
                      }
                    })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => togglePasswordVisibility('new')}
                  >
                    {showPassword.new ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {passwordErrors.new_password && (
                  <p className="form-error">{passwordErrors.new_password.message}</p>
                )}
              </div>

              <div>
                <label className="label">ยืนยันรหัสผ่านใหม่</label>
                <div className="relative">
                  <input
                    type={showPassword.confirm ? 'text' : 'password'}
                    className={`input pr-10 ${passwordErrors.confirm_password ? 'input-error' : ''}`}
                    placeholder="ยืนยันรหัสผ่านใหม่"
                    {...registerPassword('confirm_password', {
                      required: 'กรุณายืนยันรหัสผ่านใหม่',
                      validate: (value) => {
                        if (value !== newPassword) {
                          return 'รหัสผ่านไม่ตรงกัน'
                        }
                        return true
                      }
                    })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => togglePasswordVisibility('confirm')}
                  >
                    {showPassword.confirm ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {passwordErrors.confirm_password && (
                  <p className="form-error">{passwordErrors.confirm_password.message}</p>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Lock className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      ข้อควรระวัง
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร</li>
                        <li>ควรใช้รหัสผ่านที่ปลอดภัยและไม่ง่ายต่อการเดา</li>
                        <li>หลังจากเปลี่ยนรหัสผ่านแล้ว ระบบจะออกจากระบบอัตโนมัติ</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner mr-2"></div>
                    กำลังเปลี่ยน...
                  </div>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    เปลี่ยนรหัสผ่าน
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
