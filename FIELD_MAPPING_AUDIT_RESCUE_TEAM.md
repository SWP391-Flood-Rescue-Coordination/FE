# 🔍 RESCUE TEAM FIELD MAPPING AUDIT

**Date:** April 10, 2026  
**Scope:** Audit ALL field mappings in rescue team services vs actual BE API  
**Status:** IN PROGRESS

---

## 🚨 CRITICAL FINDINGS

### ⚠️ ENDPOINT ISSUE #1: NON-EXISTENT ENDPOINT

**Location:** `rescueTeamService.js` line 713  
**Current Code:**
```javascript
const response = await api.get('/rescue-team/assigned-requests')
```

**Problem:** 
- ❌ Endpoint `/rescue-team/assigned-requests` **DOES NOT EXIST** in BE
- Called by: `RescueTeamDashboard.jsx` line 182 in `fetchTeamAssignedRequests()`
- Impact: Leader dashboard CANNOT load assigned requests

**Correct Endpoints from BE Docs:**
- ✅ `GET /api/rescue-team/my-operations` - Exists, returns all operations for leader's team
- ✅ `GET /api/rescue-team/members` - Exists, returns team members to see who's busy

**Recommendation:** 
Replace `getAssignedRequests()` to use `/rescue-team/my-operations` OR

---

## 📊 FIELD MAPPING COMPARISON

### Source: `getAssignedRequests()` (Line 707-780)
**Endpoint:** `/rescue-team/assigned-requests` ❌ DOESN'T EXIST

**Fields Expected from Response:**
```javascript
{
  requestId,                  // Map from: requestId | RequestId | request_id | id | Id
  requestStatus,              // From: requestStatus | RequestStatus | status | Status
  operationStatus,            // From: operationStatus | OperationStatus | currentOperationStatus | status | Status
  status (backend),           // From: status | Status
  title,                      // From: title | Title → Mapped to 'Yêu cầu cứu hộ' default
  description,                // From: description | Description
  priority/priorityName,      // From: priorityName | PriorityName → mapPriorityDisplay()
  phone,                       // From: citizenPhone | CitizenPhone | phone | Phone | contactPhone | ContactPhone
  address,                    // From: address | Address
  latitude,                   // From: latitude | Latitude
  longitude,                  // From: longitude | Longitude
  adultCount,                 // From: adultCount | AdultCount
  elderlyCount,               // From: elderlyCount | ElderlyCount
  childrenCount,              // From: childrenCount | ChildrenCount
  numberOfAffectedPeople,     // From: numberOfAffectedPeople | NumberOfAffectedPeople | (adultCount + elderlyCount + childrenCount)
  createdAt,                  // From: createdAt | CreatedAt
  updatedAt,                  // From: updatedAt | UpdatedAt
  hasSupportRequest,          // From: hasSupportRequest | HasSupportRequest
  lastSupportRequestedAt,     // From: lastSupportRequestedAt | LastSupportRequestedAt
}
```

### Source: `getMyOperations()` (Line 223-237)
**Endpoint:** `/rescue-team/my-operations` ✅ EXISTS

**Fields from BE Response (per docs):**
```javascript
{
  operationId,                // Operation ID
  requestId,                  // Request ID
  requestTitle,               // Request title
  requestStatus,              // Request status (Pending, Verified, Assigned, Completed, Failed)
  requestAddress,             // Full address
  requestDescription,         // Description
  requestPhone,               // Citizen phone
  requestLatitude,            // Location lat
  requestLongitude,           // Location lng
  priorityName,               // Priority name
  status,                     // Operation status (Assigned, Completed, Failed, ...)
  teamName,                   // Team name (optional)
  vehicles,                   // Vehicles array (optional)
  estimatedTime,              // Estimated time in minutes
  assignedAt,                 // Assignment timestamp
  startedAt,                  // Start timestamp
  completedAt,                // Completion timestamp
  // NOTE: NO numberOfAffectedPeople / adultCount / elderlyCount / childrenCount fields!
}
```

**Transform Used:** `transformOperationToMission()` (Line 110-162)

---

## ❌ ISSUE #2: FIELD NAME MISMATCHES

### Missing Fields in `my-operations` Response

The `getAssignedRequests()` method expects these fields, but `/rescue-team/my-operations` may NOT have them:

| Field | Expected Source | Actual in `/my-operations`? | Status |
|-------|-----------------|---------------------------|--------|
| numberOfAffectedPeople | BE JSON property | ❌ NOT IN RESPONSE | ❓ Need to verify|
| adultCount | BE JSON property | ❌ NOT IN RESPONSE | ❓ Need to verify |
| elderlyCount | BE JSON property | ❌ NOT IN RESPONSE | ❓ Need to verify |
| childrenCount | BE JSON property | ❌ NOT IN RESPONSE | ❓ Need to verify |
| hasSupportRequest | BE JSON property | ❌ NOT IN RESPONSE | ❓ Need to verify |
| lastSupportRequestedAt | BE JSON property | ❌ NOT IN RESPONSE | ❓ Need to verify |
| teamId | BE JSON property | ❓ Not documented | ❓ Skip for now |
| operationId | BE JSON property | ✅ PRESENT | ✅ OK |
| requestId | BE JSON property | ✅ PRESENT | ✅ OK |
| status | BE JSON property | ✅ PRESENT | ✅ OK |

### Question: How does FE get people counts?

**Current Flow:**
1. `getAssignedRequests()` expects full request data including people counts
2. But if we use `/my-operations`, people count fields may not be in response
3. Need to either:
   - Option A: Add people counts to `/my-operations` response in BE
   - Option B: Make additional API call to get full request data including people
   - Option C: Get people counts from another endpoint (e.g., `/rescue-request/{id}`)

---

## 📋 FIELD MAPPING CHECKLIST

### Field: `numberOfAffectedPeople`
- **Used in:** RescueTeamDashboard.jsx expanded details line ~858
- **Expected from:** `/rescue-team/assigned-requests` response
- **Current Implementation:** Fallback calculation from adultCount + elderlyCount + childrenCount
- **Status:** ❌ If using `/my-operations`, this field not in response
- **Action Required:** Verify if `/my-operations` includes people counts

### Field: `hasSupportRequest`
- **Used in:** RescueTeamDashboard.jsx getSupportInfo() line ~615
- **Expected from:** `/rescue-team/assigned-requests` response
- **Status:** ❌ If using `/my-operations`, not in response
- **Fallback:** Checks `teamMembers` for matching `requestId` with `lastSupportRequestedAt`
- **Action Required:** Verify BE schema

### Field: `status` / `operationStatus` / `requestStatus`
- **Used in:** RescueTeamDashboard.jsx statusInfo calculation
- **Mapping Logic:**
  ```
  FE expects: request.status = 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED'
  
  Maps from backend statusKey:
    'WAITING' → 'PENDING'
    'COMPLETED' → 'COMPLETED'
    'ACCEPTED' / 'Assigned' / 'Confirmed' → 'ACCEPTED'
    Default → 'PENDING'
  ```
- **Status:** ⚠️ Complex status mapping, needs verification

### Field: `priority` / `priorityName`
- **Used in:** RescueTeamDashboard.jsx priority badge
- **Mapping:** `mapPriorityDisplay(priorityName || PriorityName)`
- **Maps to:**
  - "Khẩn cấp" (Urgent)
  - "Cao" (High)
  - "Trung bình" (Medium)
- **Status:** ✅ Looks OK

### Field: `address`
- **Expected from:** `address` | `Address` | `requestAddress` | `RequestAddress`
- **Status:** ✅ Fallback chain covers most cases
- **Used in:** Grid display and expanded details

### Field: `phone`
- **Expected from:** `citizenPhone | CitizenPhone | phone | Phone | contactPhone | ContactPhone | requestPhone | RequestPhone`
- **Status:** ✅ Comprehensive fallback chain

---

## 🎯 WHAT LEADER DASHBOARD ACTUALLY NEEDS

Based on the screenshot showing a leader dashboard:

**Required Fields:**
1. ✅ Request ID (#67)
2. ✅ Address (Sân Khuôn...")
3. ✅ Phone (09555544433)
4. ✅ Status (Đã Chấp Nhận)
5. ✅ Number of people (Người Lớn: 1, Người Già: 0, Trẻ Em: 0)
6. ✅ Support badge (🆘 Hỗ trợ if hasSupportRequest)
7. ✅ Priority badge (Trung Bình)
8. ✅ Estimated time (possibly, user says to remove it)

**Data Source Analysis:**
- If using `/rescue-team/my-operations`: Has operationId, requestId, status, priority, phone, address
- Missing from `/my-operations`: numberOfAffectedPeople, adultCount, elderlyCount, childrenCount, hasSupportRequest
- **Need:** Call another endpoint to get full request data? OR update BE to include these fields

---

## 📌 ROOT CAUSE ANALYSIS

**Why is UI broken?**

1. **FE calls:** `getAssignedRequests()` → `/rescue-team/assigned-requests`
2. **BE Returns:** 404 Not Found (endpoint doesn't exist)
3. **Error Handling:** Silent fail → returns empty array
4. **Result:** `requests` state remains empty → no data to render
5. **Symptom:** Leader dashboard shows no assigned requests

**Why does member page work?**
- Uses different endpoint: `/rescue-team/my-assignment` ✅ This exists
- Different response format, different field names
- Separate transform function: `transformMyCurrentTaskToMission()`

---

## ✅ ACTION ITEMS

### Immediate (Required to fix):
1. [ ] Confirm: Is `/rescue-team/assigned-requests` endpoint actually supposed to exist?
2. [ ] If NO: Replace `getAssignedRequests()` to use `/rescue-team/my-operations`
3. [ ] If NO: Verify field names in `/my-operations` response match FE expectations
4. [ ] Verify: Where do people counts come from for leader dashboard?

### Secondary (Field mapping):
5. [ ] Verify: Does response include `numberOfAffectedPeople` field?
6. [ ] Verify: Does response include `adultCount`, `elderlyCount`, `childrenCount`?
7. [ ] Verify: Does response include `hasSupportRequest`, `lastSupportRequestedAt`?
8. [ ] If missing: Add to BE or create fallback

### Documentation:
9. [ ] Update FE_BE_ENDPOINT_MAPPING.md with correct leader dashboard endpoint
10. [ ] Document field name transformations (camelCase vs PascalCase)

---

## 📝 NEXT STEPS

**User Question:** "bạn xem tất cả các field trong rescue team đã map đúng hết chưa"

**My Response (pending your answers):**
1. Confirm which endpoint leader dashboard should use
2. Verify response schema for that endpoint
3. Check if all required fields are present
4. Fix any field name mismatches
5. Update FE code accordingly
6. Test end-to-end flow

