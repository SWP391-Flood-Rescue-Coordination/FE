import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import './Login.css';

const Login = ({ onClose, onShowForgotPassword, onShowRegister }) => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Gọi API login
      const response = await authService.login(phone, password);

      if (response.Success) {
        setShowSuccessPopup(true);
        
        // Redirect sau 1.5 giây dựa vào role
        setTimeout(() => {
          const user = authService.getCurrentUser();
          
          if (user) {
            // Redirect dựa vào role
            switch (user.Role) {
              case 'RESCUE_TEAM':
                navigate('/rescue-team');
                break;
              case 'CITIZEN':
                navigate('/');
                break;
              case 'COORDINATOR':
              case 'ADMIN':
              case 'MANAGER':
                navigate('/admin'); // Có thể tạo trang admin sau
                break;
              default:
                navigate('/');
            }
          }
          
          if (onClose) {
            onClose();
          }
        }, 1500);
      } else {
        setError(response.Message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.Message || 'Số điện thoại hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
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
    // Đóng Login và quay về Dashboard
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        {onClose && (
          <button className="close-button" onClick={onClose}>
            <span className="arrow-icon">←</span>
            Về trang chủ
          </button>
        )}
      </div>
      
      <div className="login-box">
        <h2>Đăng Nhập</h2>
        <p className="login-subtitle">
          Đăng nhập để có quyền lưu hoạt động hoặc yêu cầu hỗ trợ
        </p>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="phone">Số điện thoại</label>
            <input
              type="tel"
              id="phone"
              placeholder="Nhập số điện thoại của bạn"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={loading}
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
              disabled={loading}
            />
          </div>
          
          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
                disabled={loading}
              />
              Lưu thông tin đăng nhập
            </label>
            <a href="#" className="forgot-password" onClick={handleForgotPasswordClick}>Quên mật khẩu?</a>
          </div>
          
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>Bạn hiện chưa có tài khoản? <a href="#" className="register-link" onClick={handleRegisterClick}>Đăng ký tại đây</a></p>
        </div>
      </div>

      {/* Popup Đăng Nhập Thành Công */}
      {showSuccessPopup && (
        <div className="success-overlay">
          <div className="success-box">
            <h2 className="success-title">Đăng Nhập<br />Thành Công!</h2>
            <button onClick={handleSuccessConfirm} className="success-button">
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
