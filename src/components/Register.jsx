import React, { useState } from 'react';
import authService from '../services/authService';
import './Register.css';

const Register = ({ onClose, onShowLogin }) => {
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate input
    const validation = authService.validateRegisterInput(
      username,
      phone,
      email,
      password,
      confirmPassword,
      fullName
    );

    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    try {
      setLoading(true);
      await authService.register(username, phone, email, password, fullName);
      setShowSuccessPopup(true);
    } catch (err) {
      const errorMessage = authService.getRegisterErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessConfirm = () => {
    setShowSuccessPopup(false);
    // Chuyển về trang đăng nhập
    if (onShowLogin) {
      onShowLogin();
    }
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

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {showSuccessPopup && (
          <div className="success-overlay">
            <div className="success-box">
              <h2 className="success-title">Đăng Ký Thành Công!</h2>
              <button onClick={handleSuccessConfirm} className="success-button">
                Xác nhận
              </button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Tên đăng nhập *</label>
            <input
              type="text"
              id="username"
              placeholder="Nhập tên đăng nhập (tối thiểu 3 ký tự)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="fullName">Họ và tên *</label>
            <input
              type="text"
              id="fullName"
              placeholder="Nhập họ và tên của bạn"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Số điện thoại *</label>
            <input
              type="tel"
              id="phone"
              placeholder="Nhập số điện thoại (VD: 0912345678)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              placeholder="Nhập địa chỉ email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Mật khẩu *</label>
            <input
              type="password"
              id="password"
              placeholder="Nhập mật khẩu (6-20 ký tự)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu *</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="Nhập lại mật khẩu của bạn"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <button type="submit" className="register-button" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
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
