import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftOnRectangleIcon,
  ArrowDownOnSquareIcon,
  ArrowPathIcon,
  ArrowUpOnSquareIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon,
  UserCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import managerService from '../services/managerService'
import './ManagerDashboardPage.css'
import LogoutConfirmModal from '../components/LogoutConfirmModal'

const formatNumberVN = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '0'
  }

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(numeric)
}

const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

const buildSolidPieSlicePath = (centerX, centerY, radius, startAngle, endAngle) => {
  const normalizedSweep = endAngle - startAngle

  if (normalizedSweep >= 359.99) {
    return [
      `M ${centerX} ${centerY}`,
      `m 0 ${-radius}`,
      `a ${radius} ${radius} 0 1 1 0 ${radius * 2}`,
      `a ${radius} ${radius} 0 1 1 0 ${-radius * 2}`,
      'Z',
    ].join(' ')
  }

  const start = polarToCartesian(centerX, centerY, radius, endAngle)
  const end = polarToCartesian(centerX, centerY, radius, startAngle)
  const largeArcFlag = normalizedSweep > 180 ? 1 : 0

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
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

const toPercent = (value, total) => {
  const safeValue = Math.max(0, Number(value) || 0)
  const safeTotal = Math.max(0, Number(total) || 0)

  if (safeTotal <= 0) {
    return 0
  }

  return Math.min((safeValue / safeTotal) * 100, 100)
}

// Dashboard manager là điểm vào để xem số liệu xe, vật tư và điều hướng sang các trang nghiệp vụ.
function ManagerDashboardPage() {
  const navigate = useNavigate()
  const userMenuRef = useRef(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentUser] = useState(() => authService.getUserInfo())
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  
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

  const [todayStats, setTodayStats] = useState({
    requestsServed: 0,
    rescueTeams: 0,
    peopleHelped: 0,
    suppliesDistributed: 0,
    vehiclesUsed: 0,
    consumptionRate: 0,
  })

  const supplyChartItems = useMemo(() => {
    const totalSupplyTypes = Number(supplyStats?.totalTypes) || 0
    const lowStockSupplies = Number(supplyStats?.lowStock) || 0

    return toChartItems([
      { key: 'stable', label: 'Ổn định', value: Math.max(totalSupplyTypes - lowStockSupplies, 0), tone: 'success' },
      { key: 'lowStock', label: 'Sắp hết', value: lowStockSupplies, tone: 'warning' },
    ])
  }, [supplyStats])

  const vehicleMixPercents = useMemo(() => ({
    available: toPercent(vehicleStats?.available, vehicleStats?.total),
    inUse: toPercent(vehicleStats?.inUse, vehicleStats?.total),
    maintenance: toPercent(vehicleStats?.maintenance, vehicleStats?.total),
  }), [vehicleStats])

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



  const handleNavigateToVehicles = () => {
    navigate('/manager/vehicles')
  }

  const handleNavigateToVehiclesWithFilter = (status) => {
    navigate(status ? `/manager/vehicles?status=${status}` : '/manager/vehicles')
  }

  const handleNavigateToStableSupplies = () => {
    navigate('/manager/supplies?filter=stable')
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

  const renderSupplyLegend = (items) => (
    <div className="manager-inline-legend" aria-label="Chú thích vật tư">
      {items.map((item) => (
        <span key={item.key} className="manager-inline-legend-item">
          <i className={`manager-inline-legend-dot ${item.tone}`} />
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  )

  const renderSolidPieChart = (items, emptyMessage) => {
    const visibleItems = items.filter((item) => item.value > 0)
    const totalValue = visibleItems.reduce((sum, item) => sum + item.value, 0)

    if (!visibleItems.length || totalValue <= 0) {
      return <div className="manager-chart-empty">{emptyMessage}</div>
    }

    let currentAngle = 0
    const segments = visibleItems.map((item) => {
      const sweepAngle = (item.value / totalValue) * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + sweepAngle
      const percent = Math.round((item.value / totalValue) * 100)
      const labelRadius = percent >= 15 ? 58 : 118
      const labelPosition = polarToCartesian(110, 110, labelRadius, startAngle + sweepAngle / 2)
      const segment = {
        ...item,
        path: buildSolidPieSlicePath(110, 110, 92, startAngle, endAngle),
        gradientId: `managerSolidPieGradient-${item.key}`,
        percent,
        labelX: labelPosition.x,
        labelY: labelPosition.y,
        outsideLabel: percent < 15,
      }
      currentAngle = endAngle
      return segment
    })

    return (
      <div className="manager-solid-pie-shell">
        <div className="manager-solid-pie-visual">
          <svg className="manager-solid-pie-chart" viewBox="0 0 220 220" aria-label="Biểu đồ cơ cấu vật tư">
            <defs>
              <linearGradient id="managerSolidPieGradient-stable" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <linearGradient id="managerSolidPieGradient-lowStock" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            {segments.map((segment) => (
              <g key={segment.key}>
                <path
                  d={segment.path}
                  fill={`url(#${segment.gradientId})`}
                  className="manager-solid-pie-slice"
                  onClick={() => {
                    if (segment.key === 'lowStock') {
                      handleNavigateToLowStockSupplies()
                    } else {
                      handleNavigateToStableSupplies()
                    }
                  }}
                />
                <text
                  x={segment.labelX}
                  y={segment.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`manager-solid-pie-percent${segment.outsideLabel ? ' outside' : ''}`}
                >
                  {segment.percent}%
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    )
  }

  const renderUsageMeter = (usedPercent, emptyMessage) => {
    const normalizedValue = Math.min(Math.max(Number(usedPercent) || 0, 0), 100)

    if (!Number.isFinite(normalizedValue)) {
      return <div className="manager-chart-empty">{emptyMessage}</div>
    }

    const meterStatus =
      normalizedValue >= 75 ? 'Cao'
      : normalizedValue >= 40 ? 'Trung bình'
      : 'Thấp'

    return (
      <div className="manager-meter-shell">
        <div className="manager-meter-copy">
          <strong>{formatNumberVN(normalizedValue)}%</strong>
          <span>Mức tiêu thụ {meterStatus.toLowerCase()}</span>
        </div>

        <div className="manager-fuel-meter" aria-hidden="true">
          <span className="manager-fuel-meter-cap" />
          <div className="manager-fuel-meter-body">
            <div className="manager-fuel-meter-grid">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="manager-fuel-meter-fill" style={{ width: `${normalizedValue}%` }} />
          </div>
        </div>

        <div className="manager-meter-scale">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const handleLogoutConfirm = () => {
    authService.logout()
    setShowUserMenu(false)
    navigate('/login')
  }

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false)
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
            <ArrowDownOnSquareIcon className="icon" />
            Tạo phiếu nhập
          </button>
          <button className="btn-relief-export" onClick={handleNavigateToReliefExport}>
            <ArrowUpOnSquareIcon className="icon" />
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
                  <span>Họ tên</span>
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

        <section className="dashboard-section manager-section-overview monthly-section">
          <div className="charts-container charts-container-balance">
            <div className="chart-card chart-card-compact chart-card-large">
              <div className="chart-header">
                <div>
                  <h3>Vật tư</h3>
                </div>
                {renderSupplyLegend(supplyChartItems)}
              </div>
              {renderSolidPieChart(
                supplyChartItems,
                'Chưa có dữ liệu vật tư để hiển thị biểu đồ.',
              )}
            </div>

            <div className="chart-card chart-card-compact chart-card-large">
              <div className="chart-header">
                <div>
                  <h3>Tỷ lệ tiêu thụ hôm nay</h3>
                </div>
              </div>
              {renderUsageMeter(
                todayStats.consumptionRate,
                'Chưa có dữ liệu tiêu thụ để hiển thị biểu đồ.',
              )}
            </div>
          </div>
        </section>

        <section className="dashboard-section manager-section-vehicles">
          <div className="dashboard-section-heading">
            <div>
              <p className="dashboard-card-kicker">Điều hướng nhanh</p>
              <h2>Phương tiện cứu hộ</h2>
            </div>
          </div>

          <div className="metrics-grid">
            <div className="metric-card primary" onClick={handleNavigateToVehicles}>
              <div className="metric-icon">
                <TruckIcon className="icon" />
              </div>
              <div className="metric-content">
                <div className="metric-value">{vehicleStats.total}</div>
                <div className="metric-label">Tổng phương tiện</div>
                <div className="metric-mini-distribution" aria-hidden="true">
                  <span className="metric-mini-segment success" style={{ width: `${vehicleMixPercents.available}%` }} />
                  <span className="metric-mini-segment info" style={{ width: `${vehicleMixPercents.inUse}%` }} />
                  <span className="metric-mini-segment warning" style={{ width: `${vehicleMixPercents.maintenance}%` }} />
                </div>
              </div>
            </div>

            <div className="metric-card success" onClick={() => handleNavigateToVehiclesWithFilter('AVAILABLE')}>
              <div className="metric-icon">
                <CheckCircleIcon className="icon" />
              </div>
              <div className="metric-content">
                <div className="metric-value">{vehicleStats.available}</div>
                <div className="metric-label">Đang sẵn sàng</div>
                <div className="metric-mini-progress" aria-hidden="true">
                  <span className="metric-mini-progress-fill success" style={{ width: `${vehicleMixPercents.available}%` }} />
                </div>
              </div>
            </div>

            <div className="metric-card info" onClick={() => handleNavigateToVehiclesWithFilter('INUSE')}>
              <div className="metric-icon">
                <ArrowPathIcon className="icon" />
              </div>
              <div className="metric-content">
                <div className="metric-value">{vehicleStats.inUse}</div>
                <div className="metric-label">Đang sử dụng</div>
                <div className="metric-mini-progress" aria-hidden="true">
                  <span className="metric-mini-progress-fill info" style={{ width: `${vehicleMixPercents.inUse}%` }} />
                </div>
              </div>
            </div>

            <div className="metric-card warning" onClick={() => handleNavigateToVehiclesWithFilter('MAINTENANCE')}>
              <div className="metric-icon">
                <WrenchScrewdriverIcon className="icon" />
              </div>
              <div className="metric-content">
                <div className="metric-value">{vehicleStats.maintenance}</div>
                <div className="metric-label">Bảo trì</div>
                <div className="metric-mini-progress" aria-hidden="true">
                  <span className="metric-mini-progress-fill warning" style={{ width: `${vehicleMixPercents.maintenance}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ManagerDashboardPage
