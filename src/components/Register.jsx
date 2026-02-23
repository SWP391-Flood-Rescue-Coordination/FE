import React, { useState } from 'react';
import './Login.css';

const Register = ({ onClose, onShowLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Mật khẩu không khớp!');
      return;
    }
    console.log('Register attempt:', { username, email, password });
    // Xử lý logic đăng ký ở đây
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
        <h2>Đăng Ký</h2>
        <p className="login-subtitle">
          Tạo tài khoản mới để truy cập hệ thống
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Tài khoản</label>
            <input
              type="text"
              id="username"
              placeholder="Nhập tài khoản của bạn"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
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
          
          <button type="submit" className="login-button">
            Đăng ký
          </button>
        </form>
        
        <div className="login-footer">
          <p>Đã có tài khoản?</p>
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

export default Register;
