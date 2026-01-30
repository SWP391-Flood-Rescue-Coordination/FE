import React, { useState } from 'react';
import './Login.css';

const Login = ({ onClose }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login attempt:', { phone, password, rememberPassword });
    // Xử lý logic đăng nhập ở đây
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
        <h2>Đăng Nhập</h2>
        <p className="login-subtitle">
          Đăng nhập để có quyền lưu hoạt động hoặc yêu cầu hỗ trợ
        </p>
        
        <form onSubmit={handleSubmit}>
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
          
          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
              />
              Nhớ mật khẩu
            </label>
            <a href="#" className="forgot-password">Quên mật khẩu?</a>
          </div>
          
          <button type="submit" className="login-button">
            Đăng nhập
          </button>
        </form>
        
        <div className="login-footer">
          <p>Tạo tài khoản mới? <a href="#" className="register-link">Đăng ký</a></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
