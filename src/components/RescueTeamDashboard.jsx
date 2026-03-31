import React, { useState, useEffect } from 'react';
import LogoutConfirmModal from './LogoutConfirmModal';
import './RescueTeamDashboard.css';
import rescueTeamService from '../services/rescueTeamService';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowLeftOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import authService from '../services/authService';
const normalizeVietnamese = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getPriorityClassName = (priority) => {
  const normalized = normalizeVietnamese(priority);

  if (normalized.includes('khan cap') || normalized.includes('urgent')) {
    return 'priority-urgent';
  }
  if (normalized.includes('cao') || normalized.includes('high')) {
    return 'priority-high';
  }
  if (normalized.includes('trung binh') || normalized.includes('medium')) {
    return 'priority-medium';
  }
  if (normalized.includes('thap') || normalized.includes('low')) {
    return 'priority-low';
  }
  return 'priority-default';
};

const normalizeOperationStatus = (status) =>
  String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

const ROLE_LABEL_MAP = {
  RESCUE_TEAM: 'Đội cứu hộ',
  COORDINATOR: 'Điều phối viên',
  MANAGER: 'Quản lý',
  ADMIN: 'Quản trị viên',
  CITIZEN: 'Công dân',
};

// Dashboard của rescue team gồm 2 mode chính:
// danh sách nhiệm vụ được giao và màn chi tiết để hoàn tất / thất bại.
function RescueTeamDashboard() {
  const navigate = useNavigate();
  // State: danh sách nhiệm vụ và nhiệm vụ được chọn
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updatingAction, setUpdatingAction] = useState('');
  const [currentUser, setCurrentUser] = useState(() => authService.getUserInfo());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const userMenuRef = React.useRef(null);
  const roleLabel = ROLE_LABEL_MAP[String(currentUser?.role ?? '').toUpperCase()] || currentUser?.role || '-';

  // ============================================
  // Fetch missions từ API
  // ============================================
  const fetchMissions = async ({ suppressError = false } = {}) => {
    try {
      if (!suppressError) {
        setError(null);
      }
      const data = await rescueTeamService.getMyOperations();
      // Service đã lọc bỏ các request trạng thái cuối trước khi trả về page.
      setMissions(data);
    } catch (err) {
      console.error('Error fetching missions:', err);
      const errorMessage = rescueTeamService.getOperationsErrorMessage(err);
      if (!suppressError) {
        setError(errorMessage);
      }
      
      // Nếu 401, redirect về login
      if (err.response?.status === 401) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load missions khi component mount
  useEffect(() => {
    fetchMissions();
    
    // Auto-refresh mỗi 30 giây (như Dashboard.jsx)
    const interval = setInterval(() => {
      fetchMissions();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

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

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedMissions = () => {
    if (!sortConfig.key) return missions;

    const sorted = [...missions].sort((a, b) => {
      let aValue, bValue;

      switch(sortConfig.key) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'address':
          aValue = a.address.toLowerCase();
          bValue = b.address.toLowerCase();
          break;
        case 'phone':
          aValue = a.phone;
          bValue = b.phone;
          break;
        case 'priority':
          const priorityOrder = { 'Khẩn cấp': 3, 'Cao': 2, 'Trung bình': 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case 'time':
          aValue = parseInt(a.estimatedTime);
          bValue = parseInt(b.estimatedTime);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const handleSelectMission = (mission) => {
    setSelectedMission(mission);
  };

  const handleBackToList = () => {
    setSelectedMission(null);
  };

  const handleToggleUserMenu = () => {
    setShowUserMenu((prev) => !prev);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    authService.logout();
    setCurrentUser(null);
    setShowUserMenu(false);
    setShowLogoutConfirm(false);
    navigate('/login', { replace: true });
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const handleViewMap = (mission) => {
    const url = `https://www.google.com/maps?q=${mission.location.lat},${mission.location.lng}`;
    window.open(url, '_blank');
  };

  const handleUpdateMission = async ({ nextStatus, confirmMessage, successMessage, actionKey }) => {
    const normalizedStatus = normalizeOperationStatus(selectedMission?.rawStatus);
    const canUpdate = normalizedStatus === 'ASSIGNED';

    if (!canUpdate) {
      alert('Nhiệm vụ không còn ở trạng thái có thể xử lý.');
      return;
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setUpdating(true);
    setUpdatingAction(actionKey);
    try {
      // Hoàn tất và thất bại/hủy đang đi theo 2 API khác nhau ở tầng service.
      if (actionKey === 'cancel') {
        await rescueTeamService.cancelMissionRequest(selectedMission.requestId);
      } else {
        await rescueTeamService.updateOperationStatus(selectedMission.operationId, nextStatus);
      }

      setMissions((prev) => prev.filter((m) => m.id !== selectedMission.id));
      setSelectedMission(null);
      alert(successMessage);

      fetchMissions({ suppressError: true });
    } catch (err) {
      console.error('Error updating mission:', err);
      const errorMessage = rescueTeamService.getUpdateStatusErrorMessage(err);
      alert(`Lỗi: ${errorMessage}`);

      if (err.response?.status === 401) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    } finally {
      setUpdating(false);
      setUpdatingAction('');
    }
  };

  const handleComplete = async () => {
    await handleUpdateMission({
      nextStatus: 'Completed',
      confirmMessage: 'Xác nhận đội đã hoàn thành nhiệm vụ này? Người dân sẽ nhận được thông báo để bấm Báo an toàn.',
      successMessage: 'Đã ghi nhận đội cứu hộ hoàn tất. Người dân có thể bấm Báo an toàn để hoàn tất yêu cầu.',
      actionKey: 'complete',
    });
  };

  const handleCancelMission = async () => {
    await handleUpdateMission({
      nextStatus: 'Cancelled',
      confirmMessage: 'Xác nhận hủy nhiệm vụ này và chuyển yêu cầu sang trạng thái đã hủy?',
      successMessage: 'Đã hủy nhiệm vụ thành công.',
      actionKey: 'cancel',
    });
  };

  const handleCopyCoordinates = (lat, lng) => {
    const coordinates = `${lat}, ${lng}`;
    navigator.clipboard.writeText(coordinates).then(() => {
      alert('Đã sao chép tọa độ: ' + coordinates);
    }).catch(err => {
      console.error('Không thể sao chép:', err);
    });
  };

  return (
    <div className="rescue-dashboard">
      <LogoutConfirmModal open={showLogoutConfirm} onConfirm={handleLogoutConfirm} onCancel={handleLogoutCancel} />
      {/* Header */}
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

      {/* Content */}
      <div className="rescue-content">
        {loading ? (
          /* Trạng thái: Đang tải */
          <div className="no-mission-container">
            <div className="no-mission-box">
              <div className="no-mission-icon">⏳</div>
              <h2>Đang tải danh sách nhiệm vụ...</h2>
            </div>
          </div>
        ) : error ? (
          /* Trạng thái: Có lỗi */
          <div className="no-mission-container">
            <div className="no-mission-box">
              <h2>Không thể tải danh sách nhiệm vụ</h2>
              <p>{error}</p>
              <button 
                className="btn-retry"
                onClick={() => {
                  setLoading(true);
                  fetchMissions();
                }}
              >
                Thử lại
              </button>
            </div>
          </div>
        ) : missions.length === 0 ? (
          /* Trạng thái: Không có nhiệm vụ */
          <div className="no-mission-container">
            <div className="no-mission-box">
              <h2>Hiện tại không có nhiệm vụ cứu hộ.</h2>
              <p>Vui lòng chờ điều phối.</p>
            </div>
          </div>
        ) : !selectedMission ? (
          /* Trạng thái: Có nhiệm vụ - Hiển thị danh sách */
          <div className="mission-list-container">
            <h2 className="mission-list-title">Danh sách nhiệm vụ được giao</h2>
            <div className="mission-table-wrapper">
              <table className="mission-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} className="sortable-header">
                      Operation ID 
                      <span className="sort-icon">
                        {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '▴'}
                      </span>
                    </th>
                    <th onClick={() => handleSort('address')} className="sortable-header">
                      Địa chỉ 
                      <span className="sort-icon">
                        {sortConfig.key === 'address' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '▴'}
                      </span>
                    </th>
                    <th onClick={() => handleSort('phone')} className="sortable-header">
                      Số điện thoại 
                      <span className="sort-icon">
                        {sortConfig.key === 'phone' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '▴'}
                      </span>
                    </th>
                    <th onClick={() => handleSort('priority')} className="sortable-header">
                      Mức độ ưu tiên 
                      <span className="sort-icon">
                        {sortConfig.key === 'priority' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '▴'}
                      </span>
                    </th>
                    <th onClick={() => handleSort('time')} className="sortable-header">
                      Thời gian xử lý 
                      <span className="sort-icon">
                        {sortConfig.key === 'time' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '▴'}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedMissions().map((mission, index) => (
                    <tr 
                      key={mission.id}
                      onClick={() => handleSelectMission(mission)}
                      className="mission-row"
                    >
                      <td>{mission.id}</td>
                      <td>{mission.address}</td>
                      <td>{mission.phone}</td>
                      <td>
                        <span className={`priority-badge ${getPriorityClassName(mission.priority)}`}>
                          {mission.priority}
                        </span>
                      </td>
                      <td>{mission.estimatedTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Trạng thái: Xem chi tiết nhiệm vụ */
          <div className="mission-container" style={{position: 'relative'}}>
            {/* Nút X đóng form */}
            <button
              className="close-chrome-btn"
              aria-label="Đóng chi tiết nhiệm vụ"
              onClick={() => setSelectedMission(null)}
            >
              <span className="close-chrome-icon">×</span>
            </button>
            <div className="mission-content">
              <div className="mission-left">
                <div className="mission-card">
                  <label>Địa chỉ</label>
                  <div className="info-value">{selectedMission.address}</div>
                </div>
                <div className="mission-card">
                  <label>Số điện thoại</label>
                  <div className="info-value">{selectedMission.phone}</div>
                </div>
                <div className="mission-card large">
                  <label>Bản đồ vị trí</label>
                  <button className="btn-map" onClick={() => handleViewMap(selectedMission)}>
                    🗺️ Xem trên Google Maps
                  </button>
                  <div className="coordinates-container">
                    <div className="coordinates-display">
                      <span className="coordinate-icon">📍</span>
                      <div className="coordinate-text">
                        <div className="coordinate-label">Tọa độ:</div>
                        <div className="coordinate-value">
                          {selectedMission.location.lat}, {selectedMission.location.lng}
                        </div>
                      </div>
                    </div>
                    <button 
                      className="btn-copy-coordinates"
                      onClick={() => handleCopyCoordinates(selectedMission.location.lat, selectedMission.location.lng)}
                    >
                      📋 Sao chép
                    </button>
                  </div>
                </div>
              </div>
              <div className="mission-right">
                <div className="mission-card large">
                  <label>Mô tả sự cố</label>
                  <div className="info-value description">
                    {selectedMission.description}
                  </div>
                </div>
                <div className="mission-card">
                  <label>Thời gian xử lý dự kiến</label>
                  <div className="info-value time-estimate">
                    ⏱️ {selectedMission.estimatedTime}
                  </div>
                </div>
                <div className="action-buttons">
                  <button
                    className="btn-cancel-mission"
                    onClick={handleCancelMission}
                    disabled={updating}
                  >
                    {updating && updatingAction === 'cancel' ? 'Đang xử lý...' : 'Thất bại'}
                  </button>
                  <button 
                    className="btn-complete" 
                    onClick={handleComplete}
                    disabled={updating}
                  >
                    {updating && updatingAction === 'complete' ? 'Đang xử lý...' : 'Hoàn tất'}
                  </button>
                </div>
                <div className="action-buttons" style={{marginTop: 10, justifyContent: 'center'}}>
                  {/* Back button removed as requested */}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RescueTeamDashboard;

