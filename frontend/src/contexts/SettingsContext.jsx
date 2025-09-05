import { createContext, useContext, useState, useEffect } from 'react'
import { settingsAPI } from '../services/api'

const SettingsContext = createContext()

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

export const SettingsProvider = ({ children }) => {
  const [systemStatus, setSystemStatus] = useState({
    is_open: true,
    loading: true
  })

  // Load system status on mount
  useEffect(() => {
    loadSystemStatus()
  }, [])

  const loadSystemStatus = async () => {
    try {
      setSystemStatus(prev => ({ ...prev, loading: true }))
      const response = await settingsAPI.getSystemStatus()

      if (response.data.success) {
        const status = response.data.data
      //  console.log('🔍 SettingsContext - API response:', status)
        const isOpen = status.is_open === 1 || status.is_open === true
      //  console.log('🔍 SettingsContext - is_open calculated:', isOpen)

        setSystemStatus({
          is_open: isOpen,
          loading: false
        })
      }
    } catch (error) {
      // Error loading system status
      setSystemStatus({
        is_open: true, // Default to open if error
        loading: false
      })
    }
  }

  const toggleSystemStatus = async () => {
    try {
      const newStatus = !systemStatus.is_open
      const response = await settingsAPI.toggleSystemStatus({
        is_open: newStatus
      })

      if (response.data.success) {
        setSystemStatus(prev => ({
          ...prev,
          is_open: newStatus
        }))
        return true
      }
      return false
    } catch (error) {
      // Error toggling system status
      return false
    }
  }

  const isBettingOpen = systemStatus.is_open && !systemStatus.loading
//  console.log('🔍 SettingsContext - isBettingOpen:', isBettingOpen, 'systemStatus:', systemStatus)

  const value = {
    systemStatus,
    loadSystemStatus,
    toggleSystemStatus,
    isBettingOpen
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export default SettingsContext
