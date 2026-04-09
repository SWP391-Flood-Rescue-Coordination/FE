import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
  UsersIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import rescueTeamService from '../services/rescueTeamService'
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
  IN_PROGRESS: { label: '\u0110ang Th\u1ef1c Hi\u1ec7n', className: 'status-in-progress', color: '#f59e0b' },
  WAITING: { label: '\u0043h\u1edd \u0058\u00e1c \u004eh\u1eadn', className: 'status-in-progress', color: '#f59e0b' },
  COMPLETED: { label: 'Hoàn Tất', className: 'status-completed', color: '#10b981' },
  FAILED: { label: 'Thất Bại', className: 'status-failed', color: '#ef4444' },
}

const PRIORITY_MAP = {
  URGENT: { label: 'Khẩn Cấp', className: 'priority-urgent' },
  HIGH: { label: 'Cao', className: 'priority-high' },
  MEDIUM: { label: 'Trung Bình', className: 'priority-medium' },
  LOW: { label: 'Thấp', className: 'priority-low' },
}

const normalizeTaskStatus = (task) => {
  const status = task?.status || task?.Status || task?.operationStatus || task?.OperationStatus || ''
  return String(status).trim().toUpperCase()
}

function RescueTeamMemberPage() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(() => authService.getUserInfo())
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [filterStatus, setFilterStatus] = useState('HISTORY')
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [finishReason, setFinishReason] = useState('COMPLETED')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [modalTask, setModalTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [memberVehicles, setMemberVehicles] = useState([])

  const [tasks, setTasks] = useState([])  // Will be populated from API

  const userMenuRef = useRef(null)
  const roleLabel = ROLE_LABEL_MAP[currentUser?.role?.toUpperCase()] || currentUser?.role || 'Không xác định'

  // ============================================
  // Fetch member's assignment
  // ============================================
  const fetchMyAssignment = async () => {
    try {
      setError(null)
      setLoading(true)
      // Use getMyAssignment which calls /rescue-team/my-current-task
      // This endpoint filters by member.RequestId to get ONLY this member's assignment
      const assignment = await rescueTeamService.getMyAssignment()
      if (assignment) {
        // Member should only have one active assignment at a time
        setTasks([assignment])
        setSelectedTask(assignment)
        setModalTask(assignment)
      } else {
        setTasks([])
        setSelectedTask(null)
        setModalTask(null)
        setMemberVehicles([])
      }
      
      // SEPARATELY: Fetch member's vehicles using dedicated my-vehicles endpoint
      try {
        const vehicles = await rescueTeamService.getMemberVehicles()
        setMemberVehicles(vehicles)
      } catch (vehicleErr) {
        setMemberVehicles([])
      }

      return assignment || null
    } catch (err) {
      const errorMessage = rescueTeamService.getOperationsErrorMessage(err)
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }

  // =========================================================================
  // ROLE VALIDATION & DATA LOADING
  // =========================================================================
  //
  // BUG FIX CONTEXT:
  // Trước: Validate role dựa trên username pattern (check "leader" in username)
  //        → Fail khi username không chứa "leader"
  // 
  // Current: Vẫn giữ fallback username check (để compatible)
  //          Nhưng LoginPage.jsx đã gọi authService.getMeInfo() để redirect đúng
  //          nên component này thường không bị hit redirect sai anymore
  //
  // LOGIC:
  // 1. Nếu chưa login → goto login
  // 2. Nếu role ≠ RESCUE_TEAM → goto home (sai role)
  // 3. Nếu role = RESCUE_TEAM + username chứa "leader" → goto leader page
  //    (fallback cho case username không đúng pattern)
  // 4. Nếu valid → fetch data + setup auto-refresh
  // =========================================================================
  useEffect(() => {
    // ===== ROLE VALIDATION: Chỉ RESCUE_TEAM members (không phải leader) được vào trang này =====
    // NOTE: DB quy định member cũng có role "RESCUE_TEAM" như leader, nhưng có username khác (tùy member1, member2)
    if (!currentUser) {
      // Chưa login - redirect về login
      console.log('❌ Not logged in, redirecting to login...')
      navigate('/login', { replace: true })
      return
    }

    const role = String(currentUser?.role ?? '').toUpperCase()
    
    // Reject nếu không phải RESCUE_TEAM role
    if (role !== 'RESCUE_TEAM') {
      console.warn('⚠️ Invalid role for /rescue-team-member page:', role)
      alert('Bạn không có quyền truy cập trang này! Chỉ Thành viên đội cứu hộ mới có quyền.')
      navigate('/', { replace: true })
      return
    }
    
    // NOTE: LoginPage handles early redirect based on memberRole from database
    // This page can assume user is a member if they get here with RESCUE_TEAM role
    // No need for additional username-based checks here

    console.log('✅ Role validation passed, fetching data...')
    // Fetch data sau khi validate role thành công
    fetchMyAssignment()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMyAssignment()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [currentUser, navigate])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleUserMenu = () => {
    setShowUserMenu(!showUserMenu)
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const handleConfirmLogout = () => {
    authService.logout()
    window.location.href = '/login'
  }

  const getActiveTasks = () => {
    return tasks.filter((task) => !['COMPLETED', 'FAILED', 'CANCELLED', 'CANCELED'].includes(normalizeTaskStatus(task)))
  }

  const getCompletedTasks = () => {
    return tasks.filter((task) => ['COMPLETED', 'FAILED', 'CANCELLED', 'CANCELED'].includes(normalizeTaskStatus(task)))
  }

  const displayTasks = filterStatus === 'ACTIVE' ? getActiveTasks() : getCompletedTasks()

  // ============================================
  // Member Action Handlers
  // ============================================
  const syncTaskState = (taskId, patch) => {
    setTasks((previousValue) =>
      previousValue.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
    )
    setSelectedTask((previousValue) =>
      previousValue?.id === taskId ? { ...previousValue, ...patch } : previousValue,
    )
    setModalTask((previousValue) =>
      previousValue?.id === taskId ? { ...previousValue, ...patch } : previousValue,
    )
  }

  const handleSetTaskWaiting = async (task) => {
    if (!task?.operationId) {
      setError('\u004b\u0068\u00f4\u006e\u0067 \u0074\u00ec\u006d \u0074\u0068\u1ea5\u0079 \u006f\u0070\u0065\u0072\u0061\u0074\u0069\u006f\u006e \u0111\u1ec3 \u0063\u1ead\u0070 \u006e\u0068\u1ead\u0074 \u0074\u0072\u1ea1\u006e\u0067 \u0074\u0068\u00e1\u0069 \u0063\u0068\u1edd\u002e')
      return
    }

    setConfirming(true)
    try {
      await rescueTeamService.setOperationWaiting(task.operationId)
      setError(null)
      const refreshedTask = await fetchMyAssignment()
      if (!refreshedTask) {
        syncTaskState(task.id, {
          rawStatus: 'Waiting',
          status: 'Waiting',
        })
      }
      alert('\u0110\u00e3 \u0063\u0068\u0075\u0079\u1ec3\u006e \u006e\u0068\u0069\u1ec7\u006d \u0076\u1ee5 \u0073\u0061\u006e\u0067 \u0074\u0072\u1ea1\u006e\u0067 \u0074\u0068\u00e1\u0069 \u0063\u0068\u1edd\u002e')
    } catch (err) {
      const errorMessage = rescueTeamService.getUpdateStatusErrorMessage(err)
      setError(`\u004c\u1ed7\u0069: ${errorMessage}`)
    } finally {
      setConfirming(false)
    }
  }

  const handleRequestSupport = async (operationId) => {
    setConfirming(true)
    try {
      // Member gửi yêu cầu hỗ trợ cho task hiện tại
      // API: POST /rescue-team/my-assignment/support (không cần operationId, dùng current assignment)
      await rescueTeamService.requestSupport()
      setError(null)
      alert('Đã gửi yêu cầu hỗ trợ. Đội trưởng sẽ nhận được thông báo.')
      await fetchMyAssignment()
    } catch (err) {
      const errorMessage = rescueTeamService.getUpdateStatusErrorMessage(err)
      setError(`Lỗi: ${errorMessage}`)
    } finally {
      setConfirming(false)
    }
  }

  const handleConfirmTask = async (task) => {
    if (!task) return

    if (!window.confirm('Xác nhận đã hoàn tất nhiệm vụ này?')) {
      return
    }

    setConfirming(true)
    try {
      await rescueTeamService.confirmMyTask()
      setError(null)
      alert('Xác nhận hoàn tất nhiệm vụ thành công!')
      await fetchMyAssignment()
      setSelectedTask(null)
    } catch (err) {

      const errorMessage = rescueTeamService.getConfirmTaskErrorMessage(err)
      setError(`Lỗi: ${errorMessage}`)
    } finally {
      setConfirming(false)
    }
  }

  const handleFinishTask = async (task, reason) => {
    if (!task?.operationId) {
      setError('Không tìm thấy operation để hoàn tất.')
      return
    }

    setConfirming(true)
    try {
      // Member chỉ có thể xác nhận hoàn tất task (không phải update status trực tiếp)
      // Endpoint: PUT /rescue-team/my-assignment/confirm (không cần operationId)
      if (reason === 'COMPLETED') {
        await rescueTeamService.confirmMyTask()
        setError(null)
        alert('Hoàn tất nhiệm vụ thành công!')
        setShowFinishModal(false)
        setFinishReason('COMPLETED')
        await fetchMyAssignment()
        setSelectedTask(null)
      } else if (reason === 'FAILED') {
        // TODO: BE chưa có endpoint cho member báo thất bại
        // Hiện tại chỉ hỗ trợ COMPLETED
        setError('Tính năng báo thất bại đang được phát triển. Vui lòng liên hệ Đội trưởng.')
      }
    } catch (err) {
      const errorMessage = rescueTeamService.getUpdateStatusErrorMessage(err)
      setError(`Lỗi: ${errorMessage}`)
    } finally {
      setConfirming(false)
    }
  }

  const getStatusInfo = (status) => TASK_STATUS_MAP[normalizeTaskStatus(status)] || TASK_STATUS_MAP['ASSIGNED']
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

  // ===== Team Members Management Handlers =====
  const toggleMemberExpand = (memberId) => {
    setExpandedMemberId(expandedMemberId === memberId ? null : memberId)
  }

  const getMemberRoleLabel = (role) => {
    return ROLE_LABEL_MAP[role?.toUpperCase()] || role || 'Thành viên'
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
        {/* Loading State */}
        {loading && (
          <div className="rtmp-loading-state">
            <div className="rtmp-spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="rtmp-error-banner">
            <ExclamationCircleIcon className="error-icon" />
            <div className="error-content">
              <strong>Lỗi:</strong>
              <p>{error}</p>
            </div>
            <button
              className="rtmp-btn rtmp-btn-small"
              onClick={fetchMyAssignment}
            >
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
        {/* ===== DANH SÁCH NHIỆM VỤ TABLE ===== */}
            <div className="mission-list-container">
              <h2 className="mission-list-title">Danh sách nhiệm vụ được giao</h2>
              <div className="mission-table-wrapper">
                <table className="mission-table">
                  <thead>
                    <tr>
                      <th className="sortable-header">
                        Operation ID 
                        <span className="sort-icon">▴</span>
                      </th>
                      <th className="sortable-header">
                        Địa chỉ 
                        <span className="sort-icon">▴</span>
                      </th>
                      <th className="sortable-header">
                        Số điện thoại 
                        <span className="sort-icon">▴</span>
                      </th>
                      <th className="sortable-header">
                        Mức độ ưu tiên 
                        <span className="sort-icon">▴</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{padding: '20px', textAlign: 'center', color: '#999'}}>
                          Không có nhiệm vụ nào được giao
                        </td>
                      </tr>
                    ) : (
                      tasks.map((task) => {
                        const getPriorityClassName = (priority) => {
                          const normalized = String(priority ?? '')
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')

                          if (normalized.includes('khan cap') || normalized.includes('urgent')) {
                            return 'priority-urgent'
                          }
                          if (normalized.includes('cao') || normalized.includes('high')) {
                            return 'priority-high'
                          }
                          if (normalized.includes('trung binh') || normalized.includes('medium')) {
                            return 'priority-medium'
                          }
                          if (normalized.includes('thap') || normalized.includes('low')) {
                            return 'priority-low'
                          }
                          return 'priority-default'
                        }

                        return (
                          <tr
                            key={task.id}
                            onClick={() => {
                              setModalTask(task)
                              setShowTaskModal(true)
                            }}
                            className="mission-row"
                          >
                            <td>{task.requestId}</td>
                            <td>{task.address}</td>
                            <td>{task.phone}</td>
                            <td>
                              <span className={`priority-badge ${getPriorityClassName(task.priority)}`}>
                                {task.priority}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="rtmp-tabs">
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
                                <p>{task.elderlyCount ?? 0} người</p>
                              </div>
                              <div className="rtmp-detail-item">
                                <label>Trẻ Em</label>
                                <p>{task.childrenCount ?? 0} người</p>
                              </div>
                              <div className="rtmp-detail-item">
                                <label>Phương Tiện</label>
                                <p>{task.vehicles && task.vehicles.length > 0 ? task.vehicles.join(', ') : 'Không có'}</p>
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
                            {normalizeTaskStatus(task) === 'ASSIGNED' && (
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

                            {(normalizeTaskStatus(task) === 'IN_PROGRESS' || normalizeTaskStatus(task) === 'WAITING') && (
                              <div className="rtmp-card-actions">
                                {/* Show WAITING status badge and message */}
                                {normalizeTaskStatus(task) === 'WAITING' && (
                                  <div className="rtmp-waiting-notice">
                                    <ExclamationCircleIcon className="notice-icon" />
                                    <span>Đang chờ xác nhận từ Trưởng đội cứu hộ</span>
                                  </div>
                                )}

                                <button
                                  className="rtmp-btn rtmp-btn-complete"
                                  onClick={() => {
                                    setFinishReason('COMPLETED')
                                    setShowFinishModal(true)
                                  }}
                                  disabled={normalizeTaskStatus(task) === 'WAITING' || confirming}
                                  title={normalizeTaskStatus(task) === 'WAITING' ? 'Tính năng này tạm thời không khả dụng khi chờ xác nhận' : ''}
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
                                  disabled={normalizeTaskStatus(task) === 'WAITING' || confirming}
                                  title={normalizeTaskStatus(task) === 'WAITING' ? 'Tính năng này tạm thời không khả dụng khi chờ xác nhận' : ''}
                                >
                                  <XMarkIcon />
                                  Thất Bại / Hủy
                                </button>

                                {/* Support button available during WAITING or IN_PROGRESS */}
                                <button
                                  className="rtmp-btn rtmp-btn-support"
                                  onClick={() => handleRequestSupport()}
                                  disabled={confirming}
                                >
                                  🆘 Yêu Cầu Hỗ Trợ
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

      {/* Task Details Modal */}
      {showTaskModal && modalTask && (
        <div className="rtmp-modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="rtmp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rtmp-modal-header">
              <h3>Chi Tiết Nhiệm Vụ</h3>
              <button
                className="rtmp-modal-close"
                onClick={() => setShowTaskModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="rtmp-modal-body">
              <div className="rtmp-modal-content">
                {/* Header Info */}
                <div style={{marginBottom: '12px', paddingBottom: '12px'}}>
                  <div style={{display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap'}}>
                    <span style={{
                      background: modalTask.priority === 'URGENT' ? '#f97316' : modalTask.priority === 'HIGH' ? '#fbbf24' : '#6b7280',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: '700',
                      textTransform: 'uppercase'
                    }}>
                      {modalTask.priority}
                    </span>
                    <span style={{fontSize: '16px', fontWeight: '700', color: '#1f2937'}}>#{modalTask.requestId}</span>
                  </div>
                </div>

                {/* Main Details */}
                <div style={{marginBottom: '12px'}}>
                  <div style={{marginBottom: '8px'}}>
                    <label style={{fontSize: '13px', fontWeight: '600', color: '#1f2937', display: 'block', marginBottom: '2px'}}>ĐỊA CHỈ</label>
                    <p style={{fontSize: '15px', color: '#6b7280', margin: 0}}>{modalTask.address}</p>
                  </div>
                  
                  <div style={{marginBottom: '8px'}}>
                    <label style={{fontSize: '13px', fontWeight: '600', color: '#1f2937', display: 'block', marginBottom: '2px'}}>SỐ ĐIỆN THOẠI</label>
                    <a href={`tel:${modalTask.phone}`} style={{fontSize: '15px', color: '#6b7280', textDecoration: 'none', fontWeight: '600'}}>{modalTask.phone}</a>
                  </div>

                  <div style={{marginBottom: '8px'}}>
                    <label style={{fontSize: '13px', fontWeight: '600', color: '#1f2937', display: 'block', marginBottom: '2px'}}>TỌA ĐỘ</label>
                    <p style={{fontSize: '15px', color: '#6b7280', margin: 0, fontFamily: 'monospace'}}>
                      {modalTask.location ? `${modalTask.location.lat.toFixed(4)}, ${modalTask.location.lng.toFixed(4)}` : 'N/A'}
                    </p>
                  </div>

                  <div style={{marginBottom: '8px'}}>
                    <label style={{fontSize: '13px', fontWeight: '600', color: '#1f2937', display: 'block', marginBottom: '2px'}}>MÔ TẢ SỰ CỐ</label>
                    <p style={{fontSize: '15px', color: '#6b7280', margin: 0, lineHeight: '1.5'}}>{modalTask.description}</p>
                  </div>
                </div>

                {/* People Info */}
                <div style={{marginBottom: '12px', paddingBottom: '12px'}}>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px'}}>
                    <div style={{textAlign: 'center'}}>
                      <p style={{fontSize: '13px', color: '#1f2937', margin: '0 0 4px 0', fontWeight: '600'}}>Người Lớn</p>
                      <p style={{fontSize: '15px', color: '#6b7280', margin: 0, fontWeight: '600'}}>{modalTask.adultCount ?? 0} người</p>
                    </div>
                    <div style={{textAlign: 'center'}}>
                      <p style={{fontSize: '13px', color: '#1f2937', margin: '0 0 4px 0', fontWeight: '600'}}>Người Già</p>
                      <p style={{fontSize: '15px', color: '#6b7280', margin: 0, fontWeight: '600'}}>{modalTask.elderlyCount ?? 0} người</p>
                    </div>
                    <div style={{textAlign: 'center'}}>
                      <p style={{fontSize: '13px', color: '#1f2937', margin: '0 0 4px 0', fontWeight: '600'}}>Trẻ Em</p>
                      <p style={{fontSize: '15px', color: '#6b7280', margin: 0, fontWeight: '600'}}>{modalTask.childrenCount ?? 0} người</p>
                    </div>
                  </div>
                </div>

                {/* Vehicles Info */}
                <div>
                  <p style={{fontSize: '13px', color: '#1f2937', margin: '0 0 8px 0', fontWeight: '600'}}>PHƯƠNG TIỆN ĐƯỢC PHÂN CÔNG</p>
                  {memberVehicles && memberVehicles.length > 0 ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                      {memberVehicles.map((vehicle, idx) => (
                        <div key={idx} style={{
                          padding: '8px 12px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '4px',
                          fontSize: '14px',
                          color: '#374151'
                        }}>
                          <strong>{vehicle.vehicleName || vehicle.name}</strong>
                          <div style={{fontSize: '12px', color: '#6b7280', marginTop: '2px'}}>
                            {vehicle.vehicleCode && <span>{vehicle.vehicleCode}</span>}
                            {vehicle.licensePlate && <span> • {vehicle.licensePlate}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{fontSize: '15px', color: '#6b7280', margin: 0}}>Không có phương tiện được phân công</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons Footer */}
            <div className="rtmp-modal-footer">
              {(['ASSIGNED', 'IN_PROGRESS', 'WAITING'].includes(String(modalTask?.rawStatus ?? '').toUpperCase())) && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  {String(modalTask?.rawStatus ?? '').toUpperCase() === 'WAITING' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px',
                      background: '#fef3c7',
                      border: '1px solid #fcd34d',
                      borderRadius: '6px',
                      color: '#92400e',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      <ExclamationCircleIcon style={{width: '16px', height: '16px', flexShrink: 0}} />
                      <span>Đang chờ xác nhận từ Trưởng đội cứu hộ</span>
                    </div>
                  )}

                  <div style={{display: 'flex', gap: '8px'}}>
                    <button
                      className="rtmp-btn rtmp-btn-complete"
                      onClick={() => {
                        setSelectedTask(modalTask)
                        setFinishReason('COMPLETED')
                        setShowFinishModal(true)
                        setShowTaskModal(false)
                      }}
                      disabled={String(modalTask?.rawStatus ?? '').toUpperCase() === 'WAITING' || confirming}
                      title={String(modalTask?.rawStatus ?? '').toUpperCase() === 'WAITING' ? 'Tính năng này tạm thời không khả dụng khi chờ xác nhận' : ''}
                      style={{flex: 1}}
                    >
                      <CheckIcon style={{width: '16px', height: '16px'}} />
                      Đã Hoàn Tất
                    </button>

                    <button
                      className="rtmp-btn rtmp-btn-failed"
                      onClick={() => {
                        setSelectedTask(modalTask)
                        setFinishReason('FAILED')
                        setShowFinishModal(true)
                        setShowTaskModal(false)
                      }}
                      disabled={String(modalTask?.rawStatus ?? '').toUpperCase() === 'WAITING' || confirming}
                      title={String(modalTask?.rawStatus ?? '').toUpperCase() === 'WAITING' ? 'Tính năng này tạm thời không khả dụng khi chờ xác nhận' : ''}
                      style={{flex: 1}}
                    >
                      <XMarkIcon style={{width: '16px', height: '16px'}} />
                      Thất Bại / Hủy
                    </button>
                  </div>

                  <button
                    className="rtmp-btn rtmp-btn-support"
                    onClick={() => {
                      handleRequestSupport(modalTask?.operationId)
                      setShowTaskModal(false)
                    }}
                    disabled={confirming}
                    style={{width: '100%'}}
                  >
                    🆘 Yêu Cầu Hỗ Trợ
                  </button>
                </div>
              )}

              {!(['ASSIGNED', 'IN_PROGRESS', 'WAITING'].includes(String(modalTask?.rawStatus ?? '').toUpperCase())) && (
                <div style={{
                  padding: '12px',
                  background: '#f3f4f6',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#6b7280',
                  textAlign: 'center'
                }}>
                  <strong>Trạng thái:</strong> {modalTask?.status} (Không có hành động khả dụng)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
      <LogoutConfirmModal
        open={showLogoutConfirm}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
      </div>
    </div>
  )
}

export default RescueTeamMemberPage
