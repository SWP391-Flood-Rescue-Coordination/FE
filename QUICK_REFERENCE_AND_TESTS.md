# ⚡ Quick Reference & Implementation Checklist

**Purpose:** Fast lookup for BE API integration and testing  
**Status:** Ready for FE-BE Integration Testing

---

## 🎯 Quick API Reference

### Authentication
```
LOGIN:    POST /api/auth/login { phone, password }
REGISTER: POST /api/auth/register { fullName, phone, email, password }
REFRESH:  POST /api/auth/refresh-token { refreshToken }
LOGOUT:   POST /api/auth/logout
```

### Rescue Requests (Citizen)
```
CREATE:   POST /api/rescue-request { title, description, contactPhone, address, lat, lon, adultCount, elderlyCount, childrenCount }
LIST:     GET /api/rescue-request/my-requests
GET:      GET /api/rescue-request/{id}
UPDATE:   PUT /api/rescue-request/{id} { same payload as create }
CONFIRM:  POST /api/rescue-request/{id}/confirm-rescued
```

### Rescue Requests (Guest)
```
CONFIRM:  POST /api/rescue-request/guest/confirm-rescued { phone }
⚠️ STATUS: GET /api/rescue-request/guest/status - MISSING (need to verify or fix)
```

### Operations (Coordinator)
```
ASSIGN:   POST /api/rescue-operation/assign { requestId, teamId, vehicleIds, estimatedTime }
LIST:     GET /api/rescue-operation/team/{teamId}
```

### Teams (Admin)
```
LIST:     GET /api/admin/rescue-teams
GET:      GET /api/admin/rescue-teams/{teamId}
CREATE:   POST /api/admin/rescue-teams { teamName, baseLatitude, baseLongitude, leaderUserId }
UPDATE:   PUT /api/admin/rescue-teams/{teamId}/leader { newLeaderId }
DELETE:   DELETE /api/admin/rescue-teams/{teamId}
```

### Vehicles (Manager)
```
LIST:     GET /api/vehicle?status=AVAILABLE|INUSE|MAINTENANCE
GET:      GET /api/vehicle/{id}
CREATE:   POST /api/vehicle { vehicleName, vehicleTypeId, licensePlate, capacity, ... }
UPDATE:   PUT /api/vehicle/{id} { same fields as create, all optional }
```

### Users (Admin)
```
LIST:     GET /api/user-info?searchBy=username&keyword=search_term
ROLES:    GET /api/user-info/roles
ROLE:     PUT /api/user-info/{userId}/role { role }
STATUS:   PUT /api/user-info/{userId}/status { isActive }
```

### Relief Items (Manager)
```
LIST:     GET /api/relief-item?searchBy=itemName&keyword=search_term
LOW:      GET /api/relief-item/low-stock?n=6
COUNT:    GET /api/relief-item/low-stock/count?n=6
UPDATE:   PUT /api/relief-item/{id} { itemName, categoryId, unit, minQuantity, isActive }
```

---

## 📋 Status Values Reference

### Request Status
```
"Pending"      - Initial state (guest or citizen just created)
"Verified"     - Coordinator reviewed and approved
"Assigned"     - Coordinator assigned team + vehicles
"Completed"    - Citizen confirmed rescue
"Cancelled"    - Admin or coordinator cancelled
"Duplicate"    - Auto-detected duplicate within 15 min
```

### Operation Status
```
"Assigned"     - Coordinator just assigned
"In Progress"  - Team started work (optional)
"Completed"    - Team finished successfully
"Failed"       - Team unable to complete (requires reason)
```

### Vehicle Status
```
"AVAILABLE"    - Ready for assignment
"INUSE"        - Currently assigned to operation
"MAINTENANCE"  - Under maintenance
```

### User Roles
```
"ADMIN"        - System administrator
"COORDINATOR"  - Assigns teams to requests
"MANAGER"      - Manages vehicles & inventory
"RESCUE_TEAM"  - Executes rescue operations
"CITIZEN"      - Creates rescue requests
```

---

## ⚠️ Critical Issues Found

### Issue #1: Guest Request Status Endpoint (🔴 HIGH)
**Problem:** FE calls `GET /api/RescueRequest/guest/status` but this endpoint may not exist in BE  
**Impact:** Guest tracking may fail  
**Solution:**
- [ ] Verify BE has this endpoint
- [ ] If missing: Add to BE or use alternative (store in localStorage)
- [ ] Update FE service path to match BE

### Issue #2: Endpoint Path Case Mismatch (🟠 MEDIUM)
**Problem:** FE might use `/RescueRequest` (PascalCase) but BE uses `/rescue-request` (kebab-case)  
**Impact:** 404 errors on all rescue request calls  
**Solution:**
- [ ] Verify all paths are consistent across FE services
- [ ] Align with backend naming convention
- [ ] Test with actual Swagger

### Issue #3: API Timeout Not Configured (🟠 MEDIUM)
**Problem:** `api.js` has no timeout, requests can hang indefinitely  
**Impact:** UI freezes, poor UX  
**Solution:**
- [ ] Add timeout: 15000ms (15 seconds)
- [ ] Add retry logic for network failures
- [ ] Handle timeout errors properly

### Issue #4: No Error Categorization (🟠 MEDIUM)
**Problem:** Generic 401 handling only, network/timeout errors not handled  
**Impact:** Silent failures, confusing user experience  
**Solution:**
- [ ] Categorize errors: Network, Timeout, Auth, Validation, Server
- [ ] Show appropriate error messages to user
- [ ] Log errors for debugging

### Issue #5: Missing Input Sanitization (🟠 MEDIUM)
**Problem:** No validation before sending to BE  
**Impact:** Injection attacks, invalid data in DB  
**Solution:**
- [ ] Trim whitespace on text fields
- [ ] Validate phone format before submit
- [ ] Validate coordinates range
- [ ] Sanitize HTML/JS in form inputs

---

## 📊 Integration Testing Checklist

### Pre-Testing Setup
- [ ] BE running on http://localhost:5188
- [ ] FE proxy configured to point to `http://localhost:5188`
- [ ] Check `.env.development` has `VITE_API_BASE_URL=/api`
- [ ] Open Swagger: http://localhost:5188/swagger/index.html
- [ ] Test credentials ready (admin, coordinator, manager, rescue_team, citizen)

### Auth Flow Tests
- [ ] Login with valid credentials → Get tokens
- [ ] Login with invalid credentials → 401 error
- [ ] Register new user → User created
- [ ] Refresh token → New access token issued
- [ ] Logout → Session cleared
- [ ] Access protected route without token → 401

### Rescue Request Flow Tests
- [ ] Guest creates rescue request → RequestId returned
- [ ] Guest confirms rescued → Status changes (verify endpoint exists)
- [ ] Citizen login + create request → Request in my-requests list
- [ ] Citizen update their request → Fields update
- [ ] Request status history accessible → All changes logged
- [ ] Duplicate detection works → Same phone+address within 15min marked duplicate

### Coordinator Flow Tests
- [ ] List unverified requests → Display correctly
- [ ] Verify request → Status to "Verified"
- [ ] Assign team + vehicles → Operation created, status to "Assigned"
- [ ] Check operation status flow → Team can mark Completed/Failed
- [ ] Request priority sorting → High priority first

### Admin Flow Tests
- [ ] List all users → Pagination/search works
- [ ] Change user role → Permission updated
- [ ] Enable/disable user → IsActive updated
- [ ] Create rescue team → Team persisted
- [ ] Add member to team → Member joins
- [ ] Change team leader → Leader updated

### Vehicle Management Tests
- [ ] List vehicles → Filter by status works
- [ ] Create vehicle → VehicleCode auto-generated
- [ ] Update vehicle → Fields update (except VehicleCode)
- [ ] Vehicle status transitions → AVAILABLE → INUSE → AVAILABLE

### Inventory Tests
- [ ] List relief items → Items display correctly
- [ ] Get low-stock items → Threshold working
- [ ] Update relief item → Fields persist

---

## 🔍 Swagger Verification Checklist

Visit: http://localhost:5188/swagger/index.html

### Endpoints to Verify
```
Auth:
  ✓ POST /api/auth/login
  ✓ POST /api/auth/register
  ✓ POST /api/auth/refresh-token
  ✓ POST /api/auth/logout
  ✓ POST /api/auth/send-otp
  ✓ POST /api/auth/reset-password

RescueRequest:
  ✓ POST /api/rescue-request
  ✓ GET /api/rescue-request/{requestId}
  ✓ GET /api/rescue-request/my-requests (CITIZEN role req)
  ✓ GET /api/rescue-request/my-latest-request
  ✓ PUT /api/rescue-request/{requestId}
  ✓ POST /api/rescue-request/{requestId}/confirm-rescued
  ✓ POST /api/rescue-request/guest/confirm-rescued
  ✓ GET /api/rescue-request/guest/status (VERIFY THIS!)
  ✓ GET /api/rescue-request/{requestId}/status-history
  
RescueTeam:
  ✓ PUT /api/rescue-team/operations/{operationId}/status
  ✓ GET /api/rescue-team/operations/team/{teamId}

AdminRescueTeam:
  ✓ GET /api/admin/rescue-teams
  ✓ GET /api/admin/rescue-teams/{teamId}
  ✓ POST /api/admin/rescue-teams
  ✓ POST /api/admin/rescue-teams/{teamId}/members
  ✓ DELETE /api/admin/rescue-teams/{teamId}/members/{userId}
  ✓ PUT /api/admin/rescue-teams/{teamId}/leader
  ✓ DELETE /api/admin/rescue-teams/{teamId}

RescueOperation:
  ✓ POST /api/rescue-operation/assign
  ✓ GET /api/rescue-operation/team/{teamId}

UserInfo:
  ✓ GET /api/user-info
  ✓ GET /api/user-info/roles
  ✓ PUT /api/user-info/{userId}/role
  ✓ PUT /api/user-info/{userId}/status

Vehicle:
  ✓ GET /api/vehicle
  ✓ GET /api/vehicle/{vehicleId}
  ✓ POST /api/vehicle
  ✓ PUT /api/vehicle/{vehicleId}

ReliefItem:
  ✓ GET /api/relief-item
  ✓ GET /api/relief-item/low-stock
  ✓ GET /api/relief-item/low-stock/count
  ✓ PUT /api/relief-item/{itemId}

StockHistory:
  ✓ POST /api/stock-history/import
  ✓ POST /api/stock-history/export
  ✓ GET /api/stock-history
```

---

## 🛠️ Required FE Fixes

### Fix Priority Order

**Priority 1 (Critical - Breaks Functionality)**
1. [ ] Fix guest request status endpoint path
2. [ ] Verify all endpoint paths match BE (case-sensitivity)
3. [ ] Add API timeout configuration (15s)

**Priority 2 (High - Security & Robustness)**
4. [ ] Add request validation before submit
5. [ ] Add error categorization (network, timeout, auth, etc.)
6. [ ] Add input sanitization
7. [ ] Implement error boundaries

**Priority 3 (Medium - Performance & UX)**
8. [ ] Add retry logic for failed requests
9. [ ] Implement API response caching
10. [ ] Add loading states for async operations
11. [ ] Add unit tests for services

**Priority 4 (Low - Polish)**
12. [ ] Add request/response logging (dev mode)
13. [ ] Add network error recovery UI
14. [ ] Optimize bundle size

---

## 📱 Test Scenarios by Actor

### Citizen Flow
```
1. Register → 2. Login → 3. Create Request → 4. View My Requests 
→ 5. Receive Assignment Notification → 6. Confirm Rescued
```

### Guest Flow
```
1. Create Request (no login) → 2. Receive RequestId 
→ 3. Track Request (via phone) → 4. Confirm Rescued (via phone)
```

### Coordinator Flow
```
1. Login → 2. View Pending Requests → 3. Verify Request 
→ 4. Get Available Teams → 5. Get Available Vehicles 
→ 6. Assign Team + Vehicles → 7. Monitor Progress
```

### Manager Flow
```
1. Login → 2. View Vehicles → 3. Create/Update Vehicles 
→ 4. View Inventory → 5. Import Stock → 6. Export Stock 
→ 7. Check Low-Stock Alerts
```

### Admin Flow
```
1. Login → 2. View All Users → 3. Create Rescue Team 
→ 4. Add Members → 5. Change Member Roles → 6. Enable/Disable Users 
→ 7. Audit Request History
```

---

## 🚀 Deployment Considerations

### Environment Variables
```
VITE_API_BASE_URL=/api              # Dev local proxy
VITE_API_TIMEOUT=15000              # 15 seconds
VITE_API_MAX_RETRIES=3              # Retry 3 times
VITE_API_RETRY_DELAY=1000           # 1 second between retries
```

### CORS Configuration
- BE should allow FE origin in CORS headers
- For production: Specify exact FE URL
- For development: Can use proxy to avoid CORS issues

### Build & Optimization
- Tree-shake unused code
- Lazy load service layer modules
- Minify API response handling
- Cache static assets (tokens, user info)

---

## 📚 Reference Files

| Document | Purpose |
|----------|---------|
| `BE_API_COMPLETE_DOCUMENTATION.md` | Full BE API reference |
| `FE_BE_API_MAPPING_ISSUES.md` | Mapping & detected issues |
| `DATABASE_SCHEMA_AND_MODELS.md` | Schema & relationships |
| `QUICK_REFERENCE_ACTION_PLAN.md` | This file - Quick lookup |

---

## ✅ Sign-Off Checklist

Before declaring integration complete:

- [ ] All endpoints tested with Swagger
- [ ] FE makes successful calls to all BE endpoints
- [ ] Error handling works for 400/401/403/500 errors
- [ ] Auth flow works (login, token refresh, logout)
- [ ] All roles can access their respective endpoints
- [ ] No 404 errors from path mismatches
- [ ] Timeout configured and tested
- [ ] Request/response data matches expected format
- [ ] Guest tracking works without login
- [ ] Duplicate detection working
- [ ] Priority calculation correct
- [ ] Status transitions working as documented
- [ ] All validation rules enforced
- [ ] Security rules enforced (auth, permissions)

---

**Document Created:** April 6, 2026  
**Status:** Ready for Integration Testing
