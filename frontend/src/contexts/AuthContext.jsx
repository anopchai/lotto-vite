import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  // ตรวจสอบ token เมื่อ app เริ่มต้น
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await authAPI.verifyToken()
          if (response.data.success) {
            setUser(response.data.data.agent)
          } else {
            // Token ไม่ถูกต้อง
            localStorage.removeItem('token')
            setToken(null)
          }
        } catch (error) {
          localStorage.removeItem('token')
          setToken(null)
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [token])

  // เข้าสู่ระบบ
  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials)
      
      if (response.data.success) {
        const { token: newToken, agent } = response.data.data
        
        // บันทึก token และข้อมูลผู้ใช้
        localStorage.setItem('token', newToken)
        setToken(newToken)
        setUser(agent)
        
        toast.success('เข้าสู่ระบบสำเร็จ')
        return { success: true }
      } else {
        toast.error(response.data.message || 'เข้าสู่ระบบไม่สำเร็จ')
        return { success: false, message: response.data.message }
      }
    } catch (error) {
      const message = error.response?.data?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
      toast.error(message)
      return { success: false, message }
    }
  }

  // ออกจากระบบ
  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      // Silent error handling
    } finally {
      // ลบข้อมูลการเข้าสู่ระบบ
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
      toast.success('ออกจากระบบแล้ว')
    }
  }

  // เปลี่ยนรหัสผ่าน
  const changePassword = async (passwordData) => {
    try {
      const response = await authAPI.changePassword(passwordData)
      
      if (response.data.success) {
        toast.success('เปลี่ยนรหัสผ่านสำเร็จ')
        return { success: true }
      } else {
        toast.error(response.data.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ')
        return { success: false, message: response.data.message }
      }
    } catch (error) {
      const message = error.response?.data?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
      toast.error(message)
      return { success: false, message }
    }
  }

  // ตรวจสอบว่าเป็น Admin หรือไม่
  const isAdmin = () => {
    if (!user) return false
    return user.role === 'admin'
  }

  // ตรวจสอบ role ของ user
  const hasRole = (role) => {
    if (!user || !user.role) return false
    return user.role === role
  }

  // ตรวจสอบว่ามีสิทธิ์ใดสิทธิ์หนึ่งหรือไม่
  const hasAnyRole = (roles) => {
    if (!user || !user.role || !Array.isArray(roles)) return false
    return roles.includes(user.role)
  }

  // ตรวจสอบว่าเป็น User ธรรมดาหรือไม่
  const isUser = () => {
    if (!user) return false
    return user.role === 'user'
  }

  // ดึงข้อมูล role ปัจจุบัน
  const getCurrentRole = () => {
    return user?.role || null
  }

  // ตรวจสอบสิทธิ์การเข้าถึงทรัพยากร
  const canAccess = (resource, action = 'read') => {
    if (!user || !user.role) return false
    
    // Admin สามารถเข้าถึงทุกอย่างได้
    if (user.role === 'admin') return true
    
    // กำหนดสิทธิ์สำหรับ user ธรรมดา
    const userPermissions = {
      'tickets': ['read', 'create'],
      'reports': ['read'],
      'profile': ['read', 'update'],
      'results': ['read']
    }
    
    const allowedActions = userPermissions[resource] || []
    return allowedActions.includes(action)
  }

  // ตรวจสอบว่าเข้าสู่ระบบแล้วหรือไม่
  const isAuthenticated = () => {
    return !!user && !!token
  }

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    changePassword,
    isAdmin,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    isUser,
    getCurrentRole,
    canAccess
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
