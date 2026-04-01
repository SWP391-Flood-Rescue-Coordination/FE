import api from './api'

const REQUEST_BASE = '/RescueRequest'
const TEAM_BASE = '/rescue-team/status'
const PRIORITY_LEVELS = [
  { priorityLevelId: 1, priorityName: 'Cao' },
  { priorityLevelId: 2, priorityName: 'Trung bình' },
  { priorityLevelId: 3, priorityName: 'Thấp' },
]

/*
  coordinatorService là tầng API của actor điều phối viên.
  Nó phục vụ 2 page chính:
  - CoordinatorDashboardPage.jsx
  - CoordinatorRequestsPage.jsx

  File này gom API lấy request, đội cứu hộ, phương tiện và các action verify/duplicate/assign.
*/
// Service dành cho điều phối viên: lấy request, đội cứu hộ, xe và gọi các action verify/assign.
const unwrapApiData = (response) => {
  if (response?.data?.data !== undefined) {
    return response.data.data
  }
  if (response?.data?.Data !== undefined) {
    return response.data.Data
  }
  return response?.data
}

const normalizeArray = (value) => (Array.isArray(value) ? value : [])

const normalizeVehicle = (vehicle) => ({
  id: vehicle?.vehicleId ?? vehicle?.VehicleId ?? vehicle?.id ?? null,
  vehicleId: vehicle?.vehicleId ?? vehicle?.VehicleId ?? vehicle?.id ?? null,
  vehicleCode: vehicle?.vehicleCode ?? vehicle?.VehicleCode ?? '',
  vehicleName: vehicle?.vehicleName ?? vehicle?.VehicleName ?? '',
  name: vehicle?.vehicleName ?? vehicle?.VehicleName ?? vehicle?.name ?? '',
  vehicleTypeName: vehicle?.vehicleTypeName ?? vehicle?.VehicleTypeName ?? '',
  licensePlate: vehicle?.licensePlate ?? vehicle?.LicensePlate ?? '',
  capacity: vehicle?.capacity ?? vehicle?.Capacity ?? null,
  status: String(vehicle?.status ?? vehicle?.Status ?? '')
    .trim()
    .toUpperCase(),
  currentLocation: vehicle?.currentLocation ?? vehicle?.CurrentLocation ?? '',
  latitude: vehicle?.latitude ?? vehicle?.Latitude ?? null,
  longitude: vehicle?.longitude ?? vehicle?.Longitude ?? null,
  lastMaintenance: vehicle?.lastMaintenance ?? vehicle?.LastMaintenance ?? null,
  updatedAt: vehicle?.updatedAt ?? vehicle?.UpdatedAt ?? null,
})

const STATUS_TO_API_VALUE = {
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  ASSIGNED: 'Assigned',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  CANCELED: 'Cancelled',
  DUPLICATE: 'Duplicate',
  DUPLICATED: 'Duplicate',
}

const toApiStatusValue = (status) => {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase()
  return STATUS_TO_API_VALUE[normalized] || status
}

const VEHICLE_STATUS_TO_API_VALUE = {
  AVAILABLE: 'AVAILABLE',
  INUSE: 'INUSE',
  IN_USE: 'INUSE',
  MAINTENANCE: 'MAINTENANCE',
}

const toVehicleApiStatusValue = (status) => {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  return VEHICLE_STATUS_TO_API_VALUE[normalized] || status
}

const coordinatorService = {
  // Nhóm 1: tải dữ liệu nền cho dashboard và bảng request.
  getRescueRequests: async (status = '', priorityId = null) => {
    // Lấy danh sách rescue request có thể lọc theo status (Pending/Verified/Assigned/Completed) và priority (1=Cao/2=TB/3=Thấp)
    // Input: status (optional) - Pending/Verified/Assigned/Confirmed/Completed/Cancelled/Duplicate, priorityId (optional) - 1/2/3
    // Output: Mảng request để coordinator duyệt và phân công
    // Lỗi: 401 (hết phiên), 403 (không phải coordinator), 500 (lỗi server)
    const params = {}
    const normalizedStatus = toApiStatusValue(status)
    if (normalizedStatus) {
      params.status = normalizedStatus
    }
    if (priorityId !== null && priorityId !== undefined && priorityId !== '') {
      params.priorityId = Number(priorityId)
    }
    const response = await api.get(`${REQUEST_BASE}`, { params })
    return normalizeArray(unwrapApiData(response))
  },

  getPriorityLevels: async () => PRIORITY_LEVELS,

  getRescueTeams: async (status = '') => {
    // Lấy danh sách đội cứu hộ với trạng thái (Active/Inactive)
    // Input: status (optional) - trạng thái đội
    // Output: Mảng rescue team
    // Lỗi: 401 (hết phiên), 403 (không quyền), 500 (lỗi server)
    const params = status ? { status: String(status).trim().toUpperCase() } : undefined
    const response = await api.get(TEAM_BASE, { params })
    return normalizeArray(unwrapApiData(response))
  },

  getVehicles: async (status = '') => {
    // Lấy danh sách phương tiện với lọc theo trạng thái (AVAILABLE/INUSE/MAINTENANCE)
    // Input: status (optional) - AVAILABLE/INUSE/MAINTENANCE
    // Output: Mảng vehicle chuẩn hóa
    // Lỗi: 401 (hết phiên), 500 (lỗi server)
    const params = status ? { status: toVehicleApiStatusValue(status) } : undefined
    const response = await api.get('/Vehicle', { params })
    return normalizeArray(unwrapApiData(response)).map(normalizeVehicle)
  },

  getAvailableRescueTeams: async (status = '') => {
    // Lấy danh sách đội cứu hộ sẵn sàng để phân công (status = Active)
    // Input: status (optional)
    // Output: Mảng rescue team
    // Lỗi: 401 (hết phiên), 500 (lỗi server)
    const params = status ? { status: String(status).trim().toUpperCase() } : undefined
    const response = await api.get(TEAM_BASE, { params })
    return normalizeArray(unwrapApiData(response))
  },

  getAvailableVehicles: async () => {
    // Lấy danh sách phương tiện sẵn sàng (status = AVAILABLE) để phân công
    // Output: Mảng vehicle chuẩn hóa có trạng thái sẵn sàng
    // Lỗi: 401 (hết phiên), 500 (lỗi server)
    const response = await api.get('/Vehicle', { params: { status: 'AVAILABLE' } })
    return normalizeArray(unwrapApiData(response)).map(normalizeVehicle)
  },

  // Nhóm 2: action nghiệp vụ trên từng request trong CoordinatorRequestsPage.
  verifyRequest: async (requestId) => {
    // Xác thực/duyệt request từ trạng thái Pending -> Verified để sẵn sàng phân công
    // Input: requestId - ID request cần xác thực
    // Output: Request object sau verify
    // Lỗi: 400 (request không hợp lệ), 401 (hết phiên), 403 (không quyền), 404 (không tìm), 500 (lỗi)
    const response = await api.put(`${REQUEST_BASE}/${requestId}/verify`)
    return unwrapApiData(response)
  },

  markRequestDuplicate: async (requestId) => {
    // Đánh dấu request là trùng lặp (không phải cứu hộ mới)
    // Input: requestId - ID request cần đánh dấu
    // Output: Request object với status = Duplicate
    // Lỗi: 400 (request không hợp lệ), 401 (hết phiên), 403 (không quyền), 404 (không tìm), 500 (lỗi)
    const response = await api.put(`${REQUEST_BASE}/${requestId}/status`, {
      status: 'Duplicate',
    })
    return unwrapApiData(response)
  },

  assignRequest: async (requestId, teamId, vehicleIds, estimatedTime) => {
    // Phân công request cho đội cứu hộ: thay đổi status Pending/Verified -> Assigned, gán đội + xe + thời gian dự kiến
    // Input: requestId, teamId (ID đội cứu hộ), vehicleIds (ID xe - string/array), estimatedTime (minuets hoặc số phút)
    // Output: Operation object được tạo
    // Lỗi: 400 (dữ liệu không hợp lệ), 401 (hết phiên), 403 (không quyền), 404 (không tìm), 500 (lỗi)
    // vehicleIds được chấp nhận cả string lẫn array, FE chuẩn hóa lại trước khi gửi BE.
    const vehicleIdsString = Array.isArray(vehicleIds)
      ? vehicleIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)).join(',')
      : String(vehicleIds ?? '')
          .split(',')
          .map((item) => Number(item.trim()))
          .filter((id) => Number.isFinite(id))
          .join(',')

    const payload = {
      requestId: Number(requestId),
      teamId: Number(teamId),
      vehicleIds: vehicleIdsString,
      estimatedTime: Number(estimatedTime),
    }
    const response = await api.post('/RescueOperation/assign', payload)
    return unwrapApiData(response)
  },
}

export default coordinatorService
