import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import coordinatorService from '../services/coordinatorService'
import './CoordinatorRequestsPage.css'

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING', label: 'Mới tạo' },
  { value: 'VERIFIED', label: 'Đã xác minh' },
  { value: 'ASSIGNED', label: 'Đã phân công' },
  { value: 'IN_PROGRESS', label: 'Đang xử lý' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'CANCELLED', label: 'Hủy' },
  { value: 'DUPLICATE', label: 'Trùng lặp' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'HIGH', label: 'Cao' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'LOW', label: 'Thấp' },
]

const REQUEST_STATUS_DASHBOARD_ITEMS = [
  { key: 'PENDING', label: 'Mới tạo' },
  { key: 'VERIFIED', label: 'Đã xác minh' },
  { key: 'IN_PROGRESS', label: 'Đang xử lý' },
  { key: 'COMPLETED', label: 'Hoàn tất' },
  { key: 'CANCELLED', label: 'Hủy' },
  { key: 'DUPLICATE', label: 'Trùng lặp' },
]

const ACTIVE_TEAM_STATUSES = new Set(['ACTIVE', 'IN_PROGRESS', 'BUSY', 'WORKING', 'ON_DUTY'])
const IN_USE_VEHICLE_STATUSES = new Set(['IN_USE', 'INUSE', 'BUSY', 'ASSIGNED', 'ACTIVE'])
const MAINTENANCE_VEHICLE_STATUSES = new Set(['MAINTENANCE', 'IN_MAINTENANCE', 'REPAIR'])

const STATUS_LABEL_MAP = {
  PENDING: 'Mới tạo',
  VERIFIED: 'Đã xác minh',
  ASSIGNED: 'Đã phân công',
  IN_PROGRESS: 'Đang xử lý',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Hủy',
  DUPLICATE: 'Trùng lặp',
  REJECTED: 'Từ chối',
}

const MOCK_PRIORITY_LEVELS = [
  { id: 1, name: 'Thấp' },
  { id: 2, name: 'Trung bình' },
  { id: 3, name: 'Cao' },
]

const MOCK_TEAMS = [
  { id: 1, team_name: 'Đội Cứu hộ Quận 1', status: 'AVAILABLE' },
  { id: 2, team_name: 'Đội Cứu hộ Quận 3', status: 'ACTIVE' },
  { id: 3, team_name: 'Đội Cứu hộ Quận 7', status: 'IN_PROGRESS' },
  { id: 4, team_name: 'Đội Cứu hộ Bình Thạnh', status: 'AVAILABLE' },
]

const MOCK_VEHICLES = [
  { id: 1, plate_number: '51A-123.45', status: 'AVAILABLE' },
  { id: 2, plate_number: '51B-222.22', status: 'IN_USE' },
  { id: 3, plate_number: '51C-333.33', status: 'MAINTENANCE' },
  { id: 4, plate_number: '51D-444.44', status: 'AVAILABLE' },
]

const MOCK_REQUESTS = [
  {
    request_id: 1001,
    citizen_id: 501,
    title: 'Gia đình bị mắc kẹt do ngập',
    phone: '0901234567',
    description: 'Nhà ngập sâu 1.2m, có người già cần hỗ trợ khẩn cấp.',
    latitude: 10.7756,
    longitude: 106.7019,
    address: '12 Nguyễn Huệ, Quận 1, TP.HCM',
    priority_level_id: null,
    status: 'PENDING',
    created_at: '2026-02-25T08:30:00Z',
    updated_at: '2026-02-25T08:30:00Z',
    updated_by: 'system',
  },
  {
    request_id: 1002,
    citizen_id: 502,
    title: 'Cần sơ tán trẻ em',
    phone: '0912345678',
    description: 'Khu vực nước dâng nhanh, cần di chuyển trẻ em đến nơi an toàn.',
    latitude: 10.7812,
    longitude: 106.6953,
    address: '88 Võ Văn Tần, Quận 3, TP.HCM',
    priority_level_id: 3,
    status: 'VERIFIED',
    created_at: '2026-02-25T07:45:00Z',
    updated_at: '2026-02-25T08:20:00Z',
    updated_by: 'coordinator_01',
  },
  {
    request_id: 1003,
    citizen_id: 503,
    title: 'Thiếu nhu yếu phẩm',
    phone: '0922333444',
    description: 'Khu dân cư bị cô lập, cần nước uống và thực phẩm.',
    latitude: 10.7433,
    longitude: 106.6831,
    address: '45 Tôn Đản, Quận 4, TP.HCM',
    priority_level_id: 2,
    status: 'IN_PROGRESS',
    created_at: '2026-02-24T15:20:00Z',
    updated_at: '2026-02-25T06:10:00Z',
    updated_by: 'team_lead_02',
  },
  {
    request_id: 1004,
    citizen_id: 504,
    title: 'Giải cứu người mắc kẹt trên mái nhà',
    phone: '0934555666',
    description: 'Đã được cứu hộ thành công, đang theo dõi sau cứu trợ.',
    latitude: 10.7611,
    longitude: 106.6705,
    address: '101 Trần Hưng Đạo, Quận 5, TP.HCM',
    priority_level_id: 3,
    status: 'COMPLETED',
    created_at: '2026-02-24T10:05:00Z',
    updated_at: '2026-02-24T13:40:00Z',
    updated_by: 'coordinator_02',
  },
  {
    request_id: 1005,
    citizen_id: 505,
    title: 'Yêu cầu hủy do đã tự di chuyển',
    phone: '0945666777',
    description: 'Người dân đã rời khỏi khu vực nguy hiểm, không cần cứu hộ.',
    latitude: 10.7892,
    longitude: 106.7201,
    address: '77 Phan Xích Long, Phú Nhuận, TP.HCM',
    priority_level_id: 1,
    status: 'CANCELLED',
    created_at: '2026-02-24T09:10:00Z',
    updated_at: '2026-02-24T09:55:00Z',
    updated_by: 'coordinator_03',
  },
  {
    request_id: 1006,
    citizen_id: 506,
    title: 'Yêu cầu bị trùng',
    phone: '0956777888',
    description: 'Trùng với request #1001 từ cùng vị trí và liên hệ.',
    latitude: 10.7756,
    longitude: 106.7019,
    address: '12 Nguyễn Huệ, Quận 1, TP.HCM',
    priority_level_id: 2,
    status: 'DUPLICATE',
    created_at: '2026-02-25T08:35:00Z',
    updated_at: '2026-02-25T08:50:00Z',
    updated_by: 'coordinator_01',
  },
]

const normalizeText = (value) => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const getStatusText = (status) => {
  if (!status) {
    return '-'
  }
  return String(status).toUpperCase()
}

const getPriorityInfo = (priorityLevelId, priorityRaw) => {
  const numericId = Number(priorityLevelId)
  if (!Number.isNaN(numericId)) {
    if (numericId === 3) {
      return { key: 'HIGH', label: 'Cao' }
    }

    if (numericId === 2) {
      return { key: 'MEDIUM', label: 'Trung bình' }
    }

    if (numericId === 1) {
      return { key: 'LOW', label: 'Thấp' }
    }
  }

  if (priorityRaw !== null && priorityRaw !== undefined && priorityRaw !== '') {
    const normalized = normalizeText(priorityRaw)
    if (normalized.includes('cao') || normalized.includes('high')) {
      return { key: 'HIGH', label: 'Cao' }
    }

    if (normalized.includes('trung') || normalized.includes('medium')) {
      return { key: 'MEDIUM', label: 'Trung bình' }
    }

    if (normalized.includes('thap') || normalized.includes('low')) {
      return { key: 'LOW', label: 'Thấp' }
    }
  }

  return { key: '', label: '-' }
}

const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }
  return parsed.toLocaleString('vi-VN')
}

const formatLocation = (latitude, longitude) => {
  const hasLat = latitude !== null && latitude !== undefined && latitude !== ''
  const hasLng = longitude !== null && longitude !== undefined && longitude !== ''

  if (!hasLat && !hasLng) {
    return '-'
  }

  if (hasLat && hasLng) {
    return `${latitude}, ${longitude}`
  }

  if (hasLat) {
    return `${latitude}`
  }

  return `${longitude}`
}

const toNumberIfPossible = (value) => {
  const numeric = Number(value)
  return Number.isNaN(numeric) ? value : numeric
}

const normalizeRequest = (item) => {
  const priorityLevelId = item.priority_level_id ?? item.priorityLevelId ?? null
  const priorityRaw =
    item.priority_name ?? item.priorityName ?? item.priority_level_name ?? item.priorityLevelName ?? item.priority ?? null
  const priorityInfo = getPriorityInfo(priorityLevelId, priorityRaw)

  return {
    request_id: item.request_id ?? item.requestId ?? item.id ?? null,
    citizen_id: item.citizen_id ?? item.citizenId ?? null,
    title: item.title ?? '',
    phone: item.phone ?? item.contact_phone ?? item.contactPhone ?? '',
    description: item.description ?? '',
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    address: item.address ?? '',
    priority_level_id: priorityLevelId,
    priority_key: priorityInfo.key,
    priority_label: priorityInfo.label,
    status: getStatusText(item.status),
    created_at: item.created_at ?? item.createdAt ?? null,
    updated_at: item.updated_at ?? item.updatedAt ?? null,
    updated_by: item.updated_by ?? item.updatedBy ?? null,
  }
}

const normalizePriority = (item) => ({
  id: item.priority_level_id ?? item.priorityLevelId ?? item.id ?? item.value ?? null,
  label: item.name ?? item.priority_name ?? item.priorityName ?? item.label ?? `Priority ${item.id ?? ''}`.trim(),
})

const normalizeTeam = (item) => ({
  id: item.rescue_team_id ?? item.rescueTeamId ?? item.team_id ?? item.teamId ?? item.id ?? null,
  name: item.team_name ?? item.teamName ?? item.name ?? `Team ${item.id ?? ''}`.trim(),
  status: getStatusText(item.status),
})

const normalizeVehicle = (item) => ({
  id: item.vehicle_id ?? item.vehicleId ?? item.id ?? null,
  name: item.plate_number ?? item.plateNumber ?? item.vehicle_name ?? item.vehicleName ?? item.name ?? `Vehicle ${item.id ?? ''}`.trim(),
  status: getStatusText(item.status),
})

const createInitialRequestStatusSummary = () =>
  REQUEST_STATUS_DASHBOARD_ITEMS.reduce(
    (accumulator, item) => ({
      ...accumulator,
      [item.key]: 0,
    }),
    {},
  )

const normalizeCancelledStatus = (status) => {
  if (status === 'CANCELED') {
    return 'CANCELLED'
  }
  return status
}

const getStatusLabel = (status) => STATUS_LABEL_MAP[normalizeCancelledStatus(status)] || status || '-'

const buildRequestStatusSummary = (requestItems) => {
  const summary = createInitialRequestStatusSummary()
  requestItems.forEach((item) => {
    const normalizedStatus = normalizeCancelledStatus(getStatusText(item.status))
    if (summary[normalizedStatus] !== undefined) {
      summary[normalizedStatus] += 1
    }
  })
  return summary
}

const getTeamStatusText = (item) => getStatusText(item.status ?? item.team_status ?? item.teamStatus)

const buildTeamSummary = (teamItems) => {
  const total = teamItems.length
  const active = teamItems.filter((item) => ACTIVE_TEAM_STATUSES.has(getTeamStatusText(item))).length
  return { total, active }
}

const getVehicleStatusText = (item) => getStatusText(item.status ?? item.vehicle_status ?? item.vehicleStatus)

const buildVehicleSummary = (vehicleItems) => {
  const available = vehicleItems.filter((item) => getVehicleStatusText(item) === 'AVAILABLE').length
  const inUse = vehicleItems.filter((item) => IN_USE_VEHICLE_STATUSES.has(getVehicleStatusText(item))).length
  const maintenance = vehicleItems.filter((item) => MAINTENANCE_VEHICLE_STATUSES.has(getVehicleStatusText(item))).length
  return { available, inUse, maintenance }
}

const buildApiMessage = (error) => {
  const data = error?.response?.data
  return data?.message || data?.error || data?.title || 'Có lỗi xảy ra, vui lòng thử lại.'
}

function CoordinatorRequestsPage() {
  const navigate = useNavigate()

  const [requests, setRequests] = useState([])
  const [priorityLevels, setPriorityLevels] = useState([])
  const [teams, setTeams] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [requestStatusSummary, setRequestStatusSummary] = useState(createInitialRequestStatusSummary())
  const [teamSummary, setTeamSummary] = useState({ total: 0, active: 0 })
  const [vehicleSummary, setVehicleSummary] = useState({ available: 0, inUse: 0, maintenance: 0 })

  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false)
  const [isPriorityFilterOpen, setIsPriorityFilterOpen] = useState(false)
  const [isListLoading, setIsListLoading] = useState(false)
  const [actionLoadingMap, setActionLoadingMap] = useState({})
  const [verifyEditMap, setVerifyEditMap] = useState({})

  const [selectedPriorityByRequest, setSelectedPriorityByRequest] = useState({})
  const [selectedTeamByRequest, setSelectedTeamByRequest] = useState({})
  const [selectedVehicleByRequest, setSelectedVehicleByRequest] = useState({})

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const statusFilterRef = useRef(null)
  const priorityFilterRef = useRef(null)

  const setActionLoading = (requestId, actionName, value) => {
    const key = `${requestId}:${actionName}`
    setActionLoadingMap((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const isActionLoading = (requestId, actionName) => Boolean(actionLoadingMap[`${requestId}:${actionName}`])

  const handleApiError = useCallback(
    (error, conflictMessage, options = {}) => {
      const { silent = false } = options
      const status = error?.response?.status

      if (status === 401) {
        navigate('/login', { replace: true })
        return { shouldReload: false }
      }

      if (silent) {
        return { shouldReload: status === 409 }
      }

      if (status === 403) {
        setErrorMessage('Bạn không có quyền thực hiện thao tác này.')
        return { shouldReload: false }
      }

      if (status === 409) {
        setErrorMessage(conflictMessage || 'Dữ liệu đã thay đổi, vui lòng tải lại.')
        return { shouldReload: true }
      }

      if (status >= 500) {
        setErrorMessage('Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.')
        return { shouldReload: false }
      }

      setErrorMessage(buildApiMessage(error))
      return { shouldReload: false }
    },
    [navigate],
  )

  const fetchRequestList = useCallback(async () => {
    setIsListLoading(true)
    setErrorMessage('')
    try {
      const data = await coordinatorService.getRescueRequests(statusFilter)
      const fallbackRequests = statusFilter
        ? MOCK_REQUESTS.filter((item) => normalizeCancelledStatus(getStatusText(item.status)) === statusFilter)
        : MOCK_REQUESTS
      const sourceRequests = data.length > 0 ? data : fallbackRequests
      const normalized = sourceRequests.map(normalizeRequest)
      setRequests(normalized)
      setVerifyEditMap({})
    } catch (error) {
      handleApiError(error, '', { silent: true })
      const fallbackRequests = statusFilter
        ? MOCK_REQUESTS.filter((item) => normalizeCancelledStatus(getStatusText(item.status)) === statusFilter)
        : MOCK_REQUESTS
      setRequests(fallbackRequests.map(normalizeRequest))
      setVerifyEditMap({})
    } finally {
      setIsListLoading(false)
    }
  }, [handleApiError, statusFilter])

  const fetchOptionData = useCallback(async () => {
    setErrorMessage('')

    try {
      const [priorityData, teamData, vehicleData] = await Promise.all([
        coordinatorService.getPriorityLevels(),
        coordinatorService.getAvailableRescueTeams(),
        coordinatorService.getAvailableVehicles(),
      ])

      const prioritySource = priorityData.length > 0 ? priorityData : MOCK_PRIORITY_LEVELS
      const teamSource = teamData.length > 0 ? teamData : MOCK_TEAMS
      const vehicleSource = vehicleData.length > 0 ? vehicleData : MOCK_VEHICLES

      const normalizedPriorities = prioritySource.map(normalizePriority).filter((item) => item.id !== null)
      const normalizedTeams = teamSource
        .map(normalizeTeam)
        .filter((item) => item.id !== null)
        .filter((item) => !item.status || item.status === 'AVAILABLE')
      const normalizedVehicles = vehicleSource
        .map(normalizeVehicle)
        .filter((item) => item.id !== null)
        .filter((item) => !item.status || item.status === 'AVAILABLE')

      setPriorityLevels(normalizedPriorities)
      setTeams(normalizedTeams)
      setVehicles(normalizedVehicles)
    } catch (error) {
      handleApiError(error, '', { silent: true })
      setPriorityLevels(MOCK_PRIORITY_LEVELS.map(normalizePriority))
      setTeams(MOCK_TEAMS.map(normalizeTeam).filter((item) => item.status === 'AVAILABLE'))
      setVehicles(MOCK_VEHICLES.map(normalizeVehicle).filter((item) => item.status === 'AVAILABLE'))
    }
  }, [handleApiError])

  const fetchDashboardStats = useCallback(async () => {
    setIsSummaryLoading(true)
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
      handleApiError(error, '', { silent: true })
      setRequestStatusSummary(buildRequestStatusSummary(MOCK_REQUESTS))
      setTeamSummary(buildTeamSummary(MOCK_TEAMS))
      setVehicleSummary(buildVehicleSummary(MOCK_VEHICLES))
    } finally {
      setIsSummaryLoading(false)
    }
  }, [handleApiError])

  const reloadAll = useCallback(async () => {
    await Promise.all([fetchRequestList(), fetchOptionData(), fetchDashboardStats()])
  }, [fetchDashboardStats, fetchOptionData, fetchRequestList])

  useEffect(() => {
    fetchRequestList()
  }, [fetchRequestList])

  useEffect(() => {
    fetchOptionData()
  }, [fetchOptionData])

  useEffect(() => {
    fetchDashboardStats()
  }, [fetchDashboardStats])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const clickedStatusFilter = statusFilterRef.current?.contains(event.target)
      const clickedPriorityFilter = priorityFilterRef.current?.contains(event.target)

      if (!clickedStatusFilter) {
        setIsStatusFilterOpen(false)
      }

      if (!clickedPriorityFilter) {
        setIsPriorityFilterOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  const displayedRequests = useMemo(() => {
    const filtered = priorityFilter ? requests.filter((item) => item.priority_key === priorityFilter) : requests

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateB - dateA
    })

    return sorted
  }, [requests, priorityFilter])

  const handlePriorityChange = (requestId, value) => {
    setSelectedPriorityByRequest((prev) => ({
      ...prev,
      [requestId]: value,
    }))
  }

  const handleTeamChange = (requestId, value) => {
    setSelectedTeamByRequest((prev) => ({
      ...prev,
      [requestId]: value,
    }))
  }

  const handleVehicleChange = (requestId, value) => {
    setSelectedVehicleByRequest((prev) => ({
      ...prev,
      [requestId]: value,
    }))
  }

  const handleVerify = async (request) => {
    const requestId = request.request_id
    const isPending = request.status === 'PENDING'

    if (!isPending) {
      return
    }

    const isEditing = Boolean(verifyEditMap[requestId])

    if (!isEditing) {
      setVerifyEditMap((prev) => ({
        ...prev,
        [requestId]: true,
      }))
      setSelectedPriorityByRequest((prev) => ({
        ...prev,
        [requestId]: prev[requestId] || '',
      }))
      return
    }

    const selectedPriority = selectedPriorityByRequest[requestId]
    if (!selectedPriority) {
      setErrorMessage('Vui lòng chọn mức ưu tiên trước khi duyệt.')
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(requestId, 'verify', true)

    try {
      await coordinatorService.verifyRequest(requestId, selectedPriority)
      setSuccessMessage(`Duyệt request #${requestId} thành công.`)
      setVerifyEditMap((prev) => ({
        ...prev,
        [requestId]: false,
      }))
      await reloadAll()
    } catch (error) {
      const result = handleApiError(error, 'Request đã được xử lý bởi người khác.')
      if (result.shouldReload) {
        await reloadAll()
      }
    } finally {
      setActionLoading(requestId, 'verify', false)
    }
  }

  const handleAssign = async (requestId) => {
    const selectedTeam = selectedTeamByRequest[requestId]
    const selectedVehicle = selectedVehicleByRequest[requestId]

    if (!selectedTeam || !selectedVehicle) {
      setErrorMessage('Vui lòng chọn đội và phương tiện trước khi phân công.')
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(requestId, 'assign', true)

    try {
      await coordinatorService.assignRequest(requestId, selectedTeam, selectedVehicle)
      setSuccessMessage(`Phân công request #${requestId} thành công.`)
      await reloadAll()
    } catch (error) {
      const result = handleApiError(error, 'Dữ liệu bị conflict, request đã được cập nhật bởi người khác.')
      if (result.shouldReload) {
        await reloadAll()
      }
    } finally {
      setActionLoading(requestId, 'assign', false)
    }
  }

  const handleSelectStatusFilter = (value) => {
    setStatusFilter(value)
    setIsStatusFilterOpen(false)
  }

  const handleSelectPriorityFilter = (value) => {
    setPriorityFilter(value)
    setIsPriorityFilterOpen(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    navigate('/login', { replace: true })
  }

  return (
    <div className="coordinator-page">
      <header className="coordinator-dashboard-header">
        <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>
        <div className="coordinator-header-buttons">
          <button type="button" className="coordinator-btn-login" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="coordinator-content">
        {errorMessage && <div className="feedback-message feedback-error">{errorMessage}</div>}
        {successMessage && <div className="feedback-message feedback-success">{successMessage}</div>}

        <section className="coordinator-summary-grid">
          <article className="summary-card">
            <h2>Thống kê yêu cầu theo trạng thái</h2>
            <div className="summary-list">
              {REQUEST_STATUS_DASHBOARD_ITEMS.map((item) => (
                <div key={item.key} className="summary-row">
                  <span>{item.label}</span>
                  <strong>{isSummaryLoading ? '...' : requestStatusSummary[item.key] ?? 0}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="summary-card">
            <h2>Thống kê nhóm cứu hộ</h2>
            <div className="summary-list">
              <div className="summary-row">
                <span>Tổng số nhóm</span>
                <strong>{isSummaryLoading ? '...' : teamSummary.total}</strong>
              </div>
              <div className="summary-row">
                <span>Nhóm đang hoạt động</span>
                <strong>{isSummaryLoading ? '...' : teamSummary.active}</strong>
              </div>
            </div>
          </article>

          <article className="summary-card">
            <h2>Thống kê phương tiện</h2>
            <div className="summary-list">
              <div className="summary-row">
                <span>Có sẵn</span>
                <strong>{isSummaryLoading ? '...' : vehicleSummary.available}</strong>
              </div>
              <div className="summary-row">
                <span>Đang sử dụng</span>
                <strong>{isSummaryLoading ? '...' : vehicleSummary.inUse}</strong>
              </div>
              <div className="summary-row">
                <span>Bảo trì</span>
                <strong>{isSummaryLoading ? '...' : vehicleSummary.maintenance}</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="coordinator-table-container">
          <div className="coordinator-table-scroll">
            <table className="coordinator-table">
              <thead>
                <tr>
                  <th>Mã yêu cầu</th>
                  <th>Mã công dân</th>
                  <th>Tiêu đề</th>
                  <th>Số điện thoại</th>
                  <th>Mô tả</th>
                  <th>Vị trí</th>
                  <th>Địa chỉ</th>
                  <th>
                    <div className="header-filter-wrap">
                      <span>Mức ưu tiên</span>
                      <div className="table-filter-wrap" ref={priorityFilterRef}>
                        <button
                          type="button"
                          className={`table-filter-button ${priorityFilter ? 'active' : ''}`}
                          onClick={() => {
                            setIsPriorityFilterOpen((prev) => !prev)
                            setIsStatusFilterOpen(false)
                          }}
                          disabled={isListLoading}
                          aria-label="Lọc theo mức ưu tiên"
                        >
                          ▾
                        </button>
                        {isPriorityFilterOpen && (
                          <div className="table-filter-dropdown">
                            {PRIORITY_OPTIONS.map((option) => (
                              <button
                                key={option.value || 'ALL'}
                                type="button"
                                className={`table-filter-option ${priorityFilter === option.value ? 'selected' : ''}`}
                                onClick={() => handleSelectPriorityFilter(option.value)}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th>
                    <div className="header-filter-wrap">
                      <span>Trạng thái</span>
                      <div className="table-filter-wrap" ref={statusFilterRef}>
                        <button
                          type="button"
                          className={`table-filter-button ${statusFilter ? 'active' : ''}`}
                          onClick={() => {
                            setIsStatusFilterOpen((prev) => !prev)
                            setIsPriorityFilterOpen(false)
                          }}
                          disabled={isListLoading}
                          aria-label="Lọc theo trạng thái"
                        >
                          ▾
                        </button>
                        {isStatusFilterOpen && (
                          <div className="table-filter-dropdown">
                            {STATUS_OPTIONS.map((option) => (
                              <button
                                key={option.value || 'ALL'}
                                type="button"
                                className={`table-filter-option ${statusFilter === option.value ? 'selected' : ''}`}
                                onClick={() => handleSelectStatusFilter(option.value)}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th>Tạo lúc</th>
                  <th>Cập nhật lúc</th>
                  <th>Cập nhật bởi</th>
                  <th>Chọn mức duyệt</th>
                  <th>Duyệt</th>
                  <th>Đội cứu hộ</th>
                  <th>Phương tiện</th>
                  <th>Phân công</th>
                </tr>
              </thead>
              <tbody>
                {isListLoading && (
                  <tr>
                    <td colSpan="17" className="table-placeholder">
                      Đang tải danh sách rescue request...
                    </td>
                  </tr>
                )}

                {!isListLoading && displayedRequests.length === 0 && (
                  <tr>
                    <td colSpan="17" className="table-placeholder">
                      Không có rescue request phù hợp bộ lọc hiện tại.
                    </td>
                  </tr>
                )}

                {!isListLoading &&
                  displayedRequests.map((request, rowIndex) => {
                    const requestId = request.request_id
                    const requestKey = requestId ?? `row-${rowIndex}`
                    const hasValidRequestId = requestId !== null && requestId !== undefined && requestId !== ''
                    const isPending = request.status === 'PENDING'
                    const isVerified = request.status === 'VERIFIED'
                    const isVerifyEditing = Boolean(verifyEditMap[requestId])
                    const hasPriority = Boolean(
                      (request.priority_level_id !== null &&
                        request.priority_level_id !== undefined &&
                        request.priority_level_id !== '') ||
                        request.priority_key,
                    )

                    const verifyLoading = hasValidRequestId ? isActionLoading(requestId, 'verify') : false
                    const assignLoading = hasValidRequestId ? isActionLoading(requestId, 'assign') : false
                    const selectedPriority = selectedPriorityByRequest[requestId] || ''
                    const selectedTeam = selectedTeamByRequest[requestId] || ''
                    const selectedVehicle = selectedVehicleByRequest[requestId] || ''

                    return (
                      <tr key={requestKey}>
                        <td>{request.request_id ?? '-'}</td>
                        <td>{request.citizen_id ?? '-'}</td>
                        <td>{request.title || '-'}</td>
                        <td>{request.phone || '-'}</td>
                        <td className="description-cell">{request.description || '-'}</td>
                        <td>{formatLocation(request.latitude, request.longitude)}</td>
                        <td>{request.address || '-'}</td>
                        <td>
                          <span className={`priority-badge priority-${request.priority_key ? request.priority_key.toLowerCase() : 'unknown'}`}>
                            {request.priority_label}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge status-${request.status.toLowerCase()}`}>{getStatusLabel(request.status)}</span>
                        </td>
                        <td>{formatDateTime(request.created_at)}</td>
                        <td>{formatDateTime(request.updated_at)}</td>
                        <td>{request.updated_by ?? '-'}</td>
                        <td>
                          {isPending && isVerifyEditing ? (
                            <select
                              value={selectedPriority}
                              onChange={(event) => handlePriorityChange(requestId, event.target.value)}
                              disabled={verifyLoading || assignLoading}
                            >
                              <option value="">Chọn mức ưu tiên</option>
                              {priorityLevels.map((priority) => (
                                <option key={priority.id} value={toNumberIfPossible(priority.id)}>
                                  {priority.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={`priority-badge priority-${request.priority_key ? request.priority_key.toLowerCase() : 'unknown'}`}>
                              {request.priority_label}
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="action-button verify-button"
                            onClick={() => handleVerify(request)}
                            disabled={
                              !hasValidRequestId ||
                              !isPending ||
                              verifyLoading ||
                              assignLoading ||
                              (isVerifyEditing && !selectedPriority)
                            }
                          >
                            {verifyLoading ? 'Đang duyệt...' : isVerifyEditing ? 'Xác nhận' : 'Duyệt'}
                          </button>
                        </td>
                        <td>
                          <select
                            value={selectedTeam}
                            onChange={(event) => handleTeamChange(requestId, event.target.value)}
                            disabled={!isVerified || !hasPriority || assignLoading || verifyLoading}
                          >
                            <option value="">Chọn đội AVAILABLE</option>
                            {teams.map((team) => (
                              <option key={team.id} value={toNumberIfPossible(team.id)}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={selectedVehicle}
                            onChange={(event) => handleVehicleChange(requestId, event.target.value)}
                            disabled={!isVerified || !hasPriority || assignLoading || verifyLoading}
                          >
                            <option value="">Chọn xe AVAILABLE</option>
                            {vehicles.map((vehicle) => (
                              <option key={vehicle.id} value={toNumberIfPossible(vehicle.id)}>
                                {vehicle.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="action-button assign-button"
                            onClick={() => handleAssign(requestId)}
                            disabled={
                              !hasValidRequestId ||
                              !isVerified ||
                              !hasPriority ||
                              !selectedTeam ||
                              !selectedVehicle ||
                              assignLoading ||
                              verifyLoading
                            }
                          >
                            {assignLoading ? 'Đang phân công...' : 'Phân công'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default CoordinatorRequestsPage
