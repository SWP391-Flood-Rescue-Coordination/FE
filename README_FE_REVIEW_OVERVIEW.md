# Tổng Quan FE Để Review Hội Đồng

Tài liệu này mô tả tổng thể cách FE khởi động, nhận dữ liệu từ BE, đi qua các lớp xử lý nào, và nên review theo thứ tự nào để dễ theo dõi.

## 1. FE khởi động như thế nào khi chạy `npm run dev`

Khi chạy:

```bash
npm run dev
```

luồng FE diễn ra như sau:

1. Vite đọc cấu hình trong [vite.config.js](./vite.config.js).
2. FE dev server được mở ở `http://localhost:5173`.
3. Mọi request bắt đầu bằng `/api` sẽ được proxy sang BE đang chạy.
4. Entry point FE bắt đầu từ [src/main.jsx](./src/main.jsx).
5. `main.jsx` render component gốc `App`.
6. [src/App.jsx](./src/App.jsx) quyết định route nào sẽ được hiển thị theo URL hiện tại.

## 2. Các lớp chính trong FE

FE đang được tổ chức theo 4 lớp chính:

### 2.1. Lớp route

Nằm chủ yếu ở:

- [src/App.jsx](./src/App.jsx)

Vai trò:

- ánh xạ URL sang page/component
- phân luồng theo actor như Citizen, Coordinator, Rescue Team, Manager, Admin

### 2.2. Lớp giao tiếp API

Nằm chủ yếu ở:

- [src/services/api.js](./src/services/api.js)

Vai trò:

- tạo `axios instance`
- tự gắn `Authorization: Bearer <token>`
- xử lý lỗi `401`
- gom cấu hình gọi API về một chỗ

### 2.3. Lớp service theo nghiệp vụ

Nằm ở:

- [src/services/authService.js](./src/services/authService.js)
- [src/services/rescueRequestService.js](./src/services/rescueRequestService.js)
- [src/services/coordinatorService.js](./src/services/coordinatorService.js)
- [src/services/rescueTeamService.js](./src/services/rescueTeamService.js)
- [src/services/managerService.js](./src/services/managerService.js)
- [src/services/adminService.js](./src/services/adminService.js)

Vai trò:

- gọi API cụ thể
- normalize dữ liệu BE trả về
- map dữ liệu sang format FE dùng
- ẩn bớt chi tiết API khỏi component UI

### 2.4. Lớp UI

Gồm component và page:

- `src/components/*`
- `src/pages/*`

Vai trò:

- nhận dữ liệu từ service
- hiển thị giao diện
- quản lý state cục bộ
- bắt sự kiện click, submit, filter, mở popup

## 3. FE lưu thông tin gì ở browser

Hiện tại FE dùng:

- `localStorage`
- `sessionStorage`

Chủ yếu cho các mục sau:

### 3.1. Đăng nhập

Trong [src/services/authService.js](./src/services/authService.js):

- `accessToken`
- `refreshToken`
- `user`

### 3.2. Guest rescue request

Trong [src/services/rescueRequestService.js](./src/services/rescueRequestService.js):

- tracking request của người chưa đăng nhập
- lưu request guest hiện tại theo `requestId`

Lưu ý:

- luồng guest hiện tại **không còn dùng `access_code`**
- guest flow đang bám theo `requestId`

### 3.3. Một số state giao diện

Ví dụ:

- trạng thái đã `Báo an toàn` ở FE
- trạng thái hiển thị dashboard hoặc popup

## 4. Thứ tự nên review FE để dễ hiểu nhất

Nếu cần trình bày trước hội đồng, nên đi theo thứ tự:

1. [src/main.jsx](./src/main.jsx)
2. [src/App.jsx](./src/App.jsx)
3. [src/services/api.js](./src/services/api.js)
4. Các service theo actor
5. Các page/component theo actor

Thứ tự đọc theo actor nên là:

1. Auth + Citizen/Guest
2. Coordinator
3. Rescue Team
4. Manager
5. Admin

## 5. Danh sách route chính theo actor

### 5.1. Citizen / Guest

- `/`
- `/forgot-password`
- `/reset-password`

### 5.2. Coordinator

- `/rescue-coordinator`

### 5.3. Rescue Team

- `/rescue-team`

### 5.4. Manager

- `/manager`
- `/manager/vehicles`

### 5.5. Admin

- `/admin`
- `/admin/users`
- `/admin/requests`

## 6. Luồng dữ liệu tổng quát giữa FE và BE

Với hầu hết chức năng, luồng chung là:

1. Người dùng thao tác trên UI.
2. Component gọi service tương ứng.
3. Service gọi API qua `api.js`.
4. BE trả dữ liệu JSON.
5. Service normalize dữ liệu.
6. Component cập nhật state.
7. UI render lại.

Ví dụ:

1. Người dùng bấm `Tạo yêu cầu`.
2. [src/components/RequestForm.jsx](./src/components/RequestForm.jsx) thu thập dữ liệu.
3. Gọi [src/services/rescueRequestService.js](./src/services/rescueRequestService.js).
4. Service gọi `POST /api/RescueRequest`.
5. Response trả về được normalize.
6. Dashboard cập nhật request hiện tại.

## 7. Cách FE đang được thiết kế để dễ bảo trì

Một số nguyên tắc đang được áp dụng:

- logic API nằm trong `services`
- UI chỉ xử lý hiển thị và state giao diện
- các hàm normalize được gom lại để tránh lặp
- route phân theo actor rõ ràng
- một số CSS/component được tái sử dụng giữa nhiều luồng

## 8. Bộ README chi tiết theo actor

Các tài liệu chi tiết đi kèm:

- [README_FE_REVIEW_CODE_MAP.md](./README_FE_REVIEW_CODE_MAP.md)
- [README_FE_REVIEW_AUTH_AND_CITIZEN.md](./README_FE_REVIEW_AUTH_AND_CITIZEN.md)
- [README_FE_REVIEW_COORDINATOR.md](./README_FE_REVIEW_COORDINATOR.md)
- [README_FE_REVIEW_RESCUE_TEAM.md](./README_FE_REVIEW_RESCUE_TEAM.md)
- [README_FE_REVIEW_MANAGER.md](./README_FE_REVIEW_MANAGER.md)
- [README_FE_REVIEW_ADMIN.md](./README_FE_REVIEW_ADMIN.md)

## 9. Kết luận

Nếu cần giải thích ngắn gọn trước hội đồng, có thể mô tả FE như sau:

- `App.jsx` phân route theo actor
- `api.js` là cổng giao tiếp chung với BE
- mỗi actor có service riêng để gọi API
- mỗi actor có page/component riêng để hiển thị và thao tác
- dữ liệu BE trả về được normalize trước khi render
- guest flow, citizen flow, rescue flow và management flow đều đi qua cùng mô hình này
