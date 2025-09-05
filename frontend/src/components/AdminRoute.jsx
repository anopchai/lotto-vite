import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const AdminRoute = ({ children }) => {
  const { isAdmin } = useAuth()

  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default AdminRoute
