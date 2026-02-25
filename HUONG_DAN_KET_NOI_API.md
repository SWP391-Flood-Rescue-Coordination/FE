# 📘 HƯỚNG DẪN KẾT NỐI API - FRONTEND VỚI BACKEND

## 📋 MỤC LỤC
1. [Chuẩn bị](#1-chuẩn-bị)
2. [Cài đặt Dependencies](#2-cài-đặt-dependencies)
3. [Cấu trúc API Services](#3-cấu-trúc-api-services)
4. [Mapping Data FE-BE](#4-mapping-data-fe-be)
5. [Tích hợp vào Components](#5-tích-hợp-vào-components)
6. [Xử lý Authentication](#6-xử-lý-authentication)
7. [Testing và Debug](#7-testing-và-debug)

---

## 1. CHUẨN BỊ

### 1.1. Chạy Backend
```bash
# Mở terminal tại D:\SWP_git\BE
cd D:\SWP_git\BE
dotnet run
```

Backend sẽ chạy tại: `http://localhost:5000` (hoặc port khác, xem trong terminal)

### 1.2. Truy cập Swagger
Mở trình duyệt: `http://localhost:5000/swagger`

Swagger UI hiển thị tất cả API endpoints, bạn có thể test các API tại đây trước khi code.

### 1.3. Kiểm tra API hoạt động
Test thử endpoint đăng ký trong Swagger:
- Click `POST /api/Auth/register`
- Click "Try it out"
- Nhập data mẫu:
```json
{
  "username": "0123456789",
  "password": "123456",
  "fullName": "Nguyen Van A",
  "phone": "0123456789",
  "email": "test@example.com"
}
```
- Click "Execute"
- Xem response trả về

---

## 2. CÀI ĐẶT DEPENDENCIES

### 2.1. Cài axios
```bash
npm install axios
```

**Axios** là thư viện HTTP client để gọi API từ frontend.

### 2.2. Verify package.json
Kiểm tra file `package.json` đã có:
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.x",
    "axios": "^1.x"
  }
}
```

---

## 3. CẤU TRÚC API SERVICES

### 3.1. Tạo thư mục services
```
src/
  services/
    api.js              # Base API config
    authService.js      # Auth APIs (login, register, logout)
    rescueService.js    # Rescue request APIs
```

### 3.2. File: `src/services/api.js`
```javascript
import axios from 'axios';

// ⚠️ QUAN TRỌNG: Thay đổi BASE_URL theo port backend của bạn
const BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Tự động thêm token vào mỗi request
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

// Interceptor: Xử lý response và lỗi
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn hoặc không hợp lệ
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      // Có thể redirect về trang login
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

**Giải thích:**
- `BASE_URL`: Địa chỉ backend API
- `interceptors.request`: Tự động thêm JWT token vào header mỗi request
- `interceptors.response`: Xử lý lỗi 401 (Unauthorized)

### 3.3. File: `src/services/authService.js`
```javascript
import api from './api';

const authService = {
  /**
   * Đăng nhập
   */
  login: async (phone, password) => {
    try {
      const response = await api.post('/Auth/login', {
        username: phone,  // Backend dùng username, FE gửi phone
        password: password,
      });
      
      if (response.data.success) {
        // Lưu token và user info
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error.response?.data || { success: false, message: 'Lỗi kết nối' };
    }
  },

  /**
   * Đăng ký
   */
  register: async (userData) => {
    try {
      const response = await api.post('/Auth/register', {
        username: userData.phone,
        password: userData.password,
        fullName: userData.fullName,
        phone: userData.phone,
        email: userData.email || `${userData.phone}@temp.com`,
      });
      
      if (response.data.success) {
        // Backend tự động login sau khi đăng ký
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error.response?.data || { success: false, message: 'Lỗi kết nối' };
    }
  },

  /**
   * Đăng xuất
   */
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/Auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Luôn xóa token local
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  /**
   * Lấy thông tin user hiện tại
   */
  getCurrentUser: async () => {
    try {
      const response = await api.get('/Auth/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Kiểm tra đã đăng nhập chưa
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken');
  },

  /**
   * Lấy user info từ localStorage
   */
  getUserInfo: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};

export default authService;
```

### 3.4. File: `src/services/rescueService.js`
```javascript
import api from './api';

const rescueService = {
  /**
   * Tạo yêu cầu cứu hộ mới
   */
  createRescueRequest: async (reportData) => {
    try {
      // Parse location (nếu có)
      let latitude = 10.7626;  // Default
      let longitude = 106.6825;
      
      if (reportData.location) {
        const coords = reportData.location.split(',');
        if (coords.length === 2) {
          latitude = parseFloat(coords[0].trim());
          longitude = parseFloat(coords[1].trim());
        }
      }

      // Map dữ liệu FE sang BE
      const requestDto = {
        title: reportData.title || 'Yêu cầu cứu hộ khẩn cấp',
        description: reportData.notes || '',
        contactName: reportData.contactName || '',
        contactPhone: reportData.phone || '',
        latitude: latitude,
        longitude: longitude,
        address: reportData.address || '',
        numberOfPeople: parseInt(reportData.totalPeople) || 1,
        hasChildren: reportData.conditions?.needSupplies || false,
        hasElderly: reportData.conditions?.needMedical || false,
        hasDisabled: reportData.conditions?.houseCollapsed || false,
        specialNotes: [
          reportData.conditions?.needSupplies && 'Hết nhu yếu phẩm',
          reportData.conditions?.houseCollapsed && 'Sập nhà',
          reportData.conditions?.needMedical && 'Cần điều trị y tế',
          reportData.conditions?.floodUnder1m && 'Ngập < 1m',
          reportData.conditions?.floodOver1m && 'Ngập > 1m',
          reportData.notes
        ].filter(Boolean).join('; ')
      };

      const response = await api.post('/RescueRequest', requestDto);
      return response.data;
    } catch (error) {
      console.error('Create rescue request error:', error);
      throw error.response?.data || { success: false, message: 'Lỗi kết nối' };
    }
  },

  /**
   * Lấy danh sách yêu cầu của user
   */
  getMyRequests: async () => {
    try {
      const response = await api.get('/RescueRequest/my-requests');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Lấy yêu cầu mới nhất
   */
  getMyLatestRequest: async () => {
    try {
      const response = await api.get('/RescueRequest/my-latest-request');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default rescueService;
```

---

## 4. MAPPING DATA FE-BE

### 4.1. Login Form

**Frontend gửi:**
```javascript
{
  phone: "0123456789",
  password: "123456"
}
```

**Backend nhận:**
```json
{
  "username": "0123456789",
  "password": "123456"
}
```

**Backend trả về:**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "dGhpc2lzcmVmcmVzaHRva2Vu...",
  "accessTokenExpiration": "2026-02-25T10:00:00Z",
  "user": {
    "userId": 1,
    "username": "0123456789",
    "fullName": "Nguyen Van A",
    "email": "test@example.com",
    "role": "CITIZEN"
  }
}
```

### 4.2. Register Form

**Frontend gửi:**
```javascript
{
  fullName: "Nguyen Van A",
  phone: "0123456789",
  email: "test@example.com",  // ⚠️ Cần thêm field này
  password: "123456",
  confirmPassword: "123456"  // Chỉ dùng FE validation
}
```

**Backend nhận:**
```json
{
  "username": "0123456789",
  "password": "123456",
  "fullName": "Nguyen Van A",
  "phone": "0123456789",
  "email": "test@example.com"
}
```

**Backend trả về:** (Giống như login)

### 4.3. Report Form (Rescue Request)

**Frontend gửi:**
```javascript
{
  phone: "0123456789",
  location: "10.7626,106.6825",
  address: "123 Nguyen Hue, Q1, TP.HCM",
  totalPeople: 5,
  conditions: {
    needSupplies: true,
    houseCollapsed: false,
    needMedical: true,
    floodUnder1m: false,
    floodOver1m: true
  },
  notes: "Cần cứu hộ gấp"
}
```

**Backend nhận:**
```json
{
  "title": "Yêu cầu cứu hộ khẩn cấp",
  "description": "Cần cứu hộ gấp",
  "contactPhone": "0123456789",
  "latitude": 10.7626,
  "longitude": 106.6825,
  "address": "123 Nguyen Hue, Q1, TP.HCM",
  "numberOfPeople": 5,
  "hasChildren": true,
  "hasElderly": true,
  "hasDisabled": false,
  "specialNotes": "Hết nhu yếu phẩm; Cần điều trị y tế; Ngập > 1m; Cần cứu hộ gấp"
}
```

**Backend trả về:**
```json
{
  "success": true,
  "message": "Tạo yêu cầu cứu hộ thành công",
  "requestId": 123
}
```

---

## 5. TÍCH HỢP VÀO COMPONENTS

### 5.1. Login Component

**File: `src/components/Login.jsx`**

```javascript
import React, { useState } from 'react';
import authService from '../services/authService';  // ← Import service
import './Login.css';

const Login = ({ onClose, onShowForgotPassword, onShowRegister }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);  // ← Thêm loading state
  const [error, setError] = useState('');  // ← Thêm error state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const handleSubmit = async (e) => {  // ← Đổi thành async
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login(phone, password);  // ← Gọi API
      
      if (response.success) {
        setShowSuccessPopup(true);
        // Sau 1.5s đóng popup và reload hoặc redirect
        setTimeout(() => {
          if (onClose) onClose();
        }, 1500);
      } else {
        setError(response.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* ... existing header ... */}
      
      <div className="login-box">
        <h2>Đăng Nhập</h2>
        <p className="login-subtitle">...</p>
        
        {/* Hiển thị lỗi */}
        {error && (
          <div style={{ 
            padding: '10px', 
            marginBottom: '15px', 
            backgroundColor: '#fee', 
            color: '#c33',
            border: '1px solid #fcc',
            borderRadius: '4px'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* ... existing form fields ... */}
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}  // ← Disable khi đang loading
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        
        {/* ... rest of component ... */}
      </div>
      
      {/* Success popup */}
      {showSuccessPopup && (
        <div className="success-overlay">
          <div className="success-box">
            <h2>Đăng Nhập Thành Công!</h2>
            <p>Xin chào, {authService.getUserInfo()?.fullName}!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
```

**Các thay đổi cần làm:**
1. Import `authService`
2. Thêm `loading` và `error` states
3. Đổi `handleSubmit` thành `async`
4. Gọi `await authService.login()`
5. Xử lý response/error
6. Hiển thị loading state và error message

### 5.2. Register Component

**File: `src/components/Register.jsx`**

```javascript
import React, { useState } from 'react';
import authService from '../services/authService';  // ← Import
import './Register.css';

const Register = ({ onClose, onShowLogin }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',  // ← THÊM FIELD EMAIL (QUAN TRỌNG!)
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate password
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu không khớp!');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.register(formData);  // ← Gọi API
      
      if (response.success) {
        alert('Đăng ký thành công! Đang chuyển hướng...');
        setTimeout(() => {
          if (onClose) onClose();
        }, 1500);
      } else {
        setError(response.message || 'Đăng ký thất bại');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      {/* ... header ... */}
      
      <div className="register-box">
        <h2>Đăng Ký</h2>
        
        {error && (
          <div style={{ 
            padding: '10px', 
            marginBottom: '15px', 
            backgroundColor: '#fee', 
            color: '#c33'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Họ tên */}
          <div className="form-group">
            <label>Họ và tên</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              required
            />
          </div>

          {/* Số điện thoại */}
          <div className="form-group">
            <label>Số điện thoại</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              required
            />
          </div>

          {/* ⚠️ THÊM FIELD EMAIL */}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="email@example.com"
              required
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Mật khẩu</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label>Xác nhận mật khẩu</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              required
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
```

**⚠️ QUAN TRỌNG:** Phải thêm field **email** vào form register!

### 5.3. ReportForm Component

**File: `src/components/ReportForm.jsx`**

```javascript
import React, { useState } from 'react';
import rescueService from '../services/rescueService';  // ← Import
import './ReportForm.css';

function ReportForm({ onClose }) {
  const [formData, setFormData] = useState({
    phone: '',
    location: '',
    address: '',
    totalPeople: 0,
    conditions: {
      needSupplies: false,
      houseCollapsed: false,
      needMedical: false,
      floodUnder1m: false,
      floodOver1m: false
    },
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await rescueService.createRescueRequest(formData);
      
      if (response.success) {
        alert('Gửi báo cáo thành công!');
        onClose(formData);
      } else {
        setError(response.message || 'Gửi báo cáo thất bại');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-overlay">
      <div className="report-modal">
        <h2>Báo Cáo Cứu Hộ</h2>
        
        {error && (
          <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: '#fee', color: '#c33' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* ... existing form fields ... */}
          
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Đang gửi...' : 'Nộp báo cáo'}
            </button>
            <button type="button" onClick={() => onClose(null)}>Hủy</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReportForm;
```

---

## 6. XỬ LÝ AUTHENTICATION

### 6.1. Protected Routes (Tùy chọn)

Nếu muốn bảo vệ các route chỉ cho user đã login:

**File: `src/components/ProtectedRoute.jsx`**
```javascript
import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

const ProtectedRoute = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default ProtectedRoute;
```

**Sử dụng trong App.jsx:**
```javascript
import ProtectedRoute from './components/ProtectedRoute';

<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } 
/>
```

### 6.2. Hiển thị thông tin user đã login

**Trong Dashboard.jsx:**
```javascript
import authService from '../services/authService';

function Dashboard() {
  const user = authService.getUserInfo();
  const isLoggedIn = authService.isAuthenticated();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Hệ Thống Cứu Hộ</h1>
        <div className="header-buttons">
          {isLoggedIn ? (
            <>
              <span>Xin chào, {user?.fullName}</span>
              <button onClick={handleLogout}>Đăng xuất</button>
            </>
          ) : (
            <button onClick={() => navigate('/login')}>Đăng nhập</button>
          )}
        </div>
      </header>
      {/* ... */}
    </div>
  );
}
```

### 6.3. Logout function

```javascript
const handleLogout = async () => {
  await authService.logout();
  window.location.href = '/';  // Reload về trang chủ
};
```

---

## 7. TESTING VÀ DEBUG

### 7.1. Test từng bước

**Bước 1: Test register**
1. Chạy backend: `dotnet run`
2. Chạy frontend: `npm run dev`
3. Mở `http://localhost:5174/register`
4. Điền form và submit
5. Mở DevTools (F12) → Console → Xem có lỗi không
6. Mở DevTools → Application → Local Storage → Xem `accessToken`, `user`

**Bước 2: Test login**
1. Mở `http://localhost:5174/login`
2. Nhập phone/password đã đăng ký
3. Kiểm tra localStorage có token không

**Bước 3: Test report form**
1. Đăng nhập xong
2. Click "Tạo báo cáo"
3. Điền form và submit
4. Kiểm tra console và network tab

### 7.2. Debug với Browser DevTools

**Network Tab:**
- Mở DevTools (F12) → Network
- Filter: XHR/Fetch
- Xem request/response của mỗi API call
- Kiểm tra:
  - Request URL đúng chưa
  - Request Headers có Authorization không
  - Response status code
  - Response body

**Console Tab:**
- Xem error logs
- Check `console.log()` trong code

**Application Tab:**
- Local Storage → Xem token
- Session Storage (nếu dùng)

### 7.3. Lỗi thường gặp

**Lỗi 1: CORS Error**
```
Access to XMLHttpRequest at 'http://localhost:5000/api/Auth/login' 
from origin 'http://localhost:5174' has been blocked by CORS policy
```

**Giải quyết:** Backend cần thêm CORS config (bạn BE làm)

**Lỗi 2: 401 Unauthorized**
- Token không hợp lệ hoặc hết hạn
- Kiểm tra token trong localStorage
- Thử đăng nhập lại

**Lỗi 3: Network Error**
- Backend chưa chạy
- URL sai trong `api.js`
- Kiểm tra port

**Lỗi 4: "Username đã tồn tại"**
- Đổi số điện thoại khác
- Hoặc dùng API login thay vì register

---

## 8. CHECKLIST HOÀN THÀNH

### Phase 1: Setup
- [ ] Cài axios: `npm install axios`
- [ ] Tạo folder `src/services/`
- [ ] Tạo file `api.js`, `authService.js`, `rescueService.js`
- [ ] Cập nhật `BASE_URL` trong `api.js`

### Phase 2: Components - Register
- [ ] Import `authService` vào `Register.jsx`
- [ ] Thêm field **email** vào form
- [ ] Thêm `loading`, `error` states
- [ ] Đổi `handleSubmit` thành async
- [ ] Gọi `authService.register()`
- [ ] Hiển thị error message

### Phase 3: Components - Login
- [ ] Import `authService` vào `Login.jsx`
- [ ] Thêm `loading`, `error` states
- [ ] Đổi `handleSubmit` thành async
- [ ] Gọi `authService.login()`
- [ ] Hiển thị error message

### Phase 4: Components - ReportForm
- [ ] Import `rescueService` vào `ReportForm.jsx`
- [ ] Thêm `loading`, `error` states
- [ ] Đổi `handleSubmit` thành async
- [ ] Gọi `rescueService.createRescueRequest()`
- [ ] Hiển thị error message

### Phase 5: Testing
- [ ] Test register → Xem localStorage có token không
- [ ] Test login → Đăng nhập thành công
- [ ] Test logout → Token bị xóa khỏi localStorage
- [ ] Test report form → Gửi báo cáo thành công

---

## 9. LƯU Ý QUAN TRỌNG

### 🔴 Backend phải chạy trước!
```bash
cd D:\SWP_git\BE
dotnet run
```

### 🔴 Kiểm tra PORT
Xem backend chạy port nào, sửa trong `api.js`:
```javascript
const BASE_URL = 'http://localhost:5000/api';  // Đổi 5000 nếu khác
```

### 🔴 CORS
Nếu gặp lỗi CORS, bạn BE cần thêm config vào `Program.cs`:
```csharp
builder.Services.AddCors(options => {
    options.AddPolicy("AllowFrontend", policy => {
        policy.WithOrigins("http://localhost:5174")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

app.UseCors("AllowFrontend");
```

### 🔴 Email field
**Register form PHẢI CÓ email** - Backend yêu cầu bắt buộc!

---

## 10. TÀI LIỆU THAM KHẢO

- **Swagger UI:** `http://localhost:5000/swagger`
- **Axios docs:** https://axios-http.com/
- **React Router:** https://reactrouter.com/

---

**✅ Hoàn thành hướng dẫn! Bây giờ bạn có thể tự nối API theo từng bước.**

Nếu gặp vấn đề, kiểm tra:
1. Backend có chạy không
2. Console có lỗi gì
3. Network tab trong DevTools
4. LocalStorage có token không

Good luck! 🚀
