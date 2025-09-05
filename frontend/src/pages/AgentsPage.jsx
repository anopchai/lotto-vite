import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Edit, Trash2, Eye, Users, UserPlus, Save } from 'lucide-react'
import { agentsAPI } from '../services/api'
import { formatDateTime, getStatusColor, getStatusText } from '../utils/helpers'
import toast from 'react-hot-toast'

const AgentsPage = () => {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [agentStats, setAgentStats] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm()

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      setLoading(true)
      const response = await agentsAPI.getAll()
      setAgents(response.data.data)
    } catch (error) {
      // Error loading agents
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลตัวแทน')
    } finally {
      setLoading(false)
    }
  }

  const openModal = (agent = null) => {
    setEditingAgent(agent)
    if (agent) {
      reset({
        agent_code: agent.agent_code,
        agent_name: agent.agent_name,
        phone: agent.phone,
        income: agent.income || 0,
        status: agent.status,
        role: agent.role
      })
    } else {
      reset({
        agent_code: '',
        agent_name: '',
        password: '',
        phone: '',
        income: 0,
        status: 'active',
        role: 'user'
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingAgent(null)
    reset()
  }

  const saveAgent = async (data) => {
    try {
      if (editingAgent) {
        // Update existing agent
        await agentsAPI.update(editingAgent.agent_id, data)
        toast.success('อัปเดตข้อมูลตัวแทนสำเร็จ')
      } else {
        // Create new agent
        await agentsAPI.create(data)
        toast.success('สร้างตัวแทนใหม่สำเร็จ')
      }
      
      closeModal()
      loadAgents()
    } catch (error) {
      // Error saving agent
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    }
  }

  const deleteAgent = async (agentId) => {
    if (!confirm('คุณต้องการลบตัวแทนนี้หรือไม่?')) return

    try {
      await agentsAPI.delete(agentId)
      toast.success('ลบตัวแทนสำเร็จ')
      loadAgents()
    } catch (error) {
      // Error deleting agent
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการลบตัวแทน')
    }
  }

  const viewAgentStats = async (agent) => {
    try {
      setSelectedAgent(agent)
      const response = await agentsAPI.getStats(agent.agent_id)
      setAgentStats(response.data.data)
    } catch (error) {
      // Error loading agent stats
      toast.error('เกิดข้อผิดพลาดในการโหลดสถิติตัวแทน')
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการตัวแทน</h1>
          <p className="text-gray-600">เพิ่ม แก้ไข และจัดการตัวแทนจำหน่าย</p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn-primary"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          เพิ่มตัวแทนใหม่
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agents list */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">รายการตัวแทน</h3>
              <span className="badge-primary">{agents.length} คน</span>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                </div>
              ) : agents.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">ไม่พบข้อมูลตัวแทน</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>รหัส</th>
                        <th>ชื่อ</th>
                        <th>เบอร์โทร</th>
                        <th>สัดส่วน (%)</th>
                        <th>สถานะ</th>
                        <th>สิทธิ์</th>
                        <th>วันที่สร้าง</th>
                        <th>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map((agent) => (
                        <tr key={agent.agent_id}>
                          <td className="font-mono font-medium">{agent.agent_code}</td>
                          <td>{agent.agent_name}</td>
                          <td>{agent.phone || '-'}</td>
                          <td className="font-mono font-bold text-green-600">
                            {parseInt(agent.income || 0)}%
                          </td>
                          <td>
                            <span className={`badge badge-${getStatusColor(agent.status)}`}>
                              {getStatusText(agent.status)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${agent.role === 'admin' ? 'badge-red' : 'badge-blue'}`}>
                              {agent.role === 'admin' ? 'Admin' : 'User'}
                            </span>
                          </td>
                          <td>{formatDateTime(agent.created_at)}</td>
                          <td>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => viewAgentStats(agent)}
                                className="text-blue-600 hover:text-blue-800"
                                title="ดูสถิติ"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openModal(agent)}
                                className="text-green-600 hover:text-green-800"
                                title="แก้ไข"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {agent.agent_code !== 'ADMIN' && (
                                <button
                                  onClick={() => deleteAgent(agent.agent_id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="ลบ"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Agent stats */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">สถิติตัวแทน</h3>
            {selectedAgent && (
              <span className="text-sm text-gray-500">{selectedAgent.agent_name}</span>
            )}
          </div>
          <div className="card-body">
            {!selectedAgent ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">เลือกตัวแทนเพื่อดูสถิติ</p>
              </div>
            ) : !agentStats ? (
              <div className="text-center py-8">
                <div className="spinner mx-auto mb-4"></div>
                <p className="text-gray-500">กำลังโหลดสถิติ...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {agentStats.summary.total_tickets || 0}
                    </p>
                    <p className="text-sm text-blue-600">ตั๋วทั้งหมด</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      ฿{(agentStats.summary.total_sales || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-green-600">ยอดขาย</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {agentStats.summary.total_bills || 0}
                    </p>
                    <p className="text-sm text-yellow-600">บิลทั้งหมด</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {agentStats.summary.total_buyers || 0}
                    </p>
                    <p className="text-sm text-purple-600">ผู้ซื้อ</p>
                  </div>
                </div>

                {agentStats.sales_by_type.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">ยอดขายตามประเภท</h4>
                    <div className="space-y-2">
                      {agentStats.sales_by_type.map((item) => (
                        <div key={item.lotto_type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">{item.type_name}</span>
                          <div className="text-right">
                            <p className="font-semibold">฿{item.total_amount.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{item.ticket_count} ตั๋ว</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit(saveAgent)}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        {editingAgent ? 'แก้ไขตัวแทน' : 'เพิ่มตัวแทนใหม่'}
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="label">รหัสตัวแทน</label>
                          <input
                            type="text"
                            className={`input ${errors.agent_code ? 'input-error' : ''}`}
                            placeholder="เช่น A001, B001"
                            disabled={!!editingAgent}
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

                        <div>
                          <label className="label">ชื่อตัวแทน</label>
                          <input
                            type="text"
                            className={`input ${errors.agent_name ? 'input-error' : ''}`}
                            placeholder="ชื่อตัวแทน"
                            {...register('agent_name', {
                              required: 'กรุณากรอกชื่อตัวแทน'
                            })}
                          />
                          {errors.agent_name && (
                            <p className="form-error">{errors.agent_name.message}</p>
                          )}
                        </div>

                        {!editingAgent && (
                          <div>
                            <label className="label">รหัสผ่าน</label>
                            <input
                              type="password"
                              className={`input ${errors.password ? 'input-error' : ''}`}
                              placeholder="รหัสผ่าน"
                              {...register('password', {
                                required: 'กรุณากรอกรหัสผ่าน',
                                minLength: {
                                  value: 6,
                                  message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
                                }
                              })}
                            />
                            {errors.password && (
                              <p className="form-error">{errors.password.message}</p>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="label">เบอร์โทร</label>
                          <input
                            type="tel"
                            className="input"
                            placeholder="เบอร์โทร"
                            {...register('phone')}
                          />
                        </div>

                        <div>
                          <label className="label">สัดส่วนรายได้ (%)</label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            className="input"
                            placeholder="0"
                            {...register('income', {
                              valueAsNumber: true,
                              min: { value: 0, message: 'สัดส่วนรายได้ต้องมากกว่าหรือเท่ากับ 0' },
                              max: { value: 100, message: 'สัดส่วนรายได้ต้องไม่เกิน 100%' },
                              validate: value => Number.isInteger(value) || 'สัดส่วนรายได้ต้องเป็นจำนวนเต็ม'
                            })}
                          />
                          {errors.income && (
                            <p className="form-error">{errors.income.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="label">สถานะ</label>
                          <select
                            className="input"
                            {...register('status')}
                          >
                            <option value="active">ใช้งาน</option>
                            <option value="inactive">ไม่ใช้งาน</option>
                          </select>
                        </div>

                        <div>
                          <label className="label">สิทธิ์การใช้งาน</label>
                          <select
                            className="input"
                            {...register('role')}
                          >
                            <option value="user">ผู้ใช้งาน (User)</option>
                            <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="btn-primary w-full sm:w-auto sm:ml-3"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingAgent ? 'อัปเดต' : 'สร้าง'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-outline w-full sm:w-auto mt-3 sm:mt-0"
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AgentsPage
