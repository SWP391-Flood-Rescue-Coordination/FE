# FE Review Chi Tiết: Code Map, Layer Map và API Map

Tài liệu này được viết để phục vụ review/chấm hội đồng.  
Mục tiêu là chỉ rõ:

- FE khởi động từ đâu khi chạy `npm run dev`
- mỗi layer trong FE tương tác với nhau như thế nào
- với từng actor, API nào được gọi
- API được nối ở file/hàm nào
- validate nằm ở component nào, service nào
- dữ liệu trả về từ BE được normalize ở đâu

Tài liệu này nên đọc cùng với:

- [README_FE_REVIEW_OVERVIEW.md](./README_FE_REVIEW_OVERVIEW.md)
- [README_FE_REVIEW_AUTH_AND_CITIZEN.md](./README_FE_REVIEW_AUTH_AND_CITIZEN.md)
- [README_FE_REVIEW_COORDINATOR.md](./README_FE_REVIEW_COORDINATOR.md)
- [README_FE_REVIEW_RESCUE_TEAM.md](./README_FE_REVIEW_RESCUE_TEAM.md)
- [README_FE_REVIEW_MANAGER.md](./README_FE_REVIEW_MANAGER.md)
- [README_FE_REVIEW_ADMIN.md](./README_FE_REVIEW_ADMIN.md)

---

## 1. FE khởi động như thế nào khi chạy `npm run dev`

### 1.1. Bước khởi động

Khi chạy:

```bash
npm run dev
```

trình tự FE là:

1. Vite đọc cấu hình trong [vite.config.js](./vite.config.js)
2. FE mở dev server ở `http://localhost:5173`
3. request bắt đầu bằng `/api` được proxy sang BE
4. entry point chạy từ [src/main.jsx](./src/main.jsx)
5. `main.jsx` render `App`
6. [src/App.jsx](./src/App.jsx) quyết định actor nào đang vào route nào

### 1.2. Phần code chính

#### `src/main.jsx`

Vai trò:

- mount React app
- nạp CSS global
- render `App`

#### `src/App.jsx`

Vai trò:

- map route sang page/component
- tách flow theo actor

Ví dụ route map:

```jsx
<Route path="/" element={<Dashboard />} />
<Route path="/rescue-team" element={<RescueTeamDashboard />} />
<Route path="/rescue-coordinator" element={<CoordinatorDashboardPage />} />
<Route path="/manager/vehicles" element={<ManagerVehiclesPage />} />
<Route path="/admin/users" element={<AdminUsersPage />} />
```

---

## 2. Tương tác giữa các layer trong FE

FE hiện đi theo 5 lớp chính:

1. Route layer
2. UI layer
3. Service layer
4. API transport layer
5. Backend

### 2.1. Route layer

Nằm ở:

- [src/App.jsx](./src/App.jsx)

Vai trò:

- phân actor theo URL
- quyết định component gốc nào được render

### 2.2. UI layer

Nằm ở:

- `src/components/*`
- `src/pages/*`

Vai trò:

- nhận input người dùng
- quản lý state cục bộ
- gọi service
- hiển thị dữ liệu

Ví dụ:

- [src/components/RequestForm.jsx](./src/components/RequestForm.jsx)
- [src/components/ViewRequest.jsx](./src/components/ViewRequest.jsx)
- [src/pages/CoordinatorRequestsPage.jsx](./src/pages/CoordinatorRequestsPage.jsx)
- [src/pages/ManagerVehiclesPage.jsx](./src/pages/ManagerVehiclesPage.jsx)

### 2.3. Service layer

Nằm ở:

- [src/services/authService.js](./src/services/authService.js)
- [src/services/rescueRequestService.js](./src/services/rescueRequestService.js)
- [src/services/coordinatorService.js](./src/services/coordinatorService.js)
- [src/services/rescueTeamService.js](./src/services/rescueTeamService.js)
- [src/services/managerService.js](./src/services/managerService.js)
- [src/services/adminService.js](./src/services/adminService.js)

Vai trò:

- gọi API cụ thể
- normalize dữ liệu từ BE
- build payload trước khi submit
- map enum/label giữa FE và BE

### 2.4. API transport layer

Nằm ở:

- [src/services/api.js](./src/services/api.js)

Vai trò:

- tạo `axios instance`
- gắn token
- xử lý `401`
- dùng chung base URL cho mọi service

Code đang thể hiện rõ việc này:

```js
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
```

và:

```js
const token = localStorage.getItem('accessToken')
if (token) {
  config.headers.Authorization = `Bearer ${token}`
}
```

### 2.5. Layer interaction mẫu

Ví dụ với `Tạo yêu cầu`:

1. [src/components/RequestForm.jsx](./src/components/RequestForm.jsx) bắt sự kiện `handleSubmit`
2. gọi [src/services/rescueRequestService.js](./src/services/rescueRequestService.js) qua hàm `createRescueRequest`
3. `rescueRequestService` build payload
4. `rescueRequestService` gọi `api.post('/RescueRequest', payload)`
5. `api.js` tự gắn token nếu có
6. BE trả dữ liệu
7. `rescueRequestService` normalize response
8. `RequestForm.jsx` gọi `onClose(submittedRequest)` để dashboard refresh

---

## 3. Các helper nền tảng dùng lặp lại ở nhiều luồng

### 3.1. `unwrapApiData`

Xuất hiện ở nhiều service:

- [src/services/coordinatorService.js](./src/services/coordinatorService.js)
- [src/services/managerService.js](./src/services/managerService.js)
- [src/services/adminService.js](./src/services/adminService.js)
- [src/services/rescueTeamService.js](./src/services/rescueTeamService.js)

Vai trò:

- bóc dữ liệu từ nhiều dạng response khác nhau như:
  - `response.data.data`
  - `response.data.Data`
  - `response.data`

### 3.2. Normalize data

Ví dụ:

- `normalizeVehicle` trong:
  - [src/services/coordinatorService.js](./src/services/coordinatorService.js)
  - [src/services/managerService.js](./src/services/managerService.js)
  - [src/services/adminService.js](./src/services/adminService.js)
- `normalizeStatus`, `normalizeConditions`, `mergeGuestRequestData` trong [src/services/rescueRequestService.js](./src/services/rescueRequestService.js)

Mục đích:

- chống lệch tên field giữa BE và FE
- gom logic chuyển đổi vào service thay vì rải ra UI

---

## 4. Actor 1: Auth, Guest và Citizen

## 4.1. Route và file chính

- route: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`
- page/component:
  - [src/components/Dashboard.jsx](./src/components/Dashboard.jsx)
  - [src/components/RequestForm.jsx](./src/components/RequestForm.jsx)
  - [src/components/ViewRequest.jsx](./src/components/ViewRequest.jsx)
  - [src/components/ForgotPassword.jsx](./src/components/ForgotPassword.jsx)
  - [src/components/ResetPassword.jsx](./src/components/ResetPassword.jsx)
- service:
  - [src/services/authService.js](./src/services/authService.js)
  - [src/services/rescueRequestService.js](./src/services/rescueRequestService.js)

## 4.2. API login

### API

- `POST /api/Auth/login`

### Nối API ở đâu

- [src/services/authService.js](./src/services/authService.js)  
  Hàm: `login`

### UI gọi ở đâu

- [src/components/Login.jsx](./src/components/Login.jsx)

### Luồng code

```js
// authService.js
login: async (phone, password) => {
  ...
}
```

và UI sẽ gọi qua action login từ popup/page login.

### Sau khi thành công

- lưu `accessToken`
- lưu `refreshToken`
- lưu `user`

Các helper đọc lại session:

- `getUserInfo`
- `getDefaultPhone`
- `logout`

## 4.3. API register

### API

- `POST /api/Auth/register`

### Nối API ở đâu

- [src/services/authService.js](./src/services/authService.js)  
  Hàm: `register`

### Validate FE ở đâu

- [src/components/Register.jsx](./src/components/Register.jsx)
- [src/services/authService.js](./src/services/authService.js)

Điểm đã chỉnh:

- mật khẩu tối thiểu 5 ký tự để khớp BE

## 4.4. Quên mật khẩu

### API bước 1

- `POST /api/auth/forgot-password/send-otp`

### API bước 2

- `POST /api/auth/forgot-password/reset-password`

### Nối API ở đâu

- [src/services/authService.js](./src/services/authService.js)
  - `sendForgotPasswordOtp`
  - `resetForgotPassword`

### UI xử lý ở đâu

- [src/components/ForgotPassword.jsx](./src/components/ForgotPassword.jsx)
- [src/components/ResetPassword.jsx](./src/components/ResetPassword.jsx)

### Validate ở đâu

- blur validation trong `ForgotPassword.jsx`
- submit validation trong `ResetPassword.jsx`

### Code point quan trọng

- `ForgotPassword.jsx`
  - `handleVerifyOtp`
  - các `useEffect` cho countdown OTP
- `ResetPassword.jsx`
  - `handleSubmit`

## 4.5. Tạo yêu cầu cứu hộ

### API

- `POST /api/RescueRequest`

### Nối API ở đâu

- [src/services/rescueRequestService.js](./src/services/rescueRequestService.js)
  - `buildCreatePayload`
  - `validateCreatePayloadInput`
  - `createRescueRequest`
  - `getCreateRequestErrorMessage`

### UI xử lý ở đâu

- [src/components/RequestForm.jsx](./src/components/RequestForm.jsx)
  - `handlePhoneBlur`
  - `handlePeopleFieldBlur`
  - `handleSubmit`

### Validate ở đâu

#### Validate blur ở component

- `handlePhoneBlur`
- `handlePeopleFieldBlur`

#### Validate cuối ở service

- `validateCreatePayloadInput`

Tức là FE đang có 2 tầng validate:

1. validate sớm ở UI để người dùng thấy lỗi ngay
2. validate payload ở service trước khi gọi BE

### Code map

```jsx
// RequestForm.jsx
const data = await rescueRequestService.createRescueRequest(formData)
```

```js
// rescueRequestService.js
const payload = buildCreatePayload(formData)
const response = await api.post('/RescueRequest', payload)
```

### Map API trong form

`RequestForm.jsx` dùng map picker:

- click map
- reverse geocoding
- chỉ cho trong TP.HCM
- tự cập nhật:
  - `location`
  - `address`

## 4.6. Xem và sửa yêu cầu

### API

- `GET /api/RescueRequest/{id}`
- `PUT /api/RescueRequest/{id}/update`
- route guest update tương ứng

### Nối API ở đâu

- [src/services/rescueRequestService.js](./src/services/rescueRequestService.js)
  - `getMyRequests`
  - `updateMyRequest`
  - guest update flow ở nhánh guest

### UI xử lý ở đâu

- [src/components/ViewRequest.jsx](./src/components/ViewRequest.jsx)
  - `handlePhoneBlur`
  - `handlePeopleFieldBlur`
  - `handleSubmit`
  - `handleEditClick`

### Validate ở đâu

- blur validation tại `ViewRequest.jsx`
- payload validation tiếp tục đi qua service

## 4.7. Báo an toàn

### API

- `PUT /api/RescueRequest/{id}/confirm-rescued`
- `PUT /api/RescueRequest/guest/{id}/confirm-rescued`

### Nối API ở đâu

- [src/services/rescueRequestService.js](./src/services/rescueRequestService.js)
  - `confirmRescued`
  - `confirmRescuedAsGuest`

### UI xử lý ở đâu

- [src/components/ViewRequest.jsx](./src/components/ViewRequest.jsx)
  - `handleReportSafe`
- [src/components/Dashboard.jsx](./src/components/Dashboard.jsx)
  - `handleReportSafeFromDashboard`

### Luồng FE

1. Rescue Team hoàn tất nhiệm vụ
2. Citizen side bật notice + chấm đỏ + nút báo an toàn
3. citizen hoặc guest bấm báo an toàn
4. FE gọi API confirm phù hợp
5. UI reset lại trạng thái dashboard

---

## 5. Actor 2: Coordinator

## 5.1. Route và file chính

- route: `/rescue-coordinator`
- page:
  - [src/pages/CoordinatorDashboardPage.jsx](./src/pages/CoordinatorDashboardPage.jsx)
  - [src/pages/CoordinatorRequestsPage.jsx](./src/pages/CoordinatorRequestsPage.jsx)
- service:
  - [src/services/coordinatorService.js](./src/services/coordinatorService.js)

## 5.2. Các API coordinator chính

- `GET /api/RescueRequest`
- `PUT /api/RescueRequest/{id}/verify`
- `PUT /api/RescueRequest/{id}/status`
- `GET /api/rescue-team/status`
- `GET /api/Vehicle`
- `POST /api/RescueOperation/assign`

## 5.3. Nối API ở đâu

Trong [src/services/coordinatorService.js](./src/services/coordinatorService.js):

- `getRescueRequests`
- `getRescueTeams`
- `getVehicles`
- `getAvailableVehicles`
- `verifyRequest`
- `markRequestDuplicate`
- `assignRequest`

## 5.4. UI gọi ở đâu

Trong [src/pages/CoordinatorRequestsPage.jsx](./src/pages/CoordinatorRequestsPage.jsx):

- `handleVerify`
- `openAssignModal`
- `handleAssign`

Trong [src/pages/CoordinatorDashboardPage.jsx](./src/pages/CoordinatorDashboardPage.jsx):

- `useEffect` để tải thống kê và dữ liệu dashboard

## 5.5. Validate/normalize ở đâu

### Trong service

- `toApiStatusValue`
- `toVehicleApiStatusValue`
- `normalizeVehicle`

### Trong page

- kiểm tra đủ team/vehicle trước khi assign
- lọc request theo status, priority, search

### Điểm đặc biệt

- FE coordinator fallback `Tổng số người` nếu API không trả `number_of_affected_people`

---

## 6. Actor 3: Rescue Team

## 6.1. Route và file chính

- route: `/rescue-team`
- component:
  - [src/components/RescueTeamDashboard.jsx](./src/components/RescueTeamDashboard.jsx)
- service:
  - [src/services/rescueTeamService.js](./src/services/rescueTeamService.js)

## 6.2. API chính

- `GET /api/rescue-team/my-operations`
- `PUT /api/rescue-team/operations/{operationId}/status`
- `PUT /api/RescueRequest/{requestId}/status`

## 6.3. Nối API ở đâu

Trong [src/services/rescueTeamService.js](./src/services/rescueTeamService.js):

- `getMyOperations`
- `updateOperationStatus`
- `cancelMissionRequest`
- `getOperationDetails`

## 6.4. UI gọi ở đâu

Trong [src/components/RescueTeamDashboard.jsx](./src/components/RescueTeamDashboard.jsx):

- `handleComplete`
- `handleCancelMission`

## 6.5. Normalize ở đâu

Trong `rescueTeamService.js`:

- `transformOperationToMission`
- `mapStatusDisplay`
- `mapPriorityDisplay`
- `filterActiveMissions`

Tức là BE trả operation, nhưng FE render ra theo shape `mission` dễ dùng hơn.

---

## 7. Actor 4: Manager

## 7.1. Route và file chính

- route: `/manager`, `/manager/vehicles`
- page:
  - [src/pages/ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx)
  - [src/pages/ManagerVehiclesPage.jsx](./src/pages/ManagerVehiclesPage.jsx)
- modal:
  - [src/components/VehicleFormModal.jsx](./src/components/VehicleFormModal.jsx)
- service:
  - [src/services/managerService.js](./src/services/managerService.js)

## 7.2. API manager vehicle

- `GET /api/Vehicle`
- `GET /api/Vehicle/{id}`
- `POST /api/Vehicle`
- `PUT /api/Vehicle/{id}`
- `DELETE /api/Vehicle/{id}`

## 7.3. Nối API ở đâu

Trong [src/services/managerService.js](./src/services/managerService.js):

- `getAllVehicles`
- `getVehicleById`
- `createVehicle`
- `updateVehicle`
- `deleteVehicle`
- `getVehicleTypeOptions`

## 7.4. UI gọi ở đâu

Trong [src/pages/ManagerVehiclesPage.jsx](./src/pages/ManagerVehiclesPage.jsx):

- `fetchVehicles`
- `handleSubmitVehicle`
- `handleDeleteVehicle`

Trong [src/components/VehicleFormModal.jsx](./src/components/VehicleFormModal.jsx):

- `handleCapacityBlur`
- `validateForm`
- `handleSubmit`

## 7.5. Validate ở đâu

### Tại modal

- `handleCapacityBlur`
  - sức chứa phải `>= 2`
- `validateForm`
  - bắt buộc tên xe
  - bắt buộc biển số
  - bắt buộc loại phương tiện
  - bắt buộc vị trí trên bản đồ
  - bắt buộc tọa độ hợp lệ

### Tại input

- biển số được auto uppercase ngay khi nhập
- sức chứa chỉ giữ số bằng `sanitizeNumberText`

## 7.6. Map picker của vehicle

`VehicleFormModal.jsx` đang copy tư duy từ citizen request form:

- click map
- reverse geocode qua Nominatim
- chỉ cho trong TP.HCM
- tự cập nhật:
  - `currentLocation`
  - `latitude`
  - `longitude`
  - `location`

---

## 8. Actor 5: Admin

## 8.1. Route và file chính

- route: `/admin`, `/admin/users`, `/admin/requests`
- page:
  - [src/pages/AdminDashboardPage.jsx](./src/pages/AdminDashboardPage.jsx)
  - [src/pages/AdminUsersPage.jsx](./src/pages/AdminUsersPage.jsx)
- service:
  - [src/services/adminService.js](./src/services/adminService.js)

## 8.2. API chính

- `GET /api/UserInfo`
- `GET /api/UserInfo/roles`
- `PUT /api/UserInfo/{id}/role`
- `PUT /api/UserInfo/{id}/status`
- `GET /api/RescueRequest`
- `PUT /api/RescueRequest/{id}/status`
- `GET /api/Vehicle`

## 8.3. Nối API ở đâu

Trong [src/services/adminService.js](./src/services/adminService.js):

- `getUsers`
- `getRoles`
- `updateUserRole`
- `updateUserStatus`
- `getRequests`
- `cancelRequest`
- `getVehicles`
- `createVehicle`
- `updateVehicle`
- `deleteVehicle`

## 8.4. UI gọi ở đâu

Trong [src/pages/AdminUsersPage.jsx](./src/pages/AdminUsersPage.jsx):

- `useEffect` để tải user/role
- action đổi role
- action bật/tắt trạng thái

Trong [src/pages/AdminDashboardPage.jsx](./src/pages/AdminDashboardPage.jsx):

- `useEffect` để tải dashboard summary

## 8.5. Validate/guard ở đâu

Trong `adminService.js`:

- `normalizeRole`
- `isRestrictedRole`
- `getRoleUpdateRestriction`

Các hàm này giúp:

- chặn sửa role không hợp lệ
- chặn admin tự sửa role của chính mình
- chặn cấp nhầm role nhạy cảm

---

## 9. Những điểm validate quan trọng nhất trong FE

## 9.1. Request form

File:

- [src/components/RequestForm.jsx](./src/components/RequestForm.jsx)
- [src/components/ViewRequest.jsx](./src/components/ViewRequest.jsx)

Validate chính:

- `handlePhoneBlur`
- `handlePeopleFieldBlur`

Service validate cuối:

- [src/services/rescueRequestService.js](./src/services/rescueRequestService.js)
  - `validateCreatePayloadInput`

## 9.2. Forgot password

File:

- [src/components/ForgotPassword.jsx](./src/components/ForgotPassword.jsx)
- [src/components/ResetPassword.jsx](./src/components/ResetPassword.jsx)

Validate chính:

- số điện thoại hợp lệ
- OTP đúng mới qua bước tiếp theo
- mật khẩu mới hợp lệ
- xác nhận mật khẩu khớp

## 9.3. Vehicle form

File:

- [src/components/VehicleFormModal.jsx](./src/components/VehicleFormModal.jsx)

Validate chính:

- sức chứa `>= 2`
- biển số không trống
- loại xe không trống
- phải chọn vị trí trên map
- tọa độ phải parse được thành số

---

## 10. Các key lưu trong browser

### Login/session

Trong [src/services/authService.js](./src/services/authService.js):

- `accessToken`
- `refreshToken`
- `user`

### Guest request

Trong [src/services/rescueRequestService.js](./src/services/rescueRequestService.js):

- `guestRescueRequestTracking`
- `guestRescueRequestDetails`

Điểm quan trọng:

- guest flow hiện không còn dùng `access_code`

---

## 11. Cách trình bày ngắn trước hội đồng

Nếu cần trình bày ngắn gọn, có thể nói FE đang hoạt động theo mô hình:

1. [src/App.jsx](./src/App.jsx) chia route theo actor
2. component/page nhận thao tác người dùng
3. component gọi service
4. service build payload + normalize response
5. service gọi xuống [src/services/api.js](./src/services/api.js)
6. `api.js` gắn token và gọi BE
7. dữ liệu trả về được đưa ngược lại UI để render

Mỗi actor đều đi theo khuôn mẫu này, chỉ khác:

- route
- page/component
- service
- bộ API cụ thể
- rule validate và normalize riêng

Đó là điểm giúp hệ thống FE dễ review, dễ mở rộng và dễ bảo trì.
