import api from './api'

const PHONE_REGEX = /^(?:\+84|84|0)\d{9}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LOGIN_PHONE_STORAGE_KEY = 'loginPhone'

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

  return normalizeValidPhone(localStorage.getItem(LOGIN_PHONE_STORAGE_KEY))
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

    if (passwordValue.length < 6 || passwordValue.length > 20) {
      return { valid: false, message: 'Mật khẩu phải từ 6 đến 20 ký tự.' }
    }

    if (passwordValue !== confirmPasswordValue) {
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
      const authError = new Error(data?.message || 'Dang nhap that bai.')
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

    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem(LOGIN_PHONE_STORAGE_KEY, payload.phone)
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

    // Không tự động lưu token - user cần đăng nhập sau khi đăng ký
    return data
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem(LOGIN_PHONE_STORAGE_KEY)
  },

  isAuthenticated: () => Boolean(localStorage.getItem('accessToken')),

  getUserInfo: () => parseStoredUser(),
  getDefaultPhone: () => resolveDefaultPhone(),

  getLoginErrorMessage,
  getRegisterErrorMessage,
}

export default authService
