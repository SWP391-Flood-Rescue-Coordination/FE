import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import coordinatorService from '../services/coordinatorService'
import CoordinatorRequestsPage from './CoordinatorRequestsPage'
import './CoordinatorDashboardPage.css'

const REQUEST_STATUS_ITEMS = [
  { key: 'PENDING', label: 'Chờ tiếp nhận', statusText: 'Pending', color: '#dc2626', textColor: '#ffffff' },
  { key: 'VERIFIED', label: 'Đã xác minh', statusText: 'Verified', color: '#ef4444', textColor: '#ffffff' },
  { key: 'IN_PROGRESS', label: 'Đang xử lý', statusText: 'In Progress', color: '#fca5a5', textColor: '#111827' },
  { key: 'COMPLETED', label: 'Hoàn tất', statusText: 'Completed', color: '#ffffff', textColor: '#111827' },
  { key: 'CANCELLED', label: 'Đã hủy', statusText: 'Cancelled', color: '#93c5fd', textColor: '#0f172a' },
  { key: 'DUPLICATE', label: 'Trùng lặp', statusText: 'Duplicate', color: '#1e3a8a', textColor: '#ffffff' },
]

const TEAM_IN_PROGRESS_STATUSES = new Set(['ACTIVE', 'IN_PROGRESS', 'BUSY', 'WORKING', 'ON_DUTY'])
const TEAM_AVAILABLE_STATUSES = new Set(['AVAILABLE', 'READY', 'IDLE'])
const TEAM_UNDERSTAFFED_STATUSES = new Set(['UNDERSTAFFED', 'LACK_MEMBER', 'INSUFFICIENT_MEMBER'])

const IN_USE_VEHICLE_STATUSES = new Set(['IN_USE', 'INUSE', 'BUSY', 'ASSIGNED', 'ACTIVE'])
const MAINTENANCE_VEHICLE_STATUSES = new Set(['MAINTENANCE', 'IN_MAINTENANCE', 'REPAIR'])

const MOCK_REQUESTS = [
  { request_id: 1001, status: 'PENDING' },
  { request_id: 1002, status: 'VERIFIED' },
  { request_id: 1003, status: 'IN_PROGRESS' },
  { request_id: 1004, status: 'COMPLETED' },
  { request_id: 1005, status: 'CANCELLED' },
  { request_id: 1006, status: 'DUPLICATE' },
]

const MOCK_TEAMS = [
  { id: 1, status: 'AVAILABLE' },
  { id: 2, status: 'ACTIVE' },
  { id: 3, status: 'IN_PROGRESS' },
  { id: 4, status: 'UNDERSTAFFED' },
]

const MOCK_VEHICLES = [
  { id: 1, status: 'AVAILABLE' },
  { id: 2, status: 'IN_USE' },
  { id: 3, status: 'MAINTENANCE' },
  { id: 4, status: 'AVAILABLE' },
]

const normalizeStatus = (value) => String(value ?? '').trim().toUpperCase()
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

const buildTeamSummary = (teamItems) => {
  const total = teamItems.length
  const inProgress = teamItems.filter((item) => TEAM_IN_PROGRESS_STATUSES.has(normalizeStatus(item.status))).length
  const available = teamItems.filter((item) => TEAM_AVAILABLE_STATUSES.has(normalizeStatus(item.status))).length
  const understaffed = teamItems.filter((item) => TEAM_UNDERSTAFFED_STATUSES.has(normalizeStatus(item.status))).length
  return { total, inProgress, available, understaffed }
}

const buildVehicleSummary = (vehicleItems) => {
  const available = vehicleItems.filter((item) => normalizeStatus(item.status) === 'AVAILABLE').length
  const inUse = vehicleItems.filter((item) => IN_USE_VEHICLE_STATUSES.has(normalizeStatus(item.status))).length
  const maintenance = vehicleItems.filter((item) => MAINTENANCE_VEHICLE_STATUSES.has(normalizeStatus(item.status))).length
  return { available, inUse, maintenance }
}

function CoordinatorDashboardPage() {
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [requestsStatusFilter, setRequestsStatusFilter] = useState('')
  const [requestStatusSummary, setRequestStatusSummary] = useState(createInitialStatusSummary())
  const [teamSummary, setTeamSummary] = useState({ total: 0, inProgress: 0, available: 0, understaffed: 0 })
  const [vehicleSummary, setVehicleSummary] = useState({ available: 0, inUse: 0, maintenance: 0 })

  const fetchDashboardStats = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const [allRequests, allTeams, allVehicles] = await Promise.all([
        coordinatorService.getRescueRequests(''),
        coordinatorService.getRescueTeams(),
        coordinatorService.getVehicles(),
      ])

      const requestSource = allRequests.length > 0 ? allRequests : MOCK_REQUESTS
      const teamSource = allTeams.length > 0 ? allTeams : MOCK_TEAMS
      const vehicleSource = allVehicles.length > 0 ? allVehicles : MOCK_VEHICLES

      setRequestStatusSummary(buildRequestStatusSummary(requestSource))
      setTeamSummary(buildTeamSummary(teamSource))
      setVehicleSummary(buildVehicleSummary(vehicleSource))
    } catch (error) {
      if (error?.response?.status === 401) {
        navigate('/login', { replace: true })
        return
      }

      setErrorMessage('Không thể tải dữ liệu tổng quan. Đang hiển thị dữ liệu mẫu.')
      setRequestStatusSummary(buildRequestStatusSummary(MOCK_REQUESTS))
      setTeamSummary(buildTeamSummary(MOCK_TEAMS))
      setVehicleSummary(buildVehicleSummary(MOCK_VEHICLES))
    } finally {
      setIsLoading(false)
    }
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

  const metricCards = useMemo(
    () => [
      { key: 'team-total', icon: '👥', label: 'Tổng số đội', value: teamSummary.total },
      { key: 'team-progress', icon: '🚨', label: 'Đội đang xử lý', value: teamSummary.inProgress },
      { key: 'team-ready', icon: '✅', label: 'Đội rảnh', value: teamSummary.available },
      { key: 'team-understaffed', icon: '⚠️', label: 'Đội thiếu thành viên', value: teamSummary.understaffed },
      { key: 'vehicle-available', icon: '🚑', label: 'Xe sẵn sàng', value: vehicleSummary.available },
      { key: 'vehicle-inuse', icon: '🚛', label: 'Xe đang sử dụng', value: vehicleSummary.inUse },
      { key: 'vehicle-maintenance', icon: '🛠️', label: 'Xe bảo trì', value: vehicleSummary.maintenance },
    ],
    [teamSummary, vehicleSummary],
  )

  const topMetricCards = metricCards.slice(0, 4)
  const bottomMetricCards = metricCards.slice(4)

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
          <button type="button" className="coordinator-home-secondary" onClick={scrollToRequestTable}>
            Danh sách yêu cầu
          </button>
          <button type="button" className="coordinator-home-primary" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="coordinator-home-content">
        {errorMessage && <div className="coordinator-home-feedback">{errorMessage}</div>}

        <section className="coordinator-status-panel">
          <div className="coordinator-status-title-row">
            <h2>Thanh tiến độ trạng thái yêu cầu cứu hộ</h2>
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
                  {card.icon}
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
                  {card.icon}
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
