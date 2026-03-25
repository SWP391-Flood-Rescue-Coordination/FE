import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import authService from '../services/authService'
import adminService from '../services/adminService'
import { HOME_ROUTE_BY_ROLE, ROLE_ORDER, formatDateTimeVN, normalizeRole, normalizeText } from './adminShared'

// Page admin user management: tải user + role, cho đổi role và khóa/mở khóa ngay trên bảng.
function AdminUsersPage() {
  const navigate = useNavigate()
  const [currentUser] = useState(() => authService.getUserInfo())
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [draftRoles, setDraftRoles] = useState({})
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState(null)
  const [updatingStatusUserId, setUpdatingStatusUserId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isAuthenticated = authService.isAuthenticated()
  const roleKey = normalizeRole(currentUser?.role)
  const hasAdminAccess = isAuthenticated && roleKey === 'ADMIN'
  const currentUserId = Number(currentUser?.userId)
  const fallbackHomeRoute = HOME_ROUTE_BY_ROLE[roleKey] || '/'

  const handleUnauthorized = useCallback(
    (error) => {
      if (error?.response?.status === 401) {
        authService.logout()
        navigate('/login', { replace: true })
        return true
      }

      return false
    },
    [navigate],
  )

  const loadUsers = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setIsLoading(true)
        setErrorMessage('')
      }

      try {
        // Cần cả danh sách user lẫn role để dropdown role render đúng ngay lần đầu.
        const [userItems, roleItems] = await Promise.all([adminService.getUsers(), adminService.getRoles()])
        const availableRoles =
          roleItems.length > 0
            ? roleItems
            : ROLE_ORDER.map((role) => ({
                value: role,
                label: adminService.getRoleLabel(role),
              }))

        setUsers(userItems)
        setRoles(availableRoles)
        setDraftRoles(
          userItems.reduce((accumulator, user) => {
            accumulator[user.userId] = normalizeRole(user.role)
            return accumulator
          }, {}),
        )
      } catch (error) {
        if (handleUnauthorized(error)) {
          return
        }

        setErrorMessage(adminService.getErrorMessage(error))
      } finally {
        if (!silent) {
          setIsLoading(false)
        }
      }
    },
    [handleUnauthorized],
  )

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    if (!hasAdminAccess) {
      return
    }

    loadUsers()
  }, [hasAdminAccess, isAuthenticated, loadUsers, navigate])

  useEffect(() => {
    if (!successMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage('')
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [successMessage])

  const displayedUsers = useMemo(() => {
    const keyword = normalizeText(userSearchTerm)
    if (!keyword) {
      return users
    }

    return users.filter((user) => {
      const haystack = [
        user.userId,
        user.username,
        user.fullName,
        user.phone,
        user.email,
        user.role,
        adminService.getRoleLabel(user.role),
      ].join(' ')

      return normalizeText(haystack).includes(keyword)
    })
  }, [userSearchTerm, users])

  const handleLogout = () => {
    authService.logout()
    navigate('/login', { replace: true })
  }

  const handleUpdateRole = async (user) => {
    const nextRole = normalizeRole(draftRoles[user.userId] || user.role)
    if (!nextRole || nextRole === normalizeRole(user.role)) {
      return
    }

    const restriction = adminService.getRoleUpdateRestriction(user, currentUserId, nextRole)
    if (restriction) {
      setErrorMessage(restriction)
      setSuccessMessage('')
      return
    }

    setUpdatingRoleUserId(user.userId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await adminService.updateUserRole(user.userId, nextRole)
      setSuccessMessage(result?.message || `Đã cập nhật vai trò cho ${user.username}.`)
      await loadUsers({ silent: true })
    } catch (error) {
      if (handleUnauthorized(error)) {
        return
      }

      setErrorMessage(adminService.getErrorMessage(error))
    } finally {
      setUpdatingRoleUserId(null)
    }
  }

  const handleToggleUserStatus = async (user) => {
    const nextIsActive = !user.isActive
    const confirmMessage = nextIsActive
      ? `Kích hoạt lại tài khoản ${user.username}?`
      : `Vô hiệu hóa tài khoản ${user.username}?`

    if (!window.confirm(confirmMessage)) {
      return
    }

    setUpdatingStatusUserId(user.userId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await adminService.updateUserStatus(user.userId, nextIsActive)
      setSuccessMessage(result?.message || 'Đã cập nhật trạng thái tài khoản.')
      await loadUsers({ silent: true })
    } catch (error) {
      if (handleUnauthorized(error)) {
        return
      }

      setErrorMessage(adminService.getErrorMessage(error))
    } finally {
      setUpdatingStatusUserId(null)
    }
  }

  const feedback = (
    <>
      {errorMessage && (
        <div className="admin-feedback error">
          <ExclamationTriangleIcon className="admin-feedback-icon" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="admin-feedback success">
          <CheckCircleIcon className="admin-feedback-icon" />
          <span>{successMessage}</span>
        </div>
      )}
    </>
  )

  return (
    <AdminLayout
      currentUser={currentUser}
      isAuthenticated={isAuthenticated}
      hasAdminAccess={hasAdminAccess}
      fallbackHomeRoute={fallbackHomeRoute}
      onLogout={handleLogout}
      isLoading={isLoading}
      feedback={feedback}
      loadingMessage="Đang tải danh sách người dùng..."
    >
      <section className="admin-workspace-card">
        <div className="admin-section-header">
          <div>
            <h2>Quản lý người dùng</h2>
            <p>Phân quyền và khóa, mở khóa tài khoản trực tiếp trên danh sách người dùng.</p>
          </div>

          <label className="admin-search-box" htmlFor="admin-user-search">
            <svg className="admin-search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              id="admin-user-search"
              type="text"
              value={userSearchTerm}
              onChange={(event) => setUserSearchTerm(event.target.value)}
              placeholder="Tìm theo mã, tài khoản, họ tên, email, số điện thoại..."
            />
          </label>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table admin-user-table">
            <thead>
              <tr>
                <th>Mã tài khoản</th>
                <th>Tài khoản</th>
                <th>Họ tên</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>Vai trò hiện tại</th>
                <th>Gán vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.length === 0 && (
                <tr>
                  <td colSpan="10" className="admin-table-placeholder">
                    Không có tài khoản phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}

              {displayedUsers.map((user) => {
                const isCurrentAdmin = Number(user.userId) === Number(currentUser?.userId)
                const currentRole = normalizeRole(user.role)
                const selectedRole = normalizeRole(draftRoles[user.userId] || user.role)
                const isRoleUpdating = updatingRoleUserId === user.userId
                const isStatusUpdating = updatingStatusUserId === user.userId
                const roleRestriction = adminService.getRoleUpdateRestriction(user, currentUserId)
                const selectedRoleRestriction = adminService.getRoleUpdateRestriction(user, currentUserId, selectedRole)
                const roleOptions = roles.filter((role) => {
                  const roleValue = normalizeRole(role.value)
                  return roleValue === currentRole || adminService.isAssignableRole(roleValue)
                })
                const isRoleSelectDisabled = Boolean(roleRestriction) || isRoleUpdating || isStatusUpdating
                const isRoleActionDisabled =
                  isRoleUpdating ||
                  isStatusUpdating ||
                  selectedRole === currentRole ||
                  Boolean(selectedRoleRestriction)

                return (
                  <tr key={user.userId}>
                    <td>{user.userId}</td>
                    <td>
                      <div className="admin-main-cell">
                        <strong>{user.username || '-'}</strong>
                        {isCurrentAdmin && <span className="admin-inline-tag">Đang đăng nhập</span>}
                      </div>
                    </td>
                    <td>{user.fullName || '-'}</td>
                    <td>{user.phone || '-'}</td>
                    <td>{user.email || '-'}</td>
                    <td>
                      <span className="admin-badge role">{adminService.getRoleLabel(user.role)}</span>
                    </td>
                    <td>
                      <select
                        value={selectedRole}
                        onChange={(event) =>
                          setDraftRoles((previousValue) => ({
                            ...previousValue,
                            [user.userId]: event.target.value,
                          }))
                        }
                        disabled={isRoleSelectDisabled}
                      >
                        {roleOptions.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      {roleRestriction && <div className="admin-cell-note">{roleRestriction}</div>}
                    </td>
                    <td>
                      <span className={`admin-badge ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>
                    <td>{formatDateTimeVN(user.createdAt)}</td>
                    <td>
                      <div className="admin-action-stack">
                        <button
                          type="button"
                          className="admin-primary-button small"
                          onClick={() => handleUpdateRole(user)}
                          disabled={isRoleActionDisabled}
                          title={selectedRoleRestriction || ''}
                        >
                          {isRoleUpdating ? 'Đang lưu...' : 'Cập nhật vai trò'}
                        </button>
                        <button
                          type="button"
                          className={`admin-secondary-button small ${user.isActive ? 'danger-tone' : ''}`}
                          onClick={() => handleToggleUserStatus(user)}
                          disabled={isStatusUpdating || isRoleUpdating || isCurrentAdmin}
                        >
                          {isStatusUpdating ? 'Đang xử lý...' : user.isActive ? 'Tạm khóa' : 'Kích hoạt'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  )
}

export default AdminUsersPage
