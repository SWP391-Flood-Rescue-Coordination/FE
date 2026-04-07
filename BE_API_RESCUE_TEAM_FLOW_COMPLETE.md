# 🚀 BE API - Rescue Team Flow (Coordinator → Leader → Member)

**Status:** ✅ **FULLY IMPLEMENTED & TESTED**  
**Last Updated:** April 7, 2026

---

## 📋 Complete Flow Chart

```
┌─────────────────────────────────────────────────────────────┐
│                       COORDINATOR                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
    POST /api/rescue-operation/assign
    {
      "requestId": 123,
      "teamId": 456,
      "vehicleIds": "1,2,3",
      "estimatedTime": 30
    }
    ✅ Creates RescueOperation (status: Assigned)
    ✅ Sets vehicles to InUse
    ✅ Updates Request status → Assigned

                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    LEADER (Team Trưởng)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
    ACCEPT: PUT /api/rescue-team/requests/{requestId}/accept
    REJECT: PUT /api/rescue-team/requests/{requestId}/reject
    ✅ If ACCEPT: Request status → Assigned (locked)
    ✅ If REJECT: Request status → Verified + TeamId cleared

                            ↓ (If ACCEPT)
    POST /api/rescue-team/members/assign-task
    {
      "userIds": [100, 101, 102],
      "requestId": 123
    }
    ✅ Assigns specific members (sets RequestId in RescueTeamMember)
    ✅ Creates/Ensures RescueOperation exists
    ✅ Returns assigned + skipped members

                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    MEMBER (Thành viên)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
    GET /api/rescue-team/my-assignment
    ✅ Gets individual task details
    ✅ Shows operation, request, location

                            ↓ (Complete task)
    PUT /api/rescue-team/my-assignment/confirm
    ✅ Confirms task done
    ✅ Sets RequestId → null (Member returns to Available)

                            ↓ (When all team complete)
┌─────────────────────────────────────────────────────────────┐
│                  TEAM (Mark Complete)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
    PUT /api/rescue-team/operations/{operationId}/status
    {
      "newStatus": "COMPLETED",
      "reason": null
    }
    ✅ Operation status → Completed
    ✅ All members released (RequestId cleared)
    ✅ All vehicles released (status → AVAILABLE)
    ✅ Request remains Assigned (waiting citizen confirmation)
```

---

## 🔗 Complete API Endpoints

### 1️⃣ COORDINATOR PHASE
**Coordinator phân công team + vehicles cho request**

#### Endpoint
```
POST /api/rescue-operation/assign
```

#### Request
```json
{
  "requestId": 123,           // Required: Must be status = "Verified"
  "teamId": 456,              // Required
  "vehicleIds": "1,2,3",      // Optional: Comma-separated IDs
  "estimatedTime": 30         // Optional: Minutes
}
```

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "Phân công cứu hộ thành công",
  "data": {
    "operationId": 789,
    "requestId": 123,
    "teamId": 456,
    "assignedVehicleIds": [1, 2, 3],
    "assignedAt": "2026-04-07T10:30:00Z",
    "status": "Assigned",
    "numberOfAffectedPeople": 4,
    "estimatedTime": 30
  }
}
```

#### Errors
| Code | Message |
|------|---------|
| 404 | Không tìm thấy rescue request / rescue team |
| 400 | Request status không phải "Verified" / Vehicle không "AVAILABLE" |

**⚠️ Note:** Vehicle IDs must be AVAILABLE status before assigning

---

### 2️⃣ LEADER PHASE - Accept/Reject

#### 2A. Accept Request
```
PUT /api/rescue-team/requests/{requestId}/accept
```

**Role:** RESCUE_TEAM (Leader only)  
**Method:** PUT  
**Body:** Empty

**Response (Success - 200)**
```json
{
  "success": true,
  "message": "Tiếp nhận yêu cầu thành công"
}
```

**Status Changes:**
- Request: `Verified` → `Assigned`
- History logged: "Đội trưởng xác nhận tiếp nhận yêu cầu"

---

#### 2B. Reject Request
```
PUT /api/rescue-team/requests/{requestId}/reject?reason=optional+reason
```

**Role:** RESCUE_TEAM (Leader only)  
**Query Params:**
- `reason` (optional): Why rejecting

**Response (Success - 200)**
```json
{
  "success": true,
  "message": "Đã từ chối và giải phóng yêu cầu cứu hộ thành công"
}
```

**Status Changes:**
- Request: `Assigned` → `Verified`
- TeamId: Cleared
- Vehicles: Released to AVAILABLE
- History logged with reason

---

### 3️⃣ LEADER PHASE - Assign Members

#### Endpoint
```
POST /api/rescue-team/members/assign-task
```

**Role:** RESCUE_TEAM (Leader only)

#### Request
```json
{
  "userIds": [100, 101, 102],  // List of member IDs to assign
  "requestId": 123             // The request to assign
}
```

#### Response (Success - 200)
```json
{
  "teamId": 456,
  "operationId": 789,
  "assignedUserIds": [100, 101],      // Successfully assigned
  "skippedUserIds": [102],            // Busy or not found
  "message": "Đã giao nhiệm vụ cho 2 thành viên. Nhiệm vụ (Operation) đã được thiết lập sang 'Assigned'."
}
```

#### Errors
| Code | Message |
|------|---------|
| 400 | Danh sách userIds trống / Không có member nào khả dụng |
| 403 | User không phải Leader của team |
| 404 | Request/Team không tìm thấy |

**Logic:**
- Skips members already busy (RequestId != null)
- Skips members not in team
- Creates RescueOperation if doesn't exist
- Sets `RescueTeamMember.RequestId = requestId` for each assigned member

---

### 4️⃣ MEMBER PHASE - View Assignment

#### Endpoint
```
GET /api/rescue-team/my-assignment
```

**Role:** RESCUE_TEAM  
**Auth:** Required (use accessToken in header)

#### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "operationId": 789,
    "requestId": 123,
    "requestTitle": "Fire at building",
    "requestStatus": "Assigned",
    "requestAddress": "123 Main St",
    "requestPhone": "0912345678",
    "teamName": "Team Alpha",
    "status": "Assigned",
    "assignedAt": "2026-04-07T10:30:00Z",
    "estimatedTime": 30
  }
}
```

#### Errors
| Code | Message |
|------|---------|
| 404 | No active assignment for this member / Member not in any team |

**Note:** 
- Only returns when member has `RequestId != null`
- Shows the individual task assigned to this member

---

### 5️⃣ MEMBER PHASE - Confirm Task Done (🆕 NEW!)

#### Endpoint
```
PUT /api/rescue-team/my-assignment/confirm
```

**Role:** RESCUE_TEAM (Member only, NOT Leader)  
**Method:** PUT  
**Body:** Empty (no input needed)

#### Response (Success - 200)
```json
{
  "success": true,
  "userId": 100,
  "operationId": 789,
  "requestId": 123,
  "message": "Xác nhận hoàn tất nhiệm vụ thành công."
}
```

#### Errors
| Code | Message |
|------|---------|
| 404 | Member currently has no assignment |
| 403 | Leaders cannot use this endpoint (members only) |
| 400 | Operation not in "Assigned" status |

**What Happens:**
1. Sets `RescueTeamMember.RequestId = null` for this member
2. Member returns to "Available" status
3. Member can accept new tasks from Leader

---

### 6️⃣ TEAM PHASE - Mark Operation Complete

#### Endpoint
```
PUT /api/rescue-team/operations/{operationId}/status
```

**Role:** RESCUE_TEAM (any member)  
**Content-Type:** application/json

#### Request
```json
{
  "newStatus": "COMPLETED|FAILED",
  "reason": "Optional reason if FAILED"
}
```

#### Response (Success - 200)
```json
{
  "success": true,
  "operationId": 789,
  "requestId": 123,
  "operationStatus": "Completed",
  "requestStatus": "Assigned",
  "startedAt": "2026-04-07T10:35:00Z",
  "completedAt": "2026-04-07T10:55:00Z",
  "message": "Xác nhận hoàn tất nhiệm vụ thành công. Chờ người dân báo an toàn để đóng yêu cầu hoàn toàn."
}
```

#### If FAILED
```json
{
  "success": true,
  "operationId": 789,
  "requestId": 123,
  "operationStatus": "Failed",
  "requestStatus": "Verified",
  "message": "Đã ghi nhận nhiệm vụ thất bại. Yêu cầu đã quay lại trạng thái Chờ xử lý (Verified)."
}
```

**Behavior:**
- **COMPLETED:** 
  - Operation status → Completed
  - Request status remains Assigned
  - All members' RequestId cleared → Available
  - All vehicles status → AVAILABLE
- **FAILED:**
  - Operation status → Failed
  - Request status → Verified (back to coordinator)
  - All members released
  - All vehicles released

#### Errors
| Code | Message |
|------|---------|
| 400 | Operation not in "Assigned" status / Missing reason for FAILED |
| 409 | Request status incompatible / Data changed by others |

---

## 📊 Member Status Tracking

### Member States
```
AVAILABLE: RequestId = NULL
  ├─→ Can be assigned new task (Leader assigns)
  
BUSY: RequestId != NULL
  ├─→ Currently has task assigned
  ├─→ Can view task: GET /api/rescue-team/my-assignment
  ├─→ Can confirm done: PUT /api/rescue-team/my-assignment/confirm
  └─→ Returns to AVAILABLE after confirm
```

### Get Team Members (For Leader to see who's busy)
```
GET /api/rescue-team/members?search=optional
```

**Response:**
```json
{
  "success": true,
  "total": 3,
  "data": [
    {
      "teamId": 456,
      "userId": 100,
      "fullName": "John Doe",
      "username": "johndoe",
      "phone": "0912345678",
      "memberRole": "Member",
      "joinedAt": "2026-01-01T00:00:00Z",
      "requestId": 123,  // null if available
      "isBusy": true     // true if requestId != null
    }
  ]
}
```

---

## 🔄 Status Transitions Diagram

```
REQUEST STATUS FLOW:
Pending → Verified → Assigned → [Completed | Failed]

OPERATION STATUS FLOW:
Assigned → [Completed | Failed | Still Assigned]

MEMBER STATUS FLOW:
Available (RequestId=null) 
  ↓ (Leader assigns)
Busy (RequestId=123)
  ↓ (Member confirms)
Available (RequestId=null)

VEHICLE STATUS FLOW:
AVAILABLE 
  ↓ (Coordinator assigns)
INUSE
  ↓ (Team completes or rejects)
AVAILABLE
```

---

## ✅ Complete API Verification Checklist

| # | Step | Endpoint | Method | Status |
|---|------|----------|--------|--------|
| 1 | Coordinator assign | `/api/rescue-operation/assign` | POST | ✅ DONE |
| 2 | Leader accept | `/api/rescue-team/requests/{id}/accept` | PUT | ✅ DONE |
| 2b | Leader reject | `/api/rescue-team/requests/{id}/reject` | PUT | ✅ DONE |
| 2.5 | Leader assign members | `/api/rescue-team/members/assign-task` | POST | ✅ DONE |
| 3 | Member view task | `/api/rescue-team/my-assignment` | GET | ✅ DONE |
| 3.5 | **Member confirm done** | **`/api/rescue-team/my-assignment/confirm`** | **PUT** | **✅ NEW!** |
| 4 | Team mark complete | `/api/rescue-team/operations/{id}/status` | PUT | ✅ DONE |
| 5 | Get team members | `/api/rescue-team/members` | GET | ✅ DONE |
| 6 | Get my operations | `/api/rescue-team/my-operations` | GET | ✅ DONE |

---

## 🎯 Key Business Rules

1. **Leader Permissions:**
   - Only Leader (MemberRole = "Leader") can accept/reject
   - Only Leader can assign members to tasks
   - Cannot use member confirmation endpoint

2. **Member Permissions:**
   - Cannot accept/reject (Leader only)
   - Can view own assignment
   - Can confirm own task done
   - Cannot assign other members

3. **Team Member States:**
   - If `RequestId != null`: Member is BUSY
   - If `RequestId = null`: Member is AVAILABLE
   - Coordinator doesn't know about member assignments (only Leader knows)

4. **Operation Completion:**
   - ANY team member can mark operation as COMPLETED/FAILED
   - All members automatically released when operation completes
   - All vehicles automatically released

5. **Request State Management:**
   - After Coordinator assign: `Verified` → `Assigned`
   - After Leader accept: stays `Assigned`
   - After Leader reject: `Assigned` → `Verified` (back to coordinator)
   - After Team complete: stays `Assigned` (waiting citizen confirmation)
   - After Team fail: `Assigned` → `Verified` (back for reassignment)

---

## 📝 Implementation Notes for FE

### Request Headers Required
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### Error Handling
- **400 Bad Request:** Data validation failed
- **401 Unauthorized:** Missing/invalid token
- **403 Forbidden:** Insufficient permissions
- **404 Not Found:** Resource doesn't exist
- **409 Conflict:** Invalid status transition / Data concurrency issue

### Token-Based Authorization
- Token extracted from `Authorization: Bearer {token}`
- User ID parsed from `NameIdentifier` claim
- Role validation from `Roles` claim

### Concurrency Handling
- DB uses optimistic concurrency
- If data changed by another user: Returns 409 Conflict
- FE should reload and retry

---

## 🔑 Quick Reference

| Role | Can Do |
|------|--------|
| **Coordinator** | Assign team + vehicles |
| **Leader** | Accept/Reject, Assign members, View team members |
| **Member** | View own task, Confirm task done |
| **Any Team Member** | Mark operation as Completed/Failed |

---

## 📚 Full Flow Example

```
1. Coordinator creates rescue request
   Request status: Pending → Verified (by admin/coordinator)

2. Coordinator assigns team
   POST /api/rescue-operation/assign
   Request: Verified → Assigned
   Operation: Created (status=Assigned)
   Vehicles: AVAILABLE → INUSE

3. Leader sees notification and accepts
   PUT /api/rescue-team/requests/123/accept
   Request: stays Assigned

4. Leader views team members
   GET /api/rescue-team/members
   Shows all members with isBusy flag

5. Leader assigns specific members
   POST /api/rescue-team/members/assign-task
   Members: RequestId set to 123 (BUSY)
   Operation: Assured to exist and Assigned

6. Member 1 checks their assignment
   GET /api/rescue-team/my-assignment
   Shows: Task details for operation 789

7. Member 1 completes task
   PUT /api/rescue-team/my-assignment/confirm
   Member: RequestId cleared → AVAILABLE

8. Member 2 completes task
   PUT /api/rescue-team/my-assignment/confirm
   Member: RequestId cleared → AVAILABLE

9. Member 3 completes task
   PUT /api/rescue-team/my-assignment/confirm
   Member: RequestId cleared → AVAILABLE

10. Team leader marks operation as complete
    PUT /api/rescue-team/operations/789/status
    { "newStatus": "COMPLETED" }
    Operation: COMPLETED
    All members: Already AVAILABLE (from step 7-9)
    All vehicles: AVAILABLE
    Request: stays Assigned (waiting citizen confirmation)

11. Citizen confirms rescue
    POST /api/rescue-request/123/confirm-rescued
    Request: Assigned → Completed
    DONE!
```

---

**Generated:** April 7, 2026  
**Status:** ✅ Production Ready
