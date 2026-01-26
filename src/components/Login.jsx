import React, { useState } from 'react';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login attempt:', { username, password, rememberMe });
    // Xử lý logic đăng nhập ở đây
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>
      </div>
      
      <div className="login-box">
        <h2>Đăng Nhập</h2>
        <p className="login-subtitle">
          Đăng nhập để có quyền truy cập người dùng vào hệ thống
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
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Duy trì trạng thái đăng nhập
            </label>
          </div>
          
          <button type="submit" className="login-button">
            Đăng nhập
          </button>
        </form>
        
        <div className="login-footer">
          <p>Tạo tài khoản mới?</p>
        </div>
        
        <button className="register-button">Đăng ký</button>
        
        <div className="admin-link">
          <p>Trạm gần bạn liên xác có vấn đề? <a href="#">Liên hệ Admin</a></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
