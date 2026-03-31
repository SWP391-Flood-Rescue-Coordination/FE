import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeftIcon, HomeIcon } from '@heroicons/react/24/outline'
import authService from '../services/authService'
import './ForgotPassword.css'

/*
  Flow quên mật khẩu hiện tại:
  App.jsx -> ForgotPasswordPage.jsx -> ForgotPassword.jsx -> authService.sendForgotPasswordOtp/resetForgotPassword.

  Toàn bộ reset password đã được gộp vào cùng một component:
  - step request: nhập số điện thoại để gửi OTP
  - step verify: nhập OTP + mật khẩu mới + xác nhận mật khẩu
*/
const OTP_LENGTH = 6
const RESEND_SECONDS = 60

const EMPTY_FIELD_ERRORS = {
  phone: '',
  newPassword: '',
  confirmPassword: '',
}

const sanitizeNumberText = (value) => String(value ?? '').replace(/[^0-9]/g, '')

const createOtpDigits = (value = '') => {
  const normalizedValue = sanitizeNumberText(value).slice(0, OTP_LENGTH)
  return Array.from({ length: OTP_LENGTH }, (_, index) => normalizedValue[index] || '')
}

const ForgotPassword = ({
  onClose,
  onShowLogin,
  closeVariant = 'back',
  initialStep = 'request',
  initialPhone = '',
  initialMaskedEmail = '',
  initialOtpErrorMessage = '',
  initialOtp = '',
}) => {
  const [step, setStep] = useState(initialStep === 'verify' ? 'verify' : 'request')
  const [phone, setPhone] = useState(String(initialPhone ?? '').trim())
  const [submittedPhone, setSubmittedPhone] = useState(String(initialPhone ?? '').trim())
  const [maskedEmail, setMaskedEmail] = useState(String(initialMaskedEmail ?? '').trim())
  const [otpDigits, setOtpDigits] = useState(() => createOtpDigits(initialOtp))
  const [sendingOtp, setSendingOtp] = useState(false)
  const [isSubmittingReset, setIsSubmittingReset] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isDone, setIsDone] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(5)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState(EMPTY_FIELD_ERRORS)
  const [otpModalMessage, setOtpModalMessage] = useState(String(initialOtpErrorMessage ?? '').trim())

  const otpInputRefs = useRef([])
  const newPasswordInputRef = useRef(null)

  const isVerifyStep = step === 'verify'
  const isBusy = sendingOtp || isSubmittingReset
  const otpValue = useMemo(() => otpDigits.join(''), [otpDigits])
  const isOtpComplete = otpDigits.every((digit) => digit.length === 1)
  const canResendOtp = isVerifyStep && !isDone && resendCountdown === 0 && !sendingOtp
  const displayedMaskedEmail = maskedEmail || 'email đã đăng ký của số điện thoại này'
  const CloseIcon = closeVariant === 'home' ? HomeIcon : ChevronLeftIcon
  const closeButtonLabel = closeVariant === 'home' ? 'Về trang chủ' : 'Quay lại'

  const subtitle = useMemo(() => {
    if (isDone || isVerifyStep) {
      return ''
    }

    return 'Nhập số điện thoại đã đăng ký để hệ thống gửi mã xác thực về email tương ứng.'
  }, [isDone, isVerifyStep])

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
    if (!isDone) {
      return undefined
    }

    if (redirectCountdown <= 0) {
      onShowLogin?.()
      return undefined
    }

    const timer = window.setTimeout(() => {
      setRedirectCountdown((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [isDone, onShowLogin, redirectCountdown])

  useEffect(() => {
    if (!isVerifyStep || isDone) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      const firstEmptyIndex = otpDigits.findIndex((digit) => !digit)
      const focusIndex = firstEmptyIndex >= 0 ? firstEmptyIndex : OTP_LENGTH - 1
      otpInputRefs.current[focusIndex]?.focus()
      otpInputRefs.current[focusIndex]?.select?.()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [isDone, isVerifyStep, maskedEmail])

  const updateFieldError = (fieldName, message) => {
    setFieldErrors((current) => ({
      ...current,
      [fieldName]: message,
    }))
  }

  // Dùng chung rule số điện thoại với authService và rescue request để tránh lệch validation.
  const validatePhone = (nextValue = phone) => {
    const validation = authService.validateForgotPasswordPhone(nextValue)
    const message = validation.valid ? '' : validation.message || 'Số điện thoại không đúng định dạng.'
    updateFieldError('phone', message)
    return message
  }

  const getPasswordValidationMessage = (value) => {
    const passwordValue = String(value ?? '')

    if (!passwordValue) {
      return 'Vui lòng nhập mật khẩu mới.'
    }

    if (passwordValue.length < 5 || passwordValue.length > 20) {
      return 'Mật khẩu phải từ 5 đến 20 ký tự.'
    }

    return ''
  }

  const clearOtpDigits = () => {
    setOtpDigits(createOtpDigits())
  }

  const focusOtpInput = (index) => {
    const target = otpInputRefs.current[index]
    if (!target) {
      return
    }

    target.focus()
    target.select?.()
  }

  const focusNewPasswordInput = () => {
    window.requestAnimationFrame(() => {
      newPasswordInputRef.current?.focus()
      newPasswordInputRef.current?.select?.()
    })
  }

  // Khi confirm password sai, FE xóa trắng 2 ô password và chỉ giữ lỗi cạnh field xác nhận.
  const handlePasswordMismatch = () => {
    const mismatchMessage = 'Mật khẩu xác nhận không khớp.'

    setNewPassword('')
    setConfirmPassword('')
    setFieldErrors((current) => ({
      ...current,
      newPassword: '',
      confirmPassword: mismatchMessage,
    }))
    focusNewPasswordInput()

    return mismatchMessage
  }

  const validateNewPasswordField = (nextValue = newPassword) => {
    const message = getPasswordValidationMessage(nextValue)
    updateFieldError('newPassword', message)
    return message
  }

  const validateConfirmPasswordField = ({ clearOnMismatch = false } = {}) => {
    const confirmValue = String(confirmPassword ?? '')
    const passwordValue = String(newPassword ?? '')

    if (!confirmValue) {
      const message = 'Vui lòng nhập lại mật khẩu mới.'
      updateFieldError('confirmPassword', message)
      return message
    }

    if (confirmValue !== passwordValue) {
      if (clearOnMismatch) {
        return handlePasswordMismatch()
      }

      const message = 'Mật khẩu xác nhận không khớp.'
      updateFieldError('confirmPassword', message)
      return message
    }

    updateFieldError('confirmPassword', '')
    return ''
  }

  const applyOtpDigits = (startIndex, rawValue) => {
    const numericValue = sanitizeNumberText(rawValue).slice(0, OTP_LENGTH - startIndex)

    if (!numericValue) {
      setOtpDigits((current) => {
        const next = [...current]
        next[startIndex] = ''
        return next
      })
      return
    }

    setOtpDigits((current) => {
      const next = [...current]
      numericValue.split('').forEach((digit, offset) => {
        next[startIndex + offset] = digit
      })
      return next
    })

    const nextFocusIndex = Math.min(startIndex + numericValue.length, OTP_LENGTH - 1)
    window.requestAnimationFrame(() => {
      focusOtpInput(nextFocusIndex)
    })
  }

  const handlePhoneChange = (event) => {
    const numericValue = sanitizeNumberText(event.target.value)
    setPhone(numericValue)
    setErrorMessage('')

    if (fieldErrors.phone) {
      validatePhone(numericValue)
    }
  }

  const handleOtpChange = (index, event) => {
    setErrorMessage('')
    applyOtpDigits(index, event.target.value)
  }

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault()

      setOtpDigits((current) => {
        const next = [...current]

        if (next[index]) {
          next[index] = ''
          return next
        }

        if (index > 0) {
          next[index - 1] = ''
          window.requestAnimationFrame(() => {
            focusOtpInput(index - 1)
          })
        }

        return next
      })

      return
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusOtpInput(index - 1)
      return
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault()
      focusOtpInput(index + 1)
    }
  }

  const handleOtpPaste = (index, event) => {
    event.preventDefault()
    setErrorMessage('')
    applyOtpDigits(index, event.clipboardData.getData('text'))
  }

  const handleNewPasswordChange = (event) => {
    const value = event.target.value
    setNewPassword(value)
    setErrorMessage('')

    if (fieldErrors.newPassword) {
      validateNewPasswordField(value)
    }

    if (fieldErrors.confirmPassword) {
      updateFieldError('confirmPassword', '')
    }
  }

  const handleConfirmPasswordChange = (event) => {
    setConfirmPassword(event.target.value)
    setErrorMessage('')

    if (fieldErrors.confirmPassword) {
      updateFieldError('confirmPassword', '')
    }
  }

  // Điểm nối từ UI quên mật khẩu sang API gửi OTP.
  // Thành công thì component chuyển từ step request sang step verify ngay trong cùng route.
  const handleSendOtp = async (targetPhone, { preserveVerifyStep = false } = {}) => {
    setErrorMessage('')

    const normalizedPhone = String(targetPhone ?? '').trim()
    const phoneError = validatePhone(normalizedPhone)
    if (phoneError) {
      setErrorMessage(phoneError)
      return
    }

    setSendingOtp(true)

    try {
      const response = await authService.sendForgotPasswordOtp(normalizedPhone)

      if (!response?.success) {
        setErrorMessage(response?.message || 'Không thể gửi mã xác thực lúc này.')
        return
      }

      const nextMaskedEmail =
        authService.extractForgotPasswordMaskedEmail(response) || maskedEmail || ''

      setStep('verify')
      setPhone(normalizedPhone)
      setSubmittedPhone(normalizedPhone)
      setMaskedEmail(nextMaskedEmail)
      clearOtpDigits()
      setNewPassword('')
      setConfirmPassword('')
      setResendCountdown(RESEND_SECONDS)
      setOtpModalMessage('')
      setFieldErrors(EMPTY_FIELD_ERRORS)

      if (preserveVerifyStep) {
        setErrorMessage('')
      }
    } catch (error) {
      setErrorMessage(authService.getForgotPasswordErrorMessage(error))
    } finally {
      setSendingOtp(false)
    }
  }

  const handleRequestSubmit = async (event) => {
    event.preventDefault()
    await handleSendOtp(phone)
  }

  const handleResendOtp = async () => {
    if (!canResendOtp) {
      return
    }

    await handleSendOtp(submittedPhone, { preserveVerifyStep: true })
  }

  // Submit cuối của luồng quên mật khẩu: kiểm tra OTP, validate mật khẩu mới rồi gọi API reset.
  const handleResetPasswordSubmit = async (event) => {
    event.preventDefault()

    if (isBusy) {
      return
    }

    setErrorMessage('')

    if (!isOtpComplete) {
      setErrorMessage('Vui lòng nhập đầy đủ mã OTP.')
      return
    }

    const newPasswordError = validateNewPasswordField()
    const confirmPasswordError = validateConfirmPasswordField({ clearOnMismatch: true })

    if (newPasswordError || confirmPasswordError) {
      return
    }

    const validation = authService.validateResetPasswordInput(
      submittedPhone,
      otpValue,
      newPassword,
      confirmPassword,
    )

    if (!validation.valid) {
      setErrorMessage(validation.message)
      return
    }

    setIsSubmittingReset(true)

    try {
      const response = await authService.resetForgotPassword(submittedPhone, otpValue, newPassword)

      if (!response?.success) {
        const nextMessage = response?.message || 'Không thể đặt lại mật khẩu lúc này.'

        if (authService.isForgotPasswordOtpErrorMessage(nextMessage)) {
          clearOtpDigits()
          setOtpModalMessage(nextMessage)
          focusOtpInput(0)
          return
        }

        setErrorMessage(nextMessage)
        return
      }

      authService.clearForgotPasswordResetContext()
      setIsDone(true)
      setRedirectCountdown(5)
      setFieldErrors(EMPTY_FIELD_ERRORS)
      setNewPassword('')
      setConfirmPassword('')
      clearOtpDigits()
    } catch (error) {
      const nextMessage = authService.getForgotPasswordErrorMessage(error)

      if (authService.isForgotPasswordOtpErrorMessage(nextMessage)) {
        clearOtpDigits()
        setOtpModalMessage(nextMessage)
        focusOtpInput(0)
        return
      }

      setErrorMessage(nextMessage)
    } finally {
      setIsSubmittingReset(false)
    }
  }

  // Mọi nút/link quay lại login đều đi qua callback này để page wrapper quyết định navigation.
  const handleLoginClick = (event) => {
    event.preventDefault()
    if (isBusy) {
      return
    }

    onShowLogin?.()
  }

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-header">
        {onClose && (
          <button
            className="close-button"
            onClick={onClose}
            aria-label={closeButtonLabel}
            title={closeButtonLabel}
            disabled={isBusy}
            type="button"
          >
            <CloseIcon className="forgot-password-back-icon" />
          </button>
        )}
      </div>

      <div className={`forgot-password-box ${isDone ? 'success-state' : ''}`}>
        <h2>{isDone ? 'Đổi mật khẩu thành công!' : 'Quên Mật Khẩu'}</h2>
        {subtitle && <p className="forgot-password-subtitle">{subtitle}</p>}

        {errorMessage && (
          <div className="forgot-password-message forgot-password-message-error">
            {errorMessage}
          </div>
        )}

        {!isDone && !isVerifyStep && (
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
                onBlur={() => validatePhone()}
                className={fieldErrors.phone ? 'input-error' : ''}
                disabled={isBusy}
                required
              />
              {fieldErrors.phone && (
                <div className="forgot-password-field-error">{fieldErrors.phone}</div>
              )}
            </div>

            <button type="submit" className="forgot-password-button" disabled={isBusy}>
              {sendingOtp ? 'Đang gửi mã...' : 'Tiếp theo'}
            </button>
          </form>
        )}

        {!isDone && isVerifyStep && (
          <form onSubmit={handleResetPasswordSubmit}>
            <div className="forgot-password-otp-intro">
              <p className="forgot-password-otp-intro-text">
                Mã xác thực đã được gửi đến số Email <strong>{displayedMaskedEmail}</strong>.
              </p>
              {resendCountdown > 0 ? (
                <p className="forgot-password-resend-waiting">
                  Vui lòng chờ <span className="forgot-password-countdown">{resendCountdown}</span>{' '}
                  giây để nhận lại mã xác thực.
                </p>
              ) : (
                <p className="forgot-password-inline-link-row">
                  Chưa nhận được mã?{' '}
                  <button
                    type="button"
                    className="forgot-password-inline-link"
                    onClick={handleResendOtp}
                    disabled={!canResendOtp}
                  >
                    Gửi lại OTP
                  </button>
                </p>
              )}
            </div>

            <div className="form-group">
              <div className="forgot-password-otp-row">
                {otpDigits.map((digit, index) => (
                  <input
                    key={`otp-digit-${index}`}
                    ref={(element) => {
                      otpInputRefs.current[index] = element
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    className="forgot-password-otp-box"
                    onChange={(event) => handleOtpChange(index, event)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    onPaste={(event) => handleOtpPaste(index, event)}
                    aria-label={`Ký tự OTP thứ ${index + 1}`}
                    disabled={isBusy}
                  />
                ))}
              </div>
            </div>

            <div className="forgot-password-reset-fields">
              <div className="form-group">
                <label htmlFor="newPassword">Mật khẩu mới</label>
                <input
                  ref={newPasswordInputRef}
                  type="password"
                  id="newPassword"
                  placeholder="Nhập mật khẩu mới (5 - 20 ký tự)"
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  onBlur={() => validateNewPasswordField()}
                  className={fieldErrors.newPassword ? 'input-error' : ''}
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
                  onBlur={() => validateConfirmPasswordField({ clearOnMismatch: true })}
                  className={fieldErrors.confirmPassword ? 'input-error' : ''}
                  disabled={isBusy}
                  required
                />
                {fieldErrors.confirmPassword && (
                  <div className="forgot-password-field-error">{fieldErrors.confirmPassword}</div>
                )}
              </div>
            </div>

            <div className="forgot-password-verify-actions">
              <button
                type="submit"
                className="forgot-password-button"
                disabled={!isOtpComplete || isBusy}
              >
                {isSubmittingReset ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
              </button>

              <p className="forgot-password-return-row">
                Bạn đã nhớ mật khẩu?{' '}
                <button
                  type="button"
                  className="forgot-password-return-button"
                  onClick={handleLoginClick}
                  disabled={isBusy}
                >
                  Đăng nhập
                </button>
              </p>
            </div>
          </form>
        )}

        {isDone && (
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

        {!isDone && !isVerifyStep && (
          <div className="forgot-password-footer">
            <p className="forgot-password-return-row">
              Bạn đã nhớ mật khẩu?{' '}
              <button
                type="button"
                className="forgot-password-login-link"
                onClick={handleLoginClick}
              >
                Đăng nhập
              </button>
            </p>
          </div>
        )}
      </div>

      {otpModalMessage && (
        <div className="forgot-password-modal-backdrop" role="presentation">
          <div
            className="forgot-password-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="forgot-password-modal-title"
          >
            <h3 id="forgot-password-modal-title">Thông báo</h3>
            <p>{otpModalMessage}</p>
            <button
              type="button"
              className="forgot-password-modal-button"
              onClick={() => setOtpModalMessage('')}
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ForgotPassword
