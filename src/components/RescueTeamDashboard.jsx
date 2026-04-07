import React, { useState, useEffect } from 'react';
import LogoutConfirmModal from './LogoutConfirmModal';
import './RescueTeamDashboard.css';
import rescueTeamService from '../services/rescueTeamService';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowLeftOnRectangleIcon,
  UserCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
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
  RESCUE_TEAM_LEADER: 'Trưởng đội cứu hộ',
  RESCUE_TEAM_MEMBER: 'Thành viên đội cứu hộ',
  COORDINATOR: 'Điều phối viên',
  MANAGER: 'Quản lý',
  ADMIN: 'Quản trị viên',
  CITIZEN: 'Công dân',
};

// Dashboard của rescue team gồm 2 mode chính:
// danh sách nhiệm vụ được giao và màn chi tiết để hoàn tất / thất bại.
function RescueTeamDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
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
  
  // ===== Team Leader State =====
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('priority');
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  
  const userMenuRef = React.useRef(null);
  const roleLabel = ROLE_LABEL_MAP[String(currentUser?.role ?? '').toUpperCase()] || currentUser?.role || '-';

  // ============================================
  // Role-based access control
  // ============================================
  const isRescueTeam = currentUser?.role?.toUpperCase() === 'RESCUE_TEAM' || 
                       currentUser?.role?.toUpperCase() === 'RESCUE_TEAM_LEADER' ||
                       currentUser?.role?.toUpperCase() === 'RESCUE_TEAM_MEMBER';

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

  // ============================================
  // Fetch team members (Leader only)
  // ============================================
  const fetchTeamMembers = async () => {
    try {
      setMemberLoading(true);
      const data = await rescueTeamService.getTeamMembers();
      setTeamMembers(data);
    } catch (err) {
      // Silently fail if members can't load
    } finally {
      setMemberLoading(false);
    }
  };

  // ============================================
  // Fetch team assigned requests (Leader only)
  // ============================================
  const fetchTeamAssignedRequests = async () => {
    try {
      const data = await rescueTeamService.getTeamAssignedRequests();
      setRequests(data);
    } catch (err) {
      // Silently fail if requests can't load
    }
  };

  // Load missions khi component mount
  useEffect(() => {
    // ===== ROLE VALIDATION: Chỉ RESCUE_TEAM LEADER được vào trang này =====
    if (!currentUser) {
      // Chưa login - redirect về login
      navigate('/login', { replace: true });
      return;
    }

    const role = String(currentUser?.role ?? '').toUpperCase();
    const userName = String(currentUser?.userName ?? currentUser?.username ?? '').toLowerCase();
    
    // DB lưu leader là "RESCUE_TEAM", nhưng phải có "leader" trong username
    if (role !== 'RESCUE_TEAM' && role !== 'RESCUE_TEAM_LEADER') {
      // Role sai - redirect về home
      alert('Bạn không có quyền truy cập trang này! Chỉ Trưởng đội cứu hộ mới có quyền.');
      navigate('/', { replace: true });
      return;
    }
    
    // Nếu RESCUE_TEAM nhưng username không có "leader", đó là member - redirect về member page
    if (role === 'RESCUE_TEAM' && !userName.includes('leader')) {
      alert('Bạn là thành viên đội. Vui lòng vào trang Nhiệm vụ Cá nhân.');
      navigate('/rescue-team-member', { replace: true });
      return;
    }

    // Fetch data sau khi validate role thành công
    fetchMissions();
    fetchTeamMembers();
    fetchTeamAssignedRequests();
    
    // Auto-refresh mỗi 30 giây
    const interval = setInterval(() => {
      fetchMissions();
      fetchTeamAssignedRequests();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [currentUser, navigate]);

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

  // ============================================
  // Leader Action Handlers
  // ============================================
  const handleAcceptRequest = async () => {
    if (!selectedMission) return;
    
    if (!window.confirm(`Xác nhận tiếp nhận yêu cầu #${selectedMission.requestId}?`)) {
      return;
    }

    setUpdating(true);
    setUpdatingAction('accept');
    try {
      await rescueTeamService.acceptRequest(selectedMission.requestId);
      setError(null);
      alert('Tiếp nhận yêu cầu thành công! Bây giờ bạn có thể giao nhiệm vụ cho các thành viên.');
      await fetchMissions({ suppressError: true });
      setSelectedMission(null);
    } catch (err) {
      const errorMessage = rescueTeamService.getAcceptRejectErrorMessage(err);
      setError(`Lỗi: ${errorMessage}`);
    } finally {
      setUpdating(false);
      setUpdatingAction('');
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedMission) return;
    
    const reason = window.prompt('Vui lòng nhập lý do từ chối (nếu có):');
    if (reason === null) return; // User cancelled

    if (!window.confirm(`Xác nhận từ chối yêu cầu #${selectedMission.requestId}?`)) {
      return;
    }

    setUpdating(true);
    setUpdatingAction('reject');
    try {
      await rescueTeamService.rejectRequest(selectedMission.requestId, reason);
      setError(null);
      alert('Từ chối yêu cầu thành công. Yêu cầu sẽ quay trở lại trạng thái Chờ xử lý.');
      await fetchMissions({ suppressError: true });
      setSelectedMission(null);
    } catch (err) {
      const errorMessage = rescueTeamService.getAcceptRejectErrorMessage(err);
      setError(`Lỗi: ${errorMessage}`);
    } finally {
      setUpdating(false);
      setUpdatingAction('');
    }
  };

  const handleOpenAssignModal = () => {
    if (!selectedMission) return;
    setSelectedMembers([]);
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedMembers([]);
  };

  const handleToggleMemberSelection = (memberId) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleAssignMembers = async () => {
    if (!selectedMission || selectedMembers.length === 0) {
      alert('Vui lòng chọn ít nhất một thành viên.');
      return;
    }

    if (!window.confirm(`Xác nhận giao nhiệm vụ cho ${selectedMembers.length} thành viên?`)) {
      return;
    }

    setUpdating(true);
    setUpdatingAction('accept-assign');
    try {
      console.log('📋 Request details before assign:', {
        requestId: selectedMission.requestId,
        status: selectedMission.status,
        members: selectedMembers
      });
      
      // Assign members directly (coordinator already assigned request to team)
      // No need to accept first - just assign members to the request
      console.log('⏳ Assigning members to request...');
      const response = await rescueTeamService.assignTaskToMembers(
        selectedMission.requestId,
        selectedMembers
      );
      console.log('✅ Members assigned successfully');
      
      setError(null);
      
      const assigned = response?.assignedUserIds?.length || 0;
      const skipped = response?.skippedUserIds?.length || 0;
      
      let message = `Đã giao nhiệm vụ cho ${assigned} thành viên.`;
      if (skipped > 0) {
        message += ` ${skipped} thành viên đang bận hoặc không khả dụng.`;
      }
      alert(message);
      
      handleCloseAssignModal();
      await fetchMissions({ suppressError: true });
    } catch (err) {
      const errorMessage = rescueTeamService.getAssignMembersErrorMessage(err);
      setError(`Lỗi: ${errorMessage}`);
    } finally {
      setUpdating(false);
      setUpdatingAction('');
    }
  };

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
    });
  };

  // ============================================
  // Team Leader Handlers
  // ============================================
  const REQUEST_STATUS_MAP = {
    PENDING: { label: 'Chờ Chấp Nhận', className: 'status-pending', color: '#f59e0b' },
    ACCEPTED: { label: 'Đã Chấp Nhận', className: 'status-accepted', color: '#10b981' },
    REJECTED: { label: 'Bị Từ Chối', className: 'status-rejected', color: '#ef4444' },
    IN_PROGRESS: { label: 'Đang Thực Hiện', className: 'status-in-progress', color: '#3b82f6' },
    COMPLETED: { label: 'Hoàn Tất', className: 'status-completed', color: '#059669' },
  };

  const PRIORITY_MAP = {
    URGENT: { label: 'Khẩn Cấp', className: 'priority-urgent' },
    HIGH: { label: 'Cao', className: 'priority-high' },
    MEDIUM: { label: 'Trung Bình', className: 'priority-medium' },
    LOW: { label: 'Thấp', className: 'priority-low' },
  };

  const getStatusInfo = (status) => REQUEST_STATUS_MAP[status] || REQUEST_STATUS_MAP['PENDING'];
  const getPriorityInfo = (priority) => PRIORITY_MAP[priority] || PRIORITY_MAP['MEDIUM'];

  const filteredRequests = requests.filter((req) => {
    if (filterStatus === 'ALL') return true;
    return req.status === filterStatus;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
    } else if (sortBy === 'time') {
      return new Date(b.assignedAt) - new Date(a.assignedAt);
    }
    return 0;
  });



  const getAssignedMemberNames = (memberIds) => {
    return memberIds
      .map((id) => teamMembers.find((m) => m.id === id)?.name)
      .filter(Boolean)
      .join(', ');
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

      {/* ===== ACCESS CONTROL ===== */}
      {!isRescueTeam ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: '#dc2626'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>⚠️</div>
          <h2>Truy cập bị từ chối</h2>
          <p>Chỉ các thành viên đội cứu hộ mới có thể xem trang này.</p>
        </div>
      ) : (
        <>
      {/* Navigation Tabs */}
      {/* TODO: Navigation tabs tạm ẩn - giữ lại routes nhưng không hiển thị nút điều hướng
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '15px 20px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f9f9f9'
      }}>
        <button
          onClick={() => {}}
          style={{
            padding: '8px 16px',
            border: 'none',
            backgroundColor: location.pathname === '/rescue-team' ? '#dc2626' : '#f0f0f0',
            color: location.pathname === '/rescue-team' ? 'white' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: location.pathname === '/rescue-team' ? '600' : '400'
          }}
          disabled={location.pathname === '/rescue-team'}
        >
          Trang Chủ
        </button>
        <button
          onClick={() => navigate('/rescue-team/member')}
          style={{
            padding: '8px 16px',
            border: 'none',
            backgroundColor: location.pathname === '/rescue-team/member' ? '#dc2626' : '#f0f0f0',
            color: location.pathname === '/rescue-team/member' ? 'white' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: location.pathname === '/rescue-team/member' ? '600' : '400'
          }}
        >
          Thành Viên
        </button>
      </div>
      */}

      {/* ===== QUẢN LÝ ĐỘI SECTION (Team Leader & Members) ===== */}
      {/* TODO: Khi có API, thay requests & teamMembers từ backend */}
      <div style={{padding: '20px', borderBottom: '2px solid #e5e5e5', backgroundColor: '#fafafa'}}>
          
          {/* Filters & Sort */}
          <div style={{display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap'}}>
            <div>
              <label style={{fontSize: '12px', color: '#666', marginRight: '8px'}}>Trạng Thái:</label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ddd'}}
              >
                <option value="ALL">Tất Cả</option>
                <option value="PENDING">Chờ Chấp Nhận</option>
                <option value="ACCEPTED">Đã Chấp Nhận</option>
                <option value="REJECTED">Bị Từ Chối</option>
              </select>
            </div>
            <div>
              <label style={{fontSize: '12px', color: '#666', marginRight: '8px'}}>Sắp Xếp:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                style={{padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ddd'}}
              >
                <option value="priority">Độ Ưu Tiên</option>
                <option value="time">Thời Gian Xử lý(Nhanh Nhất)</option>
              </select>
            </div>
          </div>

          {/* Requests List */}
          <div style={{display: 'grid', gap: '10px'}}>
            {sortedRequests.length === 0 ? (
              <div style={{textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px'}}>
                <p>Không có yêu cầu cứu hộ nào</p>
              </div>
            ) : (
              sortedRequests.map((request) => {
                  const statusInfo = getStatusInfo(request.status);
                  const priorityInfo = getPriorityInfo(request.priority);
                  const isExpanded = expandedRequestId === request.id;

                  return (
                    <div key={request.id} style={{
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      backgroundColor: 'white'
                    }}>
                      {/* Header - Click to expand */}
                      <div 
                        onClick={() => setExpandedRequestId(isExpanded ? null : request.id)}
                        style={{
                          padding: '12px',
                          display: 'grid',
                          gridTemplateColumns: '80px 70px 1fr 110px 90px 65px 30px',
                          gap: '12px',
                          alignItems: 'center',
                          backgroundColor: '#f9f9f9',
                          borderBottom: isExpanded ? '1px solid #ddd' : 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        <span style={{
                          background: request.priority === 'URGENT' ? '#f97316' : request.priority === 'HIGH' ? '#fbbf24' : '#6b7280',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          fontWeight: '600',
                          textAlign: 'center'
                        }}>
                          {priorityInfo.label}
                        </span>
                        <span style={{fontWeight: '600', textAlign: 'center'}}>#{request.requestId}</span>
                        <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#374151'}}>
                          {request.address}
                        </span>
                        <span style={{color: '#374151', textAlign: 'center'}}>{request.phone}</span>
                        <span style={{background: '#e5e7eb', padding: '2px 6px', borderRadius: '3px', fontSize: '11px', color: '#374151', textAlign: 'center'}}>
                          {statusInfo.label}
                        </span>
                        <span style={{color: '#374151', textAlign: 'center'}}>{request.estimatedTime}</span>
                        <span style={{textAlign: 'center'}}>{isExpanded ? '▲' : '▼'}</span>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div style={{padding: '12px', backgroundColor: '#fafafa', fontSize: '12px', color: '#374151'}}>
                          <div style={{marginBottom: '8px'}}><strong>Địa Chỉ:</strong> {request.address}</div>
                          <div style={{marginBottom: '8px'}}><strong>SĐT:</strong> <a href={`tel:${request.phone}`} style={{color: '#0066cc', textDecoration: 'none'}}>{request.phone}</a></div>
                          <div style={{marginBottom: '8px'}}><strong>Mô Tả:</strong> {request.description}</div>
                          <div style={{marginBottom: '8px'}}><strong>Tổng số người:</strong> {request.numberOfAffectedPeople} (Người lớn: {request.adultCount}, Người già: {request.elderlyCount}, Trẻ em: {request.childrenCount})</div>
                          {request.assignedMembers && request.assignedMembers.length > 0 && (
                            <div style={{marginBottom: '8px'}}><strong>Giao cho:</strong> {getAssignedMemberNames(request.assignedMembers)}</div>
                          )}
                          
                          {/* Action Buttons */}
                          {(request.status === 'Assigned' || request.status === 'Verified') && (
                            <div style={{display: 'flex', gap: '6px', marginTop: '12px'}}>
                              <button
                                onClick={() => {
                                  setSelectedMission(request);
                                  setSelectedRequest(request);
                                  setSelectedMembers([]);
                                  setShowAssignModal(true);
                                }}
                                style={{padding: '6px 12px', fontSize: '11px', background: '#10b981', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}
                              >
                                ✓ Chấp Nhận & Giao việc
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedMission(request);
                                  handleRejectRequest(request.requestId);
                                }}
                                style={{padding: '6px 12px', fontSize: '11px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}
                              >
                                ✕ Từ Chối
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>

      
      {/* Content based on active tab - HIDDEN for leader view */}
      {null}
      </>
      )}

      {/* Assign Members Modal */}
      {showAssignModal && selectedRequest && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000
        }} onClick={() => setShowAssignModal(false)}>
          <div style={{
            backgroundColor: 'white', borderRadius: '8px', padding: '24px', maxWidth: '500px', width: '90%',
            maxHeight: '90vh', overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
              <h3 style={{margin: 0, fontSize: '16px', fontWeight: '600'}}>Giao Việc Cho Thành Viên</h3>
              <button onClick={() => setShowAssignModal(false)} style={{background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer'}}>✕</button>
            </div>
            
            <div style={{marginBottom: '16px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px'}}>
              <p style={{margin: '4px 0'}}><strong>Yêu cầu:</strong> {selectedRequest.requestId}</p>
              <p style={{margin: '4px 0'}}><strong>Địa chỉ:</strong> {selectedRequest.address}</p>
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '600'}}>
                Chọn thành viên:
              </label>
              {teamMembers.length === 0 ? (
                <p style={{fontSize: '12px', color: '#999'}}>Không có thành viên trong đội</p>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto'}}>
                  {teamMembers.map((member) => (
                    <label key={member.id} style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer'}}>
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, member.id]);
                          } else {
                            setSelectedMembers(selectedMembers.filter((id) => id !== member.id));
                          }
                        }}
                      />
                      <span>{member.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{padding: '8px 16px', fontSize: '12px', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
              >
                Hủy
              </button>
              <button
                onClick={handleAssignMembers}
                style={{padding: '8px 16px', fontSize: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
              >
                Giao Việc
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default RescueTeamDashboard;

