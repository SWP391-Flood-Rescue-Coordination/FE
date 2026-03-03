import api from './api'

const COORDINATOR_BASE = '/coordinator'

const unwrapApiData = (response) => {
  if (response?.data?.data !== undefined) {
    return response.data.data
  }
  return response?.data
}

const normalizeArray = (value) => (Array.isArray(value) ? value : [])

const coordinatorService = {
  getRescueRequests: async (status = '') => {
    const params = {
      sortBy: 'created_at',
      sortDirection: 'desc',
    }

    if (status) {
      params.status = status
    }

    const response = await api.get(`${COORDINATOR_BASE}/requests`, { params })
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
    const params = status ? { status } : undefined
    const response = await api.get(`${COORDINATOR_BASE}/vehicles`, { params })
    return normalizeArray(unwrapApiData(response))
  },

  getAvailableRescueTeams: async () => {
    return coordinatorService.getRescueTeams('AVAILABLE')
  },

  getAvailableVehicles: async () => {
    return coordinatorService.getVehicles('AVAILABLE')
  },

  verifyRequest: async (requestId, priorityLevelId) => {
    const payload = {
      priority_level_id: Number(priorityLevelId),
      priorityLevelId: Number(priorityLevelId),
    }
    const response = await api.post(`${COORDINATOR_BASE}/requests/${requestId}/verify`, payload)
    return unwrapApiData(response)
  },

  assignRequest: async (requestId, rescueTeamId, vehicleId) => {
    const payload = {
      rescue_team_id: Number(rescueTeamId),
      vehicle_id: Number(vehicleId),
      rescueTeamId: Number(rescueTeamId),
      vehicleId: Number(vehicleId),
    }
    const response = await api.post(`${COORDINATOR_BASE}/requests/${requestId}/assign`, payload)
    return unwrapApiData(response)
  },
}

export default coordinatorService
