# FE Review: Luồng Coordinator

Tài liệu này mô tả FE của actor `Coordinator`.

Phạm vi bao gồm:

- dashboard điều phối
- danh sách yêu cầu
- xác minh yêu cầu
- đánh dấu trùng
- phân công đội và phương tiện

## 1. Các file chính

### Page

- [src/pages/CoordinatorDashboardPage.jsx](./src/pages/CoordinatorDashboardPage.jsx)
- [src/pages/CoordinatorRequestsPage.jsx](./src/pages/CoordinatorRequestsPage.jsx)

### Service

- [src/services/coordinatorService.js](./src/services/coordinatorService.js)

### CSS

- [src/pages/CoordinatorDashboardPage.css](./src/pages/CoordinatorDashboardPage.css)
- [src/pages/CoordinatorRequestsPage.css](./src/pages/CoordinatorRequestsPage.css)

## 2. Route coordinator

Coordinator đi qua route chính:

- `/rescue-coordinator`

Page này điều hướng giữa:

- dashboard tổng quan
- danh sách yêu cầu cần xử lý

## 3. Dashboard coordinator

### File xử lý

- [src/pages/CoordinatorDashboardPage.jsx](./src/pages/CoordinatorDashboardPage.jsx)

### API chính

- API thống kê request
- API lấy team
- API lấy vehicle

### Luồng FE

1. Page mount.
2. Gọi `coordinatorService`.
3. Lấy:
   - danh sách yêu cầu
   - danh sách đội cứu hộ
   - danh sách phương tiện
4. FE tính:
   - tổng chờ xác minh
   - tổng đã xác minh
   - tổng đã phân công
   - tổng hoàn tất
   - tổng hủy
5. Render dashboard, chart và card thống kê.

### Điểm đã thay đổi

- cột `Confirmed` đã bị loại khỏi UI coordinator
- chart coordinator đã được đồng bộ palette với admin

## 4. Danh sách yêu cầu coordinator

### File xử lý

- [src/pages/CoordinatorRequestsPage.jsx](./src/pages/CoordinatorRequestsPage.jsx)

### API chính

- `GET /api/RescueRequest`

### FE xử lý gì sau khi nhận dữ liệu

1. Normalize request từ BE.
2. Đọc các field:
   - status
   - priority
   - số người
   - người lớn
   - người già
   - trẻ em
3. Nếu API không trả đủ `number_of_affected_people`, FE tự fallback từ:
   - `adultCount + elderlyCount + childrenCount`

## 5. Luồng xác minh yêu cầu

### API sử dụng

- `PUT /api/RescueRequest/{id}/verify`

### File xử lý

- [src/services/coordinatorService.js](./src/services/coordinatorService.js)
- [src/pages/CoordinatorRequestsPage.jsx](./src/pages/CoordinatorRequestsPage.jsx)

### Luồng chi tiết

1. Coordinator bấm `Xác thực`.
2. FE gọi API verify mới.
3. Priority không còn chọn tay như luồng cũ.
4. Sau khi verify thành công:
   - refresh danh sách
   - refresh dashboard

## 6. Luồng đánh dấu yêu cầu trùng

### API sử dụng

- `PUT /api/RescueRequest/{id}/status`

### Mục đích

- chuyển yêu cầu sang trạng thái trùng/lỗi nếu cần

### FE xử lý

- gọi service
- cập nhật bảng ngay sau khi thao tác thành công

## 7. Luồng phân công đội cứu hộ

### API sử dụng

- `POST /api/RescueOperation/assign`

### Dữ liệu FE phải gửi

- `requestId`
- `teamId`
- `vehicleIds`

### File xử lý

- [src/services/coordinatorService.js](./src/services/coordinatorService.js)
- [src/pages/CoordinatorRequestsPage.jsx](./src/pages/CoordinatorRequestsPage.jsx)

### Luồng chi tiết

1. Coordinator chọn một yêu cầu đã verify.
2. FE tải danh sách team khả dụng.
3. FE tải danh sách vehicle khả dụng.
4. Coordinator chọn team và xe.
5. FE gọi API assign.
6. Nếu thành công:
   - request sang `Assigned`
   - bảng dữ liệu refresh lại

## 8. API vehicle trong coordinator

### API sử dụng

- `GET /api/Vehicle`
- `GET /api/Vehicle?status=AVAILABLE`
- `GET /api/Vehicle?status=INUSE`
- `GET /api/Vehicle?status=MAINTENANCE`

### FE xử lý ở đâu

- [src/services/coordinatorService.js](./src/services/coordinatorService.js)

### Điểm quan trọng

- FE đã nối lại theo DTO vehicle mới của BE
- normalize các field:
   - `vehicleTypeName`
   - `currentLocation`
   - `status`
   - `latitude`
   - `longitude`

## 9. Những thay đổi quan trọng trong luồng coordinator

- không còn trạng thái `Confirmed` trong UI dashboard
- verify request không còn set priority thủ công
- bảng request tự fallback tính tổng số người nếu BE thiếu field
- vehicle API đã được nối lại theo schema mới

## 10. Tóm tắt ngắn để trình bày hội đồng

Có thể trình bày phần coordinator như sau:

1. Coordinator vào dashboard để xem tổng quan đội, xe, yêu cầu
2. Coordinator vào bảng yêu cầu để lọc các yêu cầu cần xử lý
3. FE gọi API verify để xác minh yêu cầu
4. FE gọi API assign để phân công đội và xe
5. Sau mỗi thao tác, FE refresh lại bảng và dashboard để đồng bộ trạng thái
