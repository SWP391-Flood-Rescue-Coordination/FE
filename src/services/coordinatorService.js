import api from './api'

const COORDINATOR_BASE = '/Coordinator'

const unwrapApiData = (response) => {
  if (response?.data?.data !== undefined) {
    return response.data.data
  }
  return response?.data
}

const normalizeArray = (value) => (Array.isArray(value) ? value : [])

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
}

const toApiStatusValue = (status) => {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase()
  return STATUS_TO_API_VALUE[normalized] || status
}

const VEHICLE_STATUS_TO_API_VALUE = {
  AVAILABLE: 'Available',
  INUSE: 'InUse',
  IN_USE: 'InUse',
  MAINTENANCE: 'Maintenance',
  DISABLED: 'Disabled',
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
    const response = await api.get(`${COORDINATOR_BASE}/all-requests`, { params })
    return normalizeArray(unwrapApiData(response))
  },

  getPriorityLevels: async () => {
    const response = await api.get(`${COORDINATOR_BASE}/priority-levels`)
    return normalizeArray(unwrapApiData(response))
  },

  getRescueTeams: async (status = '') => {
    const params = status ? { status } : undefined
    const response = await api.get(`${COORDINATOR_BASE}/teams`, { params })
    return normalizeArray(unwrapApiData(response))
  },

  getVehicles: async (status = '') => {
    const params = status ? { status: toVehicleApiStatusValue(status) } : undefined
    const response = await api.get('/Vehicle', { params })
    return normalizeArray(unwrapApiData(response))
  },

  getAvailableRescueTeams: async (status = '') => {
    const params = status ? { status: String(status).trim().toUpperCase() } : undefined
    const response = await api.get(`${COORDINATOR_BASE}/status-with-teams`, { params })
    return normalizeArray(unwrapApiData(response))
  },

  getAvailableVehicles: async () => {
    const response = await api.get('/Vehicle', { params: { status: 'AVAILABLE' } })
    return normalizeArray(unwrapApiData(response))
  },

  verifyRequest: async (requestId, priorityLevelId) => {
    const payload = {
      status: 'Verified',
      priorityLevelId: Number(priorityLevelId),
    }
    const response = await api.put(`${COORDINATOR_BASE}/update-request/${requestId}`, payload)
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
