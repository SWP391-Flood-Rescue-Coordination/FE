import api from './api'

// Service rescue team gom operation hiện tại thành dữ liệu mission mà UI dễ hiển thị hơn.
const normalizeStatus = (status) => String(status ?? '').trim()

const normalizeStatusKey = (status) =>
  String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

const TERMINAL_REQUEST_STATUS_SET = new Set(['COMPLETED', 'CANCELLED', 'CANCELED', 'DUPLICATE'])

const mapStatusDisplay = (status) => {
  const statusMap = {
    Assigned: 'Đã phân công',
    Completed: 'Hoàn thành',
    Cancelled: 'Đã hủy',
    Canceled: 'Đã hủy',
  }

  return statusMap[status] || status
}

const mapPriorityDisplay = (priorityName) => priorityName || 'Thông thường'

const unwrapApiData = (response) => {
  if (response?.data?.data !== undefined) {
    return response.data.data
  }

  if (response?.data?.Data !== undefined) {
    return response.data.Data
  }

  return response?.data
}

const flattenValidationErrors = (errors) => {
  if (!errors || typeof errors !== 'object') {
    return []
  }

  return Object.values(errors)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(Boolean)
    .map((value) => String(value))
}

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

const transformOperationToMission = (operation) => {
  const requestStatus = operation.requestStatus || operation.RequestStatus || ''

  // Map estimatedTime: nếu là số, chuyển sang phút/hh:mm, nếu không có thì 'Đang cập nhật'
  let estimatedTimeRaw = operation.estimatedTime ?? operation.EstimatedTime;
  let estimatedTime = 'Đang cập nhật';
  if (typeof estimatedTimeRaw === 'number' && !isNaN(estimatedTimeRaw)) {
    // Giả sử đơn vị là phút, nếu cần đổi sang hh:mm thì chỉnh lại ở đây
    if (estimatedTimeRaw >= 60) {
      const h = Math.floor(estimatedTimeRaw / 60);
      const m = estimatedTimeRaw % 60;
      estimatedTime = `${h}h${m > 0 ? ' ' + m + 'p' : ''}`;
    } else {
      estimatedTime = estimatedTimeRaw + ' phút';
    }
  } else if (typeof estimatedTimeRaw === 'string' && estimatedTimeRaw.trim() !== '') {
    estimatedTime = estimatedTimeRaw;
  }
  return {
    id: operation.operationId || operation.OperationId,
    operationId: operation.operationId || operation.OperationId,
    requestId: operation.requestId || operation.RequestId,
    address: operation.requestAddress || operation.RequestAddress || 'Không có địa chỉ',
    phone: operation.requestPhone || operation.RequestPhone || 'N/A',
    location: {
      lat: operation.requestLatitude || operation.RequestLatitude || 0,
      lng: operation.requestLongitude || operation.RequestLongitude || 0,
    },
    description: operation.requestDescription || operation.RequestDescription || 'Không có mô tả',
    estimatedTime,
    priority: mapPriorityDisplay(operation.priorityName || operation.PriorityName),
    status: mapStatusDisplay(operation.status || operation.Status),
    rawStatus: operation.status || operation.Status,
    requestStatus: mapStatusDisplay(requestStatus),
    requestRawStatus: requestStatus,
    teamName: operation.teamName || operation.TeamName || 'N/A',
    vehicles: operation.vehicles || operation.Vehicles || [],
    assignedAt: operation.assignedAt || operation.AssignedAt,
    startedAt: operation.startedAt || operation.StartedAt,
    completedAt: operation.completedAt || operation.CompletedAt,
    title: operation.requestTitle || operation.RequestTitle || 'Nhiệm vụ cứu hộ',
  }
}

const filterActiveMissions = (items) =>
  items.filter((mission) => !TERMINAL_REQUEST_STATUS_SET.has(normalizeStatusKey(mission.requestRawStatus)))

const rescueTeamService = {
  getMyOperations: async () => {
    // Lấy danh sách nhiệm vụ hiện tại của đội cứu hộ (filter các request đã Complete/Duplicate/Cancelled)
    // Output: Mảng mission chuẩn hóa { id, address, phone, location, estimatedTime, priority, status, vehicles }
    // Lỗi: 401 (hết phiên hoặc không phải rescue team), 403 (không quyền), 500 (lỗi server)
    try {
      const response = await api.get('/rescue-team/my-operations')
      const data = unwrapApiData(response)

      if (Array.isArray(data)) {
        // FE chỉ giữ các nhiệm vụ request chưa rơi vào trạng thái cuối.
        return filterActiveMissions(data.map(transformOperationToMission))
      }

      if (data && typeof data === 'object' && Array.isArray(data.Data)) {
        return filterActiveMissions(data.Data.map(transformOperationToMission))
      }

      return []
    } catch (error) {
      console.error('[rescueTeamService] getMyOperations error:', error)
      throw error
    }
  },

  updateOperationStatus: async (operationId, newStatus) => {
    // Cập nhật trạng thái của một nhiệm vụ (Assigned -> Completed hoặc Cancelled)
    // Input: operationId - ID nhiệm vụ, newStatus - trạng thái mới
    // Output: Response success
    // Lỗi: 400 (status không hợp lệ), 401 (hết phiên), 403 (không quyền), 404 (không tìm), 409 (conflict - thay đổi bởi người khác), 500 (lỗi)
    try {
      const response = await api.put(`/rescue-team/operations/${operationId}/status`, {
        newStatus,
      })

      return response.data
    } catch (error) {
      console.error('[rescueTeamService] updateOperationStatus error:', error)
      throw error
    }
  },

  cancelMissionRequest: async (requestId) => {
    // Hủy một request/nhiệm vụ (đi theo API hủy request hệ thống như admin dùng)
    // Input: requestId - ID request cần hủy
    // Output: Response success
    // Lỗi: 400 (request không hợp lệ để hủy), 401 (hết phiên), 403 (không quyền), 404 (không tìm), 500 (lỗi)
    // Nút thất bại/hủy ở rescue team đi theo API hủy request giống luồng admin.
    try {
      // Nút thất bại/hủy ở rescue team đi theo API hủy request giống luồng admin.
      const response = await api.put(`/RescueRequest/${requestId}/status`, {
        status: 'Cancelled',
      })

      return response.data
    } catch (error) {
      console.error('[rescueTeamService] cancelMissionRequest error:', error)
      throw error
    }
  },

  getOperationDetails: async (operationId) => {
    // Lấy chi tiết một nhiệm vụ cụ thể
    // Input: operationId - ID nhiệm vụ
    // Output: Mission object chuẩn hóa { id, address, phone, location, description, priority, status, vehicles }
    // Lỗi: 401 (hết phiên), 403 (không quyền), 404 (không tìm), 500 (lỗi server)
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

  getOperationsErrorMessage,
  getUpdateStatusErrorMessage,
  normalizeStatus,
  mapStatusDisplay,
  mapPriorityDisplay,
  transformOperationToMission,
}

export default rescueTeamService
