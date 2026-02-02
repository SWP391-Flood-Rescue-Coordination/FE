import React, { useState } from 'react';
import './ReportForm.css';

function ReportForm({ onClose }) {
  const [formData, setFormData] = useState({
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

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Report submitted:', formData);
    // Xử lý submit form
    onClose(formData);
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
        <h2>Báo Cáo Cứu Hộ</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-left">
              {/* Số điện thoại */}
              <div className="form-field">
                <label>Số điện thoại</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.phone}
                  onChange={(e) => {
                    // Lọc bỏ tất cả ký tự không phải số
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({...formData, phone: numericValue});
                  }}
                  onKeyDown={(e) => {
                    // Cho phép: backspace, delete, tab, escape, enter, arrow keys, ctrl+a, ctrl+c, ctrl+v, ctrl+x
                    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                    if (allowedKeys.includes(e.key) || (e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))) {
                      return;
                    }
                    // Chặn tất cả ngoại trừ số
                    if (!/^[0-9]$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    // Lấy text từ clipboard và chỉ giữ lại số
                    const pasteData = e.clipboardData.getData('text');
                    const numericData = pasteData.replace(/[^0-9]/g, '');
                    if (numericData) {
                      const currentValue = formData.phone;
                      const newValue = currentValue + numericData;
                      setFormData({...formData, phone: newValue});
                    }
                  }}
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
                    required
                  />
                  <button type="button" className="location-btn">
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
                  required
                />
              </div>

              {/* Số lượng đầu người */}
              <div className="form-field people-count-field">
                <label>Số lượng đầu người</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  value={formData.totalPeople}
                  onChange={(e) => {
                    // Lọc bỏ tất cả ký tự không phải số
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({...formData, totalPeople: numericValue});
                  }}
                  onKeyDown={(e) => {
                    // Cho phép: backspace, delete, tab, escape, enter, arrow keys, ctrl+a, ctrl+c, ctrl+v, ctrl+x
                    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                    if (allowedKeys.includes(e.key) || (e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))) {
                      return;
                    }
                    // Chặn tất cả ngoại trừ số
                    if (!/^[0-9]$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    // Lấy text từ clipboard và chỉ giữ lại số
                    const pasteData = e.clipboardData.getData('text');
                    const numericData = pasteData.replace(/[^0-9]/g, '');
                    if (numericData) {
                      const currentValue = formData.totalPeople;
                      const newValue = currentValue + numericData;
                      setFormData({...formData, totalPeople: newValue});
                    }
                  }}
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
                    />
                    Hết nhu yếu phẩm
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.houseCollapsed}
                      onChange={() => handleConditionChange('houseCollapsed')}
                    />
                    Sập nhà
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.needMedical}
                      onChange={() => handleConditionChange('needMedical')}
                    />
                    Cần điều trị y tế
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.floodUnder1m}
                      onChange={() => handleConditionChange('floodUnder1m')}
                    />
                    Ngập {'<'} 1m
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.floodOver1m}
                      onChange={() => handleConditionChange('floodOver1m')}
                    />
                    Ngập {'>'} 1m
                  </label>
                </div>
              </div>

              {/* Ghi chú */}
              <div className="form-field">
                <label>Ghi chú:</label>
                <textarea
                  rows="4"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="submit" className="submit-btn">Nộp báo cáo</button>
            <button type="button" className="cancel-btn" onClick={() => onClose(null)}>Hủy</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReportForm;
