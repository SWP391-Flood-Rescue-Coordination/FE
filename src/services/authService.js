import api from './api'

const PHONE_REGEX = /^(?:\+84|84|0)\d{9}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FORGOT_PASSWORD_CONTEXT_KEY = 'forgotPasswordResetContext'
const GUEST_REQUEST_TRACKING_KEY = 'guestRescueRequestTracking'
const GUEST_REQUEST_DETAILS_KEY = 'guestRescueRequestDetails'
const GUEST_REQUEST_TRACKING_BACKUP_KEY = 'guestRescueRequestTrackingBackup'
const GUEST_REQUEST_DETAILS_BACKUP_KEY = 'guestRescueRequestDetailsBackup'
const parseStoredUser = () => {
  const raw = localStorage.getItem('user')
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const normalizeValidPhone = (value) => {
  const candidate = String(value ?? '').trim()
  return PHONE_REGEX.test(candidate) ? candidate : ''
}

const resolveDefaultPhone = () => {
  const storedUser = parseStoredUser()
  const userPhone = normalizeValidPhone(storedUser?.phone)
  if (userPhone) {
    return userPhone
  }

  const usernameAsPhone = normalizeValidPhone(storedUser?.username)
  if (usernameAsPhone) {
    return usernameAsPhone
  }

  return ''
}

const flattenValidationErrors = (errors) => {
  if (!errors || typeof errors !== 'object') {
    return []
  }

  return Object.values(errors)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(Boolean)
    .map((value) => String(value))
}

const getLoginErrorMessage = (error) => {
  const status = error?.response?.status
  const data = error?.response?.data

  if (status === 400) {
    const validationMessages = flattenValidationErrors(data?.errors)
    if (validationMessages.length > 0) {
      return validationMessages.join(' ')
    }
    return data?.title || 'Dữ liệu đăng nhập không hợp lệ'
  }

  if (status === 401) {
    return data?.message || 'Thông tin đăng nhập không chính xác'
  }

  if (status === 403) {
    return 'Bạn không có quyền truy cập vào hệ thống. Vui lòng liên hệ quản trị viên để được hỗ trợ.'
  }

  if (status >= 500) {
    return 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'
  }

  return data?.message || data?.title || 'Không thể đăng nhập. Vui lòng thử lại.'
}

const getRegisterErrorMessage = (error) => {
  const status = error?.response?.status
  const data = error?.response?.data

  if (status === 400) {
    const validationMessages = flattenValidationErrors(data?.errors)
    if (validationMessages.length > 0) {
      return validationMessages.join(' ')
    }
    return data?.message || data?.title || 'Dữ liệu đăng ký không hợp lệ'
  }

  if (status === 409) {
    return data?.message || 'Thông tin đã được sử dụng'
  }

  if (status >= 500) {
    return 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'
  }

  return data?.message || data?.title || 'Không thể đăng ký. Vui lòng thử lại.'
}

const getForgotPasswordErrorMessage = (error) => {
  const status = error?.response?.status
  const data = error?.response?.data

  if (status === 400) {
    const validationMessages = flattenValidationErrors(data?.errors)
    if (validationMessages.length > 0) {
      return validationMessages.join(' ')
    }
  return data?.message || data?.Message || data?.title || 'Dữ liệu gửi lên không hợp lệ.'
  }

  if (status === 404) {
    return data?.message || data?.Message || 'Không tìm thấy tài khoản phù hợp.'
  }

  if (status >= 500) {
    return 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'
  }

  return data?.message || data?.Message || data?.title || 'Không thể xử lý yêu cầu lúc này.'
}

const storeForgotPasswordResetContext = (phone, otp) => {
  const payload = {
    phone: String(phone ?? '').trim(),
    otp: String(otp ?? '').trim(),
  }

  sessionStorage.setItem(FORGOT_PASSWORD_CONTEXT_KEY, JSON.stringify(payload))
}

const getForgotPasswordResetContext = () => {
  const raw = sessionStorage.getItem(FORGOT_PASSWORD_CONTEXT_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    return {
      phone: String(parsed?.phone ?? '').trim(),
      otp: String(parsed?.otp ?? '').trim(),
    }
  } catch {
    return null
  }
}

const clearForgotPasswordResetContext = () => {
  sessionStorage.removeItem(FORGOT_PASSWORD_CONTEXT_KEY)
}

const preserveGuestRequestContextForLogout = () => {
  const guestTracking = localStorage.getItem(GUEST_REQUEST_TRACKING_KEY)
  const guestDetails = localStorage.getItem(GUEST_REQUEST_DETAILS_KEY)

  if (guestTracking) {
    sessionStorage.setItem(GUEST_REQUEST_TRACKING_BACKUP_KEY, guestTracking)
  } else {
    sessionStorage.removeItem(GUEST_REQUEST_TRACKING_BACKUP_KEY)
  }

  if (guestDetails) {
    sessionStorage.setItem(GUEST_REQUEST_DETAILS_BACKUP_KEY, guestDetails)
  } else {
    sessionStorage.removeItem(GUEST_REQUEST_DETAILS_BACKUP_KEY)
  }

  localStorage.removeItem(GUEST_REQUEST_TRACKING_KEY)
  localStorage.removeItem(GUEST_REQUEST_DETAILS_KEY)
}

const restoreGuestRequestContextAfterLogout = () => {
  const guestTracking = sessionStorage.getItem(GUEST_REQUEST_TRACKING_BACKUP_KEY)
  const guestDetails = sessionStorage.getItem(GUEST_REQUEST_DETAILS_BACKUP_KEY)

  if (guestTracking) {
    localStorage.setItem(GUEST_REQUEST_TRACKING_KEY, guestTracking)
  }

  if (guestDetails) {
    localStorage.setItem(GUEST_REQUEST_DETAILS_KEY, guestDetails)
  }

  sessionStorage.removeItem(GUEST_REQUEST_TRACKING_BACKUP_KEY)
  sessionStorage.removeItem(GUEST_REQUEST_DETAILS_BACKUP_KEY)
}

const authService = {
  validateLoginInput: (phone, password) => {
    const trimmedPhone = String(phone ?? '').trim()
    const passwordValue = String(password ?? '')

    if (!PHONE_REGEX.test(trimmedPhone)) {
      return { valid: false, message: 'Số điện thoại không đúng định dạng.' }
    }

    if (passwordValue.length < 5 || passwordValue.length > 20) {
      return { valid: false, message: 'Mật khẩu phải từ 5 đến 20 ký tự.' }
    }

    return { valid: true, message: '' }
  },

  validateRegisterInput: (username, phone, email, password, confirmPassword, fullName) => {
    const trimmedUsername = String(username ?? '').trim()
    const trimmedPhone = String(phone ?? '').trim()
    const trimmedEmail = String(email ?? '').trim()
    const passwordValue = String(password ?? '')
    const confirmPasswordValue = String(confirmPassword ?? '')
    const trimmedFullName = String(fullName ?? '').trim()

    if (!trimmedUsername || trimmedUsername.length < 3) {
      return { valid: false, message: 'Tên đăng nhập phải có ít nhất 3 ký tự.' }
    }

    if (!trimmedFullName) {
      return { valid: false, message: 'Họ và tên là bắt buộc.' }
    }

    if (!PHONE_REGEX.test(trimmedPhone)) {
      return { valid: false, message: 'Số điện thoại không đúng định dạng.' }
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return { valid: false, message: 'Email không đúng định dạng.' }
    }

    if (passwordValue.length < 5 || passwordValue.length > 20) {
      return { valid: false, message: 'Mật khẩu phải từ 5 đến 20 ký tự.' }
    }

    if (passwordValue !== confirmPasswordValue) {
      return { valid: false, message: 'Mật khẩu xác nhận không khớp.' }
    }

    return { valid: true, message: '' }
  },

  validateForgotPasswordPhone: (phone) => {
    const trimmedPhone = String(phone ?? '').trim()

    if (!PHONE_REGEX.test(trimmedPhone)) {
      return { valid: false, message: 'Số điện thoại không đúng định dạng.' }
    }

    return { valid: true, message: '' }
  },

  validateResetPasswordInput: (phone, otp, newPassword, confirmPassword) => {
    const phoneValidation = authService.validateForgotPasswordPhone(phone)
    if (!phoneValidation.valid) {
      return phoneValidation
    }

    const otpValue = String(otp ?? '').trim()
    if (!otpValue) {
      return { valid: false, message: 'Vui lòng nhập mã OTP.' }
    }

    if (otpValue.length < 4 || otpValue.length > 6) {
      return { valid: false, message: 'OTP phải từ 4 đến 6 ký tự.' }
    }

    const passwordValue = String(newPassword ?? '')
    if (passwordValue.length < 5 || passwordValue.length > 100) {
      return { valid: false, message: 'Mật khẩu mới phải từ 5 đến 100 ký tự.' }
    }

    if (passwordValue !== String(confirmPassword ?? '')) {
      return { valid: false, message: 'Mật khẩu xác nhận không khớp.' }
    }

    return { valid: true, message: '' }
  },

  login: async (phone, password) => {
    const payload = {
      phone: String(phone ?? '').trim(),
      password: String(password ?? ''),
    }

    const response = await api.post('/Auth/login', payload)
    const data = response?.data ?? {}

    if (!data?.success || !data?.accessToken || !data?.user) {
      const authError = new Error(data?.message || 'Đăng nhập thất bại.')
      authError.response = {
        status: 401,
        data,
      }
      throw authError
    }

    const storedUser = {
      ...data.user,
      phone: normalizeValidPhone(data?.user?.phone) || payload.phone,
    }

    preserveGuestRequestContextForLogout()
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('user', JSON.stringify(storedUser))
    localStorage.removeItem('refreshToken')

    return {
      ...data,
      user: storedUser,
    }
  },

  register: async (username, phone, email, password, fullName) => {
    const payload = {
      username: String(username ?? '').trim(),
      phone: String(phone ?? '').trim(),
      email: String(email ?? '').trim(),
      password: String(password ?? ''),
      fullName: String(fullName ?? '').trim(),
    }

    const response = await api.post('/Auth/register', payload)
    const data = response?.data ?? {}

    if (!data?.success) {
      const authError = new Error(data?.message || 'Đăng ký thất bại.')
      authError.response = {
        status: 400,
        data,
      }
      throw authError
    }

    return data
  },

  sendForgotPasswordOtp: async (phone) => {
    const payload = {
      phone: String(phone ?? '').trim(),
    }

    const response = await api.post('/Auth/forgot-password/send-otp', payload)
    return response?.data ?? {}
  },

  resetForgotPassword: async (phone, otp, newPassword) => {
    const payload = {
      phone: String(phone ?? '').trim(),
      otp: String(otp ?? '').trim(),
      newPassword: String(newPassword ?? ''),
    }

    const response = await api.post('/Auth/forgot-password/reset-password', payload)
    return response?.data ?? {}
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    restoreGuestRequestContextAfterLogout()
  },

  isAuthenticated: () => Boolean(localStorage.getItem('accessToken')),

  getUserInfo: () => parseStoredUser(),
  getDefaultPhone: () => resolveDefaultPhone(),
  storeForgotPasswordResetContext,
  getForgotPasswordResetContext,
  clearForgotPasswordResetContext,

  getLoginErrorMessage,
  getRegisterErrorMessage,
  getForgotPasswordErrorMessage,
}

export default authService
