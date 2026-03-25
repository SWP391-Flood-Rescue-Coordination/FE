# FE Review: Luồng Rescue Team

Tài liệu này mô tả FE của actor `Rescue Team`.

Phạm vi bao gồm:

- danh sách nhiệm vụ
- xem chi tiết nhiệm vụ
- hoàn tất nhiệm vụ
- hủy nhiệm vụ
- liên hệ với luồng `Báo an toàn` của citizen/guest

## 1. Các file chính

### Component

- [src/components/RescueTeamDashboard.jsx](./src/components/RescueTeamDashboard.jsx)

### Service

- [src/services/rescueTeamService.js](./src/services/rescueTeamService.js)

### CSS

- [src/components/RescueTeamDashboard.css](./src/components/RescueTeamDashboard.css)

## 2. Route rescue team

- `/rescue-team`

## 3. API chính của rescue team

- `GET /api/rescue-team/my-operations`
- `PUT /api/rescue-team/operations/{operationId}/status`
- `PUT /api/RescueRequest/{requestId}/status` cho luồng hủy nếu BE yêu cầu route hủy riêng

## 4. Luồng tải danh sách nhiệm vụ

### FE xử lý ở đâu

- [src/services/rescueTeamService.js](./src/services/rescueTeamService.js)
- [src/components/RescueTeamDashboard.jsx](./src/components/RescueTeamDashboard.jsx)

### Luồng chi tiết

1. Component mount.
2. FE gọi `GET /api/rescue-team/my-operations`.
3. Service normalize response.
4. FE chỉ hiển thị các nhiệm vụ còn phù hợp để thao tác.
5. Render card/bảng nhiệm vụ.

### Điểm quan trọng

- FE từng được chỉnh để chịu được tình huống backend refresh nền lỗi
- UI không còn dễ rơi cả trang vào trạng thái error chỉ vì một lần refresh phụ

## 5. Luồng hoàn tất nhiệm vụ

### API sử dụng

- `PUT /api/rescue-team/operations/{operationId}/status`

### File xử lý

- [src/components/RescueTeamDashboard.jsx](./src/components/RescueTeamDashboard.jsx)
- [src/services/rescueTeamService.js](./src/services/rescueTeamService.js)

### Luồng FE

1. Rescue Team bấm `Hoàn tất nhiệm vụ`.
2. FE gọi API update status của operation.
3. Sau khi thành công:
   - danh sách nhiệm vụ refresh
   - citizen side được bật điều kiện `Báo an toàn`

### Liên hệ với citizen

Sau bước này:

- FE citizen xuất hiện chấm đỏ ở `Xem yêu cầu`
- xuất hiện thông báo nổi
- bật nút `Báo an toàn`

Tức là rescue team chưa chốt toàn bộ request trên FE citizen, mà chỉ mở bước xác nhận an toàn tiếp theo.

## 6. Luồng hủy nhiệm vụ

### Mục tiêu FE

- hủy nhiệm vụ rescue team đang xử lý
- đồng bộ đúng với API BE hiện tại

### File xử lý

- [src/components/RescueTeamDashboard.jsx](./src/components/RescueTeamDashboard.jsx)
- [src/services/rescueTeamService.js](./src/services/rescueTeamService.js)

### Điểm đã chỉnh

- FE đã được nối sang đúng API hủy theo luồng BE hiện tại
- không còn dùng `FAILED` như một trạng thái hủy ở FE
- không đụng DB từ phía FE

## 7. Các trạng thái hiển thị ở FE rescue team

FE hiện map và hiển thị các trạng thái theo cách dễ hiểu hơn cho người dùng:

- `Assigned`
- `Completed`
- `Cancelled`

Một số trạng thái cũ được normalize nếu dữ liệu legacy còn sót.

## 8. Tương quan giữa Rescue Team và Citizen

Đây là điểm quan trọng để trình bày trước hội đồng.

### Luồng tổng quát

1. Coordinator phân công.
2. Rescue Team nhận nhiệm vụ.
3. Rescue Team bấm `Hoàn tất`.
4. FE citizen nhận tín hiệu để bật `Báo an toàn`.
5. Citizen hoặc guest bấm `Báo an toàn`.
6. Request mới được chốt theo luồng hiện tại.

### Ý nghĩa

Rescue Team xác nhận đã xử lý xong nghiệp vụ cứu hộ, còn Citizen là người xác nhận bản thân đã an toàn.

## 9. UI rescue team

Một số cải tiến FE đã được thực hiện:

- đổi thứ tự nút theo nghiệp vụ
- đổi label cho sát ý nghĩa
- đồng bộ message và trạng thái với backend mới
- bỏ các bước cũ như `Confirmed` khỏi luồng hiển thị

## 10. Tóm tắt ngắn để trình bày hội đồng

Có thể mô tả phần Rescue Team như sau:

1. Rescue Team tải danh sách nhiệm vụ từ API `my-operations`
2. FE render danh sách và trạng thái
3. Rescue Team có thể hoàn tất hoặc hủy nhiệm vụ
4. Khi hoàn tất, FE không tự kết luận công dân đã an toàn
5. FE citizen được mở tiếp bước `Báo an toàn` để xác nhận cuối cùng
