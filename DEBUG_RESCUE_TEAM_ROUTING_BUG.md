# 🐛 DEBUG: Rescue Team Routing Bug

## 📋 Vấn đề
Sau khi đăng nhập, nếu tạo team từ trang `/admin/rescue-teams` **sau đó** set user làm Leader, khi user đó đăng nhập, hệ thống lại điều hướng sai sang `/rescue-team-member` mặc dù DB có `member_role = "Leader"`.

---

## 🔍 Root Cause Analysis

### 1. **Current Logic (❌ BUG)**

#### **File: `src/pages/LoginPage.jsx` (Line 24-33)**
```jsx
if (role === 'RESCUE_TEAM') {
  const userName = String(user?.userName ?? user?.username ?? '').toLowerCase()
  // If username contains "leader", it's a team leader → dashboard
  // Otherwise, it's a team member → member page
  if (!userName.includes('leader')) {
    destination = '/rescue-team-member'
  }
}
```

#### **File: `src/components/RescueTeamDashboard.jsx` (Line 211-214)**
```jsx
if (role === 'RESCUE_TEAM' && !userName.includes('leader')) {
  alert('Bạn là thành viên đội. Vui lòng vào trang Nhiệm vụ Cá nhân.');
  navigate('/rescue-team-member', { replace: true });
  return;
}
```

#### **File: `src/pages/RescueTeamMemberPage.jsx` (Line 166-170)**
```jsx
if (userName.includes('leader')) {
  alert('Trưởng đội vui lòng sử dụng trang Quản lý Đội Cứu Hộ. Thành viên vui lòng vào trang này.')
  navigate('/rescue-team', { replace: true })
  return
}
```

### 2. **Why This Is Broken**

| Scenario | Username | `member_role` (DB) | Current Logic | Expected | ❌ Result |
|----------|----------|-------------------|---|---|---|
| **Config 1**: Tạo user "john_leader" → tạo team | "john_leader" | "Leader" | contains "leader" ✅ | `/rescue-team` | ✅ WORKS |
| **Config 2**: Tạo team → sau set user "john" làm Leader | "john" | "Leader" | NOT contains "leader" ❌ | `/rescue-team` | → `/rescue-team-member` ⚠️ **BUG** |
| **Config 3**: Tạo user "Alice_Leader" → tạo team | "Alice_Leader" | "Leader" | contains "leader" ✅ | `/rescue-team` | ✅ WORKS |

### 3. **Data Flow Tracing**

```
┌─── Login Flow ──────────────────────────────────────┐
│                                                     │
│ POST /api/auth/login                                │
│ ↓                                                   │
│ Response: {                                         │
│   accessToken: "...",                               │
│   user: {                                           │
│     userId: 1,                                      │
│     username: "john",           ← ⚠️ NO member_role │
│     fullName: "John Doe",                           │
│     role: "RESCUE_TEAM",        ← ⚠️ GENERIC       │
│     email: "john@example.com",                      │
│     phone: "0912345678",                            │
│     isActive: true                                  │
│   }                                                 │
│ }                                                   │
│ ↓                                                   │
│ localStorage:                                       │
│   - accessToken = "..."                            │
│   - user = {...}                                    │
│ ↓                                                   │
│ LoginPage.jsx: authService.getUserInfo() lấy user  │
│ ↓                                                   │
│ Check: role === 'RESCUE_TEAM'?                     │
│   YES → Check: username.includes('leader')?        │
│     NO → redirect `/rescue-team-member` ❌         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4. **What Database Actually Has**

```sql
-- Table: rescue_team_members
SELECT userId, memberRole, teamId 
FROM rescue_team_members 
WHERE userId = 1

-- Result:
userId | memberRole | teamId
1      | "Leader"   | 456
```

**Kết luận:** DB đã đúng, nhưng FE không đọc nó!

---

## 🔗 Missing Information in Current Flow

### ❌ API `/api/auth/login` Response
**KHÔNG chứa:**
- `member_role` (chỉ có `role: "RESCUE_TEAM"`)
- Team ID
- Chi tiết team member

**Source of Truth bị mất:** Phải lấy từ bảng `rescue_team_members` nhưng FE không làm

---

## ✅ Proposed Solutions

### **Solution 1: Thêm `member_role` vào JWT/API Response (BEST)**

**Changes needed:**
1. **BE**: Modify `/api/auth/login` to include `member_role` from `rescue_team_members` table
   ```json
   {
     "user": {
       "userId": 1,
       "username": "john",
       "role": "RESCUE_TEAM",
       "memberRole": "Leader",  ← ADD THIS
       // ... other fields
     }
   }
   ```

2. **FE**: Update routing logic
   ```jsx
   if (role === 'RESCUE_TEAM') {
     const memberRole = String(user?.memberRole ?? '').toUpperCase()
     if (memberRole === 'LEADER') {
       destination = '/rescue-team'
     } else {
       destination = '/rescue-team-member'
     }
   }
   ```

**Pros:**
- ✅ Source of truth từ DB
- ✅ Không phụ thuộc username
- ✅ Sạch, rõ ràng
- ✅ Chuẩn production

**Cons:**
- Cần thay đổi BE

---

### **Solution 2: Gọi API Riêng Sau Login (NO BE CHANGE)**

**FE-only fix:** Sau khi login, gọi API lấy member info
```jsx
// LoginPage.jsx
const handleLoginSuccess = (user) => {
  const role = String(user?.role ?? '').toUpperCase()
  let destination = ROLE_ROUTE_MAP[role] || '/'
  
  if (role === 'RESCUE_TEAM') {
    // Gọi API lấy member_role
    try {
      const memberInfo = await rescueTeamService.getMyMemberInfo()
      if (memberInfo?.memberRole === 'LEADER') {
        destination = '/rescue-team'
      } else {
        destination = '/rescue-team-member'
      }
    } catch (err) {
      // Fallback: dùng username
      const userName = String(user?.username ?? '').toLowerCase()
      if (!userName.includes('leader')) {
        destination = '/rescue-team-member'
      }
    }
  }
  
  navigate(destination, { replace: true })
}
```

**API needed:**
```
GET /api/rescue-team/me
Response:
{
  "success": true,
  "data": {
    "memberId": 123,
    "userId": 1,
    "teamId": 456,
    "memberRole": "Leader"|"Member",
    "joinedAt": "...",
    "isBusy": false
  }
}
```

**Pros:**
- ✅ FE-only change
- ✅ Không phải chờ BE update

**Cons:**
- ⚠️ Thêm API call (performance)
- ⚠️ Phải handle khi user không phải rescue team member
- ⚠️ Timing issue: delay redirect

---

### **Solution 3: Query All Members After Login (QUICK WORKAROUND)**

Sau login FE gọi `getTeamMembers()` để lấy list, tìm user hiện tại:

```jsx
const handleLoginSuccess = async (user) => {
  const role = String(user?.role ?? '').toUpperCase()
  let destination = ROLE_ROUTE_MAP[role] || '/'
  
  if (role === 'RESCUE_TEAM') {
    try {
      const members = await rescueTeamService.getTeamMembers()
      const currentMember = members.find(m => m.userId === user.userId)
      
      if (currentMember?.memberRole === 'LEADER') {
        destination = '/rescue-team'
      } else {
        destination = '/rescue-team-member'
      }
    } catch (err) {
      // Fallback to username check
      const userName = String(user?.username ?? '').toLowerCase()
      if (!userName.includes('leader')) {
        destination = '/rescue-team-member'
      }
    }
  }
  
  navigate(destination, { replace: true })
}
```

**Pros:**
- ✅ Dùng existing API
- ✅ Có fallback

**Cons:**
- ⚠️ Lấy cả list (lãng phí)
- ⚠️ Timing issue (async)
- ⚠️ Có thể fail nếu chưa join team

---

## 🎯 Recommended Solution: **Solution 1 + Solution 2 Hybrid**

**Short-term (sửa ngay):**
1. Implement **Solution 2** (FE-only) để fix ngay bug
2. Tạo API `GET /api/rescue-team/me` (nếu chưa có)

**Long-term (BE update):**
1. Thêm `member_role` vào `/api/auth/login` response
2. Remove workaround từ FE

---

## 📍 Files Need to Update

### **FE Changes:**
- [x] `src/pages/LoginPage.jsx` - Logic redirect sau login
- [x] `src/components/RescueTeamDashboard.jsx` - Role validation lúc mount
- [x] `src/pages/RescueTeamMemberPage.jsx` - Role validation lúc mount
- [x] `src/services/rescueTeamService.js` - Thêm method lấy member_role

### **BE Changes (Optional):**
- [ ] `Auth/Login` endpoint - Thêm `memberRole` field
- [ ] Tạo `GET /api/rescue-team/me` endpoint (nếu chưa có)

---

## 🧪 Test Cases

1. **Test 1**: Tạo user "john_leader" → set leader → login → expect `/rescue-team` ✅
2. **Test 2**: Tạo team trước → tạo user "john" → set john làm leader → login → expect `/rescue-team` ✅ (BUG BEFORE)
3. **Test 3**: Tạo user không phải leader → login → expect `/rescue-team-member` ✅
4. **Test 4**: Non-RESCUE_TEAM user login → redirect đúng role
5. **Test 5**: User logout → login lại → redirect đúng

---

## 📊 Impact Analysis

| Component | Impact | Risk | Priority |
|-----------|--------|------|----------|
| LoginPage.jsx | HIGH | Logic criticality | 🔴 P1 |
| RescueTeamDashboard.jsx | MEDIUM | Secondary validation | 🟡 P2 |
| RescueTeamMemberPage.jsx | MEDIUM | Secondary validation | 🟡 P2 |
| rescueTeamService.js | MEDIUM | New API call | 🟡 P2 |

