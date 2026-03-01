import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import coordinatorService from '../services/coordinatorService'
import './CoordinatorRequestsPage.css'

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ tiếp nhận' },
  { value: 'VERIFIED', label: 'Đã xác minh' },
  { value: 'ASSIGNED', label: 'Đã phân công' },
  { value: 'IN_PROGRESS', label: 'Đang xử lý' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'DUPLICATE', label: 'Trùng lặp' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'Tất cả mức ưu tiên' },
  { value: 'HIGH', label: 'Cao' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'LOW', label: 'Thấp' },
]

const STATUS_LABEL_MAP = {
  PENDING: 'Chờ tiếp nhận',
  VERIFIED: 'Đã xác minh',
  ASSIGNED: 'Đã phân công',
  IN_PROGRESS: 'Đang xử lý',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  DUPLICATE: 'Trùng lặp',
}

const MOCK_PRIORITY_LEVELS = [
  { id: 1, name: 'Thấp' },
  { id: 2, name: 'Trung bình' },
  { id: 3, name: 'Cao' },
]

const MOCK_TEAMS = [
  { id: 1, team_name: 'Đội Cứu hộ Quận 1', status: 'AVAILABLE' },
  { id: 2, team_name: 'Đội Cứu hộ Quận 3', status: 'AVAILABLE' },
  { id: 3, team_name: 'Đội Cứu hộ Quận 7', status: 'ACTIVE' },
]

const MOCK_VEHICLES = [
  { id: 1, plate_number: '51A-123.45', status: 'AVAILABLE' },
  { id: 2, plate_number: '51B-222.22', status: 'IN_USE' },
  { id: 3, plate_number: '51C-333.33', status: 'AVAILABLE' },
]

const MOCK_REQUESTS = [
  {
    request_id: 1001,
    citizen_id: 501,
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
]

const ASSIGN_MAX_VEHICLES = 100
const ASSIGNMENT_CACHE_KEY = 'coordinatorRequestAssignments'

const normalizeIdText = (value) => {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  return String(value).trim()
}

const normalizeVehicleIdList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeIdText(item))
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => normalizeIdText(item))
      .filter(Boolean)
  }

  const singleValue = normalizeIdText(value)
  return singleValue ? [singleValue] : []
}

const loadAssignmentCache = () => {
  try {
    const raw = localStorage.getItem(ASSIGNMENT_CACHE_KEY)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const extractAssignmentFromRequest = (item) => {
  const teamId = normalizeIdText(
    item.assigned_team_id ?? item.assignedTeamId ?? item.team_id ?? item.teamId ?? item.rescue_team_id ?? item.rescueTeamId,
  )
  const teamName = String(item.assigned_team_name ?? item.assignedTeamName ?? item.team_name ?? item.teamName ?? '').trim()

  const vehicleIdsFromRaw = normalizeVehicleIdList(
    item.assigned_vehicle_ids ?? item.assignedVehicleIds ?? item.vehicle_ids ?? item.vehicleIds,
  )

  const vehicleIdsFromObjects = []
  const vehicleLabelsFromObjects = []
  const vehicleSource = Array.isArray(item.assignedVehicles)
    ? item.assignedVehicles
    : Array.isArray(item.vehicles)
      ? item.vehicles
      : []

  vehicleSource.forEach((vehicle) => {
    const vehicleId = normalizeIdText(vehicle?.vehicleId ?? vehicle?.vehicle_id ?? vehicle?.id)
    if (vehicleId) {
      vehicleIdsFromObjects.push(vehicleId)
    }
    const vehicleLabel = String(
      vehicle?.vehicleName ?? vehicle?.vehicle_name ?? vehicle?.vehicleCode ?? vehicle?.vehicle_code ?? vehicle?.licensePlate ?? '',
    ).trim()
    if (vehicleLabel) {
      vehicleLabelsFromObjects.push(vehicleLabel)
    }
  })

  const vehicleIds = vehicleIdsFromRaw.length > 0 ? vehicleIdsFromRaw : vehicleIdsFromObjects
  const vehicleLabels = vehicleLabelsFromObjects.length > 0 ? vehicleLabelsFromObjects : []

  if (!teamId && !teamName && vehicleIds.length === 0 && vehicleLabels.length === 0) {
    return null
  }

  return {
    teamId,
    teamName,
    vehicleIds,
    vehicleLabels,
  }
}

const normalizeText = (value) =>
  String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const getStatusText = (status) => {
  if (!status) {
    return '-'
  }
  return String(status)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
}

const normalizeCancelledStatus = (status) => {
  if (status === 'CANCELED') {
    return 'CANCELLED'
  }
  return status
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
  const assignment = extractAssignmentFromRequest(item)

  return {
    request_id: item.request_id ?? item.requestId ?? item.id ?? null,
    citizen_id: item.citizen_id ?? item.citizenId ?? null,
    phone: item.phone ?? item.citizenPhone ?? item.contact_phone ?? item.contactPhone ?? '',
    description: item.description ?? '',
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    address: item.address ?? '',
    priority_level_id: priorityLevelId,
    priority_key: priorityInfo.key,
    priority_label: priorityInfo.label,
    status: normalizeCancelledStatus(getStatusText(item.status)),
    created_at: item.created_at ?? item.createdAt ?? null,
    updated_at: item.updated_at ?? item.updatedAt ?? null,
    updated_by: item.updated_by ?? item.updatedBy ?? null,
    assignment,
  }
}

const normalizePriority = (item) => ({
  id: item.priority_level_id ?? item.priorityLevelId ?? item.id ?? item.value ?? null,
  label: item.name ?? item.priority_name ?? item.priorityName ?? item.label ?? `Priority ${item.id ?? ''}`.trim(),
})

const normalizeTeam = (item) => ({
  id: item.rescue_team_id ?? item.rescueTeamId ?? item.team_id ?? item.teamId ?? item.id ?? null,
  teamId: item.teamId ?? item.team_id ?? item.rescueTeamId ?? item.rescue_team_id ?? item.id ?? null,
  name: item.team_name ?? item.teamName ?? item.name ?? `Team ${item.id ?? ''}`.trim(),
  status: getStatusText(item.status),
  createdAt: item.created_at ?? item.createdAt ?? null,
})

const normalizeVehicle = (item) => ({
  id: item.vehicle_id ?? item.vehicleId ?? item.id ?? null,
  vehicleId: item.vehicleId ?? item.vehicle_id ?? item.id ?? null,
  name: item.vehicle_name ?? item.vehicleName ?? item.vehicleName ?? item.name ?? '',
  vehicleCode: item.vehicle_code ?? item.vehicleCode ?? '',
  vehicleTypeName: item.vehicle_type_name ?? item.vehicleTypeName ?? '',
  licensePlate: item.plate_number ?? item.licensePlate ?? item.plateNumber ?? '',
  capacity: item.capacity ?? null,
  currentLocation: item.current_location ?? item.currentLocation ?? '',
  updatedAt: item.updated_at ?? item.updatedAt ?? null,
  status: getStatusText(item.status),
})

const getStatusLabel = (status) => STATUS_LABEL_MAP[normalizeCancelledStatus(status)] || status || '-'

const buildApiMessage = (error) => {
  const data = error?.response?.data
  return data?.message || data?.error || data?.title || 'Có lỗi xảy ra, vui lòng thử lại.'
}

function CoordinatorRequestsPage({ embedded = false, externalStatusFilter = '' }) {
  const navigate = useNavigate()
  const normalizedExternalStatus = useMemo(() => {
    const raw = String(externalStatusFilter ?? '')
      .trim()
      .toUpperCase()
    const exists = STATUS_OPTIONS.some((item) => item.value === raw)
    return exists ? raw : ''
  }, [externalStatusFilter])

  const [requests, setRequests] = useState([])
  const [priorityLevels, setPriorityLevels] = useState([])
  const [teams, setTeams] = useState([])
  const [vehicles, setVehicles] = useState([])

  const [statusFilter, setStatusFilter] = useState(normalizedExternalStatus)
  const [priorityFilter, setPriorityFilter] = useState('')
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false)
  const [isPriorityFilterOpen, setIsPriorityFilterOpen] = useState(false)
  const [isListLoading, setIsListLoading] = useState(false)
  const [actionLoadingMap, setActionLoadingMap] = useState({})
  const [verifyEditMap, setVerifyEditMap] = useState({})

  const [selectedPriorityByRequest, setSelectedPriorityByRequest] = useState({})
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assignTargetRequest, setAssignTargetRequest] = useState(null)
  const [assignTeamId, setAssignTeamId] = useState('')
  const [assignVehicleIds, setAssignVehicleIds] = useState([])
  const [assignEstimatedTime, setAssignEstimatedTime] = useState(90)
  const [assignmentByRequestId, setAssignmentByRequestId] = useState(() => loadAssignmentCache())

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
      const normalizedRequests = data.map(normalizeRequest)
      setRequests(normalizedRequests)
      setAssignmentByRequestId((prev) => {
        const next = { ...prev }
        normalizedRequests.forEach((requestItem) => {
          if (requestItem.request_id && requestItem.assignment) {
            next[String(requestItem.request_id)] = requestItem.assignment
          }
        })
        return next
      })
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
    const [priorityResult, teamResult, vehicleResult] = await Promise.allSettled([
      coordinatorService.getPriorityLevels(),
      coordinatorService.getAvailableRescueTeams('AVAILABLE'),
      coordinatorService.getAvailableVehicles(),
    ])

    if (priorityResult.status === 'fulfilled') {
      const prioritySource =
        Array.isArray(priorityResult.value) && priorityResult.value.length > 0 ? priorityResult.value : MOCK_PRIORITY_LEVELS
      setPriorityLevels(prioritySource.map(normalizePriority).filter((item) => item.id !== null))
    } else {
      handleApiError(priorityResult.reason, '', { silent: true })
      setPriorityLevels(MOCK_PRIORITY_LEVELS.map(normalizePriority))
    }

    if (teamResult.status === 'fulfilled') {
      const teamSource = Array.isArray(teamResult.value) ? teamResult.value : []
      setTeams(
        teamSource
          .map(normalizeTeam)
          .filter((item) => item.id !== null)
          .filter((item) => !item.status || item.status === 'AVAILABLE'),
      )
    } else {
      handleApiError(teamResult.reason, '', { silent: true })
      setTeams(MOCK_TEAMS.map(normalizeTeam).filter((item) => item.status === 'AVAILABLE'))
    }

    if (vehicleResult.status === 'fulfilled') {
      const vehicleSource = Array.isArray(vehicleResult.value) ? vehicleResult.value : []
      setVehicles(
        vehicleSource
          .map(normalizeVehicle)
          .filter((item) => item.id !== null)
          .filter((item) => !item.status || item.status === 'AVAILABLE'),
      )
    } else {
      handleApiError(vehicleResult.reason, '', { silent: true })
      setVehicles(MOCK_VEHICLES.map(normalizeVehicle).filter((item) => item.status === 'AVAILABLE'))
    }
  }, [handleApiError])

  const reloadAll = useCallback(async () => {
    await Promise.all([fetchRequestList(), fetchOptionData()])
  }, [fetchOptionData, fetchRequestList])

  useEffect(() => {
    fetchRequestList()
  }, [fetchRequestList])

  useEffect(() => {
    fetchOptionData()
  }, [fetchOptionData])

  useEffect(() => {
    if (normalizedExternalStatus !== statusFilter) {
      setStatusFilter(normalizedExternalStatus)
    }
  }, [normalizedExternalStatus, statusFilter])

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

  useEffect(() => {
    try {
      localStorage.setItem(ASSIGNMENT_CACHE_KEY, JSON.stringify(assignmentByRequestId))
    } catch {
      // Ignore localStorage write errors
    }
  }, [assignmentByRequestId])

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
        [requestId]: prev[requestId] || request.priority_level_id || '',
      }))
      return
    }

    const selectedPriority = selectedPriorityByRequest[requestId]
    if (!selectedPriority) {
      setErrorMessage('Vui lòng chọn mức ưu tiên trước khi xác thực.')
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(requestId, 'verify', true)

    try {
      await coordinatorService.verifyRequest(requestId, selectedPriority)
      setSuccessMessage(`Xác thực yêu cầu #${requestId} thành công.`)
      setVerifyEditMap((prev) => ({
        ...prev,
        [requestId]: false,
      }))
      await reloadAll()
    } catch (error) {
      const result = handleApiError(error, 'Yêu cầu đã được xử lý bởi người khác.')
      if (result.shouldReload) {
        await reloadAll()
      }
    } finally {
      setActionLoading(requestId, 'verify', false)
    }
  }

  const openAssignModal = (request) => {
    if (!request?.request_id || request.status !== 'VERIFIED') {
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setAssignTargetRequest(request)
    setAssignTeamId('')
    setAssignVehicleIds([])
    setAssignEstimatedTime(90)
    setIsAssignModalOpen(true)
  }

  const closeAssignModal = () => {
    setIsAssignModalOpen(false)
    setAssignTargetRequest(null)
    setAssignTeamId('')
    setAssignVehicleIds([])
    setAssignEstimatedTime(90)
  }

  const handleToggleAssignVehicle = (vehicleId) => {
    const normalizedVehicleId = String(vehicleId)
    const alreadySelected = assignVehicleIds.includes(normalizedVehicleId)

    if (!alreadySelected && assignVehicleIds.length >= ASSIGN_MAX_VEHICLES) {
      setErrorMessage('Chỉ có thể chọn tối đa 100 phương tiện cho mỗi yêu cầu.')
      return
    }

    setAssignVehicleIds((prev) =>
      alreadySelected ? prev.filter((item) => item !== normalizedVehicleId) : [...prev, normalizedVehicleId],
    )
  }

  const handleAssign = async () => {
    const requestId = assignTargetRequest?.request_id

    if (!requestId) {
      return
    }

    if (!assignTeamId) {
      setErrorMessage('Vui long chon doi cuu ho truoc khi phan cong.')
      return
    }

    if (assignVehicleIds.length === 0) {
      setErrorMessage('Vui long chon it nhat mot phuong tien.')
      return
    }

    const parsedEstimatedTime = Number(assignEstimatedTime)
    if (!Number.isFinite(parsedEstimatedTime) || parsedEstimatedTime <= 0) {
      setErrorMessage('Vui long nhap thoi gian du kien hop le.')
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(requestId, 'assign', true)

    try {
      const assignResult = await coordinatorService.assignRequest(requestId, assignTeamId, assignVehicleIds, parsedEstimatedTime)
      const selectedTeam = teams.find((team) => String(team.id) === String(assignTeamId))
      const selectedVehicles = vehicles.filter((vehicle) => assignVehicleIds.includes(String(vehicle.id)))
      const responseVehicleIds = normalizeVehicleIdList(assignResult?.assignedVehicleIds)
      const finalVehicleIds = responseVehicleIds.length > 0 ? responseVehicleIds : normalizeVehicleIdList(assignVehicleIds)

      const assignment = {
        teamId: normalizeIdText(assignResult?.teamId ?? assignTeamId),
        teamName: selectedTeam?.name || '',
        vehicleIds: finalVehicleIds,
        vehicleLabels:
          selectedVehicles
            .map((vehicle) => vehicle.name || vehicle.vehicleCode || vehicle.licensePlate || '')
            .filter(Boolean) || [],
      }

      setAssignmentByRequestId((prev) => ({
        ...prev,
        [String(requestId)]: assignment,
      }))

      setRequests((prev) =>
        prev.map((requestItem) =>
          requestItem.request_id === requestId ? { ...requestItem, status: 'ASSIGNED', assignment } : requestItem,
        ),
      )

      setSuccessMessage(`Phan cong yeu cau #${requestId} thanh cong.`)
      closeAssignModal()
      await reloadAll()
    } catch (error) {
      const result = handleApiError(error, 'Phan cong that bai, vui long kiem tra lai request/team/xe kha dung.')
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

  const closeFilterMenus = () => {
    setIsStatusFilterOpen(false)
    setIsPriorityFilterOpen(false)
  }

  const assignModalRequestId = assignTargetRequest?.request_id ?? null
  const isAssignModalSubmitting = assignModalRequestId ? isActionLoading(assignModalRequestId, 'assign') : false
  const selectedAssignVehicleIdSet = new Set(assignVehicleIds)

  const assignModal = isAssignModalOpen ? (
    <div className="assign-modal-overlay" onClick={closeAssignModal}>
      <div className="assign-modal" onClick={(event) => event.stopPropagation()}>
        <div className="assign-modal-header">
          <h3>Phân công yêu cầu #{assignTargetRequest?.request_id ?? '-'}</h3>
          <button type="button" className="assign-modal-close" onClick={closeAssignModal} disabled={isAssignModalSubmitting}>
            ×
          </button>
        </div>

        <div className="assign-modal-top-grid">
          <div className="assign-modal-field">
            <label htmlFor="assign-team">Đội cứu hộ rảnh (chọn 1)</label>
            <select
              id="assign-team"
              value={assignTeamId}
              onChange={(event) => setAssignTeamId(event.target.value)}
              disabled={isAssignModalSubmitting}
            >
              <option value="">Chọn đội</option>
              {teams.map((team) => (
                <option key={team.id} value={toNumberIfPossible(team.id)}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="assign-modal-field">
            <label htmlFor="assign-estimated-time">Thời gian dự kiến (phút)</label>
            <input
              id="assign-estimated-time"
              type="number"
              min="1"
              step="1"
              value={assignEstimatedTime}
              onChange={(event) => setAssignEstimatedTime(event.target.value)}
              disabled={isAssignModalSubmitting}
            />
          </div>
        </div>

        <div className="assign-vehicle-toolbar">
          <strong>Danh sách xe sẵn sàng (tối đa {ASSIGN_MAX_VEHICLES})</strong>
          <span>
            Đã chọn: {assignVehicleIds.length}/{ASSIGN_MAX_VEHICLES}
          </span>
        </div>

        <div className="assign-vehicle-table-wrap">
          <table className="assign-vehicle-table">
            <thead>
              <tr>
                <th>Chọn</th>
                <th>Mã xe</th>
                <th>Tên xe</th>
                <th>Biển số</th>
                <th>Loại xe</th>
                <th>Sức chứa</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan="7" className="assign-empty">
                    Không có xe sẵn sàng để phân công.
                  </td>
                </tr>
              )}

              {vehicles.map((vehicle) => {
                const vehicleIdText = String(vehicle.id)
                const isChecked = selectedAssignVehicleIdSet.has(vehicleIdText)
                const disableCheckbox = !isChecked && assignVehicleIds.length >= ASSIGN_MAX_VEHICLES

                return (
                  <tr key={vehicle.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleAssignVehicle(vehicle.id)}
                        disabled={disableCheckbox || isAssignModalSubmitting}
                      />
                    </td>
                    <td>{vehicle.vehicleCode || '-'}</td>
                    <td>{vehicle.name || '-'}</td>
                    <td>{vehicle.licensePlate || '-'}</td>
                    <td>{vehicle.vehicleTypeName || '-'}</td>
                    <td>{vehicle.capacity ?? '-'}</td>
                    <td>{vehicle.status || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="assign-modal-actions">
          <button type="button" className="assign-modal-cancel" onClick={closeAssignModal} disabled={isAssignModalSubmitting}>
            Hủy
          </button>
          <button
            type="button"
            className="assign-modal-submit"
            onClick={handleAssign}
            disabled={isAssignModalSubmitting}
          >
            {isAssignModalSubmitting ? 'Đang phân công...' : 'Xác nhận phân công'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  const requestTableSection = (
    <section className="coordinator-table-container">
      <div className="coordinator-table-scroll" onScroll={closeFilterMenus}>
        <table className="coordinator-table">
          <thead>
            <tr>
              <th>Mã yêu cầu</th>
              <th>Mã công dân</th>
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
              <th>Đội cứu hộ</th>
              <th>Phương tiện</th>
              <th>Xác thực</th>
              <th>Phân công</th>
            </tr>
          </thead>
          <tbody>
            {isListLoading && (
              <tr>
                <td colSpan="15" className="table-placeholder">
                  Đang tải danh sách yêu cầu cứu hộ...
                </td>
              </tr>
            )}

            {!isListLoading && displayedRequests.length === 0 && (
              <tr>
                <td colSpan="15" className="table-placeholder">
                  Không có yêu cầu phù hợp với bộ lọc hiện tại.
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

                const verifyLoading = hasValidRequestId ? isActionLoading(requestId, 'verify') : false
                const assignLoading = hasValidRequestId ? isActionLoading(requestId, 'assign') : false
                const selectedPriority = selectedPriorityByRequest[requestId] || ''
                const assignmentFromCache = assignmentByRequestId[String(requestId)]
                const assignment = assignmentFromCache || request.assignment || null
                const assignedTeamText = assignment?.teamName || (assignment?.teamId ? `Đội #${assignment.teamId}` : null)
                const assignedVehicleText =
                  assignment?.vehicleLabels?.length > 0
                    ? assignment.vehicleLabels.join(', ')
                    : assignment?.vehicleIds?.length > 0
                      ? assignment.vehicleIds.map((id) => `Xe #${id}`).join(', ')
                      : null

                return (
                  <tr key={requestKey}>
                    <td>{request.request_id ?? '-'}</td>
                    <td>{request.citizen_id ?? '-'}</td>
                    <td>{request.phone || '-'}</td>
                    <td className="description-cell">{request.description || '-'}</td>
                    <td>{formatLocation(request.latitude, request.longitude)}</td>
                    <td>{request.address || '-'}</td>
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
                        <span
                          className={`coordinator-priority-badge coordinator-priority-${
                            request.priority_key ? request.priority_key.toLowerCase() : 'unknown'
                          }`}
                        >
                          {request.priority_label}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`coordinator-status-badge coordinator-status-${request.status.toLowerCase()}`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td>{formatDateTime(request.created_at)}</td>
                    <td>{formatDateTime(request.updated_at)}</td>
                    <td>{request.updated_by ?? '-'}</td>
                    <td>{assignedTeamText || (isVerified ? 'Chon trong popup' : '-')}</td>
                    <td>{assignedVehicleText || (isVerified ? 'Chon nhieu xe trong popup' : '-')}</td>
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
                        {verifyLoading ? 'Đang xác thực...' : isVerifyEditing ? 'Xác nhận' : 'Xác thực'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="action-button assign-button"
                        onClick={() => openAssignModal(request)}
                        disabled={
                          !hasValidRequestId ||
                          !isVerified ||
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
  )

  if (embedded) {
    return (
      <>
        <section className="coordinator-embedded-section">
          {errorMessage && <div className="feedback-message feedback-error">{errorMessage}</div>}
          {successMessage && <div className="feedback-message feedback-success">{successMessage}</div>}
          {requestTableSection}
        </section>
        {assignModal}
      </>
    )
  }

  return (
    <div className="coordinator-page">
      <header className="coordinator-dashboard-header">
        <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>
        <div className="coordinator-header-buttons">
          <button type="button" className="coordinator-nav-btn" onClick={() => navigate('/rescue-coordinator')}>
            Tổng quan
          </button>
          <button type="button" className="coordinator-btn-login" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="coordinator-content">
        {errorMessage && <div className="feedback-message feedback-error">{errorMessage}</div>}
        {successMessage && <div className="feedback-message feedback-success">{successMessage}</div>}
        {requestTableSection}
      </div>
      {assignModal}
    </div>
  )
}

export default CoordinatorRequestsPage
