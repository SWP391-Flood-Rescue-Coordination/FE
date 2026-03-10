import { useCallback, useEffect, useRef, useState } from 'react'
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
  UserCircleIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import managerService from '../services/managerService'
import './ManagerDashboardPage.css'

function ManagerDashboardPage() {
  const navigate = useNavigate()
  const userMenuRef = useRef(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentUser] = useState(() => authService.getUserInfo())
  const [showUserMenu, setShowUserMenu] = useState(false)
  
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

  // Monthly stats - Mock data for charts
  const [monthlyStats] = useState({
    requestsServed: [12, 19, 15, 25, 22, 30, 28, 35, 32, 38, 42, 45, 48, 52, 49, 55, 58, 62, 65, 68, 70, 72, 75, 78, 80, 82, 85, 87, 90],
    suppliesDistributed: [150, 180, 160, 220, 200, 250, 240, 280, 270, 300, 320, 340, 350, 370, 360, 390, 400, 420, 440, 460, 480, 500, 520, 540, 560, 580, 600, 620, 640],
    peopleHelped: [45, 52, 48, 65, 60, 75, 70, 85, 80, 95, 100, 110, 105, 120, 115, 130, 135, 145, 150, 160, 165, 175, 180, 190, 195, 205, 210, 220, 225],
    vehiclesUsed: [3, 4, 3, 5, 4, 6, 5, 6, 5, 7, 6, 7, 7, 8, 7, 8, 8, 9, 9, 10, 9, 10, 10, 11, 10, 11, 11, 12, 12],
    days: Array.from({ length: 29 }, (_, i) => i + 1),
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
          managerService.getAllVehicles('AVAILABLE'),
          managerService.getAllVehicles('INUSE'),
          managerService.getAllVehicles('MAINTENANCE'),
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

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  const handleToggleUserMenu = () => {
    setShowUserMenu((prev) => !prev)
  }

  const handleLogout = () => {
    authService.logout()
    setShowUserMenu(false)
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

  const handleNavigateToImportReceipt = () => {
    navigate('/manager/import-receipt')
  }

  const handleNavigateToImportReceiptsList = () => {
    navigate('/manager/import-receipts')
  }

  const handleNavigateToReliefExport = () => {
    navigate('/manager/relief-export')
  }

  // Chart rendering helper functions
  const renderLineChart = (data, color = '#667eea') => {
    const maxValue = Math.max(...data)
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = 100 - (value / maxValue) * 80
      return `${x},${y}`
    }).join(' ')

    return (
      <svg viewBox="0 0 100 100" className="line-chart" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    )
  }

  const renderBarChart = (data, colors = ['#667eea', '#764ba2']) => {
    const maxValue = Math.max(...data)
    const barWidth = 100 / data.length - 1
    
    return (
      <svg viewBox="0 0 100 100" className="bar-chart" preserveAspectRatio="none">
        {data.map((value, index) => {
          const height = (value / maxValue) * 90
          const x = index * (100 / data.length)
          const y = 100 - height
          const color = colors[index % colors.length]
          
          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={height}
              fill={color}
              opacity="0.8"
            />
          )
        })}
      </svg>
    )
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
        <div className="header-buttons">
          <button className="btn-create-receipt" onClick={handleNavigateToImportReceipt}>
            <ClipboardDocumentListIcon className="icon" />
            Tạo phiếu nhập 
          </button>
          <button className="btn-relief-export" onClick={handleNavigateToReliefExport}>
            <TruckIcon className="icon" />
            Tạo phiếu xuất 
          </button>
          <button className="btn-view-receipts" onClick={handleNavigateToImportReceiptsList}>
            <DocumentTextIcon className="icon" />
            Xem phiếu 
          </button>
          <div className="auth-user-group" ref={userMenuRef}>
            <button
              type="button"
              className="icon-circle-button user-icon-button"
              onClick={handleToggleUserMenu}
              aria-label="Thông tin người dùng"
            >
              <UserCircleIcon className="header-icon" />
            </button>
            <button
              type="button"
              className="icon-circle-button logout-icon-button"
              onClick={handleLogout}
              aria-label="Đăng xuất"
            >
              <ArrowLeftOnRectangleIcon className="header-icon" />
            </button>

            {showUserMenu && (
              <div className="user-menu-card">
                <h3>Thông tin tài khoản</h3>
                <div className="user-info-row">
                  <span>Tên tài khoản</span>
                  <strong>{currentUser?.username || '-'}</strong>
                </div>
                <div className="user-info-row">
                  <span>Họ Tên</span>
                  <strong>{currentUser?.fullName || '-'}</strong>
                </div>
                <div className="user-info-row">
                  <span>Email</span>
                  <strong>{currentUser?.email || '-'}</strong>
                </div>
                <div className="user-info-row">
                  <span>Vai trò</span>
                  <strong>Quản lý</strong>
                </div>
              </div>
            )}
          </div>
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

        {/* Section: Hoạt động trong tháng */}
        <section className="dashboard-section monthly-section">
          <div className="section-header">
            <h2>Hoạt động trong tháng</h2>
            <span className="date-badge">Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</span>
          </div>
          
          <div className="charts-container">
            {/* Line Charts */}
            <div className="chart-group">
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Requests đã cấp hàng</h3>
                  <span className="chart-total">{monthlyStats.requestsServed.reduce((a, b) => a + b, 0)}</span>
                </div>
                <div className="chart-wrapper">
                  {renderLineChart(monthlyStats.requestsServed, '#667eea')}
                </div>
                <div className="chart-label">Trong {monthlyStats.days.length} ngày</div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <h3>Người được hỗ trợ</h3>
                  <span className="chart-total">{monthlyStats.peopleHelped.reduce((a, b) => a + b, 0)}</span>
                </div>
                <div className="chart-wrapper">
                  {renderLineChart(monthlyStats.peopleHelped, '#10b981')}
                </div>
                <div className="chart-label">Trong {monthlyStats.days.length} ngày</div>
              </div>
            </div>

            {/* Bar Charts */}
            <div className="chart-group">
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Vật tư đã phát</h3>
                  <span className="chart-total">{monthlyStats.suppliesDistributed.reduce((a, b) => a + b, 0)}</span>
                </div>
                <div className="chart-wrapper">
                  {renderBarChart(monthlyStats.suppliesDistributed.slice(-7), ['#667eea', '#764ba2'])}
                </div>
                <div className="chart-label">7 ngày gần nhất</div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <h3>Vehicles sử dụng</h3>
                  <span className="chart-total">{monthlyStats.vehiclesUsed.reduce((a, b) => a + b, 0)}</span>
                </div>
                <div className="chart-wrapper">
                  {renderBarChart(monthlyStats.vehiclesUsed.slice(-7), ['#f59e0b', '#ef4444'])}
                </div>
                <div className="chart-label">7 ngày gần nhất</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ManagerDashboardPage
