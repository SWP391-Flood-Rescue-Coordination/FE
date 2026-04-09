# 🔧 Debug & Fix: Test Still Failing - Step-by-Step Guide

**Date:** April 10, 2026  
**Status:** Troubleshooting Active Fix  

---

## 🐛 Problem

Current fix using `rescueTeamService.getTeamMembers()` is still failing. Need to debug and identify issue.

---

## 🔍 Step 1: Debug - Check Response Structure

### Add Console Logging to LoginPage.jsx

**File:** `src/pages/LoginPage.jsx` (in handleLoginSuccess)

Add detailed logging to see actual API responses:

```javascript
const handleLoginSuccess = async (user) => {
  const role = String(user?.role ?? '').toUpperCase()
  let destination = ROLE_ROUTE_MAP[role] || '/'
  
  if (role === 'RESCUE_TEAM') {
    try {
      console.log('=== DEBUG START ===')
      console.log('1. User from login:', {
        userId: user?.userId,
        username: user?.username,
        role: user?.role,
        teamId: user?.teamId,
        allFields: user
      })
      
      const currentUserId = user?.userId
      if (!currentUserId) {
        throw new Error('userId not found in login response')
      }
      
      console.log('2. Calling getTeamMembers()...')
      const members = await rescueTeamService.getTeamMembers()
      
      console.log('3. Members response:', {
        isArray: Array.isArray(members),
        count: members?.length ?? 'N/A',
        firstMember: members?.[0],
        allMembers: members
      })
      
      // Find current user in members list
      console.log('4. Searching for userId:', currentUserId)
      const currentMember = members?.find(m => {
        const memberId = m?.id ?? m?.userId ?? m?.UserId
        console.log(`   Checking member: id=${memberId}, memberRole=${m?.memberRole}`)
        return memberId === currentUserId
      })
      
      console.log('5. Found member:', currentMember)
      console.log('6. memberRole:', currentMember?.memberRole)
      console.log('=== DEBUG END ===')
      
      if (currentMember?.memberRole === 'LEADER') {
        destination = '/rescue-team'
        console.log('✅ LEADER detected → /rescue-team')
      } else if (currentMember?.memberRole === 'MEMBER') {
        destination = '/rescue-team-member'
        console.log('✅ MEMBER detected → /rescue-team-member')
      } else {
        console.warn('⚠️ memberRole not found, using fallback')
        // fallback logic...
      }
    } catch (error) {
      console.error('❌ ERROR:', error)
      console.error('Full error:', error)
      // fallback logic...
    }
  }
  
  navigate(destination, { replace: true })
}
```

### Run Test & Check Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Login with test account
4. **Take screenshot of console output**
5. Look for:
   - `userId` value from login
   - Members array structure
   - Field names (userId vs UserId vs id)
   - memberRole values

---

## 📊 Common Issues & Solutions

### Issue 1: userId in Login Response is Different Type

**Symptom:**
```
User from login: { userId: "1030" }  ← STRING
Members: [{ userId: 1030 }]          ← NUMBER
→ "1030" !== 1030 → NO MATCH ❌
```

**Solution:**
```javascript
// Convert to number for comparison
const currentUserId = Number(user?.userId)

// Or convert in find:
const currentMember = members?.find(m => {
  const memberId = Number(m?.id ?? m?.userId ?? m?.UserId)
  return memberId === currentUserId
})
```

---

### Issue 2: Field Names Don't Match

**Symptom:**
```
User: { userId: 1030 }
Members: [{ UserId: 1030 }]  ← Uppercase
→ Can't find field
```

**Solution - Check All Possible Variations:**
```javascript
const currentMember = members?.find(m => {
  // Try all possible field name variations
  const memberId = m?.id || m?.Id || m?.userId || m?.UserId || m?.user_id
  return Number(memberId) === Number(currentUserId)
})
```

---

### Issue 3: memberRole Value Case Mismatch

**Symptom:**
```
API Response: { memberRole: "Leader" }  ← Capitalized
Check: memberRole === 'LEADER'  ← Uppercase
→ "Leader" !== "LEADER" → NO MATCH ❌
```

**Solution:**
```javascript
const normalizedRole = String(currentMember?.memberRole ?? '').toUpperCase()
if (normalizedRole === 'LEADER') {
  destination = '/rescue-team'
}
```

---

### Issue 4: getTeamMembers() Returns Empty Array

**Symptom:**
```
Members: []  ← Empty!
→ Can't find user
```

**Possible Causes:**
- User not added to team yet
- API requires authentication
- User doesn't have any team
- API endpoint permission issue

**Debug:**
```javascript
// Check if user has teamId
console.log('User teamId:', user?.teamId)

// If null/empty, user might not be in a team yet
if (!user?.teamId) {
  console.warn('User not in a team yet')
  // Default to member for safety
  destination = '/rescue-team-member'
}
```

---

## ✅ Complete Fixed LoginPage.jsx

Here's the complete corrected version with all edge cases:

```javascript
import React from 'react'
import { useNavigate } from 'react-router-dom'
import Login from '../components/Login'
import rescueTeamService from '../services/rescueTeamService'

const ROLE_ROUTE_MAP = {
  CITIZEN: '/',
  COORDINATOR: '/rescue-coordinator',
  RESCUE_TEAM: '/rescue-team',
  MANAGER: '/manager',
  ADMIN: '/admin',
}

const LoginPage = () => {
  const navigate = useNavigate()

  const handleLoginSuccess = async (user) => {
    const role = String(user?.role ?? '').toUpperCase()
    let destination = ROLE_ROUTE_MAP[role] || '/'
    
    if (role === 'RESCUE_TEAM') {
      try {
        const currentUserId = user?.userId
        
        // Handle case where user ID is missing or invalid
        if (!currentUserId) {
          console.warn('⚠️ userId not found in login response, using fallback')
          const userName = String(user?.userName ?? user?.username ?? '').toLowerCase()
          destination = !userName.includes('leader') ? '/rescue-team-member' : '/rescue-team'
          navigate(destination, { replace: true })
          return
        }
        
        // Handle case where user not in a team
        if (!user?.teamId) {
          console.warn('⚠️ User has no teamId, using fallback')
          const userName = String(user?.userName ?? user?.username ?? '').toLowerCase()
          destination = !userName.includes('leader') ? '/rescue-team-member' : '/rescue-team'
          navigate(destination, { replace: true })
          return
        }
        
        // Fetch team members to get memberRole
        console.log('🔍 Fetching team members for role check...')
        const members = await rescueTeamService.getTeamMembers()
        
        // Handle empty members list
        if (!Array.isArray(members) || members.length === 0) {
          console.warn('⚠️ No members found, using fallback')
          const userName = String(user?.userName ?? user?.username ?? '').toLowerCase()
          destination = !userName.includes('leader') ? '/rescue-team-member' : '/rescue-team'
          navigate(destination, { replace: true })
          return
        }
        
        // Find current user in members - with flexible field name matching
        const currentMember = members.find(m => {
          const memberId = 
            m?.id || 
            m?.Id || 
            m?.userId || 
            m?.UserId || 
            m?.user_id || 
            m?.User_Id
          
          // Compare as numbers to avoid type mismatch
          return Number(memberId) === Number(currentUserId)
        })
        
        // Handle user not found in members list
        if (!currentMember) {
          console.warn('⚠️ Current user not found in team members, using fallback')
          const userName = String(user?.userName ?? user?.username ?? '').toLowerCase()
          destination = !userName.includes('leader') ? '/rescue-team-member' : '/rescue-team'
          navigate(destination, { replace: true })
          return
        }
        
        // Get memberRole with case normalization
        const memberRole = String(currentMember?.memberRole ?? '').toUpperCase().trim()
        
        if (memberRole === 'LEADER') {
          destination = '/rescue-team'
          console.log('✅ Leader role confirmed → /rescue-team')
        } else if (memberRole === 'MEMBER') {
          destination = '/rescue-team-member'
          console.log('✅ Member role confirmed → /rescue-team-member')
        } else {
          console.warn('⚠️ Unknown memberRole:', currentMember?.memberRole)
          destination = '/rescue-team-member' // Default to member for safety
        }
        
      } catch (error) {
        // If all fails, fall back to username pattern
        console.warn('⚠️ Exception during member role check:', error?.message)
        const userName = String(user?.userName ?? user?.username ?? '').toLowerCase()
        destination = !userName.includes('leader') ? '/rescue-team-member' : '/rescue-team'
      }
    }
    
    navigate(destination, { replace: true })
  }

  return (
    <Login
      onClose={() => navigate('/')}
      onShowForgotPassword={() => navigate('/forgot-password')}
      onShowRegister={() => navigate('/register')}
      onLoginSuccess={handleLoginSuccess}
    />
  )
}

export default LoginPage
```

---

## 🧪 Testing Steps

1. **Add logging code above to LoginPage.jsx**
2. **Open DevTools Console (F12)**
3. **Login with test account (e.g., trinhtanthuan22)**
4. **Check console output - screenshot the DEBUG logs**
5. **Share console output** to identify exact issue

---

## 📋 Checklist for Debugging

- [ ] Run login, check userId type (number vs string)
- [ ] Check if userId appears in members array
- [ ] Verify memberRole field name (memberRole vs MemberRole)
- [ ] Check memberRole value ("Leader" vs "LEADER" vs "leader")
- [ ] Verify user has teamId in login response
- [ ] Check if members array is empty

---

## 💾 If Still Not Working

If after applying the robust version above it still fails, it means one of:

1. **`getTeamMembers()` API is failing silently** → Check network tab
2. **Members array is empty** → User not assigned to team in DB
3. **Field names completely different** → Need to check actual API response

**Next step:** Share the console DEBUG output so I can see exact response structure.

---

**Status:** Apply robust fix above, test, and share console output if still failing.
