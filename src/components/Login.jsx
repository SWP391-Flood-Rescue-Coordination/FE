import React, { useState } from 'react'
import authService from '../services/authService'
import './Login.css'

const Login = ({ onClose, onShowForgotPassword, onShowRegister, onLoginSuccess }) => {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

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

      if (onLoginSuccess) {
        onLoginSuccess(data.user || null)
        return
      }

      if (onClose) {
        onClose()
      }
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

  return (
    <div className="login-container">
      <div className="login-header">
        {onClose && (
          <button className="close-button" onClick={onClose} disabled={loading} aria-label="Về trang chủ" title="Về trang chủ">
            <span className="arrow-icon">←</span>
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

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <button
            type="button"
            className="login-secondary-button"
            onClick={handleForgotPasswordClick}
            disabled={loading}
          >
            Quên mật khẩu?
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
    </div>
  )
}

export default Login
