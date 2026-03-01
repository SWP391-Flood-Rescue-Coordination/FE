import React, { useState, useEffect } from 'react';
import rescueRequestService from '../services/rescueRequestService';
import './ViewRequest.css';

function ViewRequest({ onClose, requestData, requestId }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState(requestData || {
    phone: '',
    location: '',
    address: '',
    totalPeople: 0,
    conditions: {
      needSupplies: false,
      houseCollapsed: false,
      needMedical: false,
      floodUnder1m: false,
      floodOver1m: false
    },
    notes: '',
    status: 'Pending'
  });

  // Load data from API if only requestId is provided
  useEffect(() => {
    const loadRequestData = async () => {
      if (requestId && !requestData) {
        setIsLoading(true);
        setErrorMessage('');
        try {
          const data = await rescueRequestService.getRequestById(requestId);
          const formattedData = rescueRequestService.toRequestFormData(data);
          setFormData(formattedData);
        } catch (error) {
          setErrorMessage('Không thể tải dữ liệu yêu cầu. Vui lòng thử lại.');
          console.error('Error loading request:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadRequestData();
  }, [requestId, requestData]);

  const normalizedStatus = rescueRequestService.normalizeStatus(formData.status);
  const isApproved = normalizedStatus === 'COMPLETED' || normalizedStatus === 'CANCELLED' || normalizedStatus === 'DUPLICATE';
  const isTerminal = rescueRequestService.isTerminalStatus(formData.status);

  const getStatusLabel = (status) => {
    const statusMap = {
      'PENDING': 'Đang chờ xử lý',
      'VERIFIED': 'Đã xác minh',
      'ASSIGNED': 'Đã phân công',
      'IN_PROGRESS': 'Đang cứu hộ',
      'COMPLETED': 'Đã hoàn thành',
      'CANCELLED': 'Đã hủy',
      'DUPLICATE': 'Trùng lặp'
    };
    return statusMap[rescueRequestService.normalizeStatus(status)] || status;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      console.log('Request updated:', formData);
      setIsEditing(false);
      // Có thể gọi API để cập nhật ở đây
    }
  };

  const handleEditClick = (e) => {
    if (!isApproved) {
      if (!isEditing) {
        e.preventDefault();
        setIsEditing(true);
      }
      // Nếu isEditing = true, để form submit tự nhiên
    }
  };

  const handleConditionChange = (condition) => {
    setFormData({
      ...formData,
      conditions: {
        ...formData.conditions,
        [condition]: !formData.conditions[condition]
      }
    });
  };

  return (
    <div className="request-overlay">
      <div className="request-modal">
        <h2>Trạng Thái Yêu Cầu Cứu Hộ</h2>

        {isLoading && (
          <div className="request-feedback request-feedback-info">
            Đang tải dữ liệu...
          </div>
        )}

        {errorMessage && (
          <div className="request-feedback request-feedback-error">
            {errorMessage}
          </div>
        )}

        {!isLoading && formData.status && (
          <div className={`status-banner status-${normalizedStatus.toLowerCase()}`}>
            <strong>Trạng thái:</strong> {getStatusLabel(formData.status)}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-left">
              {/* Số điện thoại */}
              <div className="form-field">
                <label>Số điện thoại</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  disabled={!isEditing}
                  required
                />
              </div>

              {/* Vị trí */}
              <div className="form-field">
                <label>Vị trí</label>
                <div className="location-group">
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    disabled={!isEditing}
                    required
                  />
                  <button 
                    type="button" 
                    className="location-btn"
                    disabled={!isEditing}
                  >
                    📍 Chọn vị trí trên bản đồ
                  </button>
                </div>
              </div>

              {/* Địa chỉ */}
              <div className="form-field">
                <label>Địa chỉ</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  disabled={!isEditing}
                  required
                />
              </div>

              {/* Số người */}
              <div className="form-field">
                <label>Số người</label>
                <input
                  type="number"
                  value={formData.totalPeople}
                  onChange={(e) => setFormData({...formData, totalPeople: parseInt(e.target.value) || 0})}
                  disabled={!isEditing}
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="form-right">
              {/* Tình trạng */}
              <div className="form-field">
                <label>Tình trạng</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.needSupplies}
                      onChange={() => handleConditionChange('needSupplies')}
                      disabled={!isEditing}
                    />
                    Hết nhu yếu phẩm
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.houseCollapsed}
                      onChange={() => handleConditionChange('houseCollapsed')}
                      disabled={!isEditing}
                    />
                    Sập nhà
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.needMedical}
                      onChange={() => handleConditionChange('needMedical')}
                      disabled={!isEditing}
                    />
                    Cần điều trị y tế
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.floodUnder1m}
                      onChange={() => handleConditionChange('floodUnder1m')}
                      disabled={!isEditing}
                    />
                    Ngập &lt; 1m
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.floodOver1m}
                      onChange={() => handleConditionChange('floodOver1m')}
                      disabled={!isEditing}
                    />
                    Ngập &gt; 1m
                  </label>
                </div>
              </div>

              {/* Ghi chú */}
              <div className="form-field">
                <label>Ghi chú:</label>
                <textarea
                  rows="5"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  disabled={!isEditing}
                ></textarea>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type={isEditing ? "submit" : "button"}
              className={`submit-btn ${isTerminal || isLoading ? 'disabled' : ''}`}
              onClick={handleEditClick}
              disabled={isTerminal || isLoading}
            >
              {isEditing ? 'Lưu thay đổi' : 'Chỉnh sửa'}
            </button>
            <button type="button" className="cancel-btn" onClick={onClose} disabled={isLoading}>
              Đóng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ViewRequest;
