import api from './api'

const REQUEST_BASE = '/RescueRequest'
const TEAM_BASE = '/rescue-team/status'
const PRIORITY_LEVELS = [
  { priorityLevelId: 1, priorityName: 'Cao' },
  { priorityLevelId: 2, priorityName: 'Trung bình' },
  { priorityLevelId: 3, priorityName: 'Thấp' },
]

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
  getRescueRequests: async (status = '', priorityId = null) => {
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
    const params = status ? { status: String(status).trim().toUpperCase() } : undefined
    const response = await api.get(TEAM_BASE, { params })
    return normalizeArray(unwrapApiData(response))
  },

  getVehicles: async (status = '') => {
    const params = status ? { status: toVehicleApiStatusValue(status) } : undefined
    const response = await api.get('/Vehicle', { params })
    return normalizeArray(unwrapApiData(response)).map(normalizeVehicle)
  },

  getAvailableRescueTeams: async (status = '') => {
    const params = status ? { status: String(status).trim().toUpperCase() } : undefined
    const response = await api.get(TEAM_BASE, { params })
    return normalizeArray(unwrapApiData(response))
  },

  getAvailableVehicles: async () => {
    const response = await api.get('/Vehicle', { params: { status: 'AVAILABLE' } })
    return normalizeArray(unwrapApiData(response)).map(normalizeVehicle)
  },

  verifyRequest: async (requestId) => {
    const response = await api.put(`${REQUEST_BASE}/${requestId}/verify`)
    return unwrapApiData(response)
  },

  markRequestDuplicate: async (requestId) => {
    const response = await api.put(`${REQUEST_BASE}/${requestId}/status`, {
      status: 'Duplicate',
    })
    return unwrapApiData(response)
  },

  assignRequest: async (requestId, teamId, vehicleIds, estimatedTime) => {
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
