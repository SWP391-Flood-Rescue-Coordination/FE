import React, { useState } from 'react';
import './Register.css';

const Register = ({ onClose, onShowLogin }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Mật khẩu không khớp!');
      return;
    }
    console.log('Register attempt:', { phone, password, fullName });
    // Xử lý logic đăng ký ở đây
  };

  const handleLoginClick = (e) => {
    e.preventDefault();
    if (onShowLogin) {
      onShowLogin();
    }
  };

  return (
    <div className="register-container">
      <div className="register-header">
        {onClose && (
          <button className="close-button" onClick={onClose}>
            <span className="arrow-icon">←</span>
            Về trang chủ
          </button>
        )}
      </div>
      
      <div className="register-box">
        <h2>Đăng Ký</h2>
        <p className="register-subtitle">
          Tạo tài khoản để có quyền lưu hoạt động hoặc yêu cầu hỗ trợ
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">Họ và tên</label>
            <input
              type="text"
              id="fullName"
              placeholder="Nhập họ và tên của bạn"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Số điện thoại</label>
            <input
              type="tel"
              id="phone"
              placeholder="Nhập số điện thoại của bạn"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              type="password"
              id="password"
              placeholder="Nhập mật khẩu của bạn"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="Nhập lại mật khẩu của bạn"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="register-button">
            Đăng ký
          </button>
        </form>
        
        <div className="register-footer">
          <p>Bạn đã có tài khoản? <a href="#" className="login-link" onClick={handleLoginClick}>Đăng nhập tại đây</a></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
