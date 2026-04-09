import { formatDateTimeVN } from './adminShared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftOnRectangleIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { BsIncognito } from 'react-icons/bs'
import authService from '../services/authService'
import coordinatorService from '../services/coordinatorService'
import './CoordinatorRequestsPage.css'
import LogoutConfirmModal from '../components/LogoutConfirmModal'

/*
  CoordinatorRequestsPage là bàn thao tác chính của điều phối viên.
  Flow trình bày:
  CoordinatorDashboardPage.jsx hoặc App route -> CoordinatorRequestsPage.jsx
  -> coordinatorService.verifyRequest / markRequestDuplicate / assignRequest.

  Đây là nơi coordinator thực hiện toàn bộ bước nghiệp vụ:
  - xem danh sách request
  - xác thực request
  - đánh dấu trùng
  - mở modal phân công đội và xe
*/
// Page thao tác chính của coordinator:
// xác thực request và phân công đội/xe cho yêu cầu đã verified.
const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Mới tạo' },
  { value: 'VERIFIED', label: 'Đã xác minh' },
  { value: 'ASSIGNED', label: 'Đã phân công' },
  { value: 'WAITTING', label: 'Chờ xác nhận' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'CANCELLED', label: 'Hủy' },
  { value: 'DUPLICATE', label: 'Trùng lặp' },
]

const STATUS_LABEL_MAP = {
  PENDING: 'Mới tạo',
  VERIFIED: 'Đã xác minh',
  ASSIGNED: 'Đã phân công',
  WAITTING: 'Chờ xác nhận',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Hủy',
  DUPLICATE: 'Trùng lặp',
}

const ASSIGNMENT_CACHE_KEY = 'coordinatorRequestAssignments'
const ROLE_LABEL_MAP = {
  COORDINATOR: 'Điều phối viên',
  RESCUE_TEAM: 'Đội cứu hộ',
  MANAGER: 'Quản lý',
  ADMIN: 'Quản trị viên',
  CITIZEN: 'Công dân',
}

const REQUEST_PHONE_SEARCH_DEBOUNCE_MS = 350
const PHONE_SEARCH_MAX_LENGTH = 11

const normalizeIdText = (value) => {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  return String(value).trim()
}

const normalizePhoneSearchKeyword = (value) =>
  String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, PHONE_SEARCH_MAX_LENGTH)
    .trim()

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

// Cache local này giúp bảng còn nhớ đội/xe đã từng assign để hiển thị lại ổn định khi reload nhẹ.
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

const normalizeRequestStatusKey = (status) => {
  if (status === 'CANCELED') {
    return 'CANCELLED'
  }
  if (status === 'DUPLICATED') {
    return 'DUPLICATE'
  }
  if (status === 'WAITING') {
    return 'WAITTING'
  }
  if (status === 'CONFIRMED') {
    return 'ASSIGNED'
  }
  return status
}

const extractOperationStatus = (item) => {
  const directStatus =
    item.operation_status ??
    item.operationStatus ??
    item.rescue_operation_status ??
    item.rescueOperationStatus ??
    item.current_operation_status ??
    item.currentOperationStatus ??
    item.latest_operation_status ??
    item.latestOperationStatus ??
    item.operation?.status ??
    item.operation?.Status ??
    item.Operation?.status ??
    item.Operation?.Status ??
    item.rescueOperation?.status ??
    item.rescueOperation?.Status ??
    item.latestOperation?.status ??
    item.latestOperation?.Status ??
    item.currentOperation?.status ??
    item.currentOperation?.Status ??
    null

  if (directStatus !== null && directStatus !== undefined && directStatus !== '') {
    return directStatus
  }

  const operationCollection = Array.isArray(item.operations)
    ? item.operations
    : Array.isArray(item.rescueOperations)
      ? item.rescueOperations
      : Array.isArray(item.RescueOperations)
        ? item.RescueOperations
        : []

  const latestOperation = operationCollection[0]
  return latestOperation?.status ?? latestOperation?.Status ?? null
}

const getDerivedRequestStatus = (request) => {
  const requestStatus = normalizeRequestStatusKey(getStatusText(request?.status))
  const operationStatus = normalizeRequestStatusKey(getStatusText(request?.operation_status))

  if (requestStatus === 'ASSIGNED' && operationStatus === 'WAITTING') {
    return 'WAITTING'
  }

  return requestStatus
}

const getPriorityInfo = (priorityLevelId, priorityRaw) => {
  const numericId = Number(priorityLevelId)
  if (!Number.isNaN(numericId)) {
    if (numericId === 1) {
      return { key: 'HIGH', label: 'Cao' }
    }
    if (numericId === 2) {
      return { key: 'MEDIUM', label: 'Trung bình' }
    }
    if (numericId === 3) {
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

// Đã chuẩn hóa, dùng formatDateTimeVN

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

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

// Chuẩn hóa request về một shape duy nhất để UI bảng, modal assign và dashboard embedded dùng chung.
const normalizeRequest = (item) => {
  const priorityLevelId = item.priority_level_id ?? item.priorityLevelId ?? null
  const priorityRaw =
    item.priority_name ?? item.priorityName ?? item.priority_level_name ?? item.priorityLevelName ?? item.priority ?? null
  const priorityInfo = getPriorityInfo(priorityLevelId, priorityRaw)
  const assignment = extractAssignmentFromRequest(item)
  const totalPeopleRaw = toNullableNumber(item.numberOfAffectedPeople ?? item.number_of_affected_people)
  const adultCountRaw = toNullableNumber(item.adultCount ?? item.adult_count)
  const elderlyCount = toNullableNumber(item.elderlyCount ?? item.elderly_count)
  const childrenCount = toNullableNumber(item.childrenCount ?? item.children_count)
  const fallbackTotalPeople =
    adultCountRaw !== null || elderlyCount !== null || childrenCount !== null
      ? (adultCountRaw ?? 0) + (elderlyCount ?? 0) + (childrenCount ?? 0)
      : null
  const numberOfAffectedPeople = totalPeopleRaw ?? fallbackTotalPeople
  const adultCount =
    adultCountRaw !== null
      ? adultCountRaw
      : numberOfAffectedPeople !== null
        ? Math.max(numberOfAffectedPeople - (elderlyCount ?? 0) - (childrenCount ?? 0), 0)
        : null

  return {
    request_id: item.request_id ?? item.requestId ?? item.id ?? null,
    citizen_id: item.citizen_id ?? item.citizenId ?? null,
    phone: item.phone ?? item.citizenPhone ?? item.contact_phone ?? item.contactPhone ?? '',
    description: item.description ?? '',
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    address: item.address ?? '',
    // Map các trường số người
    numberOfAffectedPeople,
    adultCount,
    elderlyCount,
    childrenCount,
    priority_level_id: priorityLevelId,
    priority_key: priorityInfo.key,
    priority_label: priorityInfo.label,
    status: normalizeRequestStatusKey(getStatusText(item.status)),
    operation_status: normalizeRequestStatusKey(getStatusText(extractOperationStatus(item))),
    created_at: item.created_at ?? item.createdAt ?? null,
    updated_at: item.updated_at ?? item.updatedAt ?? null,
    updated_by: item.updated_by ?? item.updatedBy ?? null,
    assignment,
  }
}

const normalizeTeam = (item) => ({
  id: item.team_id ?? item.teamId ?? item.rescue_team_id ?? item.rescueTeamId ?? item.id ?? null,
  teamId: item.team_id ?? item.teamId ?? item.rescue_team_id ?? item.rescueTeamId ?? item.id ?? null,
  name: item.teamName ?? item.team_name ?? item.name ?? `Team ${item.id ?? ''}`.trim(),
  distanceKm: item.distanceKm ?? item.distance_km ?? item.distance ?? null,
  freeMemberCount: item.freeMemberCount ?? item.free_member_count ?? item.availableMemberCount ?? item.available_member_count ?? null,
  distanceNote: item.distanceNote ?? item.distance_note ?? item.note ?? item.notes ?? '',
})

const getStatusLabel = (status) => STATUS_LABEL_MAP[normalizeRequestStatusKey(status)] || status || '-'

const formatDistanceKm = (value) => {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return String(value)
  }

  return `${numericValue.toFixed(2)} km`
}

const buildApiMessage = (error) => {
  const data = error?.response?.data
  return data?.message || data?.error || data?.title || 'Có lỗi xảy ra, vui lòng thử lại.'
}

function CoordinatorRequestsPage({ embedded = false, externalStatusFilter = '', externalPhoneSearch = '' }) {
  const navigate = useNavigate()
  const normalizedExternalStatus = useMemo(() => {
    const raw = String(externalStatusFilter ?? '')
      .trim()
      .toUpperCase()
    const exists = STATUS_OPTIONS.some((item) => item.value === raw)
    return exists ? raw : ''
  }, [externalStatusFilter])

  const [requests, setRequests] = useState([])
  const [teams, setTeams] = useState([])

  const [statusFilter, setStatusFilter] = useState(normalizedExternalStatus)
  const [requestPhoneSearch, setRequestPhoneSearch] = useState('')
  const [debouncedRequestPhoneSearch, setDebouncedRequestPhoneSearch] = useState('')
  const [isListLoading, setIsListLoading] = useState(false)
  const [actionLoadingMap, setActionLoadingMap] = useState({})
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assignTargetRequest, setAssignTargetRequest] = useState(null)
  const [assignTeamId, setAssignTeamId] = useState('')
  const [assignModalError, setAssignModalError] = useState('')
  const [assignmentByRequestId, setAssignmentByRequestId] = useState(() => loadAssignmentCache())

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [currentUser, setCurrentUser] = useState(() => authService.getUserInfo())
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)
  const tableScrollRef = useRef(null)
  const roleLabel = ROLE_LABEL_MAP[String(currentUser?.role ?? '').toUpperCase()] || currentUser?.role || '-'
  const normalizedRequestPhoneSearch = useMemo(
    () => normalizePhoneSearchKeyword(embedded ? externalPhoneSearch : requestPhoneSearch),
    [embedded, externalPhoneSearch, requestPhoneSearch],
  )

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

  // Tải danh sách rescue request và chuẩn hóa toàn bộ record trước khi đổ vào bảng.
  const fetchRequestList = useCallback(async () => {
    setIsListLoading(true)
    setErrorMessage('')
    try {
      const data = await coordinatorService.getRescueRequests({
        status: statusFilter === 'WAITTING' ? 'ASSIGNED' : statusFilter,
        searchBy: debouncedRequestPhoneSearch ? 'phone' : '',
        keyword: debouncedRequestPhoneSearch,
      })
      // Chuẩn hóa response tại đây để table và modal chỉ dùng một shape dữ liệu thống nhất.
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
    } catch (error) {
      handleApiError(error, '', { silent: true })
      setRequests([])
      setErrorMessage('Không thể tải danh sách yêu cầu cứu hộ.')
    } finally {
      setIsListLoading(false)
    }
  }, [debouncedRequestPhoneSearch, handleApiError, statusFilter])

  const reloadAll = useCallback(async () => {
    await fetchRequestList()
  }, [fetchRequestList])

  useEffect(() => {
    fetchRequestList()
  }, [fetchRequestList])

  useEffect(() => {
    if (normalizedExternalStatus !== statusFilter) {
      setStatusFilter(normalizedExternalStatus)
    }
  }, [normalizedExternalStatus, statusFilter])

  useEffect(() => {
    if (!embedded) {
      return
    }

    setRequestPhoneSearch(normalizePhoneSearchKeyword(externalPhoneSearch))
  }, [embedded, externalPhoneSearch])

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => {
        setDebouncedRequestPhoneSearch(normalizedRequestPhoneSearch)
      },
      normalizedRequestPhoneSearch ? REQUEST_PHONE_SEARCH_DEBOUNCE_MS : 0,
    )

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [normalizedRequestPhoneSearch])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const clickedUserMenu = userMenuRef.current?.contains(event.target)

      if (!clickedUserMenu) {
        setShowUserMenu(false)
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
    const filtered = statusFilter
      ? requests.filter((item) => getDerivedRequestStatus(item) === statusFilter)
      : requests

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      const requestIdA = Number(a.request_id)
      const requestIdB = Number(b.request_id)
      const hasRequestIdA = Number.isFinite(requestIdA)
      const hasRequestIdB = Number.isFinite(requestIdB)

      if (hasRequestIdA && hasRequestIdB && requestIdA !== requestIdB) {
        return requestIdB - requestIdA
      }

      if (hasRequestIdA !== hasRequestIdB) {
        return hasRequestIdA ? -1 : 1
      }

      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateB - dateA
    })
    return sorted
  }, [requests, statusFilter])

  // Đánh dấu request trùng để loại bỏ các yêu cầu lặp khỏi luồng phân công.
  const handleMarkDuplicate = async (request) => {
    const requestId = request.request_id
    const isPending = request.status === 'PENDING'

    if (!isPending) {
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(requestId, 'duplicate', true)

    try {
      // Gọi API đánh dấu request trùng lặp: PUT /api/RescueRequest/{requestId}/mark-duplicate
      // Payload: { status: 'DUPLICATE' }
      // Flow: PENDING/VERIFIED → DUPLICATE, request không được phân công thêm
      await coordinatorService.markRequestDuplicate(requestId)
      setSuccessMessage(`Đã chuyển yêu cầu #${requestId} sang trạng thái trùng lặp.`)
      await reloadAll()
    } catch (error) {
      const result = handleApiError(error, 'Yêu cầu đã được xử lý bởi người khác.')
      if (result.shouldReload) {
        await reloadAll()
      }
    } finally {
      setActionLoading(requestId, 'duplicate', false)
    }
  }

  // Pending request sẽ mở popup danh sách đội gần nhất để chọn 1 đội rồi verify kèm team_id.
  const openAssignModal = async (request) => {
    const requestId = request?.request_id
    const isPending = getDerivedRequestStatus(request) === 'PENDING'

    if (!requestId || !isPending) {
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setAssignModalError('')

    setActionLoading(requestId, 'assign-options', true)

    try {
      const teamSource = await coordinatorService.getNearestTeams(requestId)
      setTeams(
        teamSource
          .map(normalizeTeam)
          .filter((item) => item.id !== null),
      )
      setAssignTargetRequest(request)
      setAssignTeamId('')
      setIsAssignModalOpen(true)
    } catch (error) {
      const result = handleApiError(error, 'Không thể tải danh sách đội gần nhất.')
      if (result.shouldReload) {
        await reloadAll()
      }
    } finally {
      setActionLoading(requestId, 'assign-options', false)
    }
  }

  const closeAssignModal = () => {
    setIsAssignModalOpen(false)
    setAssignTargetRequest(null)
    setTeams([])
    setAssignTeamId('')
    setAssignModalError('')
  }

  // Submit chỉ gọi verify(team_id), không đổi contract API hiện tại.
  const handleAssign = async () => {
    const requestId = assignTargetRequest?.request_id

    if (!requestId) {
      return
    }

    if (!assignTeamId) {
      setAssignModalError('Vui lòng chọn đội cứu hộ trước khi phân công.')
      return
    }

    setAssignModalError('')
    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(requestId, 'assign', true)

    try {
      await coordinatorService.verifyRequest(requestId, assignTeamId)
      const selectedTeam = teams.find((team) => String(team.id) === String(assignTeamId))

      const assignment = {
        teamId: normalizeIdText(assignTeamId),
        teamName: selectedTeam?.name || '',
        vehicleIds: [],
        vehicleLabels: [],
      }

      setAssignmentByRequestId((prev) => ({
        ...prev,
        [String(requestId)]: assignment,
      }))

      setRequests((prev) =>
        prev.map((requestItem) =>
          requestItem.request_id === requestId ? { ...requestItem, status: 'VERIFIED', assignment } : requestItem,
        ),
      )

      setSuccessMessage(`Phân công yêu cầu #${requestId} thành công.`)
      closeAssignModal()
      await reloadAll()
    } catch (error) {
      const result = handleApiError(error, 'Phân công thất bại, vui lòng kiểm tra lại yêu cầu/đội/xe khả dụng.')
      if (result.shouldReload) {
        await reloadAll()
      }
    } finally {
      setActionLoading(requestId, 'assign', false)
    }
  }

  const handleCompleteRequest = async (request) => {
    const requestId = request?.request_id
    const canComplete = request?.status === 'ASSIGNED' || request?.status === 'IN_PROGRESS'

    if (!requestId || !canComplete) {
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(requestId, 'complete', true)

    try {
      // Gọi API đánh dấu request hoàn thành: PUT /api/RescueRequest/{requestId}/status
      // Payload: { status: 'COMPLETED' }
      // Flow: ASSIGNED/IN_PROGRESS → COMPLETED, system sẽ gửi SMS/email cho citizen báo an toàn
      await coordinatorService.markRequestCompleted(requestId)
      setRequests((prev) =>
        prev.map((requestItem) =>
          requestItem.request_id === requestId ? { ...requestItem, status: 'COMPLETED' } : requestItem,
        ),
      )
      setSuccessMessage(`Đã chuyển yêu cầu #${requestId} sang trạng thái hoàn thành.`)
      await reloadAll()
    } catch (error) {
      const result = handleApiError(error, 'Yêu cầu đã được cập nhật trạng thái bởi người khác.')
      if (result.shouldReload) {
        await reloadAll()
      }
    } finally {
      setActionLoading(requestId, 'complete', false)
    }
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    authService.logout();
    setCurrentUser && setCurrentUser(null);
    setShowUserMenu && setShowUserMenu(false);
    setShowLogoutConfirm(false);
    navigate('/login', { replace: true });
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleToggleUserMenu = () => {
    setShowUserMenu((prev) => !prev)
  }

  const assignModalRequestId = assignTargetRequest?.request_id ?? null
  const isAssignModalSubmitting = assignModalRequestId ? isActionLoading(assignModalRequestId, 'assign') : false

  const assignModal = isAssignModalOpen ? (
    <div className="assign-modal-overlay" onClick={closeAssignModal}>
      <div className="assign-modal" onClick={(event) => event.stopPropagation()}>
        <div className="assign-modal-header">
          <h3>Phân công yêu cầu #{assignTargetRequest?.request_id ?? '-'}</h3>
          <button type="button" className="assign-modal-close" onClick={closeAssignModal} disabled={isAssignModalSubmitting}>
            ×
          </button>
        </div>

        <div className="assign-vehicle-toolbar">
          <strong>Danh sách đội gần nhất</strong>
          <span>Chỉ được chọn 1 đội</span>
        </div>

        <div className="assign-vehicle-table-wrap">
          <table className="assign-vehicle-table">
            <thead>
              <tr>
                <th>Chọn</th>
                <th>Tên đội</th>
                <th>Khoảng cách</th>
                <th>Số thành viên rảnh</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 && (
                <tr>
                  <td colSpan="5" className="assign-empty">
                    Không có đội phù hợp để phân công.
                  </td>
                </tr>
              )}

              {teams.map((team) => {
                const teamIdText = String(team.id)
                const isChecked = String(assignTeamId) === teamIdText

                return (
                  <tr
                    key={team.id}
                    className={isChecked ? 'assign-selected-row' : ''}
                    onClick={() => {
                      if (isAssignModalSubmitting) {
                        return
                      }

                      setAssignTeamId(teamIdText)
                      setAssignModalError('')
                    }}
                  >
                    <td>
                      <input
                        type="radio"
                        name="assign-nearest-team"
                        checked={isChecked}
                        onChange={() => {
                          setAssignTeamId(teamIdText)
                          setAssignModalError('')
                        }}
                        disabled={isAssignModalSubmitting}
                      />
                    </td>
                    <td>{team.name || '-'}</td>
                    <td>{formatDistanceKm(team.distanceKm)}</td>
                    <td>{team.freeMemberCount ?? '-'}</td>
                    <td>{team.distanceNote || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {assignModalError && <div className="assign-modal-feedback">{assignModalError}</div>}

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
      {!embedded && (
        <div className="coordinator-toolbar">
          <label className="coordinator-search-box" htmlFor="coordinator-request-phone-search">
            <span className="coordinator-search-label">Tìm theo số điện thoại</span>
            <div className="coordinator-search-input-wrap">
              <MagnifyingGlassIcon className="coordinator-search-icon" />
              <input
                id="coordinator-request-phone-search"
                type="text"
                value={requestPhoneSearch}
                onChange={(event) => setRequestPhoneSearch(normalizePhoneSearchKeyword(event.target.value))}
                placeholder="Nhập số điện thoại người gửi"
                inputMode="numeric"
              />
            </div>
          </label>
        </div>
      )}

      <div ref={tableScrollRef} className="coordinator-table-scroll">
        <table className="coordinator-table">
          <thead>
            <tr>
              <th>Mã yêu cầu</th>
              <th>Mã công dân</th>
              <th>Số điện thoại</th>
              <th>Mô tả</th>
              <th>Vị trí</th>
              <th>Địa chỉ</th>
              <th>Số người</th>
              <th>Mức ưu tiên</th>
              <th className="status-header-cell">
                Trạng thái
              </th>
              <th>Tạo lúc</th>
              <th>Cập nhật lúc</th>
              <th>Cập nhật bởi</th>
              <th>Đội cứu hộ</th>
              <th>Phương tiện</th>
              <th>Thao tác</th>
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
                const displayStatus = getDerivedRequestStatus(request)
                const isPending = displayStatus === 'PENDING'
                const isCompletable = request.status === 'ASSIGNED' || request.status === 'IN_PROGRESS'

                const assignOptionsLoading = hasValidRequestId ? isActionLoading(requestId, 'assign-options') : false
                const assignLoading = hasValidRequestId ? isActionLoading(requestId, 'assign') : false
                const completeLoading = hasValidRequestId ? isActionLoading(requestId, 'complete') : false
                const assignmentFromCache = assignmentByRequestId[String(requestId)]
                const assignment = assignmentFromCache || request.assignment || null
                const assignedTeamText = assignment?.teamName || (assignment?.teamId ? `Đội #${assignment.teamId}` : null)
                const assignedVehicleItems =
                  assignment?.vehicleLabels?.length > 0
                    ? assignment.vehicleLabels
                    : assignment?.vehicleIds?.length > 0
                      ? assignment.vehicleIds.map((id) => `Xe #${id}`)
                      : []
                const hasCitizenId = request.citizen_id !== null && request.citizen_id !== undefined && String(request.citizen_id).trim() !== '' && String(request.citizen_id).trim() !== '-' 
                const elderlyCount = request.elderlyCount ?? request.elderly ?? 0
                const adultCount = request.adultCount ?? 0
                const childrenCount = request.childrenCount ?? request.children ?? 0
                const totalPeopleCount = request.numberOfAffectedPeople ?? '-'

                return (
                  <tr key={requestKey}>
                    <td>{request.request_id ?? '-'}</td>
                    <td>
                      {hasCitizenId ? (
                        request.citizen_id
                      ) : (
                        <span className="coordinator-inline-badge anonymous" title="Ẩn danh" aria-label="Ẩn danh">
                          <BsIncognito className="coordinator-inline-badge-icon" />
                        </span>
                      )}
                    </td>
                    <td>{request.phone || '-'}</td>
                    <td className="description-cell">{request.description || '-'}</td>
                    <td>{formatLocation(request.latitude, request.longitude)}</td>
                    <td className="address-cell">{request.address || '-'}</td>
                    <td className="people-summary-cell">
                      {`${totalPeopleCount} (${elderlyCount}/${adultCount}/${childrenCount})`}
                    </td>
                    <td>
                      <span
                        className={`coordinator-priority-badge coordinator-priority-${
                          request.priority_key ? request.priority_key.toLowerCase() : 'unknown'
                        }`}
                      >
                        {request.priority_label}
                      </span>
                    </td>
                    <td>
                      <span className={`coordinator-status-badge coordinator-status-${displayStatus.toLowerCase()}`}>
                        {getStatusLabel(displayStatus)}
                      </span>
                    </td>
                    <td>{formatDateTimeVN(request.created_at)}</td>
                    <td>{formatDateTimeVN(request.updated_at)}</td>
                    <td>{request.updated_by ?? '-'}</td>
                    <td>{assignedTeamText || '-'}</td>
                    <td>
                      {assignedVehicleItems.length > 0 ? (
                        <div className="coordinator-tag-list">
                          {assignedVehicleItems.map((vehicleLabel) => (
                            <span key={`${requestKey}-${vehicleLabel}`} className="coordinator-inline-badge vehicle-tag">
                              {vehicleLabel}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="action-stack-cell">
                      <div className="action-button-stack">
                        <button
                          type="button"
                          className="action-button assign-button"
                          onClick={() => openAssignModal(request)}
                          disabled={
                            !hasValidRequestId ||
                            !isPending ||
                            assignOptionsLoading ||
                            assignLoading ||
                            completeLoading
                          }
                        >
                          {assignOptionsLoading ? 'Đang tải đội...' : assignLoading ? 'Đang phân công...' : 'Phân công'}
                        </button>
                        <button
                          type="button"
                          className="action-button complete-button"
                          onClick={() => handleCompleteRequest(request)}
                          disabled={
                            !hasValidRequestId ||
                            !isCompletable ||
                            completeLoading ||
                            assignOptionsLoading ||
                            assignLoading
                          }
                        >
                          {completeLoading ? 'Đang hoàn thành...' : 'Hoàn thành'}
                        </button>
                      </div>
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
          <div className="coordinator-auth-user-group" ref={userMenuRef}>
            <button
              type="button"
              className="coordinator-icon-button"
              onClick={handleToggleUserMenu}
              aria-label="Thông tin người dùng"
            >
              <UserCircleIcon className="coordinator-header-icon" />
            </button>
            <button
              type="button"
              className="coordinator-icon-button logout"
              onClick={handleLogout}
              aria-label="Đăng xuất"
            >
              <ArrowLeftOnRectangleIcon className="coordinator-header-icon" />
            </button>

            {showUserMenu && (
              <div className="coordinator-user-menu-card">
                <h3>Thông tin tài khoản</h3>
                <div className="coordinator-user-info-row">
                  <span>Tên tài khoản</span>
                  <strong>{currentUser?.username || '-'}</strong>
                </div>
                <div className="coordinator-user-info-row">
                  <span>Họ tên</span>
                  <strong>{currentUser?.fullName || '-'}</strong>
                </div>
                <div className="coordinator-user-info-row">
                  <span>Email</span>
                  <strong>{currentUser?.email || '-'}</strong>
                </div>
                <div className="coordinator-user-info-row">
                  <span>Vai trò</span>
                  <strong>{roleLabel}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="coordinator-content">
        {errorMessage && <div className="feedback-message feedback-error">{errorMessage}</div>}
        {successMessage && <div className="feedback-message feedback-success">{successMessage}</div>}
        {requestTableSection}
      </div>
      {assignModal}
      <LogoutConfirmModal open={showLogoutConfirm} onConfirm={handleLogoutConfirm} onCancel={handleLogoutCancel} />
    </div>
  )
}

export default CoordinatorRequestsPage
