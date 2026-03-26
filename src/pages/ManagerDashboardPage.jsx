import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftOnRectangleIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  TruckIcon,
  CubeIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  UserCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import managerService from '../services/managerService'
import './ManagerDashboardPage.css'

const formatNumberVN = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '0'
  }

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(numeric)
}

const toChartItems = (entries) => {
  const normalizedEntries = entries.map((entry) => ({
    ...entry,
    value: Math.max(0, Number(entry?.value) || 0),
  }))
  const maxValue = Math.max(...normalizedEntries.map((entry) => entry.value), 0)

  return normalizedEntries.map((entry) => ({
    ...entry,
    heightPercent: maxValue > 0 ? Math.max((entry.value / maxValue) * 100, entry.value > 0 ? 16 : 0) : 0,
  }))
}

// Dashboard manager là điểm vào để xem số liệu xe, vật tư và điều hướng sang các page nghiệp vụ.
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

  const vehicleChartItems = useMemo(() => {
    const totalVehicles = Number(vehicleStats?.total) || 0
    const availableVehicles = Number(vehicleStats?.available) || 0
    const inUseVehicles = Number(vehicleStats?.inUse) || 0
    const maintenanceVehicles = Number(vehicleStats?.maintenance) || 0
    const trackedVehicles = availableVehicles + inUseVehicles + maintenanceVehicles
    const otherVehicles = Math.max(totalVehicles - trackedVehicles, 0)
    const chartItems = [
      { key: 'available', label: 'Sẵn sàng', value: availableVehicles, tone: 'success' },
      { key: 'inUse', label: 'Đang dùng', value: inUseVehicles, tone: 'info' },
      { key: 'maintenance', label: 'Bảo trì', value: maintenanceVehicles, tone: 'warning' },
    ]

    if (otherVehicles > 0) {
      chartItems.push({ key: 'other', label: 'Khác', value: otherVehicles, tone: 'neutral' })
    }

    return toChartItems(chartItems)
  }, [vehicleStats])

  const supplyChartItems = useMemo(() => {
    const totalSupplyTypes = Number(supplyStats?.totalTypes) || 0
    const lowStockSupplies = Number(supplyStats?.lowStock) || 0

    return toChartItems([
      { key: 'stable', label: 'Ổn định', value: Math.max(totalSupplyTypes - lowStockSupplies, 0), tone: 'success' },
      { key: 'lowStock', label: 'Sắp hết', value: lowStockSupplies, tone: 'danger' },
    ])
  }, [supplyStats])

  const todayActivityChartItems = useMemo(() => {
    return toChartItems([
      { key: 'requests', label: 'Yêu cầu', value: todayStats?.requestsServed, tone: 'primary' },
      { key: 'people', label: 'Người', value: todayStats?.peopleHelped, tone: 'info' },
      { key: 'supplies', label: 'Vật tư', value: todayStats?.suppliesDistributed, tone: 'warning' },
      { key: 'vehicles', label: 'Xe dùng', value: todayStats?.vehiclesUsed, tone: 'danger' },
    ])
  }, [todayStats])

  const consumptionChartItems = useMemo(() => {
    const normalizedConsumptionRate = Math.min(Math.max(Number(todayStats?.consumptionRate) || 0, 0), 100)

    return toChartItems([
      { key: 'used', label: 'Đã tiêu thụ', value: normalizedConsumptionRate, tone: 'danger' },
      { key: 'remaining', label: 'Còn lại', value: Math.max(100 - normalizedConsumptionRate, 0), tone: 'neutral' },
    ])
  }, [todayStats])

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      // Fetch tất cả stats song song để dashboard lên nhanh hơn.
      const [vehicles, supplies, today] = await Promise.allSettled([
        // Vehicle stats
        Promise.all([
          managerService.getAllVehicles(''),
          managerService.getAllVehicles('AVAILABLE'),
          managerService.getAllVehicles('INUSE'),
          managerService.getAllVehicles('MAINTENANCE'),
        ]),
        managerService.getSupplyStats(),
        managerService.getTodayStats(),
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

  const renderComparisonChart = (items, emptyMessage) => {
    const maxValue = Math.max(...items.map((item) => item.value), 0)

    if (!items.length || maxValue <= 0) {
      return <div className="manager-chart-empty">{emptyMessage}</div>
    }

    return (
      <div className="manager-chart-shell">
        <div className="manager-chart-axis" aria-hidden="true">
          <span>{formatNumberVN(maxValue)}</span>
          <span>{formatNumberVN(Math.round(maxValue / 2))}</span>
          <span>0</span>
        </div>
        <div
          className="manager-chart-columns"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => (
            <article
              key={item.key}
              className="manager-chart-column"
              aria-label={`${item.label}: ${formatNumberVN(item.value)}`}
            >
              <strong className="manager-chart-value">{formatNumberVN(item.value)}</strong>

              <div className="manager-chart-bar-stage">
                <span className="manager-chart-gridline top" />
                <span className="manager-chart-gridline middle" />
                <span className="manager-chart-gridline base" />
                <div className="manager-chart-anchor" style={{ height: `${item.heightPercent}%` }}>
                  <div className={`manager-chart-bar ${item.tone}`} style={{ height: '100%' }} />
                </div>
              </div>

              <div className="manager-chart-meta">
                <span className="manager-chart-label-text">{item.label}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="manager-dashboard">
        <header className="manager-header">
          <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>
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
        <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>
        <div className="header-buttons">
          <button className="btn-create-receipt" onClick={handleNavigateToImportReceipt}>
            <ArrowDownTrayIcon className="icon" />
            Tạo phiếu nhập 
          </button>
          <button className="btn-relief-export" onClick={handleNavigateToReliefExport}>
            <ArrowUpTrayIcon className="icon" />
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
                <div className="metric-label">Bảo trì</div>
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
                <div className="metric-label">Số xe sử dụng hôm nay</div>
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

        {/* Section: Biểu đồ logistics */}
        <section className="dashboard-section monthly-section">
          <div className="section-header">
            <h2>Biểu đồ logistics hiện tại</h2>
          </div>
          
          <div className="charts-container">
            <div className="chart-group">
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h3>Phương tiện theo trạng thái</h3>
                    <p>Phân bố năng lực vận chuyển đang sẵn sàng, hoạt động hoặc bảo trì.</p>
                  </div>
                  <span className="chart-total">{formatNumberVN(vehicleStats.total)}</span>
                </div>
                {renderComparisonChart(vehicleChartItems, 'Chưa có dữ liệu phương tiện để hiển thị biểu đồ.')}
                <div className="chart-label">Tổng số phương tiện hiện có trong hệ thống</div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h3>Tình trạng vật tư</h3>
                    <p>Tách rõ nhóm vật tư ổn định và nhóm đang chạm ngưỡng cảnh báo.</p>
                  </div>
                  <span className="chart-total">{formatNumberVN(supplyStats.totalTypes)}</span>
                </div>
                {renderComparisonChart(supplyChartItems, 'Chưa có dữ liệu vật tư để hiển thị biểu đồ.')}
                <div className="chart-label">Tổng số loại vật tư đang được theo dõi</div>
              </div>
            </div>

            <div className="chart-group">
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h3>Chỉ số vận hành hôm nay</h3>
                    <p>So sánh nhanh số yêu cầu, số người, lượng vật tư và số xe đã dùng trong ngày.</p>
                  </div>
                  <span className="chart-total">{formatNumberVN(todayStats.requestsServed)}</span>
                </div>
                {renderComparisonChart(todayActivityChartItems, 'Hôm nay chưa phát sinh đủ dữ liệu để hiển thị biểu đồ hoạt động.')}
                <div className="chart-label">Dữ liệu được tổng hợp từ dashboard logistics hôm nay</div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h3>Tỷ lệ tiêu thụ hôm nay</h3>
                    <p>Cho biết phần tồn kho đã được xuất trong ngày so với tổng lượng đang theo dõi.</p>
                  </div>
                  <span className="chart-total">{formatNumberVN(todayStats.consumptionRate)}%</span>
                </div>
                {renderComparisonChart(consumptionChartItems, 'Chưa có dữ liệu tiêu thụ để hiển thị biểu đồ.')}
                <div className="chart-label">Tỷ lệ dựa trên tổng lượng vật tư đã xuất trong ngày</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ManagerDashboardPage
