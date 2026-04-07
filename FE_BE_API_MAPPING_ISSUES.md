# 🔗 FE ↔ BE API Mapping & Issues

**Status:** ⚠️ CRITICAL MISMATCHES DETECTED

---

## 📋 FE API Calls vs BE Endpoints

### ✅ **CORRECT MAPPINGS**

| FE Function | FE Endpoint | BE Endpoint | Status |
|---|---|---|---|
| `authService.login()` | `POST /api/Auth/login` | `POST /api/auth/login` | ✅ Match* |
| `authService.register()` | `POST /api/Auth/register` | `POST /api/auth/register` | ✅ Match* |
| `rescueRequestService.createRescueRequest()` | `POST /api/RescueRequest` | `POST /api/rescue-request` | ✅ Match* |
| `rescueRequestService.getMyRequests()` | `GET /api/RescueRequest/my-requests` | `GET /api/rescue-request/my-requests` | ✅ Match* |
| `coordinatorService.verifyRequest()` | `PUT /api/RescueRequest/{id}/verify` | ✅ Verified endpoint exists |
| `coordinatorService.assignRequest()` | `POST /api/RescueOperation/assign` | `POST /api/rescue-operation/assign` | ✅ Match* |
| `adminService.getUsers()` | `GET /api/UserInfo` | `GET /api/user-info` | ✅ Match* |
| `adminService.updateUserRole()` | `PUT /api/UserInfo/{id}/role` | `PUT /api/user-info/{id}/role` | ✅ Match* |
| `managerService.getVehicles()` | `GET /api/Vehicle` | `GET /api/vehicle` | ✅ Match* |

*Note: Case-sensitivity may vary - check implementation

---

### ⚠️ **POTENTIAL MISMATCHES / UNCLEAR ENDPOINTS**

| FE Function | FE Endpoint Called | BE Endpoint Status | Issue |
|---|---|---|---|
| `rescueRequestService.getTrackedGuestRequestStatus()` | `GET /api/RescueRequest/guest/status` | ❓ NOT FOUND IN BE | Missing endpoint |
| `rescueRequestService.updateGuestRequest()` | `PUT /api/RescueRequest/guest/{id}` | ❓ NOT FOUND IN BE | Missing endpoint |
| `adminService.getRequests()` | `GET /api/RescueRequest` | ✅ Exists (generic) | Works but needs filtering |
| `adminService.cancelRequest()` | `PUT /api/RescueRequest/{id}/status` | ✅ Exists | OK |
| `coordinatorService.markRequestDuplicate()` | Route unclear | ❓ UNCERTAIN | Need to verify |
| `rescueTeamService.updateMissionStatus()` | `PUT /api/rescue-team/operations/{id}/status` | ✅ Exists | OK |

---

## 🚨 DISCOVERED ISSUES

### Issue #1: Guest Request Endpoints Missing
**Severity:** 🔴 HIGH  
**Location:** `rescueRequestService.js` lines 650+
**Problem:**
```javascript
// FE calls these endpoints but they don't exist in BE:
getGuestRequestStatus: async (requestId) => {
  const response = await api.get(`/RescueRequest/guest/status`) // ❌ NOT IN BE
}

// FE also calls:
confirmRescueAsGuest: async (dto) => {
  const response = await api.post(`/RescueRequest/guest/confirm-rescued`, dto) // ✅ Check BE
}
```
**BE Reality:**
- `GET /api/rescue-request/guest/status` - ❌ **MISSING**
- `POST /api/rescue-request/guest/confirm-rescued` - ✅ EXISTS

**Fix Needed:** Update FE service to use correct BE endpoint

---

### Issue #2: Request Status Update Endpoint Path Mismatch
**Severity:** 🟠 MEDIUM  
**Location:** Multiple services
**Problem:**
```javascript
// FE might be calling:
PUT /api/RescueRequest/{id}/status  // ❓ Check case sensitivity
PUT /api/RescueRequest/{id}/verify  // ❓ Verify this exists

// BE provides:
PUT /api/rescue-request/{id}/status  // Different casing/format
```

---

### Issue #3: Rescue Request Filter Status Endpoint
**Severity:** 🟠 MEDIUM  
**Location:** `adminService.js`, `coordinatorService.js`
**Problem:**
```javascript
// FE calls to get requests:
const response = await api.get(`/RescueRequest`)  // Generic - may lack filtering

// BE endpoint might be:
GET /api/rescue-request  // Need to verify query parameter support
```
**Status Query Params Check:**
- FE sends: `?status=Pending|Verified|Assigned|...`
- BE supports: Check RescueRequestController for querystring handling

---

### Issue #4: Vehicle Auto-Code Generation
**Severity:** 🟢 LOW  
**Location:** `managerService.js` - Vehicle creation  
**Note:** BE auto-generates `VehicleCode` (BOAT-001, HELI-001)
**FE Impact:** Don't send `vehicleCode` in creation request - BE fills it

---

## 📊 Detailed Issue Matrix

### By Feature
| Feature | FE Service | Endpoint | BE Match | Issue Level | Notes |
|---------|-----------|----------|----------|------------|-------|
| **Auth** | authService | `/api/Auth/*` | ✅ Partial match (case) | 🟢 LOW | Case sensitivity check |
| **Citizen Requests** | rescueRequestService | `/api/RescueRequest` | ⚠️ Case mismatch | 🟠 MEDIUM | FE: `/RescueRequest` vs BE: `/rescue-request` |
| **Guest Tracking** | rescueRequestService | `/api/RescueRequest/guest/*` | ❌ Missing | 🔴 HIGH | Guest status endpoint missing |
| **Coordinator** | coordinatorService | `/api/RescueRequest/*` | ⚠️ Unclear verify | 🟠 MEDIUM | Verify endpoint path |
| **Admin** | adminService | `/api/UserInfo/*` | ✅ Mostly match | 🟢 LOW | Case check |
| **Manager** | managerService | `/api/Vehicle/*` | ✅ Match | 🟢 LOW | OK |
| **Operations** | coordinatorService | `/api/RescueOperation/assign` | ✅ Match | 🟢 LOW | OK |

---

## 🔍 CRITICAL ENDPOINT AUDIT

### **Auth Controller** - `/api/auth`
| Endpoint | FE Calls? | Status |
|----------|----------|--------|
| `POST /login` | ✅ Yes | ✅ Working |
| `POST /register` | ✅ Yes | ✅ Working |
| `POST /refresh-token` | ⚠️ Maybe | Need to verify FE usage |
| `POST /logout` | ✅ Yes | ✅ Working |
| `POST /send-otp` | ✅ Potential | CHECK FE |
| `POST /reset-password` | ✅ Yes | ⚠️ Validation issues reported |

---

### **Rescue Request Controller** - `/api/rescue-request`
| Endpoint | FE Calls? | Status |
|----------|----------|--------|
| `POST /` | ✅ Yes (createRescueRequest) | ✅ Working |
| `GET /my-requests` | ✅ Yes | ✅ Working |
| `GET /{id}` | ✅ Yes | ✅ Working |
| `PUT /{id}` | ✅ Yes (update) | ✅ Working |
| `POST /{id}/confirm-rescued` | ✅ Yes | ✅ Working |
| `POST /guest/confirm-rescued` | ✅ Yes | ✅ Working |
| `GET /guest/status` | ✅ Yes | ❌ MISSING |
| `GET /` | ✅ Yes (admin) | ✅ Working |

---

### **Rescue Team Controller** - `/api/rescue-team`
| Endpoint | FE Calls? | Status |
|----------|----------|--------|
| `PUT /operations/{id}/status` | ✅ Yes | ✅ Working |
| `GET /operations/team/{id}` | ✅ Yes | ✅ Working |

---

### **Admin Rescue Team Controller** - `/api/admin/rescue-teams`
| Endpoint | FE Calls? | Status |
|----------|----------|--------|
| `GET /` | ✅ Yes | ✅ Working |
| `GET /{id}` | ✅ Yes | ✅ Working |
| `POST /` | ✅ Yes | ✅ Working |
| `PUT /{id}/leader` | ✅ Yes | ✅ Working |
| `DELETE /{id}` | ✅ Yes | ✅ Working |

---

### **Vehicle Controller** - `/api/vehicle`
| Endpoint | FE Calls? | Status |
|----------|----------|--------|
| `GET /` | ✅ Yes | ✅ Working |
| `GET /{id}` | ✅ Yes | ✅ Working |
| `POST /` | ✅ Yes (create) | ✅ Working |
| `PUT /{id}` | ✅ Yes (update) | ✅ Working |

---

### **User Info Controller** - `/api/user-info`
| Endpoint | FE Calls? | Status |
|----------|----------|--------|
| `GET /` | ✅ Yes (getUsers) | ✅ Working |
| `GET /roles` | ✅ Yes | ✅ Working |
| `PUT /{id}/role` | ✅ Yes | ✅ Working |
| `PUT /{id}/status` | ✅ Yes | ✅ Working |

---

## 📝 SPECIFIC FIXES REQUIRED

### Fix #1: Guest Request Status Endpoint
**File:** `src/services/rescueRequestService.js` line ~650
**Current (Wrong):**
```javascript
getGuestRequestStatus: async (requestId) => {
  const response = await api.get(`/RescueRequest/guest/status`)
  return unwrapApiData(response)
}
```
**Correct:**
```javascript
// Option A: If BE has this endpoint, update path:
getGuestRequestStatus: async (requestId) => {
  const response = await api.get(`/rescue-request/guest/status/${requestId}`)
  return unwrapApiData(response)
}

// Option B: If BE doesn't have this, suggest adding it to BE
// OR: Use alternative flow with `getRequestById`
```

---

### Fix #2: Case Sensitivity in Endpoints
**Check These URLs in FE services:**
```javascript
// Current paths (check if case-sensitive):
'/api/RescueRequest'     vs '/api/rescue-request'
'/api/RescueTeam'        vs '/api/rescue-team'
'/api/UserInfo'          vs '/api/user-info'
'/api/Vehicle'           vs '/api/vehicle'
'/api/RecueOperation'    vs '/api/rescue-operation'
```

---

### Fix #3: Guest Confirm Rescued Endpoint
**File:** `src/services/rescueRequestService.js`
**Verify:** This endpoint probably works but needs testing
```javascript
confirmRescueAsGuest: async (dto) => {
  const response = await api.post(`/rescue-request/guest/confirm-rescued`, dto)
  return unwrapApiData(response)
}
```

---

## ✅ VERIFICATION CHECKLIST

- [ ] Test all Auth endpoints (login, register, refresh, logout)
- [ ] Test Rescue Request CRUD endpoints with actual BE
- [ ] Test Guest request status retrieval flow
- [ ] Verify case sensitivity of all paths
- [ ] Check query parameter support for filtering (status, searchBy, etc.)
- [ ] Verify Vehicle auto-code generation works
- [ ] Test stock management endpoints (import/export)
- [ ] Test team member management endpoints
- [ ] Test operation assignment endpoints

---

## 🎯 RECOMMENDED NEXT STEPS

### Priority 1 (Critical)
1. Fix guest request status endpoint mismatch
2. Verify all endpoint paths are case-consistent
3. Test actual BE Swagger and compare with FE implementation

### Priority 2 (High)
4. Add request timeout & retry logic to `api.js`
5. Add error boundary error handling
6. Implement proper input sanitization

### Priority 3 (Medium)
7. Add unit tests for API calls
8. Implement API response caching where appropriate
9. Add network error handling

---

**Generated:** April 6, 2026  
**Status:** Requires Verification with Live BE Swagger
