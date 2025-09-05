import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Trash2, Search, FileText, X, AlertCircle, Lock, Edit3 } from 'lucide-react'
import { ticketsAPI } from '../services/api'
import { formatCurrency, formatDateTime, formatDate, getLottoTypeName } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import toast from 'react-hot-toast'
import ReceiptModal from '../components/ReceiptModal'

const BillsPage = () => {
  const { isAdmin } = useAuth()
  const { isBettingOpen, systemStatus } = useSettings()
  const navigate = useNavigate()

  // Debug
  // console.log('🔍 BillsPage - isBettingOpen:', isBettingOpen)
  // console.log('🔍 BillsPage - systemStatus:', systemStatus)
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBill, setSelectedBill] = useState(null)
  const [billDetails, setBillDetails] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [highlightBillId, setHighlightBillId] = useState(null)

  useEffect(() => {
    loadBills()

    // ตรวจสอบ URL parameter สำหรับไฮไลท์บิล
    const urlParams = new URLSearchParams(window.location.search)
    const highlight = urlParams.get('highlight')
    if (highlight) {
      setHighlightBillId(highlight)
      setSearchTerm(highlight) // ค้นหาบิลที่ต้องการไฮไลท์

      // ลบ highlight parameter หลังจาก 5 วินาที
      setTimeout(() => {
        setHighlightBillId(null)
      }, 5000)
    }
  }, [])



  const loadBills = async () => {
    try {
      setLoading(true)
    //  console.log('🔍 Loading bills...')
      const response = await ticketsAPI.getAllBills()
      // console.log('📋 Bills response:', response.data)
      // console.log('📊 Bills data:', response.data.data)
      // console.log('📈 Bills count:', response.data.data?.length || 0)
      setBills(response.data.data)
    } catch (error) {
      // Error loading bills
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลบิล')
    } finally {
      setLoading(false)
    }
  }

  const viewBillDetails = async (billId) => {
    try {
      const response = await ticketsAPI.getBillById(billId)
      setBillDetails(response.data.data)
      setSelectedBill(billId)
    } catch (error) {
      // Error loading bill details
      toast.error('เกิดข้อผิดพลาดในการโหลดรายละเอียดบิล')
    }
  }

  const deleteBill = async (billId, billName = '') => {
    const confirmMessage = billName 
      ? `คุณต้องการลบบิล "${billName}" หรือไม่?\n\nการดำเนินการนี้ไม่สามารถยกเลิกได้`
      : 'คุณต้องการลบบิลนี้หรือไม่?\n\nการดำเนินการนี้ไม่สามารถยกเลิกได้'
    
    if (!confirm(confirmMessage)) return

    try {
      setLoading(true)
      await ticketsAPI.deleteBill(billId)
      toast.success('ลบบิลสำเร็จ')
      await loadBills()
      
      // Clear selection if the deleted bill was selected
      if (selectedBill === billId) {
        setSelectedBill(null)
        setBillDetails(null)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการลบบิล')
    } finally {
      setLoading(false)
    }
  }

  const openEditPage = (bill) => {
    navigate(`/bills/edit/${bill.bill_id}`)
  }

  const filteredBills = bills.filter(bill => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        bill.bill_id.toLowerCase().includes(search) ||
        bill.buyer_name.toLowerCase().includes(search)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">รายการบิล</h1>
          <p className="text-gray-600">ดูและจัดการบิลการซื้อหวย</p>
        </div>

        {/* System Status Indicator */}
        <div className="flex items-center space-x-2">
          {!isBettingOpen && (
            <div className="flex items-center space-x-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg border border-red-200">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">ระบบปิดรับแทง</span>
            </div>
          )}
        </div>
      </div>

      {/* System Status Alert */}
      {!isBettingOpen && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">ระบบปิดรับแทงชั่วคราว</h3>
              <p className="text-sm text-yellow-700 mt-1">
                ขณะนี้ระบบปิดรับแทงหวย ฟังก์ชันการลบบิลจะถูกซ่อนไว้เพื่อความปลอดภัย
                {isAdmin() && (
                  <span className="block mt-1">
                    คุณสามารถเปิดระบบได้ที่หน้า <strong>การตั้งค่า → สถานะระบบ</strong>
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="max-w-md">
            <label className="label">
              <span className="label-text font-medium">ค้นหาบิล</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                className="input pl-10 w-full"
                placeholder="ค้นหารหัสบิล หรือ ชื่อผู้ซื้อ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bills list */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">รายการบิล</h3>
            <span className="badge-primary">{filteredBills.length} บิล</span>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="spinner mx-auto mb-4"></div>
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">ไม่พบข้อมูลบิล</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {filteredBills.map((bill) => (
                  <div
                    key={bill.bill_id}
                    className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                      selectedBill === bill.bill_id ? 'bg-primary-50 border-primary-200' : ''
                    } ${
                      highlightBillId === bill.bill_id ? 'ring-4 ring-yellow-400 bg-yellow-50' : ''
                    }`}
                    onClick={() => viewBillDetails(bill.bill_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{bill.bill_id}</h4>
                          <span className="badge-primary">{bill.buyer_name}</span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          <p>{formatDateTime(bill.created_at)}</p>
                          <p>{bill.ticket_count} ตั๋ว • {formatCurrency(bill.total_amount)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            viewBillDetails(bill.bill_id)
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isBettingOpen && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditPage(bill)
                              }}
                              className="text-green-600 hover:text-green-800"
                              title="แก้ไขบิล"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteBill(bill.bill_id, bill.buyer_name)
                              }}
                              className="text-red-600 hover:text-red-800"
                              title="ลบบิล"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bill details */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">รายละเอียดบิล</h3>
            {selectedBill && (
              <span className="text-sm text-gray-500">{selectedBill}</span>
            )}
          </div>
          <div className="card-body">
            {!selectedBill ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">เลือกบิลเพื่อดูรายละเอียด</p>
              </div>
            ) : !billDetails ? (
              <div className="text-center py-8">
                <div className="spinner mx-auto mb-4"></div>
                <p className="text-gray-500">กำลังโหลดรายละเอียด...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Bill info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">รหัสบิล:</span>
                      <p className="font-medium">{billDetails?.bill_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">ผู้ซื้อ:</span>
                      <p className="font-medium">{billDetails?.buyer_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">วันที่:</span>
                      <p className="font-medium">{formatDateTime(billDetails?.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">จำนวนตั๋ว:</span>
                      <p className="font-medium">{billDetails?.ticket_count} ตั๋ว</p>
                    </div>
                  </div>
                </div>

                {/* Tickets */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">รายการหวย</h4>
                  <div className="space-y-2">
                    {billDetails?.tickets?.map((ticket, index) => (
                      <div key={ticket.ticket_id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-500">#{index + 1}</span>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-lg">{ticket.lotto_number}</span>
                              {ticket.is_half_price ? (
                                <span className="text-xs text-red-500">จ่ายครึ่ง</span>
                              ) : null}
                              <span className="badge-primary text-xs">
                                {getLottoTypeName(ticket.lotto_type)}
                              </span>
                              {ticket.is_reverse ? (
                                <span className="badge-success text-xs">กลับเลข</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {ticket.lotto_type === '3straight_toad' ? (
                              <span className="text-blue-600">
                                {ticket.price}×{ticket.price_toad}B
                              </span>
                            ) : (
                              formatCurrency(ticket.price)
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">ยอดรวม:</span>
                    <span className="text-xl font-bold text-primary-600">
                      {formatCurrency(billDetails?.total_amount || 0)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowReceiptModal(true)}
                    className={`btn-primary ${isBettingOpen ? 'flex-1' : 'w-full'}`}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    ดูใบเสร็จ
                  </button>

                  {isBettingOpen && (
                    <>
                      <button
                        onClick={() => openEditPage(billDetails)}
                        className="btn-secondary flex-1"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        แก้ไขบิล
                      </button>
                      <button
                        onClick={() => deleteBill(selectedBill, billDetails?.buyer_name)}
                        className="btn-danger flex-1"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        ลบบิล
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        billData={billDetails}
      />
    </div>
  )
}

export default BillsPage
