import api from './api'

const COORDINATOR_BASE = '/Coordinator'
const REQUEST_BASE = '/RescueRequest'
const TEAM_BASE = '/rescue-team/status'

const unwrapApiData = (response) => {
  if (response?.data?.data !== undefined) {
    return response.data.data
  }
  return response?.data
}

const normalizeArray = (value) => (Array.isArray(value) ? value : [])

const getRescueTeamsWithFallback = async (params) => {
  const endpoints = ['/rescue-team/status', '/rescue-team', '/Coordinator/status-with-teams']
  let lastError = null

  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint, { params })
      return normalizeArray(unwrapApiData(response))
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

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
    const response = await api.get(`${REQUEST_BASE}`, { params })
    return normalizeArray(unwrapApiData(response))
  },

  getPriorityLevels: async () => {
    const response = await api.get(`${COORDINATOR_BASE}/priority-levels`)
    return normalizeArray(unwrapApiData(response))
  },

  getRescueTeams: async (status = '') => {
    const params = status ? { status: String(status).trim().toUpperCase() } : undefined
    return getRescueTeamsWithFallback(params)
  },

  getVehicles: async (status = '') => {
    const params = status ? { status: toVehicleApiStatusValue(status) } : undefined
    const response = await api.get('/Vehicle', { params })
    return normalizeArray(unwrapApiData(response))
  },

  getAvailableRescueTeams: async (status = '') => {
    const params = status ? { status: String(status).trim().toUpperCase() } : undefined
    return getRescueTeamsWithFallback(params)
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
    const response = await api.put(`${REQUEST_BASE}/${requestId}/set-priority-and-verify`, payload)
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
