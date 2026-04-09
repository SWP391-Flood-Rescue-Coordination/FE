import React from 'react'
import { useNavigate } from 'react-router-dom'
import Login from '../components/Login'
import rescueTeamService from '../services/rescueTeamService'

// LoginPage là lớp bọc route /login:
// nhận kết quả từ Login.jsx và điều hướng người dùng sang dashboard đúng role.
const ROLE_ROUTE_MAP = {
  CITIZEN: '/',
  COORDINATOR: '/rescue-coordinator',
  RESCUE_TEAM: '/rescue-team', // DEFAULT - được override nếu là team member
  MANAGER: '/manager',
  ADMIN: '/admin',
}

const LoginPage = () => {
  const navigate = useNavigate()

  // =========================================================================
  // FIX: Redirect logic sau login - phân biệt rescue team leader vs member
  // =========================================================================
  // 
  // BUG MÔ TẢ:
  // Trước đây logic dựa trên username (check "leader" in username)
  // → Fail khi: Tạo team trước → sau đó set user làm leader → user đó login
  //   vì username không chứa "leader" nên bị redirect `/rescue-team-member`
  //
  // ROOT CAUSE:
  // - API POST /api/Auth/login không trả `memberRole` field từ bảng rescue_team_members
  // - FE phải query DB để lấy memberRole thực tế sau login
  //
  // FIX:
  // 1. Sau login, nếu role='RESCUE_TEAM' → gọi rescueTeamService.getTeamMembers()
  // 2. Backend trả list members (mỗi member có userId + memberRole)
  // 3. FE filter: find current user (match by userId)
  // 4. Lấy memberRole từ object: LEADER → /rescue-team, MEMBER → /rescue-team-member
  // 5. Fallback: Nếu API fail → dùng username check (backward compatibility)
  //
  // SOURCE OF TRUTH: Bảng rescue_team_members.MemberRole (Leader|Member)
  //
  // IMPORTANT: getTeamMembers() = GET /api/rescue-team/members
  // Response: 
  // {
  //   "success": true,
  //   "total": N,
  //   "data": [
  //     { "userId": 1030, "memberRole": "Leader", ... },
  //     { "userId": 1031, "memberRole": "Member", ... }
  //   ]
  // }
  // =========================================================================
  const handleLoginSuccess = async (user) => {
    const role = String(user?.role ?? '').toUpperCase()
    let destination = ROLE_ROUTE_MAP[role] || '/'
    
    // =========================================================================
    // RESCUE_TEAM role handling: distinguish between LEADER and MEMBER
    // =========================================================================
    // Strategy: Call GET /api/rescue-team/members to get memberRole from DB
    // This is the source-of-truth for leader vs member distinction
    // Fallback to username pattern if API call fails
    // =========================================================================
    if (role === 'RESCUE_TEAM') {
      try {
        const currentUserId = user?.userId
        
        // Edge case 1: No userId in login response
        if (!currentUserId) {
          console.warn('⚠️ userId not found in login response, using fallback')
          const userName = String(user?.userName ?? user?.username ?? '').toLowerCase()
          destination = !userName.includes('leader') ? '/rescue-team-member' : '/rescue-team'
          navigate(destination, { replace: true })
          return
        }
        
        // NOTE: Don't check teamId - we'll fetch members and find user by userId
        // This works even if backend doesn't return teamId in login response
        
        // KEY FIX: Fetch team members to get memberRole from DB
        console.log('🔍 Fetching team members to determine role...')
        const members = await rescueTeamService.getTeamMembers()
        
        // Edge case 3: No members returned from API
        if (!Array.isArray(members) || members.length === 0) {
          console.warn('⚠️ No team members found, using fallback')
          const userName = String(user?.userName ?? user?.username ?? '').toLowerCase()
          destination = !userName.includes('leader') ? '/rescue-team-member' : '/rescue-team'
          navigate(destination, { replace: true })
          return
        }
        
        // Find current user in members list - with flexible field name matching
        // Try multiple field name variations (id, Id, userId, UserId, etc.)
        const currentMember = members.find(m => {
          const memberId = 
            m?.id || 
            m?.Id || 
            m?.userId || 
            m?.UserId || 
            m?.user_id || 
            m?.User_Id
          
          // Compare as numbers to avoid type mismatch (string "1030" vs number 1030)
          return Number(memberId) === Number(currentUserId)
        })
        
        // Edge case 4: User not found in team members
        if (!currentMember) {
          console.warn('⚠️ Current user not found in team members, using fallback')
          const userName = String(user?.userName ?? user?.username ?? '').toLowerCase()
          destination = !userName.includes('leader') ? '/rescue-team-member' : '/rescue-team'
          navigate(destination, { replace: true })
          return
        }
        
        // Get memberRole with case normalization
        const memberRole = String(currentMember?.memberRole ?? '').toUpperCase().trim()
        
        // Check for LEADER (uppercase after normalization)
        // Database stores as "Leader" or "LEADER", but we normalize to uppercase
        if (memberRole === 'LEADER') {
          destination = '/rescue-team'
          console.log('✅ Leader role confirmed → /rescue-team', { memberRole, normalized: memberRole })
        } else if (memberRole === 'MEMBER') {
          destination = '/rescue-team-member'
          console.log('✅ Member role confirmed → /rescue-team-member', { memberRole, normalized: memberRole })
        } else {
          // Unknown memberRole - log actual value for debugging
          console.warn('⚠️ Unknown memberRole:', {
            raw: currentMember?.memberRole,
            normalized: memberRole,
            allFields: currentMember
          })
          // Default to member for safety
          destination = '/rescue-team-member'
        }
        
      } catch (error) {
        // If API call fails, fall back to username pattern
        console.warn('⚠️ Exception during member role check:', error?.message)
        console.error('Error details:', error)
        
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
