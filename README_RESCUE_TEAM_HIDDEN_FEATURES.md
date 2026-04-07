# Rescue Team Dashboard - Hidden Features

## Tạm Ẩn (Temporarily Hidden)

Các phần sau đây vẫn có code nhưng đang bị ẩn khỏi giao diện người dùng:

### 1. Navigation Tabs
**Vị trí:** `src/components/RescueTeamDashboard.jsx` (dòng ~485-520)

**Nội dung:**
- Nút "Trang Chủ"
- Nút "Thành Viên"

**Lý do ẩn:** Tạm thời giữ routes nhưng không hiển thị nút điều hướng

**Trạng thái code:** Comment block `/* ... */` - code vẫn nguyên

**Cách bật lại:** Xóa `/*` ở đầu và `*/` ở cuối của comment block

---

### 2. Danh Sách Nhiệm Vụ (Mission List Table)
**Vị trí:** `src/components/RescueTeamDashboard.jsx` (dòng ~685-750)

**Nội dung:**
- Bảng hiển thị danh sách nhiệm vụ được giao
- Có thể sort theo ID, địa chỉ, SĐT, ưu tiên, thời gian

**Lý do ẩn:** Tạm thời không cần hiển thị, chỉ giữ "Quản Lý Đội"

**Trạng thái code:** Comment block `/* ... */` - code vẫn nguyên

**Cách bật lại:** 
1. Tìm comment block `TODO: Danh sách nhiệm vụ được giao - Tạm ẩn`
2. Xóa `/*` ở đầu và `*/` ở cuối
3. Xóa dòng `null`

---

### 3. Quản Lý Đội (Team Management)
**Vị trí:** `src/components/RescueTeamDashboard.jsx` (dòng ~525+)

**Nội dung:**
- Hiển thị danh sách yêu cầu từ coordinator
- Filter theo trạng thái
- Sort theo độ ưu tiên/thời gian
- Nút chấp nhận & giao, từ chối
- Modal giao việc cho thành viên

**Trạng thái:** **Hiển thị** - Kết nối API với endpoints:
  - `GET /rescue-team/my-operations`
  - `PUT /rescue-team/requests/{requestId}/accept`
  - `PUT /rescue-team/requests/{requestId}/reject`
  - `POST /rescue-team/members/assign-task`

**Data Source:** Sử dụng API thực từ BE, không còn mock data

---

### 4. Dash Board Thành Viên Đội (Member Assignment)
**Vị trí:** `src/pages/RescueTeamMemberPage.jsx`

**Nội dung:**
- Hiển thị nhiệm vụ được giao cho thành viên
- Xem chi tiết nhiệm vụ
- Bắt đầu thực hiện, hoàn tất hoặc báo lỗi
- Loading state với spinner
- Error state với retry button

**Trạng thái:** **Hiển thị** - Kết nối API với endpoints:
  - `GET /rescue-team/my-assignment`
  - `PUT /rescue-team/my-assignment/confirm`

**Data Source:** Sử dụng API thực từ BE, không còn mock data

**Cần làm:** 
- [ ] Kết nối API backend lấy danh sách requests thực
- [ ] Kết nối API backend lấy danh sách team members
- [ ] Kết nối API xử lý accept/reject requests
- [ ] Kết nối API assign members

---

## State & Mock Data

### requests
```javascript
[
  {
    id: 1,
    requestId: '1001',
    status: 'PENDING',
    priority: 'URGENT',
    address: '...',
    phone: '...',
    description: '...',
    totalPeople, elderly, children,
    estimatedTime,
    assignedMembers: []
  }
]
```

### teamMembers
```javascript
[
  {
    id: 1,
    name: 'Nguyễn Văn A',
    role: 'RESCUE_TEAM_MEMBER'
  }
]
```

---

## Routes

- `/rescue-team` - Dashboard (trang chính)
- `/rescue-team/member` - Member page (tạm ẩn nút nhưng route vẫn có)

**Note:** RescueTeamLeaderPage.jsx đã bị xóa, code được merge vào RescueTeamDashboard

---

## Access Control

- **RescueTeamDashboard**: Tất cả rescue team members (RESCUE_TEAM, RESCUE_TEAM_LEADER, RESCUE_TEAM_MEMBER)
- **RescueTeamMemberPage** (/rescue-team/member): Chỉ RESCUE_TEAM_LEADER
