import React, { useState } from 'react'
import authService from '../services/authService'
import './Register.css'

const Register = ({ onClose, onShowLogin }) => {
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const validation = authService.validateRegisterInput(
      username,
      phone,
      email,
      password,
      confirmPassword,
      fullName,
    )

    setFieldErrors(validation.errors || {})

    if (!validation.valid) {
      return
    }

    try {
      setLoading(true)
      await authService.register(username, phone, email, password, fullName)
      setShowSuccessPopup(true)
    } catch (err) {
      const errorMessage = authService.getRegisterErrorMessage(err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSuccessConfirm = () => {
    setShowSuccessPopup(false)
    if (onShowLogin) {
      onShowLogin()
    }
  }

  const handleLoginClick = (e) => {
    e.preventDefault()
    if (onShowLogin) {
      onShowLogin()
    }
  }

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

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="username">Tên đăng nhập *</label>
              {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
            </div>
            <input
              type="text"
              id="username"
              className={fieldErrors.username ? 'input-error' : ''}
              placeholder="Nhập tên đăng nhập (tối thiểu 3 ký tự)"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                clearFieldError('username')
              }}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="fullName">Họ và tên *</label>
              {fieldErrors.fullName && <span className="field-error">{fieldErrors.fullName}</span>}
            </div>
            <input
              type="text"
              id="fullName"
              className={fieldErrors.fullName ? 'input-error' : ''}
              placeholder="Nhập họ và tên của bạn"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
                clearFieldError('fullName')
              }}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="phone">Số điện thoại *</label>
              {fieldErrors.phone && <span className="field-error">{fieldErrors.phone}</span>}
            </div>
            <input
              type="tel"
              id="phone"
              className={fieldErrors.phone ? 'input-error' : ''}
              placeholder="Nhập số điện thoại (VD: 0912345678)"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                clearFieldError('phone')
              }}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="email">Email *</label>
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>
            <input
              type="email"
              id="email"
              className={fieldErrors.email ? 'input-error' : ''}
              placeholder="Nhập địa chỉ email của bạn"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                clearFieldError('email')
              }}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="password">Mật khẩu *</label>
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>
            <input
              type="password"
              id="password"
              className={fieldErrors.password ? 'input-error' : ''}
              placeholder="Nhập mật khẩu (5-20 ký tự)"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clearFieldError('password')
              }}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu *</label>
              {fieldErrors.confirmPassword && <span className="field-error">{fieldErrors.confirmPassword}</span>}
            </div>
            <input
              type="password"
              id="confirmPassword"
              className={fieldErrors.confirmPassword ? 'input-error' : ''}
              placeholder="Nhập lại mật khẩu của bạn"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                clearFieldError('confirmPassword')
              }}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>

        <div className="register-footer">
          <p>
            Bạn đã có tài khoản?{' '}
            <a href="#" className="login-link" onClick={handleLoginClick}>
              Đăng nhập tại đây
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
