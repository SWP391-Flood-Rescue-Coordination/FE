# FE Review: Luồng Auth, Guest và Citizen

Tài liệu này mô tả toàn bộ luồng FE của:

- đăng nhập
- đăng ký
- quên mật khẩu
- guest tạo yêu cầu
- citizen tạo/xem/sửa yêu cầu
- báo an toàn

## 1. Các file chính

### Route và entry

- [src/App.jsx](./src/App.jsx)
- [src/main.jsx](./src/main.jsx)

### Service

- [src/services/api.js](./src/services/api.js)
- [src/services/authService.js](./src/services/authService.js)
- [src/services/rescueRequestService.js](./src/services/rescueRequestService.js)

### UI

- [src/components/Dashboard.jsx](./src/components/Dashboard.jsx)
- [src/components/RequestForm.jsx](./src/components/RequestForm.jsx)
- [src/components/ViewRequest.jsx](./src/components/ViewRequest.jsx)
- [src/components/ForgotPassword.jsx](./src/components/ForgotPassword.jsx)
- [src/components/ResetPassword.jsx](./src/components/ResetPassword.jsx)

## 2. Luồng đăng nhập

### API sử dụng

- `POST /api/Auth/login`

### FE xử lý ở đâu

- [src/services/authService.js](./src/services/authService.js)
- [src/components/Login.jsx](./src/components/Login.jsx)

### Luồng chi tiết

1. Người dùng nhập số điện thoại/tài khoản và mật khẩu.
2. `Login.jsx` gọi hàm login trong `authService`.
3. `authService` gọi `POST /api/Auth/login`.
4. Nếu thành công:
   - lưu `accessToken`
   - lưu `refreshToken`
   - lưu `user`
5. UI đóng popup login hoặc chuyển sang màn phù hợp.

### Điểm quan trọng

- FE không còn popup `Đăng nhập thành công` chặn thêm một bước.
- Khi có `401`, `api.js` sẽ xóa session login.

## 3. Luồng đăng ký

### API sử dụng

- `POST /api/Auth/register`

### FE xử lý ở đâu

- [src/components/Register.jsx](./src/components/Register.jsx)
- [src/services/authService.js](./src/services/authService.js)

### Điểm quan trọng

- FE đã cập nhật validate mật khẩu tối thiểu `5` ký tự để khớp BE.

## 4. Luồng quên mật khẩu

## 4.1. Màn `/forgot-password`

### API sử dụng

- `POST /api/auth/forgot-password/send-otp`

### File xử lý

- [src/components/ForgotPassword.jsx](./src/components/ForgotPassword.jsx)
- [src/services/authService.js](./src/services/authService.js)

### Luồng chi tiết

1. Người dùng nhập số điện thoại.
2. FE validate số điện thoại theo cùng rule với form tạo yêu cầu.
3. Khi bấm `Nhận mã OTP`, FE gọi `send-otp`.
4. Sau khi gửi:
   - ẩn ô số điện thoại
   - hiện ô nhập OTP
   - hiện nút `Gửi lại OTP`
   - hiện countdown hiệu lực OTP

### Giao diện hiện tại

- chỉ khi đang ở bước nhập OTP mới hiện dòng:
  `Mã OTP dùng để test/demo local hiện tại là 123456.`

## 4.2. Xác nhận OTP

### FE xử lý

- vẫn ở [src/components/ForgotPassword.jsx](./src/components/ForgotPassword.jsx)

### Luồng

1. Người dùng nhập OTP.
2. FE kiểm tra mã OTP mock theo flow hiện tại.
3. Nếu đúng:
   - chờ khoảng 3 giây
   - chuyển sang route `/reset-password`
4. Nếu sai:
   - hiển thị lỗi nghiệp vụ như các form khác

## 4.3. Màn `/reset-password`

### API sử dụng

- `POST /api/auth/forgot-password/reset-password`

### File xử lý

- [src/components/ResetPassword.jsx](./src/components/ResetPassword.jsx)
- [src/services/authService.js](./src/services/authService.js)

### Luồng

1. Người dùng nhập mật khẩu mới.
2. FE validate:
   - mật khẩu tối thiểu 5 ký tự
   - xác nhận mật khẩu phải khớp
3. FE gọi API reset password.
4. Nếu thành công:
   - hiện tiêu đề `Đổi mật khẩu thành công!`
   - đếm ngược rồi quay lại login

## 5. Dashboard citizen / guest

### File chính

- [src/components/Dashboard.jsx](./src/components/Dashboard.jsx)
- [src/services/rescueRequestService.js](./src/services/rescueRequestService.js)

### Vai trò

- hiển thị tình trạng yêu cầu hiện tại
- hiển thị nút `Tạo yêu cầu`
- hiển thị nút `Xem yêu cầu`
- hiển thị nhắc `Báo an toàn`

## 6. Luồng tạo yêu cầu cứu hộ

### API sử dụng

- `POST /api/RescueRequest`

### File xử lý

- [src/components/RequestForm.jsx](./src/components/RequestForm.jsx)
- [src/services/rescueRequestService.js](./src/services/rescueRequestService.js)

### Luồng chi tiết

1. Người dùng mở popup tạo yêu cầu.
2. Nhập:
   - số điện thoại
   - vị trí trên bản đồ
   - địa chỉ
   - số người
   - người già
   - trẻ em
   - tình trạng
   - ghi chú
3. FE dùng map để lấy:
   - tọa độ
   - địa chỉ
4. FE validate:
   - số điện thoại
   - số người tối thiểu 1
   - số người phải lớn hơn hoặc bằng tổng người già và trẻ em
5. FE gọi `POST /api/RescueRequest`.
6. Nếu thành công:
   - cập nhật dashboard
   - lưu tracking guest nếu chưa đăng nhập

### Logic số người

FE đang xử lý như sau:

- `number_of_affected_people = Số người`
- `elderly_count = Người già`
- `children_count = Trẻ em`
- `adult_count = Số người - Người già - Trẻ em`

## 7. Luồng guest tracking

### File chính

- [src/services/rescueRequestService.js](./src/services/rescueRequestService.js)
- [src/services/authService.js](./src/services/authService.js)

### Điểm quan trọng

- guest flow hiện tại dùng `requestId`
- không còn dùng `access_code`

### Các tình huống đã xử lý

1. Guest tạo request rồi login ngay trong cùng tab:
   - request guest không còn đè lên request của tài khoản đã login

2. Guest A tạo request, rồi login tài khoản B, rồi logout:
   - request guest của A được restore lại trong tab đó

## 8. Luồng xem và sửa yêu cầu

### API sử dụng

- `GET /api/RescueRequest/{id}`
- `PUT /api/RescueRequest/{id}/update`
- guest route update tương ứng nếu là guest

### File xử lý

- [src/components/ViewRequest.jsx](./src/components/ViewRequest.jsx)
- [src/services/rescueRequestService.js](./src/services/rescueRequestService.js)

### Luồng chi tiết

1. Người dùng bấm `Xem yêu cầu`.
2. FE lấy dữ liệu request hiện tại.
3. Popup hiển thị đầy đủ thông tin.
4. Nếu request còn `Pending`:
   - cho phép chỉnh sửa
5. Nếu bấm `Lưu`:
   - FE validate như form tạo
   - gọi API update tương ứng
   - hiển thị `Lưu thay đổi thành công`

### Điểm quan trọng

- nút `Chỉnh sửa` bị disable nếu request không ở `Pending`
- không còn cho bấm rồi mới báo lỗi như trước

## 9. Luồng Báo an toàn

### API sử dụng

- `PUT /api/RescueRequest/{id}/confirm-rescued`
- `PUT /api/RescueRequest/guest/{id}/confirm-rescued`

### File xử lý

- [src/components/Dashboard.jsx](./src/components/Dashboard.jsx)
- [src/components/ViewRequest.jsx](./src/components/ViewRequest.jsx)
- [src/services/rescueRequestService.js](./src/services/rescueRequestService.js)

### Luồng hiện tại

1. Rescue Team bấm `Hoàn tất`.
2. Request bên citizen vẫn hiển thị theo flow FE hiện tại để chờ xác nhận an toàn.
3. FE bật:
   - chấm đỏ ở `Xem yêu cầu`
   - notice nổi
   - nút `Báo an toàn`
4. Khi citizen hoặc guest bấm `Báo an toàn`:
   - gọi API confirm tương ứng
   - tắt notice
   - tắt chấm đỏ
   - trả giao diện về trạng thái bình thường

## 10. Các điểm FE đã chỉnh để khớp nghiệp vụ

- guest flow không còn dùng `access_code`
- quên mật khẩu tách thành 2 route rõ ràng
- validate blur cho nhiều field quan trọng
- dashboard có luồng báo an toàn rõ ràng
- request form và view request dùng layout/map nhất quán

## 11. Tóm tắt ngắn để trình bày hội đồng

Có thể trình bày phần Auth/Citizen như sau:

1. `App.jsx` route người dùng vào login/forgot/reset/dashboard
2. `authService.js` xử lý login/register/forgot/reset
3. `rescueRequestService.js` xử lý toàn bộ API request
4. `RequestForm.jsx` tạo yêu cầu
5. `ViewRequest.jsx` xem, sửa, báo an toàn
6. `Dashboard.jsx` là nơi tổng hợp trạng thái cuối cùng cho citizen và guest
