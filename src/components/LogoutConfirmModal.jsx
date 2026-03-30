import React from 'react';
import './LogoutConfirmModal.css';

export default function LogoutConfirmModal({ open, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="success-overlay">
      <div className="success-box">
        <h2 className="success-title">Đăng Xuất</h2>
        <p className="register-subtitle" style={{marginBottom: 40}}>
          Bạn có chắc chắn muốn đăng xuất không?
        </p>
        <button onClick={onConfirm} className="success-button" style={{marginBottom: 16}}>
          Đăng xuất
        </button>
        <button onClick={onCancel} className="success-button cancel" style={{background: '#ccc', color: '#222'}}>
          Hủy
        </button>
      </div>
    </div>
  );
}
