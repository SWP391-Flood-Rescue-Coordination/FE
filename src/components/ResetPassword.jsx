import React, { useEffect, useMemo, useState } from 'react'
import authService from '../services/authService'
import './ForgotPassword.css'

// Flow quên mật khẩu bước cuối:
// - Màn trước đã lưu phone + otp vào sessionStorage.
// - Màn này chỉ cần nhập mật khẩu mới và gọi API reset-password.
// - Đây cũng là thời điểm backend kiểm tra OTP thật theo contract hiện tại.
const EMPTY_FIELD_ERRORS = {
  newPassword: '',
  confirmPassword: '',
}

const ResetPassword = ({ onClose, onShowLogin, onInvalidOtp, phone, otp, maskedEmail }) => {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(5)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState(EMPTY_FIELD_ERRORS)

  useEffect(() => {
    if (!isDone) {
      return undefined
    }

    if (redirectCountdown <= 0) {
      if (onShowLogin) {
        onShowLogin()
      }
      return undefined
    }

    const timer = window.setTimeout(() => {
      setRedirectCountdown((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [isDone, onShowLogin, redirectCountdown])

  const subtitle = useMemo(
    () => (isDone ? '' : `Nhập mật khẩu mới cho số điện thoại ${phone}.`),
    [isDone, phone],
  )

  const updateFieldError = (fieldName, message) => {
    setFieldErrors((current) => ({
      ...current,
      [fieldName]: message,
    }))
  }

  const validateField = (fieldName, nextValue = null) => {
    let message = ''

    if (fieldName === 'newPassword') {
      const passwordValue = String(nextValue ?? newPassword)
      if (!passwordValue) {
        message = 'Vui lòng nhập mật khẩu mới.'
      } else if (passwordValue.length < 5 || passwordValue.length > 100) {
        message = 'Mật khẩu mới phải từ 5 đến 100 ký tự.'
      }
    }

    if (fieldName === 'confirmPassword') {
      const confirmValue = String(nextValue ?? confirmPassword)
      if (!confirmValue) {
        message = 'Vui lòng nhập lại mật khẩu mới.'
      } else if (confirmValue !== String(newPassword)) {
        message = 'Mật khẩu xác nhận không khớp.'
      }
    }

    updateFieldError(fieldName, message)
    return message
  }

  const handleNewPasswordChange = (event) => {
    const value = event.target.value
    setNewPassword(value)

    if (fieldErrors.newPassword) {
      validateField('newPassword', value)
    }

    if (fieldErrors.confirmPassword && confirmPassword) {
      updateFieldError(
        'confirmPassword',
        confirmPassword === value ? '' : 'Mật khẩu xác nhận không khớp.',
      )
    }
  }

  const handleConfirmPasswordChange = (event) => {
    const value = event.target.value
    setConfirmPassword(value)

    if (fieldErrors.confirmPassword) {
      updateFieldError(
        'confirmPassword',
        value === String(newPassword) ? '' : 'Mật khẩu xác nhận không khớp.',
      )
    }
  }

  const handleInvalidOtp = () => {
    authService.clearForgotPasswordResetContext()

    if (onInvalidOtp) {
      onInvalidOtp({
        phone,
        maskedEmail,
        message: 'Mã không hợp lệ.',
      })
      return
    }

    setErrorMessage('Mã không hợp lệ.')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const newPasswordError = validateField('newPassword')
    const confirmPasswordError = validateField('confirmPassword')

    if (newPasswordError || confirmPasswordError) {
      setErrorMessage(newPasswordError || confirmPasswordError)
      return
    }

    const validation = authService.validateResetPasswordInput(
      phone,
      otp,
      newPassword,
      confirmPassword,
    )

    if (!validation.valid) {
      setErrorMessage(validation.message)
      return
    }

    setIsSubmitting(true)

    try {
      // Đây là API cuối của flow quên mật khẩu.
      // Backend sẽ:
      // 1. kiểm tra phone + otp có khớp không,
      // 2. nếu đúng thì mới cập nhật mật khẩu mới.
      const response = await authService.resetForgotPassword(phone, otp, newPassword)

      if (!response?.success) {
        const nextMessage = response?.message || 'Không thể đặt lại mật khẩu lúc này.'

        if (authService.isForgotPasswordOtpErrorMessage(nextMessage)) {
          handleInvalidOtp()
          return
        }

        setErrorMessage(nextMessage)
        return
      }

      // Thành công xong sẽ xóa context reset để tab hiện tại không dùng lại OTP cũ.
      authService.clearForgotPasswordResetContext()
      setIsDone(true)
      setRedirectCountdown(5)
      setFieldErrors(EMPTY_FIELD_ERRORS)
    } catch (error) {
      const nextMessage = authService.getForgotPasswordErrorMessage(error)

      if (authService.isForgotPasswordOtpErrorMessage(nextMessage)) {
        handleInvalidOtp()
        return
      }

      setErrorMessage(nextMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLoginClick = (event) => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    if (onShowLogin) {
      onShowLogin()
    }
  }

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-header">
        {onClose && (
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Về trang chủ"
            title="Về trang chủ"
            disabled={isSubmitting}
          >
            <span className="arrow-icon">←</span>
          </button>
        )}
      </div>

      <div className={`forgot-password-box ${isDone ? 'success-state' : ''}`}>
        <h2>{isDone ? 'Đổi mật khẩu thành công!' : 'Đặt Lại Mật Khẩu'}</h2>
        {!isDone && <p className="forgot-password-subtitle">{subtitle}</p>}

        {errorMessage && (
          <div className="forgot-password-message forgot-password-message-error">
            {errorMessage}
          </div>
        )}

        {!isDone ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="newPassword">Mật khẩu mới</label>
              <input
                type="password"
                id="newPassword"
                placeholder="Nhập mật khẩu mới (tối thiểu 5 ký tự)"
                value={newPassword}
                onChange={handleNewPasswordChange}
                onBlur={() => validateField('newPassword')}
                disabled={isSubmitting}
                required
              />
              {fieldErrors.newPassword && (
                <div className="forgot-password-field-error">{fieldErrors.newPassword}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                onBlur={() => validateField('confirmPassword')}
                disabled={isSubmitting}
                required
              />
              {fieldErrors.confirmPassword && (
                <div className="forgot-password-field-error">{fieldErrors.confirmPassword}</div>
              )}
            </div>

            <button type="submit" className="forgot-password-button" disabled={isSubmitting}>
              {isSubmitting ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        ) : (
          <div className="forgot-password-actions">
            <button
              type="button"
              className="forgot-password-secondary-button"
              onClick={handleLoginClick}
            >
              {`Quay về đăng nhập (${redirectCountdown}s)`}
            </button>
          </div>
        )}

        {!isDone && (
          <div className="forgot-password-footer">
            <p>
              Cần quay lại màn hình đăng nhập?{' '}
              <a href="#" className="login-link" onClick={handleLoginClick}>
                Đăng nhập tại đây
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
