import React, { useState } from 'react';
import './ViewReport.css';

function ViewReport({ onClose, reportData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(reportData || {
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
    status: 'pending'
  });

  const isApproved = formData.status === 'approved';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      console.log('Report updated:', formData);
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
    <div className="report-overlay">
      <div className="report-modal">
        <h2>Trạng Thái Báo Cáo Cứu Hộ</h2>
        
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
              className={`submit-btn ${isApproved ? 'disabled' : ''}`}
              onClick={handleEditClick}
              disabled={isApproved}
            >
              {isEditing ? 'Lưu thay đổi' : 'Chỉnh sửa'}
            </button>
            <button type="button" className="cancel-btn" onClick={onClose}>
              Đóng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ViewReport;
