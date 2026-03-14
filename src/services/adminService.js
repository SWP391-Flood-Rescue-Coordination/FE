import api from './api'

const ADMIN_BASE = '/Admin'
const TEAM_BASE = '/Coordinator'

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
  AVAILABLE: 'Available',
  INUSE: 'InUse',
  IN_USE: 'InUse',
  MAINTENANCE: 'Maintenance',
  DISABLED: 'Disabled',
}

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

const normalizeRole = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

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

const adminService = {
  getUsers: async (userId = null) => {
    const params = userId ? { userId: Number(userId) } : undefined
    const response = await api.get(`${ADMIN_BASE}/users`, { params })
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

  getRescueTeams: async (status = '') => {
    const params = status ? { status: String(status).trim().toUpperCase() } : undefined
    const response = await api.get(`${TEAM_BASE}/status-with-teams`, { params })
    return normalizeArray(unwrapApiData(response))
  },

  getVehicles: async (status = '') => {
    const normalizedStatus = toVehicleApiStatusValue(status)
    const params = normalizedStatus ? { status: normalizedStatus } : undefined
    const response = await api.get('/Vehicle', { params })
    return normalizeArray(unwrapApiData(response))
  },

  updateUserRole: async (userId, role) => {
    const response = await api.put(`${ADMIN_BASE}/users/${userId}/role`, {
      role: normalizeRole(role),
    })
    return response?.data ?? {}
  },

  updateUserStatus: async (userId, isActive) => {
    const response = await api.put(`${ADMIN_BASE}/users/${userId}/status`, {
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
