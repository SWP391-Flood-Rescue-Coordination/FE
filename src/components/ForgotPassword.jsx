import React, { useState } from 'react';
import './ForgotPassword.css';

const ForgotPassword = ({ onClose, onShowLogin }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = () => {
    console.log('Sending OTP to:', phone);
    // Xử lý logic gửi OTP
    setOtpSent(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Reset password with OTP:', { phone, otp });
    // Xử lý logic xác thực OTP và reset mật khẩu
  };

  const handleLoginClick = (e) => {
    e.preventDefault();
    if (onShowLogin) {
      onShowLogin();
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-header">
        {onClose && (
          <button className="close-button" onClick={onClose}>
            <span className="arrow-icon">←</span>
            Về trang chủ
          </button>
        )}
      </div>
      
      <div className="forgot-password-box">
        <h2>Quên Mật Khẩu</h2>
        <p className="forgot-password-subtitle">
          Nhập đúng số điện thoại để lấy mã OTP
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
            <label htmlFor="otp">Mã OTP</label>
            <div className="otp-input-group">
              <input
                type="text"
                id="otp"
                placeholder="Nhập OTP nhận từ tin nhắn"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="send-otp-button"
                onClick={handleSendOTP}
              >
                {otpSent ? 'Gửi lại OTP' : 'Nhận mã OTP'}
              </button>
            </div>
          </div>
          
          <button type="submit" className="forgot-password-button">
            Đăng nhập
          </button>
        </form>
        
        <div className="forgot-password-footer">
          <p>Bạn đã có tài khoản? <a href="#" className="login-link" onClick={handleLoginClick}>Đăng nhập tại đây</a></p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
