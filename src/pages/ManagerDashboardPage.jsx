import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftOnRectangleIcon,
  ArrowPathIcon,
  TruckIcon,
  CubeIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import managerService from '../services/managerService'
import './ManagerDashboardPage.css'

function ManagerDashboardPage() {
  const navigate = useNavigate()
  
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentUser] = useState(() => authService.getUserInfo())
  
  // Vehicle stats
  const [vehicleStats, setVehicleStats] = useState({
    total: 0,
    available: 0,
    inUse: 0,
    maintenance: 0,
  })
  
  // Supply stats
  const [supplyStats, setSupplyStats] = useState({
    totalTypes: 0,
    lowStock: 0,
  })
  
  // Today stats
  const [todayStats, setTodayStats] = useState({
    requestsServed: 0,
    peopleHelped: 0,
    suppliesDistributed: 0,
    vehiclesUsed: 0,
    consumptionRate: 0,
  })

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      // Fetch tất cả stats song song
      const [vehicles, supplies, today] = await Promise.allSettled([
        // Vehicle stats
        Promise.all([
          managerService.getAllVehicles(''),
          managerService.getAllVehicles('Available'),
          managerService.getAllVehicles('InUse'),
          managerService.getAllVehicles('Maintenance'),
        ]),
        // Supply stats (fallback nếu API chưa có)
        managerService.getSupplyStats().catch(() => ({ totalTypes: 0, lowStock: 0 })),
        // Today stats (fallback nếu API chưa có)
        managerService.getTodayStats().catch(() => ({
          requestsServed: 0,
          peopleHelped: 0,
          suppliesDistributed: 0,
          vehiclesUsed: 0,
          consumptionRate: 0,
        })),
      ])

      // Check unauthorized
      const hasUnauthorized = [vehicles, supplies, today].some(
        (result) => result.status === 'rejected' && result.reason?.response?.status === 401
      )
      
      if (hasUnauthorized) {
        navigate('/login', { replace: true })
        return
      }

      // Process vehicle stats
      if (vehicles.status === 'fulfilled') {
        const [allVehicles, availableVehicles, inUseVehicles, maintenanceVehicles] = vehicles.value
        setVehicleStats({
          total: Array.isArray(allVehicles) ? allVehicles.length : 0,
          available: Array.isArray(availableVehicles) ? availableVehicles.length : 0,
          inUse: Array.isArray(inUseVehicles) ? inUseVehicles.length : 0,
          maintenance: Array.isArray(maintenanceVehicles) ? maintenanceVehicles.length : 0,
        })
      }

      // Process supply stats
      if (supplies.status === 'fulfilled') {
        setSupplyStats(supplies.value)
      }

      // Process today stats
      if (today.status === 'fulfilled') {
        setTodayStats(today.value)
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setErrorMessage('Không thể tải dữ liệu dashboard. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    // Check authorization
    if (!authService.isAuthenticated()) {
      navigate('/login', { replace: true })
      return
    }

    const roleKey = String(currentUser?.role ?? '').toUpperCase()
    if (roleKey !== 'MANAGER' && roleKey !== 'ADMIN') {
      navigate('/', { replace: true })
      return
    }

    fetchDashboardData()

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchDashboardData, 60000)
    return () => clearInterval(interval)
  }, [currentUser, navigate, fetchDashboardData])

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  const handleNavigateToVehicles = () => {
    navigate('/manager/vehicles')
  }

  const handleNavigateToSupplies = () => {
    navigate('/manager/supplies')
  }

  const handleNavigateToLowStockSupplies = () => {
    navigate('/manager/supplies?filter=lowStock')
  }

  if (isLoading) {
    return (
      <div className="manager-dashboard">
        <header className="manager-header">
          <h1>Manager Dashboard</h1>
          <div className="header-actions">
            <button className="logout-button" onClick={handleLogout}>
              <ArrowLeftOnRectangleIcon className="icon" />
              Đăng xuất
            </button>
          </div>
        </header>
        <div className="manager-content loading">
          <div className="loading-spinner">
            <ArrowPathIcon className="spinner-icon" />
            <p>Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="manager-dashboard">
      <header className="manager-header">
        <h1>Manager Dashboard</h1>
        <div className="header-info">
          <span className="user-name">{currentUser?.fullName || 'Manager'}</span>
          <button className="refresh-button" onClick={fetchDashboardData} title="Làm mới">
            <ArrowPathIcon className="icon" />
          </button>
          <button className="logout-button" onClick={handleLogout}>
            <ArrowLeftOnRectangleIcon className="icon" />
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="manager-content">
        {errorMessage && (
          <div className="error-banner">
            <ExclamationTriangleIcon className="icon" />
            {errorMessage}
          </div>
        )}

        {/* Section: Phương tiện */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Phương tiện</h2>
            <button className="view-details-btn" onClick={handleNavigateToVehicles}>
              Chi tiết →
            </button>
          </div>
          <div className="metrics-grid">
            <div className="metric-card primary" onClick={handleNavigateToVehicles}>
              <div className="metric-icon">
                <TruckIcon className="icon" />
              </div>
              <div className="metric-content">
                <div className="metric-value">{vehicleStats.total}</div>
                <div className="metric-label">Tổng phương tiện</div>
              </div>
            </div>

            <div className="metric-card success">
              <div className="metric-icon">
                <CheckCircleIcon className="icon" />
              </div>
              <div className="metric-content">
                <div className="metric-value">{vehicleStats.available}</div>
                <div className="metric-label">Đang sẵn sàng</div>
              </div>
            </div>

            <div className="metric-card info">
              <div className="metric-icon">
                <ArrowPathIcon className="icon" />
              </div>
              <div className="metric-content">
                <div className="metric-value">{vehicleStats.inUse}</div>
                <div className="metric-label">Đang sử dụng</div>
              </div>
            </div>

            <div className="metric-card warning">
              <div className="metric-icon">
                <WrenchScrewdriverIcon className="icon" />
              </div>
              <div className="metric-content">
                <div className="metric-value">{vehicleStats.maintenance}</div>
                <div className="metric-label">Báo trì</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Vật tư */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Vật tư</h2>
            <button className="view-details-btn" onClick={handleNavigateToSupplies}>
              Chi tiết →
            </button>
          </div>
          <div className="metrics-grid">
            <div className="metric-card primary" onClick={handleNavigateToSupplies}>
              <div className="metric-icon">
                <CubeIcon className="icon" />
              </div>
              <div className="metric-content">
                <div className="metric-value">{supplyStats.totalTypes}</div>
                <div className="metric-label">Tổng loại vật tư</div>
              </div>
            </div>

            <div className="metric-card danger" onClick={handleNavigateToLowStockSupplies}>
              <div className="metric-icon">
                <ExclamationTriangleIcon className="icon" />
              </div>
              <div className="metric-content">
                <div className="metric-value">{supplyStats.lowStock}</div>
                <div className="metric-label">Vật tư sắp hết</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Hoạt động hôm nay */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Hoạt động hôm nay</h2>
            <span className="date-badge">{new Date().toLocaleDateString('vi-VN')}</span>
          </div>
          <div className="metrics-grid today-metrics">
            <div className="metric-card">
              <div className="metric-icon">
                <CheckCircleIcon className="icon" />
              </div>
              <div className="metric-content">
                <div className="metric-value">{todayStats.requestsServed}</div>
                <div className="metric-label">Số request đã cấp hàng hôm nay</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <UserGroupIcon className="icon" />
              </div>
              <div className="metric-content">
                <div className="metric-value">{todayStats.peopleHelped}</div>
                <div className="metric-label">Người được hỗ trợ hôm nay</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <CubeIcon className="icon" />
              </div>
              <div className="metric-content">
                <div className="metric-value">{todayStats.suppliesDistributed}</div>
                <div className="metric-label">Vật tư đã phát hôm nay</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <TruckIcon className="icon" />
              </div>
              <div className="metric-content">
                <div className="metric-value">{todayStats.vehiclesUsed}</div>
                <div className="metric-label">Số dụng vehicle hôm nay</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <ChartBarIcon className="icon" />
              </div>
              <div className="metric-content">
                <div className="metric-value">{todayStats.consumptionRate}%</div>
                <div className="metric-label">Tỷ lệ tiêu thụ hôm nay</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ManagerDashboardPage
