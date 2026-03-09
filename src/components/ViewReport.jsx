import React from 'react';
import './Dashboard.css';

const ViewReport = ({ reportData, onClose }) => {
  const getLevelLabel = (level) => {
    const levels = {
      '1': 'Mức 1 - Rất thấp',
      '2': 'Mức 2 - Thấp',
      '3': 'Mức 3 - Trung bình',
      '4': 'Mức 4 - Cao',
      '5': 'Mức 5 - Rất cao'
    };
    return levels[level] || level;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }) + ' CH';
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h3>Chi tiết báo cáo</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="report-detail">
          <div className="detail-row">
            <span className="detail-label">Trạng thái:</span>
            <span className={`detail-value status-badge ${reportData.status === 'approved' ? 'approved' : 'pending'}`}>
              {reportData.status === 'approved' ? 'Đã duyệt' : 'Đang chờ duyệt'}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Ngày gửi:</span>
            <span className="detail-value">{formatDate(reportData.submittedDate)}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Họ và tên:</span>
            <span className="detail-value">{reportData.name}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Số điện thoại:</span>
            <span className="detail-value">{reportData.phone}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Địa chỉ:</span>
            <span className="detail-value">{reportData.address}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Mức độ nguy hiểm:</span>
            <span className="detail-value">{getLevelLabel(reportData.level)}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Số người cần hỗ trợ:</span>
            <span className="detail-value">{reportData.people}</span>
          </div>

          {reportData.description && (
            <div className="detail-row">
              <span className="detail-label">Mô tả tình huống:</span>
              <span className="detail-value">{reportData.description}</span>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button className="btn-submit" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewReport;
