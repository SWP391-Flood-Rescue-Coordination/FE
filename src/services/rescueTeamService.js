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
    Failed: 'Thất bại',
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

  if (status === 404) {
    return 'Chưa có nhiệm vụ được giao lúc này.'
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
  const operationStatus =
    operation.operationStatus ||
    operation.OperationStatus ||
    operation.status ||
    operation.Status ||
    ''

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
    status: mapStatusDisplay(operationStatus),
    rawStatus: operationStatus,
    requestStatus: mapStatusDisplay(requestStatus),
    requestRawStatus: requestStatus,
    teamName: operation.teamName || operation.TeamName || 'N/A',
    vehicles: operation.vehicles || operation.Vehicles || [],
    assignedAt: operation.assignedAt || operation.AssignedAt,
    startedAt: operation.startedAt || operation.StartedAt,
    completedAt: operation.completedAt || operation.CompletedAt,
    title: operation.requestTitle || operation.RequestTitle || 'Nhiệm vụ cứu hộ',
    adultCount: operation.adultCount ?? operation.AdultCount ?? 0,
    elderlyCount: operation.elderlyCount ?? operation.ElderlyCount ?? 0,
    childrenCount: operation.childrenCount ?? operation.ChildrenCount ?? 0,
    totalPeople:
      operation.numberOfAffectedPeople ??
      operation.NumberOfAffectedPeople ??
      ((operation.adultCount ?? operation.AdultCount ?? 0) +
        (operation.elderlyCount ?? operation.ElderlyCount ?? 0) +
        (operation.childrenCount ?? operation.ChildrenCount ?? 0)),
  }
}

// Transform response from /rescue-team/my-current-task endpoint
const transformMyCurrentTaskToMission = (taskData) => {
  if (!taskData) return null

  // Map vehicles from string array to vehicle objects if available
  let vehicles = []
  if (Array.isArray(taskData.operation?.vehicles)) {
    vehicles = taskData.operation.vehicles.map(v => ({ vehicleName: v, name: v }))
  }

  return {
    id: taskData.operationId || taskData.operation?.operationId,
    operationId: taskData.operationId || taskData.operation?.operationId,
    requestId: taskData.requestId,
    address: taskData.address || 'Không có địa chỉ',
    phone: taskData.phone || 'N/A',
    location: {
      lat: taskData.latitude ?? 0,
      lng: taskData.longitude ?? 0,
    },
    description: taskData.description || 'Không có mô tả',
    estimatedTime: taskData.operation?.estimatedTime ? `${taskData.operation.estimatedTime} phút` : 'Đang cập nhật',
    priority: mapPriorityDisplay(taskData.priorityName),
    status: mapStatusDisplay(taskData.operation?.status),
    rawStatus: taskData.operation?.status,
    requestStatus: mapStatusDisplay(taskData.status),
    requestRawStatus: taskData.status,
    teamName: taskData.teamName || 'N/A',
    vehicles: vehicles,
    assignedAt: taskData.operation?.assignedAt,
    startedAt: taskData.operation?.startedAt,
    completedAt: null, // Not in response
    title: taskData.title || 'Nhiệm vụ cứu hộ',
    adultCount: 0, // Not provided by this endpoint
    elderlyCount: 0, // Not provided by this endpoint
    childrenCount: 0, // Not provided by this endpoint
    totalPeople: 0, // Not provided by this endpoint
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
        status: newStatus,
      })

      return response.data
    } catch (error) {

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

      throw error
    }
  },

  // ===== LEADER ACTIONS =====
  // Leader tiếp nhận yêu cầu cứu hộ được phân công
  acceptRequest: async (requestId) => {
    try {
      const response = await api.put(`/rescue-team/requests/${requestId}/accept`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Leader từ chối yêu cầu cứu hộ
  rejectRequest: async (requestId, reason = '') => {
    try {
      const query = reason ? `?reason=${encodeURIComponent(reason)}` : ''
      const response = await api.put(`/rescue-team/requests/${requestId}/reject${query}`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Leader giao nhiệm vụ cho một hoặc nhiều thành viên
  assignTaskToMembers: async (requestId, userIds, vehicleIds = []) => {
    try {
      const payload = {
        userIds: Array.isArray(userIds) ? userIds : [userIds],
        requestId: Number(requestId),
      }
      if (vehicleIds && vehicleIds.length > 0) {
        payload.vehicleIds = Array.isArray(vehicleIds) ? vehicleIds : [vehicleIds]
      }
      
      console.log('📤 Assigning members - Payload:', {
        requestId: payload.requestId,
        userIds: payload.userIds,
        userIdsTypes: payload.userIds.map(id => typeof id + ':' + id),
        vehicleIds: payload.vehicleIds,
      })
      
      const response = await api.post('/rescue-team/members/assign-task', payload)
      console.log('✅ Members assigned successfully:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Assign task error:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        message: error?.response?.data?.message,
        fullError: error?.response?.data
      })
      throw error
    }
  },

  // Leader xem danh sách thành viên trong đội (hỗ trợ tìm kiếm)
  getTeamMembers: async (search = '') => {
    try {
      const params = search ? { search } : {}
      const response = await api.get('/rescue-team/members', { params })
      const data = unwrapApiData(response)
      console.log('📦 Team members raw data:', data)
      
      // Normalize member data to have consistent field names
      // Filter out leaders (only show actual team members)
      if (Array.isArray(data)) {
        return data
          .filter((member) => {
            // Exclude leaders - filter by username pattern
            const userName = (member.userName ?? member.UserName ?? member.username ?? '').toLowerCase()
            return !userName.includes('leader')
          })
          .map((member) => {
            const memberId = member.id ?? member.Id ?? member.userId ?? member.UserId ?? null
            
            // CRITICAL: Reject member if id is 0 or null
            if (!memberId || memberId === 0) {
              return null
            }
            
            return {
              id: memberId,
              name: member.name ?? member.Name ?? member.userName ?? member.UserName ?? member.fullName ?? member.FullName ?? member.displayName ?? member.DisplayName ?? 'N/A',
              userName: member.userName ?? member.UserName ?? member.name ?? member.Name ?? 'N/A',
              email: member.email ?? member.Email ?? 'N/A',
              phone: member.phone ?? member.Phone ?? member.phoneNumber ?? member.PhoneNumber ?? 'N/A',
              address: member.address ?? member.Address ?? 'N/A',
              requestId: member.requestId ?? member.RequestId ?? null,
              isBusy: Boolean(member.isBusy ?? member.IsBusy ?? false),
              currentOperationId: member.currentOperationId ?? member.CurrentOperationId ?? null,
              lastSupportRequestedAt:
                member.lastSupportRequestedAt ?? member.LastSupportRequestedAt ?? null,
            }
          })
          .filter(m => m !== null)  // Remove invalid members
      }
      return []
    } catch (error) {
      throw error
    }
  },

  // ===== MEMBER ACTIONS =====
  // Thành viên xem nhiệm vụ được giao cho cá nhân
  getMyAssignment: async () => {
    try {
      // Changed to use my-current-task endpoint which filters by member.RequestId
      const response = await api.get('/rescue-team/my-current-task')
      const data = unwrapApiData(response)
      if (data && typeof data === 'object') {
        console.log('📦 My current task response:', data)
        return transformMyCurrentTaskToMission(data)
      }
      return null
    } catch (error) {
      // Silently handle 404 - it's expected when member has no assignment
      if (error?.response?.status === 404) {
        console.log('ℹ️ Member has no current task assignment')
        return null
      }
      throw error
    }
  },

  // Leader lấy danh sách phương tiện khả dụng để phân công - USE /Vehicle endpoint instead

  // Thành viên lấy danh sách phương tiện được gán cho task hiện tại
  getMemberVehicles: async () => {
    try {
      console.log('📡 Calling API: GET /rescue-team/my-vehicles')
      const response = await api.get('/rescue-team/my-vehicles')
      console.log('📦 Raw response:', response)
      const data = unwrapApiData(response)
      console.log('📦 Unwrapped data:', data)
      
      if (Array.isArray(data)) {
        const mapped = data.map(vehicle => ({
          id: vehicle.vehicleId ?? vehicle.VehicleId ?? null,
          vehicleId: vehicle.vehicleId ?? vehicle.VehicleId ?? null,
          vehicleCode: vehicle.vehicleCode ?? vehicle.VehicleCode ?? '',
          vehicleName: vehicle.vehicleName ?? vehicle.VehicleName ?? '',
          licensePlate: vehicle.licensePlate ?? vehicle.LicensePlate ?? '',
          vehicleTypeName: vehicle.vehicleTypeName ?? vehicle.VehicleTypeName ?? '',
          status: vehicle.status ?? vehicle.Status ?? 'AVAILABLE',
          capacity: vehicle.capacity ?? vehicle.Capacity ?? 0,
        }))
        console.log('✅ Mapped vehicles:', mapped)
        return mapped
      }
      
      console.log('⚠️ Data is not array:', data)
      return []
    } catch (error) {
      console.error('❌ Get vehicles error:', error?.response?.status, error?.response?.data)
      if (error?.response?.status === 404) {
        console.log('ℹ️ 404: Member has no vehicles assigned')
        return []
      }
      throw error
    }
  },

  // Thành viên xác nhận hoàn tất nhiệm vụ
  confirmMyTask: async () => {
    try {
      const response = await api.put('/rescue-team/my-assignment/confirm')
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Thành viên báo hỗ trợ cho task hiện tại
  requestSupport: async () => {
    try {
      const response = await api.post('/rescue-team/my-assignment/support')
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Leader đặt operation sang trạng thái chờ
  setOperationWaiting: async (operationId) => {
    try {
      const response = await api.put(`/rescue-team/operations/${operationId}/waiting`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // ===== ERROR HANDLERS =====
  getAcceptRejectErrorMessage: (error) => {
    const status = error?.response?.status
    const data = error?.response?.data

    if (status === 400) {
      return data?.message || 'Yêu cầu không ở trạng thái hợp lệ để tiếp nhận/từ chối.'
    }
    if (status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    }
    if (status === 403) {
      return 'Bạn không có quyền thực hiện. Chỉ Đội trưởng mới có quyền.'
    }
    if (status === 404) {
      return 'Không tìm thấy yêu cầu cứu hộ.'
    }
    if (status >= 500) {
      return 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'
    }
    return data?.message || 'Không thể xử lý yêu cầu.'
  },

  getAssignMembersErrorMessage: (error) => {
    const status = error?.response?.status
    const data = error?.response?.data

    if (status === 400) {
      return data?.message || 'Không có thành viên nào có thể được giao việc. Vui lòng kiểm tra lại.'
    }
    if (status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    }
    if (status === 403) {
      return 'Bạn không có quyền. Chỉ Đội trưởng mới có quyền giao việc.'
    }
    if (status === 404) {
      return 'Không tìm thấy yêu cầu hoặc đội cứu hộ.'
    }
    if (status >= 500) {
      return 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'
    }
    return data?.message || 'Không thể giao việc.'
  },

  getConfirmTaskErrorMessage: (error) => {
    const status = error?.response?.status
    const data = error?.response?.data

    if (status === 400) {
      return data?.message || 'Bạn không có nhiệm vụ nào để xác nhận hoặc trạng thái không hợp lệ.'
    }
    if (status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    }
    if (status === 403) {
      return 'Chỉ Thành viên (không phải Đội trưởng) mới có quyền xác nhận nhiệm vụ.'
    }
    if (status === 404) {
      return 'Bạn hiện đang rảnh. Không có nhiệm vụ nào được giao.'
    }
    if (status >= 500) {
      return 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'
    }
    return data?.message || 'Không thể xác nhận nhiệm vụ.'
  },

  // ===== LEADER: Lấy danh sách requests từ coordinator =====
  // Transform request object từ API thành format UI dễ hiển thị
  getTeamAssignedRequests: async () => {
    /**
     * ✅ CORRECT FLOW:
     * 
     * 1. Coordinator verify request WITH team_id → request.Status="Verified", request.TeamId set
     * 2. Leader gọi /rescue-team/my-operations → return Verified + Assigned requests
     * 3. FE map status: Verified/Pending → PENDING, Assigned → ACCEPTED
     * 4. Leader thấy requests + có thể click Chấp Nhận / Giao Việc
     */
    try {
      const response = await api.get('/rescue-team/my-operations')
      const data = unwrapApiData(response)

      if (!Array.isArray(data)) {
        return []
      }

      // Map backend response directly - no need to fetch individual requests
      const enrichedRequests = data.map((item) => {
        const requestId = item.requestId ?? item.RequestId ?? item.request_id ?? item.id ?? item.Id
        
        // Map backend status to frontend status
        const backendStatus = String(item.requestStatus ?? item.RequestStatus ?? item.status ?? item.Status ?? 'Pending').trim()
        let frontendStatus = 'PENDING'
        
        if (backendStatus === 'Verified' || backendStatus === 'Pending' || backendStatus === 'Rejected') {
          frontendStatus = 'PENDING'
        } else if (backendStatus === 'Assigned' || backendStatus === 'Confirmed') {
          frontendStatus = 'ACCEPTED'
        }
        
        return {
          // IDs
          id: item.operationId ?? item.OperationId ?? item.operation_id ?? requestId,
          requestId: requestId,
          operationId: item.operationId ?? item.OperationId ?? item.operation_id,
          
          // User Info
          citizenId: item.citizenId ?? item.CitizenId ?? null,
          updatedBy: item.updatedBy ?? item.UpdatedBy ?? null,
          teamId: item.teamId ?? item.TeamId ?? null,
          teamName: item.teamName ?? item.TeamName ?? 'N/A',
          
          // Request Details
          title: item.requestTitle ?? item.RequestTitle ?? item.title ?? item.Title ?? 'Yêu cầu cứu hộ',
          description: item.requestDescription ?? item.RequestDescription ?? item.description ?? item.Description ?? '',
          status: frontendStatus,
          priority: mapPriorityDisplay(item.priorityName ?? item.PriorityName ?? 'Trung bình'),
          priorityName: item.priorityName ?? item.PriorityName ?? 'Trung bình',
          priorityLevelId: item.priorityLevelId ?? item.PriorityLevelId ?? null,
          
          // Contact Info
          phone: item.requestPhone ?? item.RequestPhone ?? item.phone ?? item.Phone ?? 'N/A',
          contactName: item.contactName ?? item.ContactName ?? 'N/A',
          
          // Location
          address: item.requestAddress ?? item.RequestAddress ?? item.address ?? item.Address ?? 'Không có địa chỉ',
          location: {
            lat: item.latitude ?? item.Latitude ?? 0,
            lng: item.longitude ?? item.Longitude ?? 0,
          },
          
          // Timestamps
          createdAt: item.createdAt ?? item.CreatedAt ?? null,
          updatedAt: item.updatedAt ?? item.UpdatedAt ?? null,
          assignedAt: item.assignedAt ?? item.AssignedAt ?? new Date().toISOString(),
          estimatedTime: item.estimatedTime ?? item.EstimatedTime ?? 'Đang cập nhật',
          
          // People Counts
          adultCount: item.adultCount ?? item.AdultCount ?? 0,
          elderlyCount: item.elderlyCount ?? item.ElderlyCount ?? 0,
          childrenCount: item.childrenCount ?? item.ChildrenCount ?? 0,
          numberOfAffectedPeople: (() => {
            const adultCount = item.adultCount ?? item.AdultCount ?? 0
            const elderlyCount = item.elderlyCount ?? item.ElderlyCount ?? 0
            const childrenCount = item.childrenCount ?? item.ChildrenCount ?? 0
            return (adultCount + elderlyCount + childrenCount)
          })(),
          
          // Vehicles
          vehicles: item.vehicles ?? item.Vehicles ?? [],
          assignedMembers: [],
        }
      })
      
      return enrichedRequests.filter(req => req != null)
    } catch (error) {
      console.error('❌ GetTeamAssignedRequests error:', error)
      throw error
    }
  },

  getTeamAssignedRequestsErrorMessage: (error) => {
    const status = error?.response?.status
    const data = error?.response?.data

    if (status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    }

    if (status === 403) {
      return 'Bạn không có quyền xem danh sách yêu cầu. Chỉ Trưởng đội mới có quyền.'
    }

    if (status >= 500) {
      return 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'
    }

    return data?.message || data?.Message || 'Không thể tải danh sách yêu cầu.'
  },

  // ============================================
  // GET ASSIGNED REQUESTS (NEW ENDPOINT)
  // ============================================
  getAssignedRequests: async () => {
    /**
     * Leader API - Lấy danh sách requests đã được verify + assign cho team
     * Support filter status (optional): ?status=Verified,Assigned
     */
    try {
      const response = await api.get('/rescue-team/assigned-requests')
      const data = unwrapApiData(response)

      if (!Array.isArray(data)) {
        return []
      }

      return data.map((item) => {
        const requestId = item.requestId ?? item.RequestId ?? item.request_id ?? item.id ?? item.Id
        const backendStatus = String(item.status ?? item.Status ?? 'Pending').trim()
        const requestStatus = String(item.requestStatus ?? item.RequestStatus ?? backendStatus).trim()
        const operationStatus = String(
          item.operationStatus ??
            item.OperationStatus ??
            item.currentOperationStatus ??
            item.current_operation_status ??
            backendStatus,
        ).trim()
        
        let frontendStatus = 'PENDING'
        if (normalizeStatusKey(operationStatus) === 'WAITING') {
          frontendStatus = 'WAITING'
        } else if (normalizeStatusKey(operationStatus) === 'COMPLETED') {
          frontendStatus = 'COMPLETED'
        } else if (requestStatus === 'Verified' || requestStatus === 'Pending') {
          frontendStatus = 'PENDING'
        } else if (requestStatus === 'Assigned' || requestStatus === 'Confirmed') {
          frontendStatus = 'ACCEPTED'
        }
        
        return {
          id: requestId,
          requestId: requestId,
          operationId: item.operationId ?? item.OperationId ?? item.operation_id ?? null,
          teamId: item.teamId ?? item.TeamId ?? null,
          teamName: item.teamName ?? item.TeamName ?? 'N/A',
          title: item.title ?? item.Title ?? 'Yêu cầu cứu hộ',
          description: item.description ?? item.Description ?? '',
          status: frontendStatus,
          priority: mapPriorityDisplay(item.priorityName ?? item.PriorityName ?? 'Trung bình'),
          priorityName: item.priorityName ?? item.PriorityName ?? 'Trung bình',
          priorityLevelId: item.priorityLevelId ?? item.PriorityLevelId ?? null,
          phone: item.citizenPhone ?? item.CitizenPhone ?? item.phone ?? item.Phone ?? item.contactPhone ?? item.ContactPhone ?? 'N/A',
          address: item.address ?? item.Address ?? 'Không có địa chỉ',
          latitude: item.latitude ?? item.Latitude ?? 0,
          longitude: item.longitude ?? item.Longitude ?? 0,
          adultCount: item.adultCount ?? item.AdultCount ?? 0,
          elderlyCount: item.elderlyCount ?? item.ElderlyCount ?? 0,
          childrenCount: item.childrenCount ?? item.ChildrenCount ?? 0,
          numberOfAffectedPeople:
            item.numberOfAffectedPeople ??
            item.NumberOfAffectedPeople ??
            ((item.adultCount ?? item.AdultCount ?? 0) +
              (item.elderlyCount ?? item.ElderlyCount ?? 0) +
              (item.childrenCount ?? item.ChildrenCount ?? 0)),
          createdAt: item.createdAt ?? item.CreatedAt ?? null,
          updatedAt: item.updatedAt ?? item.UpdatedAt ?? null,
          rawStatus: requestStatus,
          operationRawStatus: operationStatus,
          hasSupportRequest: Boolean(item.hasSupportRequest ?? item.HasSupportRequest ?? false),
          lastSupportRequestedAt:
            item.lastSupportRequestedAt ?? item.LastSupportRequestedAt ?? null,
        }
      })
    } catch (error) {
      console.error('❌ GetAssignedRequests error:', error)
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
