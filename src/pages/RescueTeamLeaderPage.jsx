import React, { useState, useEffect, useRef } from 'react'
import {
  ArrowLeftOnRectangleIcon,
  UserCircleIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import LogoutConfirmModal from '../components/LogoutConfirmModal'
import './RescueTeamLeaderPage.css'

/*
  RescueTeamLeaderPage - Dashboard của Trưởng Đội Cứu Hộ
  
  Chức năng:
  1. Hiển thị danh sách các request được coordinator gán cho đội
  2. Trưởng đội có thể accept hoặc reject request
  3. Trưởng đội có thể gán request cho từng thành viên
  4. Hiển thị chi tiết request (địa chỉ, số người, mô tả, tính cấp bách)
  
  Status flow: 
  - PENDING (mới gán từ coordinator)
  - ACCEPTED (trưởng đội đã chấp nhận)
  - REJECTED (trưởng đội từ chối)
  - In Progress (team đang thực hiện)
  - Completed (hoàn tất)
*/

const ROLE_LABEL_MAP = {
  RESCUE_TEAM_LEADER: 'Trưởng Đội Cứu Hộ',
  RESCUE_TEAM: 'Đội cứu hộ',
  COORDINATOR: 'Điều phối viên',
  MANAGER: 'Quản lý',
  ADMIN: 'Quản trị viên',
  CITIZEN: 'Công dân',
}

const REQUEST_STATUS_MAP = {
  PENDING: { label: 'Chờ Chấp Nhận', className: 'status-pending', color: '#f59e0b' },
  ACCEPTED: { label: 'Đã Chấp Nhận', className: 'status-accepted', color: '#10b981' },
  REJECTED: { label: 'Bị Từ Chối', className: 'status-rejected', color: '#ef4444' },
  IN_PROGRESS: { label: 'Đang Thực Hiện', className: 'status-in-progress', color: '#3b82f6' },
  COMPLETED: { label: 'Hoàn Tất', className: 'status-completed', color: '#059669' },
}

const PRIORITY_MAP = {
  URGENT: { label: 'Khẩn Cấp', className: 'priority-urgent' },
  HIGH: { label: 'Cao', className: 'priority-high' },
  MEDIUM: { label: 'Trung Bình', className: 'priority-medium' },
  LOW: { label: 'Thấp', className: 'priority-low' },
}

function RescueTeamLeaderPage() {
  const [currentUser, setCurrentUser] = useState(() => authService.getUserInfo())
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [sortBy, setSortBy] = useState('priority')

  // TODO: REMOVE MOCK DATA - Fetch từ API: GET /api/rescue-requests
  const [requests, setRequests] = useState([])

  // TODO: REMOVE MOCK DATA - Fetch từ API: GET /api/rescue-team/members
  const [teamMembers, setTeamMembers] = useState([])

  const userMenuRef = useRef(null)
  const roleLabel = ROLE_LABEL_MAP[currentUser?.role?.toUpperCase()] || currentUser?.role || 'Không xác định'

  // Kiểm tra quyền
  const isTeamLeader = currentUser?.role?.toUpperCase() === 'RESCUE_TEAM_LEADER'

  // Close user menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // TODO: FETCH DATA FROM API - Thêm API calls khi backend sẵn sàng
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       // const requestsRes = await api.get('/api/rescue-requests')
  //       // setRequests(requestsRes.data)
  //       
  //       // const membersRes = await api.get('/api/rescue-team/members')
  //       // setTeamMembers(membersRes.data)
  //     } catch (error) {
  //       console.error('Error fetching requests and members:', error)
  //     }
  //   }
  //   fetchData()
  // }, [])

  const handleToggleUserMenu = () => {
    setShowUserMenu(!showUserMenu)
  }

  const handleLogout = () => {
    authService.logout()
    window.location.href = '/'
  }

  const filteredRequests = requests.filter((req) => {
    if (filterStatus === 'ALL') return true
    return req.status === filterStatus
  })

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99)
    } else if (sortBy === 'time') {
      return new Date(b.assignedAt) - new Date(a.assignedAt)
    }
    return 0
  })

  const getStatusInfo = (status) => REQUEST_STATUS_MAP[status] || REQUEST_STATUS_MAP['PENDING']
  const getPriorityInfo = (priority) => PRIORITY_MAP[priority] || PRIORITY_MAP['MEDIUM']

  const handleAccept = (request) => {
    setSelectedRequest(request)
    setShowAssignModal(true)
  }

  const handleReject = (requestId) => {
    setRequests(requests.map((req) => (req.id === requestId ? { ...req, status: 'REJECTED' } : req)))
    setSelectedRequest(null)
  }

  const handleAssignMembers = (memberIds) => {
    if (selectedRequest) {
      setRequests(
        requests.map((req) =>
          req.id === selectedRequest.id
            ? { ...req, status: 'ACCEPTED', assignedMembers: memberIds }
            : req,
        ),
      )
      setShowAssignModal(false)
      setSelectedRequest(null)
    }
  }

  const getAssignedMemberNames = (memberIds) => {
    return memberIds
      .map((id) => teamMembers.find((m) => m.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  return (
    <div className="rescue-team-leader-page">
      {/* ===== HEADER ===== */}
      <header className="rescue-header">
        <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>
        <div className="rescue-header-actions">
          <div className="rescue-user-group" ref={userMenuRef}>
            <button
              type="button"
              className="rescue-icon-button"
              onClick={handleToggleUserMenu}
              aria-label="Thông tin người dùng"
            >
              <UserCircleIcon className="rescue-header-icon" />
            </button>
            <button
              type="button"
              className="rescue-icon-button logout"
              onClick={handleLogout}
              aria-label="Đăng xuất"
            >
              <ArrowLeftOnRectangleIcon className="rescue-header-icon" />
            </button>

            {showUserMenu && (
              <div className="rescue-user-menu">
                <h3>Thông tin tài khoản</h3>
                <div className="rescue-user-row">
                  <span>Tên tài khoản</span>
                  <strong>{currentUser?.username || '-'}</strong>
                </div>
                <div className="rescue-user-row">
                  <span>Họ tên</span>
                  <strong>{currentUser?.fullName || '-'}</strong>
                </div>
                <div className="rescue-user-row">
                  <span>Email</span>
                  <strong>{currentUser?.email || '-'}</strong>
                </div>
                <div className="rescue-user-row">
                  <span>Vai trò</span>
                  <strong>{roleLabel}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="rtlp-content">
        {!isTeamLeader ? (
          <div className="rtlp-error-container">
            <ExclamationTriangleIcon className="rtlp-error-icon" />
            <h2>Truy cập bị từ chối</h2>
            <p>Chỉ trưởng đội cứu hộ mới có thể xem trang này.</p>
          </div>
        ) : (
          <>
            {/* Filters & Sort */}
            <div className="rtlp-controls">
              <div className="rtlp-filter-group">
                <label>Trạng Thái:</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="ALL">Tất Cả</option>
                  <option value="PENDING">Chờ Chấp Nhận</option>
                  <option value="ACCEPTED">Đã Chấp Nhận</option>
                  <option value="REJECTED">Bị Từ Chối</option>
                  <option value="IN_PROGRESS">Đang Thực Hiện</option>
                  <option value="COMPLETED">Hoàn Tát</option>
                </select>
              </div>

              <div className="rtlp-sort-group">
                <label>Sắp Xếp:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="priority">Độ Ưu Tiên</option>
                  <option value="time">Thời Gian (Mới Nhất)</option>
                </select>
              </div>
            </div>

            {/* Requests List */}
            <div className="rtlp-requests-list">
              {sortedRequests.length === 0 ? (
                <div className="rtlp-empty-state">
                  <ExclamationTriangleIcon />
                  <p>Không có yêu cầu cứu hộ nào</p>
                </div>
              ) : (
                sortedRequests.map((request) => {
                  const statusInfo = getStatusInfo(request.status)
                  const priorityInfo = getPriorityInfo(request.priority)

                  return (
                    <div key={request.id} className={`rtlp-request-card ${statusInfo.className}`}>
                      <div className="rtlp-card-header">
                        <div className="rtlp-card-title-section">
                          <div className={`rtlp-priority-badge ${priorityInfo.className}`}>
                            {priorityInfo.label}
                          </div>
                          <div className="rtlp-request-id">#{request.requestId}</div>
                          <div className={`rtlp-status-badge ${statusInfo.className}`}>
                            {statusInfo.label}
                          </div>
                        </div>
                        <div className="rtlp-time-info">
                          <ClockIcon />
                          <span>{request.estimatedTime}</span>
                        </div>
                      </div>

                      <div className="rtlp-card-body">
                        {/* Location */}
                        <div className="rtlp-info-row">
                          <MapPinIcon className="rtlp-info-icon" />
                          <div className="rtlp-info-content">
                            <label>Địa Chỉ</label>
                            <p>{request.address}</p>
                          </div>
                        </div>

                        {/* Phone */}
                        <div className="rtlp-info-row">
                          <PhoneIcon className="rtlp-info-icon" />
                          <div className="rtlp-info-content">
                            <label>Liên Hệ</label>
                            <a href={`tel:${request.phone}`}>{request.phone}</a>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="rtlp-info-row">
                          <div className="rtlp-info-icon">
                            <ExclamationTriangleIcon />
                          </div>
                          <div className="rtlp-info-content">
                            <label>Mô Tả</label>
                            <p>{request.description}</p>
                          </div>
                        </div>

                        {/* People Info */}
                        <div className="rtlp-info-row">
                          <UserGroupIcon className="rtlp-info-icon" />
                          <div className="rtlp-info-content">
                            <label>Số Người</label>
                            <p>
                              Tổng: <strong>{request.totalPeople}</strong> | Người già:{' '}
                              <strong>{request.elderly}</strong> | Trẻ em: <strong>{request.children}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Assigned Members */}
                        {request.assignedMembers.length > 0 && (
                          <div className="rtlp-info-row">
                            <UserGroupIcon className="rtlp-info-icon" />
                            <div className="rtlp-info-content">
                              <label>Thành Viên Được Giao</label>
                              <p>{getAssignedMemberNames(request.assignedMembers)}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {request.status === 'PENDING' && (
                        <div className="rtlp-card-actions">
                          <button
                            className="rtlp-btn rtlp-btn-accept"
                            onClick={() => handleAccept(request)}
                          >
                            <CheckIcon />
                            Chấp Nhận & Giao Việc
                          </button>
                          <button
                            className="rtlp-btn rtlp-btn-reject"
                            onClick={() => handleReject(request.id)}
                          >
                            <XMarkIcon />
                            Từ Chối
                          </button>
                        </div>
                      )}

                      {request.status === 'ACCEPTED' && (
                        <div className="rtlp-card-accepted">
                          <CheckIcon />
                          <span>Đã giao cho: {getAssignedMemberNames(request.assignedMembers)}</span>
                        </div>
                      )}

                      {request.status === 'REJECTED' && (
                        <div className="rtlp-card-rejected">
                          <XMarkIcon />
                          <span>Yêu cầu này đã bị từ chối</span>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Assign Members Modal */}
      {showAssignModal && selectedRequest && (
        <div className="rtlp-modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="rtlp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rtlp-modal-header">
              <h3>Giao Việc Cho Thành Viên</h3>
              <button className="rtlp-modal-close" onClick={() => setShowAssignModal(false)}>
                ✕
              </button>
            </div>

            <div className="rtlp-modal-body">
              <div className="rtlp-modal-request-info">
                <p>
                  <strong>Yêu Cầu:</strong> {selectedRequest.requestId}
                </p>
                <p>
                  <strong>Địa Chỉ:</strong> {selectedRequest.address}
                </p>
              </div>

              <AssignMembersForm
                teamMembers={teamMembers}
                onAssign={handleAssignMembers}
                onCancel={() => setShowAssignModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <LogoutConfirmModal
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </div>
  )
}

// Component con: Form giao việc
function AssignMembersForm({ teamMembers, onAssign, onCancel }) {
  const [selectedMembers, setSelectedMembers] = useState([])

  const handleToggleMember = (memberId) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedMembers.length === 0) {
      alert('Vui lòng chọn ít nhất một thành viên')
      return
    }
    onAssign(selectedMembers)
  }

  return (
    <form onSubmit={handleSubmit} className="rtlp-assign-form">
      <div className="rtlp-members-checkbox-group">
        {teamMembers.map((member) => (
          <label key={member.id} className="rtlp-checkbox-item">
            <input
              type="checkbox"
              checked={selectedMembers.includes(member.id)}
              onChange={() => handleToggleMember(member.id)}
            />
            <div className="rtlp-checkbox-content">
              <div className="rtlp-member-name">{member.name}</div>
              <div className="rtlp-member-phone">{member.phone}</div>
              <div className={`rtlp-member-status ${member.status.toLowerCase()}`}>{member.status}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="rtlp-form-actions">
        <button type="button" className="rtlp-btn rtlp-btn-cancel" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="rtlp-btn rtlp-btn-submit">
          Giao ({selectedMembers.length})
        </button>
      </div>
    </form>
  )
}

export default RescueTeamLeaderPage
