# 📖 BE API & FE Integration - Complete Documentation Index

**Generated:** April 6, 2026  
**Folder:** `d:\SWP_git\FE`  
**Status:** ✅ Complete

---

## 🎯 Documentation Overview

Toàn bộ API backend và integration guide đã được tổng hợp vào **4 tài liệu chính**:

---

## 📚 Main Documents

### 1️⃣ **BE_API_COMPLETE_DOCUMENTATION.md**
**Purpose:** Tài liệu API backend hoàn chỉnh 📋  
**Contains:**
- ✅ All 11 API Controllers with endpoints
- ✅ Complete request/response schemas for each endpoint
- ✅ HTTP methods, route paths, parameters
- ✅ Authentication & Authorization requirements
- ✅ Error responses & status codes
- ✅ Business rules & validation constraints
- ✅ Database models & field definitions

**Quick Access:**
- Auth endpoints (login, register, refresh, logout, OTP, reset password)
- Rescue Request CRUD operations
- Rescue Team management (admin + team operations)
- Rescue Operation assignment
- User management (admin panel)
- Vehicle management (create, update, filter)
- Relief Item inventory management
- Stock history (import/export)

**Use This When:** You need to understand what data BE accepts/returns

📄 **File:** `BE_API_COMPLETE_DOCUMENTATION.md`

---

### 2️⃣ **FE_BE_API_MAPPING_ISSUES.md**
**Purpose:** Đối chiếu FE gọi API vs BE endpoints + phát hiện vấn đề 🔍  
**Contains:**
- ✅ FE → BE endpoint mapping table
- ✅ **CRITICAL ISSUES** detected:
  - Guest request status endpoint MISSING
  - Path case-sensitivity mismatches
  - Unclear verify endpoint paths
- ✅ Issue severity levels & detailed explanations
- ✅ Suggested fixes for each issue
- ✅ Endpoint audit by controller

**Key Findings:**
| Issue | Severity | Impact |
|-------|----------|--------|
| Guest status endpoint missing | 🔴 HIGH | Guest tracking breaks |
| Path case mismatch | 🟠 MEDIUM | 404 errors |
| No timeout configured | 🟠 MEDIUM | UI freeze risk |
| No error categorization | 🟠 MEDIUM | Poor UX |
| No input validation | 🟠 MEDIUM | Security risk |

**Use This When:** You need to fix API integration issues or verify endpoint compatibility

📄 **File:** `FE_BE_API_MAPPING_ISSUES.md`

---

### 3️⃣ **DATABASE_SCHEMA_AND_MODELS.md**
**Purpose:** Database schema, entity relationships, business rules 🗂️  
**Contains:**
- ✅ Entity-Relationship (ER) diagram
- ✅ Complete 13 database tables with all fields
- ✅ Primary keys, foreign keys, unique constraints
- ✅ Status transition flows (Request → Operation → Vehicle)
- ✅ Data validation rules (phone format, coordinates, counts)
- ✅ Example SQL queries for common operations
- ✅ Priority calculation algorithm
- ✅ Duplicate detection logic
- ✅ Common data issues & solutions

**Key Tables:**
1. User (authentication & roles)
2. RescueRequest (incident reports)
3. RescueOperation (deployment)
4. RescueTeam (organization)
5. Vehicle (resources)
6. ReliefItem (inventory)
7. StockHistory (transactions)
8. + 6 more support tables

**Use This When:** You need to understand data relationships or troubleshoot data issues

📄 **File:** `DATABASE_SCHEMA_AND_MODELS.md`

---

### 4️⃣ **QUICK_REFERENCE_AND_TESTS.md**
**Purpose:** Nhanh chóng lookup & testing checklist ⚡  
**Contains:**
- ✅ Quick API reference (one-liners for each endpoint)
- ✅ Status value reference (Pending, Verified, Assigned, etc.)
- ✅ User roles reference
- ✅ Critical issues summary (with fix priority)
- ✅ Integration testing checklist
- ✅ Swagger verification checklist
- ✅ Required FE fixes (prioritized)
- ✅ Test scenarios for each actor
- ✅ Sign-off checklist before production

**Testing Checklist Covers:**
- Auth flow
- Rescue request CRUD
- Guest operations
- Coordinator workflow
- Admin panel
- Manager inventory
- Vehicle management
- All error scenarios (400, 401, 403, 500)

**Use This When:** You need a quick lookup or testing checklist

📄 **File:** `QUICK_REFERENCE_AND_TESTS.md`

---

## 🚀 How to Use These Documents

### For **Quick Answers**
1. Start with → **QUICK_REFERENCE_AND_TESTS.md**
2. Find your API endpoint in the "Quick API Reference" section
3. Execute request and check response

### For **Detailed API Understanding**
1. Go to → **BE_API_COMPLETE_DOCUMENTATION.md**
2. Search for controller name (e.g., "Auth Controller")
3. Find endpoint details with all fields & examples

### For **Troubleshooting Integration Issues**
1. Check → **FE_BE_API_MAPPING_ISSUES.md**
2. Look for your endpoint in the issue matrix
3. Find recommended fix
4. Implement solution

### For **Understanding Data Model**
1. Review → **DATABASE_SCHEMA_AND_MODELS.md**
2. Look at ER diagram for relationships
3. Check field definitions & constraints
4. Review business rules for status transitions

### For **Testing Before Deployment**
1. Use → **QUICK_REFERENCE_AND_TESTS.md**
2. Run through "Integration Testing Checklist"
3. Verify with Swagger: http://localhost:5188/swagger/index.html
4. Use "Sign-Off Checklist" before going live

---

## 📊 Document Statistics

| Document | Pages | Sections | Endpoints Covered |
|----------|-------|----------|-------------------|
| BE_API_COMPLETE_DOCUMENTATION.md | ~8 | 12 | 50+ |
| FE_BE_API_MAPPING_ISSUES.md | ~5 | 10 | 40+ |
| DATABASE_SCHEMA_AND_MODELS.md | ~6 | 12 | - |
| QUICK_REFERENCE_AND_TESTS.md | ~6 | 15 | 50+ |
| **TOTAL** | **~25** | **49** | **50+** |

---

## 🔑 Key Takeaways

### ✅ What's Working
- ✅ Auth flow (login, register, logout)
- ✅ Rescue request CRUD
- ✅ Team management
- ✅ Vehicle management
- ✅ Inventory management
- ✅ User administration

### ⚠️ What Needs Attention
1. **CRITICAL:** Guest request status endpoint (check with BE)
2. **HIGH:** Add API timeout (15 seconds)
3. **HIGH:** Fix endpoint path case-sensitivity
4. **MEDIUM:** Add error categorization
5. **MEDIUM:** Add input validation & sanitization
6. **MEDIUM:** Add error boundaries

### 📋 Core Concepts
1. **Rescue Request Status Flow:** Pending → Verified → Assigned → Completed
2. **Priority Calculation:** Based on elderly + children counts
3. **Duplicate Detection:** Same phone + address within 15 minutes
4. **Vehicle Codes:** Auto-generated (BOAT-001, HELI-001, etc.)
5. **User Roles:** 5 roles with different permissions

---

## 🧪 Testing Strategy

### Phase 1: Pre-Testing Setup
- [ ] BE running, FE proxy configured
- [ ] Swagger doc accessible
- [ ] Test accounts created

### Phase 2: Unit Testing (Each Document)
- [ ] Auth endpoints ← From Doc #1
- [ ] Check API mappings ← From Doc #2
- [ ] Verify data model ← From Doc #3
- [ ] Run test scenarios ← From Doc #4

### Phase 3: Integration Testing
- [ ] All endpoints working
- [ ] All status flows working
- [ ] All user roles working
- [ ] Error handling working

### Phase 4: Sign-Off
- [ ] All tests passed
- [ ] Performance acceptable
- [ ] Security validated
- [ ] Ready for production

---

## 🔗 Related FE Resources

Trong workspace, các file liên quan:
- `src/services/api.js` - HTTP client config
- `src/services/authService.js` - Auth logic
- `src/services/rescueRequestService.js` - Request management
- `src/services/coordinatorService.js` - Coordinator operations
- `src/services/adminService.js` - Admin panel
- `src/services/managerService.js` - Inventory management

---

## 📞 Quick Glossary

| Term | Meaning |
|------|---------|
| **DTO** | Data Transfer Object (request/response format) |
| **FK** | Foreign Key (references other table) |
| **PK** | Primary Key (unique identifier) |
| **UTC** | Coordinated Universal Time (server timestamp) |
| **Session** | User login state stored in localStorage |
| **Bearer Token** | JWT auth token in request header |
| **Refresh Token** | Token used to get new access token |
| **Status** | Current state of request/operation |
| **Priority** | Urgency level (HIGH/MEDIUM/LOW) |
| **Duplicate** | Duplicate request detected within 15 min |

---

## 🎓 Learning Path

**If you're new to this project, follow this order:**

1. Read: **QUICK_REFERENCE_AND_TESTS.md** (10 min)
   - Get overview of all endpoints

2. Read: **DATABASE_SCHEMA_AND_MODELS.md** (15 min)
   - Understand data relationships

3. Read: **BE_API_COMPLETE_DOCUMENTATION.md** (20 min)
   - Deep dive into each API

4. Read: **FE_BE_API_MAPPING_ISSUES.md** (10 min)
   - Understand integration issues

5. Execute: Test scenarios from **QUICK_REFERENCE_AND_TESTS.md** (30 min)
   - Hands-on verification

**Total Time:** ~85 minutes

---

## 🛑 Important Warnings

### ⚠️ Before Testing
- [ ] Make sure BE is running on http://localhost:5188
- [ ] Make sure FE proxy is configured in vite.config.js
- [ ] Create test user accounts first
- [ ] Read the business rules section

### ⚠️ Before Deployment
- [ ] All critical issues must be fixed
- [ ] All tests must pass
- [ ] Sign-off checklist must be completed
- [ ] Environment variables must be configured
- [ ] CORS must be properly configured

### ⚠️ Security Reminders
- ✅ Never commit tokens or credentials
- ✅ Always validate user input
- ✅ Always sanitize data before display
- ✅ Use HTTPS in production
- ✅ Implement rate limiting in BE

---

## 📝 Document Maintenance

**Last Updated:** April 6, 2026  
**Created By:** Integration Team  
**Status:** Ready for Testing

**To Update These Docs:**
1. Open the specific document
2. Find the relevant section
3. Update information
4. Save to workspace

---

## ❓ FAQ

**Q: Where do I find endpoint details?**  
A: See `BE_API_COMPLETE_DOCUMENTATION.md` for full details.

**Q: How do I know if FE calls are compatible?**  
A: Check `FE_BE_API_MAPPING_ISSUES.md` for compatibility matrix.

**Q: What's the database structure?**  
A: See `DATABASE_SCHEMA_AND_MODELS.md` for ER diagram.

**Q: How do I test before deployment?**  
A: Use checklists in `QUICK_REFERENCE_AND_TESTS.md`.

**Q: What's the priority of fixes needed?**  
A: Priority list in `FE_BE_API_MAPPING_ISSUES.md` and `QUICK_REFERENCE_AND_TESTS.md`.

---

## 🎯 Next Steps

1. **Immediately:**
   - [ ] Open Swagger: http://localhost:5188/swagger/index.html
   - [ ] Verify all endpoints are visible
   - [ ] Run quick API test for login

2. **Within 1 hour:**
   - [ ] Fix critical issues from `FE_BE_API_MAPPING_ISSUES.md`
   - [ ] Add timeout to `src/services/api.js`
   - [ ] Test all critical flows

3. **Before Production:**
   - [ ] Complete all integration tests
   - [ ] Use sign-off checklist
   - [ ] Deploy with confidence ✅

---

**End of Index**

📄 **Related Files in Workspace:**
- `BE_API_COMPLETE_DOCUMENTATION.md`
- `FE_BE_API_MAPPING_ISSUES.md`
- `DATABASE_SCHEMA_AND_MODELS.md`
- `QUICK_REFERENCE_AND_TESTS.md`
- This file: `API_DOCUMENTATION_INDEX.md`

All files are ready for use. Good luck with your integration! 🚀
