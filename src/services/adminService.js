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
  if (explicitLastMaintenance) {
    payload.LastMaintenance = explicitLastMaintenance
  }

  return payload
}

const adminService = {
  getUsers: async (userId = null) => {
    const params = userId ? { userId: Number(userId) } : undefined
    const response = await api.get(`${ADMIN_BASE}`, { params })
    return normalizeArray(unwrapApiData(response))
  },

  getRoles: async () => {
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

  getRescueTeams: async (status = '') => {
    const params = status ? { status: String(status).trim().toUpperCase() } : undefined
    const response = await api.get(TEAM_BASE, { params })
    return normalizeArray(unwrapApiData(response))
  },

  getVehicles: async (status = '') => {
    const normalizedStatus = toVehicleApiStatusValue(status)
    const params = normalizedStatus ? { status: normalizedStatus } : undefined
    const response = await api.get('/Vehicle', { params })
    return normalizeArray(unwrapApiData(response)).map(normalizeVehicle)
  },

  getVehicleById: async (vehicleId) => {
    const response = await api.get(`/Vehicle/${vehicleId}`)
    return normalizeVehicle(unwrapApiData(response))
  },

  createVehicle: async (vehicleData) => {
    const response = await api.post('/Vehicle', buildVehiclePayload(vehicleData, { isCreate: true }))
    const payload = response?.data ?? {}
    return {
      ...payload,
      Data: payload?.Data ? normalizeVehicle(payload.Data) : payload?.Data,
      data: payload?.data ? normalizeVehicle(payload.data) : payload?.data,
    }
  },

  updateVehicle: async (vehicleId, vehicleData, originalStatus = '') => {
    const response = await api.put(`/Vehicle/${vehicleId}`, buildVehiclePayload(vehicleData, { originalStatus }))
    const payload = response?.data ?? {}
    return {
      ...payload,
      Data: payload?.Data ? normalizeVehicle(payload.Data) : payload?.Data,
      data: payload?.data ? normalizeVehicle(payload.data) : payload?.data,
    }
  },

  deleteVehicle: async (vehicleId) => {
    const response = await api.delete(`/Vehicle/${vehicleId}`)
    return response?.data ?? {}
  },

  getVehicleTypeOptions: () => VEHICLE_TYPE_OPTIONS.map((item) => ({ ...item })),

  updateUserRole: async (userId, role) => {
    // Vai trò được chuẩn hóa trước khi gửi để tránh lệch giữa label hiển thị và enum BE.
    const response = await api.put(`${ADMIN_BASE}/${userId}/role`, {
      role: normalizeRole(role),
    })
    return response?.data ?? {}
  },

  updateUserStatus: async (userId, isActive) => {
    const response = await api.put(`${ADMIN_BASE}/${userId}/status`, {
      isActive: Boolean(isActive),
    })
    return response?.data ?? {}
  },

  getRequests: async (status = '') => {
    const params = {}
    const normalizedStatus = toApiRequestStatusValue(status)

    if (normalizedStatus) {
      params.status = normalizedStatus
    }

    const response = await api.get('/RescueRequest', { params })
    return normalizeArray(unwrapApiData(response))
  },

  cancelRequest: async (requestId) => {
    const response = await api.put(`/RescueRequest/${requestId}/status`, {
      status: 'Cancelled',
    })

    return response?.data ?? {}
  },

  getErrorMessage: (error) => {
    const status = error?.response?.status
    const data = error?.response?.data

    if (status === 400) {
      return data?.message || data?.Message || data?.title || 'Dữ liệu gửi lên không hợp lệ.'
    }

    if (status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    }

    if (status === 403) {
      return data?.message || data?.Message || 'Bạn không có quyền truy cập chức năng này.'
    }

    if (status === 404) {
      return data?.message || data?.Message || 'Không tìm thấy dữ liệu cần thao tác.'
    }

    if (status >= 500) {
      return 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'
    }

    return data?.message || data?.Message || data?.title || 'Có lỗi xảy ra. Vui lòng thử lại.'
  },
}

export default adminService
