import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import {
  ArrowLeftOnRectangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  TruckIcon,
  UserCircleIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import coordinatorService from '../services/coordinatorService'
import CoordinatorRequestsPage from './CoordinatorRequestsPage'
import './CoordinatorDashboardPage.css'
import LogoutConfirmModal from '../components/LogoutConfirmModal'

// Dashboard tổng quan của điều phối viên:
// tải song song số liệu request, đội cứu hộ và phương tiện rồi đẩy filter xuống bảng nghiệp vụ.
const REQUEST_STATUS_ITEMS = [
  {
    key: 'PENDING',
    label: 'Mới tạo',
    icon: ClockIcon,
    iconClass: 'pending',
    barClass: 'pending',
    shades: { base: '#fee2e2', high: '#dc2626', medium: '#f87171', low: '#fca5a5' },
  },
  {
    key: 'VERIFIED',
    label: 'Đã xác minh',
    icon: ClipboardDocumentCheckIcon,
    iconClass: 'verified',
    barClass: 'verified',
    shades: { base: '#ffedd5', high: '#ea580c', medium: '#fb923c', low: '#fdba74' },
  },
  {
    key: 'ASSIGNED',
    label: 'Đã phân công',
    icon: TruckIcon,
    iconClass: 'assigned',
    barClass: 'assigned',
    shades: { base: '#fef3c7', high: '#d97706', medium: '#f59e0b', low: '#fcd34d' },
  },
  {
    key: 'COMPLETED',
    label: 'Hoàn tất',
    icon: CheckCircleIcon,
    iconClass: 'completed',
    barClass: 'completed',
    shades: { base: '#dcfce7', high: '#16a34a', medium: '#4ade80', low: '#86efac' },
  },
  {
    key: 'CANCELLED',
    label: 'Hủy',
    icon: XCircleIcon,
    iconClass: 'cancelled',
    barClass: 'cancelled',
    shades: { base: '#e5e7eb', high: '#475569', medium: '#94a3b8', low: '#cbd5e1' },
  },
  {
    key: 'DUPLICATE',
    label: 'Trùng lặp',
    icon: DocumentDuplicateIcon,
    iconClass: 'duplicate',
    barClass: 'duplicate',
    shades: { base: '#ede9fe', high: '#7c3aed', medium: '#a78bfa', low: '#c4b5fd' },
  },
]

const normalizeStatus = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const normalizeRequestStatusKey = (status) => {
  if (status === 'CANCELED') {
    return 'CANCELLED'
  }

  if (status === 'DUPLICATED') {
    return 'DUPLICATE'
  }

  if (status === 'CONFIRMED') {
    return 'ASSIGNED'
  }

  return status
}

const ROLE_LABEL_MAP = {
  COORDINATOR: 'Điều phối viên',
  RESCUE_TEAM: 'Đội cứu hộ',
  MANAGER: 'Quản lý',
  ADMIN: 'Quản trị viên',
  CITIZEN: 'Công dân',
}

const REQUEST_CHART_VALUE_ROW_HEIGHT = 40
const REQUEST_CHART_STAGE_MIN_HEIGHT = 220
const REQUEST_CHART_LABEL_ROW_HEIGHT = 78
const REQUEST_CHART_ROW_GAP = 10

const createInitialStatusSummary = () =>
  REQUEST_STATUS_ITEMS.reduce(
    (accumulator, item) => ({
      ...accumulator,
      [item.key]: 0,
    }),
    {},
  )

const buildRequestStatusSummary = (requestItems) => {
  const summary = createInitialStatusSummary()
  requestItems.forEach((item) => {
    const status = normalizeRequestStatusKey(normalizeStatus(item.status))
    if (summary[status] !== undefined) {
      summary[status] += 1
    }
  })
  return summary
}

const getPriorityKey = (item) => {
  const numericId = Number(
    item.priority_level_id ??
      item.priorityLevelId ??
      item.priority_id ??
      item.priorityId ??
      item.level_id ??
      item.levelId ??
      null,
  )

  if (!Number.isNaN(numericId)) {
    if (numericId === 1) {
      return 'HIGH'
    }
    if (numericId === 2) {
      return 'MEDIUM'
    }
    if (numericId === 3) {
      return 'LOW'
    }
  }

  const rawPriority =
    item.priority_name ??
    item.priorityName ??
    item.priority_level_name ??
    item.priorityLevelName ??
    item.priority ??
    item.level_name ??
    item.levelName ??
    ''

  const normalized = normalizeText(rawPriority)
  if (normalized.includes('cao') || normalized.includes('high')) {
    return 'HIGH'
  }
  if (normalized.includes('trung') || normalized.includes('medium')) {
    return 'MEDIUM'
  }
  if (normalized.includes('thap') || normalized.includes('low')) {
    return 'LOW'
  }

  return ''
}

const toBarHeightPercent = (value, maxValue) => {
  if (!maxValue) {
    return 0
  }

  return (value / maxValue) * 100
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

function CoordinatorDashboardPage() {
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [requestsStatusFilter, setRequestsStatusFilter] = useState('')
  const [requestItems, setRequestItems] = useState([])
  const [requestStatusSummary, setRequestStatusSummary] = useState(createInitialStatusSummary())
  const [teamSummary, setTeamSummary] = useState({ total: 0, inProgress: 0, available: 0 })
  const [vehicleSummary, setVehicleSummary] = useState({ available: 0, inUse: 0, maintenance: 0 })
  const [currentUser, setCurrentUser] = useState(() => authService.getUserInfo())
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)
  const roleLabel = ROLE_LABEL_MAP[String(currentUser?.role ?? '').toUpperCase()] || currentUser?.role || '-'

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const fetchDashboardStats = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    const results = await Promise.allSettled([
      // Tách API theo từng mảng dữ liệu để khi một phần lỗi, dashboard vẫn còn phần còn lại.
      coordinatorService.getRescueRequests(''),
      coordinatorService.getAvailableRescueTeams(),
      coordinatorService.getAvailableRescueTeams('AVAILABLE'),
      coordinatorService.getAvailableRescueTeams('BUSY'),
      coordinatorService.getVehicles('AVAILABLE'),
      coordinatorService.getVehicles('INUSE'),
      coordinatorService.getVehicles('MAINTENANCE'),
    ])

    const hasUnauthorized = results.some(
      (result) => result.status === 'rejected' && result.reason?.response?.status === 401,
    )
    if (hasUnauthorized) {
      setIsLoading(false)
      navigate('/login', { replace: true })
      return
    }

    const toArray = (result) => (result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [])

    const requests = toArray(results[0])
    const allTeams = toArray(results[1])
    const availableTeams = toArray(results[2])
    const busyTeams = toArray(results[3])
    const availableVehicles = toArray(results[4])
    const inUseVehicles = toArray(results[5])
    const maintenanceVehicles = toArray(results[6])

    setRequestItems(requests)
    setRequestStatusSummary(buildRequestStatusSummary(requests))

    const totalTeamCount = results[1].status === 'fulfilled' ? allTeams.length : availableTeams.length + busyTeams.length
    setTeamSummary({
      total: totalTeamCount,
      inProgress: busyTeams.length,
      available: availableTeams.length,
    })

    setVehicleSummary({
      available: availableVehicles.length,
      inUse: inUseVehicles.length,
      maintenance: maintenanceVehicles.length,
    })

    const hasNonAuthError = results.some(
      (result) => result.status === 'rejected' && result.reason?.response?.status !== 401,
    )
    if (hasNonAuthError) {
      setErrorMessage('Một số số liệu chưa tải được. Vui lòng thử tải lại.')
    }

    setIsLoading(false)
  }, [navigate])

  useEffect(() => {
    fetchDashboardStats()
  }, [fetchDashboardStats])

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

  const totalRequests = useMemo(
    () => REQUEST_STATUS_ITEMS.reduce((total, item) => total + (requestStatusSummary[item.key] ?? 0), 0),
    [requestStatusSummary],
  )

  const maxStatusCount = useMemo(
    () => Math.max(...REQUEST_STATUS_ITEMS.map((item) => requestStatusSummary[item.key] ?? 0), 0),
    [requestStatusSummary],
  )

  const { axisMarks: requestAxisMarks, roundedMax: roundedStatusMax } = useMemo(() => {
    const { marks, roundedMax } = buildChartAxisMarks(maxStatusCount)
    return {
      axisMarks: [...marks].reverse(),
      roundedMax,
    }
  }, [maxStatusCount])

  const requestChartMinHeight = useMemo(
    () =>
      Math.max(
        REQUEST_CHART_VALUE_ROW_HEIGHT +
          REQUEST_CHART_STAGE_MIN_HEIGHT +
          REQUEST_CHART_LABEL_ROW_HEIGHT +
          REQUEST_CHART_ROW_GAP * 2,
        (requestAxisMarks.length || 3) * 14 +
          REQUEST_CHART_VALUE_ROW_HEIGHT +
          REQUEST_CHART_LABEL_ROW_HEIGHT +
          REQUEST_CHART_ROW_GAP * 2,
      ),
    [requestAxisMarks.length],
  )

  const requestChartItems = useMemo(
    () =>
      REQUEST_STATUS_ITEMS.map((item) => ({
        ...item,
        count: requestStatusSummary[item.key] ?? 0,
        heightPercent: toBarHeightPercent(requestStatusSummary[item.key] ?? 0, maxStatusCount),
      })),
    [maxStatusCount, requestStatusSummary],
  )

  const topMetricCards = useMemo(
    () => [
      { key: 'team-total', icon: UserGroupIcon, iconClass: 'total', label: 'Tổng số đội', value: teamSummary.total },
      { key: 'team-progress', icon: ArrowPathIcon, iconClass: 'operating', label: 'Đội trong nhiệm vụ', value: teamSummary.inProgress },
      { key: 'team-ready', icon: CheckCircleIcon, iconClass: 'available', label: 'Đội sẵn sàng', value: teamSummary.available },
      // { key: 'team-understaffed', icon: ExclamationTriangleIcon, label: 'Đội thiếu thành viên', value: teamSummary.understaffed },
    ],
    [teamSummary],
  )

  const bottomMetricCards = useMemo(
    () => [
      { key: 'vehicle-available', icon: TruckIcon, iconClass: 'vehicle-available', label: 'Phương tiện khả dụng', value: vehicleSummary.available },
      { key: 'vehicle-inuse', icon: ClockIcon, iconClass: 'vehicle-busy', label: 'Phương tiện đang sử dụng', value: vehicleSummary.inUse },
      { key: 'vehicle-maintenance', icon: WrenchScrewdriverIcon, iconClass: 'vehicle-maintenance', label: 'Phương tiện bảo trì', value: vehicleSummary.maintenance },
    ],
    [vehicleSummary],
  )

  const scrollToRequestTable = () => {
    const section = document.getElementById('coordinator-request-table')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleSelectStatusSegment = (statusKey) => {
    // Click cột biểu đồ sẽ đồng bộ filter xuống CoordinatorRequestsPage embedded.
    setRequestsStatusFilter((prev) => (prev === statusKey ? '' : statusKey))
    window.setTimeout(scrollToRequestTable, 80)
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const handleLogoutConfirm = () => {
    authService.logout()
    setCurrentUser && setCurrentUser(null)
    setShowUserMenu && setShowUserMenu(false)
    setShowLogoutConfirm(false)
    navigate('/login', { replace: true })
  }

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false)
  }

  const handleToggleUserMenu = () => {
    setShowUserMenu((prev) => !prev)
  }

  const getAxisMarkerStyle = (value) => {
    const ratio = roundedStatusMax > 0 ? value / roundedStatusMax : 0
    return {
      bottom: `${ratio * 100}%`,
    }
  }

  const getGridlineStyle = (value) => {
    const ratio = roundedStatusMax > 0 ? value / roundedStatusMax : 0
    return {
      bottom: `${ratio * 100}%`,
    }
  }

  return (
    <div className="coordinator-home-page">
      <header className="coordinator-home-header">
        <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>
        <div className="coordinator-home-actions">
          <div className="coordinator-home-user-group" ref={userMenuRef}>
            <button
              type="button"
              className="coordinator-home-icon-button"
              onClick={handleToggleUserMenu}
              aria-label="Thông tin người dùng"
            >
              <UserCircleIcon className="coordinator-header-icon" />
            </button>
            {showUserMenu && (
              <div className="coordinator-home-user-menu">
                <h3>Thông tin tài khoản</h3>
                <div className="coordinator-home-user-row">
                  <span>Tên tài khoản</span>
                  <strong>{currentUser?.username || '-'}</strong>
                </div>
                <div className="coordinator-home-user-row">
                  <span>Họ tên</span>
                  <strong>{currentUser?.fullName || '-'}</strong>
                </div>
                <div className="coordinator-home-user-row">
                  <span>Email</span>
                  <strong>{currentUser?.email || '-'}</strong>
                </div>
                <div className="coordinator-home-user-row">
                  <span>Vai trò</span>
                  <strong>{roleLabel}</strong>
                </div>
              </div>
            )}
          </div>
          <button type="button" className="coordinator-home-logout" onClick={handleLogout} aria-label="Đăng xuất">
            <ArrowLeftOnRectangleIcon className="coordinator-header-icon" />
          </button>
        </div>
      </header>

      <main className="coordinator-home-content">
        {errorMessage && <div className="coordinator-home-feedback">{errorMessage}</div>}

        <section className="coordinator-overview-grid">
          <div className="coordinator-side-column">
            {topMetricCards.map((card) => (
              <article key={card.key} className="coordinator-stat-item">
                <div className={`coordinator-stat-icon ${card.iconClass}`} aria-hidden="true">
                  <card.icon className="coordinator-stat-svg" />
                </div>
                <div className="coordinator-stat-content">
                  <div className="coordinator-stat-label">{card.label}</div>
                  <div className="coordinator-stat-number">{isLoading ? '--' : card.value}</div>
                </div>
              </article>
            ))}
          </div>

          <section className="coordinator-status-panel">
            <div className="coordinator-status-title-row">
              <h2>Danh sách yêu cầu cứu hộ</h2>
              <strong className="coordinator-summary-chip">Tổng: {isLoading ? '...' : totalRequests}</strong>
            </div>

            {totalRequests <= 0 && !isLoading ? (
              <div className="coordinator-status-empty">Chưa có yêu cầu để hiển thị biểu đồ trạng thái.</div>
            ) : (
              <div className="coordinator-request-chart-wrap">
                <div className="coordinator-request-chart-axis-shell" style={{ minHeight: `${requestChartMinHeight}px` }}>
                  <div className="coordinator-request-chart-axis-top-gap" aria-hidden="true" />
                  <div className="coordinator-request-chart-axis">
                    {requestAxisMarks.map((mark) => (
                      <span key={`axis-left-${mark}`} style={getAxisMarkerStyle(mark)}>
                        {isLoading ? '...' : mark}
                      </span>
                    ))}
                  </div>
                  <div className="coordinator-request-chart-axis-bottom-gap" aria-hidden="true" />
                </div>
                <div className="coordinator-request-chart-plot">
                  <div className="coordinator-request-chart" style={{ minHeight: `${requestChartMinHeight}px` }}>
                    {requestChartItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`coordinator-request-bar-card ${item.barClass} ${requestsStatusFilter === item.key ? 'active' : ''}`}
                        onClick={() => handleSelectStatusSegment(item.key)}
                        disabled={isLoading}
                        aria-pressed={requestsStatusFilter === item.key}
                      >
                        <strong className="coordinator-request-bar-value">{isLoading ? '...' : item.count}</strong>
                        <div className="coordinator-request-bar-stage">
                          {requestAxisMarks.map((mark) => (
                            <span
                              key={`${item.key}-grid-${mark}`}
                              className={`coordinator-request-bar-gridline ${mark === 0 ? 'base' : ''}`}
                              style={getGridlineStyle(mark)}
                            />
                          ))}
                          <div
                            className="coordinator-request-bar-anchor"
                            style={{ height: `${item.heightPercent}%` }}
                          >
                            <div className={`coordinator-request-bar ${item.barClass}`} style={{ height: '100%' }} />
                          </div>
                        </div>
                        <div className="coordinator-request-bar-label">
                          <span className={`coordinator-request-bar-icon ${item.iconClass}`}>
                            <item.icon className="coordinator-request-bar-svg" />
                          </span>
                          <strong>{item.label}</strong>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <div className="coordinator-side-column">
            {bottomMetricCards.map((card) => (
              <article key={card.key} className="coordinator-stat-item">
                <div className={`coordinator-stat-icon ${card.iconClass}`} aria-hidden="true">
                  <card.icon className="coordinator-stat-svg" />
                </div>
                <div className="coordinator-stat-content">
                  <div className="coordinator-stat-label">
                    {card.key === 'vehicle-available' ? (
                      <>
                        <span>Phương tiện</span>
                        <span>khả dụng</span>
                      </>
                    ) : card.key === 'vehicle-inuse' ? (
                      <>
                        <span>Phương tiện</span>
                        <span>đang sử dụng</span>
                      </>
                    ) : (
                      card.label
                    )}
                  </div>
                  <div className="coordinator-stat-number">{isLoading ? '--' : card.value}</div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="coordinator-request-table" className="coordinator-request-embed-wrap">
          <CoordinatorRequestsPage embedded externalStatusFilter={requestsStatusFilter} />
        </section>
      </main>
      <LogoutConfirmModal open={showLogoutConfirm} onConfirm={handleLogoutConfirm} onCancel={handleLogoutCancel} />
    </div>
  )
}

export default CoordinatorDashboardPage
