import React, { useEffect, useMemo, useState } from 'react'
import authService from '../services/authService'
import './ForgotPassword.css'

const MOCK_OTP = '123456'

const EMPTY_FIELD_ERRORS = {
  phone: '',
  otp: '',
  newPassword: '',
  confirmPassword: '',
}

const ForgotPassword = ({ onClose, onShowLogin }) => {
  const [step, setStep] = useState('request')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [redirectCountdown, setRedirectCountdown] = useState(5)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState(EMPTY_FIELD_ERRORS)

  const isBusy = sendingOtp || resettingPassword
  const isVerifyStep = step === 'verify'
  const isResetStep = step === 'reset'
  const isDoneStep = step === 'done'
  const canResendOtp = isVerifyStep && resendCountdown === 0 && !isBusy

  useEffect(() => {
    if (resendCountdown <= 0) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setResendCountdown((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [resendCountdown])

  useEffect(() => {
    if (!isDoneStep) {
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
  }, [isDoneStep, onShowLogin, redirectCountdown])

  const subtitle = useMemo(() => {
    if (isDoneStep) {
      return 'Mật khẩu đã được đặt lại. Hệ thống sẽ tự chuyển về đăng nhập.'
    }

    if (isResetStep) {
      return 'Mã OTP hợp lệ. Hãy nhập mật khẩu mới để hoàn tất.'
    }

    if (isVerifyStep) {
      return 'Nhập đúng mã OTP đã nhận để chuyển sang bước đặt mật khẩu mới.'
    }

    return 'Nhập đúng số điện thoại đã đăng ký để nhận mã OTP.'
  }, [isDoneStep, isResetStep, isVerifyStep])

  const updateFieldError = (fieldName, message) => {
    setFieldErrors((current) => ({
      ...current,
      [fieldName]: message,
    }))
  }

  const validateField = (fieldName, nextValue = null) => {
    let message = ''

    if (fieldName === 'phone') {
      const validation = authService.validateForgotPasswordPhone(nextValue ?? phone)
      message = validation.valid ? '' : validation.message
    }

    if (fieldName === 'otp' && isVerifyStep) {
      const otpValue = String(nextValue ?? otp).trim()
      if (!otpValue) {
        message = 'Vui lòng nhập mã OTP.'
      } else if (otpValue.length < 4 || otpValue.length > 6) {
        message = 'OTP phải từ 4 đến 6 ký tự.'
      }
    }

    if (fieldName === 'newPassword' && isResetStep) {
      const passwordValue = String(nextValue ?? newPassword)
      if (!passwordValue) {
        message = 'Vui lòng nhập mật khẩu mới.'
      } else if (passwordValue.length < 5 || passwordValue.length > 100) {
        message = 'Mật khẩu mới phải từ 5 đến 100 ký tự.'
      }
    }

    if (fieldName === 'confirmPassword' && isResetStep) {
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

  const handlePhoneChange = (event) => {
    const value = event.target.value
    setPhone(value)
    if (fieldErrors.phone) {
      validateField('phone', value)
    }
  }

  const handleOtpChange = (event) => {
    const value = event.target.value
    setOtp(value)
    if (fieldErrors.otp) {
      validateField('otp', value)
    }
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

  const handleSendOtp = async () => {
    setErrorMessage('')
    setSuccessMessage('')
    validateField('phone')

    const validation = authService.validateForgotPasswordPhone(phone)
    if (!validation.valid) {
      setErrorMessage(validation.message)
      return
    }

    setSendingOtp(true)

    try {
      const response = await authService.sendForgotPasswordOtp(phone)
      if (!response?.success) {
        setErrorMessage(response?.message || 'Không thể gửi OTP lúc này.')
        return
      }

      setStep('verify')
      setResendCountdown(60)
      setOtp('')
      setSuccessMessage(
        resendCountdown > 0 || isVerifyStep
          ? (response?.message || 'OTP đã được gửi lại thành công.')
          : (response?.message || 'OTP đã được gửi thành công.')
      )
      setFieldErrors((current) => ({
        ...current,
        otp: '',
      }))
    } catch (error) {
      setErrorMessage(authService.getForgotPasswordErrorMessage(error))
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOtp = () => {
    setErrorMessage('')
    setSuccessMessage('')

    const otpError = validateField('otp')
    if (otpError) {
      setErrorMessage(otpError)
      return
    }

    if (String(otp).trim() !== MOCK_OTP) {
      const message = 'Mã OTP không đúng. Vui lòng thử lại.'
      updateFieldError('otp', message)
      setErrorMessage(message)
      return
    }

    setStep('reset')
    setSuccessMessage('Mã OTP hợp lệ. Vui lòng nhập mật khẩu mới.')
    setFieldErrors((current) => ({
      ...current,
      otp: '',
      newPassword: '',
      confirmPassword: '',
    }))
  }

  const handleResetPassword = async () => {
    setErrorMessage('')
    setSuccessMessage('')

    const validation = authService.validateResetPasswordInput(
      phone,
      otp,
      newPassword,
      confirmPassword,
    )

    validateField('newPassword')
    validateField('confirmPassword')

    if (!validation.valid) {
      setErrorMessage(validation.message)
      return
    }

    setResettingPassword(true)

    try {
      const response = await authService.resetForgotPassword(phone, otp, newPassword)
      if (!response?.success) {
        setErrorMessage(response?.message || 'Không thể đặt lại mật khẩu.')
        return
      }

      setStep('done')
      setRedirectCountdown(5)
      setOtp('')
      setNewPassword('')
      setConfirmPassword('')
      setFieldErrors(EMPTY_FIELD_ERRORS)
      setSuccessMessage(
        response?.message || 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập lại.',
      )
    } catch (error) {
      setErrorMessage(authService.getForgotPasswordErrorMessage(error))
    } finally {
      setResettingPassword(false)
    }
  }

  const handleFormSubmit = async (event) => {
    event.preventDefault()

    if (step === 'request') {
      await handleSendOtp()
      return
    }

    if (step === 'verify') {
      handleVerifyOtp()
      return
    }

    if (step === 'reset') {
      await handleResetPassword()
    }
  }

  const handleLoginClick = (event) => {
    event.preventDefault()
    if (isBusy) {
      return
    }

    if (onShowLogin) {
      onShowLogin()
    }
  }

  const resendButtonLabel = isVerifyStep
    ? (resendCountdown > 0 ? `Gửi lại OTP(${resendCountdown}s)` : 'Gửi lại OTP')
    : 'Nhận mã OTP'

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-header">
        {onClose && (
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Về trang chủ"
            title="Về trang chủ"
            disabled={isBusy}
          >
            <span className="arrow-icon">←</span>
          </button>
        )}
      </div>

      <div className="forgot-password-box">
        <h2>Quên Mật Khẩu</h2>
        <p className="forgot-password-subtitle">{subtitle}</p>

        {!isDoneStep && (
          <div className="forgot-password-message forgot-password-message-info">
            Mã OTP test cố định để demo/local: <strong>123456</strong>
          </div>
        )}

        {errorMessage && (
          <div className="forgot-password-message forgot-password-message-error">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="forgot-password-message forgot-password-message-success">
            {successMessage}
          </div>
        )}

        {!isDoneStep && (
          <form onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label htmlFor="phone">Số điện thoại</label>
              <div className="otp-input-group">
                <input
                  type="tel"
                  id="phone"
                  placeholder="Nhập số điện thoại của bạn"
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={() => validateField('phone')}
                  disabled={isBusy || step !== 'request'}
                  required
                />
                {(step === 'request' || isVerifyStep) && (
                  <button
                    type="button"
                    className="send-otp-button"
                    onClick={handleSendOtp}
                    disabled={step === 'request' ? isBusy : !canResendOtp}
                  >
                    {step === 'request'
                      ? (sendingOtp ? 'Đang gửi...' : 'Nhận mã OTP')
                      : resendButtonLabel}
                  </button>
                )}
              </div>
              {fieldErrors.phone && <div className="forgot-password-field-error">{fieldErrors.phone}</div>}
            </div>

            {isVerifyStep && (
              <>
                <div className="form-group">
                  <label htmlFor="otp">Mã OTP</label>
                  <input
                    type="text"
                    id="otp"
                    placeholder="Nhập mã OTP (test: 123456)"
                    value={otp}
                    onChange={handleOtpChange}
                    onBlur={() => validateField('otp')}
                    disabled={isBusy}
                    required
                  />
                  {fieldErrors.otp && <div className="forgot-password-field-error">{fieldErrors.otp}</div>}
                </div>

                <button type="submit" className="forgot-password-button" disabled={isBusy}>
                  Xác nhận OTP
                </button>
              </>
            )}

            {isResetStep && (
              <>
                <div className="form-group">
                  <label htmlFor="newPassword">Mật khẩu mới</label>
                  <input
                    type="password"
                    id="newPassword"
                    placeholder="Nhập mật khẩu mới (tối thiểu 5 ký tự)"
                    value={newPassword}
                    onChange={handleNewPasswordChange}
                    onBlur={() => validateField('newPassword')}
                    disabled={isBusy}
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
                    disabled={isBusy}
                    required
                  />
                  {fieldErrors.confirmPassword && (
                    <div className="forgot-password-field-error">{fieldErrors.confirmPassword}</div>
                  )}
                </div>

                <button type="submit" className="forgot-password-button" disabled={isBusy}>
                  {resettingPassword ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
                </button>
              </>
            )}
          </form>
        )}

        {isDoneStep && (
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

        <div className="forgot-password-footer">
          <p>
            Cần quay lại màn hình đăng nhập?{' '}
            <a href="#" className="login-link" onClick={handleLoginClick}>
              Đăng nhập tại đây
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
