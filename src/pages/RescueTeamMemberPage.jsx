import React, { useState, useEffect, useRef } from 'react'
import {
  ArrowLeftOnRectangleIcon,
  UserCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  UserGroupIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import LogoutConfirmModal from '../components/LogoutConfirmModal'
import './RescueTeamMemberPage.css'

/*
  RescueTeamMemberPage - Dashboard của Thành Viên Đội Cứu Hộ
  
  Chức năng:
  1. Hiển thị danh sách nhiệm vụ được giao
  2. Thành viên chỉ có thể xem chi tiết nhiệm vụ
  3. Thành viên có thể đánh dấu:
     - Bắt đầu thực hiện (In Progress)
     - Hoàn thành (Completed)
     - Thất bại (Failed)
  4. Timeline trạng thái nhiệm vụ
*/

const ROLE_LABEL_MAP = {
  RESCUE_TEAM_MEMBER: 'Thành Viên Đội Cứu Hộ',
  RESCUE_TEAM: 'Đội cứu hộ',
  RESCUE_TEAM_LEADER: 'Trưởng Đội Cứu Hộ',
  COORDINATOR: 'Điều phối viên',
  MANAGER: 'Quản lý',
  ADMIN: 'Quản trị viên',
  CITIZEN: 'Công dân',
}

const TASK_STATUS_MAP = {
  ASSIGNED: { label: 'Được Giao', className: 'status-assigned', color: '#3b82f6' },
  IN_PROGRESS: { label: 'Đang Thực Hiện', className: 'status-in-progress', color: '#f59e0b' },
  COMPLETED: { label: 'Hoàn Tất', className: 'status-completed', color: '#10b981' },
  FAILED: { label: 'Thất Bại', className: 'status-failed', color: '#ef4444' },
}

const PRIORITY_MAP = {
  URGENT: { label: 'Khẩn Cấp', className: 'priority-urgent' },
  HIGH: { label: 'Cao', className: 'priority-high' },
  MEDIUM: { label: 'Trung Bình', className: 'priority-medium' },
  LOW: { label: 'Thấp', className: 'priority-low' },
}

function RescueTeamMemberPage() {
  const [currentUser, setCurrentUser] = useState(() => authService.getUserInfo())
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [filterStatus, setFilterStatus] = useState('ACTIVE')
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [finishReason, setFinishReason] = useState('COMPLETED')

  // TODO: REMOVE MOCK DATA - Fetch từ API: GET /api/rescue-team/my-tasks
  const [tasks, setTasks] = useState([])

  const userMenuRef = useRef(null)
  const roleLabel = ROLE_LABEL_MAP[currentUser?.role?.toUpperCase()] || currentUser?.role || 'Không xác định'

  // Kiểm tra quyền
  const isTeamMember =
    currentUser?.role?.toUpperCase() === 'RESCUE_TEAM_MEMBER' ||
    currentUser?.role?.toUpperCase() === 'RESCUE_TEAM'

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
  //   const fetchTasks = async () => {
  //     try {
  //       // const tasksRes = await api.get('/api/rescue-team/my-tasks')
  //       // setTasks(tasksRes.data)
  //     } catch (error) {
  //       console.error('Error fetching tasks:', error)
  //     }
  //   }
  //   fetchTasks()
  // }, [])

  const handleToggleUserMenu = () => {
    setShowUserMenu(!showUserMenu)
  }

  const handleLogout = () => {
    authService.logout()
    window.location.href = '/'
  }

  const getActiveTasks = () => {
    return tasks.filter((task) => task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS')
  }

  const getCompletedTasks = () => {
    return tasks.filter((task) => task.status === 'COMPLETED' || task.status === 'FAILED')
  }

  const displayTasks = filterStatus === 'ACTIVE' ? getActiveTasks() : getCompletedTasks()

  const handleStartTask = (task) => {
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status: 'IN_PROGRESS', startedAt: new Date().toISOString() } : t)))
    setSelectedTask(null)
  }

  const handleFinishTask = (task, reason) => {
    const newTimeline = [
      ...task.timeline,
      {
        time: new Date().toISOString(),
        status: reason,
        message: reason === 'COMPLETED' ? 'Hoàn tất nhiệm vụ' : 'Gặp lỗi/thất bại',
      },
    ]

    setTasks(
      tasks.map((t) =>
        t.id === task.id
          ? { ...t, status: reason, completedAt: new Date().toISOString(), timeline: newTimeline }
          : t,
      ),
    )

    setSelectedTask(null)
    setShowFinishModal(false)
    setFinishReason('COMPLETED')
  }

  const getStatusInfo = (status) => TASK_STATUS_MAP[status] || TASK_STATUS_MAP['ASSIGNED']
  const getPriorityInfo = (priority) => PRIORITY_MAP[priority] || PRIORITY_MAP['MEDIUM']

  const formatTime = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('vi-VN')
  }

  const getTimeElapsed = (startedAt, completedAt) => {
    if (!startedAt) return '-'
    const end = completedAt ? new Date(completedAt) : new Date()
    const start = new Date(startedAt)
    const minutes = Math.round((end - start) / 60000)
    if (minutes < 60) return `${minutes} phút`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}p`
  }

  return (
    <div className="rescue-team-member-page">
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
      <div className="rtmp-content">
        {!isTeamMember ? (
          <div className="rtmp-error-container">
            <ExclamationCircleIcon className="rtmp-error-icon" />
            <h2>Truy cập bị từ chối</h2>
            <p>Chỉ thành viên đội cứu hộ mới có thể xem trang này.</p>
          </div>
        ) : (
          <>
            {/* Status Tabs */}
            <div className="rtmp-tabs">
              <button
                className={`rtmp-tab ${filterStatus === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => setFilterStatus('ACTIVE')}
              >
                <CheckCircleIcon />
                Đang Thực Hiện ({getActiveTasks().length})
              </button>
              <button
                className={`rtmp-tab ${filterStatus === 'HISTORY' ? 'active' : ''}`}
                onClick={() => setFilterStatus('HISTORY')}
              >
                <CheckIcon />
                Lịch Sử ({getCompletedTasks().length})
              </button>
            </div>

            {/* Tasks List */}
            <div className="rtmp-tasks-list">
              {displayTasks.length === 0 ? (
                <div className="rtmp-empty-state">
                  <ExclamationCircleIcon />
                  <p>
                    {filterStatus === 'ACTIVE'
                      ? 'Hiện tại bạn không có nhiệm vụ nào'
                      : 'Bạn chưa hoàn tất nhiệm vụ nào'}
                  </p>
                </div>
              ) : (
                displayTasks.map((task) => {
                  const statusInfo = getStatusInfo(task.status)
                  const priorityInfo = getPriorityInfo(task.priority)

                  return (
                    <div
                      key={task.id}
                      className={`rtmp-task-card ${statusInfo.className} ${
                        selectedTask?.id === task.id ? 'expanded' : ''
                      }`}
                      onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                    >
                      <div className="rtmp-card-header">
                        <div className="rtmp-card-title-section">
                          <div className={`rtmp-priority-badge ${priorityInfo.className}`}>
                            {priorityInfo.label}
                          </div>
                          <div className="rtmp-task-id">#{task.requestId}</div>
                          <div className={`rtmp-status-badge ${statusInfo.className}`}>
                            {statusInfo.label}
                          </div>
                        </div>
                      </div>

                      <div className="rtmp-card-body">
                        <div className="rtmp-quick-info">
                          <div className="rtmp-info-item">
                            <MapPinIcon />
                            <div className="rtmp-info-text">
                              <label>Địa Chỉ</label>
                              <p>{task.address}</p>
                            </div>
                          </div>

                          <div className="rtmp-info-item">
                            <PhoneIcon />
                            <div className="rtmp-info-text">
                              <label>Liên Hệ</label>
                              <a href={`tel:${task.phone}`}>{task.phone}</a>
                            </div>
                          </div>

                          <div className="rtmp-info-item">
                            <UserGroupIcon />
                            <div className="rtmp-info-text">
                              <label>Số Người</label>
                              <p>{task.totalPeople} người</p>
                            </div>
                          </div>
                        </div>

                        {selectedTask?.id === task.id && (
                          <div className="rtmp-card-details">
                            <div className="rtmp-details-section">
                              <h4>Mô Tả Nhiệm Vụ</h4>
                              <p>{task.description}</p>
                            </div>

                            <div className="rtmp-details-section">
                              <h4>Ghi Chú</h4>
                              <p>{task.notes || '-'}</p>
                            </div>

                            <div className="rtmp-details-grid">
                              <div className="rtmp-detail-item">
                                <label>Người Già</label>
                                <p>{task.elderly} người</p>
                              </div>
                              <div className="rtmp-detail-item">
                                <label>Trẻ Em</label>
                                <p>{task.children} người</p>
                              </div>
                              <div className="rtmp-detail-item">
                                <label>Trưởng Đội</label>
                                <p>{task.leaderName}</p>
                              </div>
                              <div className="rtmp-detail-item">
                                <label>Thời Gian Thực Hiện</label>
                                <p>{getTimeElapsed(task.startedAt, task.completedAt)}</p>
                              </div>
                            </div>

                            {/* Timeline */}
                            <div className="rtmp-timeline">
                              <h4>Lịch Sử Trạng Thái</h4>
                              <div className="rtmp-timeline-items">
                                {task.timeline.map((event, idx) => (
                                  <div key={idx} className="rtmp-timeline-item">
                                    <div className="rtmp-timeline-dot"></div>
                                    <div className="rtmp-timeline-content">
                                      <div className="rtmp-timeline-time">{formatTime(event.time)}</div>
                                      <div className="rtmp-timeline-message">{event.message}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Actions */}
                            {task.status === 'ASSIGNED' && (
                              <div className="rtmp-card-actions">
                                <button
                                  className="rtmp-btn rtmp-btn-start"
                                  onClick={() => handleStartTask(task)}
                                >
                                  <CheckCircleIcon />
                                  Bắt Đầu Thực Hiện
                                </button>
                              </div>
                            )}

                            {task.status === 'IN_PROGRESS' && (
                              <div className="rtmp-card-actions">
                                <button
                                  className="rtmp-btn rtmp-btn-complete"
                                  onClick={() => {
                                    setFinishReason('COMPLETED')
                                    setShowFinishModal(true)
                                  }}
                                >
                                  <CheckIcon />
                                  Đã Hoàn Tất
                                </button>
                                <button
                                  className="rtmp-btn rtmp-btn-failed"
                                  onClick={() => {
                                    setFinishReason('FAILED')
                                    setShowFinishModal(true)
                                  }}
                                >
                                  <XMarkIcon />
                                  Thất Bại / Hủy
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Finish Task Modal */}
      {showFinishModal && selectedTask && (
        <div className="rtmp-modal-overlay" onClick={() => setShowFinishModal(false)}>
          <div className="rtmp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rtmp-modal-header">
              <h3>
                {finishReason === 'COMPLETED' ? 'Xác Nhận Hoàn Tất' : 'Xác Nhận Thất Bại'}
              </h3>
              <button className="rtmp-modal-close" onClick={() => setShowFinishModal(false)}>
                ✕
              </button>
            </div>

            <div className="rtmp-modal-body">
              <div className="rtmp-modal-content">
                <p>
                  <strong>Yêu Cầu:</strong> {selectedTask.requestId}
                </p>
                <p>
                  <strong>Địa Chỉ:</strong> {selectedTask.address}
                </p>
                <p className="rtmp-confirm-message">
                  {finishReason === 'COMPLETED'
                    ? 'Bạn có chắc chắn hoàn tất nhiệm vụ này?'
                    : 'Vui lòng xác nhận rằng nhiệm vụ này không thể hoàn tất.'}
                </p>
              </div>

              <div className="rtmp-modal-actions">
                <button
                  className="rtmp-btn rtmp-btn-cancel"
                  onClick={() => setShowFinishModal(false)}
                >
                  Hủy
                </button>
                <button
                  className={`rtmp-btn ${finishReason === 'COMPLETED' ? 'rtmp-btn-complete' : 'rtmp-btn-failed'}`}
                  onClick={() => handleFinishTask(selectedTask, finishReason)}
                >
                  {finishReason === 'COMPLETED' ? 'Xác Nhận Hoàn Tát' : 'Xác Nhận Thất Bại'}
                </button>
              </div>
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

export default RescueTeamMemberPage
