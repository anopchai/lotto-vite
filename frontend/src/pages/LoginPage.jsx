import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Gamepad2, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm()

  // ถ้าเข้าสู่ระบบแล้ว ให้ redirect ไปหน้าหลัก
  useEffect(() => {
    if (isAuthenticated()) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, from])

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const result = await login(data)
      if (result.success) {
        navigate(from, { replace: true })
      }
    } catch (error) {
      // Error handled by AuthContext
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center">
              <Gamepad2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            เข้าสู่ระบบ
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            ระบบขายหวยออนไลน์
          </p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Agent Code */}
            <div>
              <label htmlFor="agent_code" className="label">
                รหัสตัวแทน
              </label>
              <input
                id="agent_code"
                type="text"
                autoComplete="username"
                className={`input ${errors.agent_code ? 'input-error' : ''}`}
                placeholder="เช่น A001, B001"
                {...register('agent_code', {
                  required: 'กรุณากรอกรหัสตัวแทน',
                  pattern: {
                    value: /^[A-Z0-9]{3,10}$/,
                    message: 'รหัสตัวแทนต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์ใหญ่และตัวเลข 3-10 ตัว'
                  }
                })}
              />
              {errors.agent_code && (
                <p className="form-error">{errors.agent_code.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="รหัสผ่าน"
                  {...register('password', {
                    required: 'กรุณากรอกรหัสผ่าน',
                    minLength: {
                      value: 6,
                      message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
                    }
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>

            {/* Submit button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 text-base font-medium"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner mr-2"></div>
                    กำลังเข้าสู่ระบบ...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <LogIn className="w-5 h-5 mr-2" />
                    เข้าสู่ระบบ
                  </div>
                )}
              </button>
            </div>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">ยินดีต้อนรับ</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>หากใช้งานไม่ได้ให้ติดต่อ <strong>Admin</strong></p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            © 2024 ระบบขายหวยออนไลน์. สงวนลิขสิทธิ์.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
