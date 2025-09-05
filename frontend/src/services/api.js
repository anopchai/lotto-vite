import axios from 'axios'

// สร้าง axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - เพิ่ม token ใน header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - จัดการ error
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token หมดอายุหรือไม่ถูกต้อง
      localStorage.removeItem('token')
      
      // Prevent infinite redirects
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  verifyToken: () => api.get('/auth/verify'),
  changePassword: (data) => api.post('/auth/change-password', data),
}

// Tickets API
export const ticketsAPI = {
  create: (data) => api.post('/tickets', data),
  getMyTickets: (params) => api.get('/tickets/my', { params }),
  getAllTickets: (params) => api.get('/tickets/all', { params }),
  getBillById: (billId) => api.get(`/tickets/bill/${billId}`),
  getAllBills: (params) => api.get('/tickets/bills', { params }),
  getBills: (params) => api.get('/tickets/bills', { params }),
  getBillDetail: (billId) => api.get(`/tickets/bill/${billId}`),
  getAgents: () => api.get('/agents'),
  deleteBill: (billId) => api.delete(`/tickets/bill/${billId}`),
  updateBill: (billId, data) => api.put(`/tickets/bill/${billId}`, data),
}

// Results API
export const resultsAPI = {
  save: (data) => api.post('/results', data),
  create: (data) => api.post('/results', data),
  getLatest: () => api.get('/results/latest'),
  getAll: () => api.get('/results'),
  getByPeriod: (period) => api.get(`/results/period/${encodeURIComponent(period)}`),
  checkWinners: (period) => api.get(`/results/winners/${encodeURIComponent(period)}`),
  delete: (id) => api.delete(`/results/${id}`),
  update: (id, data) => api.put(`/results/${id}`, data)
}

// Reports API
export const reportsAPI = {
  getSales: (params) => api.get('/reports/sales', { params }),
  getWinners: (params) => api.get('/reports/winners', { params }),
  getDaily: (params) => api.get('/reports/daily', { params }),
  getAgents: (params) => api.get('/reports/agents', { params }),
  getUser: (params) => api.get('/reports/user', { params }),
  getLottoNumberFrequency: (params) => api.get('/reports/number-frequency', { params }),

  // API ใหม่ (ระบบปรับปรุง)
  getNewAgents: (params = {}) => api.get('/reports/new-agents', { params }),
  getNewWinners: (params = {}) => api.get('/reports/new-winners', { params }),
  getDashboard: (params = {}) => api.get('/reports/dashboard', { params })
}

export const halfPriceAPI = {
  add: (data) => api.post('/half-price', data),
  getByPeriod: (period_id) => api.get(`/half-price/period/${period_id}`),
  getByPeriodName: (period) => api.get(`/half-price/period-name/${encodeURIComponent(period)}`),
  getByPeriodAndCategory: (period_id, category) => api.get(`/half-price/period/${period_id}/category/${category}`),
  getAll: () => api.get('/half-price/all'),
  remove: (id) => api.delete(`/half-price/${id}`),
  delete: (period_id) => api.delete(`/half-price/period/${period_id}`),
  deleteByPeriodName: (period) => api.delete(`/half-price/period-name/${encodeURIComponent(period)}`),
  deleteByCategory: (period_id, category) => api.delete(`/half-price/period/${period_id}/category/${category}`),
}

// Periods API
export const periodAPI = {
  getCurrentPeriod: () => api.get('/periods/current'),
  getOpenPeriod: () => api.get('/periods/open'),
  getAllPeriods: () => api.get('/periods'),
  getAll: () => api.get('/periods'),
  createPeriod: (data) => api.post('/periods', data),
  create: (data) => api.post('/periods', data),
  updatePeriod: (id, data) => api.put(`/periods/${id}`, data),
  update: (id, data) => api.put(`/periods/${id}`, data),
  deletePeriod: (id) => api.delete(`/periods/${id}`),
  setCurrentPeriod: (id) => api.put(`/periods/${id}/set-current`),
  togglePeriodStatus: (id) => api.put(`/periods/${id}/toggle-status`),
  closeAllPeriods: () => api.put('/periods/close-all')
}

// Settings API
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getAsObject: () => api.get('/settings/object'),
  getPayoutRate: (lottoType) => api.get(`/settings/payout/${lottoType}`),
  updatePayoutRate: (lottoType, data) => api.put(`/settings/payout/${lottoType}`, data),
  updateMultiple: (data) => api.put('/settings/multiple', data),
  resetToDefault: () => api.post('/settings/reset'),
  getSystemConfigs: () => api.get('/settings/system'),
  updateSystemConfigs: (data) => api.put('/settings/system', data),
  getSystemStatus: () => api.get('/settings/status'),
  toggleSystemStatus: (data) => api.post('/settings/toggle-status', data),
}

// Agents API
export const agentsAPI = {
  getAll: () => api.get('/agents'),
  getById: (agentId) => api.get(`/agents/${agentId}`),
  create: (data) => api.post('/agents', data),
  update: (agentId, data) => api.put(`/agents/${agentId}`, data),
  delete: (agentId) => api.delete(`/agents/${agentId}`),
  getStats: (agentId, params) => api.get(`/agents/${agentId}/stats`, { params }),
  getMyProfile: () => api.get('/agents/me'),
  updateMyProfile: (data) => api.put('/agents/me', data),
}

// Periods API (alias for compatibility)
export const periodsAPI = {
  getAll: () => periodAPI.getAllPeriods(),
  getCurrent: () => periodAPI.getCurrentPeriod(),
  create: (data) => periodAPI.createPeriod(data),
  setCurrent: (id) => periodAPI.setCurrentPeriod(id),
  close: (id) => periodAPI.togglePeriodStatus(id),
  update: (id, data) => periodAPI.updatePeriod(id, data),
  delete: (id) => periodAPI.deletePeriod(id)
}



export default api
