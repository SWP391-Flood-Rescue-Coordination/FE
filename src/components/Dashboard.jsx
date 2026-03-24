import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftOnRectangleIcon, ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import authService from '../services/authService'
import rescueRequestService from '../services/rescueRequestService'

import { formatDateTimeVN, HOME_ROUTE_BY_ROLE, normalizeRole } from '../pages/adminShared';
import RequestForm from './RequestForm'
import ViewRequest from './ViewRequest'
import './Dashboard.css'

const SAFE_NOTICE_TEXT = 'Đội cứu hộ đã xác nhận hoàn tất nhiệm vụ'
const SAFE_NOTICE_TITLE = SAFE_NOTICE_TEXT
const SAFE_NOTICE_MESSAGE = ''
const SAFE_REPORT_SAFE_LABEL = 'Báo an toàn'

const ROLE_LABEL_MAP = {
  CITIZEN: 'Công dân',
  COORDINATOR: 'Điều phối viên',
  RESCUE_COORDINATOR: 'Điều phối viên',
  RESCUE_TEAM: 'Đội cứu hộ',
  MANAGER: 'Quản lý',
  ADMIN: 'Quản trị viên',
}

const REQUEST_STATUS_META = {
  PENDING: { label: 'Đang chờ duyệt', className: 'pending' },
  VERIFIED: { label: 'Đã xác minh', className: 'verified' },
  ASSIGNED: { label: 'Đã phân công', className: 'assigned' },
  IN_PROGRESS: { label: 'Đang cứu hộ', className: 'in-progress' },
  CONFIRMED: { label: 'Đã phân công', className: 'assigned' },
  COMPLETED: { label: 'Đã hoàn thành', className: 'completed' },
  CANCELLED: { label: 'Đã hủy', className: 'cancelled' },
  CANCELED: { label: 'Đã hủy', className: 'cancelled' },
  DUPLICATE: { label: 'Trùng lặp', className: 'duplicate' },
  DUPLICATED: { label: 'Trùng lặp', className: 'duplicate' },
}

const getRequestStatusMeta = (status) => {
  const normalized = rescueRequestService.normalizeStatus(status)
  return REQUEST_STATUS_META[normalized] || {
    label: String(status ?? 'Không xác định'),
    className: 'pending',
  }
}

function Dashboard() {
  const navigate = useNavigate()
  const [showStats, setShowStats] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showViewRequest, setShowViewRequest] = useState(false)
  const [requestHistory, setRequestHistory] = useState([])
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [showStatusDetail, setShowStatusDetail] = useState(false)
  const [isPreparingRequestForm, setIsPreparingRequestForm] = useState(false)
  const [hasActiveRequest, setHasActiveRequest] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => authService.getUserInfo())
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [remoteDashboardStats, setRemoteDashboardStats] = useState(null)
  const [isReportingSafeFromDashboard, setIsReportingSafeFromDashboard] = useState(false)
  const userMenuRef = useRef(null)

  const isAuthenticated = authService.isAuthenticated() && Boolean(currentUser)
  const roleKey = normalizeRole(currentUser?.role)
  const roleLabel = ROLE_LABEL_MAP[roleKey] || currentUser?.role || '-'
  const isCitizen = isAuthenticated && roleKey === 'CITIZEN'
  const latestRequest = requestHistory[0] ?? null
  const latestRequestStatus = rescueRequestService.normalizeStatus(latestRequest?.status)
  const latestRequestStatusMeta = latestRequest ? getRequestStatusMeta(latestRequest.status) : null
  const hasSafeCompletionSignal = Boolean(latestRequest?.canReportSafe) && latestRequestStatus === 'ASSIGNED'
  const showSafeCompletionDot = hasSafeCompletionSignal
  const showSafeCompletionNotice = hasSafeCompletionSignal
  const safeNoticeClassName = showStats
    ? 'dashboard-safe-notice dashboard-safe-notice-below-stats'
    : 'dashboard-safe-notice'

  const fallbackDashboardStats = useMemo(() => {
    const receivedRequests = requestHistory.length
    const rescuedPeople = requestHistory.reduce((sum, item) => {
      const raw = item?.totalPeople ?? item?.numberOfPeople ?? 0
      const value = Number(raw)
      return Number.isFinite(value) ? sum + value : sum
    }, 0)
    const supportedCount = requestHistory.filter((item) => rescueRequestService.isTerminalStatus(item?.status)).length
    const safeCount = requestHistory.filter((item) => {
      const normalized = rescueRequestService.normalizeStatus(item?.status)
      return normalized === 'COMPLETED'
    }).length

    return {
      receivedRequests,
      rescuedPeople,
      supportedCount,
      safeCount,
    }
  }, [requestHistory])

  const dashboardStats = remoteDashboardStats || fallbackDashboardStats
  const primaryButtonLabel = isPreparingRequestForm
    ? 'Đang tải...'
    : hasActiveRequest
      ? latestRequestStatusMeta?.label || 'Đang chờ xử lý'
      : 'Tạo yêu cầu'

  const primaryButtonClassName = hasSafeCompletionSignal
    ? 'btn-primary btn-primary-report-ready'
    : 'btn-primary'

  const buildHistoryItem = (requestItem) => {
    if (!requestItem) {
      return null
    }

    const formatted = rescueRequestService.toRequestFormData(requestItem)

    return {
      ...formatted,
      submittedDate: requestItem?.createdAt || formatted?.submittedDate || null,
      requestId: requestItem?.requestId ?? formatted?.requestId ?? null,
      accessCode: requestItem?.accessCode ?? formatted?.accessCode ?? null,
      status: requestItem?.status || formatted?.status || 'Pending',
    }
  }

  const loadRequestHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      if (isCitizen) {
        const requests = await rescueRequestService.getMyRequests()
        const history = requests.map((item) => buildHistoryItem(item)).filter(Boolean)
        setRequestHistory(history)
        setHasActiveRequest(requests.some((item) => !rescueRequestService.isTerminalStatus(item?.status)))
        return
      }

      const guestTrackedRequest = await rescueRequestService.getTrackedGuestRequestStatus()
      const historyItem = buildHistoryItem(guestTrackedRequest)
      setRequestHistory(historyItem ? [historyItem] : [])
      setHasActiveRequest(historyItem ? !rescueRequestService.isTerminalStatus(historyItem?.status) : false)
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.error('Error loading request history:', error)
      }
      setRequestHistory([])
      setHasActiveRequest(false)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [isCitizen])

  const loadDashboardStatistics = useCallback(async () => {
    try {
      const stats = await rescueRequestService.getCitizenDashboardStatistics()
      setRemoteDashboardStats({
        receivedRequests: Number(stats?.receivedRequests ?? 0),
        rescuedPeople: Number(stats?.rescuedPeople ?? 0),
        supportedCount: Number(stats?.supportedRequests ?? 0),
        safeCount: Number(stats?.safeReports ?? 0),
      })
    } catch (error) {
      console.error('Error loading dashboard statistics:', error)
      setRemoteDashboardStats(null)
    }
  }, [])

  useEffect(() => {
    loadRequestHistory()
  }, [loadRequestHistory])

  useEffect(() => {
    loadDashboardStatistics()
  }, [loadDashboardStatistics])

  useEffect(() => {
    if (!isAuthenticated || isCitizen) {
      return
    }

    navigate(HOME_ROUTE_BY_ROLE[roleKey] || '/login', { replace: true })
  }, [isAuthenticated, isCitizen, navigate, roleKey])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    let intervalId = null

    const syncActiveRequestStatus = async () => {
      if (!isAuthenticated) {
        if (isMounted) {
          setIsPreparingRequestForm(true)
        }

        try {
          const guestTrackedRequest = await rescueRequestService.getTrackedGuestRequestStatus()
          const hasOpenGuestRequest = guestTrackedRequest
            ? !rescueRequestService.isTerminalStatus(guestTrackedRequest?.status)
            : false

          if (isMounted) {
            setHasActiveRequest(hasOpenGuestRequest)
          }
        } catch {
          if (isMounted) {
            setHasActiveRequest(false)
          }
        } finally {
          if (isMounted) {
            setIsPreparingRequestForm(false)
          }
        }
        return
      }

      if (!isCitizen) {
        if (isMounted) {
          setHasActiveRequest(false)
          setIsPreparingRequestForm(false)
        }
        return
      }

      if (isMounted) {
        setIsPreparingRequestForm(true)
      }

      try {
        const myRequests = await rescueRequestService.getMyRequests()
        const hasOpenRequest = myRequests.some((item) => !rescueRequestService.isTerminalStatus(item?.status))

        if (isMounted) {
          setHasActiveRequest(hasOpenRequest)
        }
      } catch {
        if (isMounted) {
          setHasActiveRequest(false)
        }
      } finally {
        if (isMounted) {
          setIsPreparingRequestForm(false)
        }
      }
    }

    syncActiveRequestStatus()

    if (isCitizen) {
      intervalId = window.setInterval(syncActiveRequestStatus, 30000)
    }

    return () => {
      isMounted = false
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [isAuthenticated, isCitizen])

  const handleToggleUserMenu = () => {
    setShowUserMenu((prev) => !prev)
  }

  const handleLogout = () => {
    authService.logout()
    setCurrentUser(null)
    setShowUserMenu(false)
    navigate('/login')
  }

  const handleOpenRequestForm = () => {
    if (hasActiveRequest || isPreparingRequestForm) {
      return
    }
    setShowRequestForm(true)
  }

  const handleOpenStatusDetail = () => {
    if (requestHistory.length === 0) {
      return
    }

    setShowStatusDetail(true)
  }

  const dismissSafeCompletionNotice = useCallback(() => {}, [])

  const handleReportSafeFromDashboard = useCallback(async () => {
    const requestId = latestRequest?.requestId
    if (!requestId || isReportingSafeFromDashboard) {
      return
    }

    setIsReportingSafeFromDashboard(true)

    try {
      if (isAuthenticated) {
        await rescueRequestService.confirmRescued(requestId)
      } else {
        const phone = String(latestRequest?.phone ?? '').trim()
        if (!phone) {
          return
        }
        await rescueRequestService.confirmRescuedAsGuest(requestId, phone)
      }

      await Promise.all([loadRequestHistory(), loadDashboardStatistics()])
    } catch (error) {
      console.error('Error reporting safe from dashboard:', error)
    } finally {
      setIsReportingSafeFromDashboard(false)
    }
  }, [
    isAuthenticated,
    isReportingSafeFromDashboard,
    latestRequest?.phone,
    latestRequest?.requestId,
    loadDashboardStatistics,
    loadRequestHistory,
  ])

  const handleCloseRequestForm = async (requestData) => {
    setShowRequestForm(false)

    if (!requestData) {
      return
    }

    await Promise.all([loadRequestHistory(), loadDashboardStatistics()])
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>
        <div className="header-buttons">
          <button
            className={primaryButtonClassName}
            onClick={handleOpenRequestForm}
            disabled={isPreparingRequestForm || hasActiveRequest}
          >
            {primaryButtonLabel}
          </button>

          <div className="view-request-wrapper">
            <button
              className="btn-secondary"
              onClick={handleOpenStatusDetail}
              disabled={requestHistory.length === 0}
            >
              Xem yêu cầu
            </button>
            {showSafeCompletionDot && <span className="view-request-notice-dot" aria-hidden="true" />}
          </div>

          {isAuthenticated ? (
            <div className="auth-user-group" ref={userMenuRef}>
              <button
                type="button"
                className="icon-circle-button user-icon-button"
                onClick={handleToggleUserMenu}
                aria-label="Thông tin người dùng"
              >
                <UserCircleIcon className="header-icon" />
              </button>
              <button
                type="button"
                className="icon-circle-button logout-icon-button"
                onClick={handleLogout}
                aria-label="Đăng xuất"
              >
                <ArrowLeftOnRectangleIcon className="header-icon" />
              </button>

              {showUserMenu && (
                <div className="user-menu-card">
                  <h3>Thông tin tài khoản</h3>
                  <div className="user-info-row">
                    <span>Tên tài khoản</span>
                    <strong>{currentUser?.username || '-'}</strong>
                  </div>
                  <div className="user-info-row">
                    <span>Họ tên</span>
                    <strong>{currentUser?.fullName || '-'}</strong>
                  </div>
                  <div className="user-info-row">
                    <span>Email</span>
                    <strong>{currentUser?.email || '-'}</strong>
                  </div>
                  <div className="user-info-row">
                    <span>Vai trò</span>
                    <strong>{roleLabel}</strong>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button className="btn-login" onClick={() => navigate('/login')}>
              <ArrowRightOnRectangleIcon className="header-icon" />
              Đăng nhập
            </button>
          )}
        </div>
        <button className="stats-toggle" onClick={() => setShowStats(!showStats)} aria-label="Thu gọn thống kê">
        </button>
      </header>

      {showRequestForm && <RequestForm onClose={handleCloseRequestForm} />}

      {showSafeCompletionNotice && (
        <div className={safeNoticeClassName} role="status" aria-live="polite">
          <div className="dashboard-safe-notice-content">
            <span className="dashboard-safe-notice-message-inline">{SAFE_NOTICE_TEXT}</span>
            <strong className="dashboard-safe-notice-title">{SAFE_NOTICE_TITLE}</strong>
            <span className="dashboard-safe-notice-message">{SAFE_NOTICE_MESSAGE}</span>
            <strong>Đội cứu hộ đã xác nhận hoàn tất nhiệm vụ.</strong>
            <span> Nếu bạn đã an toàn, vui lòng bấm "Báo an toàn" để hoàn tất yêu cầu này.</span>
          </div>
          <button
            type="button"
            className="dashboard-safe-notice-action dashboard-safe-notice-action-report"
            onClick={handleReportSafeFromDashboard}
            disabled={isReportingSafeFromDashboard}
          >
            {isReportingSafeFromDashboard ? 'Đang gửi...' : SAFE_REPORT_SAFE_LABEL}
          </button>
          <button
            type="button"
            className="dashboard-safe-notice-action"
            onClick={handleOpenStatusDetail}
          >
            Xem yÃªu cáº§u
          </button>
          <button
            type="button"
            className="dashboard-safe-notice-close"
            onClick={dismissSafeCompletionNotice}
            aria-label="ÄÃ³ng thÃ´ng bÃ¡o"
          >
            Ã—
          </button>
        </div>
      )}

      {showViewRequest && (selectedRequestId || selectedRequest) && (
        <ViewRequest
          requestId={selectedRequestId}
          requestData={selectedRequest}
          onClose={async () => {
            setShowViewRequest(false)
            setShowStatusDetail(false)
            setSelectedRequestId(null)
            setSelectedRequest(null)
            await Promise.all([loadRequestHistory(), loadDashboardStatistics()])
          }}
        />
      )}

      {showStatusDetail && (
        <div className="detail-overlay" onClick={() => setShowStatusDetail(false)}>
          <div className="detail-popup" onClick={(event) => event.stopPropagation()}>
            <div className="detail-header">
              <h3>Lịch sử yêu cầu</h3>
              <button className="close-btn" onClick={() => setShowStatusDetail(false)}>×</button>
            </div>
            <div className="detail-list">
              <div className="detail-list-header">
                <span className="detail-col-date">Thời gian gửi</span>
                <span className="detail-col-status">Trạng thái</span>
              </div>
              {isLoadingHistory ? (
                <div className="empty-message">Đang tải...</div>
              ) : requestHistory.length === 0 ? (
                <div className="empty-message">Chưa có yêu cầu nào được gửi</div>
              ) : (
                requestHistory.map((request, index) => {
                  const requestDate = request.submittedDate
                  const statusMeta = getRequestStatusMeta(request.status)
                  const statusClass = rescueRequestService.isTerminalStatus(request.status) ? 'completed' : 'pending'

                  return (
                    <div
                      key={request.requestId || index}
                      className="detail-item"
                      onClick={() => {
                        setSelectedRequest(request)
                        setSelectedRequestId(request.requestId ?? null)
                        setShowStatusDetail(false)
                        setShowViewRequest(true)
                      }}
                    >
                      <span className="detail-date">
                        {formatDateTimeVN(requestDate)}
                      </span>
                      <span className={`detail-status ${statusClass}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {showStats && (
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-icon">🕐</div>
            <div className="stat-number">{dashboardStats.receivedRequests}</div>
            <div className="stat-label">Các yêu cầu đã nhận</div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">👥</div>
            <div className="stat-number">{dashboardStats.rescuedPeople}</div>
            <div className="stat-label">Người được cứu trợ</div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">❤️</div>
            <div className="stat-number">{dashboardStats.supportedCount}</div>
            <div className="stat-label">Đã hỗ trợ</div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">😊</div>
            <div className="stat-number">{dashboardStats.safeCount}</div>
            <div className="stat-label">Báo an toàn</div>
          </div>
        </div>
      )}

        <span className={showStats ? 'arrow-up' : 'arrow-down'}>▲</span>

      <div className="map-container">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31355.545089644873!2d106.68353449999999!3d10.7626!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f38f9ed887b%3A0x14aded124064dcfa!2zVHLGsOG7nW5nIMSQ4bqhaSBo4buNYyBWxINuIEzDom5n!5e0!3m2!1svi!2s!4v1738166000000!5m2!1svi!2s"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <nav className="bottom-nav">
        <button className="nav-item">Hướng dẫn</button>
        <button className="nav-item">Liên hệ</button>
      </nav>
    </div>
  )
}

export default Dashboard
