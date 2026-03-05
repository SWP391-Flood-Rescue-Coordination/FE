import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOnRectangleIcon, ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import authService from '../services/authService';
import rescueRequestService from '../services/rescueRequestService';
import RequestForm from './RequestForm';
import ViewRequest from './ViewRequest';
import './Dashboard.css';

const MOCK_STATS = {
  receivedRequests: 12,
  rescuedPeople: 34,
  supportedCount: 26,
  safeCount: 18,
};
function Dashboard() {
  const navigate = useNavigate();
  const [showStats, setShowStats] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showViewRequest, setShowViewRequest] = useState(false);
  const [requestHistory, setRequestHistory] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('Mức 1 - Mức 5');
  const [showStatusDetail, setShowStatusDetail] = useState(false);
  const [isPreparingRequestForm, setIsPreparingRequestForm] = useState(false);
  const [hasActiveRequest, setHasActiveRequest] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => authService.getUserInfo());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const userMenuRef = useRef(null);

  const isAuthenticated = authService.isAuthenticated() && Boolean(currentUser);
  const roleKey = String(currentUser?.role ?? '').toUpperCase();
  const roleLabelMap = {
    CITIZEN: 'Công dân',
    COORDINATOR: 'Điều phối viên',
    RESCUE_COORDINATOR: 'Điều phối viên',
    RESCUE_TEAM: 'Đội cứu hộ',
    MANAGER: 'Quản lý',
    ADMIN: 'Quản trị viên',
  };
  const roleLabel = roleLabelMap[roleKey] || currentUser?.role || '-';
  const buildHistoryItem = (requestItem, fallback = {}) => {
    if (!requestItem) {
      return null;
    }

    const formatted = rescueRequestService.toRequestFormData({
      ...requestItem,
      ...fallback,
    });

    return {
      ...formatted,
      submittedDate: requestItem?.createdAt || fallback?.submittedDate || new Date().toISOString(),
      requestId: requestItem?.requestId ?? fallback?.requestId ?? formatted?.requestId ?? null,
      status: requestItem?.status || fallback?.status || formatted?.status || 'Pending',
    };
  };

  // Load request history from backend
  useEffect(() => {
    const loadRequestHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const isCitizen = isAuthenticated && roleKey === 'CITIZEN';

        if (isCitizen) {
          const requests = await rescueRequestService.getMyRequests();
          const history = requests
            .map((item) => buildHistoryItem(item))
            .filter(Boolean);
          setRequestHistory(history);
          return;
        }

        const guestTrackedRequest = await rescueRequestService.getTrackedGuestRequestStatus();
        const historyItem = buildHistoryItem(guestTrackedRequest);
        setRequestHistory(historyItem ? [historyItem] : []);
      } catch (error) {
        if (error?.response?.status !== 404) {
          console.error('Error loading request history:', error);
        }
        setRequestHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadRequestHistory();
  }, [isAuthenticated, roleKey]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleToggleUserMenu = () => {
    setShowUserMenu((prev) => !prev);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setShowUserMenu(false);
    navigate('/login');
  };

  useEffect(() => {
    let isMounted = true;
    let intervalId = null;

    const syncActiveRequestStatus = async () => {
      const isCitizen = isAuthenticated && roleKey === 'CITIZEN';

      if (!isAuthenticated) {
        if (isMounted) {
          setIsPreparingRequestForm(true);
        }

        try {
          const guestTrackedRequest = await rescueRequestService.getTrackedGuestRequestStatus();
          const hasOpenGuestRequest = guestTrackedRequest
            ? !rescueRequestService.isTerminalStatus(guestTrackedRequest?.status)
            : false;

          if (isMounted) {
            setHasActiveRequest(hasOpenGuestRequest);
          }
        } catch {
          if (isMounted) {
            setHasActiveRequest(false);
          }
        } finally {
          if (isMounted) {
            setIsPreparingRequestForm(false);
          }
        }
        return;
      }

      if (!isCitizen) {
        if (isMounted) {
          setHasActiveRequest(false);
          setIsPreparingRequestForm(false);
        }
        return;
      }

      if (isMounted) {
        setIsPreparingRequestForm(true);
      }

      try {
        const myRequests = await rescueRequestService.getMyRequests();
        const hasOpenRequest = myRequests.some((item) => !rescueRequestService.isTerminalStatus(item?.status));

        if (isMounted) {
          setHasActiveRequest(hasOpenRequest);
        }
      } catch {
        if (isMounted) {
          setHasActiveRequest(false);
        }
      } finally {
        if (isMounted) {
          setIsPreparingRequestForm(false);
        }
      }
    };

    syncActiveRequestStatus();

    if (isAuthenticated && roleKey === 'CITIZEN') {
      intervalId = window.setInterval(syncActiveRequestStatus, 30000);
    }

    return () => {
      isMounted = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [isAuthenticated, roleKey]);

  const handleOpenRequestForm = () => {
    if (hasActiveRequest || isPreparingRequestForm) {
      return;
    }
    setShowRequestForm(true);
  };

  const handleCloseRequestForm = async (requestData) => {
    setShowRequestForm(false);
    
    if (requestData) {
      setIsLoadingHistory(true);
      try {
        const isCitizen = authService.isAuthenticated() && roleKey === 'CITIZEN';
        if (isCitizen) {
          const requests = await rescueRequestService.getMyRequests();
          const history = requests
            .map((item) => buildHistoryItem(item))
            .filter(Boolean);
          setRequestHistory(history);
          const hasOpenRequest = requests.some((item) => !rescueRequestService.isTerminalStatus(item?.status));
          setHasActiveRequest(hasOpenRequest);
        } else {
          const latestRequest = await rescueRequestService.getTrackedGuestRequestStatus();
          const historyItem = buildHistoryItem(latestRequest, requestData);
          if (historyItem) {
            setRequestHistory([historyItem]);
            setHasActiveRequest(!rescueRequestService.isTerminalStatus(historyItem?.status));
          } else {
            setRequestHistory([]);
            setHasActiveRequest(false);
          }
        }
      } catch (error) {
        console.error('Error reloading request history:', error);
        const fallbackHistoryItem = buildHistoryItem(requestData, {
          requestId: requestData?.requestId ?? null,
          submittedDate: requestData?.submittedDate || new Date().toISOString(),
        });

        if (fallbackHistoryItem) {
          setRequestHistory([fallbackHistoryItem]);
          setHasActiveRequest(!rescueRequestService.isTerminalStatus(fallbackHistoryItem?.status));
        } else {
          setRequestHistory([]);
          setHasActiveRequest(false);
        }
      } finally {
        setIsLoadingHistory(false);
      }
    }
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>
        <div className="header-buttons">
          <button className="btn-primary" onClick={handleOpenRequestForm} disabled={isPreparingRequestForm || hasActiveRequest}>
            {isPreparingRequestForm ? 'Đang t' : hasActiveRequest ? 'Đang chờ xử lý' : 'Tạo yêu cầu'}
          </button>
          <div className="view-request-wrapper">
            <button 
              className="btn-secondary" 
              onClick={() => setShowStatusDetail(true)}
            >
              Xem yêu cầu
            </button>
            {requestHistory.length > 0 && (
              <div className="status-popup">
                <div className={`status-icon ${requestHistory[0].status === 'approved' ? 'approved' : 'pending'}`}></div>
                <span className="status-title">{requestHistory[0].status === 'approved' ? 'Đã duyệt' : 'Đang chờ duyệt'}</span>
              </div>
            )}
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
                    <span>Họ Tên</span>
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
      </header>

      {/* Request Form Popup */}
      {showRequestForm && <RequestForm onClose={handleCloseRequestForm} />}

      {/* View Request Popup */}
      {showViewRequest && (selectedRequestId || selectedRequest) && <ViewRequest 
        requestId={selectedRequestId} 
        requestData={selectedRequest}
        onClose={() => {
          setShowViewRequest(false);
          setShowStatusDetail(false);
          setSelectedRequestId(null);
          setSelectedRequest(null);
        }} 
      />}

      {/* Request History Detail Popup */}
      {showStatusDetail && (
        <div className="detail-overlay" onClick={() => setShowStatusDetail(false)}>
          <div className="detail-popup" onClick={(e) => e.stopPropagation()}>
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
                <div className="empty-message">
                  Đang tải...
                </div>
              ) : requestHistory.length === 0 ? (
                <div className="empty-message">
                  Chưa có yêu cầu nào được gửi
                </div>
              ) : (
                requestHistory.map((request, index) => {
                  const requestDate = new Date(request.submittedDate);
                  const statusNormalized = rescueRequestService.normalizeStatus(request.status);
                  const statusClass = rescueRequestService.isTerminalStatus(request.status) ? 'completed' : 'pending';
                  const statusLabel = {
                    'PENDING': 'Đang chờ xử lý',
                    'VERIFIED': 'Đã xác minh',
                    'ASSIGNED': 'Đã phân công',
                    'IN_PROGRESS': 'Đang cứu hộ',
                    'CONFIRMED': 'Đã xác nhận',
                    'COMPLETED': 'Đã hoàn thành',
                    'CANCELLED': 'Đã hủy',
                    'DUPLICATE': 'Trùng lặp'
                  }[statusNormalized] || request.status;
                  
                  return (
                    <div 
                      key={request.requestId || index} 
                      className="detail-item" 
                      onClick={() => {
                        setSelectedRequest(request);
                        setSelectedRequestId(request.requestId ?? null);
                        setShowStatusDetail(false);
                        setShowViewRequest(true);
                      }}
                    >
                      <span className="detail-date">
                        {requestDate.toLocaleString('vi-VN', {
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          hour12: false
                        })} CH
                      </span>
                      <span className={`detail-status ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Bar */}
      {showStats && (
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-icon">🕐</div>
            <div className="stat-number">{MOCK_STATS.receivedRequests}</div>
            <div className="stat-label">Các yêu cầu đã nhận</div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">👥</div>
            <div className="stat-number">{MOCK_STATS.rescuedPeople}</div>
            <div className="stat-label">Người được cứu trợ</div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">❤️</div>
            <div className="stat-number">{MOCK_STATS.supportedCount}</div>
            <div className="stat-label">Đã hỗ trợ</div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">😊</div>
            <div className="stat-number">{MOCK_STATS.safeCount}</div>
            <div className="stat-label">Báo an toàn</div>
          </div>
        </div>
      )}
      
      {/* Toggle Button */}
      <button className="stats-toggle" onClick={() => setShowStats(!showStats)}>
        <span className={showStats ? "arrow-up" : "arrow-down"}>▲</span>
      </button>

      {/* Map Container */}
      <div className="map-container">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31355.545089644873!2d106.68353449999999!3d10.7626!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f38f9ed887b%3A0x14aded124064dcfa!2zVHLGsOG7nW5nIMSQ4bqhaSBo4buNYyBWxINuIEzDom5n!5e0!3m2!1svi!2s!4v1738166000000!5m2!1svi!2s"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
        
        {/* Map Controls */}
        {/* <div className="map-controls">
          <div className="level-control">
            <span>Mức 1</span>
            <div className="level-bar"></div>
            <span>Mức 5</span>
          </div>
          <div className="level-dropdown">
            <button 
              className="level-dropdown-btn" 
              onClick={() => setShowLevelDropdown(!showLevelDropdown)}
            >
              <span className={showLevelDropdown ? "dropdown-arrow up" : "dropdown-arrow down"}>▼</span>
            </button>
            {showLevelDropdown && (
              <div className="level-dropdown-menu">
                <div className="level-option" onClick={() => { setSelectedLevel('Mức 5 - Rất cao'); setShowLevelDropdown(false); }}>
                  <span className="level-indicator level-5-bg"></span>
                  <span>Mức 5 - Rất cao</span>
                </div>
                <div className="level-option" onClick={() => { setSelectedLevel('Mức 4 - Cao'); setShowLevelDropdown(false); }}>
                  <span className="level-indicator level-4-bg"></span>
                  <span>Mức 4 - Cao</span>
                </div>
                <div className="level-option" onClick={() => { setSelectedLevel('Mức 3 - Trung bình'); setShowLevelDropdown(false); }}>
                  <span className="level-indicator level-3-bg"></span>
                  <span>Mức 3 - Trung bình</span>
                </div>
                <div className="level-option" onClick={() => { setSelectedLevel('Mức 2 - Thấp'); setShowLevelDropdown(false); }}>
                  <span className="level-indicator level-2-bg"></span>
                  <span>Mức 2 - Thấp</span>
                </div>
                <div className="level-option" onClick={() => { setSelectedLevel('Mức 1 - Rất thấp'); setShowLevelDropdown(false); }}>
                  <span className="level-indicator level-1-bg"></span>
                  <span>Mức 1 - Rất thấp</span>
                </div>
              </div>
            )}
          </div>
        </div> */}
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {/* <button className="nav-item">Thông Tin</button> */}
        <button className="nav-item">Khảo Sát</button>
        <button className="nav-item">Liên Hệ</button>
      </nav>
    </div>
  );
}

export default Dashboard;


