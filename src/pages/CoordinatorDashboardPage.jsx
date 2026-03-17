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
  ShieldCheckIcon,
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
    key: 'CONFIRMED',
    label: 'Đã xác nhận',
    icon: ShieldCheckIcon,
    iconClass: 'confirmed',
    barClass: 'confirmed',
    shades: { base: '#dbeafe', high: '#2563eb', medium: '#60a5fa', low: '#93c5fd' },
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

const PRIORITY_BREAKDOWN_ITEMS = [
  { key: 'HIGH', label: 'Cao' },
  { key: 'MEDIUM', label: 'Trung bình' },
  { key: 'LOW', label: 'Thấp' },
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

  return status
}

const ROLE_LABEL_MAP = {
  COORDINATOR: 'Điều phối viên',
  RESCUE_TEAM: 'Đội cứu hộ',
  MANAGER: 'Quản lý',
  ADMIN: 'Quản trị viên',
  CITIZEN: 'Công dân',
}

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

  return Math.max((value / maxValue) * 100, value > 0 ? 12 : 0)
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

  const fetchDashboardStats = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    const results = await Promise.allSettled([
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

  const requestPriorityBreakdown = useMemo(() => {
    const initial = REQUEST_STATUS_ITEMS.reduce((accumulator, item) => {
      if (item.key !== 'PENDING') {
        accumulator[item.key] = PRIORITY_BREAKDOWN_ITEMS.reduce(
          (priorityAccumulator, priorityItem) => ({
            ...priorityAccumulator,
            [priorityItem.key]: 0,
          }),
          {},
        )
      }
      return accumulator
    }, {})

    requestItems.forEach((item) => {
      const statusKey = normalizeRequestStatusKey(normalizeStatus(item.status))
      if (!initial[statusKey]) {
        return
      }

      const priorityKey = getPriorityKey(item)
      if (initial[statusKey][priorityKey] !== undefined) {
        initial[statusKey][priorityKey] += 1
      }
    })

    return initial
  }, [requestItems])

  const requestChartItems = useMemo(
    () =>
      REQUEST_STATUS_ITEMS.map((item) => ({
        ...item,
        count: requestStatusSummary[item.key] ?? 0,
        heightPercent: toBarHeightPercent(requestStatusSummary[item.key] ?? 0, maxStatusCount),
        priorityBreakdown:
          item.key === 'PENDING' || item.key === 'DUPLICATE' ? null : requestPriorityBreakdown[item.key] ?? null,
        activeHeightPercent:
          item.key !== 'PENDING' && item.key !== 'DUPLICATE' && requestStatusSummary[item.key] > 0
            ? ((requestPriorityBreakdown[item.key]?.HIGH ?? 0) / requestStatusSummary[item.key]) * 100
            : 0,
      })),
    [maxStatusCount, requestPriorityBreakdown, requestStatusSummary],
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
    setRequestsStatusFilter((prev) => (prev === statusKey ? '' : statusKey))
    window.setTimeout(scrollToRequestTable, 80)
  }

  const handleLogout = () => {
    authService.logout()
    setCurrentUser(null)
    setShowUserMenu(false)
    navigate('/login', { replace: true })
  }

  const handleToggleUserMenu = () => {
    setShowUserMenu((prev) => !prev)
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
                <div className="coordinator-request-chart-axis">
                  <span>{isLoading ? '...' : maxStatusCount}</span>
                  <span>{isLoading ? '...' : Math.round(maxStatusCount / 2)}</span>
                  <span>0</span>
                </div>
                <div className="coordinator-request-chart">
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
                        <span className="coordinator-request-bar-gridline top" />
                        <span className="coordinator-request-bar-gridline middle" />
                        <span className="coordinator-request-bar-gridline base" />
                      <div
                        className="coordinator-request-bar-anchor"
                        style={{ height: `${item.heightPercent}%` }}
                      >
                          {item.priorityBreakdown && (
                            <div className="coordinator-request-tooltip">
                              <strong>{item.label}</strong>
                              {PRIORITY_BREAKDOWN_ITEMS.map((priorityItem) => (
                                <div key={priorityItem.key} className="coordinator-request-tooltip-row">
                                  <i className={priorityItem.key.toLowerCase()} />
                                  <span>{priorityItem.label}</span>
                                  <strong>{item.priorityBreakdown[priorityItem.key] ?? 0}</strong>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className={`coordinator-request-bar ${item.barClass}`} style={{ height: '100%' }}>
                            <div
                              className="coordinator-request-bar-segment active"
                              style={{ height: `${item.activeHeightPercent}%` }}
                            />
                            <div
                              className="coordinator-request-bar-segment inactive"
                              style={{ height: `${Math.max(100 - item.activeHeightPercent, 0)}%` }}
                            />
                          </div>
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
    </div>
  )
}

export default CoordinatorDashboardPage
