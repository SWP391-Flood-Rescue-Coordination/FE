import api from './api'

const PHONE_REGEX = /^(?:\+84|84|0)\d{9}$/
const RESCUE_REQUEST_PHONE_REGEX = /^(\+84|84|0)(3|5|7|8|9|1[2689])[0-9]{8}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FORGOT_PASSWORD_CONTEXT_KEY = 'forgotPasswordResetContext'
const GUEST_REQUEST_TRACKING_KEY = 'guestRescueRequestTracking'
const GUEST_REQUEST_DETAILS_KEY = 'guestRescueRequestDetails'
const GUEST_REQUEST_TRACKING_BACKUP_KEY = 'guestRescueRequestTrackingBackup'
const GUEST_REQUEST_DETAILS_BACKUP_KEY = 'guestRescueRequestDetailsBackup'

/*
  authService là trung tâm nghiệp vụ cho các luồng:
  - đăng nhập
  - đăng ký
  - quên mật khẩu / reset mật khẩu
  - quản lý session localStorage/sessionStorage
  - hỗ trợ bảo toàn ngữ cảnh guest rescue request khi login/logout

  Các component Login/Register/ForgotPassword chỉ giữ state UI.
  Mọi rule validate dùng chung, gọi API và xử lý token/context sẽ đi qua file này.
*/
// Nhóm helper phía dưới chịu trách nhiệm quản lý session đăng nhập
// và giữ lại ngữ cảnh guest request khi người dùng đăng nhập / đăng xuất.
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
  return RESCUE_REQUEST_PHONE_REGEX.test(candidate) ? candidate : ''
}

// Rule hiển thị email ẩn cho luồng quên mật khẩu.
// FE đang bám theo backend hiện tại: giữ 3 ký tự đầu của local-part rồi thêm "****".
const maskForgotPasswordEmail = (value) => {
  const candidate = String(value ?? '').trim()
  if (!candidate || !candidate.includes('@')) {
    return ''
  }

  const [localPart, domain] = candidate.split('@')
  if (!localPart || !domain) {
    return ''
  }

  if (localPart.includes('*')) {
    return `${localPart}@${domain}`
  }

  if (localPart.length <= 3) {
    return candidate
  }

  return `${localPart.slice(0, 3)}****@${domain}`
}

// Helper này cho phép ForgotPassword.jsx lấy email đã che từ nhiều shape response khác nhau của backend.
const extractForgotPasswordMaskedEmail = (payload) => {
  const directCandidate = [
    payload?.maskedEmail,
    payload?.masked_email,
    payload?.maskedEmailAddress,
    payload?.emailMasked,
    payload?.email,
  ]
    .map((value) => maskForgotPasswordEmail(value))
    .find(Boolean)

  if (directCandidate) {
    return directCandidate
  }

  const message = String(payload?.message ?? payload?.Message ?? '').trim()
  if (!message) {
    return ''
  }

  const matchedEmail = message.match(/([A-Za-z0-9._%*+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/)
  if (!matchedEmail) {
    return ''
  }

  return maskForgotPasswordEmail(matchedEmail[1]) || matchedEmail[1]
}

const normalizeForgotPasswordText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

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

const getForgotPasswordErrorMessageLegacy = (error) => {
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

  if (status === 403) {
    return data?.message || data?.Message || 'Không thể gửi email OTP. Vui lòng kiểm tra cấu hình gửi mail của hệ thống.'
  }

  if (status === 404) {
    return data?.message || data?.Message || 'Không tìm thấy tài khoản phù hợp.'
  }

  if (status >= 500) {
    return 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'
  }

  return data?.message || data?.Message || data?.title || 'Không thể xử lý yêu cầu lúc này.'
}

const storeForgotPasswordResetContext = (phone, otp, maskedEmail = '') => {
  const payload = {
    phone: String(phone ?? '').trim(),
    otp: String(otp ?? '').trim(),
    maskedEmail: String(maskedEmail ?? '').trim(),
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
      maskedEmail: String(parsed?.maskedEmail ?? '').trim(),
    }
  } catch {
    return null
  }
}

const clearForgotPasswordResetContext = () => {
  sessionStorage.removeItem(FORGOT_PASSWORD_CONTEXT_KEY)
}

const isForgotPasswordOtpErrorMessage = (message) => {
  const normalizedMessage = normalizeForgotPasswordText(message)
  if (!normalizedMessage) {
    return false
  }

  const mentionsOtp = normalizedMessage.includes('otp') || normalizedMessage.includes('ma otp')
  const indicatesInvalidOtp =
    normalizedMessage.includes('khong chinh xac') ||
    normalizedMessage.includes('khong hop le') ||
    normalizedMessage.includes('het han') ||
    normalizedMessage.includes('invalid')

  return mentionsOtp && indicatesInvalidOtp
}

// Khi guest tạo request rồi đăng nhập ngay trong cùng tab, FE tạm cất request guest sang sessionStorage.
// Mục tiêu là logout xong vẫn khôi phục lại được request guest ban đầu.
const preserveGuestRequestContextForLogout = () => {
  // Khi guest vừa tạo request rồi đăng nhập, FE tạm cất ngữ cảnh guest
  // để khi logout cùng tab vẫn khôi phục được request đó.
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

// Cặp hàm restore này khôi phục ngữ cảnh guest rescue request sau khi logout.
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

const createValidationResult = (errors) => {
  const fieldErrors = Object.fromEntries(
    Object.entries(errors).filter(([, value]) => Boolean(value)),
  )

  const messages = Object.values(fieldErrors)

  return {
    valid: messages.length === 0,
    message: messages[0] || '',
    errors: fieldErrors,
  }
}

const buildLoginValidationErrors = (phone, password) => {
  const errors = {}
  const trimmedPhone = String(phone ?? '').trim()
  const passwordValue = String(password ?? '')

  if (!trimmedPhone) {
    errors.phone = 'Vui lòng nhập số điện thoại.'
  } else if (!RESCUE_REQUEST_PHONE_REGEX.test(trimmedPhone)) {
    errors.phone = 'Số điện thoại không đúng định dạng.'
  }

  if (!passwordValue) {
    errors.password = 'Vui lòng nhập mật khẩu.'
  } else if (passwordValue.length < 5 || passwordValue.length > 20) {
    errors.password = 'Mật khẩu phải từ 5 đến 20 ký tự.'
  }

  return errors
}


// Validate firstName, lastName riêng biệt
const buildRegisterValidationErrors = (username, phone, email, password, confirmPassword, firstName, lastName) => {
  const errors = {}
  // const trimmedUsername = String(username ?? '').trim()
  const trimmedPhone = String(phone ?? '').trim()
  const trimmedEmail = String(email ?? '').trim()
  const passwordValue = String(password ?? '')
  const confirmPasswordValue = String(confirmPassword ?? '')
  const trimmedFirstName = String(firstName ?? '').trim()
  const trimmedLastName = String(lastName ?? '').trim()

  // Nếu vẫn còn username thì giữ lại, nếu không thì bỏ qua
  // if (!trimmedUsername) {
  //   errors.username = 'Vui lòng nhập tên đăng nhập.'
  // } else if (trimmedUsername.length < 3) {
  //   errors.username = 'Tên đăng nhập phải có ít nhất 3 ký tự.'
  // }

  if (!trimmedLastName) {
    errors.lastName = 'Vui lòng nhập họ.'
  }
  if (!trimmedFirstName) {
    errors.firstName = 'Vui lòng nhập tên.'
  }

  if (!trimmedPhone) {
    errors.phone = 'Vui lòng nhập số điện thoại.'
  } else if (!RESCUE_REQUEST_PHONE_REGEX.test(trimmedPhone)) {
    errors.phone = 'Số điện thoại không đúng định dạng.'
  }

  if (!trimmedEmail) {
    errors.email = 'Vui lòng nhập email.'
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = 'Email không đúng định dạng.'
  }

  if (!passwordValue) {
    errors.password = 'Vui lòng nhập mật khẩu.'
  } else if (passwordValue.length < 5 || passwordValue.length > 20) {
    errors.password = 'Mật khẩu phải từ 5 đến 20 ký tự.'
  }

  if (!confirmPasswordValue) {
    errors.confirmPassword = 'Vui lòng nhập lại mật khẩu.'
  } else if (passwordValue !== confirmPasswordValue) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
  }

  return errors
}

const authService = {
  // Nhóm 1: validate dữ liệu form trước khi component gọi API.
  validateLoginInput: (phone, password) => {
    const trimmedPhone = String(phone ?? '').trim()
    const passwordValue = String(password ?? '')

    if (!PHONE_REGEX.test(trimmedPhone)) {
      return { valid: false, message: 'Số điện thoại không hợp lệ!' }
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

  validateLoginInput: (phone, password) => createValidationResult(buildLoginValidationErrors(phone, password)),

  validateRegisterInput: (username, phone, email, password, confirmPassword, firstName, lastName) =>
    createValidationResult(
      buildRegisterValidationErrors(username, phone, email, password, confirmPassword, firstName, lastName),
    ),

  validateForgotPasswordPhone: (phone) => {
    const trimmedPhone = String(phone ?? '').trim()

    if (!RESCUE_REQUEST_PHONE_REGEX.test(trimmedPhone)) {
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
    if (passwordValue.length < 5 || passwordValue.length > 20) {
      return { valid: false, message: 'Mật khẩu mới phải từ 5 đến 20 ký tự.' }
    }

    if (passwordValue !== String(confirmPassword ?? '')) {
      return { valid: false, message: 'Mật khẩu xác nhận không khớp.' }
    }

    return { valid: true, message: '' }
  },

  // Nhóm 2: gọi API auth thật và cập nhật session local của frontend.
  login: async (phone, password) => {
    const payload = {
      phone: String(phone ?? '').trim(),
      password: String(password ?? ''),
    }

    // API login trả accessToken + thông tin user, FE lưu lại để route protected dùng chung.
    const response = await api.post('/Auth/login', payload, { skipAuth: true })
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

    const response = await api.post('/Auth/register', payload, { skipAuth: true })
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

  // ForgotPassword.jsx gọi hàm này ở step request để backend gửi OTP về email.
  sendForgotPasswordOtp: async (phone) => {
    const payload = {
      phone: String(phone ?? '').trim(),
    }

    // API public nên bỏ qua interceptor auth ở tầng api.js bằng config route backend.
    const response = await api.post('/Auth/forgot-password/send-otp', payload, { skipAuth: true })
    return response?.data ?? {}
  },

  // Step verify của ForgotPassword.jsx gọi hàm này để đổi mật khẩu thật.
  resetForgotPassword: async (phone, otp, newPassword) => {
    const payload = {
      phone: String(phone ?? '').trim(),
      otp: String(otp ?? '').trim(),
      newPassword: String(newPassword ?? ''),
    }

    const response = await api.post('/Auth/forgot-password/reset-password', payload, { skipAuth: true })
    return response?.data ?? {}
  },

  // Mọi màn dùng logout đều đi qua đây để xóa session thống nhất và restore lại ngữ cảnh guest nếu có.
  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    // Sau logout, khôi phục lại request guest trước đó trong cùng tab nếu có.
    restoreGuestRequestContextAfterLogout()
  },

  isAuthenticated: () => Boolean(localStorage.getItem('accessToken')),

  // Nhóm 3: expose helper để page/component khác đọc session hiện tại hoặc context quên mật khẩu.
  getUserInfo: () => parseStoredUser(),
  getDefaultPhone: () => resolveDefaultPhone(),
  storeForgotPasswordResetContext,
  getForgotPasswordResetContext,
  clearForgotPasswordResetContext,
  extractForgotPasswordMaskedEmail,
  isForgotPasswordOtpErrorMessage,

  getLoginErrorMessage,
  getRegisterErrorMessage,
  getForgotPasswordErrorMessage,
}

export default authService
