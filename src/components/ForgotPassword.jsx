import React, { useState } from 'react';
import './Login.css';

const ForgotPassword = ({ onClose, onShowLogin }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Password reset request for:', email);
    // Xử lý logic quên mật khẩu ở đây
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>
        {onClose && (
          <button className="close-button" onClick={onClose}>
            Back
          </button>
        )}
      </div>
      
      <div className="login-box">
        <h2>Quên Mật Khẩu</h2>
        <p className="login-subtitle">
          Nhập email của bạn để nhận liên kết đặt lại mật khẩu
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="login-button">
            Gửi yêu cầu
          </button>
        </form>
        
        <div className="login-footer">
          <p>Nhớ mật khẩu?</p>
        </div>
        
        {onShowLogin && (
          <button className="register-button" onClick={onShowLogin}>
            Đăng nhập
          </button>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
