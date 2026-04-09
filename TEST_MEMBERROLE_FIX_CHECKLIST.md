# 🧪 Test Checklist: memberRole Fix

**Status:** Ready to Test with Fixed Code ✅

---

## Quick Version

```
1. Open DevTools Console
2. Login as a rescue team LEADER
3. Look for console message: ✅ Leader role confirmed → /rescue-team
4. Should redirect to /rescue-team (NOT /rescue-team-member)
5. Repeat with a MEMBER account
6. Should redirect to /rescue-team-member
```

---

## Detailed Test Steps

### Pre-Test Setup

1. **Check Database First** (SQL Server Management Studio)
   ```sql
   -- Verify memberRole values in database
   SELECT TOP(10) 
     user_id,
     team_id,
     member_role,
     joined_at
   FROM rescue_team_members
   WHERE team_id IS NOT NULL
   ORDER BY user_id DESC
   ```
   
   **Expected Output:** memberRole should be **"Leader"** or **"Member"** (capitalized, not uppercase)
   
   ✅ If it shows "Leader"/"Member" → Database is correct
   ❌ If it shows "LEADER"/"MEMBER" → Database might have different format

---

### Test Case 1: Login as LEADER

**Setup:**
- Find a user with `member_role = "Leader"` from SQL query above
- Have username and password ready

**Test Steps:**

1. **Clear browser cache and localStorage**
   ```javascript
   // In DevTools Console:
   localStorage.clear()
   sessionStorage.clear()
   // Then refresh page
   ```

2. **Open DevTools → Console tab** (F12 or Ctrl+Shift+I)

3. **Navigate to login page**

4. **Login with LEADER account**

5. **Check Console Output** for these messages:
   ```
   🔍 Fetching team members to determine role...
   📦 Team members raw data: [...]
   ✅ Leader role confirmed → /rescue-team
   ```

6. **Verify Redirect**
   - Check URL bar: Should be `http://localhost:3000/rescue-team` ✅
   - NOT `http://localhost:3000/rescue-team-member` ❌
   
7. **Check Page Content**
   - Should see Leader Dashboard (team management features)
   - Should see member list, mission assignments, etc.

---

### Test Case 2: Login as MEMBER

**Setup:**
- Find a user with `member_role = "Member"` from SQL query
- Have username and password ready

**Test Steps:**

1. **Logout current user**
   - Click logout button or manually clear localStorage

2. **Clear cache again**
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   ```

3. **Open DevTools → Console tab**

4. **Login with MEMBER account**

5. **Check Console Output** for:
   ```
   🔍 Fetching team members to determine role...
   📦 Team members raw data: [...]
   ✅ Member role confirmed → /rescue-team-member
   ```

6. **Verify Redirect**
   - Check URL bar: Should be `http://localhost:3000/rescue-team-member` ✅
   - NOT `http://localhost:3000/rescue-team` ❌

7. **Check Page Content**
   - Should see Member Dashboard (task list, assignments)
   - NOT see leader features (member management, etc.)

---

### Test Case 3: Fallback Mechanism

**Purpose:** Verify fallback works if API fails

**Test Steps:**

1. **Add temporary error to network** (simulate API failure)
   - DevTools → Network tab → Check "Offline" to simulate no connection
   - OR modify rescueTeamService to throw error temporarily

2. **Login with any account**

3. **Check Console Output** for fallback message:
   ```
   ⚠️ Error fetching team members: ...
   (falls back to username pattern)
   ```

4. **Redirect should still work** (using username pattern as fallback)

---

## Console Output Guide

### ✅ Correct Output (LEADER)

```javascript
// 1. Initial fetch
🔍 Fetching team members to determine role...

// 2. Raw data from API
📦 Team members raw data: [
  {
    id: 1030,
    userId: 1030,
    memberRole: "Leader",        ← Should exist and have correct value
    name: "John Leader",
    ...
  },
  { ... more members ... }
]

// 3. Success! Found user and determined role
✅ Leader role confirmed → /rescue-team {
  memberRole: "LEADER",           ← Normalized to uppercase
  normalized: "LEADER"
}
```

### ✅ Correct Output (MEMBER)

```javascript
// Same pattern but:
✅ Member role confirmed → /rescue-team-member {
  memberRole: "MEMBER",           ← Normalized to uppercase
  normalized: "MEMBER"
}
```

### ⚠️ Warning Output (Using Fallback)

```javascript
// If API fails or user not found:
⚠️ Fetching team members to determine role...
❌ Error fetching team members: ...

// Falls back to username pattern:
(Username pattern fallback used)
// Check if "leader" or "member" in username
```

### ❌ Debug Output (Something Wrong)

```javascript
// If memberRole field is missing:
📦 Team members raw data: [
  {
    id: 1030,
    userId: 1030,
    // ❌ memberRole field is MISSING!
    name: "John Leader",
    ...
  }
]

⚠️ Unknown memberRole: {
  raw: undefined,                 ← Problem! Should be "Leader"
  normalized: "",
  allFields: { ... }
}
```

---

## Expected Results

| Scenario | Expected Result | Status |
|----------|-----------------|--------|
| Leader login | Redirect to `/rescue-team` | ✅ |
| Member login | Redirect to `/rescue-team-member` | ✅ |
| Console shows memberRole | Should show raw value then normalized | ✅ |
| memberRole field present | Should be in returned member objects | ✅ |
| Case normalization works | "Leader" → "LEADER", "Member" → "MEMBER" | ✅ |
| Fallback if API fails | Still redirects using username pattern | ✅ |

---

## Troubleshooting Guide

### Problem: Still redirecting to wrong page

**Step 1:** Check console for error message
```javascript
❌ Error fetching team members: /api/rescue-team/members returned 404
```

**Possible Causes:**
- Backend endpoint `/rescue-team/members` doesn't exist
- User doesn't have permission to access endpoint
- teamId is null (user not assigned to team)

**Solution:**
- Check backend API is running
- Verify user has team assignment in DB
- Check network tab to see actual API error

### Problem: Console shows memberRole as "undefined"

**Step 1:** Check rescueTeamService response structure
```javascript
// In rescueTeamService.js getTeamMembers()
// Should have:
return {
  userId: memberId,
  memberRole: member.memberRole ?? 'Member',  ✅
  ...
}
```

**Possible Causes:**
- Service method not returning memberRole field
- Field name mismatch (memberRole vs MemberRole vs member_role)
- Backend API returns different structure

**Solution:**
- Verify rescueTeamService.js has been updated
- Check actual API response in Network tab
- Add logging to see what backend returns

### Problem: Redirect happens but to wrong page

**Step 1:** Check console for role value
```javascript
// Should show:
✅ Leader role confirmed → /rescue-team
// or
✅ Member role confirmed → /rescue-team-member
```

**Possible Causes:**
- Case sensitivity issue (comparing "Leader" vs "LEADER")
- memberRole value is different than expected (e.g., "leader" vs "Leader")
- Comparison logic is wrong

**Solution:**
- Check LoginPage.jsx has `.toUpperCase()` normalization
- Verify database actually stores capitalized values
- Add console.log to see exact memberRole value

---

## Files Modified (For Reference)

1. **src/services/rescueTeamService.js**
   - `getTeamMembers()` method
   - Now returns ALL members with memberRole field

2. **src/pages/LoginPage.jsx**
   - `handleLoginSuccess()` async method
   - Now calls getTeamMembers() to determine role from DB
   - Includes comprehensive fallback logic

---

## Success Criteria ✅

- [ ] Leader account login → redirects to `/rescue-team`
- [ ] Member account login → redirects to `/rescue-team-member`
- [ ] Console shows correct role detection messages
- [ ] No errors in DevTools Console
- [ ] memberRole field visible in team members API response
- [ ] Fallback works if API temporarily fails
- [ ] All edge cases handled gracefully

---

## Next Steps After Testing

- [ ] **If tests pass:** Deploy to production 🚀
- [ ] **If tests fail:** Check troubleshooting guide above
- [ ] **After deploy:** Monitor error logs for any issues
- [ ] **Document result:** Update project documentation

---

**Ready to test!** 🎉
