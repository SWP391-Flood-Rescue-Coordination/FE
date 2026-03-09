import React, { useState } from 'react';
import './Dashboard.css';

const ReportForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    level: '1',
    people: '',
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const reportData = {
      ...formData,
      status: 'pending'
    };
    console.log('Report submitted:', reportData);
    onClose(reportData);
  };

  const handleCancel = () => {
    onClose(null);
  };

  return (
    <div className="popup-overlay" onClick={handleCancel}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h3>Tạo báo cáo</h3>
          <button className="close-btn" onClick={handleCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Họ và tên <span className="required">*</span></label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập họ và tên"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Số điện thoại <span className="required">*</span></label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Nhập số điện thoại"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Địa chỉ <span className="required">*</span></label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Nhập địa chỉ"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="level">Mức độ nguy hiểm <span className="required">*</span></label>
            <select
              id="level"
              name="level"
              value={formData.level}
              onChange={handleChange}
              required
            >
              <option value="1">Mức 1 - Rất thấp</option>
              <option value="2">Mức 2 - Thấp</option>
              <option value="3">Mức 3 - Trung bình</option>
              <option value="4">Mức 4 - Cao</option>
              <option value="5">Mức 5 - Rất cao</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="people">Số người cần hỗ trợ <span className="required">*</span></label>
            <input
              type="number"
              id="people"
              name="people"
              value={formData.people}
              onChange={handleChange}
              placeholder="Nhập số người"
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Mô tả tình huống</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Mô tả chi tiết tình huống cần hỗ trợ"
              rows="4"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={handleCancel}>
              Hủy
            </button>
            <button type="submit" className="btn-submit">
              Gửi báo cáo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportForm;
