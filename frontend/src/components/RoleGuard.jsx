import { useAuth } from '../contexts/AuthContext'

const RoleGuard = ({ children, allowedRoles = [], fallback = null }) => {
  const { user } = useAuth()
  
  if (!user) {
    return fallback
  }
  
  // ถ้าไม่กำหนด allowedRoles หรือเป็น array ว่าง ให้ผ่านทุกคน
  if (!allowedRoles.length) {
    return children
  }
  
  // ใช้ role จากฐานข้อมูลโดยตรง
  const userRole = user.role
  
  // ตรวจสอบว่า role มีอยู่ใน allowedRoles หรือไม่
  if (!userRole || !allowedRoles.includes(userRole)) {
    return fallback
  }
  
  return children
}

export default RoleGuard
