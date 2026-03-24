import React, { useEffect, useMemo, useState } from 'react'
import authService from '../services/authService'
import './ForgotPassword.css'

const MOCK_OTP = '123456'
const RESEND_SECONDS = 30
const OTP_EXPIRY_SECONDS = 10 * 60
const VERIFY_DELAY_MS = 3000

const EMPTY_FIELD_ERRORS = {
  phone: '',
  otp: '',
}

const sanitizeNumberText = (value) => String(value ?? '').replace(/[^0-9]/g, '')

const formatCountdown = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const ForgotPassword = ({ onClose, onShowLogin, onOtpVerified }) => {
  const [step, setStep] = useState('request')
  const [phone, setPhone] = useState('')
  const [submittedPhone, setSubmittedPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [otpExpiresAt, setOtpExpiresAt] = useState(null)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState(EMPTY_FIELD_ERRORS)

  const isVerifyStep = step === 'verify'
  const isBusy = sendingOtp || isVerifyingOtp
  const remainingOtpSeconds = otpExpiresAt
    ? Math.max(Math.ceil((otpExpiresAt - currentTime) / 1000), 0)
    : 0
  const isOtpExpired = isVerifyStep && otpExpiresAt !== null && remainingOtpSeconds === 0
  const canResendOtp = isVerifyStep && resendCountdown === 0 && !isBusy

  useEffect(() => {
    authService.clearForgotPasswordResetContext()
  }, [])

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
    if (!isVerifyStep || !otpExpiresAt || remainingOtpSeconds <= 0) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [isVerifyStep, otpExpiresAt, remainingOtpSeconds])

  const subtitle = useMemo(() => {
    if (isVerifyStep) {
      return 'Nhập đúng mã OTP để chuyển sang bước đặt mật khẩu mới.'
    }

    return 'Nhập số điện thoại đã đăng ký để nhận mã OTP đặt lại mật khẩu.'
  }, [isVerifyStep])

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
      message = validation.valid ? '' : 'Số điện thoại không hợp lệ!'
    }

    if (fieldName === 'otp') {
      const otpValue = String(nextValue ?? otp).trim()
      if (!otpValue) {
        message = 'Vui lòng nhập mã OTP.'
      } else if (otpValue.length < 4 || otpValue.length > 6) {
        message = 'Mã OTP phải từ 4 đến 6 ký tự.'
      }
    }

    updateFieldError(fieldName, message)
    return message
  }

  const handlePhoneChange = (event) => {
    const numericValue = sanitizeNumberText(event.target.value)
    setPhone(numericValue)

    if (fieldErrors.phone) {
      validateField('phone', numericValue)
    }
  }

  const handleOtpChange = (event) => {
    const value = String(event.target.value ?? '').trim()
    setOtp(value)

    if (fieldErrors.otp) {
      validateField('otp', value)
    }
  }

  const handleSendOtp = async () => {
    setErrorMessage('')

    const targetPhone = isVerifyStep ? submittedPhone : phone
    const phoneError = validateField('phone', targetPhone)
    if (phoneError) {
      setErrorMessage(phoneError)
      return
    }

    setSendingOtp(true)

    try {
      const response = await authService.sendForgotPasswordOtp(targetPhone)
      if (!response?.success) {
        setErrorMessage(response?.message || 'Không thể gửi mã OTP lúc này.')
        return
      }

      setStep('verify')
      setSubmittedPhone(targetPhone)
      setOtp('')
      setResendCountdown(RESEND_SECONDS)
      setOtpExpiresAt(Date.now() + OTP_EXPIRY_SECONDS * 1000)
      setCurrentTime(Date.now())
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

  const handleVerifyOtp = (event) => {
    event.preventDefault()
    setErrorMessage('')

    if (isOtpExpired) {
      const message = 'Mã OTP đã hết hiệu lực. Vui lòng thao tác lại.'
      updateFieldError('otp', message)
      setErrorMessage(message)
      return
    }

    const otpError = validateField('otp')
    if (otpError) {
      setErrorMessage(otpError)
      return
    }

    const otpValue = String(otp).trim()
    if (otpValue !== MOCK_OTP) {
      const message = 'Mã OTP không chính xác. Vui lòng kiểm tra lại.'
      updateFieldError('otp', message)
      setErrorMessage(message)
      return
    }

    setIsVerifyingOtp(true)

    window.setTimeout(() => {
      authService.storeForgotPasswordResetContext(submittedPhone, otpValue)
      setIsVerifyingOtp(false)

      if (onOtpVerified) {
        onOtpVerified(submittedPhone, otpValue)
      }
    }, VERIFY_DELAY_MS)
  }

  const handleRequestSubmit = async (event) => {
    event.preventDefault()
    await handleSendOtp()
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

        {errorMessage && (
          <div className="forgot-password-message forgot-password-message-error">
            {errorMessage}
          </div>
        )}

        {!isVerifyStep ? (
          <form onSubmit={handleRequestSubmit}>
            <div className="form-group">
              <label htmlFor="phone">Số điện thoại</label>
              <input
                type="tel"
                id="phone"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Nhập số điện thoại đã đăng ký"
                value={phone}
                onChange={handlePhoneChange}
                onBlur={() => validateField('phone')}
                disabled={isBusy}
                required
              />
              {fieldErrors.phone && (
                <div className="forgot-password-field-error">{fieldErrors.phone}</div>
              )}
            </div>

            <button type="submit" className="forgot-password-button" disabled={isBusy}>
              {sendingOtp ? 'Đang gửi mã...' : 'Nhận mã OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div className="forgot-password-message forgot-password-message-info">
              Mã OTP dùng để test/demo local hiện tại là <strong>{MOCK_OTP}</strong>.
            </div>

            <div className="forgot-password-message forgot-password-message-info">
              {isOtpExpired ? (
                <>OTP đã hết hiệu lực. Vui lòng gửi lại mã mới.</>
              ) : (
                <>
                  OTP đã được gửi tới số điện thoại <strong>{submittedPhone}</strong>. Mã có hiệu lực trong{' '}
                  <strong>{formatCountdown(remainingOtpSeconds)}</strong>.
                </>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="otp">Mã OTP</label>
              <div className="otp-input-group">
                <input
                  type="text"
                  id="otp"
                  placeholder="Nhập mã OTP"
                  value={otp}
                  onChange={handleOtpChange}
                  onBlur={() => validateField('otp')}
                  disabled={isBusy}
                  required
                />
                <button
                  type="button"
                  className="send-otp-button"
                  onClick={handleSendOtp}
                  disabled={!canResendOtp}
                >
                  {resendCountdown > 0 ? `Gửi lại OTP (${resendCountdown}s)` : 'Gửi lại OTP'}
                </button>
              </div>
              {fieldErrors.otp && <div className="forgot-password-field-error">{fieldErrors.otp}</div>}
            </div>

            <button type="submit" className="forgot-password-button" disabled={isBusy || isOtpExpired}>
              {isVerifyingOtp ? 'Đang xác nhận...' : 'Xác nhận OTP'}
            </button>
          </form>
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
