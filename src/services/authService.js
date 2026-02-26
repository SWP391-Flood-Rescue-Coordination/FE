import api from './api'

const PHONE_REGEX = /^(?:\+84|84|0)\d{9}$/

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
    return data?.title || 'Du lieu dang nhap khong hop le.'
  }

  if (status === 401) {
    return data?.message || 'Thong tin dang nhap khong chinh xac.'
  }

  if (status === 403) {
    return 'Ban khong co quyen truy cap.'
  }

  if (status >= 500) {
    return 'He thong dang gap loi. Vui long thu lai sau.'
  }

  return data?.message || data?.title || 'Khong the dang nhap. Vui long thu lai.'
}

const authService = {
  validateLoginInput: (phone, password) => {
    const trimmedPhone = String(phone ?? '').trim()
    const passwordValue = String(password ?? '')

    if (!PHONE_REGEX.test(trimmedPhone)) {
      return { valid: false, message: 'So dien thoai khong dung dinh dang (+84/84/0 + 9 chu so).' }
    }

    if (passwordValue.length < 6 || passwordValue.length > 20) {
      return { valid: false, message: 'Mat khau phai tu 6 den 20 ky tu.' }
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

    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    localStorage.removeItem('refreshToken')

    return data
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  },

  isAuthenticated: () => Boolean(localStorage.getItem('accessToken')),

  getUserInfo: () => {
    const raw = localStorage.getItem('user')
    if (!raw) {
      return null
    }

    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  },

  getLoginErrorMessage,
}

export default authService
