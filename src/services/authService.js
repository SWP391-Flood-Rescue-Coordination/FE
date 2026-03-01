<<<<<<< Updated upstream
import api from './api';

// Auth Service - Quản lý authentication
=======
import api from './api'

const PHONE_REGEX = /^(?:\+84|84|0)\d{9}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  if (status === 401) {
    return data?.message || 'Không thể đăng ký tài khoản'
  }

  if (status === 403) {
    return 'Bạn không có quyền đăng ký. Vui lòng liên hệ quản trị viên.'
  }

  if (status >= 500) {
    return 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'
  }

  return data?.message || data?.title || 'Không thể đăng ký. Vui lòng thử lại.'
}

>>>>>>> Stashed changes
const authService = {
  /**
   * Đăng nhập
   * @param {string} username - Tên đăng nhập (hoặc phone number)
   * @param {string} password - Mật khẩu
   * @returns {Promise} Response từ API
   */
  login: async (username, password) => {
    try {
      const response = await api.post('/Auth/login', {
        Username: username,
        Password: password
      });

      if (response.data.Success) {
        // Lưu token và thông tin user vào localStorage
        localStorage.setItem('accessToken', response.data.AccessToken);
        localStorage.setItem('user', JSON.stringify(response.data.User));
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  },

<<<<<<< Updated upstream
  /**
   * Đăng ký tài khoản mới
   * @param {object} userData - Thông tin đăng ký
   * @returns {Promise} Response từ API
   */
  register: async (userData) => {
    try {
      const response = await api.post('/Auth/register', {
        Username: userData.username,
        Password: userData.password,
        FullName: userData.fullName,
        Phone: userData.phone,
        Email: userData.email,
        Role: userData.role || 'CITIZEN'
      });
=======
  validateRegisterInput: (username, email, phone, password, confirmPassword, fullName) => {
    const trimmedUsername = String(username ?? '').trim()
    const trimmedEmail = String(email ?? '').trim()
    const trimmedPhone = String(phone ?? '').trim()
    const passwordValue = String(password ?? '')
    const confirmPasswordValue = String(confirmPassword ?? '')
    const trimmedFullName = String(fullName ?? '').trim()

    if (trimmedUsername.length < 3) {
      return { valid: false, message: 'Tên đăng nhập phải có ít nhất 3 ký tự.' }
    }

    if (trimmedFullName.length < 2) {
      return { valid: false, message: 'Họ và tên phải có ít nhất 2 ký tự.' }
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

  register: async (username, email, phone, password, fullName) => {
    const payload = {
      username: String(username ?? '').trim(),
      email: String(email ?? '').trim(),
      phone: String(phone ?? '').trim(),
      password: String(password ?? ''),
      fullName: String(fullName ?? '').trim(),
    }

    const response = await api.post('/Auth/register', payload)
    const data = response?.data ?? {}

    if (!data?.success || !data?.accessToken || !data?.user) {
      const authError = new Error(data?.message || 'Đăng ký thất bại.')
      authError.response = {
        status: 400,
        data,
      }
      throw authError
    }

    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    localStorage.removeItem('refreshToken')

    return data
  },

  getLoginErrorMessage,
  getRegisterErrorMessage,
}
>>>>>>> Stashed changes

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Đăng xuất
   */
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  /**
   * Lấy thông tin user hiện tại từ localStorage
   * @returns {object|null} User object hoặc null
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        return null;
      }
    }
    return null;
  },

  /**
   * Kiểm tra user đã đăng nhập chưa
   * @returns {boolean}
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken');
  },

  /**
   * Lấy access token
   * @returns {string|null}
   */
  getToken: () => {
    return localStorage.getItem('accessToken');
  }
};

export default authService;
