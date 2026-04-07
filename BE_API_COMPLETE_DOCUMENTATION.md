# 📋 BE API Complete Documentation
**Last Updated:** April 6, 2026

---

## 📌 API Overview

### Base URL
```
http://localhost:5188
```

### Swagger Documentation
```
http://localhost:5188/swagger/index.html
```

### Authentication
- **Type:** JWT (Bearer Token)
- **Header:** `Authorization: Bearer {AccessToken}`
- **Token Expiration:** Configurable (check BE settings)
- **Refresh Token:** Used to obtain new AccessToken

---

## 🔐 Auth Controller (`/api/auth`)

### 1. **POST /api/auth/login**
**Purpose:** User login
**Auth:** ❌ No Auth (Anonymous)
**Request Body:**
```json
{
  "phone": "0912345678",  // Required: Format +84, 84, or 0 followed by 9 digits
  "password": "string"     // Required: 5-100 chars
}
```
**Response (Success):**
```json
{
  "success": true,
  "message": "string",
  "accessToken": "string",
  "refreshToken": "string",
  "accessTokenExpiration": "2024-12-31T23:59:59",
  "user": {
    "userId": 1,
    "username": "string",
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "role": "CITIZEN|RESCUE_TEAM|COORDINATOR|MANAGER|ADMIN",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00"
  }
}
```
**Response (Error):** Status 401
```json
{
  "success": false,
  "message": "Sai tài khoản hoặc mật khẩu",
  "accessToken": null,
  "refreshToken": null
}
```

---

### 2. **POST /api/auth/register**
**Purpose:** User registration
**Auth:** ❌ No Auth (Anonymous)
**Request Body:**
```json
{
  "fullName": "string",      // Required
  "phone": "0912345678",     // Required: Valid phone format
  "email": "user@example.com", // Required: Valid email
  "password": "string"       // Required: Min 5 chars
}
```
**Response (Success):** Status 200
```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "user": { /* UserInfo */ }
}
```
**Response (Error):** Status 400
```json
{
  "success": false,
  "message": "Email/Phone đã tồn tại hoặc dữ liệu không hợp lệ"
}
```

---

### 3. **POST /api/auth/refresh-token**
**Purpose:** Refresh access token
**Auth:** ❌ No Auth
**Request Body:**
```json
{
  "refreshToken": "string"  // From previous login/refresh
}
```
**Response (Success):** Status 200
```json
{
  "success": true,
  "message": "Token làm mới thành công",
  "accessToken": "string",
  "refreshToken": "string",
  "accessTokenExpiration": "2024-12-31T23:59:59"
}
```

---

### 4. **POST /api/auth/logout**
**Purpose:** User logout (blacklist current token)
**Auth:** ✅ Required (Any Role)
**Request Body:**
```json
{
  "refreshToken": "string"  // Optional: To remove refresh token
}
```
**Response:** Status 200
```json
{
  "success": true,
  "message": "Đăng xuất thành công"
}
```

---

### 5. **POST /api/auth/send-otp**
**Purpose:** Send OTP for password reset
**Auth:** ❌ No Auth
**Request Body:**
```json
{
  "phone": "0912345678"  // Required: Valid phone format
}
```
**Response (Success):** Status 200
```json
{
  "success": true,
  "message": "OTP đã được gửi"
}
```

---

### 6. **POST /api/auth/reset-password**
**Purpose:** Reset password using OTP
**Auth:** ❌ No Auth
**Request Body:**
```json
{
  "phone": "0912345678",      // Required
  "otp": "123456",            // Required: 6-digit OTP
  "newPassword": "string"     // Required: 5-100 chars
}
```
**Response (Success):** Status 200
```json
{
  "success": true,
  "message": "Đặt lại mật khẩu thành công"
}
```

---

## 🚨 Rescue Request Controller (`/api/rescue-request`)

### 1. **POST /api/rescue-request** (Create Request)
**Purpose:** Create new rescue request
**Auth:** ❌ No Auth (Anonymous guests OR logged-in citizens)
**Request Body:**
```json
{
  "title": "string",              // Optional
  "description": "string",        // Optional
  "contactName": "string",        // Optional (for guests)
  "contactPhone": "0912345678",   // Required
  "address": "string",            // Required
  "latitude": -10.123,            // Required: -90 to 90
  "longitude": 105.456,           // Required: -180 to 180
  "adultCount": 2,                // Optional: ≥ 0
  "elderlyCount": 1,              // Optional: ≥ 0
  "childrenCount": 1              // Optional: ≥ 0
}
```
**Response (Success):** Status 200
```json
{
  "success": true,
  "message": "Tạo yêu cầu cứu hộ thành công",
  "requestId": 123
}
```
**Notes:**
- Duplicate check: Same phone + address within 15 minutes → Status = "Duplicate"
- Priority calculation: Elderly×1.5 + Children×1.8
  - Score ≥ 6: Priority HIGH (1)
  - Score 3-5: Priority MEDIUM (2)
  - Score < 3: Priority LOW (3)

---

### 2. **GET /api/rescue-request/my-requests**
**Purpose:** Get current citizen's rescue requests
**Auth:** ✅ Required (Role: CITIZEN)
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "requestId": 123,
      "citizenId": 5,
      "citizenName": "string",
      "citizenPhone": "string",
      "title": "string",
      "description": "string",
      "latitude": -10.123,
      "longitude": 105.456,
      "address": "string",
      "priorityLevelId": 1,
      "status": "Pending|Verified|Assigned|Completed|Cancelled|Duplicate",
      "adultCount": 2,
      "elderlyCount": 1,
      "childrenCount": 1,
      "teamId": 1,
      "teamName": "string",
      "canReportSafe": true,
      "estimatedTime": 30,  // minutes
      "createdAt": "2024-01-01T00:00:00",
      "updatedAt": "2024-01-01T12:00:00"
    }
  ]
}
```

---

### 3. **GET /api/rescue-request/{requestId}**
**Purpose:** Get specific rescue request details
**Auth:** ✅ Required (CITIZEN, COORDINATOR, ADMIN)
**Response:**
```json
{
  "success": true,
  "data": { /* RescueRequestResponseDto */ }
}
```

---

### 4. **PUT /api/rescue-request/{requestId}**
**Purpose:** Update rescue request (citizen edit)
**Auth:** ✅ Required (CITIZEN)
**Request Body:** Same as create, all fields optional
**Response:** Same as GET detail

---

### 5. **POST /api/rescue-request/{requestId}/confirm-rescued**
**Purpose:** Citizen confirms they were rescued
**Auth:** ✅ Required (CITIZEN)
**Response:**
```json
{
  "success": true,
  "message": "Xác nhận cứu hộ thành công",
  "request": { /* RescueRequestResponseDto */ }
}
```

---

### 6. **POST /api/rescue-request/guest/confirm-rescued**
**Purpose:** Guest (no login) confirm rescue using phone verification
**Auth:** ❌ No Auth
**Request Body:**
```json
{
  "phone": "0912345678"  // Phone used when creating request
}
```
**Response:**
```json
{
  "success": true,
  "message": "Xác nhận cứu hộ thành công"
}
```

---

### 7. **GET /api/rescue-request/{requestId}/status-history**
**Purpose:** Get status change history of a request
**Auth:** ✅ Required
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "statusId": 1,
      "requestId": 123,
      "requestTitle": "string",
      "status": "string",
      "notes": "string",
      "updatedBy": 5,
      "updatedByName": "string",
      "updatedAt": "2024-01-01T00:00:00"
    }
  ]
}
```

---

## 🚁 Rescue Team Controller (`/api/rescue-team`)

### 1. **PUT /api/rescue-team/operations/{operationId}/status**
**Purpose:** Update mission status (COMPLETED or FAILED)
**Auth:** ✅ Required (RESCUE_TEAM, COORDINATOR, ADMIN)
**Request Body:**
```json
{
  "newStatus": "COMPLETED|FAILED",  // Required
  "reason": "string"                 // Required if FAILED
}
```
**Response (Success):**
```json
{
  "success": true,
  "message": "Cập nhật trạng thái nhiệm vụ thành công",
  "data": {
    "operationId": 456,
    "requestId": 123,
    "teamId": 789,
    "status": "Completed|Failed",
    "completedAt": "2024-01-01T12:30:00"
  }
}
```

---

### 2. **GET /api/rescue-team/operations/team/{teamId}**
**Purpose:** Get all operations assigned to a rescue team
**Auth:** ✅ Required (RESCUE_TEAM)
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "operationId": 456,
      "requestId": 123,
      "requestTitle": "string",
      "address": "string",
      "latitude": -10.123,
      "longitude": 105.456,
      "status": "Assigned|In Progress|Completed|Failed",
      "adultCount": 2,
      "elderlyCount": 1,
      "childrenCount": 1,
      "assignedVehicles": ["BOAT-001", "HELI-001"],
      "estimatedTime": 30,
      "assignedAt": "2024-01-01T10:00:00",
      "startedAt": "2024-01-01T10:15:00",
      "completedAt": null
    }
  ]
}
```

---

## 🏢 Admin Rescue Team Controller (`/api/admin/rescue-teams`)

### 1. **GET /api/admin/rescue-teams**
**Purpose:** Get all rescue teams
**Auth:** ✅ Required (ADMIN)
**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "teamId": 1,
      "teamName": "Đội cứu hộ 1",
      "baseLatitude": -10.123,
      "baseLongitude": 105.456,
      "totalMembers": 10,
      "activeMembers": 8,
      "leader": {
        "userId": 2,
        "username": "string",
        "fullName": "string",
        "email": "string",
        "phone": "0912345678",
        "role": "RESCUE_TEAM",
        "memberRole": "Leader",
        "isActive": true,
        "requestId": null,
        "joinedAt": "2024-01-01T00:00:00"
      },
      "createdAt": "2024-01-01T00:00:00"
    }
  ]
}
```

---

### 2. **GET /api/admin/rescue-teams/{teamId}**
**Purpose:** Get team detail with all members
**Auth:** ✅ Required (ADMIN)
**Response:**
```json
{
  "success": true,
  "data": {
    "teamId": 1,
    "teamName": "string",
    "baseLatitude": -10.123,
    "baseLongitude": 105.456,
    "members": [
      {
        "userId": 2,
        "username": "string",
        "fullName": "string",
        "email": "string",
        "phone": "0912345678",
        "role": "RESCUE_TEAM",
        "memberRole": "Leader|Member",
        "isActive": true,
        "joinedAt": "2024-01-01T00:00:00"
      }
    ],
    "createdAt": "2024-01-01T00:00:00"
  }
}
```

---

### 3. **POST /api/admin/rescue-teams**
**Purpose:** Create new rescue team
**Auth:** ✅ Required (ADMIN)
**Request Body:**
```json
{
  "teamName": "string",           // Required
  "baseLatitude": -10.123,        // Optional, -90 to 90
  "baseLongitude": 105.456,       // Optional, -180 to 180
  "leaderUserId": 5               // Required: Must be CITIZEN user
}
```
**Response:**
```json
{
  "success": true,
  "message": "Tạo team thành công",
  "data": { /* Team data */ }
}
```

---

### 4. **POST /api/admin/rescue-teams/{teamId}/members**
**Purpose:** Add member to team
**Auth:** ✅ Required (ADMIN)
**Request Body:**
```json
{
  "userId": 5              // CITIZEN user to add
}
```
**Response:**
```json
{
  "success": true,
  "message": "Thêm thành viên thành công"
}
```

---

### 5. **DELETE /api/admin/rescue-teams/{teamId}/members/{userId}**
**Purpose:** Remove member from team
**Auth:** ✅ Required (ADMIN)
**Response:**
```json
{
  "success": true,
  "message": "Xóa thành viên thành công"
}
```

---

### 6. **PUT /api/admin/rescue-teams/{teamId}/leader**
**Purpose:** Change team leader
**Auth:** ✅ Required (ADMIN)
**Request Body:**
```json
{
  "newLeaderId": 5  // Must be existing active team member
}
```
**Response:**
```json
{
  "success": true,
  "message": "Thay đổi team leader thành công"
}
```

---

### 7. **DELETE /api/admin/rescue-teams/{teamId}**
**Purpose:** Delete rescue team
**Auth:** ✅ Required (ADMIN)
**Response:**
```json
{
  "success": true,
  "message": "Xóa team thành công"
}
```

---

## 🎯 Rescue Operation Controller (`/api/rescue-operation`)

### 1. **POST /api/rescue-operation/assign**
**Purpose:** Assign rescue team + vehicles to request
**Auth:** ✅ Required (COORDINATOR)
**Request Body:**
```json
{
  "requestId": 123,              // Required: Status must be "Verified"
  "teamId": 1,                   // Required: Rescue team
  "vehicleIds": "1,2,3",         // Optional: Comma-separated vehicle IDs
  "estimatedTime": 30            // Optional: Minutes
}
```
**Response (Success):**
```json
{
  "success": true,
  "message": "Phân công cứu hộ thành công",
  "data": {
    "operationId": 456,
    "requestId": 123,
    "teamId": 1,
    "assignedVehicleIds": [1, 2, 3],
    "assignedAt": "2024-01-01T10:00:00",
    "status": "Assigned",
    "numberOfAffectedPeople": 4,
    "estimatedTime": 30
  }
}
```

---

## 👥 User Info Controller (`/api/user-info`)

### 1. **GET /api/user-info**
**Purpose:** Get all users (with search)
**Auth:** ✅ Required (ADMIN)
**Query Parameters:**
- `searchBy`: "userId" | "username" | "fullName" | "email" | "phone"
- `keyword`: search term
**Response:**
```json
{
  "success": true,
  "total": 50,
  "data": [
    {
      "userId": 1,
      "username": "string",
      "fullName": "string",
      "email": "string",
      "phone": "0912345678",
      "role": "CITIZEN|RESCUE_TEAM|COORDINATOR|MANAGER|ADMIN",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00"
    }
  ]
}
```

---

### 2. **GET /api/user-info/roles**
**Purpose:** Get available roles
**Auth:** ✅ Required (ADMIN)
**Response:**
```json
{
  "success": true,
  "data": ["ADMIN", "COORDINATOR", "MANAGER", "RESCUE_TEAM", "CITIZEN"]
}
```

---

### 3. **PUT /api/user-info/{userId}/role**
**Purpose:** Update user role
**Auth:** ✅ Required (ADMIN)
**Request Body:**
```json
{
  "role": "CITIZEN|RESCUE_TEAM|COORDINATOR"  // Cannot set ADMIN/MANAGER
}
```
**Response:**
```json
{
  "success": true,
  "message": "Đã cập nhật quyền hạn cho người dùng 'username' thành 'ROLE'."
}
```

---

### 4. **PUT /api/user-info/{userId}/status**
**Purpose:** Enable/disable user account
**Auth:** ✅ Required (ADMIN)
**Request Body:**
```json
{
  "isActive": true|false
}
```
**Response:**
```json
{
  "success": true,
  "message": "Đã [Kích hoạt|Vô hiệu hóa] tài khoản 'username' thành công."
}
```

---

## 🚗 Vehicle Controller (`/api/vehicle`)

### 1. **GET /api/vehicle**
**Purpose:** Get all vehicles
**Auth:** ✅ Required (MANAGER, ADMIN, COORDINATOR)
**Query Parameters:**
- `status`: "AVAILABLE" | "INUSE" | "MAINTENANCE"
**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "vehicleId": 1,
      "vehicleCode": "BOAT-001",
      "vehicleName": "string",
      "vehicleTypeName": "Thuyền",
      "licensePlate": "ABC-123",
      "capacity": 10,
      "status": "AVAILABLE|INUSE|MAINTENANCE",
      "currentLocation": "string",
      "latitude": -10.123,
      "longitude": 105.456,
      "lastMaintenance": "2024-01-01T00:00:00",
      "updatedAt": "2024-01-01T12:00:00"
    }
  ]
}
```

---

### 2. **GET /api/vehicle/{vehicleId}**
**Purpose:** Get vehicle detail
**Auth:** ✅ Required
**Response:** Same as list item

---

### 3. **POST /api/vehicle**
**Purpose:** Create new vehicle
**Auth:** ✅ Required (MANAGER, ADMIN)
**Request Body:**
```json
{
  "vehicleName": "string",           // Optional
  "vehicleTypeId": 1,                // Required: Default types include BOAT, HELICOPTER, AMPHIBIOUS, etc.
  "licensePlate": "ABC-123",         // Required
  "capacity": 10,                    // Optional: Passenger capacity
  "status": "AVAILABLE",             // Default
  "currentLocation": "string",       // Optional
  "latitude": -10.123,               // Optional
  "longitude": 105.456,              // Optional
  "lastMaintenance": "2024-01-01"    // Optional
}
```
**Response:**
```json
{
  "success": true,
  "message": "Thêm phương tiện thành công",
  "data": { /* VehicleResponseDto */ }
}
```

---

### 4. **PUT /api/vehicle/{vehicleId}**
**Purpose:** Update vehicle
**Auth:** ✅ Required (MANAGER, ADMIN)
**Request Body:** Same as create, all optional
**Response:** Same as GET detail

---

### 5. **PUT /api/vehicle/{vehicleId}/status**
**Purpose:** Update vehicle status only
**Auth:** ✅ Required (MANAGER, ADMIN)
**Request Body:**
```json
{
  "status": "AVAILABLE|INUSE|MAINTENANCE"
}
```
**Response:** Same as GET detail

---

## 🎁 Relief Item Controller (`/api/relief-item`)

### 1. **GET /api/relief-item**
**Purpose:** Get all relief items
**Auth:** ✅ Required (ADMIN, MANAGER, COORDINATOR)
**Query Parameters:**
- `searchBy`: "itemName"
- `keyword`: search term
**Response:**
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "itemId": 1,
      "itemCode": "RICE-001",
      "itemName": "Gạo",
      "categoryId": 1,
      "unit": "kg",
      "quantity": 100,
      "minQuantity": 50,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00"
    }
  ]
}
```

---

### 2. **GET /api/relief-item/low-stock**
**Purpose:** Get low-stock items
**Auth:** ✅ Required (ADMIN, MANAGER, COORDINATOR)
**Query Parameters:**
- `n`: Threshold quantity (default 6)
**Response:**
```json
{
  "success": true,
  "threshold": 6,
  "count": 5,
  "items": [ /* relief items */ ]
}
```

---

### 3. **GET /api/relief-item/low-stock/count**
**Purpose:** Get count of low-stock items
**Auth:** ✅ Required (ADMIN, MANAGER, COORDINATOR)
**Query Parameters:**
- `n`: Threshold (default 6)
**Response:**
```json
5  // Just a number
```

---

### 4. **PUT /api/relief-item/{itemId}**
**Purpose:** Update relief item
**Auth:** ✅ Required (ADMIN, MANAGER)
**Request Body:**
```json
{
  "itemName": "string",      // Optional
  "categoryId": 1,           // Optional
  "unit": "kg",              // Optional
  "minQuantity": 50,         // Optional
  "isActive": true           // Optional
}
```
**Response:**
```json
{
  "success": true,
  "message": "Cập nhật vật phẩm thành công.",
  "data": { /* ReliefItemDto */ }
}
```

---

## 📦 Stock History Controller (`/api/stock-history`)

### 1. **POST /api/stock-history/import**
**Purpose:** Import relief stock
**Auth:** ✅ Required (MANAGER)
**Request Body:**
```json
{
  "itemId": 1,
  "quantity": 50,
  "notes": "string"          // Optional
}
```
**Response:**
```json
{
  "success": true,
  "message": "Nhập kho thành công"
}
```

---

### 2. **POST /api/stock-history/export**
**Purpose:** Export relief stock
**Auth:** ✅ Required (MANAGER, COORDINATOR)
**Request Body:**
```json
{
  "itemId": 1,
  "quantity": 10,
  "requestId": 123,          // Optional: Link to rescue request
  "notes": "string"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Xuất kho thành công"
}
```

---

### 3. **GET /api/stock-history**
**Purpose:** Get stock transaction history
**Auth:** ✅ Required (MANAGER, COORDINATOR, ADMIN)
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "historyId": 1,
      "itemId": 1,
      "itemName": "Gạo",
      "transactionType": "Import|Export",
      "quantity": 50,
      "beforeQuantity": 100,
      "afterQuantity": 150,
      "requestId": null,
      "notes": "string",
      "createdAt": "2024-01-01T00:00:00"
    }
  ]
}
```

---

## 📊 Database Models

### User Table
```csharp
UserId (PK)
Username
PasswordHash
FullName
Phone
Email
Role (ADMIN|COORDINATOR|MANAGER|RESCUE_TEAM|CITIZEN)
IsActive
CreatedAt
Address
```

### RescueRequest Table
```csharp
RequestId (PK)
CitizenId (FK: User) - NULL for guests
ContactName
ContactPhone
Phone
Title
Description
Latitude
Longitude
Address
PriorityLevelId (1=HIGH, 2=MEDIUM, 3=LOW)
Status (Pending|Verified|Assigned|Completed|Cancelled|Duplicate)
AdultCount
ElderlyCount
ChildrenCount
NumberOfAffectedPeople
CreatedAt
UpdatedAt
UpdatedBy (FK: User)
```

### RescueTeam Table
```csharp
TeamId (PK)
TeamName
BaseLatitude
BaseLongitude
CreatedAt
```

### RescueOperation Table
```csharp
OperationId (PK)
RequestId (FK: RescueRequest)
TeamId (FK: RescueTeam)
AssignedBy (FK: User)
AssignedAt
StartedAt
CompletedAt
Status (Assigned|In Progress|Completed|Failed)
NumberOfAffectedPeople
EstimatedTime (minutes)
```

### Vehicle Table
```csharp
VehicleId (PK)
VehicleCode (Auto-generated: BOAT-001, HELI-001, etc.)
VehicleName
VehicleTypeId (FK)
LicensePlate
Capacity
Status (AVAILABLE|INUSE|MAINTENANCE)
CurrentLocation
Latitude
Longitude
LastMaintenance
UpdatedAt
```

### ReliefItem Table
```csharp
ItemId (PK)
ItemCode
ItemName
CategoryId
Unit
Quantity
MinQuantity
IsActive
CreatedAt
```

### StockHistory Table
```csharp
HistoryId (PK)
ItemId (FK: ReliefItem)
TransactionType (Import|Export)
Quantity
BeforeQuantity
AfterQuantity
RequestId (FK: RescueRequest) - Optional
Notes
CreatedAt
```

### RescueTeamMember Table
```csharp
MemberId (PK)
TeamId (FK: RescueTeam)
UserId (FK: User)
MemberRole (Leader|Member)
IsActive
RequestId (FK: RescueRequest)
JoinedAt
```

---

## 🔑 Key Business Rules

### 1. **Rescue Request Priority Calculation**
```
Score = (ElderlyCount × 1.5) + (ChildrenCount × 1.8)
- Score ≥ 6: Priority HIGH (ID=1)
- Score 3-5: Priority MEDIUM (ID=2)
- Score < 3: Priority LOW (ID=3)
```

### 2. **Duplicate Detection**
- Same phone + address within 15 minutes
- Status automatically set to "Duplicate"

### 3. **Request Status Flow**
```
Created (Pending) 
  → Verified (by Coordinator)
    → Assigned (to Team)
      → Completed (by Citizen) OR Failed
      → Cancelled (anytime)
```

### 4. **Vehicle Status**
- AVAILABLE: Ready for operation
- INUSE: Currently assigned to operation
- MAINTENANCE: Under maintenance

### 5. **User Roles**
- **ADMIN**: System administrator
- **COORDINATOR**: Assign teams to requests
- **MANAGER**: Manage inventory & vehicles
- **RESCUE_TEAM**: Execute rescue operations
- **CITIZEN**: Create requests, confirm rescue

---

## ✅ Important Notes

1. **Phone Validation:** Format must be `+84`, `84`, or `0` followed by exactly 9 digits
2. **Coordinates:** Latitude [-90, 90], Longitude [-180, 180]
3. **Token Expiration:** Check backend configuration for exact timeout
4. **Duplicate Prevention:** 15-minute window, same phone or address
5. **Vehicle Code Generation:** Auto-generated as PREFIX-NNN (e.g., BOAT-001)
6. **Role Protection:** Admin/Manager roles cannot be assigned via API (security restriction)

---

**End of Documentation**
