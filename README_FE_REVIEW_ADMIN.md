# FE Review: Luồng Admin

Tài liệu này mô tả FE của actor `Admin`.

Phạm vi chính:

- dashboard admin
- quản lý user
- quản lý request

## 1. Các file chính

### Pages

- [src/pages/AdminDashboardPage.jsx](./src/pages/AdminDashboardPage.jsx)
- [src/pages/AdminUsersPage.jsx](./src/pages/AdminUsersPage.jsx)
- [src/pages/AdminRequestsPage.jsx](./src/pages/AdminRequestsPage.jsx)
- [src/pages/AdminRescueTeamsPage.jsx](./src/pages/AdminRescueTeamsPage.jsx)
- [src/pages/AdminRescueTeamsPage.css](./src/pages/AdminRescueTeamsPage.css)

### Services

- [src/services/adminService.js](./src/services/adminService.js)

### Helpers

- [src/pages/adminShared.js](./src/pages/adminShared.js)

### CSS

- [src/pages/AdminDashboardPage.css](./src/pages/AdminDashboardPage.css)
- [src/pages/AdminUsersPage.css](./src/pages/AdminUsersPage.css)
- [src/pages/AdminRequestsPage.css](./src/pages/AdminRequestsPage.css)

## 2. Route admin

Các route chính:

- `/admin` - Dashboard
- `/admin/users` - Quản lý người dùng
- `/admin/requests` - Quản lý cứu hộ requests
- `/admin/rescue-teams` - Quản lý đội cứu hộ

## 3. Dashboard admin

### File xử lý

- [src/pages/AdminDashboardPage.jsx](./src/pages/AdminDashboardPage.jsx)

### API chính

- API thống kê tài khoản
- API thống kê rescue request
- API vehicle/team tùy card đang hiển thị

### Luồng FE

1. Page mount.
2. FE gọi `adminService`.
3. Nhận dữ liệu thống kê.
4. Render:
   - KPI cards
   - chart vai trò
   - thống kê user, request, team, vehicle

### Điểm UI đã chỉnh

- icon admin đã được đồng bộ theo style nhiều màu giống coordinator/citizen
- màu chart/admin cards đã được chỉnh đậm hơn để rõ hơn khi trình bày

## 4. Quản lý người dùng

### File xử lý

- [src/pages/AdminUsersPage.jsx](./src/pages/AdminUsersPage.jsx)
- [src/services/adminService.js](./src/services/adminService.js)

### API sử dụng

- `GET /api/UserInfo`
- `GET /api/Role`
- `PUT /api/UserInfo/{id}/role`
- `PUT /api/UserInfo/{id}/status`

### Luồng FE

1. Admin mở page user.
2. FE tải danh sách user.
3. FE tải danh sách role.
4. FE normalize dữ liệu role và user.
5. Admin có thể:
   - đổi role
   - bật/tắt trạng thái
6. Sau thao tác:
   - refresh danh sách
   - cập nhật lại bảng

## 5. Quản lý request

### File xử lý

- thường đi qua [src/services/adminService.js](./src/services/adminService.js)
- page admin request tương ứng trong hệ thống hiện tại

### API sử dụng

- `GET /api/RescueRequest`
- `PUT /api/RescueRequest/{id}/status`

### Luồng FE

1. Admin tải danh sách request.
2. FE normalize dữ liệu.
3. Admin có thể cập nhật trạng thái theo quyền hiện có.
4. Bảng refresh sau thao tác.

## 6. API vehicle trong admin

### API sử dụng

- `GET /api/Vehicle`

### FE xử lý ở đâu

- [src/services/adminService.js](./src/services/adminService.js)

### Điểm quan trọng

- admin đã được đồng bộ theo vehicle DTO mới giống coordinator/manager
- các field vehicle được normalize theo format hiện tại của BE

## 7. Vai trò của `adminShared.js`

File:

- [src/pages/adminShared.js](./src/pages/adminShared.js)

Vai trò:

- gom helper chung cho admin/coordinator
- tránh lặp lại logic format, normalize, render dữ liệu

## 8. Những thay đổi chính đáng chú ý

- admin dashboard đã được đồng bộ icon nhiều màu
- chart admin đã được chỉnh màu đậm hơn để trực quan hơn
- API vehicle ở admin đã nối lại theo version mới của BE
- helper chung giúp admin/coordinator dễ bảo trì hơn

## 9. Tóm tắt ngắn để trình bày hội đồng

Có thể trình bày phần admin như sau:

1. Admin vào dashboard để xem tổng quan toàn hệ thống
2. FE gọi các API thống kê từ `adminService`
3. Admin quản lý user qua page users
4. FE cho phép đổi role, đổi trạng thái user
5. Admin có thể theo dõi request và dữ liệu vận hành qua dashboard và các bảng quản trị
