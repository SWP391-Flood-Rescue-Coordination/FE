import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowPathIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  TruckIcon,
  UserCircleIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import authService from '../services/authService'
import adminService from '../services/adminService'
import {
  DEFAULT_TEAM_SUMMARY,
  HOME_ROUTE_BY_ROLE,
  REQUEST_STATUS_LABELS,
  ROLE_ORDER,
  formatDateTimeVN,
  formatPriority,
  normalizeRole,
  normalizeStatus,
} from './adminShared'

/*
  AdminDashboardPage là màn tổng quan của actor admin.
  Flow trình bày:
  App.jsx -> /admin -> AdminDashboardPage.jsx -> adminService -> nhiều API list -> render KPI/chart/bảng.

  Page này không dựa vào một endpoint summary duy nhất.
  Thay vào đó FE tự tổng hợp số liệu từ user, rescue team, vehicle và rescue request.
*/
// Dashboard admin ghép nhiều API độc lập để tạo góc nhìn giám sát toàn hệ thống.
const ROLE_CARD_META = {
  ADMIN: {
    icon: ShieldCheckIcon,
    iconClass: 'admin',
  },
  MANAGER: {
    icon: BriefcaseIcon,
    iconClass: 'manager',
  },
  COORDINATOR: {
    icon: ArrowPathIcon,
    iconClass: 'coordinator',
  },
  RESCUE_TEAM: {
    icon: UserGroupIcon,
    iconClass: 'rescue-team',
  },
  CITIZEN: {
    icon: UserCircleIcon,
    iconClass: 'citizen',
  },
}

const TERMINAL_REQUEST_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'DUPLICATE'])
const DEFAULT_VEHICLE_SUMMARY = { total: 0, available: 0, inUse: 0, maintenance: 0 }

const toValidDate = (value) => {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const getTimestamp = (value) => toValidDate(value)?.getTime() ?? 0

const formatPercent = (part, total) => {
  if (!total) {
    return '0%'
  }

  return `${Math.round((part / total) * 100)}%`
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

const ADMIN_ROLE_CHART_VALUE_ROW_HEIGHT = 40
const ADMIN_ROLE_CHART_STAGE_MIN_HEIGHT = 220
const ADMIN_ROLE_CHART_LABEL_ROW_HEIGHT = 78
const ADMIN_ROLE_CHART_ROW_GAP = 10

const formatElapsedTime = (value) => {
  const parsedDate = toValidDate(value)
  if (!parsedDate) {
    return '-'
  }

  const diffMs = Date.now() - parsedDate.getTime()
  if (diffMs <= 0) {
    return 'Vừa phát sinh'
  }

  const totalMinutes = Math.floor(diffMs / 60000)
  const totalHours = Math.floor(totalMinutes / 60)
  const totalDays = Math.floor(totalHours / 24)

  if (totalDays > 0) {
    return `${totalDays} ngày ${totalHours % 24} giờ`
  }

  if (totalHours > 0) {
    return `${totalHours} giờ ${totalMinutes % 60} phút`
  }

  return `${Math.max(totalMinutes, 1)} phút`
}

const isCreatedToday = (value) => {
  const parsedDate = toValidDate(value)
  if (!parsedDate) {
    return false
  }

  const now = new Date()
  return (
    parsedDate.getDate() === now.getDate() &&
    parsedDate.getMonth() === now.getMonth() &&
    parsedDate.getFullYear() === now.getFullYear()
  )
}

const isWithinLastDays = (value, dayCount) => {
  const parsedDate = toValidDate(value)
  if (!parsedDate) {
    return false
  }

  const threshold = new Date()
  threshold.setHours(0, 0, 0, 0)
  threshold.setDate(threshold.getDate() - Math.max(dayCount - 1, 0))

  return parsedDate.getTime() >= threshold.getTime()
}

const sortByCreatedDesc = (items) => [...items].sort((firstItem, secondItem) => getTimestamp(secondItem.createdAt) - getTimestamp(firstItem.createdAt))

const sortByCreatedAsc = (items) => [...items].sort((firstItem, secondItem) => getTimestamp(firstItem.createdAt) - getTimestamp(secondItem.createdAt))

const getRequestHeadline = (request) => request?.title || request?.description || 'Yêu cầu cứu trợ'

const getRequestStatusLabel = (status) => {
  const normalizedStatus = normalizeStatus(status)
  return REQUEST_STATUS_LABELS[normalizedStatus] || status || '-'
}

function AdminDashboardPage() {
  const navigate = useNavigate()
  const [currentUser] = useState(() => authService.getUserInfo())
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])
  const [teamSummary, setTeamSummary] = useState(DEFAULT_TEAM_SUMMARY)
  const [vehicleSummary, setVehicleSummary] = useState(DEFAULT_VEHICLE_SUMMARY)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const isAuthenticated = authService.isAuthenticated()
  const roleKey = normalizeRole(currentUser?.role)
  const hasAdminAccess = isAuthenticated && roleKey === 'ADMIN'
  const fallbackHomeRoute = HOME_ROUTE_BY_ROLE[roleKey] || '/'

  // Hàm trung tâm của dashboard admin:
  // tải song song nhiều API rồi tự ghép thành state tổng quan cho toàn trang.
  const loadOverview = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setIsLoading(true)
        setErrorMessage('')
      }

      const results = await Promise.allSettled([
        // Không có một API summary duy nhất, nên FE tự tổng hợp từ nhiều list API.
        adminService.getUsers(),
        adminService.getRescueTeams(),
        adminService.getRescueTeams('AVAILABLE'),
        adminService.getRescueTeams('BUSY'),
        adminService.getVehicles(),
        adminService.getVehicles('AVAILABLE'),
        adminService.getVehicles('INUSE'),
        adminService.getVehicles('MAINTENANCE'),
        adminService.getRequests(),
      ])

      const hasUnauthorized = results.some(
        (result) => result.status === 'rejected' && result.reason?.response?.status === 401,
      )
      if (hasUnauthorized) {
        authService.logout()
        navigate('/login', { replace: true })
        return
      }

      const toArray = (result) => (result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [])

      setUsers(toArray(results[0]))
      setTeamSummary({
        total: toArray(results[1]).length,
        available: toArray(results[2]).length,
        operating: toArray(results[3]).length,
      })
      setVehicleSummary({
        total: toArray(results[4]).length,
        available: toArray(results[5]).length,
        inUse: toArray(results[6]).length,
        maintenance: toArray(results[7]).length,
      })
      setRequests(toArray(results[8]))

      const hasNonAuthError = results.some(
        (result) => result.status === 'rejected' && result.reason?.response?.status !== 401,
      )
      if (hasNonAuthError) {
        setErrorMessage('Một phần dữ liệu admin chưa tải được. Vui lòng thử lại sau.')
      }

      if (!silent) {
        setIsLoading(false)
      }
    },
    [navigate],
  )

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    if (!hasAdminAccess) {
      return
    }

    loadOverview()
  }, [hasAdminAccess, isAuthenticated, loadOverview, navigate])

  useEffect(() => {
    if (!hasAdminAccess) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      loadOverview({ silent: true })
    }, 60000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [hasAdminAccess, loadOverview])

  const roleCards = useMemo(
    () =>
      ROLE_ORDER.map((role) => {
        const roleMeta = ROLE_CARD_META[role] || ROLE_CARD_META.CITIZEN
        const matchedUsers = users.filter((user) => normalizeRole(user.role) === role)

        return {
          key: role,
          icon: roleMeta.icon,
          iconClass: roleMeta.iconClass,
          label: adminService.getRoleLabel(role),
          total: matchedUsers.length,
          active: matchedUsers.filter((user) => user.isActive).length,
          inactive: matchedUsers.filter((user) => !user.isActive).length,
        }
      }),
    [users],
  )

  const maxRoleTotal = useMemo(
    () => roleCards.reduce((currentMax, card) => Math.max(currentMax, card.total), 0),
    [roleCards],
  )

  const { axisMarks: roleAxisMarks, roundedMax: roundedRoleMax } = useMemo(() => {
    const { marks, roundedMax } = buildChartAxisMarks(maxRoleTotal)
    return {
      axisMarks: [...marks].reverse(),
      roundedMax,
    }
  }, [maxRoleTotal])

  const roleChartMinHeight = useMemo(
    () =>
      Math.max(
        ADMIN_ROLE_CHART_VALUE_ROW_HEIGHT +
          ADMIN_ROLE_CHART_STAGE_MIN_HEIGHT +
          ADMIN_ROLE_CHART_LABEL_ROW_HEIGHT +
          ADMIN_ROLE_CHART_ROW_GAP * 2,
        (roleAxisMarks.length || 3) * 14 +
          ADMIN_ROLE_CHART_VALUE_ROW_HEIGHT +
          ADMIN_ROLE_CHART_LABEL_ROW_HEIGHT +
          ADMIN_ROLE_CHART_ROW_GAP * 2,
      ),
    [roleAxisMarks.length],
  )

  const getRoleAxisMarkerStyle = (value) => {
    const ratio = roundedRoleMax > 0 ? value / roundedRoleMax : 0
    return {
      bottom: `${ratio * 100}%`,
    }
  }

  const getRoleGridlineStyle = (value) => {
    const ratio = roundedRoleMax > 0 ? value / roundedRoleMax : 0
    return {
      bottom: `${ratio * 100}%`,
    }
  }

  const dashboardMetrics = useMemo(() => {
    // Gom thêm các chỉ số phục vụ review: user mới, user khóa, request chờ lâu, request flagged.
    const activeUsers = users.filter((user) => user.isActive)
    const lockedUsers = sortByCreatedDesc(users.filter((user) => !user.isActive))
    const latestUsers = sortByCreatedDesc(users).slice(0, 5)

    const todayNewUsersCount = users.filter((user) => isCreatedToday(user.createdAt)).length
    const last7DaysNewUsersCount = users.filter((user) => isWithinLastDays(user.createdAt, 7)).length

    const normalizedRequests = requests.map((request) => ({
      ...request,
      normalizedStatus: normalizeStatus(request.status),
    }))

    const latestRequests = sortByCreatedDesc(normalizedRequests).slice(0, 5)
    const oldestPendingRequest = sortByCreatedAsc(
      normalizedRequests.filter((request) => request.normalizedStatus === 'PENDING'),
    )[0] || null

    const highestPriorityOpenRequest =
      sortByCreatedAsc(
        normalizedRequests.filter(
          (request) =>
            Number(request.priorityLevelId) === 3 &&
            !TERMINAL_REQUEST_STATUSES.has(request.normalizedStatus),
        ),
      )[0] || null

    const cancelledRequestsCount = normalizedRequests.filter((request) => request.normalizedStatus === 'CANCELLED').length
    const duplicateRequestsCount = normalizedRequests.filter((request) => request.normalizedStatus === 'DUPLICATE').length
    const flaggedRequestsCount = cancelledRequestsCount + duplicateRequestsCount

    return {
      activeUsersCount: activeUsers.length,
      lockedUsers,
      lockedUsersCount: lockedUsers.length,
      latestUsers,
      todayNewUsersCount,
      last7DaysNewUsersCount,
      latestRequests,
      totalRequestsCount: normalizedRequests.length,
      cancelledRequestsCount,
      duplicateRequestsCount,
      flaggedRequestsCount,
      oldestPendingRequest,
      highestPriorityOpenRequest,
    }
  }, [requests, users])

  const handleLogout = () => {
    authService.logout()
    navigate('/login', { replace: true })
  }

  const feedback = errorMessage ? (
    <div className="admin-feedback error">
      <ExclamationTriangleIcon className="admin-feedback-icon" />
      <span>{errorMessage}</span>
    </div>
  ) : null

  return (
    <AdminLayout
      currentUser={currentUser}
      isAuthenticated={isAuthenticated}
      hasAdminAccess={hasAdminAccess}
      fallbackHomeRoute={fallbackHomeRoute}
      onLogout={handleLogout}
      isLoading={isLoading}
      feedback={feedback}
    >
      <div className="admin-card-stack">
        <div className="admin-dashboard-hero-grid">
          <section className="admin-overview-card admin-account-overview-section">
          <div className="admin-section-header">
            <div>
              <h2>Tổng quan tài khoản</h2>
              <p>Theo dõi cơ cấu vai trò và lực lượng cứu hộ.</p>
            </div>
            <div className="admin-summary-inline">
              <span>Tổng tài khoản: {users.length}</span>
              <span>Đang hoạt động: {dashboardMetrics.activeUsersCount}</span>
              <span>Tổng yêu cầu: {dashboardMetrics.totalRequestsCount}</span>
            </div>
          </div>

          <div className="admin-role-chart-card">
            <div className="admin-role-chart-wrap">
              <div className="admin-role-chart-axis-shell" style={{ minHeight: `${roleChartMinHeight}px` }}>
                <div className="admin-role-chart-axis-top-gap" aria-hidden="true" />
                <div className="admin-role-chart-axis">
                  {roleAxisMarks.map((mark) => (
                    <span key={`admin-role-axis-${mark}`} style={getRoleAxisMarkerStyle(mark)}>
                      {mark}
                    </span>
                  ))}
                </div>
                <div className="admin-role-chart-axis-bottom-gap" aria-hidden="true" />
              </div>

              <div className="admin-role-chart" style={{ minHeight: `${roleChartMinHeight}px` }}>
                {roleCards.map((card) => {
                  const RoleIcon = card.icon
                  const totalHeight = toBarHeightPercent(card.total, maxRoleTotal)
                  const activeHeight = card.total ? (card.active / card.total) * 100 : 0
                  const inactiveHeight = card.total ? (card.inactive / card.total) * 100 : 0

                  return (
                    <article
                      key={card.key}
                      className="admin-role-bar-card"
                      tabIndex={0}
                      aria-label={`${card.label}: tổng ${card.total}, hoạt động ${card.active}, tạm khóa ${card.inactive}`}
                    >
                      <div className="admin-role-bar-value">{card.total}</div>

                      <div className="admin-role-bar-stage">
                        {roleAxisMarks.map((mark) => (
                          <div
                            key={`${card.key}-grid-${mark}`}
                            className={`admin-role-bar-gridline${mark === 0 ? ' base' : ''}`}
                            style={getRoleGridlineStyle(mark)}
                          />
                        ))}

                        <div
                          className="admin-role-bar-anchor"
                          style={{ height: `${totalHeight}%` }}
                        >
                          <div
                            className={`admin-role-bar ${card.key.toLowerCase()}`}
                            style={{ height: '100%' }}
                          >
                            <div
                              className="admin-role-bar-segment inactive"
                              style={{ height: `${inactiveHeight}%` }}
                            />
                            <div
                              className="admin-role-bar-segment active"
                              style={{ height: `${activeHeight}%` }}
                            />
                          </div>

                          <div className="admin-role-tooltip">
                            <strong>{card.label}</strong>
                            <span>Tổng số: {card.total}</span>
                            <div className="admin-role-tooltip-row">
                              <i className="active" />
                              <span>Đang hoạt động: {card.active}</span>
                            </div>
                            <div className="admin-role-tooltip-row">
                              <i className="inactive" />
                              <span>Tạm khóa: {card.inactive}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="admin-role-bar-label">
                        <span className={`admin-role-card-icon ${card.iconClass}`}>
                          <RoleIcon className="admin-role-card-svg" />
                        </span>
                        <strong>{card.label}</strong>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
          </section>

          <div className="admin-dashboard-focus-stack">
            <article className="admin-focus-card warning-tone">
            <div className="admin-panel-header">
              <div>
                <h2>Yêu cầu chờ lâu nhất</h2>
                <p>Hồ sơ tồn đọng cần ưu tiên kiểm tra lại.</p>
              </div>
              <span className="admin-panel-chip warning">
                <ClockIcon className="admin-panel-chip-icon" />
                Chờ tiếp nhận
              </span>
            </div>

            {dashboardMetrics.oldestPendingRequest ? (
              <div className="admin-focus-body">
                <div className="admin-focus-meta">
                  <span className="admin-focus-time">Tồn đọng: {formatElapsedTime(dashboardMetrics.oldestPendingRequest.createdAt)}</span>
                  <span className="admin-badge request-status pending">Mới tạo</span>
                </div>
                <h3>#{dashboardMetrics.oldestPendingRequest.requestId} - {dashboardMetrics.oldestPendingRequest.citizenName || 'Khách vãng lai'}</h3>
                <p>{getRequestHeadline(dashboardMetrics.oldestPendingRequest)}</p>
                <dl className="admin-focus-details">
                  <div>
                    <dt>Địa chỉ</dt>
                    <dd>{dashboardMetrics.oldestPendingRequest.address || '-'}</dd>
                  </div>
                  <div>
                    <dt>Tạo lúc</dt>
                    <dd>{formatDateTimeVN(dashboardMetrics.oldestPendingRequest.createdAt)}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="admin-empty-state">Hiện không có yêu cầu nào ở trạng thái chờ tiếp nhận.</div>
            )}
            </article>

            <article className="admin-focus-card highlight">
            <div className="admin-panel-header">
              <div>
                <h2>Yêu cầu ưu tiên cao chưa được xử lý</h2>
                <p>Yêu cầu mức cao đang mở, cần theo dõi sát.</p>
              </div>
              <span className="admin-panel-chip danger">
                <ExclamationTriangleIcon className="admin-panel-chip-icon" />
                Ưu tiên cao
              </span>
            </div>

            {dashboardMetrics.highestPriorityOpenRequest ? (
              <div className="admin-focus-body">
                <div className="admin-focus-meta">
                  <span className="admin-focus-time">Chờ xử lý: {formatElapsedTime(dashboardMetrics.highestPriorityOpenRequest.createdAt)}</span>
                  <span
                    className={`admin-badge request-status ${dashboardMetrics.highestPriorityOpenRequest.normalizedStatus.toLowerCase()}`}
                  >
                    {getRequestStatusLabel(dashboardMetrics.highestPriorityOpenRequest.status)}
                  </span>
                </div>
                <h3>
                  #{dashboardMetrics.highestPriorityOpenRequest.requestId} -{' '}
                  {dashboardMetrics.highestPriorityOpenRequest.citizenName || 'Khách vãng lai'}
                </h3>
                <p>{getRequestHeadline(dashboardMetrics.highestPriorityOpenRequest)}</p>
                <dl className="admin-focus-details">
                  <div>
                    <dt>Địa chỉ</dt>
                    <dd>{dashboardMetrics.highestPriorityOpenRequest.address || '-'}</dd>
                  </div>
                  <div>
                    <dt>Mức ưu tiên</dt>
                    <dd>{formatPriority(dashboardMetrics.highestPriorityOpenRequest.priorityLevelId)}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="admin-empty-state">Không có yêu cầu ưu tiên cao nào đang chờ xử lý.</div>
            )}
            </article>
          </div>
        </div>

        <div className="admin-summary-dual-grid">
        <section className="admin-overview-card admin-summary-section">
          <div className="admin-section-header">
            <div>
              <h2>Tổng quan đội cứu hộ</h2>
              <p>Theo dõi quy mô và trạng thái sẵn sàng của lực lượng.</p>
            </div>
            <span className="admin-summary-chip">Tổng đội: {teamSummary.total}</span>
          </div>

          <div className="admin-team-grid">
            <article className="admin-team-card">
              <span className="admin-team-card-icon total">
                <UserGroupIcon className="admin-metric-svg" />
              </span>
              <div>
                <span>Tổng đội cứu hộ</span>
                <strong>{teamSummary.total}</strong>
              </div>
            </article>

            <article className="admin-team-card">
              <span className="admin-team-card-icon operating">
                <ArrowPathIcon className="admin-metric-svg" />
              </span>
              <div>
                <span>Đội đang hoạt động</span>
                <strong>{teamSummary.operating}</strong>
              </div>
            </article>

            <article className="admin-team-card">
              <span className="admin-team-card-icon available">
                <CheckCircleIcon className="admin-metric-svg" />
              </span>
              <div>
                <span>Đội rảnh</span>
                <strong>{teamSummary.available}</strong>
              </div>
            </article>
          </div>

          <div className="admin-summary-ratio-card">
            <div className="admin-summary-ratio-head">
              <p>Tỷ lệ đội rảnh / đang hoạt động</p>
              <strong>{formatPercent(teamSummary.available, teamSummary.total)} / {formatPercent(teamSummary.operating, teamSummary.total)}</strong>
            </div>

            <div className="admin-progress-track">
              <span
                className="admin-progress-segment available"
                style={{ width: `${teamSummary.total ? (teamSummary.available / teamSummary.total) * 100 : 0}%` }}
              />
              <span
                className="admin-progress-segment operating"
                style={{ width: `${teamSummary.total ? (teamSummary.operating / teamSummary.total) * 100 : 0}%` }}
              />
            </div>

            <div className="admin-metric-footer">
              <span>Đội rảnh: {teamSummary.available}</span>
              <span>Đội hoạt động: {teamSummary.operating}</span>
            </div>
          </div>
        </section>

        <section className="admin-overview-card admin-summary-section">
          <div className="admin-section-header">
            <div>
              <h2>Tổng quan phương tiện</h2>
              <p>Theo dõi tình trạng sẵn sàng của xe cứu hộ.</p>
            </div>
            <span className="admin-summary-chip">Tổng xe: {vehicleSummary.total}</span>
          </div>

          <div className="admin-team-grid admin-vehicle-grid">
            <article className="admin-team-card">
              <span className="admin-team-card-icon vehicle-available">
                <TruckIcon className="admin-metric-svg" />
              </span>
              <div>
                <span>Xe rảnh</span>
                <strong>{vehicleSummary.available}</strong>
              </div>
            </article>

            <article className="admin-team-card">
              <span className="admin-team-card-icon vehicle-busy">
                <ClockIcon className="admin-metric-svg" />
              </span>
              <div>
                <span>Xe bận</span>
                <strong>{vehicleSummary.inUse}</strong>
              </div>
            </article>

            <article className="admin-team-card">
              <span className="admin-team-card-icon vehicle-maintenance">
                <WrenchScrewdriverIcon className="admin-metric-svg" />
              </span>
              <div>
                <span>Xe bảo trì</span>
                <strong>{vehicleSummary.maintenance}</strong>
              </div>
            </article>
          </div>

          <div className="admin-summary-ratio-card">
            <div className="admin-summary-ratio-head">
              <p>Tỷ lệ xe rảnh / xe bận / bảo trì</p>
              <strong>
                {formatPercent(vehicleSummary.available, vehicleSummary.total)} / {formatPercent(vehicleSummary.inUse, vehicleSummary.total)} / {formatPercent(vehicleSummary.maintenance, vehicleSummary.total)}
              </strong>
            </div>

            <div className="admin-progress-track">
              <span
                className="admin-progress-segment available"
                style={{ width: `${vehicleSummary.total ? (vehicleSummary.available / vehicleSummary.total) * 100 : 0}%` }}
              />
              <span
                className="admin-progress-segment busy"
                style={{ width: `${vehicleSummary.total ? (vehicleSummary.inUse / vehicleSummary.total) * 100 : 0}%` }}
              />
              <span
                className="admin-progress-segment maintenance"
                style={{ width: `${vehicleSummary.total ? (vehicleSummary.maintenance / vehicleSummary.total) * 100 : 0}%` }}
              />
            </div>

            <div className="admin-metric-footer">
              <span>Xe rảnh: {vehicleSummary.available}</span>
              <span>Xe bận: {vehicleSummary.inUse}</span>
              <span>Bảo trì: {vehicleSummary.maintenance}</span>
            </div>
          </div>
        </section>
        </div>

        <section className="admin-dashboard-kpi-grid">
          <article className="admin-metric-card users">
            <div className="admin-metric-head">
              <div>
                <p>Tài khoản đang hoạt động / bị khóa</p>
                <strong>{dashboardMetrics.activeUsersCount} / {dashboardMetrics.lockedUsersCount}</strong>
              </div>
              <span className="admin-metric-icon users"><LockClosedIcon className="admin-metric-svg" /></span>
            </div>
            <div className="admin-progress-track">
              <span
                className="admin-progress-segment active"
                style={{ width: `${users.length ? (dashboardMetrics.activeUsersCount / users.length) * 100 : 0}%` }}
              />
              <span
                className="admin-progress-segment locked"
                style={{ width: `${users.length ? (dashboardMetrics.lockedUsersCount / users.length) * 100 : 0}%` }}
              />
            </div>
            <div className="admin-metric-footer">
              <span>Hoạt động: {formatPercent(dashboardMetrics.activeUsersCount, users.length)}</span>
              <span>Tạm khóa: {formatPercent(dashboardMetrics.lockedUsersCount, users.length)}</span>
            </div>
          </article>

          <article className="admin-metric-card calendar">
            <div className="admin-metric-head">
              <div>
                <p>Tài khoản tạo mới</p>
                <strong>{dashboardMetrics.todayNewUsersCount} hôm nay</strong>
              </div>
              <span className="admin-metric-icon calendar"><CalendarDaysIcon className="admin-metric-svg" /></span>
            </div>
            <div className="admin-pair-grid">
              <div className="admin-pair-cell">
                <span>Hôm nay</span>
                <strong>{dashboardMetrics.todayNewUsersCount}</strong>
              </div>
              <div className="admin-pair-cell">
                <span>7 ngày gần nhất</span>
                <strong>{dashboardMetrics.last7DaysNewUsersCount}</strong>
              </div>
            </div>
          </article>

          <article className="admin-metric-card requests">
            <div className="admin-metric-head">
              <div>
                <p>Tỷ lệ yêu cầu bị hủy hoặc trùng lặp</p>
                <strong>{formatPercent(dashboardMetrics.flaggedRequestsCount, dashboardMetrics.totalRequestsCount)}</strong>
              </div>
              <span className="admin-metric-icon requests"><ClipboardDocumentListIcon className="admin-metric-svg" /></span>
            </div>
            <div className="admin-progress-track single">
              <span
                className="admin-progress-segment attention"
                style={{
                  width: `${dashboardMetrics.totalRequestsCount ? (dashboardMetrics.flaggedRequestsCount / dashboardMetrics.totalRequestsCount) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="admin-metric-footer">
              <span>Đã hủy: {dashboardMetrics.cancelledRequestsCount}</span>
              <span>Trùng lặp: {dashboardMetrics.duplicateRequestsCount}</span>
            </div>
          </article>
        </section>


        <section className="admin-dashboard-list-grid">
          <article className="admin-list-card">
            <div className="admin-panel-header">
              <div>
                <h2>Tài khoản đang bị khóa</h2>
                <p>Hiển thị 5 tài khoản khóa gần đây nhất để rà soát nhanh.</p>
              </div>
              <span className="admin-panel-chip neutral">{dashboardMetrics.lockedUsersCount} tài khoản</span>
            </div>

            {dashboardMetrics.lockedUsersCount > 0 ? (
              <div className="admin-compact-list">
                {dashboardMetrics.lockedUsers.slice(0, 5).map((user) => (
                  <article key={user.userId} className="admin-compact-item">
                    <div className="admin-compact-main">
                      <strong>{user.fullName || user.username || '-'}</strong>
                      <span>{user.email || user.phone || '-'}</span>
                    </div>
                    <div className="admin-compact-side">
                      <span className="admin-badge inactive">Tạm khóa</span>
                      <small>{formatDateTimeVN(user.createdAt)}</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-empty-state">Chưa có tài khoản nào đang bị khóa.</div>
            )}
          </article>

          <article className="admin-list-card">
            <div className="admin-panel-header">
              <div>
                <h2>Yêu cầu mới nhất</h2>
                <p>Theo thứ tự thời gian tạo gần nhất.</p>
              </div>
              <span className="admin-panel-chip neutral">{dashboardMetrics.latestRequests.length} / 5</span>
            </div>

            {dashboardMetrics.latestRequests.length > 0 ? (
              <div className="admin-compact-list">
                {dashboardMetrics.latestRequests.map((request) => (
                  <article key={request.requestId} className="admin-compact-item">
                    <div className="admin-compact-main">
                      <strong>#{request.requestId} · {request.citizenName || 'Khách vãng lai'}</strong>
                      <span>{getRequestHeadline(request)}</span>
                    </div>
                    <div className="admin-compact-side wide">
                      <span className={`admin-badge request-status ${request.normalizedStatus.toLowerCase()}`}>
                        {getRequestStatusLabel(request.status)}
                      </span>
                      <small>{formatPriority(request.priorityLevelId)} · {formatDateTimeVN(request.createdAt)}</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-empty-state">Chưa có yêu cầu nào để hiển thị.</div>
            )}
          </article>

          <article className="admin-list-card">
            <div className="admin-panel-header">
              <div>
                <h2>Tài khoản tạo gần nhất</h2>
                <p>Theo dõi nhịp độ phát sinh tài khoản mới.</p>
              </div>
              <span className="admin-panel-chip neutral">{dashboardMetrics.latestUsers.length} / 5</span>
            </div>

            {dashboardMetrics.latestUsers.length > 0 ? (
              <div className="admin-compact-list">
                {dashboardMetrics.latestUsers.map((user) => (
                  <article key={user.userId} className="admin-compact-item">
                    <div className="admin-compact-main">
                      <strong>{user.fullName || user.username || '-'}</strong>
                      <span>{user.email || user.phone || '-'}</span>
                    </div>
                    <div className="admin-compact-side wide">
                      <span className="admin-badge role">{adminService.getRoleLabel(user.role)}</span>
                      <small>{user.isActive ? 'Đang hoạt động' : 'Tạm khóa'} · {formatDateTimeVN(user.createdAt)}</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-empty-state">Chưa có tài khoản nào để hiển thị.</div>
            )}
          </article>
        </section>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboardPage
