import React, { useState } from 'react'
import authService from '../services/authService'
import './Login.css'

const Login = ({ onClose, onShowForgotPassword, onShowRegister, onLoginSuccess }) => {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [rememberPassword, setRememberPassword] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loggedInUser, setLoggedInUser] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const validation = authService.validateLoginInput(phone, password)
    if (!validation.valid) {
      setErrorMessage(validation.message)
      return
    }

    setLoading(true)

    try {
      const data = await authService.login(phone, password)
      setLoggedInUser(data.user || null)
      setShowSuccessPopup(true)
    } catch (error) {
      setErrorMessage(authService.getLoginErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPasswordClick = (event) => {
    event.preventDefault()
    if (loading) {
      return
    }

    if (onShowForgotPassword) {
      onShowForgotPassword()
    }
  }

  const handleRegisterClick = (event) => {
    event.preventDefault()
    if (loading) {
      return
    }

    if (onShowRegister) {
      onShowRegister()
    }
  }

  const handleSuccessConfirm = () => {
    setShowSuccessPopup(false)

    if (onLoginSuccess) {
      onLoginSuccess(loggedInUser)
      return
    }

    if (onClose) {
      onClose()
    }
  }

  return (
    <div className="login-container">
      <div className="login-header">
        {onClose && (
          <button className="close-button" onClick={onClose} disabled={loading}>
            <span className="arrow-icon">{'<-'}</span>
            Về trang chủ
          </button>
        )}
      </div>

      <div className="login-box">
        <h2>Đăng nhập</h2>
        <p className="login-subtitle">Đăng nhập để có quyền lưu hoạt động hoặc yêu cầu hỗ trợ</p>

        {errorMessage && <div className="login-error-message">{errorMessage}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="phone">Số điện thoại</label>
            <input
              type="tel"
              id="phone"
              placeholder="Nhập số điện thoại của bạn"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={loading}
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
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberPassword}
                onChange={(event) => setRememberPassword(event.target.checked)}
                disabled={loading}
              />
              Lưu thông tin đăng nhập
            </label>
            <a href="#" className="forgot-password" onClick={handleForgotPasswordClick}>
              Quên mật khẩu?
            </a>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Bạn hiện chưa có tài khoản?{' '}
            <a href="#" className="register-link" onClick={handleRegisterClick}>
              Đăng ký tại đây
            </a>
          </p>
        </div>
      </div>

      {showSuccessPopup && (
        <div className="success-overlay">
          <div className="success-box">
            <h2 className="success-title">Đăng Nhập Thành Công!</h2>
            <button onClick={handleSuccessConfirm} className="success-button">
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
