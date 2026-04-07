# 📊 Database Schema & Entity Relationships

**Last Updated:** April 6, 2026

---

## 🗂️ Database Structure Overview

### Core Tables & Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                      USER (Identity)                        │
├─────────────────────────────────────────────────────────────┤
│ UserId (PK)                                                 │
│ Username, PasswordHash, FullName, Phone, Email, Role        │
│ IsActive, CreatedAt, Address                                │
└─────────────────────────────────────────────────────────────┘
         ↓           ↓              ↓              ↓
    ┌────┴───┐  ┌────┴────┐  ┌────┴─────┐  ┌────┴────┐
    │ RescueTeamMember CreatedBy UpdatedBy  AssignedBy
    │
    ↓
┌─────────────────────────────────────────────────────────────┐
│                  RESCUE_TEAM (Organization)                 │
├─────────────────────────────────────────────────────────────┤
│ TeamId (PK)                                                 │
│ TeamName, BaseLatitude, BaseLongitude, CreatedAt            │
└─────────────────────────────────────────────────────────────┘
    ↓
    ├─→ RescueTeamMembers (1:M) → Users
    │
    └─→ RescueOperations (1:M)
         │
         ├─→ RescueRequest (1:1)
         │
         └─→ RescueOperationVehicles (1:M) → Vehicles

┌─────────────────────────────────────────────────────────────┐
│              RESCUE_REQUEST (Incidents)                      │
├─────────────────────────────────────────────────────────────┤
│ RequestId (PK)                                              │
│ CitizenId (FK: User) - NULL for guests                      │
│ ContactName, ContactPhone, Phone                            │
│ Title, Description                                          │
│ Latitude, Longitude, Address                                │
│ PriorityLevelId (1=HIGH, 2=MEDIUM, 3=LOW)                   │
│ Status (Pending|Verified|Assigned|Completed|Cancelled)     │
│ AdultCount, ElderlyCount, ChildrenCount                     │
│ NumberOfAffectedPeople                                      │
│ CreatedAt, UpdatedAt, UpdatedBy                             │
└─────────────────────────────────────────────────────────────┘
    ↓
    ├─→ RescueOperation (1:M) → RescueTeam
    │
    ├─→ RescueRequestStatusHistory (1:M)
    │
    └─→ StockHistory (1:M) - inventory used for this request

┌─────────────────────────────────────────────────────────────┐
│            RESCUE_OPERATION (Deployment)                    │
├─────────────────────────────────────────────────────────────┤
│ OperationId (PK)                                            │
│ RequestId (FK: RescueRequest)                               │
│ TeamId (FK: RescueTeam)                                     │
│ AssignedBy (FK: User) - Coordinator                         │
│ AssignedAt, StartedAt, CompletedAt                          │
│ Status (Assigned|In Progress|Completed|Failed)             │
│ NumberOfAffectedPeople, EstimatedTime (minutes)             │
└─────────────────────────────────────────────────────────────┘
    ↓
    └─→ RescueOperationVehicles (1:M)
         │
         └─→ Vehicle (1:1)

┌─────────────────────────────────────────────────────────────┐
│              VEHICLE (Resources)                            │
├─────────────────────────────────────────────────────────────┤
│ VehicleId (PK)                                              │
│ VehicleCode (unique, auto-generated: BOAT-001, HELI-001)    │
│ VehicleName, VehicleTypeId (FK)                             │
│ LicensePlate (unique)                                       │
│ Capacity, Status, CurrentLocation                           │
│ Latitude, Longitude, LastMaintenance, UpdatedAt             │
└─────────────────────────────────────────────────────────────┘
    ↓
    ├─→ VehicleType (1:1)
    │
    └─→ RescueOperationVehicles (1:M)

┌─────────────────────────────────────────────────────────────┐
│            RELIEF_ITEM (Inventory Register)                 │
├─────────────────────────────────────────────────────────────┤
│ ItemId (PK)                                                 │
│ ItemCode, ItemName, CategoryId                              │
│ Unit, Quantity, MinQuantity, IsActive, CreatedAt            │
└─────────────────────────────────────────────────────────────┘
    ↓
    └─→ StockHistory (1:M)

┌─────────────────────────────────────────────────────────────┐
│          STOCK_HISTORY (Inventory Transactions)             │
├─────────────────────────────────────────────────────────────┤
│ HistoryId (PK)                                              │
│ ItemId (FK: ReliefItem)                                     │
│ TransactionType (Import|Export)                             │
│ Quantity, BeforeQuantity, AfterQuantity                     │
│ RequestId (FK: RescueRequest) - optional, link to incident  │
│ Notes, CreatedAt                                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│        RESCUE_REQUEST_STATUS_HISTORY (Audit Trail)          │
├─────────────────────────────────────────────────────────────┤
│ StatusId (PK)                                               │
│ RequestId (FK: RescueRequest)                               │
│ Status                                                      │
│ Notes, UpdatedBy (FK: User), UpdatedAt                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│          RESCUE_TEAM_MEMBER (Team Composition)              │
├─────────────────────────────────────────────────────────────┤
│ MemberId (PK)                                               │
│ TeamId (FK: RescueTeam)                                     │
│ UserId (FK: User)                                           │
│ MemberRole (Leader|Member)                                  │
│ IsActive, RequestId (FK: RescueRequest)                     │
│ JoinedAt                                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Entity Details

### **User Entity**
```csharp
public class User
{
    public int UserId { get; set; }
    public string Username { get; set; }           // Unique
    public string PasswordHash { get; set; }       // Bcrypt hash
    public string? FullName { get; set; }
    public string? Phone { get; set; }             // +84/84/0 + 9 digits
    public string? Email { get; set; }             // Unique
    public string Role { get; set; }               // ADMIN|COORDINATOR|MANAGER|RESCUE_TEAM|CITIZEN
    public bool IsActive { get; set; }             // Default: true
    public DateTime CreatedAt { get; set; }        // UTC
    public string? Address { get; set; }
}
```

### **RescueRequest Entity**
```csharp
public class RescueRequest
{
    public int RequestId { get; set; }
    public int? CitizenId { get; set; }            // NULL = Guest request
    public string? ContactName { get; set; }       // For guests
    public string? ContactPhone { get; set; }
    public string? Phone { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public decimal? Latitude { get; set; }         // -90 to 90
    public decimal? Longitude { get; set; }        // -180 to 180
    public string? Address { get; set; }
    public int? PriorityLevelId { get; set; }      // 1=HIGH, 2=MEDIUM, 3=LOW
    public string? Status { get; set; }            // See status flow
    public int? AdultCount { get; set; }           // >= 0
    public int? ElderlyCount { get; set; }         // >= 0
    public int? ChildrenCount { get; set; }        // >= 0
    public int? NumberOfAffectedPeople { get; set; }
    public DateTime CreatedAt { get; set; }        // UTC
    public DateTime? UpdatedAt { get; set; }
    public int? UpdatedBy { get; set; }            // FK: User
    
    // Navigation properties
    public virtual User? Citizen { get; set; }
    public virtual List<RescueOperation> Operations { get; set; }
    public virtual List<RescueRequestStatusHistory> StatusHistories { get; set; }
}
```

### **RescueOperation Entity**
```csharp
public class RescueOperation
{
    public int OperationId { get; set; }
    public int RequestId { get; set; }             // FK: RescueRequest
    public int TeamId { get; set; }                // FK: RescueTeam
    public int AssignedBy { get; set; }            // FK: User (Coordinator)
    public DateTime AssignedAt { get; set; }       // UTC
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string Status { get; set; }             // Assigned|In Progress|Completed|Failed
    public int? NumberOfAffectedPeople { get; set; }
    public int? EstimatedTime { get; set; }        // Minutes
    
    // Navigation properties
    public virtual RescueRequest? Request { get; set; }
    public virtual RescueTeam? Team { get; set; }
    public virtual List<RescueOperationVehicle> Vehicles { get; set; }
}
```

### **Vehicle Entity**
```csharp
public class Vehicle
{
    public int VehicleId { get; set; }
    public string? VehicleCode { get; set; }       // Auto-generated: BOAT-001, HELI-001
    public string? VehicleName { get; set; }
    public int VehicleTypeId { get; set; }         // FK: VehicleType
    public string? LicensePlate { get; set; }      // Unique
    public int? Capacity { get; set; }             // Passengers
    public string? Status { get; set; }            // AVAILABLE|INUSE|MAINTENANCE
    public string? CurrentLocation { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTime? LastMaintenance { get; set; }
    public DateTime? UpdatedAt { get; set; }       // UTC
    
    // Navigation properties
    public virtual VehicleType? VehicleType { get; set; }
    public virtual List<RescueOperationVehicle> Operations { get; set; }
}
```

### **ReliefItem Entity**
```csharp
public class ReliefItem
{
    public int ItemId { get; set; }
    public string? ItemCode { get; set; }          // e.g., RICE-001
    public string ItemName { get; set; }           // e.g., Gạo
    public int CategoryId { get; set; }
    public string? Unit { get; set; }              // kg, liter, box, etc.
    public int Quantity { get; set; }              // Current stock
    public int MinQuantity { get; set; }           // Reorder threshold
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }        // UTC
    
    // Navigation properties
    public virtual List<StockHistory> StockHistories { get; set; }
}
```

### **RescueTeam Entity**
```csharp
public class RescueTeam
{
    public int TeamId { get; set; }
    public string TeamName { get; set; }
    public decimal? BaseLatitude { get; set; }
    public decimal? BaseLongitude { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Navigation properties
    public virtual List<RescueTeamMember> Members { get; set; }
    public virtual List<RescueOperation> Operations { get; set; }
}
```

---

## 🔄 Data Flow & Status Transitions

### **Request Status Flow**
```
Pending (Created)
    ↓
    ├─→ Duplicate (if duplicate detected)
    │
    ├─→ Cancelled (by admin anytime)
    │
    └─→ Verified (by coordinator)
         ↓
         ├─→ Assigned (coordinator assigns team)
         │    ↓
         │    ├─→ Completed (citizen confirms rescue)
         │    │
         │    └─→ Failed (team failed, reverts to Verified)
         │
         └─→ Cancelled (coordinator cancels)
```

### **Operation Status Flow**
```
Assigned (Created when assigned)
    ↓
    ├─→ Completed (team marks as done)
    │
    └─→ Failed (team marks as failed for reason)
```

### **Vehicle Status Flow**
```
AVAILABLE (Initial state)
    ↓
    ├─→ INUSE (when assigned to operation)
    │    ↓
    │    └─→ AVAILABLE (when operation ends)
    │
    └─→ MAINTENANCE (manual update by manager)
         ↓
         └─→ AVAILABLE (manual update by manager)
```

---

## 📈 Business Rules & Constraints

### **Request Status Logic**

1. **Duplicate Checking**
   - Condition: Same `phone` + `address` within 15 minutes
   - Window: `CreatedAt >= DateTime.UtcNow.AddMinutes(-15)`
   - Excluded: Already Completed or Cancelled
   - Action: Automatically set Status = "Duplicate"

2. **Priority Calculation**
   ```
   Score = (ElderlyCount × 1.5) + (ChildrenCount × 1.8)
   
   If Score >= 6:        PriorityLevelId = 1 (HIGH)
   Else if Score >= 3:   PriorityLevelId = 2 (MEDIUM)
   Else:                 PriorityLevelId = 3 (LOW)
   ```

3. **Guardian Confirmation**
   - After operation assigned: `CanReportSafe = true` (calculated in service)
   - Within specific timeframe from assignment
   - Citizen or Guest can confirm "rescued"

---

## 🔒 Security & Integrity

### **Foreign Key Relationships**
```
RescueRequest.CitizenId        → User.UserId (nullable)
RescueRequest.UpdatedBy        → User.UserId
RescueOperation.RequestId      → RescueRequest.RequestId
RescueOperation.TeamId         → RescueTeam.TeamId
RescueOperation.AssignedBy     → User.UserId
RescueOperationVehicle.OperationId → RescueOperation.OperationId
RescueOperationVehicle.VehicleId   → Vehicle.VehicleId
Vehicle.VehicleTypeId          → VehicleType.VehicleTypeId
ReliefItem.CategoryId          → ItemCategory.CategoryId
StockHistory.ItemId            → ReliefItem.ItemId
StockHistory.RequestId         → RescueRequest.RequestId (nullable)
RescueTeamMember.TeamId        → RescueTeam.TeamId
RescueTeamMember.UserId        → User.UserId
RescueRequestStatusHistory.RequestId → RescueRequest.RequestId
RescueRequestStatusHistory.UpdatedBy → User.UserId
```

### **Unique Constraints**
- `User.Username` - Unique
- `User.Email` - Unique
- `Vehicle.LicensePlate` - Unique
- `Vehicle.VehicleCode` - Unique (auto-generated)

---

## 📊 Example Queries & Data Relationships

### **Query 1: Get Request with All Related Data**
```sql
SELECT r.*, 
       u.FullName AS CitizenName,
       o.OperationId,
       t.TeamName,
       sh.Status AS LatestStatus
FROM RescueRequests r
LEFT JOIN Users u ON r.CitizenId = u.UserId
LEFT JOIN RescueOperations o ON r.RequestId = o.RequestId
LEFT JOIN RescueTeams t ON o.TeamId = t.TeamId
LEFT JOIN RescueRequestStatusHistories sh ON r.RequestId = sh.RequestId
WHERE r.RequestId = @RequestId
ORDER BY sh.UpdatedAt DESC
```

### **Query 2: Get Team Members with Status**
```sql
SELECT 
    rtm.MemberId,
    u.UserId,
    u.FullName,
    rtm.MemberRole,
    rtm.IsActive,
    COUNT(ro.OperationId) AS AssignedOperations
FROM RescueTeamMembers rtm
JOIN Users u ON rtm.UserId = u.UserId
LEFT JOIN RescueOperations ro ON rtm.TeamId = ro.TeamId 
    AND ro.Status NOT IN ('Completed', 'Failed')
WHERE rtm.TeamId = @TeamId
GROUP BY rtm.MemberId, u.UserId, u.FullName, rtm.MemberRole, rtm.IsActive
```

### **Query 3: Low Stock Alert**
```sql
SELECT ri.ItemId, ri.ItemName, ri.Quantity, ri.MinQuantity
FROM ReliefItems ri
WHERE ri.Quantity <= ri.MinQuantity
  AND ri.IsActive = 1
ORDER BY ri.Quantity ASC
```

---

## 🐛 Common Data Issues

### **Issue 1: NULL Values in Guest Requests**
- When `CitizenId = NULL`, the request is from a guest
- FE must handle NULL citizen info gracefully
- Guest tracking stored in localStorage

### **Issue 2: Duplicate Detection Window**
- 15-minute window is strict UTC-based
- Server timezone affects calculation
- FE should not trust local time for validation

### **Issue 3: Vehicle Code Generation**
- Auto-generated per VehicleType
- Format: `PREFIX-NNN` (e.g., BOAT-001)
- Don't allow FE to send custom vehicle codes on creation

### **Issue 4: Priority Calculation Precision**
- Relies on integer counts × floating decimals
- Edge cases near boundaries (Score = 6.0 vs 5.99)
- Always truncate/round consistently

---

## ✅ Data Validation Rules

### **User Input Validation**
```
Phone:
  - Format: +84, 84, or 0 followed by exactly 9 digits
  - Regex: ^(?:\+84|84|0)\d{9}$
  
Email:
  - Standard email format validation
  - Must be unique
  
Password:
  - Minimum 5 characters
  - Maximum 100 characters
  - Hashed with bcrypt before storage
  
Coordinates:
  - Latitude: -90 to 90 (decimal)
  - Longitude: -180 to 180 (decimal)
  
People counts:
  - AdultCount, ElderlyCount, ChildrenCount >= 0
  - Range: 0 to int.MaxValue
  
Vehicle capacity:
  - >= 0 (can be null for unknown)
```

---

## 📚 Related Tables (Reference Data)

### **VehicleType Table**
```
VehicleTypeId | TypeName        | TypeCode
1             | Thuyền          | BOAT
2             | Trực thăng      | HELICOPTER
3             | Lội nước        | AMPHIBIOUS
4             | Xe cứu hộ       | RESCUE_TRUCK
```

### **PriorityLevel Reference**
```
PriorityLevelId | Level     | Score Range
1               | HIGH      | >= 6
2               | MEDIUM    | 3-5
3               | LOW       | < 3
```

### **ItemCategory Reference**
```
CategoryId | CategoryName
1          | Thực phẩm
2          | Trang thiết bị
3          | Thuốc men
4          | Quần áo
```

---

**End of Database Schema Documentation**
