import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import Layout from './components/Layout'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TicketPage from './pages/TicketPage'
import BillsPage from './pages/BillsPage'
import EditBillPage from './pages/EditBillPage'
import ResultPage from './pages/ResultPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import AgentsPage from './pages/AgentsPage'
import ProfilePage from './pages/ProfilePage'

import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="ticket" element={<TicketPage />} />
          <Route path="bills" element={<BillsPage />} />
          <Route path="bills/edit/:billId" element={<EditBillPage />} />
          <Route path="results" element={<ResultPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          
          {/* Admin only routes */}
          <Route path="settings" element={
            <AdminRoute>
              <SettingsPage />
            </AdminRoute>
          } />
          <Route path="agents" element={
            <AdminRoute>
              <AgentsPage />
            </AdminRoute>
          } />
        </Route>
        
        {/* 404 page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </SettingsProvider>
    </AuthProvider>
  )
}

export default App
