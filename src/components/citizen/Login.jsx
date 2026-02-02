import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

<<<<<<< Updated upstream:src/components/Login.jsx
const Login = ({ onClose }) => {
  const [username, setUsername] = useState('');
=======
const Login = ({ role, onClose, onShowForgotPassword, onShowRegister }) => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
>>>>>>> Stashed changes:src/components/citizen/Login.jsx
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login attempt:', { username, password, rememberMe });
    // Xử lý logic đăng nhập ở đây
<<<<<<< Updated upstream:src/components/Login.jsx
=======
    // Giả sử đăng nhập thành công
    setShowSuccessPopup(true);
  };

  const handleForgotPasswordClick = (e) => {
    e.preventDefault();
    if (onShowForgotPassword) {
      onShowForgotPassword();
    }
  };

  const handleRegisterClick = (e) => {
    e.preventDefault();
    if (onShowRegister) {
      onShowRegister();
    }
  };

  const handleSuccessConfirm = () => {
    setShowSuccessPopup(false);
    // Chuyển hướng theo role nếu có
    if (role === 'citizen') {
      navigate('/');
      return;
    }
    if (role === 'rescue-coordinator') {
      navigate('/coordinator');
      return;
    }
    // Không có role thì quay về Dashboard như cũ
    if (onClose) {
      onClose();
    }
>>>>>>> Stashed changes:src/components/citizen/Login.jsx
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
          Đăng nhập để có quyền truy cập người dùng vào hệ thống
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Tài khoản</label>
            <input
<<<<<<< Updated upstream:src/components/Login.jsx
              type="text"
              id="username"
              placeholder="Nhập tài khoản của bạn"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
=======
              type="tel"
              id="phone"
              placeholder="Nhập số điện thoại của bạn"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
>>>>>>> Stashed changes:src/components/citizen/Login.jsx
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
            />
          </div>
          
          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Nhớ mật khẩu
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
      </div>
    </div>
  );
};

export default Login;

