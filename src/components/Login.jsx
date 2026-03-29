import React, { useState } from 'react'
import authService from '../services/authService'
import './Login.css'

const Login = ({ onClose, onShowForgotPassword, onShowRegister, onLoginSuccess }) => {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const clearFieldError = (fieldName) => {
    setFieldErrors((prev) => {
      if (!prev[fieldName]) {
        return prev
      }

      const next = { ...prev }
      delete next[fieldName]
      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const validation = authService.validateLoginInput(phone, password)
    setFieldErrors(validation.errors || {})

    if (!validation.valid) {
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

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="phone">Số điện thoại</label>
              {fieldErrors.phone && <span className="field-error">{fieldErrors.phone}</span>}
            </div>
            <input
              type="tel"
              id="phone"
              className={fieldErrors.phone ? 'input-error' : ''}
              placeholder="Nhập số điện thoại của bạn"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value)
                clearFieldError('phone')
              }}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="password">Mật khẩu</label>
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>
            <input
              type="password"
              id="password"
              className={fieldErrors.password ? 'input-error' : ''}
              placeholder="Nhập mật khẩu của bạn"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                clearFieldError('password')
              }}
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
