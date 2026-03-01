import api from './api'

/**
 * Service xử lý API cho Rescue Team
 * Base URL: /api/rescue-team
 * Role yêu cầu: RESCUE_TEAM
 */

// ============================================
// Helper Functions
// ============================================

/**
 * Normalize status string
 */
const normalizeStatus = (status) => {
  return String(status ?? '').trim()
}

/**
 * Map BE status sang FE display text
 */
const mapStatusDisplay = (status) => {
  const statusMap = {
    'Assigned': 'Chờ xử lý',
    'In Progress': 'Đang thực hiện',
    'Completed': 'Hoàn thành'
  }
  return statusMap[status] || status
}

/**
 * Map priority level ID sang text
 */
const mapPriorityDisplay = (priorityName) => {
  return priorityName || 'Thông thường'
}

/**
 * Unwrap API response data
 */
const unwrapApiData = (response) => {
  if (response?.data?.data !== undefined) {
    return response.data.data
  }
  if (response?.data?.Data !== undefined) {
    return response.data.Data
  }
  return response?.data
}

/**
 * Flatten validation errors từ response
 */
const flattenValidationErrors = (errors) => {
  if (!errors || typeof errors !== 'object') {
    return []
  }

  return Object.values(errors)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(Boolean)
    .map((value) => String(value))
}

// ============================================
// Error Handlers
// ============================================

/**
 * Parse lỗi khi get operations
 */
const getOperationsErrorMessage = (error) => {
  const status = error?.response?.status
  const data = error?.response?.data

  if (status === 401) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  }

  if (status === 403) {
    return 'Bạn không có quyền xem danh sách nhiệm vụ. Vui lòng kiểm tra tài khoản có thuộc đội cứu hộ.'
  }

  if (status >= 500) {
    return 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'
  }

  return data?.message || data?.Message || 'Không thể tải danh sách nhiệm vụ.'
}

/**
 * Parse lỗi khi update status
 */
const getUpdateStatusErrorMessage = (error) => {
  const status = error?.response?.status
  const data = error?.response?.data

  if (status === 400) {
    const validationMessages = flattenValidationErrors(data?.errors)
    if (validationMessages.length > 0) {
      return validationMessages.join(' ')
    }
    return data?.message || data?.Message || 'Không thể cập nhật trạng thái. Vui lòng kiểm tra lại.'
  }

  if (status === 401) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  }

  if (status === 403) {
    return 'Bạn không có quyền cập nhật nhiệm vụ này.'
  }

  if (status === 404) {
    return 'Không tìm thấy nhiệm vụ.'
  }

  if (status === 409) {
    return 'Trạng thái đã bị thay đổi bởi người khác. Vui lòng tải lại trang.'
  }

  if (status >= 500) {
    return 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'
  }

  return data?.message || data?.Message || 'Không thể cập nhật trạng thái nhiệm vụ.'
}

// ============================================
// Data Transformation
// ============================================

/**
 * Transform BE operation data sang FE mission format
 */
const transformOperationToMission = (operation) => {
  return {
    id: operation.operationId || operation.OperationId,
    operationId: operation.operationId || operation.OperationId,
    requestId: operation.requestId || operation.RequestId,
    address: operation.requestAddress || operation.RequestAddress || 'Không có địa chỉ',
    phone: operation.requestPhone || operation.RequestPhone || 'N/A',
    location: {
      lat: operation.requestLatitude || operation.RequestLatitude || 0,
      lng: operation.requestLongitude || operation.RequestLongitude || 0
    },
    description: operation.requestDescription || operation.RequestDescription || 'Không có mô tả',
    estimatedTime: 'Đang cập nhật',
    priority: mapPriorityDisplay(operation.priorityName || operation.PriorityName),
    status: mapStatusDisplay(operation.status || operation.Status),
    rawStatus: operation.status || operation.Status,
    teamName: operation.teamName || operation.TeamName || 'N/A',
    vehicles: operation.vehicles || operation.Vehicles || [],
    assignedAt: operation.assignedAt || operation.AssignedAt,
    startedAt: operation.startedAt || operation.StartedAt,
    completedAt: operation.completedAt || operation.CompletedAt,
    title: operation.requestTitle || operation.RequestTitle || 'Nhiệm vụ cứu hộ'
  }
}

// ============================================
// API Methods
// ============================================

const rescueTeamService = {
  /**
   * 1. Lấy danh sách nhiệm vụ được phân công
   * GET /api/rescue-team/my-operations
   * 
   * @returns {Promise<Array>} Danh sách missions
   * @throws {Error} Nếu có lỗi từ API
   */
  getMyOperations: async () => {
    try {
      const response = await api.get('/rescue-team/my-operations')
      const data = unwrapApiData(response)
      
      // Nếu response là array
      if (Array.isArray(data)) {
        return data.map(transformOperationToMission)
      }
      
      // Nếu response có Total và Data (format từ BE)
      if (data && typeof data === 'object' && Array.isArray(data.Data)) {
        return data.Data.map(transformOperationToMission)
      }
      
      return []
    } catch (error) {
      console.error('[rescueTeamService] getMyOperations error:', error)
      throw error
    }
  },

  /**
   * 2. Cập nhật trạng thái nhiệm vụ
   * PUT /api/rescue-team/operations/{operationId}/status
   * 
   * @param {number} operationId - ID của operation
   * @param {string} newStatus - Trạng thái mới: "In Progress" hoặc "Completed"
   * @returns {Promise<Object>} Response từ BE
   * @throws {Error} Nếu có lỗi từ API
   */
  updateOperationStatus: async (operationId, newStatus) => {
    try {
      const payload = {
        newStatus: newStatus // "In Progress" hoặc "Completed"
      }
      
      const response = await api.put(
        `/rescue-team/operations/${operationId}/status`,
        payload
      )
      
      return response.data
    } catch (error) {
      console.error('[rescueTeamService] updateOperationStatus error:', error)
      throw error
    }
  },

  /**
   * 3. Xem chi tiết một nhiệm vụ
   * GET /api/rescue-team/operations/{operationId}
   * 
   * @param {number} operationId - ID của operation
   * @returns {Promise<Object>} Chi tiết mission
   * @throws {Error} Nếu có lỗi từ API
   */
  getOperationDetails: async (operationId) => {
    try {
      const response = await api.get(`/rescue-team/operations/${operationId}`)
      const data = unwrapApiData(response)
      
      if (data && typeof data === 'object') {
        return transformOperationToMission(data)
      }
      
      return null
    } catch (error) {
      console.error('[rescueTeamService] getOperationDetails error:', error)
      throw error
    }
  },

  // Export helper functions
  getOperationsErrorMessage,
  getUpdateStatusErrorMessage,
  normalizeStatus,
  mapStatusDisplay,
  mapPriorityDisplay,
  transformOperationToMission
}

export default rescueTeamService
