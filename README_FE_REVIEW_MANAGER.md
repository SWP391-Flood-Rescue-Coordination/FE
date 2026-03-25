# FE Review: Luồng Manager

Tài liệu này mô tả FE của actor `Manager`.

Phạm vi chính:

- dashboard manager
- quản lý phương tiện
- quản lý luồng nhập/xuất kho và vật tư ở mức entry point FE

## 1. Các file chính

### Page

- [src/pages/ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx)
- [src/pages/ManagerVehiclesPage.jsx](./src/pages/ManagerVehiclesPage.jsx)

### Component

- [src/components/VehicleFormModal.jsx](./src/components/VehicleFormModal.jsx)

### Service

- [src/services/managerService.js](./src/services/managerService.js)

### CSS

- [src/pages/ManagerVehiclesPage.css](./src/pages/ManagerVehiclesPage.css)
- [src/components/VehicleFormModal.css](./src/components/VehicleFormModal.css)

## 2. Route manager

- `/manager`
- `/manager/vehicles`

## 3. Dashboard manager

### File xử lý

- [src/pages/ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx)

### API chính

- các API thống kê vật tư
- các API thống kê phương tiện
- các API dashboard manager tương ứng

### Luồng FE

1. Page mount.
2. FE gọi `managerService`.
3. Nhận dữ liệu tổng hợp từ BE.
4. Render card thống kê, bảng hoặc chart cần thiết.

## 4. Danh sách phương tiện

### API sử dụng

- `GET /api/Vehicle`
- `GET /api/Vehicle?status=AVAILABLE`
- `GET /api/Vehicle?status=INUSE`
- `GET /api/Vehicle?status=MAINTENANCE`

### File xử lý

- [src/services/managerService.js](./src/services/managerService.js)
- [src/pages/ManagerVehiclesPage.jsx](./src/pages/ManagerVehiclesPage.jsx)

### FE xử lý gì

- lấy danh sách xe
- normalize dữ liệu vehicle theo DTO mới của BE
- hiển thị bảng phương tiện
- lọc theo trạng thái
- tìm kiếm

### Điểm đã thay đổi

- FE manager đã được nối lại theo vehicle API mới
- không còn phụ thuộc format cũ

## 5. Luồng thêm phương tiện

### API sử dụng

- `POST /api/Vehicle`

### File xử lý

- [src/components/VehicleFormModal.jsx](./src/components/VehicleFormModal.jsx)
- [src/services/managerService.js](./src/services/managerService.js)

### Luồng chi tiết

1. Manager bấm `Thêm phương tiện`.
2. FE mở popup thêm mới.
3. Người dùng nhập:
   - tên phương tiện
   - biển số
   - sức chứa
   - vị trí hiện tại
   - tọa độ
   - loại phương tiện
   - trạng thái
4. Vị trí và tọa độ được chọn trên bản đồ, chỉ trong TP.HCM.
5. FE validate:
   - biển số đúng format
   - biển số có cả chữ và số
   - sức chứa tối thiểu theo rule hiện tại
6. FE gọi `POST /api/Vehicle`.
7. Nếu thành công:
   - hiển thị thông báo thành công
   - refresh bảng xe

### Điểm nghiệp vụ

- `VehicleCode` không để người dùng nhập theo hướng nghiệp vụ hiện tại
- FE đang coi `VehicleCode` được BE sinh

## 6. Luồng sửa phương tiện

### API sử dụng

- `PUT /api/Vehicle/{id}`

### File xử lý

- [src/components/VehicleFormModal.jsx](./src/components/VehicleFormModal.jsx)
- [src/services/managerService.js](./src/services/managerService.js)

### Các trường FE cho sửa

- tên phương tiện
- biển số
- loại phương tiện
- sức chứa
- trạng thái
- vị trí hiện tại
- tọa độ

### Luồng chi tiết

1. Manager bấm `Sửa`.
2. Popup mở với dữ liệu xe hiện tại.
3. Người dùng có thể chọn lại vị trí trên bản đồ.
4. FE map tiếng Việt cho loại phương tiện, nhưng vẫn gửi dữ liệu BE theo format phù hợp.
5. Nếu lưu thành công:
   - hiển thị thông báo
   - refresh danh sách

### Ghi chú

- `Thời gian bảo trì gần nhất` chỉ hiển thị ngoài bảng, không cho nhập trực tiếp trong form

## 7. Luồng xóa phương tiện

### API sử dụng

- `DELETE /api/Vehicle/{id}`

### Quy tắc FE

- không cho xóa xe đang `INUSE`
- chỉ cho xóa khi trạng thái phù hợp

### File xử lý

- [src/pages/ManagerVehiclesPage.jsx](./src/pages/ManagerVehiclesPage.jsx)
- [src/services/managerService.js](./src/services/managerService.js)

## 8. Bản đồ chọn vị trí xe

### File xử lý

- [src/components/VehicleFormModal.jsx](./src/components/VehicleFormModal.jsx)

### Cách FE hoạt động

- sử dụng logic map tương tự form tạo yêu cầu citizen
- chọn điểm trên bản đồ
- giới hạn trong TP.HCM
- tự cập nhật:
  - `current_location`
  - `latitude`
  - `longitude`

## 9. Dịch loại phương tiện ở FE

FE đang hiển thị tiếng Việt, ví dụ:

- `Boat -> Thuyền`
- `Truck -> Xe tải`
- `Helicopter -> Trực thăng`
- `Amphibious -> Xe lội nước`
- `Drone -> Drone`

Nhưng khi làm việc với BE:

- FE vẫn map theo dữ liệu backend yêu cầu

## 10. Những thay đổi chính cần nhấn mạnh trước hội đồng

- vehicle API đã được nối lại theo schema BE mới
- manager có popup CRUD phương tiện riêng
- map picker cho xe được đồng bộ với trải nghiệm tạo request của citizen
- validate FE được tăng cường cho biển số, sức chứa, vị trí
- giao diện bảng và popup đã được chỉnh để dễ thao tác hơn

## 11. Tóm tắt ngắn để trình bày hội đồng

Có thể trình bày phần manager như sau:

1. Manager xem tổng quan ở dashboard
2. Manager vào trang quản lý phương tiện
3. FE tải danh sách xe từ API vehicle mới
4. Manager có thể thêm, sửa, xóa xe qua popup
5. Khi chọn vị trí xe, FE dùng bản đồ và tự lấy địa chỉ/tọa độ
6. Mọi thay đổi đều được đẩy qua `managerService` rồi gọi xuống BE
