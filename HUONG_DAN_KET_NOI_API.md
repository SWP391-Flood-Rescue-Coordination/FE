# HƯỚNG DẪN NỐI API FE \<-\> BE (STEP BY STEP)

Tài liệu này được viết lại theo đúng code hiện tại trong repo FE.\
Mục tiêu: bạn có thể tự nối thêm endpoint mới mà không bị rối.

------------------------------------------------------------------------

## 1. Tổng quan kiến trúc (làm theo thứ tự này)

1.  Xác nhận contract endpoint trên BE (Swagger + DTO + role + status
    code).
2.  Viết/đổi method trong `src/services/*Service.js`.
3.  Gọi method đó từ component (`src/components/*`).
4.  Gắn vào page/route (`src/pages/*` + `src/App.jsx` nếu cần).
5.  Thêm giao diện/CSS sau khi logic đã chạy.
6.  Test bằng Network tab + Swagger.

Nếu bạn theo đúng thứ tự trên, sẽ rất dễ debug.

------------------------------------------------------------------------

## 2. Chuẩn bị BE và FE

### 2.1 Chạy BE đúng profile

``` powershell
cd d:\SWP391_FE\BE
dotnet run --launch-profile http
```

Profile hiện tại:

-   HTTP: http://localhost:5188
-   HTTPS: https://localhost:7064
-   Swagger: http://localhost:5188/swagger

------------------------------------------------------------------------

### 2.2 Chạy FE

``` powershell
cd d:\SWP391_FE\FE
npm run dev
```

------------------------------------------------------------------------

## 3. Cấu hình gọi API local mà không sửa CORS BE (Proxy Vite)

### 3.1 Env FE

File `.env.development`:

``` env
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:5188
```

File `.env.example` chỉ để tham khảo cho team.

------------------------------------------------------------------------

### 3.2 Proxy trong Vite

File `vite.config.js`:

-   FE gọi `/api/...`
-   Vite sẽ proxy sang `VITE_API_PROXY_TARGET`

Vì vậy browser sẽ thấy cùng origin FE, tránh lỗi CORS khi dev local.

------------------------------------------------------------------------

## 4. Lớp API chung (bắt buộc có)

File `src/services/api.js`:

1.  `baseURL = /api`
2.  Request interceptor:
    -   Đọc `accessToken` từ `localStorage`
    -   Gắn `Authorization: Bearer <token>`
3.  Response interceptor:
    -   Nếu `401` thì xóa session local (`accessToken`, `refreshToken`,
        `user`)

Đây là nền tảng cho tất cả service khác.

------------------------------------------------------------------------

## 5. Nối API Login (contract BE hiện tại)

### 5.1 Contract

-   Endpoint: `POST /api/Auth/login`
-   Body:

``` json
{
  "phone": "0912345678",
  "password": "123456"
}
```

-   Thành công:

``` json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "accessToken": "<JWT>",
  "accessTokenExpiration": "2026-02-26T10:30:00Z",
  "user": {
    "userId": 1,
    "username": "citizen01",
    "fullName": "Nguyen Van A",
    "email": "a@example.com",
    "role": "CITIZEN"
  }
}
```

Không có `refreshToken`, không có wrapper `data` cho login.

------------------------------------------------------------------------

### 5.2 Service login

File `src/services/authService.js`:

1.  Validate input (`validateLoginInput`):
    -   phone đúng regex
    -   password độ dài hợp lệ
2.  Gọi API:
    -   `api.post('/Auth/login', payload)`
3.  Kiểm tra kết quả:
    -   `success === true`
    -   có `accessToken`
    -   có `user`
4.  Lưu session:
    -   `localStorage.setItem('accessToken', data.accessToken)`
    -   `localStorage.setItem('user', JSON.stringify(data.user))`
5.  Parse lỗi:
    -   400: model validation
    -   401: sai thông tin đăng nhập
    -   403, 500: thông báo chung

------------------------------------------------------------------------

### 5.3 Component login

File `src/components/Login.jsx`:

1.  Form submit → `authService.validateLoginInput()`
2.  Nếu hợp lệ → `await authService.login(phone, password)`
3.  Thành công → hiển thị popup thành công + callback `onLoginSuccess`
4.  Thất bại → hiển thị message từ
    `authService.getLoginErrorMessage(error)`

------------------------------------------------------------------------

## 5A. Nối API Register (contract BE hiện tại)

### 5A.1 Contract

-   Endpoint: `POST /api/Auth/register`
-   Body:

``` json
{
  "username": "user123",
  "password": "123456",
  "fullName": "Nguyen Van A",
  "phone": "0912345678",
  "email": "a@example.com"
}
```

-   Thành công (tự động login):

``` json
{
  "success": true,
  "message": "Đăng ký thành công",
  "accessToken": "<JWT>",
  "accessTokenExpiration": "2026-03-01T10:30:00Z",
  "user": {
    "userId": 123,
    "username": "user123",
    "fullName": "Nguyen Van A",
    "email": "a@example.com",
    "role": "CITIZEN"
  }
}
```

-   Lỗi 400 Bad Request:

``` json
{
  "success": false,
  "message": "Tên đăng nhập đã được sử dụng"
}
```

hoặc `"Email đã được sử dụng"` hoặc `"Số điện thoại đã được sử dụng"`

**Lưu ý:** BE tự động login sau khi đăng ký thành công, FE nhận luôn token.

------------------------------------------------------------------------

### 5A.2 Service register

File `src/services/authService.js`:

1.  Validate input (`validateRegisterInput`):
    -   username ≥ 3 ký tự
    -   fullName không rỗng
    -   phone đúng regex `PHONE_REGEX`
    -   email đúng regex `EMAIL_REGEX`
    -   password 6-20 ký tự
    -   confirmPassword khớp với password
2.  Gọi API:
    -   `api.post('/Auth/register', payload)`
3.  Kiểm tra kết quả:
    -   `success === true`
4.  **KHÔNG tự động lưu token**:
    -   User cần đăng nhập lại sau khi đăng ký
    -   Điều hướng về trang login
5.  Parse lỗi (`getRegisterErrorMessage`):
    -   400: validation hoặc duplicate
    -   409: conflict (duplicate data)
    -   500: server error

------------------------------------------------------------------------

### 5A.3 Component register

File `src/components/Register.jsx`:

1.  Form có 6 fields:
    -   `username` (min 3 chars)
    -   `fullName`
    -   `phone` (Vietnam format)
    -   `email` (valid email)
    -   `password` (6-20 chars)
    -   `confirmPassword`
2.  Form submit → `authService.validateRegisterInput()`
3.  Nếu hợp lệ → `await authService.register(...)`
4.  Thành công:
    -   hiển thị success popup (giống style của login)
    -   popup có nút "Xác nhận"
    -   khi click "Xác nhận" → chuyển về trang login
5.  Thất bại → hiển thị error message từ
    `authService.getRegisterErrorMessage(error)`
6.  Loading state:
    -   disable form và button khi đang xử lý

**Lưu ý:** Sau khi đăng ký thành công, user cần đăng nhập lại bằng tài khoản vừa tạo.

------------------------------------------------------------------------

## 6. Nối API tạo Rescue Request cho Citizen

### 6.1 Contract

-   Endpoint: `POST /api/RescueRequest`
-   Yêu cầu auth: `Bearer token`
-   Role: `CITIZEN`
-   Body:

``` json
{
  "title": "Ngập sâu cần cứu hộ",
  "phone": "0912345678",
  "description": "Gia đình bị mắc kẹt",
  "latitude": 10.762622,
  "longitude": 106.660172,
  "address": "Quận 1, TP.HCM",
  "numberOfAffectedPeople": 4
}
```

------------------------------------------------------------------------

### 6.2 Mapping data FE → payload

File `src/services/rescueRequestService.js`:

1.  `parseCoordinates()` tách `location` thành `latitude/longitude`
2.  `buildTitle()` tạo tiêu đề theo condition
3.  `buildDescription()` gom note + condition
4.  `buildCreatePayload()` map form:
    -   `phone`
    -   `location` → `latitude/longitude`
    -   `address`
    -   `totalPeople` → `numberOfAffectedPeople`
5.  `createRescueRequest()`:
    -   `api.post('/RescueRequest', payload)`
6.  `getCreateRequestErrorMessage()`:
    -   parse 400/401/403/500

------------------------------------------------------------------------

### 6.3 Component gửi form

File `src/components/ReportForm.jsx`:

1.  Kiểm tra đã đăng nhập chưa (`authService.isAuthenticated()`)
2.  Kiểm tra role phải là `CITIZEN`
3.  Validate input (`rescueRequestService.validateCreatePayloadInput`)
4.  Gọi API tạo request
5.  Thành công:
    -   hiển thị thông báo
    -   trả dữ liệu lại cho Dashboard qua `onClose(submittedReport)`
6.  Lỗi:
    -   hiển thị message parse từ service
    -   nếu 401 thì điều hướng về login

------------------------------------------------------------------------

## 7. Rule khóa nút "Tạo báo cáo" khi còn request chưa kết thúc

File `src/components/Dashboard.jsx`:

1.  Nếu user đang login và role `CITIZEN`:
    -   gọi `rescueRequestService.getMyRequests()`
    -   check request nào có status KHÔNG thuộc terminal
2.  Poll mỗi 30s (`setInterval`)
3.  Nếu còn request open:
    -   disable nút "Tạo báo cáo"
    -   hiển thị trạng thái "Đang chờ xử lý"
4.  Terminal statuses đang dùng:
    -   `Completed`
    -   `Cancelled/Canceled`
    -   `Duplicate/Duplicated`

------------------------------------------------------------------------

## 8. Cách test từng bước (để biết lỗi nằm ở đâu)

### 8.1 Test hạ tầng (BE + proxy)

1.  Mở http://localhost:5188/swagger
    -   Nếu không vào được → BE chưa chạy.
2.  Chạy FE `npm run dev`.
3.  Mở tab Network, lọc `Fetch/XHR`.
4.  Đăng nhập:
    -   Request URL phải là `/api/Auth/login`
    -   Request thực tế sẽ được proxy qua `localhost:5188`.

------------------------------------------------------------------------

### 8.2 Test login

1.  Đăng nhập đúng account có sẵn.
2.  Kiểm tra `localStorage`:
    -   có `accessToken`
    -   có `user`
3.  Header dashboard:
    -   ẩn nút đăng nhập
    -   hiện icon user + icon đăng xuất

------------------------------------------------------------------------

### 8.3 Test tạo request citizen

1.  Đăng nhập role `CITIZEN`.
2.  Mở form "Tạo báo cáo", nhập đầy đủ.
3.  Submit:
    -   Response `success: true`
4.  Kiểm tra sau submit:
    -   nút "Tạo báo cáo" bị disable khi request chưa terminal.

------------------------------------------------------------------------

## 9. Lỗi thường gặp

### 9.1 401 Unauthorized

1.  Token hết hạn/không hợp lệ.
2.  Đăng nhập lại để cấp token mới.
3.  Kiểm tra request có header Authorization chưa.

------------------------------------------------------------------------

### 9.2 403 Forbidden

Token hợp lệ nhưng role sai (ví dụ không phải `CITIZEN` khi tạo
request).

------------------------------------------------------------------------

### 9.3 400 Validation

Body sai format/không đúng field.\
Kiểm tra payload mapping trong service.

------------------------------------------------------------------------

## 10. Mẫu quy trình nối endpoint mới (áp dụng cho mọi chức năng)

1.  Đọc contract endpoint trên Swagger.
2.  Tạo method trong `src/services/*Service.js`.
3.  Viết function parse lỗi riêng cho endpoint đó.
4.  Gọi service từ component.
5.  Thêm loading/success/error state.
6.  Test với cả case thành công và case lỗi.
7.  Sau cùng mới tinh chỉnh UI/CSS.

------------------------------------------------------------------------

Nếu cần nối endpoint tiếp theo, gửi:

-   Method + URL
-   Request DTO
-   Response thành công + lỗi (400/401/403/500)
-   Role yêu cầu

Mình sẽ viết tiếp theo đúng format service/component như tài liệu này.
