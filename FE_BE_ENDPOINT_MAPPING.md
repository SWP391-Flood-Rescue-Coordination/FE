# FE-BE Endpoint & Field Mapping Check

## 1. COORDINATOR - Verify Request

### Backend Endpoint
```
PUT /api/RescueRequest/{id}/verify?team_id=X
Status: 200 OK
```

### FE Call (coordinatorService.js)
```javascript
verifyRequest: async (requestId, teamId = null) => {
  let url = `${REQUEST_BASE}/${requestId}/verify`
  if (teamId !== null && teamId !== undefined && teamId !== '') {
    url += `?team_id=${teamId}`
  }
  const response = await api.put(url)
  return unwrapApiData(response)
}
```

### Request Mapping ✅
- ✅ Path: `/RescueRequest/{id}/verify` - MATCH
- ✅ Method: PUT - MATCH
- ✅ Query param: `team_id=X` - MATCH
- ✅ Sets: `request.Status = "Verified"` + `request.TeamId = team_id`

---

## 2. LEADER - Accept Request

### Backend Endpoint
```
PUT /api/rescue-team/requests/{requestId}/accept
Status: 200 OK
Requirements:
  - request.Status == "Verified"
  - request.TeamId != null
  - User is Leader of request.TeamId
Returns:
  { Success: true, Message: "..." }
```

### FE Call (rescueTeamService.js)
```javascript
acceptRequest: async (requestId) => {
  const response = await api.put(`/rescue-team/requests/${requestId}/accept`)
  return response.data
}
```

### Field Mapping ✅
- ✅ Path: `/rescue-team/requests/{id}/accept` - MATCH
- ✅ Method: PUT - MATCH
- ✅ Sets: `request.Status = "Assigned"`

---

## 3. LEADER - Reject Request

### Backend Endpoint
```
PUT /api/rescue-team/requests/{requestId}/reject?reason=X
Status: 200 OK
Requirements:
  - request.Status == "Verified" OR "Assigned"
  - request.TeamId != null
  - User is Leader of request.TeamId
  - reason is NOT empty
Sets:
  - request.Status = "Verified"
  - request.TeamId = null
Returns:
  { Success: true, BatchId: "...", Message: "..." }
```

### FE Call (rescueTeamService.js)
```javascript
rejectRequest: async (requestId, reason = '') => {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : ''
  const response = await api.put(`/rescue-team/requests/${requestId}/reject${query}`)
  return response.data
}
```

### Field Mapping ✅
- ✅ Path: `/rescue-team/requests/{id}/reject` - MATCH
- ✅ Method: PUT - MATCH
- ✅ Query: `reason=X` (URL encoded) - MATCH
- ⚠️ **ISSUE:** Backend require `reason != empty`, FE allows empty - CHECK!

---

## 4. LEADER - Assign Members

### Backend Endpoint
```
POST /api/rescue-team/members/assign-task
Body: {
  requestId: int,
  userIds: int[],
  vehicleIds?: int[]
}
Status: 200 OK
Requirements:
  - request.Status == "Verified" OR "Assigned"
  - request.TeamId != null
  - User is Leader of request.TeamId
  - at least 1 valid member
Sets:
  - Creates RescueOperation if !exists
  - operation.Status = "Assigned"
  - operation.TeamId = teamId
  - operation.RequestId = requestId
  - members[].RequestId = requestId
  - request.Status = "Assigned"
Returns:
  {
    TeamId: int,
    OperationId: int,
    BatchId: guid,
    AssignedUserIds: int[],
    ReassignedUserIds: int[],
    SkippedUserIds: int[],
    Message: string
  }
```

### FE Call (rescueTeamService.js)
```javascript
assignTaskToMembers: async (requestId, userIds) => {
  const payload = {
    userIds: Array.isArray(userIds) ? userIds : [userIds],
    requestId: Number(requestId),
  }
  const response = await api.post('/rescue-team/members/assign-task', payload)
  return response.data
}
```

### Field Mapping
- ✅ Path: `/rescue-team/members/assign-task` - MATCH
- ✅ Method: POST - MATCH
- ✅ Payload.requestId: int - MATCH
- ✅ Payload.userIds: int[] - MATCH
- ❌ **Payload.vehicleIds:** FE KHÔNG GỬI - Backend accepts optional, so OK but **incomplete**

---

## 5. LEADER - Get My Operations

### Backend Endpoint (Line 411)
```
GET /api/rescue-team/my-operations
Status: 200 OK
Returns operations with:
  - status == "Assigned" ONLY
  - Include nested request data
Returns:
  {
    Success: true,
    Total: int,
    Data: [
      {
        OperationId: int,
        RequestId: int,
        RequestTitle: string,
        RequestStatus: string,
        RequestAddress: string,
        RequestPhone: string,
        PriorityName: string,
        Status: string,
        Vehicles: string[]
      }
    ]
  }
```

### FE Fetches
```javascript
const response = await api.get('/rescue-team/my-operations')
const data = unwrapApiData(response)
// Expects array of operations
// Maps: operation.RequestStatus → frontendStatus
```

### Problem ⚠️ CRITICAL
- **BackEnd:** Only returns `operation.status == "Assigned"`
- **FrontEnd:** Needs to see `request.status == "Verified"` (Coordinator just verified)
- **Impact:** Leader cannot see Verified requests to accept/assign

### Solution Options:
1. Backend add filter: include Verified + Assigned requests
2. FE Add endpoint: fetch Verified requests from `/RescueRequest` directly
3. **CURRENT FE:** Maps `operation.status` not `request.status` → WRONG!

---

## 6. LEADER - Get Team Members

### Backend Endpoint
```
GET /api/rescue-team/members?search=X (optional)
Status: 200 OK
Returns:
  {
    Success: true,
    Total: int,
    Data: [
      {
        TeamId: int,
        UserId: int,
        FullName: string,
        Username: string,
        Phone: string,
        MemberRole: string (Leader|Member),
        JoinedAt: datetime,
        RequestId: int?,
        IsBusy: bool,
        CurrentOperationId: int?
      }
    ]
  }
```

### FE Call (rescueTeamService.js)
```javascript
getTeamMembers: async (search = '') => {
  const params = search ? { search } : {}
  const response = await api.get('/rescue-team/members', { params })
  // ... transform to display format
}
```

### Field Mapping ✅
- ✅ Path: `/rescue-team/members` - MATCH
- ✅ Query: `search=X` (optional) - MATCH
- ✅ Maps all fields correctly

---

## 7. MEMBER - Get My Assignment

### Backend Endpoint
```
GET /api/rescue-team/my-assignment
Status: 200 OK
Returns:
  {
    Success: true,
    Data: {
      OperationId: int,
      RequestId: int,
      RequestTitle: string,
      RequestStatus: string,
      TeamName: string,
      OperationStatus: string
    }
  }
```

### FE Call (rescueTeamService.js)
```javascript
getMyAssignment: async () => {
  const response = await api.get('/rescue-team/my-assignment')
  return unwrapApiData(response)
}
```

### Field Mapping ✅
- ✅ Path: `/rescue-team/my-assignment` - MATCH
- ✅ Method: GET - MATCH

---

## 8. MEMBER - Confirm Task Completed

### Backend Endpoint
```
PUT /api/rescue-team/my-assignment/confirm
Status: 200 OK
Returns:
  {
    Success: true,
    BatchId: guid,
    Message: "..."
  }
```

### FE Call (rescueTeamService.js)
```javascript
confirmTaskCompleted: async () => {
  const response = await api.put('/rescue-team/my-assignment/confirm')
  return unwrapApiData(response)
}
```

### Field Mapping ✅
- ✅ Path: `/rescue-team/my-assignment/confirm` - MATCH
- ✅ Method: PUT - MATCH

---

## 9. MEMBER - Request Support

### Backend Endpoint
```
POST /api/rescue-team/my-assignment/support
Status: 200 OK
Returns:
  {
    Success: true,
    OperationId: int,
    RequestId: int,
    Message: "..."
  }
```

### FE Call (rescueTeamService.js)
```javascript
requestSupport: async () => {
  const response = await api.post('/rescue-team/my-assignment/support')
  return unwrapApiData(response)
}
```

### Field Mapping ✅
- ✅ Path: `/rescue-team/my-assignment/support` - MATCH
- ✅ Method: POST - MATCH

---

## 10. LEADER - Update Mission Status

### Backend Endpoint
```
PUT /api/rescue-team/operations/{operationId}/status
Body: {
  NewStatus: "COMPLETED" | "FAILED",
  Reason: string (required if FAILED)
}
Status: 200 OK
Returns:
  {
    Success: true,
    OperationId: int,
    RequestId: int,
    OperationStatus: string,
    RequestStatus: string
  }
```

### FE Call (rescueTeamService.js)
```javascript
updateMissionStatus: async (operationId, newStatus, reason = null) => {
  const payload = { NewStatus: newStatus }
  if (reason) payload.Reason = reason
  const response = await api.put(
    `/rescue-team/operations/${operationId}/status`,
    payload
  )
  return unwrapApiData(response)
}
```

### Field Mapping ✅
- ✅ Path: `/rescue-team/operations/{id}/status` - MATCH
- ✅ Method: PUT - MATCH
- ✅ Payload.NewStatus: uppercase - MATCH

---

## CRITICAL ISSUES FOUND

### 🔴 Issue #1: Leader Cannot See Verified Requests
**Severity:** CRITICAL
- Backend: `/rescue-team/my-operations` returns ONLY `operation.status="Assigned"`
- Frontend: Dashboard polls this endpoint, sees nothing for Verified requests
- **Impact:** Leader doesn't see requests to verify/accept/reject
- **Fix Needed:** Backend must include Verified requests OR FE must fetch from separate endpoint

### ⚠️ Issue #2: Reject Reason Optional in FE, Required in BE
**Severity:** MEDIUM
- Backend: Requires `reason != null && != empty`
- Frontend: Allows empty reason with `reason.split('\\n').length > 0` check but IF user cancels, reason = null
- **Fix:** FE should validate reason not null BEFORE calling API

### ⚠️ Issue #3: Vehicle IDs Not Sent
**Severity:** LOW
- Backend: Accepts optional `vehicleIds[]` in payload
- Frontend: Never sends `vehicleIds`
- **Fix:** Add vehicle selection UI to assign modal

---

## CORRECTIONS NEEDED

| Issue | Current | Should Be | Status |
|-------|---------|-----------|--------|
| Verify endpoint | `/RescueRequest/{id}/verify` | ✅ Correct | FIXED |
| Accept endpoint | `/rescue-team/requests/{id}/accept` | ✅ Correct | FIXED |
| Reject endpoint | `/rescue-team/requests/{id}/reject` | ✅ Correct | FIXED |
| Assign endpoint | `/rescue-team/members/assign-task` | ✅ Correct | FIXED |
| My-operations filter | Only Assigned | Should include Verified | ❌ NEEDS BACKEND FIX |
| Reject reason validation | Optional | Should be required | ⚠️ NEEDS FE FIX |
| Vehicle assignment | Not sent | Should be optional | ⚠️ ENHANCEMENT |

---

## NEXT STEPS

1. **Backend:** Update `/rescue-team/my-operations` to include Verified requests
2. **Frontend:** Add reason validation before calling reject endpoint
3. **Optional:** Enhance assign modal to show vehicle selector
