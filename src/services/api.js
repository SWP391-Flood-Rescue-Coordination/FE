import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// Dùng chung một axios instance để mọi service đi qua cùng baseURL/proxy.
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
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
