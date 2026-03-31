import React, { useEffect, useMemo, useRef, useState } from 'react'
import authService from '../services/authService'
import './ForgotPassword.css'

// =========================================================
// LUONG QUEN MAT KHAU MOI
// =========================================================
// Muc tieu cua component nay:
// 1. Man dau tien chi nhap so dien thoai.
// 2. FE goi API send-otp cua BE.
// 3. Neu BE gui thanh cong, giao dien chuyen sang man nhap OTP 6 o.
// 4. OTP nguoi dung nhap se duoc luu tam trong sessionStorage.
// 5. Man ResetPassword se doc lai phone + otp do de goi API reset-password.
//
// Luu y quan trong ve contract backend hien tai:
// - Theo commit BE f142835 / c66c1cd, backend CHUA co endpoint verify-otp rieng.
// - Nghia la FE chi co the "xac nhan tiep tuc sang man reset" o day,
//   con viec kiem tra OTP dung/sai that su xay ra khi submit API reset-password.
// - Vi vay, component nay lam 2 viec:
//   + Buoc 1: send OTP that bang API moi.
//   + Buoc 2: luu phone + otp de man reset gui tiep len BE.
// - Neu BE tra loi OTP sai o man reset, FE se dua nguoi dung quay lai man OTP
//   va hien popup "Ma khong hop le." theo yeu cau UX.

const OTP_LENGTH = 6
const RESEND_SECONDS = 60

const EMPTY_FIELD_ERRORS = {
  phone: '',
}

const sanitizeNumberText = (value) => String(value ?? '').replace(/[^0-9]/g, '')

const createEmptyOtpDigits = () => Array.from({ length: OTP_LENGTH }, () => '')

const ForgotPassword = ({
  onClose,
  onShowLogin,
  onOtpVerified,
  initialStep = 'request',
  initialPhone = '',
  initialMaskedEmail = '',
  initialOtpErrorMessage = '',
}) => {
  // -----------------------------
  // NHOM STATE CHINH CUA FLOW
  // -----------------------------
  // step:
  // - request: man nhap so dien thoai
  // - verify : man nhap OTP
  const [step, setStep] = useState(initialStep === 'verify' ? 'verify' : 'request')

  // phone:
  // - duoc bind voi input o man dau
  // - sau khi gui OTP thanh cong, gia tri nay duoc copy sang submittedPhone
  //   de FE luon biet "OTP hien tai dang thuoc so nao"
  const [phone, setPhone] = useState(String(initialPhone ?? '').trim())
  const [submittedPhone, setSubmittedPhone] = useState(String(initialPhone ?? '').trim())

  // maskedEmail:
  // - la email da che dau * de hien thi lai cho nguoi dung
  // - FE co gang lay tu field rieng neu BE tra ve
  // - neu BE chi tra message, FE se parse email tu message
  const [maskedEmail, setMaskedEmail] = useState(String(initialMaskedEmail ?? '').trim())

  // otpDigits:
  // - mang 6 phan tu, moi phan tu ung voi 1 o OTP
  // - su dung mang thay vi 1 string de de focus va dieu huong tung o
  const [otpDigits, setOtpDigits] = useState(createEmptyOtpDigits)

  // sendingOtp:
  // - loading cho API send-otp
  // continuingToReset:
  // - loading nhe khi user bam "Tiep theo" de chuyen sang man reset
  const [sendingOtp, setSendingOtp] = useState(false)
  const [continuingToReset, setContinuingToReset] = useState(false)

  // resendCountdown:
  // - dem nguoc 60 giay truoc khi cho phep gui lai OTP
  const [resendCountdown, setResendCountdown] = useState(0)

  // errorMessage:
  // - loi tong quan hien ngay tren form
  // fieldErrors:
  // - loi rieng cua tung field
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState(EMPTY_FIELD_ERRORS)

  // otpModalMessage:
  // - popup dung cho case OTP khong hop le
  // - duoc su dung lai khi ResetPassword dua user quay lai man OTP
  const [otpModalMessage, setOtpModalMessage] = useState(String(initialOtpErrorMessage ?? '').trim())

  // ref de FE co the chu dong focus qua lai giua 6 o OTP
  const otpInputRefs = useRef([])

  const isVerifyStep = step === 'verify'
  const isBusy = sendingOtp || continuingToReset
  const otpValue = useMemo(() => otpDigits.join(''), [otpDigits])
  const isOtpComplete = otpDigits.every((digit) => digit.length === 1)
  const canResendOtp = isVerifyStep && resendCountdown === 0 && !sendingOtp

  const subtitle = useMemo(() => {
    if (isVerifyStep) {
      return ''
    }

    return 'Nhập số điện thoại đã đăng ký để hệ thống gửi mã xác thực về email tương ứng.'
  }, [isVerifyStep])

  const displayedMaskedEmail = maskedEmail || 'email đã đăng ký của số điện thoại này'

  useEffect(() => {
    // Moi khi vao flow quen mat khau, FE xoa context reset cu.
    // Viec nay tranh truong hop user da tung nhap OTP cu, sau do quay lai va
    // man reset van doc nham du lieu cu trong sessionStorage.
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
    if (!isVerifyStep) {
      return undefined
    }

    // Khi vua vao man OTP, FE focus ngay o dau tien de user co the go lien.
    const timer = window.setTimeout(() => {
      otpInputRefs.current[0]?.focus()
      otpInputRefs.current[0]?.select?.()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [isVerifyStep, maskedEmail])

  const updateFieldError = (fieldName, message) => {
    setFieldErrors((current) => ({
      ...current,
      [fieldName]: message,
    }))
  }

  const validatePhone = (nextValue = phone) => {
    const validation = authService.validateForgotPasswordPhone(nextValue)
    const message = validation.valid ? '' : validation.message || 'Số điện thoại không hợp lệ.'
    updateFieldError('phone', message)
    return message
  }

  const focusOtpInput = (index) => {
    const target = otpInputRefs.current[index]
    if (!target) {
      return
    }

    target.focus()
    target.select?.()
  }

  const clearOtpDigits = () => {
    setOtpDigits(createEmptyOtpDigits())
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
      // Day la diem FE "noi" vao API moi:
      // - request body gui len chi gom so dien thoai
      // - backend tu tim email da dang ky voi so do
      // - backend gui OTP ve email va tra message cho FE
      const response = await authService.sendForgotPasswordOtp(normalizedPhone)

      if (!response?.success) {
        setErrorMessage(response?.message || 'Không thể gửi mã xác thực lúc này.')
        return
      }

      // FE uu tien lay masked email tu field rieng neu backend co tra ve.
      // Neu backend chi tra trong message, helper se parse chuoi message ra.
      const nextMaskedEmail =
        authService.extractForgotPasswordMaskedEmail(response) || maskedEmail || ''

      setStep('verify')
      setPhone(normalizedPhone)
      setSubmittedPhone(normalizedPhone)
      setMaskedEmail(nextMaskedEmail)
      clearOtpDigits()
      setResendCountdown(RESEND_SECONDS)
      setOtpModalMessage('')
      setFieldErrors(EMPTY_FIELD_ERRORS)

      // Neu dang o man verify va user bam gui lai OTP,
      // preserveVerifyStep giup FE giu dung man hien tai, chi reset du lieu can thiet.
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

  const handleVerifyOtpSubmit = async (event) => {
    event.preventDefault()
    if (!isOtpComplete || isBusy) {
      return
    }

    setErrorMessage('')
    setContinuingToReset(true)

    try {
      // Tai day FE KHONG goi API verify-otp rieng vi BE chua co endpoint do.
      // Thay vao do, FE luu tam:
      // - phone vua xin OTP
      // - otp user vua nhap
      // - maskedEmail de man sau co the dung lai neu can
      //
      // ResetPasswordPage se doc context nay va gui cung newPassword len
      // endpoint /Auth/forgot-password/reset-password.
      authService.storeForgotPasswordResetContext(submittedPhone, otpValue, maskedEmail)

      if (onOtpVerified) {
        await onOtpVerified(submittedPhone, otpValue, maskedEmail)
      }
    } finally {
      setContinuingToReset(false)
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
            <span className="arrow-icon">&lt;</span>
          </button>
        )}
      </div>

      <div className="forgot-password-box">
        <h2>Quên Mật Khẩu</h2>
        {subtitle && <p className="forgot-password-subtitle">{subtitle}</p>}

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
                onBlur={() => validatePhone()}
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
        ) : (
          <form onSubmit={handleVerifyOtpSubmit}>
            <p className="forgot-password-otp-intro">
              Đã gửi mã đến Email <strong>{displayedMaskedEmail}</strong>.
            </p>

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

            <div className="forgot-password-verify-actions">
              <button
                type="submit"
                className="forgot-password-button"
                disabled={!isOtpComplete || isBusy}
              >
                {continuingToReset ? 'Đang xử lý...' : 'Tiếp theo'}
              </button>
            </div>

            <div className="forgot-password-resend-section">
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
          </form>
        )}

        <div className="forgot-password-footer">
          <p>
            <a href="#" className="login-link" onClick={handleLoginClick}>
              Không phải bạn?
            </a>
          </p>
        </div>
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
