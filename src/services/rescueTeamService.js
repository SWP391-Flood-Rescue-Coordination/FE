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
  assignTaskToMembers: async (requestId, userIds) => {
    try {
      const response = await api.post('/rescue-team/members/assign-task', {
        userIds: Array.isArray(userIds) ? userIds : [userIds],
        requestId: Number(requestId),
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Leader xem danh sách thành viên trong đội (hỗ trợ tìm kiếm)
  getTeamMembers: async (search = '') => {
    try {
      const params = search ? { search } : {}
      const response = await api.get('/rescue-team/members', { params })
      const data = unwrapApiData(response)
      console.log('🔍 Team members API response:', data)
      if (data?.[0]) {
        console.log('🔍 First member structure:', Object.keys(data[0]))
        console.log('🔍 First member data:', data[0])
      }
      
      // Normalize member data to have consistent field names
      // Filter out leaders (only show actual team members)
      if (Array.isArray(data)) {
        return data
          .filter((member) => {
            // Exclude leaders - filter by username pattern
            const userName = (member.userName ?? member.UserName ?? member.username ?? '').toLowerCase()
            return !userName.includes('leader')
          })
          .map((member) => ({
            id: member.id ?? member.Id ?? member.userId ?? member.UserId ?? null,
            name: member.name ?? member.Name ?? member.userName ?? member.UserName ?? member.fullName ?? member.FullName ?? member.displayName ?? member.DisplayName ?? 'N/A',
            userName: member.userName ?? member.UserName ?? member.name ?? member.Name ?? 'N/A',
            email: member.email ?? member.Email ?? 'N/A',
            phone: member.phone ?? member.Phone ?? member.phoneNumber ?? member.PhoneNumber ?? 'N/A',
            address: member.address ?? member.Address ?? 'N/A',
          }))
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
      const response = await api.get('/rescue-team/my-assignment')
      const data = unwrapApiData(response)
      if (data && typeof data === 'object') {
        return transformOperationToMission(data)
      }
      return null
    } catch (error) {
      // Don't log 404 as it's expected when member has no assignment
      if (error?.response?.status !== 404) {
        console.warn('⚠️ getMyAssignment error:', error)
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
     * Lấy danh sách requests được coordinator gán cho team
     * Dùng để leader xem và phân công cho members
     * 
     * NOTE: Không dùng /RescueRequest (Coordinator role)
     * Dùng /rescue-team/my-operations là operations đã được assign từ coordinator
     * Status: "Assigned" = Coordinator gán, chờ leader phân công
     */
    try {
      // Lấy my-operations, filter những cái ở status Assigned
      const response = await api.get('/rescue-team/my-operations')
      const data = unwrapApiData(response)
      console.log('🔍 API /rescue-team/my-operations response:', data)
      if (data?.[0]) {
        console.log('🔍 First item structure:', Object.keys(data[0]))
        console.log('🔍 First item data:', data[0])
        console.log('🔍 phone fields check:', {
          phone: data[0].phone,
          Phone: data[0].Phone,
          contactPhone: data[0].contactPhone,
          ContactPhone: data[0].ContactPhone,
          contact_phone: data[0].contact_phone,
          request_phone: data[0].request_phone,
          RequestPhone: data[0].RequestPhone
        })
        console.log('🔍 count fields check:', {
          adultCount: data[0].adultCount,
          AdultCount: data[0].AdultCount,
          adult_count: data[0].adult_count,
          elderlyCount: data[0].elderlyCount,
          ElderlyCount: data[0].ElderlyCount,
          elderly_count: data[0].elderly_count,
          childrenCount: data[0].childrenCount,
          ChildrenCount: data[0].ChildrenCount,
          children_count: data[0].children_count,
          numberOfAffectedPeople: data[0].numberOfAffectedPeople,
          NumberOfAffectedPeople: data[0].NumberOfAffectedPeople,
          number_of_affected_people: data[0].number_of_affected_people
        })
      }

      if (Array.isArray(data)) {
        // Filter chỉ những requests ở trạng thái "Assigned" (chưa phân công members)
        const filtered = data.filter((op) => {
          const status = String(op.requestStatus ?? op.RequestStatus ?? op.status ?? op.Status ?? '').trim()
          return status === 'Assigned' || status === 'Verified'
        })

        // Fetch full request details for each to get count fields
        const enrichedRequests = await Promise.all(
          filtered.map(async (req) => {
            const requestId = req.requestId ?? req.RequestId ?? req.request_id ?? req.id ?? req.Id
            try {
              const fullReqResponse = await api.get(`/RescueRequest/${requestId}`)
              const fullReq = unwrapApiData(fullReqResponse)
              console.log(`🔍 Full request details for ${requestId}:`, fullReq)
              
              return {
                // IDs
                id: req.id ?? req.Id ?? req.requestId ?? req.RequestId ?? req.operationId ?? req.OperationId,
                requestId: requestId,
                operationId: req.operationId ?? req.OperationId ?? req.operation_id,
                
                // User Info
                citizenId: req.citizenId ?? req.CitizenId ?? req.citizen_id ?? fullReq?.citizenId ?? null,
                updatedBy: req.updatedBy ?? req.UpdatedBy ?? req.updated_by ?? fullReq?.updatedBy ?? null,
                teamId: req.teamId ?? req.TeamId ?? req.team_id ?? null,
                teamName: req.teamName ?? req.TeamName ?? req.team_name ?? 'N/A',
                
                // Request Details
                title: req.title ?? req.Title ?? req.requestTitle ?? req.RequestTitle ?? fullReq?.title ?? 'Yêu cầu cứu hộ',
                description: req.description ?? req.Description ?? req.requestDescription ?? req.RequestDescription ?? fullReq?.description ?? '',
                status: req.requestStatus ?? req.RequestStatus ?? req.status ?? req.Status ?? 'Assigned',
                priority: mapPriorityDisplay(req.priorityName ?? req.PriorityName ?? req.priority_name ?? 'Trung bình'),
                priorityName: req.priorityName ?? req.PriorityName ?? req.priority_name ?? 'Trung bình',
                priorityLevelId: req.priorityLevelId ?? req.PriorityLevelId ?? req.priority_level_id ?? null,
                
                // Contact Info
                phone: req.requestPhone ?? req.RequestPhone ?? req.phone ?? req.Phone ?? req.contactPhone ?? req.ContactPhone ?? req.contact_phone ?? req.request_phone ?? fullReq?.phone ?? fullReq?.contactPhone ?? 'N/A',
                contactName: req.contactName ?? req.ContactName ?? req.contact_name ?? fullReq?.contactName ?? 'N/A',
                
                // Location
                address: req.address ?? req.Address ?? req.requestAddress ?? req.RequestAddress ?? req.request_address ?? fullReq?.address ?? 'Không có địa chỉ',
                location: {
                  lat: req.latitude ?? req.Latitude ?? req.requestLatitude ?? req.RequestLatitude ?? req.request_latitude ?? fullReq?.latitude ?? 0,
                  lng: req.longitude ?? req.Longitude ?? req.requestLongitude ?? req.RequestLongitude ?? req.request_longitude ?? fullReq?.longitude ?? 0,
                },
                
                // Timestamps
                createdAt: req.createdAt ?? req.CreatedAt ?? req.created_at ?? fullReq?.createdAt ?? null,
                updatedAt: req.updatedAt ?? req.UpdatedAt ?? req.updated_at ?? fullReq?.updatedAt ?? null,
                assignedAt: req.assignedAt ?? req.AssignedAt ?? req.assigned_at ?? new Date().toISOString(),
                estimatedTime: req.estimatedTime ?? req.EstimatedTime ?? req.estimated_time ?? fullReq?.estimatedTime ?? 'Đang cập nhật',
                
                // People Counts - FROM FULL REQUEST DETAILS
                adultCount: fullReq?.adultCount ?? fullReq?.AdultCount ?? fullReq?.adult_count ?? 0,
                elderlyCount: fullReq?.elderlyCount ?? fullReq?.ElderlyCount ?? fullReq?.elderly_count ?? 0,
                childrenCount: fullReq?.childrenCount ?? fullReq?.ChildrenCount ?? fullReq?.children_count ?? 0,
                numberOfAffectedPeople: (() => {
                  const adultCount = fullReq?.adultCount ?? fullReq?.AdultCount ?? fullReq?.adult_count ?? 0
                  const elderlyCount = fullReq?.elderlyCount ?? fullReq?.ElderlyCount ?? fullReq?.elderly_count ?? 0
                  const childrenCount = fullReq?.childrenCount ?? fullReq?.ChildrenCount ?? fullReq?.children_count ?? 0
                  const total = fullReq?.numberOfAffectedPeople ?? fullReq?.NumberOfAffectedPeople ?? fullReq?.number_of_affected_people
                  // If total not provided or is 0, calculate from individual counts
                  return (total && total > 0) ? total : (adultCount + elderlyCount + childrenCount)
                })(),
              }
            } catch (err) {
              console.warn(`⚠️ Failed to fetch full request details for ${requestId}:`, err)
              // Fallback to operation data if full request fetch fails
              return {
                id: req.id ?? req.Id ?? req.requestId ?? req.RequestId ?? req.operationId ?? req.OperationId,
                requestId: requestId,
                operationId: req.operationId ?? req.OperationId ?? req.operation_id,
                citizenId: req.citizenId ?? req.CitizenId ?? req.citizen_id ?? null,
                updatedBy: req.updatedBy ?? req.UpdatedBy ?? req.updated_by ?? null,
                teamId: req.teamId ?? req.TeamId ?? req.team_id ?? null,
                teamName: req.teamName ?? req.TeamName ?? req.team_name ?? 'N/A',
                title: req.title ?? req.Title ?? req.requestTitle ?? req.RequestTitle ?? 'Yêu cầu cứu hộ',
                description: req.description ?? req.Description ?? req.requestDescription ?? req.RequestDescription ?? '',
                status: req.requestStatus ?? req.RequestStatus ?? req.status ?? req.Status ?? 'Assigned',
                priority: mapPriorityDisplay(req.priorityName ?? req.PriorityName ?? req.priority_name ?? 'Trung bình'),
                priorityName: req.priorityName ?? req.PriorityName ?? req.priority_name ?? 'Trung bình',
                priorityLevelId: req.priorityLevelId ?? req.PriorityLevelId ?? req.priority_level_id ?? null,
                phone: req.requestPhone ?? req.RequestPhone ?? req.phone ?? req.Phone ?? req.contactPhone ?? req.ContactPhone ?? req.contact_phone ?? req.request_phone ?? 'N/A',
                contactName: req.contactName ?? req.ContactName ?? req.contact_name ?? 'N/A',
                address: req.address ?? req.Address ?? req.requestAddress ?? req.RequestAddress ?? req.request_address ?? 'Không có địa chỉ',
                location: {
                  lat: req.latitude ?? req.Latitude ?? req.requestLatitude ?? req.RequestLatitude ?? req.request_latitude ?? 0,
                  lng: req.longitude ?? req.Longitude ?? req.requestLongitude ?? req.RequestLongitude ?? req.request_longitude ?? 0,
                },
                createdAt: req.createdAt ?? req.CreatedAt ?? req.created_at ?? null,
                updatedAt: req.updatedAt ?? req.UpdatedAt ?? req.updated_at ?? null,
                assignedAt: req.assignedAt ?? req.AssignedAt ?? req.assigned_at ?? new Date().toISOString(),
                estimatedTime: req.estimatedTime ?? req.EstimatedTime ?? req.estimated_time ?? 'Đang cập nhật',
                adultCount: 0,
                elderlyCount: 0,
                childrenCount: 0,
                numberOfAffectedPeople: 0,
              }
            }
          })
        )

        return enrichedRequests
      }

      return []
    } catch (error) {

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

  getOperationsErrorMessage,
  getUpdateStatusErrorMessage,
  normalizeStatus,
  mapStatusDisplay,
  mapPriorityDisplay,
  transformOperationToMission,
}

export default rescueTeamService
