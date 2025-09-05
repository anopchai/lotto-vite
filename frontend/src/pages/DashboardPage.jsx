import { useState, useEffect, useMemo } from 'react'
import { 
  Ticket, 
  DollarSign, 
  Users, 
  Trophy,
  TrendingUp,
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { reportsAPI, settingsAPI, resultsAPI, periodAPI, halfPriceAPI } from '../services/api'
import { formatCurrency, formatNumber, formatDate } from '../utils/helpers'
import LoadingSpinner from '../components/LoadingSpinner'

const DashboardPage = () => {
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [agentsReport, setAgentsReport] = useState(null)
  const [winnersReport, setWinnersReport] = useState(null)
  const [systemStatus, setSystemStatus] = useState(null)
  const [latestResult, setLatestResult] = useState(null)
  const [halfPriceNumbers, setHalfPriceNumbers] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // โหลดสถานะระบบ
      const statusResponse = await settingsAPI.getSystemStatus()
      setSystemStatus(statusResponse.data.data)

      // หา period_id ปัจจุบันและ open period (ใช้แพทเทิร์นเดียวกับ SettingsPage)
      let currentPeriodId = null
      let openPeriod = null
      
      try {
        const [periodsResponse, openPeriodResponse] = await Promise.all([
          periodAPI.getAll(),
          periodAPI.getOpenPeriod().catch(() => ({ data: { data: null } }))
        ])
        
        const currentPeriod = periodsResponse.data.data.find(p => p.is_current === 1)
        currentPeriodId = currentPeriod?.id
        openPeriod = openPeriodResponse.data.data
        
        // Period information loaded
      } catch (error) {
        // Could not get period information
      }

      // โหลดข้อมูลสถิติและผลรางวัล
      if (isAdmin()) {
        const [dailyResponse, resultResponse, agentsResponse, winnersResponse] = await Promise.all([
          reportsAPI.getDaily(currentPeriodId ? { period_id: currentPeriodId } : {}),
          resultsAPI.getLatest().catch(() => ({ data: { data: null } })),
          reportsAPI.getAgents({}).catch(() => ({ data: { data: null } })),
          reportsAPI.getWinners({}).catch(() => ({ data: { data: null } }))
        ])

        setStats(dailyResponse.data.data)
        setLatestResult(resultResponse.data.data)
        setAgentsReport(agentsResponse.data.data)
        setWinnersReport(winnersResponse.data.data)
      } else {
        // สำหรับ User
        const [userResponse, resultResponse] = await Promise.all([
          reportsAPI.getUser({}).catch(() => ({ data: { data: null } })),
          resultsAPI.getLatest().catch(() => ({ data: { data: null } }))
        ])

        setStats(userResponse.data.data)
        setLatestResult(resultResponse.data.data)
        
        // สำหรับ User ใช้ข้อมูลจาก userResponse
        setAgentsReport({
          summary: {
            total_sales: parseFloat(userResponse.data.data?.summary?.total_sales || 0),
            total_bills: userResponse.data.data?.summary?.total_bills || 0
          },
          agents: [{
            stats: {
              total_reward: userResponse.data.data?.summary?.total_reward || 0
            }
          }]
        })
      }

      // โหลดเลขจ่ายครึ่งราคา (ใช้แพทเทิร์นเดียวกับ SettingsPage)
      await loadHalfPriceNumbers(openPeriod)

    } catch (error) {
      // Error loading dashboard data
    } finally {
      setLoading(false)
    }
  }

  // ฟังก์ชันโหลดเลขจ่ายครึ่งราคา (ใช้แพทเทิร์นเดียวกับ SettingsPage)
  const loadHalfPriceNumbers = async (openPeriod = null) => {
    try {
      let halfPriceData = []
      
      if (openPeriod?.period_name) {
        // ใช้ API เดียวกับ SettingsPage: getByPeriodName
        const response = await halfPriceAPI.getByPeriodName(openPeriod.period_name)
        halfPriceData = response.data.data || []
      } else {
        // ถ้าไม่มี open period ให้ลองใช้ getAll เป็นทางเลือก
        const response = await halfPriceAPI.getAll().catch(() => ({ data: { data: [] } }))
        halfPriceData = response.data.data || []
      }
      
      // Half price data loaded successfully
      
      setHalfPriceNumbers(halfPriceData)
    } catch (error) {
      // Error loading half price numbers
      setHalfPriceNumbers([])
    }
  }

  // Calculate filtered half price numbers with useMemo for performance (matching SettingsPage pattern)
  const twoDigitNumbers = useMemo(() => {
    const filtered = halfPriceNumbers.filter(item =>
      ['2up', '2down'].includes(item.lotto_type) || item.number?.length === 2
    )

    return filtered
  }, [halfPriceNumbers])
  
  const threeDigitNumbers = useMemo(() => {
    const filtered = halfPriceNumbers.filter(item =>
      ['3up', '3toad', '3straight_toad'].includes(item.lotto_type) || item.number?.length === 3
    )

    return filtered
  }, [halfPriceNumbers])
  
  const runNumbers = useMemo(() => {
    const filtered = halfPriceNumbers.filter(item =>
      item.lotto_type === 'runup' || item.lotto_type === 'rundown' || 
      item.lotto_type === 'run_up' || item.lotto_type === 'run_down'
    )

    return filtered
  }, [halfPriceNumbers])

  if (loading) {
    return <LoadingSpinner text="กำลังโหลดข้อมูล..." />
  }



  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">แดชบอร์ด</h1>
          <p className="text-gray-600">ยินดีต้อนรับ, {user?.agent_name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">วันที่</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatDate(new Date(), 'dd MMMM yyyy')}
          </p>
        </div>
      </div>

      {/* System status alert */}
      {systemStatus && (
        <div className={`p-4 rounded-lg border ${
          systemStatus.is_open 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center">
            <AlertCircle className={`w-5 h-5 mr-3 ${
              systemStatus.is_open ? 'text-green-600' : 'text-red-600'
            }`} />
            <div>
              <p className={`font-medium ${
                systemStatus.is_open ? 'text-green-800' : 'text-red-800'
              }`}>
                สถานะระบบ: {systemStatus.is_open ? 'เปิดรับแทง' : 'ปิดรับแทง'}
              </p>
              <p className={`text-sm ${
                systemStatus.is_open ? 'text-green-600' : 'text-red-600'
              }`}>
                งวดปัจจุบัน: {systemStatus.current_period}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">ยอดขายรวม</p>
              <p className="text-3xl font-bold mt-2">
                {formatCurrency(agentsReport?.summary?.total_sales || 0)}
              </p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-full p-3">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">ยอดชนะรวม</p>
              <p className="text-3xl font-bold mt-2">
                {formatCurrency(winnersReport?.summary?.total_reward || agentsReport?.agents?.reduce((sum, agent) => sum + (agent.stats.total_reward || 0), 0) || 0)}
              </p>
            </div>
            <div className="bg-red-400 bg-opacity-30 rounded-full p-3">
              <Trophy className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br ${(() => {
          const totalSales = agentsReport?.summary?.total_sales || 0;
          const totalReward = winnersReport?.summary?.total_reward || agentsReport?.agents?.reduce((sum, agent) => sum + (agent.stats.total_reward || 0), 0) || 0;
          const profit = totalSales - totalReward;
          return profit >= 0 ? 'from-green-500 to-green-600' : 'from-orange-500 to-orange-600';
        })()} rounded-xl shadow-lg p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`${(() => {
                const totalSales = agentsReport?.summary?.total_sales || 0;
                const totalReward = winnersReport?.summary?.total_reward || agentsReport?.agents?.reduce((sum, agent) => sum + (agent.stats.total_reward || 0), 0) || 0;
                const profit = totalSales - totalReward;
                return profit >= 0 ? 'text-green-100' : 'text-orange-100';
              })()} text-sm font-medium`}>
                {(() => {
                  const totalSales = agentsReport?.summary?.total_sales || 0;
                  const totalReward = winnersReport?.summary?.total_reward || agentsReport?.agents?.reduce((sum, agent) => sum + (agent.stats.total_reward || 0), 0) || 0;
                  const profit = totalSales - totalReward;
                  return profit >= 0 ? "กำไรรวม" : "ขาดทุนรวม";
                })()}
              </p>
              <p className="text-3xl font-bold mt-2">
                {formatCurrency(Math.abs((() => {
                  const totalSales = agentsReport?.summary?.total_sales || 0;
                  const totalReward = winnersReport?.summary?.total_reward || agentsReport?.agents?.reduce((sum, agent) => sum + (agent.stats.total_reward || 0), 0) || 0;
                  return totalSales - totalReward;
                })()))}
              </p>
            </div>
            <div className={`${(() => {
              const totalSales = agentsReport?.summary?.total_sales || 0;
              const totalReward = winnersReport?.summary?.total_reward || agentsReport?.agents?.reduce((sum, agent) => sum + (agent.stats.total_reward || 0), 0) || 0;
              const profit = totalSales - totalReward;
              return profit >= 0 ? 'bg-green-400' : 'bg-orange-400';
            })()} bg-opacity-30 rounded-full p-3`}>
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">จำนวนบิล</p>
              <p className="text-3xl font-bold mt-2">
                {formatNumber(agentsReport?.summary?.total_bills || 0)}
              </p>
            </div>
            <div className="bg-purple-400 bg-opacity-30 rounded-full p-3">
              <Users className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest result */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              ผลรางวัลล่าสุด
            </h3>
          </div>
          <div className="card-body">
            {latestResult ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">งวดที่:</span>
                  <span className="font-semibold">{latestResult.period}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">วันที่ประกาศ:</span>
                  <span className="font-semibold">{formatDate(latestResult.result_date)}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {latestResult.result_2up && (
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium">2 ตัวบน</p>
                      <p className="text-xl font-bold text-blue-800">{latestResult.result_2up}</p>
                    </div>
                  )}
                  {latestResult.result_2down && (
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-600 font-medium">2 ตัวล่าง</p>
                      <p className="text-xl font-bold text-green-800">{latestResult.result_2down}</p>
                    </div>
                  )}
                  {latestResult.result_3up && (
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <p className="text-xs text-yellow-600 font-medium">3 ตัวบน</p>
                      <p className="text-xl font-bold text-yellow-800">{latestResult.result_3up}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">ยังไม่มีการประกาศผลรางวัล</p>
              </div>
            )}
          </div>
        </div>

        {/* Sales by type */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              ยอดขายแยกตามประเภท
            </h3>
          </div>
          <div className="card-body">
            {(stats?.sales?.by_type?.length > 0 || stats?.sales_by_type?.length > 0) ? (
              <div className="space-y-3">
                {(stats?.sales?.by_type || stats?.sales_by_type || []).map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{item.type_name}</span>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(item.total_amount)}</p>
                      <p className="text-xs text-gray-500">{item.ticket_count} ตั๋ว</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">ยังไม่มีข้อมูลการขาย</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Half price numbers */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            เลขจ่ายครึ่งราคา
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            รายการเลขหวยที่จ่ายครึ่งราคาสำหรับงวดปัจจุบัน
          </p>
        </div>
        <div className="card-body">
          {halfPriceNumbers.length > 0 ? (
            <div className="space-y-6">
              {/* เลข 2 ตัว */}
              {twoDigitNumbers.length > 0 ? (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mr-2">
                      เลข 2 ตัว
                    </span>
                    <span className="text-sm text-gray-600">
                      (ใช้ได้ทั้ง 2 ตัวบน และ 2 ตัวล่าง)
                    </span>
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {twoDigitNumbers.map((item, index) => (
                      <div key={index} className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-lg font-bold text-blue-800">{item.number}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* เลข 3 ตัว */}
              {threeDigitNumbers.length > 0 ? (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm mr-2">
                      เลข 3 ตัว
                    </span>
                    <span className="text-sm text-gray-600">
                      (ใช้ได้ทั้ง 3 ตัวตรง และ 3 ตัวตรงโต๊ด)
                    </span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {threeDigitNumbers.map((item, index) => (
                      <div key={index} className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-lg font-bold text-green-800">{item.number}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* เลขวิ่ง */}
              {runNumbers.length > 0 ? (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm mr-2">
                      เลขวิ่ง
                    </span>
                    <span className="text-sm text-gray-600">
                      (วิ่งบน และ วิ่งล่าง)
                    </span>
                  </h4>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                    {runNumbers.map((item, index) => (
                      <div key={index} className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-lg font-bold text-purple-800">{item.number}</p>
                        <p className="text-xs text-purple-600">{item.lotto_type_name || item.lotto_type}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">ยังไม่มีเลขจ่ายครึ่งราคา</p>
              <p className="text-xs text-gray-400 mt-2">
                เลขจ่ายครึ่งราคาจะแสดงที่นี่เมื่อมีการเพิ่มในระบบ
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">การดำเนินการด่วน</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/ticket"
              className="flex flex-col items-center p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              <Ticket className="w-8 h-8 text-primary-600 mb-2" />
              <span className="text-sm font-medium text-primary-900">บันทึกหวย</span>
            </a>
            <a
              href="/bills"
              className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Users className="w-8 h-8 text-green-600 mb-2" />
              <span className="text-sm font-medium text-green-900">รายการบิล</span>
            </a>
            <a
              href="/results"
              className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <Trophy className="w-8 h-8 text-yellow-600 mb-2" />
              <span className="text-sm font-medium text-yellow-900">ผลรางวัล</span>
            </a>
            <a
              href="/reports"
              className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-purple-900">รายงาน</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
