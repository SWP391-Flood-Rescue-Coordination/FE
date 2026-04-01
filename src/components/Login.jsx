import React, { useState } from 'react'
import { HomeIcon } from '@heroicons/react/24/outline'
import authService from '../services/authService'
import './Login.css'

/*
  Flow đăng nhập:
  App.jsx -> LoginPage.jsx -> Login.jsx -> authService.login() -> api.js -> /Auth/login.

  Component này giữ state form và trả kết quả về page wrapper qua onLoginSuccess.
*/
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

  // Submit chính của form login: validate client-side trước, sau đó mới gọi authService.login.
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
      // Gọi API đăng nhập: POST /api/Auth/login
      // Payload: { phone, password }
      // BE validate, kiểm tra user tồn tại, password đúng, trả về { accessToken, refreshToken, user }
      // FE lưu accessToken + user vào localStorage, sau đó navigate theo role
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

  // Không tự navigate trực tiếp trong component để Login.jsx có thể tái dùng ở nhiều context.
  const handleForgotPasswordClick = (event) => {
    event.preventDefault()
    if (loading) {
      return
    }

    onShowForgotPassword?.()
  }

  // Tương tự, việc đổi route sang /register được ủy quyền cho page wrapper.
  const handleRegisterClick = (event) => {
    event.preventDefault()
    if (loading) {
      return
    }

    onShowRegister?.()
  }

  return (
    <div className="login-container">
      <div className="login-header">
        {onClose && (
          <button
            className="close-button"
            onClick={onClose}
            disabled={loading}
            aria-label="Về trang chủ"
            title="Về trang chủ"
            type="button"
          >
            <span className="home-icon" aria-hidden="true">
              <HomeIcon />
            </span>
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
            className="login-forgot-button"
            onClick={handleForgotPasswordClick}
            disabled={loading}
          >
            Quên mật khẩu?
          </button>
        </form>

        <div className="login-footer">
          <button
            type="button"
            className="register-action-button"
            onClick={handleRegisterClick}
            disabled={loading}
          >
            Tạo tài khoản mới
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login
