# 📋 DTO (Data Transfer Object) Schemas - Complete Reference

**Purpose:** Define all request/response structures for BE API  
**Generated:** April 7, 2026

---

## 🔵 COORDINATOR Phase DTOs

### AssignRescueDto (Request)
```json
{
  "requestId": 123,                    // int - Required
  "teamId": 456,                       // int - Required
  "vehicleIds": "1,2,3",              // string - Optional, comma-separated
  "estimatedTime": 30                 // int? - Optional, minutes
}
```

**Validation:**
- `requestId`: Must exist and status = "Verified"
- `teamId`: Must exist
- `vehicleIds`: If provided, must be comma-separated valid IDs
- All vehicle IDs must have status = "AVAILABLE"

**C# Definition:**
```csharp
public class AssignRescueDto
{
    public int RequestId { get; set; }
    public int TeamId { get; set; }
    public string? VehicleIds { get; set; }
    public int? EstimatedTime { get; set; }
}
```

---

### AssignRescueResponseDto (Response)
```json
{
  "operationId": 789,
  "requestId": 123,
  "teamId": 456,
  "assignedVehicleIds": [1, 2, 3],
  "assignedAt": "2026-04-07T10:30:00Z",
  "status": "Assigned",
  "numberOfAffectedPeople": 4,
  "estimatedTime": 30
}
```

**C# Definition:**
```csharp
public class AssignRescueResponseDto
{
    public int OperationId { get; set; }
    public int RequestId { get; set; }
    public int TeamId { get; set; }
    public List<int> AssignedVehicleIds { get; set; }
    public DateTime AssignedAt { get; set; }
    public string Status { get; set; }
    public int NumberOfAffectedPeople { get; set; }
    public int? EstimatedTime { get; set; }
}
```

---

## 🟡 LEADER Phase DTOs

### MemberAssignmentDto (Request)
```json
{
  "userIds": [100, 101, 102],    // List<int> - Required, min 1 member
  "requestId": 123               // int - Required
}
```

**Validation:**
- `userIds`: Cannot be empty
- `requestId`: Must exist and have status = "Assigned"
- All userIds must be members of the same team as the leader
- User making request must be Leader of that team

**C# Definition:**
```csharp
public class MemberAssignmentDto
{
    /// <summary>Danh sách UserId của các thành viên cần giao việc</summary>
    public List<int> UserIds { get; set; } = new();
    public int RequestId { get; set; }
}
```

---

### MemberAssignmentResponseDto (Response)
```json
{
  "teamId": 456,
  "operationId": 789,
  "assignedUserIds": [100, 101],
  "skippedUserIds": [102],
  "message": "Đã giao nhiệm vụ cho 2 thành viên..."
}
```

**Explanation:**
- `teamId`: Team of the members
- `operationId`: The operation created/updated
- `assignedUserIds`: Successfully assigned members
- `skippedUserIds`: Busy or not found members
- Request can still succeed even if some members are skipped

**C# Definition:**
```csharp
public class MemberAssignmentResponseDto
{
    public int TeamId { get; set; }
    public int OperationId { get; set; }
    public List<int> AssignedUserIds { get; set; } = new();
    public List<int> SkippedUserIds { get; set; } = new();
    public string Message { get; set; } = string.Empty;
}
```

---

### UpdateMissionStatusDto (Request)
```json
{
  "newStatus": "COMPLETED|FAILED",
  "reason": "Optional reason if FAILED"
}
```

**Validation Rules:**
```csharp
public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
{
    // newStatus must be: "COMPLETED" or "FAILED" (case-insensitive)
    // If newStatus = "FAILED", reason is required (non-empty)
}
```

**C# Definition:**
```csharp
public class UpdateMissionStatusDto : IValidatableObject
{
    public string NewStatus { get; set; } = string.Empty;
    public string? Reason { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(NewStatus))
        {
            yield return new ValidationResult("NewStatus adalah wajib.", [nameof(NewStatus)]);
            yield break;
        }

        var key = NewStatus.Trim().ToUpperInvariant();
        if (key != "COMPLETED" && key != "FAILED")
        {
            yield return new ValidationResult(
                "NewStatus tidak valid. Hanya terima: COMPLETED atau FAILED.",
                [nameof(NewStatus)]);
        }

        if (key == "FAILED" && string.IsNullOrWhiteSpace(Reason))
        {
            yield return new ValidationResult(
                "Reason wajib ketika NewStatus = FAILED.",
                [nameof(Reason)]);
        }
    }
}
```

---

### MissionStatusResponseDto (Response)
```json
{
  "assignmentId": 1,
  "requestId": 123,
  "assignmentStatus": "Completed",
  "requestStatus": "Assigned",
  "startedAt": "2026-04-07T10:35:00Z",
  "completedAt": "2026-04-07T10:55:00Z",
  "message": "Xác nhận hoàn tất nhiệm vụ thành công..."
}
```

**C# Definition:**
```csharp
public class MissionStatusResponseDto
{
    public int AssignmentId { get; set; }
    public int RequestId { get; set; }
    public string AssignmentStatus { get; set; } = string.Empty;
    public string RequestStatus { get; set; } = string.Empty;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string Message { get; set; } = string.Empty;
}
```

---

### ConfirmTaskDto (Request - 🆕 NEW)
```json
{
  "operationId": 789,
  "notes": "Optional completion notes"
}
```

**Note:** 
- Currently defined but **NOT actively used in any endpoint**
- Kept for potential future use or extensibility
- Member confirmation works differently (PUT /my-assignment/confirm with no body)

**C# Definition:**
```csharp
public class ConfirmTaskDto
{
    public int OperationId { get; set; }
    public string? Notes { get; set; }
}
```

---

## 🟢 MEMBER Phase DTOs

### TeamOperationDto (Response)
```json
{
  "operationId": 789,
  "requestId": 123,
  "teamId": 456,
  "requestTitle": "Fire at building",
  "requestAddress": "123 Main St",
  "requestDescription": "Multi-story building fire...",
  "requestPhone": "0912345678",
  "priorityName": "CAO",
  "latitude": 21.0285,
  "longitude": 105.8542,
  "operationStatus": "Assigned",
  "assignedAt": "2026-04-07T10:30:00Z",
  "startedAt": "2026-04-07T10:35:00Z",
  "completedAt": null,
  "numberOfAffectedPeople": 4,
  "estimatedTime": 30,
  "vehicleIds": [1, 2, 3]
}
```

**Priority Name Values:**
- `CAO` (High) - PriorityLevelId = 1
- `TRUNG BÌNH` (Medium) - PriorityLevelId = 2
- `THẤP` (Low) - PriorityLevelId = 3
- `THÔNG THƯỜNG` (Normal) - Default

**C# Definition:**
```csharp
public class TeamOperationDto
{
    public int OperationId { get; set; }
    public int RequestId { get; set; }
    public int TeamId { get; set; }
    public string? RequestTitle { get; set; }
    public string? RequestAddress { get; set; }
    public string? RequestDescription { get; set; }
    public string? RequestPhone { get; set; }
    public string? PriorityName { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string OperationStatus { get; set; } = string.Empty;
    public DateTime? AssignedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? NumberOfAffectedPeople { get; set; }
    public int? EstimatedTime { get; set; }
    public List<int> VehicleIds { get; set; } = new();
}
```

---

### RescueTeamDistanceDto (Response)
```json
{
  "teamId": 456,
  "teamName": "Team Alpha",
  "baseLatitude": 21.0285,
  "baseLongitude": 105.8542,
  "requestLatitude": 21.0500,
  "requestLongitude": 105.8700,
  "distanceKm": 3.45
}
```

**Used by:** `GET /api/rescue-operation/requests/{requestId}/nearest-teams`  
**Purpose:** Find nearest teams for a request

**C# Definition:**
```csharp
public class RescueTeamDistanceDto
{
    public int TeamId { get; set; }
    public string TeamName { get; set; }
    public decimal BaseLatitude { get; set; }
    public decimal BaseLongitude { get; set; }
    public decimal RequestLatitude { get; set; }
    public decimal RequestLongitude { get; set; }
    public decimal DistanceKm { get; set; }
}
```

---

## 📊 MEMBER Info DTOs

### TeamMemberDto (Response from GET /members)
```json
{
  "teamId": 456,
  "userId": 100,
  "fullName": "John Doe",
  "username": "johndoe",
  "phone": "0912345678",
  "memberRole": "Member|Leader",
  "joinedAt": "2026-01-01T00:00:00Z",
  "requestId": 123,
  "isBusy": true
}
```

**Breakdown:**
- `memberRole`: "Member" or "Leader"
- `requestId`: null if available, or request ID if busy
- `isBusy`: Convenience property (requestId != null)

---

## 🌐 Common Response Wrapper

### Success Response
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

### Paginated Response
```json
{
  "success": true,
  "total": 10,
  "count": 5,
  "data": [ ... ]
}
```

---

## ✅ DTO Validation Summary

| DTO | Endpoint | Validations |
|-----|----------|-------------|
| **AssignRescueDto** | POST /assign | requestId exists, status=Verified; teamId exists; vehicles AVAILABLE |
| **MemberAssignmentDto** | POST /assign-task | userIds not empty; requestId exists; user is Leader |
| **UpdateMissionStatusDto** | PUT /status | newStatus in [COMPLETED, FAILED]; reason required if FAILED |
| **ConfirmTaskDto** | - | operationId exists (not actively used) |

---

## 📝 Frontend Integration Tips

### 1. Request Headers
```javascript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

### 2. Error Handling Pattern
```javascript
if (!response.success) {
  console.error(`Error: ${response.message}`);
  // Show error to user
}
```

### 3. Member Status Check
```javascript
const isBusy = member.requestId !== null && member.requestId !== undefined;
```

### 4. Priority Display
```javascript
const priorityDisplay = {
  'CAO': '🔴 High',
  'TRUNG BÌNH': '🟡 Medium',
  'THẤP': '🟢 Low'
};
```

### 5. Status Display
```javascript
const statusDisplay = {
  'Assigned': 'Đang thực hiện',
  'Completed': 'Hoàn tất',
  'Failed': 'Thất bại',
  'Verified': 'Sẵn sàng'
};
```

---

## 🔍 Data Types Reference

| Type | Example | Range |
|------|---------|-------|
| `int` | 123 | -2,147,483,648 to 2,147,483,647 |
| `int?` (nullable) | null or 123 | Same as int, or null |
| `decimal` | 21.0285 | Latitude/Longitude |
| `string` | "text" | Variable length |
| `DateTime` | "2026-04-07T10:30:00Z" | UTC timezone |
| `List<int>` | [1, 2, 3] | Array of integers |
| `bool` | true/false | Boolean |

---

## 🎯 API Versioning

**Current Version:** v1 (implicit)  
**Base URL:** `/api/`

All endpoints follow pattern:
```
/api/[resource]/[action]
/api/rescue-team/...
/api/rescue-operation/...
```

---

**Document Version:** 1.0  
**Last Updated:** April 7, 2026
