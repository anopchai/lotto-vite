import api from './api'

export const periodAPI = {
  // ดึงงวดปัจจุบัน
  getCurrentPeriod: () => api.get('/periods/current'),
  
  // ดึงงวดทั้งหมด (Admin เท่านั้น)
  getAllPeriods: () => api.get('/periods'),
  
  // สร้างงวดใหม่ (Admin เท่านั้น)
  createPeriod: (data) => api.post('/periods', data),
  
  // อัปเดตงวด (Admin เท่านั้น)
  updatePeriod: (id, data) => api.put(`/periods/${id}`, data),
  
  // ลบงวด (Admin เท่านั้น)
  deletePeriod: (id) => api.delete(`/periods/${id}`),
  
  // เปลี่ยนงวดปัจจุบัน (Admin เท่านั้น)
  setCurrentPeriod: (id) => api.put(`/periods/${id}/set-current`),
  
  // เปิด/ปิดรับแทงงวด (Admin เท่านั้น)
  togglePeriodStatus: (id) => api.put(`/periods/${id}/toggle-status`)
}
