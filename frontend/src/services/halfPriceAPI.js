import api from './api'

export const halfPriceAPI = {
  // เพิ่มเลขจ่ายครึ่งราคา (แบบใหม่ - แยกหมวดหมู่)
  add: (data) => api.post('/half-price', data),
  
  // ดึงเลขจ่ายครึ่งราคาตามงวด
  getByPeriod: (period_id) => api.get(`/half-price/period/${period_id}`),
  
  // ดึงเลขจ่ายครึ่งราคาตามงวดและหมวดหมู่
  getByPeriodAndCategory: (period_id, category) => api.get(`/half-price/period/${period_id}/category/${category}`),
  
  // ลบเลขจ่ายครึ่งราคาทั้งงวด
  delete: (period_id) => api.delete(`/half-price/period/${period_id}`),
  
  // ลบเลขจ่ายครึ่งราคาตามหมวดหมู่
  deleteByCategory: (period_id, category) => api.delete(`/half-price/period/${period_id}/category/${category}`)
}
