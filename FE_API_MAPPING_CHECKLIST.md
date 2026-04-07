# 🔍 FE API Mapping Checklist vs Swagger
**Ngày kiểm tra:** April 7, 2026  
**Mục đích:** Xác nhận tất cả API call ở FE có match với BE swagger, không thừa không thiếu

---

## 📋 API Endpoints từ FE

### 1️⃣ **Authentication Endpoints** (Public - skipAuth)
| HTTP | Endpoint | FE Service | File | Status |
|------|----------|-----------|------|--------|
| POST | `/Auth/login` | `authService.login()` | authService.js:519 | ✓ Verify |
| POST | `/Auth/register` | `authService.register()` | authService.js:559 | ✓ Verify |
| POST | `/Auth/forgot-password/send-otp` | `authService.forgotPassword()` | authService.js:584 | ✓ Verify |
| POST | `/Auth/forgot-password/reset-password` | `authService.resetPassword()` | authService.js:599 | ✓ Verify |

---

### 2️⃣ **Rescue Request Endpoints**
| HTTP | Endpoint | FE Service | File | Status |
|------|----------|-----------|------|--------|
| GET | `/RescueRequest/citizen-dashboard-statistics` | `rescueRequestService.getDashboardStats()` | rescueRequestService.js:594 | ✓ Verify |
| POST | `/RescueRequest` | `rescueRequestService.createRescueRequest()` | rescueRequestService.js:603 | ✓ Verify |
| GET | `/RescueRequest/my-requests` | `rescueRequestService.getMyRequests()` | rescueRequestService.js:631 | ✓ Verify |
| GET | `/RescueRequest/my-latest-request` | `rescueRequestService.getMyLatestRequest()` | rescueRequestService.js:638 | ✓ Verify |
| GET | `/RescueRequest/guest/status?requestId=` | `rescueRequestService.getGuestRequestStatus()` | rescueRequestService.js:646 | ✓ Verify |
| PUT | `/RescueRequest/guest/update/{requestId}` | `rescueRequestService.updateGuestRequest()` | rescueRequestService.js:672 | ✓ Verify |
| GET | `/RescueRequest/{requestId}` | `rescueRequestService.getRequestById()` | rescueRequestService.js:735 | ✓ Verify |
| PUT | `/RescueRequest/{requestId}/update` | `rescueRequestService.updateMyRequest()` | rescueRequestService.js:695 | ✓ Verify |
| PUT | `/RescueRequest/{requestId}/confirm-rescued` | `rescueRequestService.confirmRescued()` | rescueRequestService.js:702 | ✓ Verify |
| PUT | `/RescueRequest/guest/{requestId}/confirm-rescued` | `rescueRequestService.guestConfirmRescued()` | rescueRequestService.js:713 | ✓ Verify |
| GET | `/RescueRequest` | `adminService.getRequests()` / `managerService.getRequests()` | adminService.js:420, managerService.js:954 | ✓ Verify |
| PUT | `/RescueRequest/{requestId}/status` | `adminService.cancelRequest()` / `coordinatorService.markDuplicate()` | adminService.js:429, coordinatorService.js:133 | ✓ Verify |
| PUT | `/RescueRequest/{requestId}/verify` | `coordinatorService.verifyRequest()` | coordinatorService.js:128 | ✓ Verify |

---

### 3️⃣ **Rescue Team Endpoints**
| HTTP | Endpoint | FE Service | File | Status |
|------|----------|-----------|------|--------|
| GET | `/rescue-team/my-operations` | `rescueTeamService.getMyOperations()` | rescueTeamService.js:159 | ✓ Verify |
| GET | `/rescue-team/operations/{operationId}` | `rescueTeamService.getOperationDetails()` | rescueTeamService.js:220 | ✓ Verify |
| PUT | `/rescue-team/operations/{operationId}/status` | `rescueTeamService.updateOperationStatus()` | rescueTeamService.js:184 | ✓ Verify |
| PUT | `/rescue-team/requests/{requestId}/accept` | `rescueTeamService.acceptRequest()` | rescueTeamService.js:238 | ✓ Verify |
| PUT | `/rescue-team/requests/{requestId}/reject` | `rescueTeamService.rejectRequest()` | rescueTeamService.js:250 | ✓ Verify |
| POST | `/rescue-team/members/assign-task` | `rescueTeamService.assignTaskToMembers()` | rescueTeamService.js:261 | ✓ Verify |
| GET | `/rescue-team/members` | `rescueTeamService.getTeamMembers()` | rescueTeamService.js:276 | ✓ Verify |
| GET | `/rescue-team/my-assignment` | `rescueTeamService.getMyAssignment()` | rescueTeamService.js:289 | ✓ Verify |
| PUT | `/rescue-team/my-assignment/confirm` | `rescueTeamService.confirmMyTask()` | rescueTeamService.js:304 | ✓ Verify |
| GET | `/rescue-team/status` | `adminService.getRescueTeams()` / `coordinatorService.getTeamStatus()` | adminService.js:295, coordinatorService.js:105 | ✓ Verify |
| PUT | `/RescueRequest/{requestId}/status` | `rescueTeamService.cancelMissionRequest()` | rescueTeamService.js:203 | ✓ Verify |

---

### 4️⃣ **Vehicle Endpoints**
| HTTP | Endpoint | FE Service | File | Status |
|------|----------|-----------|------|--------|
| GET | `/Vehicle` | `adminService.getVehicles()` / `coordinatorService.getVehicles()` | adminService.js:332, coordinatorService.js:111 | ✓ Verify |
| GET | `/Vehicle?status=AVAILABLE` | `coordinatorService.getAvailableVehicles()` | coordinatorService.js:122 | ✓ Verify |
| GET | `/Vehicle/{vehicleId}` | `adminService.getVehicleById()` | adminService.js:341 | ✓ Verify |
| POST | `/Vehicle` | `adminService.createVehicle()` / `managerService.createVehicle()` | adminService.js:350, managerService.js:747 | ✓ Verify |
| PUT | `/Vehicle/{vehicleId}` | `adminService.updateVehicle()` / `managerService.updateVehicle()` | adminService.js:364, managerService.js:761 | ✓ Verify |
| DELETE | `/Vehicle/{vehicleId}` | `adminService.deleteVehicle()` / `managerService.deleteVehicle()` | adminService.js:378, managerService.js:775 | ✓ Verify |

---

### 5️⃣ **User/Admin Endpoints**
| HTTP | Endpoint | FE Service | File | Status |
|------|----------|-----------|------|--------|
| GET | `/UserInfo` | `adminService.getUsers()` | adminService.js:257 | ✓ Verify |
| GET | `/UserInfo/roles` | `adminService.getRoles()` | adminService.js:265 | ✓ Verify |
| PUT | `/UserInfo/{userId}/role` | `adminService.updateUserRole()` | adminService.js:390 | ✓ Verify |
| PUT | `/UserInfo/{userId}/status` | `adminService.updateUserStatus()` | adminService.js:401 | ✓ Verify |

---

### 6️⃣ **Rescue Team Management Endpoints**
| HTTP | Endpoint | FE Service | File | Status |
|------|----------|-----------|------|--------|
| GET | `/rescue-team` | `adminService.getRescueTeams()` | adminService.js:295 | ✓ Verify |
| POST | `/rescue-team` | `adminService.createRescueTeam()` | adminService.js:304 | ✓ Verify |
| PUT | `/rescue-team/{teamId}` | `adminService.updateRescueTeam()` | adminService.js:313 | ✓ Verify |
| DELETE | `/rescue-team/{teamId}` | `adminService.deleteRescueTeam()` | adminService.js:321 | ✓ Verify |

---

### 7️⃣ **Relief/Stock Endpoints**
| HTTP | Endpoint | FE Service | File | Status |
|------|----------|-----------|------|--------|
| GET | `/ReliefItem` | `managerService.getSupplies()` | managerService.js:786 | ✓ Verify |
| PUT | `/ReliefItem/{supplyId}` | `managerService.updateSupplyInfo()` | managerService.js:918 | ✓ Verify |
| GET | `/ReliefItem/low-stock` | `managerService.getLowStockItems()` | managerService.js:869 | ✓ Verify |
| GET | `/ReliefItem/low-stock/count` | `managerService.getLowStockCount()` | managerService.js:603 | ✓ Verify |
| GET | `/StockHistory` | `managerService.getStockHistory()` | managerService.js:801 | ✓ Verify |
| POST | `/StockHistory/import` | `managerService.importReceipt()` | managerService.js:1180 | ✓ Verify |
| POST | `/StockHistory/export` | `managerService.createReliefExportOrder()` | managerService.js:1077 | ✓ Verify |
| GET | `/StockUnit/import-options` | `managerService.getImportStockUnits()` | managerService.js:836 | ✓ Verify |
| GET | `/StockUnit/export-options` | `managerService.getExportStockUnits()` | managerService.js:853 | ✓ Verify |

---

### 8️⃣ **Rescue Operation Endpoints**
| HTTP | Endpoint | FE Service | File | Status |
|------|----------|-----------|------|--------|
| POST | `/rescue-operation/assign` | `coordinatorService.assignRequest()` | coordinatorService.js:163 | ✓ Verify |

---

### 9️⃣ **Statistics/Dashboard Endpoints**
| HTTP | Endpoint | FE Service | File | Status |
|------|----------|-----------|------|--------|
| GET | `/RescueRequest/statistics` | `managerService.getDashboardStats()` | managerService.js:598 | ✓ Verify |

---

## 🔎 Verification Checklist

### ✅ Cần Kiểm Tra Trên Swagger:

**Nhóm 1: Authentication (Public)**
- [ ] `/Auth/login` - POST ✓ Có trong FE
- [ ] `/Auth/register` - POST ✓ Có trong FE
- [ ] `/Auth/forgot-password/send-otp` - POST ✓ Có trong FE
- [ ] `/Auth/forgot-password/reset-password` - POST ✓ Có trong FE
- [ ] ❓ Bất kỳ endpoint auth nào khác trong BE?

**Nhóm 2: RescueRequest**
- [ ] Tất cả 13 endpoints có trong danh sách?
- [ ] ❓ Bất kỳ endpoint nào khác (upload files, search, filter)?

**Nhóm 3: RescueTeam & RescueOperation**
- [ ] Tất cả 11 endpoints có?
- [ ] ❓ Bất kỳ operation endpoint nào khác?

**Nhóm 4: Vehicle**
- [ ] Tất cả 6 endpoints có?
- [ ] ❓ Bất kỳ search/filter endpoint nào?

**Nhóm 5: User/Admin**
- [ ] Tất cả 4 endpoints có?
- [ ] ❓ User profile update endpoint?

**Nhóm 6: Relief/Stock**
- [ ] Tất cả 9 endpoints có?
- [ ] ❓ Chi tiết item endpoint? Inventory endpoints?

---

## 📊 Summary

| Nhóm | Tổng API | Kiểm Tra |
|------|----------|---------|
| Authentication | 4 | 4 |
| RescueRequest | 13 | 13 |
| RescueTeam | 11 | 11 |
| Vehicle | 6 | 6 |
| User/Admin | 4 | 4 |
| Relief/Stock | 9 | 9 |
| RescueOperation | 1 | 1 |
| Statistics | 1 | 1 |
| **TOTAL** | **49** | **49** |

---

## ⚠️ Vấn Đề Cần Lưu Ý

### 1. **Inconsistent Endpoint Naming**
- Một số endpoint dùng `/rescue-team/` (kebab-case)
- Một số dùng `/RescueRequest` (PascalCase)
- **Cần kiểm tra:** Swagger có consistent không?

### 2. **Query String vs URL Path**
- Guest tracking dùng query string: `/RescueRequest/guest/status?requestId=`
- **Cần kiểm tra:** Swagger định nghĩa như vậy không? Hay phải là `/RescueRequest/guest/{requestId}/status`?

### 3. **Status Codes & Error Responses**
- FE xử lý 401, 403, 404, 500
- **Cần kiểm tra:** BE có return đúng status code không?

### 4. **Missing Features Indicators**
- `vehicleIds: []` (empty) ở ManagerReliefExportPage - TODO: wire vehicle selection
- **Action:** Add vehicle selection form nếu cần

---

## 🛠️ Instructions

**Để verify toàn bộ:**

1. Mở Swagger: `http://localhost:5188/swagger/index.html`
2. So sánh từng endpoint trong bảng trên
3. Kiểm tra:
   - ✅ Endpoint path match?
   - ✅ HTTP method match (GET/POST/PUT/DELETE)?
   - ✅ Request/Response DTO match?
   - ✅ 200, 400, 401, 403, 404, 500 responses được định nghĩa?
4. Report bất kỳ khác biệt nào

---

## 📝 Notes

- **Ngày tạo:** April 7, 2026
- **FE Version:** Latest (Vite + React 18)
- **Total API Calls:** 49 endpoints
- **Mock Data Status:** ✅ Removed (all endpoints use live API)
- **Error Handling:** ✅ Implemented with proper user messages
