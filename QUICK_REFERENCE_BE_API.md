# ⚡ Quick Reference Card - BE API Endpoints

**Print this for your desk!** 📌

---

## 🔐 Base URL & Auth
```
Base: http://localhost:5000/api/
Auth: Authorization: Bearer {accessToken}
```

---

## 🎯 Core Endpoints (Rescue Team Flow)

### 1️⃣ Coordinator Assigns Team+Vehicles
```
POST /rescue-operation/assign
└─ Coordinator only
└─ Creates Operation + marks vehicles INUSE
└─ Request: Verified → Assigned

REQUEST:
{
  "requestId": 123,
  "teamId": 456,
  "vehicleIds": "1,2,3",
  "estimatedTime": 30
}

✅ 200 OK → {operationId, status: Assigned}
❌ 400 BadRequest → vehicle not AVAILABLE
❌ 404 NotFound → request/team not found
```

---

### 2️⃣ Leader Accept/Reject
```
PUT /rescue-team/requests/{requestId}/accept
└─ Leader role only
└─ Request: stays Assigned

PUT /rescue-team/requests/{requestId}/reject?reason=text
└─ Leader role only
└─ Request: Assigned → Verified, TeamId cleared
└─ Vehicles: released to AVAILABLE
```

---

### 3️⃣ Leader Assign Members
```
POST /rescue-team/members/assign-task
└─ Leader role only
└─ Sets RequestId on each member (marks BUSY)
└─ Creates/updates Operation

REQUEST:
{
  "userIds": [100, 101, 102],
  "requestId": 123
}

RESPONSE:
{
  "teamId": 456,
  "operationId": 789,
  "assignedUserIds": [100, 101],
  "skippedUserIds": [102],     ← Already busy
  "message": "..."
}

✅ Partial success OK (returns skipped list)
❌ 403 Forbidden → not Leader
❌ 400 BadRequest → no valid members
```

---

### 4️⃣ Member Views Assignment
```
GET /rescue-team/my-assignment
└─ Member role only
└─ Auto-populated where RequestId != null

RESPONSE:
{
  "operationId": 789,
  "requestId": 123,
  "requestTitle": "Fire at building",
  "requestAddress": "123 Main St",
  "requestPhone": "0912345678",
  "status": "Assigned",
  "estimatedTime": 30
}

❌ 404 NotFound → member has no assignment
```

---

### 5️⃣ Member Confirms Done ✨ NEW!
```
PUT /rescue-team/my-assignment/confirm
└─ Member role only (NOT Leader)
└─ Clears RequestId (member → AVAILABLE)
└─ Body: empty

RESPONSE:
{
  "success": true,
  "userId": 100,
  "operationId": 789,
  "requestId": 123,
  "message": "Xác nhận hoàn tất nhiệm vụ thành công."
}

❌ 403 Forbidden → Leader cannot use this
❌ 404 NotFound → member has no assignment
```

---

### 6️⃣ Team Marks Operation Complete
```
PUT /rescue-team/operations/{operationId}/status
└─ Any team member
└─ COMPLETED: Releases all members + vehicles
└─ FAILED: Request → Verified (back to coordinator)

REQUEST:
{
  "newStatus": "COMPLETED|FAILED",
  "reason": "If FAILED, why?" ← Required for FAILED
}

RESPONSE (COMPLETED):
{
  "success": true,
  "operationStatus": "Completed",
  "requestStatus": "Assigned",
  "message": "Xác nhận hoàn tất..."
}

RESPONSE (FAILED):
{
  "success": true,
  "operationStatus": "Failed",
  "requestStatus": "Verified",  ← Request back to coordinator
  "message": "Đã ghi nhận many vụ thất bại..."
}

❌ 400 BadRequest → reason missing for FAILED
❌ 409 Conflict → Operation not in Assigned status
```

---

## 🛠️ Utility Endpoints

### Get My Operations (Team Level)
```
GET /rescue-team/my-operations
└─ Shows all tasks assigned to the team
└─ NOT individual member level

RESPONSE: Array of TeamOperationDto
[
  {
    "operationId": 789,
    "requestId": 123,
    "requestTitle": "...",
    "status": "Assigned",
    "vehicles": ["Fire Truck 1", "Ambulance 2"],
    ...
  }
]
```

---

### Get Team Members (Leader)
```
GET /rescue-team/members?search=john
└─ Leader only
└─ Shows isBusy flag for each member

RESPONSE:
{
  "total": 5,
  "data": [
    {
      "userId": 100,
      "fullName": "John Doe",
      "memberRole": "Member",
      "requestId": 123,         ← null if available
      "isBusy": true            ← Shortcut for frontend
    }
  ]
}
```

---

### Find Nearest Teams
```
GET /rescue-operation/requests/{requestId}/nearest-teams
└─ Coordinator only
└─ Uses OSRM for real road distance
└─ Sorted by distance (nearest first)

RESPONSE:
{
  "requestId": 123,
  "count": 3,
  "data": [
    {
      "teamId": 456,
      "teamName": "Team Alpha",
      "baseLatitude": 21.0285,
      "baseLongitude": 105.8542,
      "distanceKm": 3.45
    }
  ]
}
```

---

## 🔴 Common Errors

| Status | Message | Fix |
|--------|---------|-----|
| 400 | newStatus phải COMPLETED/FAILED | Use exact case |
| 400 | reason bắt buộc khi FAILED | Add reason field |
| 400 | userIds không được để trống | Send at least 1 member |
| 403 | Không có quyền thực hiện | Wrong role/not leader |
| 404 | Không tìm thấy | ID doesn't exist |
| 409 | Dữ liệu đã bị thay đổi | Reload and retry |

---

## 👤 Role Permissions Matrix

| Endpoint | Coordinator | Leader | Member | Admin |
|----------|:-----------:|:------:|:------:|:-----:|
| POST /assign | ✅ | ❌ | ❌ | ✅ |
| PUT /accept | ❌ | ✅ | ❌ | ✅ |
| PUT /reject | ❌ | ✅ | ❌ | ✅ |
| POST /assign-task | ❌ | ✅ | ❌ | ✅ |
| GET /my-assignment | ❌ | ❌ | ✅ | ✅ |
| PUT /confirm | ❌ | ❌ | ✅ | ✅ |
| PUT /status | ❌ | ✅ | ✅ | ✅ |
| GET /members | ❌ | ✅ | ❌ | ✅ |
| GET /nearest-teams | ✅ | ❌ | ❌ | ✅ |

---

## 📊 Status Values

### Request Status
```
Pending → Verified → Assigned → [Completed | Failed]
```

### Operation Status
```
Assigned → [Completed | Failed]
```

### Vehicle Status
```
AVAILABLE → INUSE → AVAILABLE
```

### Member Status
```
AVAILABLE (RequestId=null)
  ↓ (Leader assigns)
BUSY (RequestId=123)
  ↓ (Member confirms)
AVAILABLE (RequestId=null)
```

---

## 🧪 Quick Test Flow

```bash
# 1. Coordinator assigns
curl -X POST http://localhost:5000/api/rescue-operation/assign \
  -H "Authorization: Bearer COORDINATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": 1,
    "teamId": 1,
    "vehicleIds": "1,2,3"
  }'

# Returns: operationId = 1

# 2. Leader accepts
curl -X PUT http://localhost:5000/api/rescue-team/requests/1/accept \
  -H "Authorization: Bearer LEADER_TOKEN"

# 3. Leader assigns members
curl -X POST http://localhost:5000/api/rescue-team/members/assign-task \
  -H "Authorization: Bearer LEADER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": [2, 3, 4],
    "requestId": 1
  }'

# 4. Member checks assignment
curl -X GET http://localhost:5000/api/rescue-team/my-assignment \
  -H "Authorization: Bearer MEMBER_TOKEN"

# 5. Member confirms done
curl -X PUT http://localhost:5000/api/rescue-team/my-assignment/confirm \
  -H "Authorization: Bearer MEMBER_TOKEN"

# 6. Team marks complete
curl -X PUT http://localhost:5000/api/rescue-team/operations/1/status \
  -H "Authorization: Bearer MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newStatus": "COMPLETED"
  }'
```

---

## ⏰ Typical Response Times

| Endpoint | Time | Notes |
|----------|------|-------|
| POST /assign | 100ms | Transaction heavy |
| PUT /accept | 50ms | Simple update |
| POST /assign-task | 75ms | Bulk update |
| GET /my-assignment | 30ms | Single fetch |
| PUT /confirm | 40ms | Simple update |
| PUT /status | 100ms | Releases multiple resources |
| GET /nearest-teams | 1s | OSRM API call |

---

## 🔗 Related Documents

- **Full Documentation:** `BE_API_RESCUE_TEAM_FLOW_COMPLETE.md`
- **DTO Schemas:** `BE_DTO_SCHEMAS_REFERENCE.md`
- **Additional Endpoints:** `BE_ADDITIONAL_ENDPOINTS_REFERENCE.md`
- **Postman Collection:** (Import all examples)

---

## ✅ Pre-Integration Checklist

- [ ] Verify token contains correct claims (NameIdentifier, Roles)
- [ ] Handle 409 Conflict errors (retry logic)
- [ ] Implement member isBusy visual indicator
- [ ] Show skipped members in assignment response
- [ ] Add real-time status updates where possible
- [ ] Test with multiple concurrent users
- [ ] Validate all enum values match backend
- [ ] Cache operations locally if needed

---

**Last Updated:** April 7, 2026  
**API Version:** 1.0  
**Status:** ✅ Production Ready
