import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftOnRectangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import coordinatorService from '../services/coordinatorService'
import CoordinatorRequestsPage from './CoordinatorRequestsPage'
import './CoordinatorDashboardPage.css'

const REQUEST_STATUS_ITEMS = [
  { key: 'PENDING', label: 'Chờ tiếp nhận', statusText: 'Pending', color: '#dc2626', textColor: '#ffffff' },
  { key: 'VERIFIED', label: 'Đã xác minh', statusText: 'Verified', color: '#ef4444', textColor: '#ffffff' },
  { key: 'ASSIGNED', label: 'Đang xử lý', statusText: 'In Progress', color: '#fca5a5', textColor: '#111827' },
  { key: 'COMPLETED', label: 'Hoàn tất', statusText: 'Completed', color: '#ffffff', textColor: '#111827' },
  { key: 'CANCELLED', label: 'Đã hủy', statusText: 'Cancelled', color: '#93c5fd', textColor: '#0f172a' },
  { key: 'DUPLICATE', label: 'Trùng lặp', statusText: 'Duplicate', color: '#1e3a8a', textColor: '#ffffff' },
]

const normalizeStatus = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

const normalizeCancelledStatus = (status) => (status === 'CANCELED' ? 'CANCELLED' : status)

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
    const status = normalizeCancelledStatus(normalizeStatus(item.status))
    if (summary[status] !== undefined) {
      summary[status] += 1
    }
  })
  return summary
}

function CoordinatorDashboardPage() {
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [requestsStatusFilter, setRequestsStatusFilter] = useState('')
  const [requestStatusSummary, setRequestStatusSummary] = useState(createInitialStatusSummary())
  const [teamSummary, setTeamSummary] = useState({ total: 0, inProgress: 0, available: 0 })
  const [vehicleSummary, setVehicleSummary] = useState({ available: 0, inUse: 0, maintenance: 0 })

  const fetchDashboardStats = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    const results = await Promise.allSettled([
      coordinatorService.getRescueRequests(''),
      coordinatorService.getAvailableRescueTeams(),
      coordinatorService.getAvailableRescueTeams('AVAILABLE'),
      coordinatorService.getAvailableRescueTeams('BUSY'),
      coordinatorService.getVehicles('Available'),
      coordinatorService.getVehicles('InUse'),
      coordinatorService.getVehicles('Maintenance'),
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

  const totalRequests = useMemo(
    () => REQUEST_STATUS_ITEMS.reduce((total, item) => total + (requestStatusSummary[item.key] ?? 0), 0),
    [requestStatusSummary],
  )

  const statusSegments = useMemo(() => {
    if (totalRequests <= 0) {
      return []
    }

    return REQUEST_STATUS_ITEMS.map((item) => {
      const count = requestStatusSummary[item.key] ?? 0
      if (count <= 0) {
        return null
      }

      return {
        ...item,
        count,
        widthPercent: (count / totalRequests) * 100,
      }
    }).filter(Boolean)
  }, [requestStatusSummary, totalRequests])

  const progressGradient = useMemo(() => {
    if (statusSegments.length === 0) {
      return ''
    }

    if (statusSegments.length === 1) {
      return `${statusSegments[0].color} 0%, ${statusSegments[0].color} 100%`
    }

    const blendWidth = 0.8
    let accumulated = 0
    const stops = [`${statusSegments[0].color} 0%`]

    for (let index = 0; index < statusSegments.length - 1; index += 1) {
      accumulated += statusSegments[index].widthPercent
      const boundary = Math.min(100, Math.max(0, accumulated))
      const fromStop = Math.max(0, boundary - blendWidth)
      const toStop = Math.min(100, boundary + blendWidth)
      const currentColor = statusSegments[index].color
      const nextColor = statusSegments[index + 1].color

      stops.push(`${currentColor} ${fromStop}%`)
      stops.push(`${nextColor} ${toStop}%`)
    }

    const lastColor = statusSegments[statusSegments.length - 1].color
    stops.push(`${lastColor} 100%`)
    return stops.join(', ')
  }, [statusSegments])

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
    setRequestsStatusFilter(statusKey)
    window.setTimeout(scrollToRequestTable, 80)
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    navigate('/login', { replace: true })
  }

  return (
    <div className="coordinator-home-page">
      <header className="coordinator-home-header">
        <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>
        <div className="coordinator-home-actions">
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

          <div
            className={`coordinator-status-track ${statusSegments.length === 0 ? 'is-empty' : ''}`}
            style={progressGradient ? { backgroundImage: `linear-gradient(90deg, ${progressGradient})` } : undefined}
          >
            {statusSegments.length === 0 && <div className="coordinator-status-empty">Chưa có yêu cầu để hiển thị thanh tiến độ.</div>}

            {statusSegments.map((item) => (
              <button
                key={item.key}
                type="button"
                className="coordinator-status-segment"
                style={{ width: `${item.widthPercent}%`, color: item.textColor }}
                onClick={() => handleSelectStatusSegment(item.key)}
                disabled={isLoading}
                title={`${item.statusText}: ${item.count}`}
              >
                <span className="segment-main-label">{item.label}</span>
                <span className="segment-sub-label">{item.statusText}</span>
                <strong className="segment-count">{isLoading ? '...' : item.count}</strong>
              </button>
            ))}
          </div>
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
