import axios from 'axios';

// Base URL của backend API
const API_BASE_URL = 'http://localhost:5000/api';

// Tạo axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor - Thêm token vào header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Xử lý lỗi chung
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server trả về lỗi
      switch (error.response.status) {
        case 401:
          // Unauthorized - Token hết hạn hoặc không hợp lệ
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          break;
        case 403:
          // Forbidden - Không có quyền truy cập
          console.error('Bạn không có quyền thực hiện hành động này');
          break;
        case 500:
          console.error('Lỗi server, vui lòng thử lại sau');
          break;
        default:
          console.error('Có lỗi xảy ra:', error.response.data?.Message || error.message);
      }
    } else if (error.request) {
      // Request được gửi nhưng không nhận được response
      console.error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
    } else {
      // Lỗi khác
      console.error('Lỗi:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
