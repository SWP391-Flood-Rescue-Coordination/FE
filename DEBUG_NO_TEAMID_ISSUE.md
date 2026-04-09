# 🔴 DEBUG: User Has No teamId

**Vấn đề:** Console hiển thị `⚠️ User has no teamId, using fallback`

**Nguyên nhân:** Backend login response không có teamId hoặc teamId = null

---

## 🔍 Cách Fix

### Step 1: Kiểm tra Database

```sql
-- Kiểm tra xem user có được assign vào team không
SELECT TOP(10)
  u.user_id,
  u.username,
  u.email,
  rtm.team_id,
  rtm.member_role,
  rtm.joined_at
FROM users u
LEFT JOIN rescue_team_members rtm ON u.user_id = rtm.user_id
WHERE u.username = 'trinhtanthuan22'  -- Hoặc username của bạn
```

**Expected:** teamId phải có giá trị (không null)

### Step 2: Nếu kết quả là NULL

Có 2 khả năng:

**A. User chưa được assign vào team:**
```sql
-- Assign user vào team
INSERT INTO rescue_team_members (user_id, team_id, member_role, joined_at)
VALUES (1030, 5, 'Leader', GETDATE())
-- Hoặc
VALUES (1030, 5, 'Member', GETDATE())
```

**B. Backend không trả về teamId trong login response:**
Hãy check BE code xem POST /api/Auth/login có trả về teamId không

---

## 📋 Luồng Khi User Có teamId

```
Login → handleLoginSuccess
  ↓
Check: role === 'RESCUE_TEAM'? ✅ YES
  ↓
Check: user?.teamId? ✅ HAS teamId
  ↓
Call getTeamMembers()
  ↓
Find user in members list
  ↓
Get memberRole: "Leader" or "Member"
  ↓
Redirect: /rescue-team (Leader) or /rescue-team-member (Member)
```

## 📋 Luồng Khi User KHÔNG Có teamId

```
Login → handleLoginSuccess
  ↓
Check: role === 'RESCUE_TEAM'? ✅ YES
  ↓
Check: user?.teamId? ❌ NO (null/undefined)
  ↓
⚠️ FALLBACK: Use username pattern
  ↓
Check: "leader" in username?
  ├─ YES → /rescue-team
  └─ NO → /rescue-team-member
```

---

## ✅ Giải pháp

**Option 1: Assign user vào team (recommended)**
```sql
UPDATE users SET team_id = 5 WHERE user_id = 1030
-- VÀ/HOẶC
INSERT INTO rescue_team_members (user_id, team_id, member_role, joined_at)
SELECT 1030, 5, 'Leader', GETDATE()
WHERE NOT EXISTS (
  SELECT 1 FROM rescue_team_members WHERE user_id = 1030
)
```

**Option 2: Backend trả về teamId từ rescue_team_members table**
- Cập nhật BE code để lấy teamId từ rescue_team_members
- Thay vì chỉ lấy từ users table

---

## 🧪 Test After Fix

1. Đăng xuất toàn bộ
2. Clear localStorage: `localStorage.clear()`
3. Reload page
4. Login lại
5. Check console: Phải thấy:
   ```
   🔍 Fetching team members to determine role...
   ✅ Leader role confirmed → /rescue-team
   (hoặc)
   ✅ Member role confirmed → /rescue-team-member
   ```
   
   **KHÔNG được thấy:** `⚠️ User has no teamId`

---

## 📊 Tóm tắt

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-----------|----------|
| No teamId | User không assign vào team | Thêm record vào rescue_team_members |
| Still No teamId | BE không trả về teamId | Cập nhật BE POST /api/Auth/login |
| Fallback used | Jumping early escape | Assign teamId trước |
