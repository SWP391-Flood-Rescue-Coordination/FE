# 📚 BE API Documentation Index - April 2026

**All API documentation for Flood Rescue Coordination BE**

---

## 🗂️ File Organization

### 1. 📖 START HERE
**File:** `CHANGELOG_BE_API_UPDATE.md`  
**Purpose:** What changed, summary of updates  
**Read Time:** 5 min  
**For:** Quick overview of new features

---

### 2. ⚡ QUICK REFERENCE
**File:** `QUICK_REFERENCE_BE_API.md`  
**Purpose:** Fast lookup table, curl examples, error codes  
**Read Time:** 10 min  
**For:** Finding specific endpoints quickly

---

### 3. 🔗 COMPLETE FLOW
**File:** `BE_API_RESCUE_TEAM_FLOW_COMPLETE.md`  
**Purpose:** Full flow diagram, all 6 steps, detailed endpoints  
**Read Time:** 20 min  
**For:** Understanding the complete rescue task delegation flow

**Contents:**
- Flow chart (ASCII diagram)
- Step-by-step endpoint breakdown
- Request/Response examples
- Business rules
- Status transitions
- Full flow walkthrough example

---

### 4. 📋 DTO REFERENCE
**File:** `BE_DTO_SCHEMAS_REFERENCE.md`  
**Purpose:** All DTOs, validation rules, C# definitions  
**Read Time:** 15 min  
**For:** Understanding request/response structure

**Contains:**
- AssignRescueDto
- MemberAssignmentDto
- UpdateMissionStatusDto
- ConfirmTaskDto (new)
- TeamOperationDto
- All validation rules
- Frontend integration tips

---

### 5. 🛠️ UTILITY ENDPOINTS
**File:** `BE_ADDITIONAL_ENDPOINTS_REFERENCE.md`  
**Purpose:** Non-core endpoints, permissions matrix, performance notes  
**Read Time:** 10 min  
**For:** Supporting endpoints beyond main flow

**Includes:**
- Get My Operations
- Get Test Members
- Get Teams Status
- Find Nearest Teams
- Authorization matrix
- Database relationships
- Common error scenarios

---

## 🎯 Quick Navigation

### By Role
- **Coordinator?** → See `QUICK_REFERENCE_BE_API.md` Section "1️⃣"
- **Leader?** → See sections "2️⃣ & 3️⃣"
- **Member?** → See sections "4️⃣ & 5️⃣"

### By Task
- **"How do I assign members?"** → `BE_API_RESCUE_TEAM_FLOW_COMPLETE.md` Step 3
- **"What's the Member confirm endpoint?"** → `CHANGELOG_BE_API_UPDATE.md`
- **"Show me curl examples"** → `QUICK_REFERENCE_BE_API.md` "Quick Test Flow"
- **"What are validation rules?"** → `BE_DTO_SCHEMAS_REFERENCE.md`

### By Scenario
- **"I need to build the FE flow"** → Read in order: 1→2→3→4
- **"I need to test an endpoint"** → `QUICK_REFERENCE_BE_API.md`
- **"I need to debug an error"** → `BE_ADDITIONAL_ENDPOINTS_REFERENCE.md` "Error Scenarios"
- **"I need all DTOs"** → `BE_DTO_SCHEMAS_REFERENCE.md`

---

## 📊 File Comparison

| Document | Length | Detail | Best For |
|----------|--------|--------|----------|
| CHANGELOG | ~5 min | Summary | Overview |
| QUICK_REFERENCE | ~10 min | Tables | Quick lookup |
| RESCUE_TEAM_FLOW | ~20 min | Detailed | Full understanding |
| DTO_SCHEMAS | ~15 min | Examples | Implementation |
| ADDITIONAL_ENDPOINTS | ~10 min | Reference | Edge cases |

---

## 🔐 Authorization Matrix

### Who Can Call What?

#### Coordinator
```
✅ POST /api/rescue-operation/assign
✅ GET /api/rescue-operation/requests/{id}/nearest-teams
```

#### Leader
```
✅ PUT /api/rescue-team/requests/{id}/accept
✅ PUT /api/rescue-team/requests/{id}/reject
✅ POST /api/rescue-team/members/assign-task
✅ GET /api/rescue-team/members
✅ GET /api/rescue-team/my-operations
✅ PUT /api/rescue-team/operations/{id}/status
```

#### Member
```
✅ GET /api/rescue-team/my-assignment
✅ PUT /api/rescue-team/my-assignment/confirm ← NEW!
✅ PUT /api/rescue-team/operations/{id}/status
```

#### Admin
```
✅ All endpoints
```

---

## 🆕 What's New (April 7, 2026)

### New Endpoint
```
PUT /api/rescue-team/my-assignment/confirm
```
- Member-only endpoint
- Confirms task completion
- Clears member's RequestId
- Returns member to AVAILABLE status

### Why It's Important
- Enables individual member confirmation
- Improves task tracking
- Supports flexible team completion patterns
- Better member lifecycle management

### Where to Learn
1. Quick version: `CHANGELOG_BE_API_UPDATE.md`
2. Full docs: `BE_API_RESCUE_TEAM_FLOW_COMPLETE.md` Section 5
3. Quick ref: `QUICK_REFERENCE_BE_API.md` Section "5️⃣"

---

## 📋 Complete Endpoint List

### RescueTeamController
1. `PUT /api/rescue-team/operations/{id}/status` - Update mission status
2. `PUT /api/rescue-team/requests/{id}/reject` - Leader reject
3. `PUT /api/rescue-team/requests/{id}/accept` - Leader accept
4. `GET /api/rescue-team/my-operations` - Get team operations
5. `GET /api/rescue-team/operations/{id}` - Get operation details
6. `POST /api/rescue-team/members/assign-task` - Leader assign members
7. `GET /api/rescue-team/my-assignment` - Member view task
8. `PUT /api/rescue-team/my-assignment/confirm` - Member confirm (NEW!)
9. `GET /api/rescue-team/members` - Get team members
10. `GET /api/rescue-team/status` - Get teams with status

### RescueOperationController
1. `POST /api/rescue-operation/assign` - Coordinator assign
2. `GET /api/rescue-operation/team/{id}` - Get operations by team
3. `GET /api/rescue-operation/{id}` - Get operation by ID
4. `PATCH /api/rescue-operation/{id}/status` - Update status (alt)
5. `GET /api/rescue-operation/requests/{id}/nearest-teams` - Find nearest

---

## 🔄 Flow at a Glance

```
1. Coordinator assigns team+vehicles
   POST /api/rescue-operation/assign
   ↓
2. Leader sees notification, accepts
   PUT /api/rescue-team/requests/{id}/accept
   ↓
3. Leader assigns specific members
   POST /api/rescue-team/members/assign-task
   ↓
4. Members see their individual tasks
   GET /api/rescue-team/my-assignment
   ↓
5. Members confirm done (NEW!)
   PUT /api/rescue-team/my-assignment/confirm
   ↓
6. Team marks operation complete
   PUT /api/rescue-team/operations/{id}/status
```

---

## 🚀 Getting Started Checklist

- [ ] Read `CHANGELOG_BE_API_UPDATE.md` (what changed)
- [ ] Read `QUICK_REFERENCE_BE_API.md` (quick lookup)
- [ ] Read `BE_API_RESCUE_TEAM_FLOW_COMPLETE.md` (full understanding)
- [ ] Bookmark `BE_DTO_SCHEMAS_REFERENCE.md` for implementation
- [ ] Keep `QUICK_REFERENCE_BE_API.md` handy for curl testing
- [ ] Test endpoints with Postman or curl
- [ ] Start FE implementation
- [ ] Refer to `BE_ADDITIONAL_ENDPOINTS_REFERENCE.md` for edge cases

---

## 💡 Pro Tips

### Tip 1: Start with Quick Reference
Don't read everything! Start with `QUICK_REFERENCE_BE_API.md`.  
It has tables, curl commands, and error codes.

### Tip 2: Keep Changelog Open
Always check `CHANGELOG_BE_API_UPDATE.md` first to understand what changed.

### Tip 3: Use DTO Schemas for Implementation
When building FE, use `BE_DTO_SCHEMAS_REFERENCE.md` to validate your requests.

### Tip 4: Error Scenarios for Debugging
If something breaks, check `BE_ADDITIONAL_ENDPOINTS_REFERENCE.md` "Error Scenarios".

### Tip 5: Flow Chart for Context
When confused about the overall flow, look at `BE_API_RESCUE_TEAM_FLOW_COMPLETE.md` flow chart.

---

## 🎓 Learning Path (Recommended)

### 5 Minutes
📖 Read: `CHANGELOG_BE_API_UPDATE.md`  
✅ Understand: What changed, why it matters

### 15 Minutes
⚡ Read: `QUICK_REFERENCE_BE_API.md`  
✅ Understand: How to call each endpoint

### 20 Minutes
🔗 Read: `BE_API_RESCUE_TEAM_FLOW_COMPLETE.md`  
✅ Understand: Complete flow, business logic

### 10 Minutes
📋 Read: `BE_DTO_SCHEMAS_REFERENCE.md`  
✅ Ready: To implement in FE

### 5 Minutes
🛠️ Skim: `BE_ADDITIONAL_ENDPOINTS_REFERENCE.md`  
✅ Reference: For edge cases

---

## 🔗 Source Files (BE)

All documentation generated from actual BE source code:

```
d:\SWP_git\BE\API\Controllers\RescueTeamController.cs
d:\SWP_git\BE\API\Controllers\RescueOperationController.cs
d:\SWP_git\BE\API\DTOs\RescueTeamDto.cs
```

✅ **Verified:** Read from source code, not guessed!

---

## 🤝 Contributing

Found an error? Have a question?
1. Check the source files in BE
2. Update the documentation
3. Keep changelog up to date

---

## 📮 Questions?

### "Where's the [endpoint]?"
→ Check `QUICK_REFERENCE_BE_API.md` endpoints table

### "What's the format for [DTO]?"
→ See `BE_DTO_SCHEMAS_REFERENCE.md`

### "How do I handle [error]?"
→ Look in `BE_ADDITIONAL_ENDPOINTS_REFERENCE.md`

### "What changed?"
→ Read `CHANGELOG_BE_API_UPDATE.md`

---

## 📄 Document Metadata

| File | Version | Updated | Status |
|------|---------|---------|--------|
| CHANGELOG_BE_API_UPDATE.md | 1.0 | Apr 7 2026 | ✅ Current |
| QUICK_REFERENCE_BE_API.md | 1.0 | Apr 7 2026 | ✅ Current |
| BE_API_RESCUE_TEAM_FLOW_COMPLETE.md | 1.0 | Apr 7 2026 | ✅ Current |
| BE_DTO_SCHEMAS_REFERENCE.md | 1.0 | Apr 7 2026 | ✅ Current |
| BE_ADDITIONAL_ENDPOINTS_REFERENCE.md | 1.0 | Apr 7 2026 | ✅ Current |

---

## 🎯 TL;DR (Too Long; Didn't Read)

**New Member Confirmation Endpoint:**
```
PUT /api/rescue-team/my-assignment/confirm
- Member only
- No body needed
- Clears their RequestId
- Returns to AVAILABLE immediately
```

**Why?** Better individual tracking instead of rigid team completion.

**Read More?** See `CHANGELOG_BE_API_UPDATE.md`

---

**Generated:** April 7, 2026  
**API Version:** 1.0  
**Status:** ✅ Complete & Ready
