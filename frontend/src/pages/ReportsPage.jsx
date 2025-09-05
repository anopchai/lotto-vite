import { useState, useEffect } from 'react'
import { BarChart3, DollarSign, Users, Trophy, Calendar, Download, TrendingUp, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { reportsAPI, halfPriceAPI, periodAPI, ticketsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, formatNumber, formatDate, getLottoTypeName } from '../utils/helpers'
import toast from 'react-hot-toast'
import ReceiptModal from '../components/ReceiptModal'

const ReportsPage = () => {
  const { isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState(isAdmin() ? 'overview' : 'my-report')
  const [salesReport, setSalesReport] = useState(null)
  const [winnersReport, setWinnersReport] = useState(null)
  const [numberFrequencyReport, setNumberFrequencyReport] = useState(null)
  const [numberFrequencyPagination, setNumberFrequencyPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 50
  })
  const [selectedLottoType, setSelectedLottoType] = useState('all')

  
  // Function to get agent winners from winnersReport
  const getAgentWinnersFromReport = (agentId) => {
    if (!winnersReport?.winners) return { total_winners: 0, total_reward: 0 }

    const agentWinners = winnersReport.winners.filter(winner => winner.agent_id === agentId)
    const total_winners = agentWinners.length
    const total_reward = agentWinners.reduce((sum, winner) => sum + (winner.reward || 0), 0)

    return { total_winners, total_reward }
  }
  // เอา dailyReport ออกแล้ว - ไม่ใช้เมนูรายงานรายวัน
  const [agentsReport, setAgentsReport] = useState(null)
  const [userReport, setUserReport] = useState(null)
  const [loading, setLoading] = useState(false)
  // เอา halfPriceNumbers, filters, selectedPeriod และ periods ออกแล้ว - แสดงข้อมูลปัจจุบันทั้งหมด
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [selectedBillId, setSelectedBillId] = useState(null)
  const [billDetails, setBillDetails] = useState(null)

  useEffect(() => {
    loadReports()
  }, [activeTab])

  // เอา loadPeriods ออกแล้ว - ไม่ต้องโหลดงวดเพราะแสดงข้อมูลปัจจุบันทั้งหมด

  // ฟังก์ชันสำหรับดูใบเสร็จ
  const viewReceipt = async (billId) => {
    try {
      const response = await ticketsAPI.getBillById(billId)
      setBillDetails(response.data.data)
      setSelectedBillId(billId)
      setShowReceiptModal(true)
    } catch (error) {
      // Error loading bill details
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลบิล')
    }
  }

  // เอา loadHalfPriceNumbers และ isHalfPriceNumber ออกแล้ว - ใช้สำหรับ daily report ที่เอาออกแล้ว

  const loadReports = async () => {
    setLoading(true)
    try {
      // แสดงข้อมูลปัจจุบันทั้งหมด ไม่ใช้ filters
      switch (activeTab) {
        case 'sales':
          if (isAdmin()) {
            await loadSalesReport()
          }
          break
        case 'winners':
          if (isAdmin()) {
            await loadWinnersReport()
          }
          break
        case 'overview':
          if (isAdmin()) {
            await Promise.all([
              loadAgentsReport(),
              loadWinnersReport()
            ])
          }
          break
        case 'my-report':
          if (!isAdmin()) {
            await loadUserReport()
          }
          break
        case 'number-frequency':
          await loadNumberFrequencyReport()
          break
      }
    } catch (error) {
      // Error loading reports
      toast.error('เกิดข้อผิดพลาดในการโหลดรายงาน')
    } finally {
      setLoading(false)
    }
  }

  const loadSalesReport = async () => {
    // แสดงข้อมูลปัจจุบันทั้งหมด ไม่ส่ง params
    const response = await reportsAPI.getSales({})
    setSalesReport(response.data.data)
  }

  const loadWinnersReport = async () => {
    try {
      const response = await reportsAPI.getWinners({})
      setWinnersReport(response.data.data)
    } catch (error) {
      // ถ้าเป็น 404 แสดงว่ายังไม่มีการประกาศผล ไม่ต้องแสดง error
      if (error.response?.status === 404) {
        // ไม่แสดง console.log หรือ error ใดๆ สำหรับ 404
        setWinnersReport(null)
        return
      }
      
      // แสดง error เฉพาะกรณีที่ไม่ใช่ 404
      // แสดง error เฉพาะกรณีที่ไม่ใช่ 404
      setWinnersReport(null)
      toast.error('เกิดข้อผิดพลาดในการโหลดรายงานผู้ชนะ')
    }
  }

  // เอา loadDailyReport ออกแล้ว - ไม่ใช้เมนูรายงานรายวัน

  const loadAgentsReport = async () => {
    const response = await reportsAPI.getAgents({})
    setAgentsReport(response.data.data)
  }

  const loadUserReport = async () => {
    try {
      const [userResponse, winnersResponse] = await Promise.all([
        reportsAPI.getUser({}),
        reportsAPI.getWinners({}).catch((error) => {
          // จัดการ 404 สำหรับ winners report โดยไม่แสดง error
          if (error.response?.status === 404) {
            // ไม่แสดง console.log หรือ error ใดๆ สำหรับ 404
            return { data: { data: null } }
          }
          throw error // โยน error อื่นที่ไม่ใช่ 404 ต่อไป
        })
      ])
      setUserReport(userResponse.data.data)
      setWinnersReport(winnersResponse.data.data)
    } catch (error) {
      // แสดง error เฉพาะกรณีที่ไม่ใช่ข้อผิดพลาดของ winners report 404
      // แสดง error เฉพาะกรณีที่ไม่ใช่ข้อผิดพลาดของ winners report 404
      if (error.response?.status !== 404) {
        toast.error('เกิดข้อผิดพลาดในการโหลดรายงาน')
      }
    }
  }

  const loadNumberFrequencyReport = async (page = 1, type = selectedLottoType) => {
    try {
      const params = {
        page,
        limit: 50
      }
      
      if (type && type !== 'all') {
        params.lotto_type = type
      }
      
      const response = await reportsAPI.getLottoNumberFrequency(params)
      setNumberFrequencyReport(response.data.data)
      setNumberFrequencyPagination(response.data.data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalRecords: 0,
        limit: 50
      })
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการโหลดรายงานความถี่หมายเลข')
    }
  }

  const exportNumberFrequencyCSV = async () => {
    try {
      const params = {
        export_csv: 'true'
      }
      
      if (selectedLottoType && selectedLottoType !== 'all') {
        params.lotto_type = selectedLottoType
      }
      
      // Create a link to download the CSV
      const response = await fetch('/api/reports/number-frequency?' + new URLSearchParams(params), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `lottery_frequency_${selectedLottoType}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success('ส่งออก CSV สำเร็จ')
      } else {
        toast.error('เกิดข้อผิดพลาดในการส่งออก CSV')
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการส่งออก CSV')
    }
  }

  const handlePageChange = (page) => {
    setNumberFrequencyPagination(prev => ({ ...prev, currentPage: page }))
    loadNumberFrequencyReport(page, selectedLottoType)
  }

  const handleTypeFilter = (type) => {
    setSelectedLottoType(type)
    setNumberFrequencyPagination(prev => ({ ...prev, currentPage: 1 }))
    loadNumberFrequencyReport(1, type)
  }











  const tabs = isAdmin() ? [
    { id: 'overview', name: 'ภาพรวม', icon: BarChart3 },
    { id: 'sales', name: 'รายงานยอดขาย', icon: DollarSign },
    { id: 'winners', name: 'รายงานผู้ชนะ', icon: Trophy },
    { id: 'number-frequency', name: 'ความถี่หมายเลข', icon: TrendingUp }
  ] : [
    { id: 'my-report', name: 'รายงานของฉัน', icon: BarChart3 },
    { id: 'number-frequency', name: 'ความถี่หมายเลข', icon: TrendingUp }
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">รายงาน</h1>
          <p className="text-gray-600">ดูรายงานและสถิติการขายหวย</p>
        </div>

      </div>

      {/* เอา Period Selector ออกแล้ว - แสดงข้อมูลปัจจุบันทั้งหมด */}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* เอาตัวกรองออกแล้ว - แสดงข้อมูลปัจจุบันทั้งหมด */}

      {/* Content */}
      {loading ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-500">กำลังโหลดรายงาน...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Sales Report */}
          {activeTab === 'sales' && salesReport && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card">
                  <div className="card-body">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DollarSign className="w-8 h-8 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">ยอดขายรวม</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(salesReport.summary.total_sales)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-body">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <BarChart3 className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">จำนวนตั๋ว</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(salesReport.summary.total_tickets)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-body">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Users className="w-8 h-8 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">จำนวนบิล</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(salesReport.summary.total_bills)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-body">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Users className="w-8 h-8 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">ผู้ซื้อ</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(salesReport.summary.total_buyers)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales by type */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">ยอดขายแยกตามประเภท</h3>
                </div>
                <div className="card-body p-0">
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ประเภทหวย</th>
                          <th>จำนวนตั๋ว</th>
                          <th>ยอดขาย</th>
                          <th>สัดส่วน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesReport.summary.sales_by_type.map((item) => (
                          <tr key={item.lotto_type}>
                            <td>
                              <span className="badge-primary">{item.type_name}</span>
                            </td>
                            <td>{formatNumber(item.ticket_count)}</td>
                            <td className="font-semibold">{formatCurrency(item.total_amount)}</td>
                            <td>
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                  <div
                                    className="bg-primary-600 h-2 rounded-full"
                                    style={{
                                      width: `${(item.total_amount / salesReport.summary.total_sales) * 100}%`
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-600">
                                  {((item.total_amount / salesReport.summary.total_sales) * 100).toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Winners Report */}
          {activeTab === 'winners' && (
            <div className="space-y-6">
              {winnersReport ? (
                <>
                  {/* Summary */}
                  <div className="card">
                    <div className="card-header">
                      <h3 className="text-lg font-semibold text-gray-900">
                        สรุปผู้ชนะ
                      </h3>
                    </div>
                    <div className="card-body">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-primary-600">{winnersReport.summary?.total_winners || 0}</p>
                          <p className="text-gray-600">ผู้ชนะทั้งหมด</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-green-600">
                            {formatCurrency(winnersReport.summary?.total_reward || 0)}
                          </p>
                          <p className="text-gray-600">เงินรางวัลรวม</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-blue-600">
                            {winnersReport.summary?.winners_by_type?.length || 0}
                          </p>
                          <p className="text-gray-600">ประเภทที่มีผู้ชนะ</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="card">
                  <div className="card-body text-center py-12">
                    <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">ยังไม่ประกาศผล</p>
                    <p className="text-gray-400 text-sm mt-2">เมื่อมีการประกาศผลรางวัลแล้ว ข้อมูลผู้ชนะจะแสดงที่นี่</p>
                  </div>
                </div>
              )}

              {/* Winners list */}
              {winnersReport && winnersReport.winners && winnersReport.winners.length > 0 ? (
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">รายชื่อผู้ชนะ</h3>
                  </div>
                  <div className="card-body p-0">
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>ลำดับ</th>
                            <th>ผู้ซื้อ</th>
                            <th>ประเภท</th>
                            <th>เลขที่แทง</th>
                            <th>ราคาแทง</th>
                            <th>อัตราจ่าย</th>
                            <th>เงินรางวัล</th>
                            {isAdmin() && <th>ตัวแทน</th>}
                            <th>ดูใบเสร็จ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {winnersReport.winners.map((winner, index) => (
                            <tr key={winner.ticket_id}>
                              <td>{index + 1}</td>
                              <td className="font-medium">{winner.buyer_name}</td>
                              <td>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  winner.type_name === '2 ตัวบน' ? 'bg-blue-100 text-blue-600' :
                                  winner.type_name === '2 ตัวล่าง' ? 'bg-green-100 text-green-600' :
                                  winner.type_name === '3 ตัวตรง' ? 'bg-orange-100 text-orange-600' :
                                  winner.type_name === '3 ตัวโต๊ด' ? 'bg-yellow-100 text-yellow-600' :
                                  winner.type_name === 'วิ่งบน' ? 'bg-red-100 text-red-600' :
                                  winner.type_name === 'วิ่งล่าง' ? 'bg-pink-100 text-pink-600' :
                                  (winner.result_type === '3straight_toad' || winner.result_type === '3straight_toad_toad_only') ? 'bg-purple-100 text-purple-600' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {winner.result_type === '3straight_toad' ? 'ตรงโต๊ด' :
                                   winner.result_type === '3straight_toad_toad_only' ? 'โต๊ด (จากตรงโต๊ด)' :
                                   winner.type_name}
                                </span>
                              </td>
                              <td className="font-mono font-bold">
                                {winner.lotto_number}
                                {winner.is_half_price && (
                                  <span className="text-xs text-red-500 ml-1">จ่ายครึ่ง</span>
                                )}
                              </td>
                              <td>
                                {winner.result_type === '3straight_toad' ? (
                                  <span className="text-blue-600 font-bold">
                                    {winner.price}×{winner.price_toad}B
                                  </span>
                                ) : winner.result_type === '3straight_toad_toad_only' ? (
                                  <span className="text-purple-600 font-bold">
                                    {winner.price_toad > 0 ? `${winner.price_toad}B (โต๊ด)` : `${winner.price}B`}
                                  </span>
                                ) : (
                                  formatCurrency(winner.price)
                                )}
                              </td>
                              <td className="text-center">
                                {winner.final_payout_rate || winner.payout_rate}
                                {winner.is_half_price && (
                                  <span className="text-xs text-red-500 block">
                                    (เดิม: {winner.original_payout_rate || winner.payout_rate})
                                  </span>
                                )}
                              </td>
                              <td className="font-bold text-green-600">
                                {formatCurrency(winner.reward || winner.reward_amount)}
                              </td>
                              {isAdmin() && <td>{winner.agent_name}</td>}
                              <td>
                                <button
                                  onClick={() => viewReceipt(winner.bill_id)}
                                  className="btn btn-sm btn-outline-primary"
                                  title="ดูใบเสร็จ"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : winnersReport ? (
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">รายชื่อผู้ชนะ</h3>
                  </div>
                  <div className="card-body">
                    <div className="text-center py-8">
                      <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">ยังไม่มีผู้ชนะในงวดนี้</p>
                      <p className="text-gray-400 text-sm mt-2">เมื่อมีการออกผลรางวัลและมีผู้ชนะ จะแสดงรายการที่นี่</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">รายชื่อผู้ชนะ</h3>
                  </div>
                  <div className="card-body">
                    <div className="text-center py-8">
                      <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">ยังไม่ประกาศผล</p>
                      <p className="text-gray-400 text-sm mt-2">รอการประกาศผลรางวัลก่อนที่จะแสดงข้อมูลผู้ชนะ</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* เอา Daily Report ออกแล้ว - ข้อมูลซ้ำซ้อน */}
          {false && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card">
                  <div className="card-body">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DollarSign className="w-8 h-8 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">ยอดขาย</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(dailyReport.sales.total_amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-body">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Trophy className="w-8 h-8 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">เงินรางวัล</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(winnersReport?.summary?.total_reward || dailyReport.winners?.total_reward || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-body">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <BarChart3 className={`w-8 h-8 ${dailyReport.profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">กำไร/ขาดทุน</p>
                        <p className={`text-2xl font-bold ${dailyReport.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(dailyReport.profit)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-body">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Users className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">ผู้ชนะ</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {winnersReport?.summary?.total_winners || dailyReport.winners?.total_winners || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales by type */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">ยอดขายแยกตามประเภท</h3>
                </div>
                <div className="card-body p-0">
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ประเภทหวย</th>
                          <th>จำนวนตั๋ว</th>
                          <th>ยอดขาย</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyReport.sales.by_type.map((item) => (
                          <tr key={item.lotto_type}>
                            <td>
                              <span className="badge-primary">{item.type_name}</span>
                            </td>
                            <td>{formatNumber(item.ticket_count)}</td>
                            <td className="font-semibold">{formatCurrency(item.total_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Overview Report */}
          {activeTab === 'overview' && agentsReport && isAdmin() && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* ยอดขายรวม */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-1">ยอดขายรวม</p>
                      <p className="text-3xl font-bold text-green-900">
                        {formatCurrency(agentsReport.summary.total_sales)}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {formatNumber(agentsReport.summary.total_tickets)} ตั๋ว
                      </p>
                    </div>
                    <div className="bg-green-200 p-3 rounded-full">
                      <DollarSign className="w-8 h-8 text-green-700" />
                    </div>
                  </div>
                </div>

                {/* ยอดชนะรวม */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-700 mb-1">ยอดชนะรวม</p>
                      <p className="text-3xl font-bold text-red-900">
                        {formatCurrency(winnersReport?.summary?.total_reward || (agentsReport?.agents || []).reduce((sum, agent) => sum + (agent.stats?.total_reward || 0), 0))}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        {winnersReport?.summary?.total_winners || (agentsReport?.agents || []).reduce((sum, agent) => sum + (agent.stats?.total_winners || 0), 0)} รางวัล
                      </p>
                    </div>
                    <div className="bg-red-200 p-3 rounded-full">
                      <Trophy className="w-8 h-8 text-red-700" />
                    </div>
                  </div>
                </div>

                {/* ค่าคอมรวม */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-1">ค่าคอมรวม</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {formatCurrency((agentsReport?.agents || []).reduce((sum, agent) => {
                          const commission = (agent.stats?.total_sales || 0) * (agent.income || 0) / 100;
                          return sum + commission;
                        }, 0))}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {agentsReport?.summary?.active_agents || 0} ตัวแทนใช้งาน
                      </p>
                    </div>
                    <div className="bg-blue-200 p-3 rounded-full">
                      <Users className="w-8 h-8 text-blue-700" />
                    </div>
                  </div>
                </div>

                {/* กำไร/ขาดทุนรวม */}
                <div className={`bg-gradient-to-br ${((agentsReport?.summary?.total_sales || 0) - (winnersReport?.summary?.total_reward || (agentsReport?.agents || []).reduce((sum, agent) => sum + (agent.stats?.total_reward || 0), 0))) >= 0 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-orange-50 to-orange-100 border-orange-200'} rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium mb-1 ${((agentsReport?.summary?.total_sales || 0) - (winnersReport?.summary?.total_reward || (agentsReport?.agents || []).reduce((sum, agent) => sum + (agent.stats?.total_reward || 0), 0))) >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                        {((agentsReport?.summary?.total_sales || 0) - (winnersReport?.summary?.total_reward || (agentsReport?.agents || []).reduce((sum, agent) => sum + (agent.stats?.total_reward || 0), 0))) >= 0 ? 'กำไรรวม' : 'ขาดทุนรวม'}
                      </p>
                      <p className={`text-3xl font-bold ${((agentsReport?.summary?.total_sales || 0) - (winnersReport?.summary?.total_reward || (agentsReport?.agents || []).reduce((sum, agent) => sum + (agent.stats?.total_reward || 0), 0))) >= 0 ? 'text-emerald-900' : 'text-orange-900'}`}>
                        {formatCurrency(Math.abs((agentsReport?.summary?.total_sales || 0) - (winnersReport?.summary?.total_reward || (agentsReport?.agents || []).reduce((sum, agent) => sum + (agent.stats?.total_reward || 0), 0))))}
                      </p>
                      <p className={`text-xs mt-1 ${((agentsReport?.summary?.total_sales || 0) - (winnersReport?.summary?.total_reward || (agentsReport?.agents || []).reduce((sum, agent) => sum + (agent.stats?.total_reward || 0), 0))) >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {agentsReport?.summary?.total_agents || 0} ตัวแทนทั้งหมด
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${((agentsReport?.summary?.total_sales || 0) - (winnersReport?.summary?.total_reward || (agentsReport?.agents || []).reduce((sum, agent) => sum + (agent.stats?.total_reward || 0), 0))) >= 0 ? 'bg-emerald-200' : 'bg-orange-200'}`}>
                      <TrendingUp className={`w-8 h-8 ${((agentsReport?.summary?.total_sales || 0) - (winnersReport?.summary?.total_reward || (agentsReport?.agents || []).reduce((sum, agent) => sum + (agent.stats?.total_reward || 0), 0))) >= 0 ? 'text-emerald-700' : 'text-orange-700'}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Agents list */}
              {agentsReport && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">รายงานตัวแทน</h3>
                  </div>
                  <div className="card-body p-0">
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>รหัสตัวแทน</th>
                            <th>ชื่อ</th>
                            <th>สถานะ</th>
                            <th>สัดส่วน (%)</th>
                            <th>จำนวนตั๋ว</th>
                            <th>ยอดขาย</th>
                            <th>ค่าคอม</th>
                            <th>ผู้ชนะ</th>
                            <th>ยอดชนะ</th>
                            <th>กำไร/ขาดทุน</th>
                            <th>จำนวนบิล</th>
                            <th>ผู้ซื้อ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(agentsReport?.agents || []).map((agent) => {
                          const commission = (agent.stats?.total_sales || 0) * (agent.income || 0) / 100;
                          return (
                            <tr key={agent.agent_id}>
                              <td className="font-mono font-medium">{agent.agent_code}</td>
                              <td>{agent.agent_name}</td>
                              <td>
                                <span className={`badge ${agent.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                  {agent.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                                </span>
                              </td>
                              <td className="font-mono font-bold text-green-600">
                                {parseInt(agent.income || 0)}%
                              </td>
                              <td>{formatNumber(agent.stats?.total_tickets || 0)}</td>
                              <td className="font-semibold">{formatCurrency(agent.stats?.total_sales || 0)}</td>
                              <td className="font-semibold text-blue-600">{formatCurrency(commission)}</td>
                              <td className="text-center">
                                <span className="badge-info">
                                  {formatNumber(winnersReport ? getAgentWinnersFromReport(agent.agent_id).total_winners : (agent.stats?.total_winners || 0))}
                                </span>
                              </td>
                              <td className="font-semibold text-red-600">
                                {formatCurrency(winnersReport ? getAgentWinnersFromReport(agent.agent_id).total_reward : (agent.stats?.total_reward || 0))}
                              </td>
                              <td className={`font-bold ${winnersReport ?
                                ((agent.stats?.total_sales || 0) - getAgentWinnersFromReport(agent.agent_id).total_reward) >= 0 ? 'text-green-600' : 'text-red-600' :
                                (agent.stats?.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(winnersReport ?
                                  ((agent.stats?.total_sales || 0) - getAgentWinnersFromReport(agent.agent_id).total_reward) :
                                  (agent.stats?.profit_loss || 0))}
                              </td>
                              <td>{formatNumber(agent.stats?.total_bills || 0)}</td>
                              <td>{formatNumber(agent.stats?.total_buyers || 0)}</td>
                            </tr>
                          );
                        })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* User Report */}
      {activeTab === 'my-report' && userReport && (
        <div className="space-y-6">
          {/* Agent Info */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{userReport.agent_info.agent_name}</h3>
                  <p className="text-sm text-gray-500">รหัสตัวแทน: {userReport.agent_info.agent_code}</p>
                  <span className={`badge ${userReport.agent_info.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {userReport.agent_info.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* ยอดขายรวม */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">ยอดขายรวม</p>
                  <p className="text-3xl font-bold text-green-900">
                    {formatCurrency(userReport.summary.total_sales)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {formatNumber(userReport.summary.total_tickets)} ตั๋ว
                  </p>
                </div>
                <div className="bg-green-200 p-3 rounded-full">
                  <DollarSign className="w-8 h-8 text-green-700" />
                </div>
              </div>
            </div>

            {/* ยอดชนะ */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700 mb-1">ยอดชนะ</p>
                  <p className="text-3xl font-bold text-red-900">
                    {formatCurrency(userReport.summary.total_reward)}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {userReport.summary.total_winners || 0} รางวัล
                  </p>
                </div>
                <div className="bg-red-200 p-3 rounded-full">
                  <Trophy className="w-8 h-8 text-red-700" />
                </div>
              </div>
            </div>

            {/* ค่าคอมมิชชั่น */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">ค่าคอมมิชชั่น</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {formatCurrency((userReport.summary.total_sales || 0) * (userReport.agent_info.income || 0) / 100)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    สัดส่วน {parseInt(userReport.agent_info.income || 0)}%
                  </p>
                </div>
                <div className="bg-blue-200 p-3 rounded-full">
                  <Users className="w-8 h-8 text-blue-700" />
                </div>
              </div>
            </div>

            {/* กำไร/ขาดทุน */}
            <div className={`bg-gradient-to-br ${userReport.summary.profit_loss >= 0 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-orange-50 to-orange-100 border-orange-200'} rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium mb-1 ${userReport.summary.profit_loss >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                    {userReport.summary.profit_loss >= 0 ? 'กำไร' : 'ขาดทุน'}
                  </p>
                  <p className={`text-3xl font-bold ${userReport.summary.profit_loss >= 0 ? 'text-emerald-900' : 'text-orange-900'}`}>
                    {formatCurrency(Math.abs(userReport.summary.profit_loss))}
                  </p>
                  <p className={`text-xs mt-1 ${userReport.summary.profit_loss >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                    รหัส {userReport.agent_info.agent_code}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${userReport.summary.profit_loss >= 0 ? 'bg-emerald-200' : 'bg-orange-200'}`}>
                  <TrendingUp className={`w-8 h-8 ${userReport.summary.profit_loss >= 0 ? 'text-emerald-700' : 'text-orange-700'}`} />
                </div>
              </div>
            </div>
          </div>

          {/* รายงานผู้ชนะ - แบบเดียวกับ Admin แต่เฉพาะของตัวเอง */}
          {winnersReport && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">
                    สรุปผู้ชนะ
                  </h3>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary-600">{winnersReport.summary?.total_winners || winnersReport.winners?.length || 0}</p>
                      <p className="text-gray-600">ผู้ชนะทั้งหมด</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">
                        {formatCurrency(winnersReport.summary?.total_reward || winnersReport.winners?.reduce((sum, w) => sum + (w.reward || w.reward_amount || 0), 0) || 0)}
                      </p>
                      <p className="text-gray-600">เงินรางวัลรวม</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-600">
                        {winnersReport.summary?.winners_by_type?.length || 0}
                      </p>
                      <p className="text-gray-600">ประเภทที่มีผู้ชนะ</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Winners list */}
              {winnersReport.winners && winnersReport.winners.length > 0 ? (
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">รายชื่อผู้ชนะ</h3>
                  </div>
                  <div className="card-body p-0">
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>ลำดับ</th>
                            <th>ผู้ซื้อ</th>
                            <th>ประเภท</th>
                            <th>เลขที่แทง</th>
                            <th>ราคาแทง</th>
                            <th>อัตราจ่าย</th>
                            <th>เงินรางวัล</th>
                            <th>ดูใบเสร็จ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {winnersReport.winners.map((winner, index) => (
                            <tr key={winner.ticket_id || index}>
                              <td>{index + 1}</td>
                              <td className="font-medium">{winner.buyer_name}</td>
                              <td>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  winner.type_name === '2 ตัวบน' ? 'bg-blue-100 text-blue-600' :
                                  winner.type_name === '2 ตัวล่าง' ? 'bg-green-100 text-green-600' :
                                  winner.type_name === '3 ตัวตรง' ? 'bg-orange-100 text-orange-600' :
                                  winner.type_name === '3 ตัวโต๊ด' ? 'bg-yellow-100 text-yellow-600' :
                                  winner.type_name === 'วิ่งบน' ? 'bg-red-100 text-red-600' :
                                  winner.type_name === 'วิ่งล่าง' ? 'bg-pink-100 text-pink-600' :
                                  (winner.result_type === '3straight_toad' || winner.result_type === '3straight_toad_toad_only') ? 'bg-purple-100 text-purple-600' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {winner.result_type === '3straight_toad' ? 'ตรงโต๊ด' :
                                   winner.result_type === '3straight_toad_toad_only' ? 'โต๊ด (จากตรงโต๊ด)' :
                                   winner.type_name}
                                </span>
                              </td>
                              <td className="font-mono font-bold">
                                {winner.lotto_number}
                                {winner.is_half_price && (
                                  <span className="text-xs text-red-500 ml-1">จ่ายครึ่ง</span>
                                )}
                              </td>
                              <td>
                                {winner.result_type === '3straight_toad' ? (
                                  <span className="text-blue-600 font-bold">
                                    {winner.price}×{winner.price_toad}B
                                  </span>
                                ) : winner.result_type === '3straight_toad_toad_only' ? (
                                  <span className="text-purple-600 font-bold">
                                    {winner.price_toad > 0 ? `${winner.price_toad}B (โต๊ด)` : `${winner.price}B`}
                                  </span>
                                ) : (
                                  formatCurrency(winner.price)
                                )}
                              </td>
                              <td className="text-center">
                                {winner.final_payout_rate || winner.payout_rate}
                                {winner.is_half_price && (
                                  <span className="text-xs text-red-500 block">
                                    (เดิม: {winner.original_payout_rate || winner.payout_rate})
                                  </span>
                                )}
                              </td>
                              <td className="font-bold text-green-600">
                                {formatCurrency(winner.reward || winner.reward_amount)}
                              </td>
                              <td>
                                <button
                                  onClick={() => viewReceipt(winner.bill_id)}
                                  className="btn btn-sm btn-outline-primary"
                                  title="ดูใบเสร็จ"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">รายชื่อผู้ชนะ</h3>
                  </div>
                  <div className="card-body">
                    <div className="text-center py-8">
                      <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">ยังไม่มีผู้ชนะในงวดนี้</p>
                      <p className="text-gray-400 text-sm mt-2">เมื่อมีการออกผลรางวัลและมีผู้ชนะ จะแสดงรายการที่นี่</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Number Frequency Report */}
      {activeTab === 'number-frequency' && (
        <div className="space-y-6">
          {numberFrequencyReport ? (
            <>
              {/* Summary */}
              <div className="card">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        รายงานความถี่หมายเลขหวย
                      </h3>
                      <p className="text-sm text-gray-600">
                        แสดงหมายเลขที่มีการบันทึกมากที่สุด เรียงตามความถี่และยอดขายรวม
                      </p>
                    </div>
                    <button
                      onClick={exportNumberFrequencyCSV}
                      className="btn btn-outline-primary flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>ส่งออก CSV</span>
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary-600">
                        {numberFrequencyPagination.totalRecords || 0}
                      </p>
                      <p className="text-gray-600">จำนวนหมายเลขทั้งหมด</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">
                        {numberFrequencyReport.frequency?.[0]?.frequency || 0}
                      </p>
                      <p className="text-gray-600">ความถี่สูงสุด</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-600">
                        {formatCurrency(numberFrequencyReport.frequency?.[0]?.total_price || 0)}
                      </p>
                      <p className="text-gray-600">ยอดขายสูงสุด</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Type Filter and Data Tables */}
              <div className="card">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      อันดับหมายเลขที่มีความนิยมมากที่สุด
                    </h3>
                    
                    {/* Type Filter */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleTypeFilter('all')}
                        className={`px-3 py-2 rounded text-sm font-medium ${
                          selectedLottoType === 'all'
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        ทั้งหมด
                      </button>
                      <button
                        onClick={() => handleTypeFilter('2digit')}
                        className={`px-3 py-2 rounded text-sm font-medium ${
                          selectedLottoType === '2digit'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        2 ตัว
                      </button>
                      <button
                        onClick={() => handleTypeFilter('3digit')}
                        className={`px-3 py-2 rounded text-sm font-medium ${
                          selectedLottoType === '3digit'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        3 ตัว
                      </button>
                      <button
                        onClick={() => handleTypeFilter('run')}
                        className={`px-3 py-2 rounded text-sm font-medium ${
                          selectedLottoType === 'run'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        เลขวิ่ง
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    แสดงหน้า {numberFrequencyPagination.currentPage} จาก {numberFrequencyPagination.totalPages} (ระเบียนที่ {((numberFrequencyPagination.currentPage - 1) * numberFrequencyPagination.limit) + 1}-{Math.min(numberFrequencyPagination.currentPage * numberFrequencyPagination.limit, numberFrequencyPagination.totalRecords)} จาก {numberFrequencyPagination.totalRecords} รายการ)
                  </p>
                </div>
                <div className="card-body p-0">
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>อันดับ</th>
                          <th>หมายเลข</th>
                          <th>ประเภท</th>
                          <th>ความถี่</th>
                          <th>ยอดขายรวม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {numberFrequencyReport.frequency.map((item, index) => {
                          const globalRank = ((numberFrequencyPagination.currentPage - 1) * numberFrequencyPagination.limit) + index + 1;
                          return (
                            <tr key={`${item.lotto_number}-${item.lotto_type}`}>
                              <td>
                                <span className="inline-flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-800 text-sm font-bold rounded-full">
                                  {globalRank}
                                </span>
                              </td>
                              <td>
                                <span className="font-mono font-bold text-lg text-gray-900">
                                  {item.lotto_number}
                                </span>
                              </td>
                              <td>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  item.lotto_type === '2up' ? 'bg-blue-100 text-blue-600' :
                                  item.lotto_type === '2down' ? 'bg-green-100 text-green-600' :
                                  item.lotto_type === '3up' ? 'bg-orange-100 text-orange-600' :
                                  item.lotto_type === '3toad' ? 'bg-yellow-100 text-yellow-600' :
                                  item.lotto_type === 'runup' ? 'bg-red-100 text-red-600' :
                                  item.lotto_type === 'rundown' ? 'bg-pink-100 text-pink-600' :
                                  item.lotto_type === '3straight_toad' ? 'bg-purple-100 text-purple-600' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {item.type_name}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-center">
                                  <span className="text-2xl font-bold text-green-600">
                                    {item.frequency}
                                  </span>
                                  <span className="text-sm text-gray-500 ml-1">ครั้ง</span>
                                </div>
                              </td>
                              <td>
                                <span className="font-semibold text-blue-600">
                                  {formatCurrency(item.total_price)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  {numberFrequencyPagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          แสดง {((numberFrequencyPagination.currentPage - 1) * numberFrequencyPagination.limit) + 1} ถึง {Math.min(numberFrequencyPagination.currentPage * numberFrequencyPagination.limit, numberFrequencyPagination.totalRecords)} จาก {numberFrequencyPagination.totalRecords} รายการ
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePageChange(numberFrequencyPagination.currentPage - 1)}
                            disabled={numberFrequencyPagination.currentPage === 1}
                            className="btn btn-sm btn-outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            ก่อนหน้า
                          </button>
                          
                          {/* Page numbers */}
                          <div className="flex space-x-1">
                            {[...Array(Math.min(5, numberFrequencyPagination.totalPages))].map((_, i) => {
                              let pageNum;
                              if (numberFrequencyPagination.totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (numberFrequencyPagination.currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (numberFrequencyPagination.currentPage >= numberFrequencyPagination.totalPages - 2) {
                                pageNum = numberFrequencyPagination.totalPages - 4 + i;
                              } else {
                                pageNum = numberFrequencyPagination.currentPage - 2 + i;
                              }
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => handlePageChange(pageNum)}
                                  className={`px-3 py-1 text-sm rounded ${
                                    pageNum === numberFrequencyPagination.currentPage
                                      ? 'bg-primary-500 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>
                          
                          <button
                            onClick={() => handlePageChange(numberFrequencyPagination.currentPage + 1)}
                            disabled={numberFrequencyPagination.currentPage === numberFrequencyPagination.totalPages}
                            className="btn btn-sm btn-outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ถัดไป
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <div className="card-body text-center py-12">
                <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">ไม่มีข้อมูล</p>
                <p className="text-gray-400 text-sm mt-2">ยังไม่มีการบันทึกหวยในระบบ</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && billDetails && (
        <ReceiptModal
          isOpen={showReceiptModal}
          billData={billDetails}
          onClose={() => {
            setShowReceiptModal(false)
            setSelectedBillId(null)
            setBillDetails(null)
          }}
        />
      )}
    </div>
  )
}

export default ReportsPage
