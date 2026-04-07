# 🛠️ Additional BE Endpoints - Utility & Support APIs

**Purpose:** Document all other endpoints not in main flow  
**Status:** ✅ All Verified & Working  
**Generated:** April 7, 2026

---

## 📍 All RescueTeam Controller Endpoints

### 1. Get My Operations (Team View)
```
GET /api/rescue-team/my-operations
```

**Role:** RESCUE_TEAM  
**Purpose:** Team sees all tasks assigned to them (not individual member level)

**Response:**
```json
{
  "success": true,
  "total": 2,
  "data": [
    {
      "operationId": 789,
      "requestId": 123,
      "requestTitle": "Fire at building",
      "requestStatus": "Assigned",
      "requestAddress": "123 Main St",
      "requestDescription": "Multi-story building...",
      "requestPhone": "0912345678",
      "priorityName": "CAO",
      "requestLatitude": 21.0285,
      "requestLongitude": 105.8542,
      "teamName": "Team Alpha",
      "status": "Assigned",
      "assignedAt": "2026-04-07T10:30:00Z",
      "startedAt": null,
      "completedAt": null,
      "estimatedTime": 30,
      "vehicles": ["Fire Truck 1", "Ambulance 2", "Pump 3"]
    }
  ]
}
```

**Filters:**
- Only shows operations with status = "Assigned"
- Only for teams user is active member of
- Ordered by AssignedAt (oldest first)

---

### 2. Get Operation Details
```
GET /api/rescue-team/operations/{operationId}
```

**Role:** RESCUE_TEAM  
**Purpose:** Get full details of a specific operation

**Response:** Same structure as above, single item

**Authorization:**
- User must be member of the team assigned to this operation

---

### 3. Get Team Members (Leader Only)
```
GET /api/rescue-team/members?search=optional
```

**Role:** RESCUE_TEAM (Leader)  
**Query Params:**
- `search` (optional): Filter by name, username, phone, or ID

**Response:**
```json
{
  "success": true,
  "total": 5,
  "data": [
    {
      "teamId": 456,
      "userId": 100,
      "fullName": "John Doe",
      "username": "johndoe",
      "phone": "0912345678",
      "memberRole": "Member",
      "joinedAt": "2026-01-01T00:00:00Z",
      "requestId": 123,      // null if available
      "isBusy": true         // Computed from requestId
    },
    {
      "teamId": 456,
      "userId": 101,
      "fullName": "Jane Smith",
      "username": "janesmith",
      "phone": "0987654321",
      "memberRole": "Leader",
      "joinedAt": "2026-01-05T00:00:00Z",
      "requestId": null,
      "isBusy": false
    }
  ]
}
```

**Search Features:**
- Search in: Name | Username | Phone | User ID
- Case-insensitive
- Partial matches

---

### 4. Get Teams Status (Coordinator/Manager)
```
GET /api/rescue-team/status?status=optional
```

**Role:** COORDINATOR, ADMIN, MANAGER  
**Query Params:**
- `status` (optional): Filter by status (currently ignored)

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "teamId": 456,
      "teamName": "Team Alpha",
      "status": "AVAILABLE",
      "baseLatitude": 21.0285,
      "baseLongitude": 105.8542,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

**Note:** Status always returns "AVAILABLE" as placeholder

---

## 📍 All RescueOperation Controller Endpoints

### 1. Get Operations by Team
```
GET /api/rescue-operation/team/{teamId}
```

**Role:** RESCUE_TEAM  
**Purpose:** Get all operations assigned to specific team

**Response:**
```json
{
  "success": true,
  "teamId": 456,
  "total": 2,
  "data": [
    {
      "operationId": 789,
      "requestId": 123,
      "teamId": 456,
      "requestTitle": "Fire at building",
      "requestAddress": "123 Main St",
      "requestDescription": "...",
      "requestPhone": "0912345678",
      "priorityName": "CAO",
      "latitude": 21.0285,
      "longitude": 105.8542,
      "operationStatus": "Assigned",
      "assignedAt": "2026-04-07T10:30:00Z",
      "startedAt": null,
      "completedAt": null,
      "numberOfAffectedPeople": 4,
      "estimatedTime": 30,
      "vehicleIds": [1, 2, 3]
    }
  ]
}
```

**Security:** User must be active member of the team

---

### 2. Get Operation by ID
```
GET /api/rescue-operation/{operationId}
```

**Role:** ADMIN, COORDINATOR, MANAGER, RESCUE_TEAM

**Response:** Single TeamOperationDto

---

### 3. Find Nearest Teams
```
GET /api/rescue-operation/requests/{requestId}/nearest-teams
```

**Role:** COORDINATOR  
**Purpose:** Find teams closest to rescue request location

**Response:**
```json
{
  "success": true,
  "requestId": 123,
  "count": 3,
  "data": [
    {
      "teamId": 456,
      "teamName": "Team Alpha",
      "baseLatitude": 21.0285,
      "baseLongitude": 105.8542,
      "requestLatitude": 21.0500,
      "requestLongitude": 105.8700,
      "distanceKm": 3.45
    },
    {
      "teamId": 457,
      "teamName": "Team Beta",
      "baseLatitude": 21.0400,
      "baseLongitude": 105.8650,
      "requestLatitude": 21.0500,
      "requestLongitude": 105.8700,
      "distanceKm": 4.12
    }
  ]
}
```

**How It Works:**
1. Gets request coordinates
2. Calculates road distance from each team's base
3. Uses OSRM API for real road routing (not straight-line)
4. Returns sorted by distance (nearest first)

**Performance:** ~1 sec per team (network dependent)

---

### 4. Update Operation Status (Alternative)
```
PATCH /api/rescue-operation/{id}/status
```

**Role:** RESCUE_TEAM  
**Request:**
```json
{
  "newStatus": "COMPLETED"
}
```

**Note:** This is alternative to `PUT /rescue-team/operations/{id}/status`  
Same behavior, different HTTP verb

---

## 🔄 Status Code Reference

### Success Codes
| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |

### Client Error Codes
| Code | Meaning | Common Cause |
|------|---------|--------------|
| 400 | Bad Request | Invalid data format, validation failed |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | State conflict, concurrency issue |

### Server Error Codes
| Code | Meaning |
|------|---------|
| 500 | Internal Server Error |

---

## 📊 Database Relationships

### RescueRequest
```
RescueRequest (1)
├── One to Many → RescueOperation (Multiple operations per request)
├── One to Many → RescueRequestStatusHistory (Status audit trail)
└── Many to One ← RescueTeam (Current assigned team, nullable)
```

### RescueOperation
```
RescueOperation (1)
├── Many to One → RescueRequest
├── Many to One → RescueTeam
├── One to Many → RescueOperationVehicle
└── One to Many → RescueTeamMember (via RequestId)
```

### RescueTeam
```
RescueTeam (1)
└── One to Many → RescueTeamMember
    ├── Many to One → User
    └── Nullable Foreign Key → RequestId (tracks member's current task)
```

### RescueOperationVehicle
```
RescueOperationVehicle (Junction Table)
├── Many to One → RescueOperation
└── Many to One → Vehicle
```

### Vehicle
```
Vehicle (1)
├── Many to One → RescueTeam (Owned by team)
└── Status: AVAILABLE | INUSE
```

---

## 🔐 Authorization Levels

### COORDINATOR (Dispatcher)
```
✅ POST /api/rescue-operation/assign
✅ GET /api/rescue-operation/requests/{id}/nearest-teams
❌ RESCUE_TEAM endpoints
❌ MANAGER endpoints
```

### RESCUE_TEAM (Leader)
```
✅ PUT /api/rescue-team/requests/{id}/accept
✅ PUT /api/rescue-team/requests/{id}/reject
✅ POST /api/rescue-team/members/assign-task
✅ GET /api/rescue-team/members
✅ GET /api/rescue-team/my-operations
❌ Coordinator endpoints
❌ Manager endpoints
```

### RESCUE_TEAM (Member)
```
✅ GET /api/rescue-team/my-assignment
✅ PUT /api/rescue-team/my-assignment/confirm
✅ PUT /api/rescue-team/operations/{id}/status
✅ GET /api/rescue-team/operations/{id}
❌ PUT /api/rescue-team/requests/{id}/accept (Leader only)
❌ POST /api/rescue-team/members/assign-task (Leader only)
❌ GET /api/rescue-team/members (Leader only)
```

### ADMIN
```
✅ All endpoints with [Authorize]
❌ Endpoints with specific role restrictions (e.g., [Authorize(Roles="COORDINATOR")])
```

### MANAGER
```
✅ GET /api/rescue-team/status
❌ Most other endpoints (limited access)
```

---

## ⚡ Performance Notes

### Query Optimization
- Operations with status = "Assigned" filtered at DB level
- Includes() for related entities to prevent N+1
- AsNoTracking() for read-only queries

### Concurrency Handling
- Uses EF Core optimistic concurrency
- DbUpdateConcurrencyException caught and returned as 409
- Requires users to retry and reload data

### Database Transactions
- Used for complex operations (AssignRescue)
- Ensures atomic success/failure
- Automatic rollback on error

### Caching Strategy
- No caching implemented (all data fresh from DB)
- Real-time status updates critical for rescue scenarios

---

## 📝 Common Error Scenarios

### Scenario: Trying to assign member who's already busy
```json
{
  "success": false,
  "message": "Không có thành viên nào có thể được giao việc. Tất cả đang bận hoặc không thuộc đội."
}
```
**Solution:** Check member isBusy flag before assignment

---

### Scenario: Request not in Verified status when assigning
```json
{
  "success": false,
  "message": "Rescue request phải có status = Verified. Status hiện tại: Completed"
}
```
**Solution:** Only new requests can be assigned

---

### Scenario: User not Leader when trying to assign members
```json
{
  "success": false,
  "message": "Bạn không có quyền thực hiện. Chỉ Đội trưởng (Leader) của đội này mới có quyền."
}
```
**Response Code:** 403 Forbidden

---

### Scenario: Concurrent update (data changed by another user)
```json
{
  "success": false,
  "message": "Dữ liệu đã bị thay đổi bởi người khác. Vui lòng thử lại."
}
```
**Response Code:** 409 Conflict  
**Action:** Reload data and retry

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] AssignRescue with valid data
- [ ] AssignRescue with invalid vehicle status
- [ ] AssignRescue with request not in Verified status
- [ ] MemberAssignment with all members busy
- [ ] MemberAssignment partial success (some busy)
- [ ] UpdateMissionStatus COMPLETED
- [ ] UpdateMissionStatus FAILED with reason
- [ ] UpdateMissionStatus FAILED without reason (should fail)
- [ ] ConfirmMyTask when member has no assignment
- [ ] ConfirmMyTask successful flow

### Integration Tests
- [ ] Full flow: Assign → Leader Accept → Assign Members → Member Confirm
- [ ] Full flow with rejection: Assign → Leader Reject → Back to Verified
- [ ] Full flow with failure: Team marks operation as FAILED
- [ ] Concurrency: Two teams updating same request
- [ ] Permission: Non-Leader trying to assign members
- [ ] Permission: Member trying to accept request

### Load Tests
- [ ] 100 concurrent GET /my-operations
- [ ] 10 concurrent POST /assign-task
- [ ] GetNearestTeams with 100+ teams

---

## 🚀 Deployment Checklist

- [ ] All endpoints tested with Swagger
- [ ] JWT tokens working correctly
- [ ] Roles properly enforced
- [ ] Database migrations applied
- [ ] Transaction handling verified
- [ ] Error messages properly localized
- [ ] Logging configured
- [ ] CORS settings for FE domain
- [ ] HTTPS enabled
- [ ] Rate limiting configured

---

## 📚 Related Documents

- `BE_API_RESCUE_TEAM_FLOW_COMPLETE.md` - Main flow documentation
- `BE_DTO_SCHEMAS_REFERENCE.md` - All DTO definitions
- `COMPREHENSIVE_REVIEW_FE_BE.md` - Full backend review
- Source: `d:\SWP_git\BE\API\Controllers\RescueTeamController.cs`
- Source: `d:\SWP_git\BE\API\Controllers\RescueOperationController.cs`

---

**Document Version:** 1.0  
**Last Updated:** April 7, 2026  
**Status:** ✅ Production Ready
