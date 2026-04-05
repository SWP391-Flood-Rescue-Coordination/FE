import React, { useState, useEffect } from 'react';
import LogoutConfirmModal from './LogoutConfirmModal';
import './RescueTeamDashboard.css';
import rescueTeamService from '../services/rescueTeamService';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowLeftOnRectangleIcon,
  UserCircleIcon,
  UsersIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
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

  // TODO: REMOVE MOCK DATA - Fetch từ API: GET /api/rescue-team/info
  const [teamInfo, setTeamInfo] = useState({
    teamId: '',
    teamName: '',
    baseLocation: '',
    phone: '',
    totalMembers: 0,
    activeMembers: 0,
  })

  // TODO: REMOVE MOCK DATA - Fetch từ API: GET /api/rescue-team/members
  const [teamMembers, setTeamMembers] = useState([])
  const [expandedMemberId, setExpandedMemberId] = useState(null)

  // CRUD Team states
  const [showTeamCrudModal, setShowTeamCrudModal] = useState(false)
  const [crudMode, setCrudMode] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [teamFormData, setTeamFormData] = useState({
    teamName: '',
    baseLocation: '',
    phone: '',
    totalMembers: '',
  })
  // TODO: REMOVE MOCK DATA - Fetch từ API: GET /api/rescue-teams
  const [rescueTeams, setRescueTeams] = useState([])

  // Tab state
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'teams' | 'members'
  const userMenuRef = React.useRef(null);
  const roleLabel = ROLE_LABEL_MAP[String(currentUser?.role ?? '').toUpperCase()] || currentUser?.role || '-';

  // ============================================
  // CRUD Team handlers
  // ============================================
  const handleOpenCrudModal = (mode, team = null) => {
    setCrudMode(mode)
    setSelectedTeam(team)
    if (team) {
      setTeamFormData({
        teamName: team.teamName,
        baseLocation: team.baseLocation,
        phone: team.phone,
        totalMembers: team.totalMembers.toString(),
      })
    } else {
      setTeamFormData({ teamName: '', baseLocation: '', phone: '', totalMembers: '' })
    }
    setShowTeamCrudModal(true)
  }

  const handleCloseCrudModal = () => {
    setShowTeamCrudModal(false)
    setCrudMode(null)
    setSelectedTeam(null)
    setTeamFormData({ teamName: '', baseLocation: '', phone: '', totalMembers: '' })
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setTeamFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveTeam = () => {
    if (!teamFormData.teamName.trim() || !teamFormData.baseLocation.trim() || !teamFormData.phone.trim() || !teamFormData.totalMembers.trim()) {
      alert('Vui lòng điền đầy đủ thông tin')
      return
    }

    if (crudMode === 'add') {
      const newTeam = {
        id: `TEAM_${Date.now()}`,
        teamName: teamFormData.teamName,
        baseLocation: teamFormData.baseLocation,
        phone: teamFormData.phone,
        totalMembers: parseInt(teamFormData.totalMembers),
      }
      setRescueTeams([...rescueTeams, newTeam])
    } else if (crudMode === 'edit' && selectedTeam) {
      setRescueTeams(rescueTeams.map(team =>
        team.id === selectedTeam.id
          ? {
              ...team,
              teamName: teamFormData.teamName,
              baseLocation: teamFormData.baseLocation,
              phone: teamFormData.phone,
              totalMembers: parseInt(teamFormData.totalMembers),
            }
          : team
      ))
    }
    handleCloseCrudModal()
  }

  const handleDeleteTeam = (teamId) => {
    if (confirm('Bạn chắc chắn muốn xóa đội cứu hộ này?')) {
      setRescueTeams(rescueTeams.filter(team => team.id !== teamId))
      handleCloseCrudModal()
    }
  }

  const toggleMemberExpand = (memberId) => {
    setExpandedMemberId(expandedMemberId === memberId ? null : memberId)
  }

  const getMemberRoleLabel = (role) => {
    return ROLE_LABEL_MAP[role?.toUpperCase()] || role || 'Thành viên'
  }

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

  // TODO: FETCH DATA FROM API - Thêm API calls khi backend sẵn sàng
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       // const teamInfoRes = await api.get('/api/rescue-team/info')
  //       // setTeamInfo(teamInfoRes.data)
  //       
  //       // const membersRes = await api.get('/api/rescue-team/members')
  //       // setTeamMembers(membersRes.data)
  //       
  //       // const teamsRes = await api.get('/api/rescue-teams')
  //       // setRescueTeams(teamsRes.data)
  //     } catch (error) {
  //       console.error('Error fetching rescue team data:', error)
  //     }
  //   }
  //   fetchData()
  // }, [])

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

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '15px 20px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f9f9f9'
      }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '8px 16px',
            border: 'none',
            backgroundColor: activeTab === 'dashboard' ? '#dc2626' : '#f0f0f0',
            color: activeTab === 'dashboard' ? 'white' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: activeTab === 'dashboard' ? '600' : '400'
          }}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          style={{
            padding: '8px 16px',
            border: 'none',
            backgroundColor: activeTab === 'teams' ? '#dc2626' : '#f0f0f0',
            color: activeTab === 'teams' ? 'white' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: activeTab === 'teams' ? '600' : '400'
          }}
        >
          Quản Lý Đội
        </button>
        <button
          onClick={() => setActiveTab('members')}
          style={{
            padding: '8px 16px',
            border: 'none',
            backgroundColor: activeTab === 'members' ? '#dc2626' : '#f0f0f0',
            color: activeTab === 'members' ? 'white' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: activeTab === 'members' ? '600' : '400'
          }}
        >
          Thành Viên
        </button>
      </div>

      {/* Content based on active tab */}
      <div className="rescue-content">
        {activeTab === 'dashboard' && (
        <>
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
        </>
        )}

        {/* Teams Management Tab */}
        {activeTab === 'teams' && (
        <div style={{padding: '20px'}}>
          <div style={{marginBottom: '20px'}}>
            <button
              onClick={() => handleOpenCrudModal('add')}
              style={{
                padding: '10px 18px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              + Tạo Đội Mới
            </button>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {rescueTeams.map((team) => (
              <div key={team.id} style={{
                background: 'white',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div>
                  <h4 style={{fontSize: '15px', fontWeight: '700', margin: '0 0 12px 0'}}>{team.teamName}</h4>
                  <p style={{fontSize: '13px', color: '#6b7280', margin: '6px 0'}}>📍 {team.baseLocation}</p>
                  <p style={{fontSize: '13px', color: '#6b7280', margin: '6px 0'}}>📞 {team.phone}</p>
                  <p style={{fontSize: '13px', color: '#6b7280', margin: '6px 0'}}>👥 {team.totalMembers} thành viên</p>
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                  <button
                    onClick={() => handleOpenCrudModal('edit', team)}
                    style={{
                      width: '36px', height: '36px',
                      border: '1px solid #e5e5e5',
                      background: 'white',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#3b82f6'
                    }}
                    title="Chỉnh sửa"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleOpenCrudModal('delete', team)}
                    style={{
                      width: '36px', height: '36px',
                      border: '1px solid #e5e5e5',
                      background: 'white',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ef4444'
                    }}
                    title="Xóa"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
          {rescueTeams.length === 0 && (
            <div style={{textAlign: 'center', padding: '40px', color: '#999'}}>
              <p>Chưa có đội cứu hộ nào. Hãy tạo đội mới!</p>
            </div>
          )}
        </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
        <div style={{padding: '20px'}}>
          <h2 style={{marginTop: 0}}>Danh Sách Thành Viên Đội</h2>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {teamMembers.map((member) => {
              const isExpanded = expandedMemberId === member.id
              return (
                <div key={member.id} style={{
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  background: 'white'
                }}>
                  <div
                    onClick={() => toggleMemberExpand(member.id)}
                    style={{
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{fontWeight: '600', color: '#1f2937'}}>
                        {member.name}
                        {member.role === 'RESCUE_TEAM_LEADER' && (
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 8px',
                            background: '#fef3c7',
                            color: '#92400e',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>Trưởng Đội</span>
                        )}
                      </div>
                      <div style={{fontSize: '12px', color: '#6b7280', marginTop: '2px'}}>
                        {getMemberRoleLabel(member.role)}
                      </div>
                      <div style={{fontSize: '13px', fontWeight: '600', color: '#dc2626', marginTop: '4px'}}>
                        {member.request_id ? `Y/C: ${member.request_id}` : 'Chưa giao'}
                      </div>
                    </div>
                    <div>
                      {isExpanded ? '▲' : '▼'}
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{
                      padding: '12px',
                      borderTop: '1px solid #e5e5e5',
                      backgroundColor: '#fafafa'
                    }}>
                      <div style={{marginBottom: '10px'}}>
                        <label style={{fontSize: '12px', fontWeight: '600', color: '#374151'}}>Số Điện Thoại</label>
                        <div style={{fontSize: '13px', color: '#6b7280'}}>{member.phone}</div>
                      </div>
                      <div style={{marginBottom: '10px'}}>
                        <label style={{fontSize: '12px', fontWeight: '600', color: '#374151'}}>Ngày Tham Gia</label>
                        <div style={{fontSize: '13px', color: '#6b7280'}}>{member.joinDate}</div>
                      </div>
                      <div>
                        <label style={{fontSize: '12px', fontWeight: '600', color: '#374151'}}>Nhiệm Vụ</label>
                        <div style={{fontSize: '13px', color: '#6b7280'}}>
                          Giao: {member.assignedRequests || 0} | Hoàn thành: {member.completedRequests || 0}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {teamMembers.length === 0 && (
            <div style={{textAlign: 'center', padding: '40px', color: '#999'}}>
              <p>Chưa có thành viên nào trong đội.</p>
            </div>
          )}
        </div>
        )}
      </div>

      {/* CRUD Modal */}
      {showTeamCrudModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={handleCloseCrudModal}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
          }} onClick={(e) => e.stopPropagation()}>
            {crudMode === 'delete' ? (
              <>
                <h3 style={{fontSize: '18px', fontWeight: '700', margin: '0 0 16px 0'}}>Xóa Đội Cứu Hộ</h3>
                <p style={{fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0'}}>
                  Bạn chắc chắn muốn xóa đội <strong>{selectedTeam?.teamName}</strong>?
                </p>
                <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px'}}>
                  <button
                    onClick={handleCloseCrudModal}
                    style={{
                      padding: '10px 20px',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(selectedTeam?.id)}
                    style={{
                      padding: '10px 20px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{fontSize: '18px', fontWeight: '700', margin: '0 0 16px 0'}}>
                  {crudMode === 'add' ? 'Tạo Đội Cứu Hộ Mới' : 'Chỉnh Sửa Thông Tin Đội'}
                </h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <div>
                    <label style={{fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px'}}>Tên Đội</label>
                    <input
                      type="text"
                      name="teamName"
                      placeholder="Ví dụ: Đội Cứu Hộ Số 3"
                      value={teamFormData.teamName}
                      onChange={handleFormChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px'}}>Địa Điểm Đặt Trụ Sở</label>
                    <input
                      type="text"
                      name="baseLocation"
                      placeholder="Ví dụ: Quận 7, TP.HCM"
                      value={teamFormData.baseLocation}
                      onChange={handleFormChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px'}}>Số Điện Thoại</label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Ví dụ: 0903-456-789"
                      value={teamFormData.phone}
                      onChange={handleFormChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px'}}>Tổng Số Thành Viên</label>
                    <input
                      type="number"
                      name="totalMembers"
                      min="1"
                      placeholder="Ví dụ: 10"
                      value={teamFormData.totalMembers}
                      onChange={handleFormChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px'}}>
                    <button
                      onClick={handleCloseCrudModal}
                      style={{
                        padding: '10px 20px',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleSaveTeam}
                      style={{
                        padding: '10px 20px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      {crudMode === 'add' ? 'Tạo Đội' : 'Cập Nhật'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RescueTeamDashboard;

