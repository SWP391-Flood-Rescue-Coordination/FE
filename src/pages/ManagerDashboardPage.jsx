import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftOnRectangleIcon,
  ArrowDownOnSquareIcon,
  ArrowPathIcon,
  ArrowUpOnSquareIcon,
  TruckIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
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

const DONUT_TONE_COLOR_MAP = {
  primary: '#7c8cff',
  success: '#55c99a',
  info: '#74c7f5',
  warning: '#f3c57a',
  danger: '#f48f8f',
  neutral: '#94a3b8',
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

const getChartAxisStep = (maxValue) => {
  const safeMax = Math.max(0, Number(maxValue) || 0)

  if (safeMax <= 0) {
    return 1
  }

  if (safeMax < 100) {
    return 1
  }

  const magnitude = 10 ** Math.max(String(Math.floor(safeMax)).length - 2, 1)
  return magnitude
}

const buildChartAxisMarks = (maxValue) => {
  const step = getChartAxisStep(maxValue)
  const roundedMax = Math.max(step, Math.ceil(maxValue / step) * step)
  const marks = []

  for (let value = 0; value <= roundedMax; value += step) {
    marks.push(value)
  }

  return { marks, roundedMax }
}

// Dashboard manager là điểm vào để xem số liệu xe, vật tư và điều hướng sang các trang nghiệp vụ.
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

  const todayActivityChartItems = useMemo(() => {
    return toChartItems([
      { key: 'requests', label: 'Yêu cầu', value: todayStats?.requestsServed, tone: 'primary' },
      { key: 'teams', label: 'Đội cứu hộ', value: todayStats?.rescueTeams, tone: 'info' },
      { key: 'supplies', label: 'Vật tư', value: todayStats?.suppliesDistributed, tone: 'warning' },
      { key: 'vehicles', label: 'Xe dùng', value: todayStats?.vehiclesUsed, tone: 'danger' },
    ])
  }, [todayStats])

  const vehicleMixPercents = useMemo(() => ({
    available: toPercent(vehicleStats?.available, vehicleStats?.total),
    inUse: toPercent(vehicleStats?.inUse, vehicleStats?.total),
    maintenance: toPercent(vehicleStats?.maintenance, vehicleStats?.total),
  }), [vehicleStats])

  const consumptionGaugeRotation = useMemo(() => {
    const normalizedValue = Math.min(Math.max(Number(todayStats?.consumptionRate) || 0, 0), 100)
    return (normalizedValue / 100) * 180 - 90
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

  const handleNavigateToVehiclesWithFilter = (status) => {
    navigate(status ? `/manager/vehicles?status=${status}` : '/manager/vehicles')
  }

  const handleNavigateToSupplies = () => {
    navigate('/manager/supplies')
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

  const renderComparisonChart = (items, emptyMessage) => {
    const maxValue = Math.max(...items.map((item) => item.value), 0)

    if (!items.length) {
      return <div className="manager-chart-empty">{emptyMessage}</div>
    }

    const { marks: axisMarks, roundedMax } = buildChartAxisMarks(maxValue)
    const chartHeight = Math.max(148, axisMarks.length * 16)
    const plotTop = 24
    const plotBottom = chartHeight - 14
    const plotHeight = plotBottom - plotTop
    const yForValue = (value) => plotBottom - ((value / roundedMax) * plotHeight)
    const points = items.map((item, index) => {
      const x = 52 + (index * 104)
      const y = yForValue(item.value)
      return { ...item, x, y }
    })

    const linePath = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${plotBottom} L ${points[0].x} ${plotBottom} Z`

    return (
      <div className="manager-area-shell">
        <div className="manager-area-layout">
          <div className="manager-area-axis" aria-hidden="true" style={{ minHeight: `${chartHeight}px` }}>
            {axisMarks.map((mark) => (
              <span
                key={`axis-${mark}`}
                style={{ bottom: `${((mark / roundedMax) * 100).toFixed(4)}%` }}
              >
                {formatNumberVN(mark)}
              </span>
            ))}
          </div>

          <svg className="manager-area-chart" viewBox={`0 0 420 ${chartHeight}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="managerAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(124, 140, 255, 0.28)" />
                <stop offset="100%" stopColor="rgba(124, 140, 255, 0.04)" />
              </linearGradient>
              <linearGradient id="managerAreaPoint-primary" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <linearGradient id="managerAreaPoint-info" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#bae6fd" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
              <linearGradient id="managerAreaPoint-warning" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="managerAreaPoint-danger" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
            </defs>
            {axisMarks.map((mark) => {
              const y = yForValue(mark)
              return (
                <line
                  key={`grid-${mark}`}
                  x1="24"
                  y1={y}
                  x2="400"
                  y2={y}
                  className={`manager-area-gridline${mark === 0 ? ' base' : ''}`}
                />
              )
            })}
            <path d={areaPath} className="manager-area-fill" />
            <path d={linePath} className="manager-area-line" />
            {points.map((point) => (
              <g key={point.key}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  className="manager-area-point"
                  fill={`url(#managerAreaPoint-${point.tone})`}
                />
                <text x={point.x} y={point.y - 16} textAnchor="middle" className="manager-area-value">
                  {formatNumberVN(point.value)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    )
  }

  const renderInlineLegend = (items) => (
    <div className="manager-inline-legend" aria-label="Chú thích biểu đồ">
      {items.map((item) => (
        <span key={item.key} className="manager-inline-legend-item">
          <i className={`manager-inline-legend-dot ${item.tone}`} />
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  )

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

  const renderSupplyStatusChart = (items, emptyMessage) => {
    if (!items.length) {
      return <div className="manager-chart-empty">{emptyMessage}</div>
    }

    const totalValue = items.reduce((sum, item) => sum + item.value, 0)

    return (
      <div className="manager-supply-status-shell">
        {items.map((item) => {
          const percent = totalValue > 0 ? (item.value / totalValue) * 100 : 0
          const width = item.value > 0 ? Math.max(percent, 12) : 0

          return (
            <button
              key={item.key}
              type="button"
              className="manager-supply-status-row"
              onClick={() => {
                if (item.key === 'lowStock') {
                  handleNavigateToLowStockSupplies()
                  return
                }

                handleNavigateToStableSupplies()
              }}
            >
              <span className="manager-supply-status-copy">
                <i className={`manager-supply-status-dot ${item.tone}`} />
                <span>{item.label}</span>
              </span>
              <span className="manager-supply-status-track" aria-hidden="true">
                <span className={`manager-supply-status-fill ${item.tone}`} style={{ width: `${width}%` }} />
              </span>
              <strong>{formatNumberVN(item.value)}</strong>
            </button>
          )
        })}
      </div>
    )
  }

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

  const renderDonutChart = (items, emptyMessage) => {
    const totalValue = items.reduce((sum, item) => sum + item.value, 0)

    if (!items.length || totalValue <= 0) {
      return <div className="manager-chart-empty">{emptyMessage}</div>
    }

    let currentPercent = 0
    const gradientSegments = items
      .filter((item) => item.value > 0)
      .map((item) => {
        const toneColor = DONUT_TONE_COLOR_MAP[item.tone] || DONUT_TONE_COLOR_MAP.neutral
        const segmentPercent = (item.value / totalValue) * 100
        const start = currentPercent
        currentPercent += segmentPercent
        return `${toneColor} ${start}% ${currentPercent}%`
      })

    return (
      <div className="manager-donut-shell">
        <div
          className="manager-donut-chart"
          style={{ backgroundImage: `conic-gradient(${gradientSegments.join(', ')})` }}
          aria-hidden="true"
        >
          <div className="manager-donut-center">
            <strong>{formatNumberVN(totalValue)}</strong>
            <span>Tổng</span>
          </div>
        </div>

        <div className="manager-donut-legend">
          {items.map((item) => (
            <div key={item.key} className="manager-donut-legend-item">
              <i
                className="manager-donut-legend-dot"
                style={{ backgroundColor: DONUT_TONE_COLOR_MAP[item.tone] || DONUT_TONE_COLOR_MAP.neutral }}
              />
              <span>{item.label}</span>
              <strong>{formatNumberVN(item.value)}</strong>
            </div>
          ))}
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

        {/* Section: Chỉ số vận hành hôm nay */}
        <section className="dashboard-section manager-section-operations monthly-section">
          <div className="charts-container charts-container-compact">
            <div className="chart-stack">
              <div className="chart-card chart-card-compact">
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

              <div className="chart-card chart-card-compact">
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

            <div className="chart-card chart-card-wide">
              <div className="chart-header">
                <div>
                  <h3>Chỉ số vận hành hôm nay</h3>
                </div>
                {renderInlineLegend(todayActivityChartItems)}
              </div>
              {renderComparisonChart(
                todayActivityChartItems,
                'Hôm nay chưa phát sinh đủ dữ liệu để hiển thị biểu đồ hoạt động.',
              )}
            </div>
          </div>
        </section>

        {/* Section: Phương tiện */}
        <section className="dashboard-section manager-section-vehicles">
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
