import api from './api'

const ADMIN_BASE = '/UserInfo'
const TEAM_BASE = '/rescue-team/status'
const RESTRICTED_ROLE_SET = new Set(['ADMIN', 'MANAGER'])

const ROLE_LABEL_MAP = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  COORDINATOR: 'Điều phối cứu hộ',
  RESCUE_TEAM: 'Đội cứu hộ',
  CITIZEN: 'Công dân',
}

const REQUEST_STATUS_TO_API_VALUE = {
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  ASSIGNED: 'Assigned',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  CANCELED: 'Cancelled',
  DUPLICATE: 'Duplicate',
}

const VEHICLE_STATUS_TO_API_VALUE = {
  AVAILABLE: 'AVAILABLE',
  INUSE: 'INUSE',
  IN_USE: 'INUSE',
  MAINTENANCE: 'MAINTENANCE',
}

const VEHICLE_TYPE_OPTIONS = [
  { id: 2, code: 'BOAT', label: 'Thuyền' },
  { id: 3, code: 'TRUCK', label: 'Xe tải' },
  { id: 4, code: 'HELICOPTER', label: 'Trực thăng' },
  { id: 5, code: 'AMPHIBIOUS', label: 'Xe lưỡng cư' },
  { id: 6, code: 'DRONE', label: 'Thiết bị bay' },
]

/*
  adminService là tầng giao tiếp API của actor admin.
  Nó phục vụ 3 page chính:
  - AdminDashboardPage.jsx
  - AdminUsersPage.jsx
  - AdminRequestsPage.jsx

  File này gom:
  - normalize dữ liệu user/role/request/vehicle/team
  - các rule hạn chế đổi role
  - lời gọi API quản trị
*/
// Admin dùng chung nhiều mapper với manager nhưng có thêm nhánh user/role/request moderation.
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

const normalizeVehicleTypeKey = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '')

const toVehicleTypeId = (value) => {
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return numeric
  }

  const normalized = normalizeVehicleTypeKey(value)
  const matched = VEHICLE_TYPE_OPTIONS.find(
    (option) =>
      normalizeVehicleTypeKey(option.label) === normalized || normalizeVehicleTypeKey(option.code) === normalized,
  )

  return matched?.id ?? null
}

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const toNullableText = (value) => {
  const text = String(value ?? '').trim()
  return text || null
}

const normalizeStockUnitStatus = (value) => {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (normalized === '1' || normalized === 'TRUE' || normalized === 'ACTIVE') {
    return 'ACTIVE'
  }

  if (normalized === '0' || normalized === 'FALSE' || normalized === 'INACTIVE' || normalized === 'DISABLED') {
    return 'INACTIVE'
  }

  return normalized || 'INACTIVE'
}

const isStockUnitActive = (stockUnit) => {
  if (typeof stockUnit?.isActive === 'boolean') {
    return stockUnit.isActive
  }

  if (typeof stockUnit?.IsActive === 'boolean') {
    return stockUnit.IsActive
  }

  return normalizeStockUnitStatus(stockUnit?.status ?? stockUnit?.Status) === 'ACTIVE'
}

const normalizeStockUnit = (stockUnit) => {
  const stockUnitId = stockUnit?.stockUnitId ?? stockUnit?.StockUnitId ?? stockUnit?.id ?? stockUnit?.Id ?? null
  const isActive = isStockUnitActive(stockUnit)
  const unitCode = stockUnit?.unitCode ?? stockUnit?.UnitCode ?? stockUnit?.stockUnitCode ?? stockUnit?.StockUnitCode ?? ''
  const unitName = stockUnit?.unitName ?? stockUnit?.UnitName ?? stockUnit?.name ?? stockUnit?.Name ?? stockUnit?.stockUnitName ?? stockUnit?.StockUnitName ?? ''
  const unitType = stockUnit?.unitType ?? stockUnit?.UnitType ?? stockUnit?.type ?? stockUnit?.Type ?? ''

  return {
    stockUnitId,
    id: stockUnitId,
    unitCode,
    unitName,
    unitType,
    name: unitName,
    type: unitType,
    region: stockUnit?.region ?? stockUnit?.Region ?? '',
    address: stockUnit?.address ?? stockUnit?.Address ?? '',
    supportsImport: Boolean(stockUnit?.supportsImport ?? stockUnit?.SupportsImport),
    supportsExport: Boolean(stockUnit?.supportsExport ?? stockUnit?.SupportsExport),
    isActive,
    status: normalizeStockUnitStatus(stockUnit?.status ?? stockUnit?.Status ?? (isActive ? 'ACTIVE' : 'INACTIVE')),
    createdAt: stockUnit?.createdAt ?? stockUnit?.CreatedAt ?? null,
    updatedAt: stockUnit?.updatedAt ?? stockUnit?.UpdatedAt ?? null,
    managerName: stockUnit?.managerName ?? stockUnit?.ManagerName ?? '',
    contactName: stockUnit?.contactName ?? stockUnit?.ContactName ?? '',
    contactPhone: stockUnit?.contactPhone ?? stockUnit?.ContactPhone ?? '',
    note: stockUnit?.note ?? stockUnit?.Note ?? '',
  }
}

const buildStockUnitPayload = (stockUnitData = {}, { isCreate = false } = {}) => {
  const payload = {
    unitCode: toNullableText(stockUnitData?.unitCode),
    unitName: toNullableText(stockUnitData?.unitName ?? stockUnitData?.name),
    unitType: toNullableText(stockUnitData?.unitType ?? stockUnitData?.type),
    region: toNullableText(stockUnitData?.region),
    address: toNullableText(stockUnitData?.address),
    supportsImport: Boolean(stockUnitData?.supportsImport),
    supportsExport: Boolean(stockUnitData?.supportsExport),
  }

  if (!isCreate) {
    payload.isActive = Boolean(stockUnitData?.isActive)
  }

  return payload
}

const getMeaningfulMessage = (data, { allowSuccess = false } = {}) => {
  const errors = data?.errors || data?.Errors

  if (errors && typeof errors === 'object') {
    const flattenedErrors = Object.values(errors)
      .flatMap((item) => (Array.isArray(item) ? item : [item]))
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)

    if (flattenedErrors.length > 0) {
      return flattenedErrors[0]
    }
  }

  const candidates = [
    data?.detail,
    data?.Detail,
    data?.title,
    data?.Title,
    data?.message,
    data?.Message,
  ]

  for (const candidate of candidates) {
    const text = String(candidate ?? '').trim()
    if (!text) {
      continue
    }

    if (!allowSuccess && text.toLowerCase() === 'success') {
      continue
    }

    return text
  }

  return ''
}

const normalizeVehicle = (vehicle) => ({
  id: vehicle?.vehicleId ?? vehicle?.VehicleId ?? vehicle?.id ?? null,
  vehicleId: vehicle?.vehicleId ?? vehicle?.VehicleId ?? vehicle?.id ?? null,
  vehicleCode: vehicle?.vehicleCode ?? vehicle?.VehicleCode ?? '',
  vehicleName: vehicle?.vehicleName ?? vehicle?.VehicleName ?? '',
  name: vehicle?.vehicleName ?? vehicle?.VehicleName ?? vehicle?.name ?? '',
  vehicleTypeName: vehicle?.vehicleTypeName ?? vehicle?.VehicleTypeName ?? '',
  vehicleTypeId:
    toVehicleTypeId(
      vehicle?.vehicleTypeId ?? vehicle?.VehicleTypeId ?? vehicle?.vehicleTypeName ?? vehicle?.VehicleTypeName,
    ) ?? null,
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

const normalizeRole = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

const isRestrictedRole = (role) => RESTRICTED_ROLE_SET.has(normalizeRole(role))

const getRoleUpdateRestriction = (user, currentUserId, nextRole = null) => {
  if (Number(user?.userId) === Number(currentUserId)) {
    return 'Quản trị viên không thể tự thay đổi vai trò của chính mình'
  }

  if (isRestrictedRole(user?.role)) {
    return 'Quản trị viên không thể thay đổi vai trò của người dùng có quyền Quản trị viên / Quản lý'
  }

  if (nextRole && isRestrictedRole(nextRole)) {
    return 'Quản trị viên không thể cấp quyền Quản trị viên / Quản lý cho người dùng'
  }

  return ''
}

const toApiRequestStatusValue = (status) => {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  return REQUEST_STATUS_TO_API_VALUE[normalized] || status
}

const toVehicleApiStatusValue = (status) => {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  return VEHICLE_STATUS_TO_API_VALUE[normalized] || status
}

const buildVehiclePayload = (vehicleData, { isCreate = false, originalStatus = '' } = {}) => {
  const status = toVehicleApiStatusValue(vehicleData?.status)
  const normalizedOriginalStatus = String(originalStatus ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '')
  const isMaintenanceTransition = !isCreate && normalizedOriginalStatus !== 'MAINTENANCE' && status === 'MAINTENANCE'

  const payload = {
    VehicleName: toNullableText(vehicleData?.vehicleName),
    VehicleTypeId: toVehicleTypeId(vehicleData?.vehicleTypeId ?? vehicleData?.vehicleTypeName),
    Capacity: toNullableNumber(vehicleData?.capacity),
    CurrentLocation: toNullableText(vehicleData?.currentLocation),
    Latitude: toNullableNumber(vehicleData?.latitude),
    Longitude: toNullableNumber(vehicleData?.longitude),
  }

  if (isCreate || vehicleData?.licensePlate !== undefined) {
    payload.LicensePlate = String(vehicleData?.licensePlate ?? '').trim()
  }

  if (status && (isCreate || normalizedOriginalStatus !== 'INUSE')) {
    payload.Status = status
  }

  const explicitLastMaintenance = toNullableText(vehicleData?.lastMaintenance)
  if (explicitLastMaintenance && !isMaintenanceTransition) {
    payload.LastMaintenance = explicitLastMaintenance
  }

  return payload
}

const adminService = {
  // Nhóm 1: user/role management cho AdminUsersPage.
  getUsers: async (userId = null) => {
    // Lấy danh sách người dùng hoặc người dùng cụ thể theo ID
    // Input: userId (optional) - ID người dùng cần tìm
    // Output: Mảng user với thông tin id, name, email, role, status
    // Lỗi: 401 (hết phiên), 403 (không quyền), 500 (lỗi server)
    const params = userId ? { userId: Number(userId) } : undefined
    const response = await api.get(`${ADMIN_BASE}`, { params })
    return normalizeArray(unwrapApiData(response))
  },

  getRoles: async () => {
    // Lấy danh sách các vai trò hệ thống (Admin, Manager, Coordinator, Rescue Team, Citizen)
    // Output: Mảng role với value (enum) và label (tiếng Việt)
    // Lỗi: 401 (hết phiên), 500 (lỗi server)
    const response = await api.get(`${ADMIN_BASE}/roles`)
    const roles = normalizeArray(unwrapApiData(response))

    return roles.map((role) => {
      const value = normalizeRole(role)
      return {
        value,
        label: ROLE_LABEL_MAP[value] || value,
      }
    })
  },

  getRoleLabel: (role) => {
    const normalized = normalizeRole(role)
    return ROLE_LABEL_MAP[normalized] || normalized
  },

  isRestrictedRole,
  isAssignableRole: (role) => !isRestrictedRole(role),
  getRoleUpdateRestriction,
  getAssignableRoles: (roles = []) =>
    normalizeArray(roles).filter((role) => !isRestrictedRole(role?.value ?? role)),

  // Nhóm 2: dữ liệu tổng quan dashboard admin.
  getRescueTeams: async (status = '') => {
    // Lấy danh sách các đội cứu hộ với trạng thái thu gọn (Active/Inactive)
    // Input: status (optional) - lọc theo trạng thái đội
    // Output: Mảng team với thông tin id, name, location, status
    // Lỗi: 401 (hết phiên), 500 (lỗi server)
    const params = status ? { status: String(status).trim().toUpperCase() } : undefined
    const response = await api.get(TEAM_BASE, { params })
    return normalizeArray(unwrapApiData(response))
  },

  getVehicles: async (status = '') => {
    // Lấy danh sách phương tiện với lọc theo trạng thái (AVAILABLE, INUSE, MAINTENANCE)
    // Input: status (optional) - AVAILABLE/INUSE/MAINTENANCE
    // Output: Mảng vehicle chuẩn hóa với id, name, type, capacity, status, location
    // Lỗi: 401 (hết phiên), 500 (lỗi server)
    const normalizedStatus = toVehicleApiStatusValue(status)
    const params = normalizedStatus ? { status: normalizedStatus } : undefined
    const response = await api.get('/Vehicle', { params })
    return normalizeArray(unwrapApiData(response)).map(normalizeVehicle)
  },

  getVehicleById: async (vehicleId) => {
    // Lấy chi tiết phương tiện cụ thể
    // Input: vehicleId - ID phương tiện
    // Output: Vehicle object chuẩn hóa
    // Lỗi: 401 (hết phiên), 404 (không tìm thấy), 500 (lỗi server)
    const response = await api.get(`/Vehicle/${vehicleId}`)
    return normalizeVehicle(unwrapApiData(response))
  },

  createVehicle: async (vehicleData) => {
    // Tạo phương tiện mới (VehicleCode do backend sinh)
    // Input: vehicleData - { name, type, licensePlate, capacity, location, latitude, longitude, status }
    // Output: Response với Data chứa vehicle đã tạo
    // Lỗi: 400 (dữ liệu không hợp lệ), 401 (hết phiên), 500 (lỗi server)
    const response = await api.post('/Vehicle', buildVehiclePayload(vehicleData, { isCreate: true }))
    const payload = response?.data ?? {}
    return {
      ...payload,
      Data: payload?.Data ? normalizeVehicle(payload.Data) : payload?.Data,
      data: payload?.data ? normalizeVehicle(payload.data) : payload?.data,
    }
  },

  updateVehicle: async (vehicleId, vehicleData, originalStatus = '') => {
    // Cập nhật thông tin phương tiện (không cập nhật status nếu xe đang INUSE)
    // Input: vehicleId, vehicleData, originalStatus - trạng thái cũ
    // Output: Response với Data chứa vehicle đã cập nhật
    // Lỗi: 400 (dữ liệu không hợp lệ), 401 (hết phiên), 404 (không tìm thấy), 500 (lỗi server)
    const response = await api.put(`/Vehicle/${vehicleId}`, buildVehiclePayload(vehicleData, { originalStatus }))
    const payload = response?.data ?? {}
    return {
      ...payload,
      Data: payload?.Data ? normalizeVehicle(payload.Data) : payload?.Data,
      data: payload?.data ? normalizeVehicle(payload.data) : payload?.data,
    }
  },

  deleteVehicle: async (vehicleId) => {
    // Xóa phương tiện
    // Input: vehicleId - ID phương tiện cần xóa
    // Output: Response success
    // Lỗi: 401 (hết phiên), 404 (không tìm thấy), 500 (lỗi server)
    const response = await api.delete(`/Vehicle/${vehicleId}`)
    return response?.data ?? {}
  },

  getVehicleTypeOptions: () => VEHICLE_TYPE_OPTIONS.map((item) => ({ ...item })),

  updateUserRole: async (userId, role) => {
    // Cập nhật vai trò của người dùng (không được đổi role ADMIN/MANAGER)
    // Input: userId - ID người dùng, role - vai trò mới (COORDINATOR, RESCUE_TEAM, CITIZEN)
    // Output: Response success
    // Lỗi: 400 (role không hợp lệ), 401 (hết phiên), 403 (role bị hạn chế), 404 (không tìm), 500 (lỗi)
    // Vai trò được chuẩn hóa trước khi gửi để tránh lệch giữa label hiển thị và enum BE.
    const response = await api.put(`${ADMIN_BASE}/${userId}/role`, {
      role: normalizeRole(role),
    })
    return response?.data ?? {}
  },

  updateUserStatus: async (userId, isActive) => {
    // Kích hoạt hoặc vô hiệu hóa tài khoản người dùng
    // Input: userId - ID người dùng, isActive - true (kích hoạt) hoặc false (vô hiệu)
    // Output: Response success
    // Lỗi: 401 (hết phiên), 404 (không tìm thấy), 500 (lỗi server)
    const response = await api.put(`${ADMIN_BASE}/${userId}/status`, {
      isActive: Boolean(isActive),
    })
    return response?.data ?? {}
  },

  // Nhóm 3: request moderation cho AdminDashboardPage và AdminRequestsPage.
  getRequests: async (status = '') => {
    // Lấy danh sách rescue request với lọc theo trạng thái
    // Input: status (optional) - Pending/Verified/Assigned/Confirmed/Completed/Cancelled/Duplicate
    // Output: Mảng request với id, title, status, address, phone, priority
    // Lỗi: 401 (hết phiên), 500 (lỗi server)
    const params = {}
    const normalizedStatus = toApiRequestStatusValue(status)

    if (normalizedStatus) {
      params.status = normalizedStatus
    }

    const response = await api.get('/RescueRequest', { params })
    return normalizeArray(unwrapApiData(response))
  },

  // Nhóm 4: quản lý đơn vị xuất nhập cho AdminStockUnitsPage.
  getStockUnits: async () => {
    // Lấy toàn bộ đơn vị xuất nhập trong hệ thống
    // Output: Mảng stock unit đã chuẩn hóa
    // Lỗi: 401 (hết phiên), 500 (lỗi server)
    const response = await api.get('/StockUnit/all')
    return normalizeArray(unwrapApiData(response)).map(normalizeStockUnit)
  },

  createStockUnit: async (stockUnitData) => {
    // Tạo đơn vị xuất nhập mới
    // Input: { name, type, region, address, supportsImport, supportsExport, isActive }
    // Output: Response success với stock unit đã tạo
    // Lỗi: 400 (dữ liệu không hợp lệ), 401 (hết phiên), 500 (lỗi server)
    const response = await api.post('/StockUnit', buildStockUnitPayload(stockUnitData, { isCreate: true }))
    const payload = response?.data ?? {}
    const normalizedData = normalizeStockUnit(unwrapApiData(response))

    return {
      ...payload,
      Data: payload?.Data ? normalizeStockUnit(payload.Data) : normalizedData,
      data: payload?.data ? normalizeStockUnit(payload.data) : normalizedData,
    }
  },

  updateStockUnit: async (stockUnitId, stockUnitData) => {
    // Cập nhật đơn vị xuất nhập theo ID
    // Input: stockUnitId, { name, type, region, address, supportsImport, supportsExport, isActive }
    // Output: Response success với stock unit đã cập nhật
    // Lỗi: 400 (dữ liệu không hợp lệ), 401 (hết phiên), 404 (không tìm thấy), 500 (lỗi server)
    const response = await api.put(`/StockUnit/${stockUnitId}`, buildStockUnitPayload(stockUnitData))
    const payload = response?.data ?? {}
    const normalizedData = normalizeStockUnit(unwrapApiData(response))

    return {
      ...payload,
      Data: payload?.Data ? normalizeStockUnit(payload.Data) : normalizedData,
      data: payload?.data ? normalizeStockUnit(payload.data) : normalizedData,
    }
  },

  changeStockUnitStatus: async (stockUnitId, isActive) => {
    // Đổi trạng thái đơn vị xuất nhập sang hoạt động / ngừng hoạt động
    // Input: stockUnitId, isActive - true hoặc false
    // Output: Response success
    // Lỗi: 401 (hết phiên), 404 (không tìm thấy), 500 (lỗi server)
    const payload = {
      isActive: Boolean(isActive),
    }
    const response = await api.put(`/StockUnit/${stockUnitId}/status`, payload)
    return response?.data ?? {}
  },

  cancelRequest: async (requestId) => {
    // Hủy một rescue request (không được hủy request đã Completed, Duplicate)
    // Input: requestId - ID request cần hủy
    // Output: Response success
    // Lỗi: 400 (request không hợp lệ để hủy), 401 (hết phiên), 404 (không tìm), 500 (lỗi)
    const response = await api.put(`/RescueRequest/${requestId}/status`, {
      status: 'Cancelled',
    })

    return response?.data ?? {}
  },

  getErrorMessage: (error) => {
    const status = error?.response?.status
    const data = error?.response?.data
    const message = getMeaningfulMessage(data)

    if (status === 400) {
      return message || 'Dữ liệu gửi lên không hợp lệ.'
    }

    if (status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    }

    if (status === 403) {
      return message || 'Bạn không có quyền truy cập chức năng này.'
    }

    if (status === 404) {
      return message || 'Không tìm thấy dữ liệu cần thao tác.'
    }

    if (status >= 500) {
      return 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'
    }

    return message || 'Có lỗi xảy ra. Vui lòng thử lại.'
  },
}

export default adminService
