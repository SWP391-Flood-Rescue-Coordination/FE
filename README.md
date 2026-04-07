# SWP391 FE README

Tài liệu này được viết để đọc xong là có thể trình bày được cấu trúc code frontend hiện tại.

Phạm vi của tài liệu:
- Có: `đăng nhập`, `đăng ký`, `quên mật khẩu`, `citizen/guest rescue request`, `admin`, `coordinator`
- Không đi sâu: `manager`, `rescue team`

Lưu ý trong tài liệu này:
- Khi nói `rescue request` thì đang ám chỉ actor `citizen/guest`
- Frontend hiện dùng `React + Vite`
- Hầu hết luồng đều theo mẫu: `Route -> Page wrapper -> Component/Page nghiệp vụ -> Service -> API`

## 1. Mục tiêu đọc README này

Sau khi đọc xong, người đọc nên trả lời được:
- Route nào đi vào file nào
- File nào là UI, file nào là service
- Mỗi actor đi qua những bước nghiệp vụ nào
- Những function chính trong từng flow dùng để làm gì
- Dữ liệu localStorage/sessionStorage được dùng ở đâu

## 2. Kiến trúc tổng quát

### 2.1. Entry và route

- [`src/main.jsx`](./src/main.jsx)
  - Điểm mount React app vào DOM
- [`src/App.jsx`](./src/App.jsx)
  - Route map gốc của frontend
  - Từ file này chia toàn bộ hệ thống thành các actor:
    - `citizen/guest`
    - `auth`
    - `admin`
    - `coordinator`
    - `manager`
    - `rescue team`

### 2.2. Mẫu tổ chức code hiện tại

Project đang chia thành 3 lớp chính:

1. `pages`
- Chủ yếu làm nhiệm vụ route wrapper
- Quyết định điều hướng giữa các route
- Bọc các component nghiệp vụ lớn

2. `components`
- Chứa UI và state tương tác
- Gọi service để làm việc với backend

3. `services`
- Chứa logic gọi API
- Chuẩn hóa dữ liệu request/response
- Giữ các helper dùng chung như validation, mapping, local cache

## 3. Route map cần nắm

| Route | Actor | File route/page | Màn hình chính |
| --- | --- | --- | --- |
| `/` | Citizen / Guest | [`src/components/Dashboard.jsx`](./src/components/Dashboard.jsx) | Dashboard công dân và khách |
| `/login` | Auth | [`src/pages/LoginPage.jsx`](./src/pages/LoginPage.jsx) | Đăng nhập |
| `/register` | Auth | [`src/pages/RegisterPage.jsx`](./src/pages/RegisterPage.jsx) | Đăng ký |
| `/forgot-password` | Auth | [`src/pages/ForgotPasswordPage.jsx`](./src/pages/ForgotPasswordPage.jsx) | Quên mật khẩu |
| `/reset-password` | Auth legacy | [`src/pages/ResetPasswordPage.jsx`](./src/pages/ResetPasswordPage.jsx) | Route tương thích ngược, tự chuyển về `/forgot-password` |
| **Admin Routes** |  |  |  |
| `/admin` | Admin | [`src/pages/AdminDashboardPage.jsx`](./src/pages/AdminDashboardPage.jsx) | Dashboard admin |
| `/admin/users` | Admin | [`src/pages/AdminUsersPage.jsx`](./src/pages/AdminUsersPage.jsx) | Quản lý người dùng |
| `/admin/requests` | Admin | [`src/pages/AdminRequestsPage.jsx`](./src/pages/AdminRequestsPage.jsx) | Quản lý cứu hộ requests |
| `/admin/rescue-teams` | Admin | [`src/pages/AdminRescueTeamsPage.jsx`](./src/pages/AdminRescueTeamsPage.jsx) | Quản lý đội cứu hộ |
| **Coordinator Routes** |  |  |  |
| `/rescue-coordinator` | Coordinator | [`src/pages/CoordinatorDashboardPage.jsx`](./src/pages/CoordinatorDashboardPage.jsx) | Dashboard điều phối |
| `/rescue-coordinator/requests` | Coordinator | [`src/pages/CoordinatorRequestsPage.jsx`](./src/pages/CoordinatorRequestsPage.jsx) | Quản lý requests điều phối |
| **Manager Routes** |  |  |  |
| `/manager` | Manager | [`src/pages/ManagerDashboardPage.jsx`](./src/pages/ManagerDashboardPage.jsx) | Dashboard quản lý |
| `/manager/vehicles` | Manager | [`src/pages/ManagerVehiclesPage.jsx`](./src/pages/ManagerVehiclesPage.jsx) | Quản lý phương tiện |
| `/manager/supplies` | Manager | [`src/pages/ManagerSuppliesPage.jsx`](./src/pages/ManagerSuppliesPage.jsx) | Quản lý vật tư |
| `/manager/relief-export` | Manager | [`src/pages/ManagerReliefExportPage.jsx`](./src/pages/ManagerReliefExportPage.jsx) | Xuất cứu trợ |
| `/manager/import-receipts` | Manager | [`src/pages/ManagerImportReceiptsListPage.jsx`](./src/pages/ManagerImportReceiptsListPage.jsx) | Danh sách phiếu nhập |
| `/manager/import-receipts/:id` | Manager | [`src/pages/ManagerImportReceiptPage.jsx`](./src/pages/ManagerImportReceiptPage.jsx) | Chi tiết phiếu nhập |
| **Rescue Team Routes** |  |  |  |
| `/rescue-team` | Rescue Team Leader | [`src/components/RescueTeamDashboard.jsx`](./src/components/RescueTeamDashboard.jsx) | Dashboard trưởng đội |
| `/rescue-team/member` | Rescue Team Member | [`src/pages/RescueTeamMemberPage.jsx`](./src/pages/RescueTeamMemberPage.jsx) | Dashboard thành viên đội |

## 4. Tầng hạ tầng dùng chung

### 4.1. `api.js`

File: [`src/services/api.js`](./src/services/api.js)

Vai trò:
- Tạo `axios instance` dùng chung cho toàn app
- Gắn `baseURL`
- Tự động gắn `Bearer token` vào request protected
- Khi gặp `401`, tự xóa session local để tránh giữ token cũ

Ý nghĩa:
- Component không gọi `axios` trực tiếp
- Mọi service đều đi qua `api.js`
- Nhờ vậy logic auth được thống nhất

### 4.2. `adminShared.js`

File: [`src/pages/adminShared.js`](./src/pages/adminShared.js)

Vai trò:
- Chứa helper normalize cho `admin` và `coordinator`
- Format date/time
- Normalize role/status
- Cung cấp route home theo role

Ý nghĩa:
- Tránh lặp lại logic format trong nhiều page
- Khi thuyết trình có thể gọi đây là “lớp helper chung cho các actor quản trị”

## 5. Dữ liệu lưu local

### 5.1. Auth/session

Trong [`src/services/authService.js`](./src/services/authService.js):
- `accessToken`
- `refreshToken`
- `user`

### 5.2. Forgot password

Trong [`src/services/authService.js`](./src/services/authService.js):
- `forgotPasswordResetContext`

Mục đích:
- Lưu tạm phone/otp/maskedEmail để route `/reset-password` có thể chuyển ngược về `/forgot-password`

### 5.3. Guest rescue request

Trong [`src/services/rescueRequestService.js`](./src/services/rescueRequestService.js):
- `guestRescueRequestTracking`
- `guestRescueRequestDetails`

Trong [`src/services/authService.js`](./src/services/authService.js):
- `guestRescueRequestTrackingBackup`
- `guestRescueRequestDetailsBackup`

Mục đích:
- Guest không có account vẫn theo dõi được request vừa tạo
- Nếu guest đăng nhập rồi logout trong cùng tab, request guest cũ vẫn được phục hồi

## 6. Luồng Auth

## 6.1. Đăng nhập

### File đi qua

1. [`src/App.jsx`](./src/App.jsx)
2. [`src/pages/LoginPage.jsx`](./src/pages/LoginPage.jsx)
3. [`src/components/Login.jsx`](./src/components/Login.jsx)
4. [`src/services/authService.js`](./src/services/authService.js)
5. [`src/services/api.js`](./src/services/api.js)

### API

- `POST /api/Auth/login`

### Dòng chảy code

1. Người dùng vào route `/login`
2. `App.jsx` render `LoginPage`
3. `LoginPage.jsx` render `Login`
4. `Login.jsx`
   - giữ state `phone`, `password`, `loading`, `fieldErrors`
   - `handleSubmit` gọi `authService.validateLoginInput`
   - nếu pass thì gọi `authService.login`
5. `authService.login`
   - tạo payload `{ phone, password }`
   - gọi `api.post('/Auth/login', payload, { skipAuth: true })`
   - nếu thành công thì lưu:
     - `accessToken`
     - `user`
   - đồng thời gọi `preserveGuestRequestContextForLogout()` để bảo toàn ngữ cảnh guest nếu cần
6. `Login.jsx` trả `data.user` về `LoginPage` qua `onLoginSuccess`
7. `LoginPage.handleLoginSuccess`
   - đọc role
   - chuyển đến dashboard phù hợp:
     - `CITIZEN -> /`
     - `COORDINATOR -> /rescue-coordinator`
     - `ADMIN -> /admin`
     - `MANAGER -> /manager`
     - `RESCUE_TEAM -> /rescue-team`

### Function cần nhớ

Trong [`src/components/Login.jsx`](./src/components/Login.jsx):
- `clearFieldError`
  - xóa lỗi của từng field khi user đang gõ lại
- `handleSubmit`
  - handler chính của form login
- `handleForgotPasswordClick`
  - chuyển sang route quên mật khẩu
- `handleRegisterClick`
  - chuyển sang route đăng ký

Trong [`src/services/authService.js`](./src/services/authService.js):
- `validateLoginInput`
  - validate số điện thoại và mật khẩu
- `login`
  - gọi API đăng nhập thật
- `getLoginErrorMessage`
  - convert lỗi backend thành message thân thiện cho UI

## 6.2. Đăng ký

### File đi qua

1. [`src/App.jsx`](./src/App.jsx)
2. [`src/pages/RegisterPage.jsx`](./src/pages/RegisterPage.jsx)
3. [`src/components/Register.jsx`](./src/components/Register.jsx)
4. [`src/services/authService.js`](./src/services/authService.js)
5. [`src/services/api.js`](./src/services/api.js)

### API

- `POST /api/Auth/register`

### Dòng chảy code

1. Người dùng vào route `/register`
2. `RegisterPage.jsx` render `Register`
3. `Register.jsx`
   - giữ state:
     - `phone`
     - `email`
     - `password`
     - `confirmPassword`
     - `firstName`
     - `lastName`
   - trong `handleSubmit`:
     - tách `username = email.split('@')[0]`
     - gọi `authService.validateRegisterInput(...)`
     - nếu lỗi confirm password hoặc lỗi field bắt buộc thì xóa trắng cả 2 ô password
     - ghép `lastName + firstName` thành `fullName`
     - gọi `authService.register`
4. `authService.register`
   - gửi payload `{ username, phone, email, password, fullName }`
   - gọi `POST /Auth/register`
5. Nếu thành công:
   - `Register.jsx` hiện popup success
   - `handleSuccessConfirm` đưa người dùng sang login

### Function cần nhớ

Trong [`src/components/Register.jsx`](./src/components/Register.jsx):
- `handleSubmit`
  - handler chính của form đăng ký
- `handleSuccessConfirm`
  - đóng popup thành công và điều hướng sang login
- `handleLoginClick`
  - link phụ “Đăng nhập tại đây”

Trong [`src/services/authService.js`](./src/services/authService.js):
- `validateRegisterInput`
  - validate tất cả field đăng ký
- `register`
  - gọi API đăng ký
- `getRegisterErrorMessage`
  - map lỗi backend ra message UI

## 6.3. Quên mật khẩu

### File đi qua

1. [`src/App.jsx`](./src/App.jsx)
2. [`src/pages/ForgotPasswordPage.jsx`](./src/pages/ForgotPasswordPage.jsx)
3. [`src/components/ForgotPassword.jsx`](./src/components/ForgotPassword.jsx)
4. [`src/services/authService.js`](./src/services/authService.js)
5. [`src/services/api.js`](./src/services/api.js)

Route liên quan thêm:
- [`src/pages/ResetPasswordPage.jsx`](./src/pages/ResetPasswordPage.jsx)

### API

- `POST /api/Auth/forgot-password/send-otp`
- `POST /api/Auth/forgot-password/reset-password`

### Kiến trúc hiện tại

Luồng reset password đã được gom vào **một component duy nhất** là [`ForgotPassword.jsx`](./src/components/ForgotPassword.jsx).

Component này có 2 step:
- `request`
  - nhập số điện thoại
- `verify`
  - nhập OTP
  - nhập mật khẩu mới
  - nhập xác nhận mật khẩu mới

### Dòng chảy code

1. Người dùng bấm `Quên mật khẩu` ở [`Login.jsx`](./src/components/Login.jsx)
2. Route chuyển sang `/forgot-password`
3. [`ForgotPassword.jsx`](./src/components/ForgotPassword.jsx)
   - `handleRequestSubmit` gọi `handleSendOtp`
4. `handleSendOtp`
   - gọi `authService.sendForgotPasswordOtp(phone)`
   - lấy email đã che từ response qua `authService.extractForgotPasswordMaskedEmail`
   - chuyển component sang step `verify`
   - khởi động countdown gửi lại OTP
5. Ở step verify:
   - user nhập OTP
   - nhập mật khẩu mới
   - nhập xác nhận mật khẩu mới
6. `handleResetPasswordSubmit`
   - validate OTP
   - validate password mới
   - nếu confirm password sai thì gọi `handlePasswordMismatch`
     - xóa trắng 2 ô password
     - focus lại ô password
     - chỉ để lỗi cạnh field confirm
   - sau đó gọi `authService.resetForgotPassword`
7. Nếu thành công:
   - hiện trạng thái thành công
   - đếm ngược
   - quay về login

### Route `/reset-password`

[`src/pages/ResetPasswordPage.jsx`](./src/pages/ResetPasswordPage.jsx) hiện không còn render một màn reset riêng.

Nó chỉ:
- đọc `forgotPasswordResetContext` từ `authService`
- redirect về `/forgot-password`
- truyền state để resume đúng step

Ý nghĩa:
- tránh tồn tại 2 UI reset khác nhau
- toàn bộ logic reset password tập trung vào một nơi duy nhất

### Function cần nhớ

Trong [`src/components/ForgotPassword.jsx`](./src/components/ForgotPassword.jsx):
- `validatePhone`
  - validate số điện thoại
- `handleSendOtp`
  - gửi OTP
- `handleResendOtp`
  - gửi lại OTP
- `handlePasswordMismatch`
  - xử lý confirm password sai
- `handleResetPasswordSubmit`
  - submit cuối của luồng reset
- `handleLoginClick`
  - quay về login

Trong [`src/services/authService.js`](./src/services/authService.js):
- `sendForgotPasswordOtp`
- `resetForgotPassword`
- `extractForgotPasswordMaskedEmail`
- `validateResetPasswordInput`
- `isForgotPasswordOtpErrorMessage`

## 7. Luồng Citizen / Guest Rescue Request

Đây là phần `rescue request` theo nghĩa actor công dân/khách.

Các file chính:
- [`src/components/Dashboard.jsx`](./src/components/Dashboard.jsx)
- [`src/components/RequestForm.jsx`](./src/components/RequestForm.jsx)
- [`src/components/ViewRequest.jsx`](./src/components/ViewRequest.jsx)
- [`src/services/rescueRequestService.js`](./src/services/rescueRequestService.js)

## 7.1. Dashboard citizen/guest

### File đi qua

1. [`src/App.jsx`](./src/App.jsx)
2. [`src/components/Dashboard.jsx`](./src/components/Dashboard.jsx)
3. [`src/services/authService.js`](./src/services/authService.js)
4. [`src/services/rescueRequestService.js`](./src/services/rescueRequestService.js)

### Vai trò của Dashboard

Dashboard là màn trung tâm của citizen/guest:
- biết user hiện tại là `citizen` hay `guest`
- tải lịch sử yêu cầu
- hiển thị thống kê
- mở `RequestForm`
- mở `ViewRequest`
- hiển thị tín hiệu `Báo an toàn`

### Cách phân biệt citizen và guest

Trong [`Dashboard.jsx`](./src/components/Dashboard.jsx):
- `isAuthenticated = authService.isAuthenticated()`
- `currentUser = authService.getUserInfo()`
- `roleKey = normalizeRole(currentUser?.role)`
- `isCitizen = isAuthenticated && roleKey === 'CITIZEN'`

Nếu:
- là `citizen`
  - gọi API `getMyRequests`
- là `guest`
  - dùng `getTrackedGuestRequestStatus`

### Function cần nhớ

Trong [`src/components/Dashboard.jsx`](./src/components/Dashboard.jsx):
- `loadRequestHistory`
  - citizen lấy list request của mình
  - guest lấy request đang track qua localStorage
- `loadDashboardStatistics`
  - lấy thống kê dashboard
- `handleOpenRequestForm`
  - mở popup tạo yêu cầu
- `handleOpenStatusDetail`
  - mở popup xem yêu cầu hiện tại
- `handleReportSafeFromDashboard`
  - nút lối tắt báo an toàn ngay tại dashboard
- `handleCloseRequestForm`
  - refresh lại dashboard sau khi tạo yêu cầu thành công

## 7.2. Tạo rescue request

### File đi qua

1. [`src/components/Dashboard.jsx`](./src/components/Dashboard.jsx)
2. [`src/components/RequestForm.jsx`](./src/components/RequestForm.jsx)
3. [`src/services/rescueRequestService.js`](./src/services/rescueRequestService.js)
4. [`src/services/api.js`](./src/services/api.js)

### API

- `POST /api/RescueRequest`

### Dòng chảy code

1. Từ dashboard, người dùng bấm `Tạo yêu cầu`
2. Dashboard mở [`RequestForm.jsx`](./src/components/RequestForm.jsx)
3. `RequestForm.jsx`
   - giữ `formData`
   - khởi tạo map Leaflet
   - khi click map:
     - lấy `lat/lng`
     - reverse geocode sang địa chỉ
     - chỉ chấp nhận điểm ở TP.HCM
4. `handleSubmit`
   - kiểm tra đã chọn vị trí hay chưa
   - validate số điện thoại
   - validate số người
   - gọi `rescueRequestService.validateCreatePayloadInput`
   - sau đó gọi `rescueRequestService.createRescueRequest`
5. Trong service:
   - `buildCreatePayload(formData)` chuyển state form sang payload backend
   - gọi `POST /RescueRequest`
   - nếu có `requestId` thì lưu:
     - `guestRescueRequestTracking`
     - `guestRescueRequestDetails`
6. `RequestForm` trả `requestData` về `Dashboard`
7. `Dashboard.handleCloseRequestForm`
   - đóng popup
   - load lại lịch sử
   - load lại thống kê

### Function cần nhớ

Trong [`src/components/RequestForm.jsx`](./src/components/RequestForm.jsx):
- `handleConditionChange`
  - đổi trạng thái checkbox điều kiện
  - xử lý cặp loại trừ `floodUnder1m` / `floodOver1m`
- `handlePeopleFieldBlur`
  - validate sớm nhóm số người
- `handlePhoneBlur`
  - validate số điện thoại khi rời field
- `handleSubmit`
  - submit chính của flow tạo yêu cầu

Trong [`src/services/rescueRequestService.js`](./src/services/rescueRequestService.js):
- `parseCoordinates`
- `parsePeopleCounts`
- `buildCreatePayload`
- `validateCreatePayloadInput`
- `createRescueRequest`

## 7.3. Xem và sửa rescue request

### File đi qua

1. [`src/components/Dashboard.jsx`](./src/components/Dashboard.jsx)
2. [`src/components/ViewRequest.jsx`](./src/components/ViewRequest.jsx)
3. [`src/services/rescueRequestService.js`](./src/services/rescueRequestService.js)

### API

Citizen:
- `GET /api/RescueRequest/{id}`
- `GET /api/RescueRequest/my-latest-request`
- `PUT /api/RescueRequest/{id}/update`

Guest:
- `GET /api/RescueRequest/guest/status?requestId=...`
- `PUT /api/RescueRequest/guest/update/{id}`

### Dòng chảy code

1. Từ dashboard, user bấm xem trạng thái/yêu cầu
2. Dashboard mở [`ViewRequest.jsx`](./src/components/ViewRequest.jsx)
3. `ViewRequest`
   - xác định `usesCitizenRequestFlow`
   - trong `loadRequestData`:
     - citizen:
       - ưu tiên `getRequestById`
       - nếu không có id thì `getMyLatestRequest`
     - guest:
       - `getGuestRequestStatus`
       - hoặc `getTrackedGuestRequestStatus`
   - sau đó gọi `rescueRequestService.toRequestFormData`
     - normalize dữ liệu về shape UI thống nhất
4. Nếu request còn `Pending`
   - nút `Chỉnh sửa` mới được bật
5. Khi submit edit:
   - `handleSubmit`
   - dùng `updateMyRequest` hoặc `updateGuestRequest`
   - refresh lại dữ liệu form

### Function cần nhớ

Trong [`src/components/ViewRequest.jsx`](./src/components/ViewRequest.jsx):
- `loadRequestData`
  - điểm rẽ chính giữa citizen và guest
- `handlePeopleFieldBlur`
  - validate số người lúc edit
- `handlePhoneBlur`
  - validate số điện thoại lúc edit
- `handleEditClick`
  - bật edit mode
- `handleSubmit`
  - update request

Trong [`src/services/rescueRequestService.js`](./src/services/rescueRequestService.js):
- `toRequestFormData`
  - normalize data backend về shape UI
- `updateMyRequest`
- `updateGuestRequest`
- `buildGuestUpdatePayload`

## 7.4. Guest tracking

### Mục tiêu

Guest không có account nhưng vẫn phải:
- tạo request
- refresh trình duyệt
- quay lại xem request vừa tạo

### Cách làm

Trong [`src/services/rescueRequestService.js`](./src/services/rescueRequestService.js):
- `storeGuestTracking`
  - lưu `requestId`
- `storeGuestDetails`
  - lưu snapshot của request
- `getTrackedGuestRequestStatus`
  - lấy `requestId` từ localStorage
  - gọi API guest status
  - merge API response với cache local bằng `mergeGuestRequestData`

### Ý nghĩa

Nhờ lớp cache này:
- `Dashboard.jsx` vẫn hiển thị được request guest
- `ViewRequest.jsx` vẫn xem/sửa được request guest

## 7.5. Báo an toàn

### File đi qua

1. [`src/components/Dashboard.jsx`](./src/components/Dashboard.jsx)
2. [`src/components/ViewRequest.jsx`](./src/components/ViewRequest.jsx)
3. [`src/services/rescueRequestService.js`](./src/services/rescueRequestService.js)

### API

Citizen:
- `PUT /api/RescueRequest/{id}/confirm-rescued`

Guest:
- `PUT /api/RescueRequest/guest/{id}/confirm-rescued`

### Dòng chảy code

1. Rescue team hoàn tất nhiệm vụ ở backend
2. Request phía citizen/guest bắt đầu có `canReportSafe = true`
3. `Dashboard.jsx` hoặc `ViewRequest.jsx` hiển thị:
   - notice
   - chấm đỏ
   - nút `Báo an toàn`
4. Người dùng bấm báo an toàn:
   - citizen gọi `confirmRescued`
   - guest gọi `confirmRescuedAsGuest`
5. Service cập nhật lại cache local guest nếu cần
6. Dashboard/ViewRequest reload lại trạng thái mới

### Function cần nhớ

Trong [`src/components/Dashboard.jsx`](./src/components/Dashboard.jsx):
- `handleReportSafeFromDashboard`

Trong [`src/components/ViewRequest.jsx`](./src/components/ViewRequest.jsx):
- `handleReportSafe`

Trong [`src/services/rescueRequestService.js`](./src/services/rescueRequestService.js):
- `confirmRescued`
- `confirmRescuedAsGuest`
- `getConfirmRescuedErrorMessage`

## 8. Luồng Admin

Các file chính:
- [`src/components/AdminLayout.jsx`](./src/components/AdminLayout.jsx)
- [`src/pages/AdminDashboardPage.jsx`](./src/pages/AdminDashboardPage.jsx)
- [`src/pages/AdminUsersPage.jsx`](./src/pages/AdminUsersPage.jsx)
- [`src/pages/AdminRequestsPage.jsx`](./src/pages/AdminRequestsPage.jsx)
- [`src/services/adminService.js`](./src/services/adminService.js)
- [`src/pages/adminShared.js`](./src/pages/adminShared.js)

## 8.1. AdminLayout

`AdminLayout` là khung dùng chung cho toàn bộ route admin.

Vai trò:
- header admin
- user menu
- drawer sidebar
- logout confirm
- access denied UI

Ý nghĩa:
- `AdminDashboardPage`, `AdminUsersPage`, `AdminRequestsPage` không phải tự dựng lại layout

## 8.2. Dashboard admin

### File đi qua

1. [`src/App.jsx`](./src/App.jsx)
2. [`src/pages/AdminDashboardPage.jsx`](./src/pages/AdminDashboardPage.jsx)
3. [`src/services/adminService.js`](./src/services/adminService.js)
4. [`src/components/AdminLayout.jsx`](./src/components/AdminLayout.jsx)

### Ý tưởng chính

Admin dashboard không có một API tổng hợp duy nhất.
Frontend tự gọi nhiều API rồi ghép lại thành overview:
- users
- rescue teams
- vehicles
- rescue requests

### API chính

- `GET /api/UserInfo`
- API rescue team
- `GET /api/Vehicle`
- `GET /api/RescueRequest`

### Function cần nhớ

Trong [`src/pages/AdminDashboardPage.jsx`](./src/pages/AdminDashboardPage.jsx):
- `loadOverview`
  - hàm trung tâm của dashboard admin
  - gọi nhiều API song song bằng `Promise.allSettled`
  - nếu 1 nhánh lỗi nhẹ, dashboard vẫn có thể render phần còn lại

Trong [`src/services/adminService.js`](./src/services/adminService.js):
- `getUsers`
- `getRescueTeams`
- `getVehicles`
- `getRequests`

## 8.3. Quản lý user

### File đi qua

1. [`src/App.jsx`](./src/App.jsx)
2. [`src/pages/AdminUsersPage.jsx`](./src/pages/AdminUsersPage.jsx)
3. [`src/services/adminService.js`](./src/services/adminService.js)

### API chính

- `GET /api/UserInfo`
- `GET /api/UserInfo/roles`
- API đổi role user
- API đổi trạng thái user

### Dòng chảy code

1. Page mount
2. `loadUsers`
   - tải `userItems`
   - tải `roleItems`
   - dựng `draftRoles`
3. Admin chọn role mới hoặc bấm khóa/mở khóa
4. `handleUpdateRole`
   - kiểm tra restriction bằng `adminService.getRoleUpdateRestriction`
   - gọi API update role
   - refresh danh sách
5. `handleToggleUserStatus`
   - xác nhận bằng `window.confirm`
   - gọi API đổi trạng thái
   - refresh danh sách

### Function cần nhớ

Trong [`src/pages/AdminUsersPage.jsx`](./src/pages/AdminUsersPage.jsx):
- `loadUsers`
- `handleUpdateRole`
- `handleToggleUserStatus`

Trong [`src/services/adminService.js`](./src/services/adminService.js):
- `getRoles`
- `getRoleLabel`
- `getRoleUpdateRestriction`

## 8.4. Quản lý request

### File đi qua

1. [`src/App.jsx`](./src/App.jsx)
2. [`src/pages/AdminRequestsPage.jsx`](./src/pages/AdminRequestsPage.jsx)
3. [`src/services/adminService.js`](./src/services/adminService.js)

### API chính

- `GET /api/RescueRequest`
- `PUT /api/RescueRequest/{id}/status`

### Dòng chảy code

1. Page mount
2. `loadRequests`
   - tải list request theo status filter
3. Admin bấm hủy request
4. `handleCancelRequest`
   - xác nhận thao tác
   - gọi `adminService.cancelRequest`
   - reload bảng

### Function cần nhớ

Trong [`src/pages/AdminRequestsPage.jsx`](./src/pages/AdminRequestsPage.jsx):
- `loadRequests`
- `handleCancelRequest`

Trong [`src/services/adminService.js`](./src/services/adminService.js):
- `getRequests`
- `cancelRequest`
- `getErrorMessage`

## 9. Luồng Coordinator

Các file chính:
- [`src/pages/CoordinatorDashboardPage.jsx`](./src/pages/CoordinatorDashboardPage.jsx)
- [`src/pages/CoordinatorRequestsPage.jsx`](./src/pages/CoordinatorRequestsPage.jsx)
- [`src/services/coordinatorService.js`](./src/services/coordinatorService.js)

## 9.1. Dashboard coordinator

### File đi qua

1. [`src/App.jsx`](./src/App.jsx)
2. [`src/pages/CoordinatorDashboardPage.jsx`](./src/pages/CoordinatorDashboardPage.jsx)
3. [`src/services/coordinatorService.js`](./src/services/coordinatorService.js)
4. [`src/pages/CoordinatorRequestsPage.jsx`](./src/pages/CoordinatorRequestsPage.jsx)

### Vai trò

Dashboard coordinator vừa làm 2 việc:
- hiển thị overview:
  - tổng request theo trạng thái
  - tổng team
  - tổng vehicle
- nhúng bảng request bên dưới để điều phối viên thao tác ngay

### API chính

- `GET /api/RescueRequest`
- API rescue team
- `GET /api/Vehicle`

### Function cần nhớ

Trong [`src/pages/CoordinatorDashboardPage.jsx`](./src/pages/CoordinatorDashboardPage.jsx):
- `fetchDashboardStats`
  - tải song song request, team, vehicle
  - normalize thành state summary

## 9.2. Bảng request coordinator

### File đi qua

1. [`src/pages/CoordinatorDashboardPage.jsx`](./src/pages/CoordinatorDashboardPage.jsx)
2. [`src/pages/CoordinatorRequestsPage.jsx`](./src/pages/CoordinatorRequestsPage.jsx)
3. [`src/services/coordinatorService.js`](./src/services/coordinatorService.js)

### Vai trò

Đây là màn thao tác chính của coordinator:
- xem request
- filter theo status
- verify request
- mark duplicate
- assign team và vehicle

### API chính

- `GET /api/RescueRequest`
- `PUT /api/RescueRequest/{id}/verify`
- `PUT /api/RescueRequest/{id}/status`
- `POST /api/RescueOperation/assign`
- API lấy team
- API lấy vehicle

### Dòng chảy code

1. Page mount
2. `fetchRequestList`
   - tải request
   - normalize bằng `normalizeRequest`
3. `fetchOptionData`
   - tải team
   - tải vehicle
4. Coordinator thao tác trên từng request:
   - `handleVerify`
   - `handleMarkDuplicate`
   - `openAssignModal`
5. Trong modal assign:
   - chọn team
   - chọn vehicle
   - nhập estimated time
6. `handleAssign`
   - gọi `coordinatorService.assignRequest`
   - refresh request list
   - refresh option data

### Function cần nhớ

Trong [`src/pages/CoordinatorRequestsPage.jsx`](./src/pages/CoordinatorRequestsPage.jsx):
- `normalizeRequest`
  - normalize DTO request về shape bảng thống nhất
- `fetchRequestList`
- `fetchOptionData`
- `handleVerify`
- `handleMarkDuplicate`
- `openAssignModal`
- `handleAssign`

Trong [`src/services/coordinatorService.js`](./src/services/coordinatorService.js):
- `getRescueRequests`
- `getRescueTeams`
- `getVehicles`
- `verifyRequest`
- `markRequestDuplicate`
- `assignRequest`

## 10. Cách trình bày code nhanh trước hội đồng

Nếu cần trình bày ngắn gọn 5-7 phút, có thể đi như sau:

1. Bắt đầu từ [`src/App.jsx`](./src/App.jsx)
- giới thiệu route map theo actor

2. Giải thích tầng dùng chung
- [`src/services/api.js`](./src/services/api.js)
- [`src/pages/adminShared.js`](./src/pages/adminShared.js)

3. Đi qua luồng auth
- [`src/pages/LoginPage.jsx`](./src/pages/LoginPage.jsx)
- [`src/components/Login.jsx`](./src/components/Login.jsx)
- [`src/components/Register.jsx`](./src/components/Register.jsx)
- [`src/components/ForgotPassword.jsx`](./src/components/ForgotPassword.jsx)
- [`src/services/authService.js`](./src/services/authService.js)

4. Đi qua luồng citizen rescue request
- [`src/components/Dashboard.jsx`](./src/components/Dashboard.jsx)
- [`src/components/RequestForm.jsx`](./src/components/RequestForm.jsx)
- [`src/components/ViewRequest.jsx`](./src/components/ViewRequest.jsx)
- [`src/services/rescueRequestService.js`](./src/services/rescueRequestService.js)

5. Đi qua luồng admin
- [`src/components/AdminLayout.jsx`](./src/components/AdminLayout.jsx)
- [`src/pages/AdminDashboardPage.jsx`](./src/pages/AdminDashboardPage.jsx)
- [`src/pages/AdminUsersPage.jsx`](./src/pages/AdminUsersPage.jsx)
- [`src/pages/AdminRequestsPage.jsx`](./src/pages/AdminRequestsPage.jsx)
- [`src/services/adminService.js`](./src/services/adminService.js)

6. Đi qua luồng coordinator
- [`src/pages/CoordinatorDashboardPage.jsx`](./src/pages/CoordinatorDashboardPage.jsx)
- [`src/pages/CoordinatorRequestsPage.jsx`](./src/pages/CoordinatorRequestsPage.jsx)
- [`src/services/coordinatorService.js`](./src/services/coordinatorService.js)

## 11. Tóm tắt ngắn nhất để chốt

Frontend hiện tại được tổ chức theo đúng vai trò người dùng:
- `authService` quản lý auth và session
- `rescueRequestService` quản lý toàn bộ citizen/guest rescue request
- `adminService` phục vụ các màn quản trị
- `coordinatorService` phục vụ các màn điều phối

Mẫu xuyên suốt của project là:

`Route -> Page wrapper -> Component/Page nghiệp vụ -> Service -> API -> normalize data -> render lại UI`

Đây là điểm quan trọng nhất để giải thích kiến trúc code của repo này.
