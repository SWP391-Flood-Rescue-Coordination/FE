import React, { useState, useEffect } from 'react';
import './RescueTeamDashboard.css';
import rescueTeamService from '../services/rescueTeamService';
import authService from '../services/authService';

function RescueTeamDashboard() {
  // State: danh sách nhiệm vụ và nhiệm vụ được chọn
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  // ============================================
  // Fetch missions từ API
  // ============================================
  const fetchMissions = async () => {
    try {
      setError(null);
      const data = await rescueTeamService.getMyOperations();
      setMissions(data);
    } catch (err) {
      console.error('Error fetching missions:', err);
      const errorMessage = rescueTeamService.getOperationsErrorMessage(err);
      setError(errorMessage);
      
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

  const handleViewMap = (mission) => {
    const url = `https://www.google.com/maps?q=${mission.location.lat},${mission.location.lng}`;
    window.open(url, '_blank');
  };

  const handleComplete = async () => {
    // Logic thông minh: tự động xử lý dựa vào status hiện tại
    const currentStatus = selectedMission.rawStatus;
    
    if (currentStatus === 'Assigned') {
      // Nếu chưa bắt đầu, phải bắt đầu trước
      if (!window.confirm('Nhiệm vụ chưa bắt đầu. Bắt đầu thực hiện ngay bây giờ?')) {
        return;
      }
      
      await handleStartMission();
      return;
    }
    
    if (currentStatus === 'In Progress') {
      if (!window.confirm('Xác nhận hoàn tất nhiệm vụ cứu hộ này?')) {
        return;
      }

      setUpdating(true);
      try {
        // Gọi API update status sang "Completed"
        await rescueTeamService.updateOperationStatus(
          selectedMission.operationId,
          'Completed'
        );
        
        // Xóa nhiệm vụ khỏi danh sách local (vì đã completed)
        setMissions(missions.filter(m => m.id !== selectedMission.id));
        setSelectedMission(null);
        alert('Đã hoàn tất nhiệm vụ thành công!');
        
        // Refresh lại danh sách
        await fetchMissions();
      } catch (err) {
        console.error('Error completing mission:', err);
        const errorMessage = rescueTeamService.getUpdateStatusErrorMessage(err);
        alert(`Lỗi: ${errorMessage}`);
        
        // Nếu 401, redirect về login
        if (err.response?.status === 401) {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      } finally {
        setUpdating(false);
      }
    }
  };

  const handleStartMission = async () => {
    if (!window.confirm('Xác nhận bắt đầu thực hiện nhiệm vụ này?')) {
      return;
    }

    setUpdating(true);
    try {
      // Gọi API update status sang "In Progress"
      await rescueTeamService.updateOperationStatus(
        selectedMission.operationId,
        'In Progress'
      );
      
      // Update status trong state
      const updatedMissions = missions.map(m => 
        m.id === selectedMission.id 
          ? { ...m, status: 'Đang thực hiện', rawStatus: 'In Progress' }
          : m
      );
      setMissions(updatedMissions);
      
      // Update selected mission
      setSelectedMission({
        ...selectedMission,
        status: 'Đang thực hiện',
        rawStatus: 'In Progress'
      });
      
      alert('Đã bắt đầu thực hiện nhiệm vụ!');
      
      // Refresh lại danh sách
      await fetchMissions();
    } catch (err) {
      console.error('Error starting mission:', err);
      const errorMessage = rescueTeamService.getUpdateStatusErrorMessage(err);
      alert(`Lỗi: ${errorMessage}`);
      
      // Nếu 401, redirect về login
      if (err.response?.status === 401) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleCopyCoordinates = (lat, lng) => {
    const coordinates = `${lat}, ${lng}`;
    navigator.clipboard.writeText(coordinates).then(() => {
      alert('Đã copy tọa độ: ' + coordinates);
    }).catch(err => {
      console.error('Không thể copy:', err);
    });
  };

  return (
    <div className="rescue-dashboard">
      {/* Header */}
      <header className="rescue-header">
        <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>
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
              <div className="no-mission-icon">⚠️</div>
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
              <div className="no-mission-icon">🚁</div>
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
                        <span className={`priority-badge priority-${mission.priority.toLowerCase()}`}>
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
          <div className="mission-container">
            <div className="mission-content">
              {/* Cột trái */}
              <div className="mission-left">
                <div className="mission-card">
                  <label>Địa chỉ</label>
                  <div className="info-value">{selectedMission.address}</div>
                </div>

                <div className="mission-card">
                  <label>SDT</label>
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
                      📋 Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Cột phải */}
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
                    className="btn-back" 
                    onClick={handleBackToList}
                    disabled={updating}
                  >
                    Quay lại
                  </button>
                  
                  <button 
                    className="btn-complete" 
                    onClick={handleComplete}
                    disabled={updating}
                  >
                    {updating ? 'Đang xử lý...' : 'Hoàn tất'}
                  </button>
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
