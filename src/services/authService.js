import api from './api';

// Auth Service - Quản lý authentication
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
