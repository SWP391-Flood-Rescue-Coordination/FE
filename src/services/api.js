import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/*
  api.js là cổng HTTP dùng chung cho toàn bộ service.
  Flow tổng quát ở mọi actor đều đi qua file này:
  page/component -> service tương ứng -> api.js -> backend.

  Hai interceptor ở đây giải quyết 2 việc chung:
  - request interceptor: gắn Bearer token cho các API protected
  - response interceptor: gặp 401 thì dọn session local để tránh dùng token cũ
*/
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    // Các API public như login/register/forgot password có thể truyền skipAuth
    // để đi thẳng mà không gắn token.
    // Một số API public như login/forgot password sẽ chủ động bỏ qua token.
    if (config.skipAuth) {
      return config
    }

    // FE lấy access token từ localStorage và gắn vào mọi request protected.
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Đây là lớp phòng thủ chung cho mọi flow có đăng nhập:
    // nếu token hết hạn thì service/page phía trên sẽ nhận lỗi sạch sau khi local session đã bị xóa.
    // Khi token hết hạn, FE xóa session hiện tại để tránh dùng dữ liệu cũ.
    if (error.response?.status === 401 && !error.config?.skipAuth) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    }
    return Promise.reject(error)
  },
)

export default api
