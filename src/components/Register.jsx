import React, { useState } from 'react'
import authService from '../services/authService'
import './Register.css'

const Register = ({ onClose, onShowLogin }) => {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
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
      phone,
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
    )

    setFieldErrors(validation.errors || {})

    // Nếu có lỗi xác nhận mật khẩu không khớp thì xóa trắng cả hai ô
    if (validation.errors && validation.errors.confirmPassword === 'Mật khẩu xác nhận không khớp.') {
      setPassword('')
      setConfirmPassword('')
    }

    if (!validation.valid) {
      return
    }

    try {
      setLoading(true)
      await authService.register(phone, email, password, firstName, lastName)
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


          <div className="form-row">
            <label>Họ và tên *</label>
            <div className="name-fields">
              <div style={{width: '50%'}}>
                <input
                  type="text"
                  id="lastName"
                  className={fieldErrors.lastName ? 'input-error' : ''}
                  placeholder="Họ"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    clearFieldError('lastName')
                  }}
                  required
                  disabled={loading}
                />
                {fieldErrors.lastName && (
                  <span className="field-error"><span className="error-icon">&#9888;</span> Vui lòng nhập họ.</span>
                )}
              </div>
              <div style={{width: '50%'}}>
                <input
                  type="text"
                  id="firstName"
                  className={fieldErrors.firstName ? 'input-error' : ''}
                  placeholder="Tên"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    clearFieldError('firstName')
                  }}
                  required
                  disabled={loading}
                />
                {fieldErrors.firstName && (
                  <span className="field-error"><span className="error-icon">&#9888;</span> Vui lòng nhập tên.</span>
                )}
              </div>
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="phone">Số điện thoại *</label>
            <div style={{width: '100%'}}>
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
              {fieldErrors.phone && <span className="field-error"><span className="error-icon">&#9888;</span> Vui lòng nhập số điện thoại hợp lệ.</span>}
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="email">Email *</label>
            <div style={{width: '100%', display: 'flex', flexDirection: 'column'}}>
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
              {fieldErrors.email && <span className="field-error"><span className="error-icon">&#9888;</span> Vui lòng nhập email hợp lệ.</span>}
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="password">Mật khẩu *</label>
            <div style={{width: '100%'}}>
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
              {fieldErrors.password && <span className="field-error"><span className="error-icon">&#9888;</span> Mật khẩu phải từ 5-20 ký tự, bao gồm chữ và số.</span>}
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu *</label>
            <div style={{width: '100%'}}>
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
              {fieldErrors.confirmPassword && <span className="field-error"><span className="error-icon">&#9888;</span> Vui lòng nhập lại mật khẩu trùng khớp.</span>}
            </div>
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
