import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import {
  ArrowLeftOnRectangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  UserCircleIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import coordinatorService from '../services/coordinatorService'
import CoordinatorRequestsPage from './CoordinatorRequestsPage'
import './CoordinatorDashboardPage.css'

const REQUEST_STATUS_ITEMS = [
  { key: 'PENDING', label: 'Mới tạo', statusText: 'Pending' },
  { key: 'VERIFIED', label: 'Đã xác minh', statusText: 'Verified' },
  { key: 'ASSIGNED', label: 'Đã phân công', statusText: 'Assigned' },
  { key: 'CONFIRMED', label: 'Đã xác nhận', statusText: 'Confirmed' },
  { key: 'COMPLETED', label: 'Hoàn tất', statusText: 'Completed' },
  { key: 'CANCELLED', label: 'Hủy', statusText: 'Cancelled' },
  { key: 'DUPLICATE', label: 'Trùng lặp', statusText: 'Duplicate' },
]

const normalizeStatus = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

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
      { key: 'team-total', icon: UserGroupIcon, label: 'Tổng số đội', value: teamSummary.total },
      { key: 'team-progress', icon: ArrowPathIcon, label: 'Đội trong nhiệm vụ', value: teamSummary.inProgress },
      { key: 'team-ready', icon: CheckCircleIcon, label: 'Đội sẵn sàng', value: teamSummary.available },
      // { key: 'team-understaffed', icon: ExclamationTriangleIcon, label: 'Đội thiếu thành viên', value: teamSummary.understaffed },
    ],
    [teamSummary],
  )

  const bottomMetricCards = useMemo(
    () => [
      { key: 'vehicle-available', icon: TruckIcon, label: 'Phương tiện khả dụng', value: vehicleSummary.available },
      { key: 'vehicle-inuse', icon: ClockIcon, label: 'Phương tiện đang sử dụng', value: vehicleSummary.inUse },
      { key: 'vehicle-maintenance', icon: WrenchScrewdriverIcon, label: 'Phương tiện bảo trì', value: vehicleSummary.maintenance },
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

        <section className="coordinator-status-panel">
          <div className="coordinator-status-title-row">
            <h2>Danh sách yêu cầu cứu hộ</h2>
            <strong>Tổng: {isLoading ? '...' : totalRequests}</strong>
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
                    className={`coordinator-request-bar-card ${requestsStatusFilter === item.key ? 'active' : ''}`}
                    onClick={() => handleSelectStatusSegment(item.key)}
                    disabled={isLoading}
                    aria-pressed={requestsStatusFilter === item.key}
                    title={`${item.statusText}: ${item.count}`}
                  >
                    <strong className="coordinator-request-bar-value">{isLoading ? '...' : item.count}</strong>
                    <div className="coordinator-request-bar-stage">
                      <span className="coordinator-request-bar-gridline top" />
                      <span className="coordinator-request-bar-gridline middle" />
                      <span className="coordinator-request-bar-gridline base" />
                      <div className="coordinator-request-bar-anchor">
                        <div
                          className={`coordinator-request-bar ${item.key.toLowerCase()}`}
                          style={{ height: `${item.heightPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="coordinator-request-bar-label">
                      <span className={`coordinator-request-bar-code ${item.key.toLowerCase()}`}>{item.statusText}</span>
                      <strong>{item.label}</strong>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="coordinator-metrics-wrap">
          <div className="coordinator-metrics-row top">
            {topMetricCards.map((card) => (
              <article key={card.key} className="coordinator-stat-item">
                <div className="coordinator-stat-icon" aria-hidden="true">
                  <card.icon className="coordinator-stat-svg" />
                </div>
                <div className="coordinator-stat-number">{isLoading ? '--' : card.value}</div>
                <div className="coordinator-stat-label">{card.label}</div>
              </article>
            ))}
          </div>

          <div className="coordinator-metrics-row bottom">
            {bottomMetricCards.map((card) => (
              <article key={card.key} className="coordinator-stat-item">
                <div className="coordinator-stat-icon" aria-hidden="true">
                  <card.icon className="coordinator-stat-svg" />
                </div>
                <div className="coordinator-stat-number">{isLoading ? '--' : card.value}</div>
                <div className="coordinator-stat-label">{card.label}</div>
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
