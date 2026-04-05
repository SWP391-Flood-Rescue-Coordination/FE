import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  UserGroupIcon,
  UserMinusIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import authService from '../services/authService'
import adminService from '../services/adminService'
import { HOME_ROUTE_BY_ROLE, formatDateTimeVN, normalizeRole, normalizeText } from './adminShared'
import './AdminRescueTeamsPage.css'

const EMPTY_TEAM_DRAFT = {
  teamName: '',
  baseLatitude: '',
  baseLongitude: '',
  leaderUserId: '',
}

const normalizeTeamId = (value) => String(value ?? '').trim()

const formatCoordinates = (latitude, longitude) => {
  const hasLatitude = latitude !== null && latitude !== undefined && latitude !== ''
  const hasLongitude = longitude !== null && longitude !== undefined && longitude !== ''

  if (!hasLatitude && !hasLongitude) {
    return '-'
  }

  if (!hasLatitude || !hasLongitude) {
    return `${hasLatitude ? latitude : '-'}, ${hasLongitude ? longitude : '-'}`
  }

  return `${latitude}, ${longitude}`
}

const getUserDisplayName = (user) => user?.fullName || user?.username || user?.email || `#${user?.userId ?? '-'}`

const getUserLabel = (user) => {
  const parts = [`#${user?.userId ?? '-'}`, getUserDisplayName(user)]

  if (user?.email) {
    parts.push(user.email)
  }

  return parts.join(' · ')
}

const getTeamIdFromResponse = (response) => {
  const candidate =
    response?.Data ??
    response?.data ??
    response?.data?.data ??
    response?.data?.Data ??
    response?.team ??
    response?.Team ??
    response

  return candidate?.teamId ?? candidate?.TeamId ?? candidate?.id ?? candidate?.Id ?? null
}

function AdminRescueTeamsPage() {
  const navigate = useNavigate()
  const [currentUser] = useState(() => authService.getUserInfo())
  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [teamSearchTerm, setTeamSearchTerm] = useState('')
  const [teamDraft, setTeamDraft] = useState(EMPTY_TEAM_DRAFT)
  const [memberDraftUserId, setMemberDraftUserId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isAuthenticated = authService.isAuthenticated()
  const roleKey = normalizeRole(currentUser?.role)
  const hasAdminAccess = isAuthenticated && roleKey === 'ADMIN'
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

  const loadOverview = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setIsLoading(true)
        setErrorMessage('')
      }

      try {
        const [teamResult, userResult] = await Promise.allSettled([
          adminService.getAdminRescueTeams(),
          adminService.getUsers(),
        ])

        if (
          [teamResult, userResult].some(
            (result) => result.status === 'rejected' && result.reason?.response?.status === 401,
          )
        ) {
          authService.logout()
          navigate('/login', { replace: true })
          return
        }

        const teamItems = teamResult.status === 'fulfilled' && Array.isArray(teamResult.value) ? teamResult.value : []
        const userItems = userResult.status === 'fulfilled' && Array.isArray(userResult.value) ? userResult.value : []

        setTeams(teamItems)
        setUsers(userItems)

        setSelectedTeamId((previousValue) => {
          if (teamItems.length === 0) {
            return null
          }

          if (previousValue && teamItems.some((team) => normalizeTeamId(team.teamId) === normalizeTeamId(previousValue))) {
            return previousValue
          }

          return teamItems[0]?.teamId ?? null
        })

        const hasNonAuthError = [teamResult, userResult].some(
          (result) => result.status === 'rejected' && result.reason?.response?.status !== 401,
        )

        if (hasNonAuthError) {
          setErrorMessage('Một phần dữ liệu đội cứu hộ chưa tải được. Vui lòng thử lại sau.')
        }
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
    [handleUnauthorized, navigate],
  )

  const loadTeamDetail = useCallback(
    async (teamId, { silent = false } = {}) => {
      if (!teamId) {
        setSelectedTeam(null)
        return
      }

      if (!silent) {
        setIsDetailLoading(true)
      }

      try {
        const teamDetail = await adminService.getAdminRescueTeamById(teamId)
        setSelectedTeam(teamDetail)
      } catch (error) {
        if (handleUnauthorized(error)) {
          return
        }

        setErrorMessage(adminService.getErrorMessage(error))
      } finally {
        if (!silent) {
          setIsDetailLoading(false)
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

    loadOverview()
  }, [hasAdminAccess, isAuthenticated, loadOverview, navigate])

  useEffect(() => {
    if (!selectedTeamId) {
      setSelectedTeam(null)
      return
    }

    setSelectedTeam(null)

    loadTeamDetail(selectedTeamId)
  }, [loadTeamDetail, selectedTeamId])

  useEffect(() => {
    if (!successMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage('')
    }, 4000)

    return () => window.clearTimeout(timeoutId)
  }, [successMessage])

  const teamMetrics = useMemo(() => {
    const totalMembers = teams.reduce((sum, team) => sum + Number(team?.memberCount ?? 0), 0)
    const activeMembers = teams.reduce((sum, team) => sum + Number(team?.activeMemberCount ?? 0), 0)
    const inactiveMembers = teams.reduce((sum, team) => sum + Number(team?.inactiveMemberCount ?? 0), 0)

    return {
      totalTeams: teams.length,
      totalMembers,
      activeMembers,
      inactiveMembers,
    }
  }, [teams])

  const selectedTeamSummary = useMemo(
    () => teams.find((team) => normalizeTeamId(team.teamId) === normalizeTeamId(selectedTeamId)) || null,
    [selectedTeamId, teams],
  )

  const displayTeam = selectedTeam || selectedTeamSummary

  const selectedTeamMemberIds = useMemo(
    () => new Set((displayTeam?.members || []).map((member) => normalizeTeamId(member.userId)).filter(Boolean)),
    [displayTeam],
  )

  const eligibleLeaderUsers = useMemo(
    () =>
      users.filter((user) => normalizeRole(user.role) === 'CITIZEN' && user.isActive),
    [users],
  )

  const eligibleMemberUsers = useMemo(
    () =>
      users.filter((user) => {
        const role = normalizeRole(user.role)
        return user.isActive && role === 'CITIZEN' && !selectedTeamMemberIds.has(normalizeTeamId(user.userId))
      }),
    [selectedTeamMemberIds, users],
  )

  useEffect(() => {
    if (teamDraft.leaderUserId || eligibleLeaderUsers.length === 0) {
      return
    }

    setTeamDraft((previousValue) => {
      if (previousValue.leaderUserId) {
        return previousValue
      }

      return {
        ...previousValue,
        leaderUserId: String(eligibleLeaderUsers[0].userId),
      }
    })
  }, [eligibleLeaderUsers, teamDraft.leaderUserId])

  useEffect(() => {
    if (!selectedTeamId) {
      setMemberDraftUserId('')
      return
    }

    if (memberDraftUserId || eligibleMemberUsers.length === 0) {
      return
    }

    setMemberDraftUserId(String(eligibleMemberUsers[0].userId))
  }, [eligibleMemberUsers, memberDraftUserId, selectedTeamId])

  const filteredTeams = useMemo(() => {
    const keyword = normalizeText(teamSearchTerm)
    if (!keyword) {
      return teams
    }

    return teams.filter((team) => {
      const haystack = [
        team.teamId,
        team.teamName,
        team.name,
        team.memberCount,
        team.activeMemberCount,
        team.inactiveMemberCount,
        team.baseLatitude,
        team.baseLongitude,
        team.leader?.fullName,
        team.leader?.username,
        team.leader?.email,
      ].join(' ')

      return normalizeText(haystack).includes(keyword)
    })
  }, [teamSearchTerm, teams])

  const handleLogout = () => {
    authService.logout()
    navigate('/login', { replace: true })
  }

  const resetCreateTeamDraft = () => {
    setTeamDraft((previousValue) => ({
      ...EMPTY_TEAM_DRAFT,
      leaderUserId: previousValue.leaderUserId || '',
    }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleOpenCreateTeamModal = () => {
    resetCreateTeamDraft()
    setShowCreateTeamModal(true)
  }

  const handleCloseCreateTeamModal = () => {
    setShowCreateTeamModal(false)
    setTeamDraft(EMPTY_TEAM_DRAFT)
  }

  const refreshAllData = useCallback(
    async (teamId = selectedTeamId) => {
      await loadOverview({ silent: true })

      if (teamId) {
        await loadTeamDetail(teamId, { silent: true })
      }
    },
    [loadOverview, loadTeamDetail, selectedTeamId],
  )

  const handleCreateTeam = async (event) => {
    event.preventDefault()

    const teamName = String(teamDraft.teamName ?? '').trim()
    const baseLatitude = String(teamDraft.baseLatitude ?? '').trim()
    const baseLongitude = String(teamDraft.baseLongitude ?? '').trim()
    const leaderUserId = String(teamDraft.leaderUserId ?? '').trim()

    if (!teamName || !baseLatitude || !baseLongitude || !leaderUserId) {
      setErrorMessage('Vui lòng nhập đầy đủ tên team, tọa độ và leader ban đầu.')
      setSuccessMessage('')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await adminService.createAdminRescueTeam({
        teamName,
        baseLatitude,
        baseLongitude,
        leaderUserId,
      })

      const createdTeamId = getTeamIdFromResponse(result)
      setSuccessMessage(result?.message || `Đã tạo team ${teamName}.`)
      handleCloseCreateTeamModal()

      await loadOverview({ silent: true })

      if (createdTeamId !== null && createdTeamId !== undefined) {
        setSelectedTeamId(createdTeamId)
      }
    } catch (error) {
      if (handleUnauthorized(error)) {
        return
      }

      setErrorMessage(adminService.getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectTeam = (teamId) => {
    setSelectedTeamId(teamId)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleAddMember = async () => {
    if (!selectedTeamId || !memberDraftUserId) {
      return
    }

    const teamLabel = displayTeam?.teamName || `#${selectedTeamId}`
    const userId = memberDraftUserId

    if (!window.confirm(`Thêm thành viên #${userId} vào team ${teamLabel}?`)) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await adminService.addAdminRescueTeamMember(selectedTeamId, userId)
      setSuccessMessage(result?.message || `Đã thêm thành viên #${userId} vào team ${teamLabel}.`)
      await refreshAllData(selectedTeamId)
    } catch (error) {
      if (handleUnauthorized(error)) {
        return
      }

      setErrorMessage(adminService.getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveMember = async (member) => {
    if (!selectedTeamId || !member?.userId || member.isLeader) {
      return
    }

    if (!window.confirm(`Loại thành viên #${member.userId} khỏi team ${displayTeam?.teamName || ''}?`)) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await adminService.removeAdminRescueTeamMember(selectedTeamId, member.userId)
      setSuccessMessage(result?.message || `Đã loại thành viên #${member.userId} khỏi team.`)
      await refreshAllData(selectedTeamId)
    } catch (error) {
      if (handleUnauthorized(error)) {
        return
      }

      setErrorMessage(adminService.getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangeLeader = async (member) => {
    if (!selectedTeamId || !member?.userId || member.isLeader) {
      return
    }

    if (!window.confirm(`Chuyển leader của team ${displayTeam?.teamName || ''} sang thành viên #${member.userId}?`)) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await adminService.updateAdminRescueTeamLeader(selectedTeamId, member.userId)
      setSuccessMessage(result?.message || `Đã chuyển leader sang thành viên #${member.userId}.`)
      await refreshAllData(selectedTeamId)
    } catch (error) {
      if (handleUnauthorized(error)) {
        return
      }

      setErrorMessage(adminService.getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTeam = async () => {
    if (!selectedTeamId || !displayTeam) {
      return
    }

    const teamLabel = displayTeam.teamName || displayTeam.name || `#${selectedTeamId}`
    const memberCount = displayTeam.memberCount ?? selectedTeamMembers.length

    if (
      !window.confirm(
        `Xóa hẳn team ${teamLabel}? Hành động này sẽ xóa luôn ${memberCount} member và không thể hoàn tác.`,
      )
    ) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await adminService.deleteAdminRescueTeam(selectedTeamId)
      setSuccessMessage(result?.message || `Đã xóa team ${teamLabel}.`)
      setSelectedTeam(null)
      setSelectedTeamId(null)
      await loadOverview({ silent: true })
    } catch (error) {
      if (handleUnauthorized(error)) {
        return
      }

      setErrorMessage(adminService.getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
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

  const selectedTeamMembers = displayTeam?.members || []

  return (
    <AdminLayout
      currentUser={currentUser}
      isAuthenticated={isAuthenticated}
      hasAdminAccess={hasAdminAccess}
      fallbackHomeRoute={fallbackHomeRoute}
      onLogout={handleLogout}
      isLoading={isLoading}
      feedback={feedback}
      loadingMessage="Đang tải danh sách đội cứu hộ..."
    >
      <div className="admin-card-stack admin-rescue-teams-shell">
        <section className="admin-workspace-card admin-rescue-team-creator-card">
          <div className="admin-section-header">
            <div>
              <h2>Quản lý đội cứu hộ</h2>
              <p>Tạo team mới, xem chi tiết thành viên và thao tác trực tiếp trên từng đội.</p>
            </div>
            <div className="admin-rescue-team-summary-chips">
              <span className="admin-summary-chip">Tổng team: {teamMetrics.totalTeams}</span>
              <span className="admin-summary-chip">Tổng member: {teamMetrics.totalMembers}</span>
              <span className="admin-summary-chip">Active / Inactive: {teamMetrics.activeMembers} / {teamMetrics.inactiveMembers}</span>
            </div>
          </div>

          <div className="admin-rescue-team-create-toolbar">
            <div className="admin-rescue-team-create-note compact">
              <MapPinIcon className="admin-rescue-team-note-icon" />
              <span>Khi tạo team mới, leader sẽ được chuyển role sang RESCUE_TEAM.</span>
            </div>
            <button type="button" className="admin-primary-button" onClick={handleOpenCreateTeamModal}>
              <PlusIcon className="admin-button-icon" />
              Tạo team mới
            </button>
          </div>
        </section>

        <section className="admin-rescue-teams-layout">
          <article className="admin-workspace-card admin-rescue-team-list-card">
            <div className="admin-section-header compact">
              <div>
                <h2>Danh sách đội cứu hộ</h2>
                <p>Chọn một team để xem leader và toàn bộ thành viên.</p>
              </div>

              <label className="admin-search-box compact" htmlFor="admin-rescue-team-search">
                <MagnifyingGlassIcon className="admin-search-icon" />
                <input
                  id="admin-rescue-team-search"
                  type="text"
                  value={teamSearchTerm}
                  onChange={(event) => setTeamSearchTerm(event.target.value)}
                  placeholder="Tìm theo tên team, leader, tọa độ..."
                />
              </label>
            </div>

            <div className="admin-rescue-team-list">
              {filteredTeams.length === 0 ? (
                <div className="admin-empty-state">Không có team nào khớp bộ lọc hiện tại.</div>
              ) : (
                filteredTeams.map((team) => {
                  const isSelected = normalizeTeamId(team.teamId) === normalizeTeamId(selectedTeamId)

                  return (
                    <button
                      key={team.teamId}
                      type="button"
                      className={`admin-rescue-team-item${isSelected ? ' selected' : ''}`}
                      onClick={() => handleSelectTeam(team.teamId)}
                    >
                      <div className="admin-rescue-team-item-main">
                        <div className="admin-rescue-team-item-title">
                          <UserGroupIcon className="admin-rescue-team-item-icon" />
                          <strong>{team.teamName || team.name || `#${team.teamId}`}</strong>
                        </div>

                        <span className="admin-rescue-team-item-subtitle">
                          Leader: {team.leader?.fullName || team.leader?.username || team.leader?.email || 'Chưa có'}
                        </span>

                        <div className="admin-rescue-team-item-meta">
                          <span>{team.memberCount ?? 0} member</span>
                          <span>Active: {team.activeMemberCount ?? 0}</span>
                          <span>Inactive: {team.inactiveMemberCount ?? 0}</span>
                        </div>

                        <div className="admin-rescue-team-item-coordinates">
                          <MapPinIcon className="admin-rescue-team-item-pin" />
                          <span>{formatCoordinates(team.baseLatitude, team.baseLongitude)}</span>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </article>

          <article className="admin-workspace-card admin-rescue-team-detail-card">
            <div className="admin-section-header compact">
              <div>
                <h2>Chi tiết team</h2>
                <p>Quản lý leader và member của team đang chọn.</p>
              </div>

              <div className="admin-rescue-team-detail-actions">
                <button type="button" className="admin-secondary-button" onClick={() => loadOverview()} disabled={isSubmitting}>
                  <ArrowPathIcon className={`admin-button-icon${isDetailLoading ? ' spinning' : ''}`} />
                  Tải lại
                </button>

                <button
                  type="button"
                  className="admin-secondary-button danger-tone"
                  onClick={handleDeleteTeam}
                  disabled={isSubmitting || !displayTeam}
                >
                  <TrashIcon className="admin-button-icon" />
                  Xóa team
                </button>
              </div>
            </div>

            {isDetailLoading ? (
              <div className="admin-empty-state">Đang tải chi tiết team...</div>
            ) : displayTeam ? (
              <div className="admin-rescue-team-detail-body">
                <div className="admin-rescue-team-detail-hero">
                  <div>
                    <span className="admin-rescue-team-eyebrow">Team đang xem</span>
                    <h3>{displayTeam.teamName || displayTeam.name || `#${displayTeam.teamId}`}</h3>
                    <p>
                      Tọa độ gốc: <strong>{formatCoordinates(displayTeam.baseLatitude, displayTeam.baseLongitude)}</strong>
                    </p>
                  </div>
                  <div className="admin-rescue-team-leader-card">
                    <span>Leader hiện tại</span>
                    <strong>{displayTeam.leader?.fullName || displayTeam.leader?.username || displayTeam.leader?.email || '-'}</strong>
                    <small>{displayTeam.leader?.userId ? `UserId: ${displayTeam.leader.userId}` : 'Chưa có leader'}</small>
                  </div>
                </div>

                <div className="admin-rescue-team-stats-grid">
                  <article>
                    <span>Tổng member</span>
                    <strong>{displayTeam.memberCount ?? selectedTeamMembers.length}</strong>
                  </article>
                  <article>
                    <span>Active</span>
                    <strong>{displayTeam.activeMemberCount ?? selectedTeamMembers.filter((member) => member.isActive).length}</strong>
                  </article>
                  <article>
                    <span>Inactive</span>
                    <strong>{displayTeam.inactiveMemberCount ?? selectedTeamMembers.filter((member) => !member.isActive).length}</strong>
                  </article>
                </div>

                <section className="admin-rescue-team-toolbox">
                  <div className="admin-panel-header">
                    <div>
                      <h3>Thêm thành viên</h3>
                      <p>Chỉ hiển thị user active phù hợp để hạn chế lỗi chọn nhầm.</p>
                    </div>
                    <span className="admin-panel-chip neutral">
                      <UserPlusIcon className="admin-panel-chip-icon" />
                      {eligibleMemberUsers.length} user khả dụng
                    </span>
                  </div>

                  <div className="admin-rescue-team-toolbox-row">
                    <label className="admin-form-field grow">
                      <span>Chọn member</span>
                      <select
                        value={memberDraftUserId}
                        onChange={(event) => setMemberDraftUserId(event.target.value)}
                        disabled={isSubmitting || eligibleMemberUsers.length === 0}
                      >
                        <option value="">Chọn user</option>
                        {eligibleMemberUsers.map((user) => (
                          <option key={user.userId} value={user.userId}>
                            {getUserLabel(user)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button type="button" className="admin-primary-button" onClick={handleAddMember} disabled={isSubmitting || !memberDraftUserId}>
                      <UserPlusIcon className="admin-button-icon" />
                      Thêm member
                    </button>
                  </div>
                </section>

                <section className="admin-rescue-team-members-section">
                  <div className="admin-panel-header">
                    <div>
                      <h3>Danh sách thành viên</h3>
                      <p>Leader không thể rời team. Member khác có thể xóa hoặc chuyển làm leader.</p>
                    </div>
                    <span className="admin-panel-chip neutral">
                      <StarIcon className="admin-panel-chip-icon" />
                      {selectedTeamMembers.length} thành viên
                    </span>
                  </div>

                  <div className="admin-table-wrap admin-rescue-team-member-wrap">
                    <table className="admin-table admin-rescue-team-member-table">
                      <thead>
                        <tr>
                          <th>UserId</th>
                          <th>Tài khoản</th>
                          <th>Họ tên</th>
                          <th>Role</th>
                          <th>Trạng thái</th>
                          <th>RequestId</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTeamMembers.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="admin-table-placeholder">
                              Team này chưa có member nào.
                            </td>
                          </tr>
                        ) : (
                          selectedTeamMembers.map((member) => {
                            const isLeader = Boolean(member.isLeader || normalizeTeamId(member.userId) === normalizeTeamId(displayTeam?.leaderUserId))
                            const statusLabel = member.isActive ? 'Active' : 'Inactive'

                            return (
                              <tr key={member.userId} className={isLeader ? 'leader-row' : ''}>
                                <td>{member.userId ?? '-'}</td>
                                <td>
                                  <div className="admin-main-cell">
                                    <strong>{member.username || '-'}</strong>
                                    {isLeader && <span className="admin-badge role leader">Leader</span>}
                                  </div>
                                </td>
                                <td>{member.fullName || '-'}</td>
                                <td>{adminService.getRoleLabel(member.role)}</td>
                                <td>
                                  <span className={`admin-badge ${member.isActive ? 'active' : 'inactive'}`}>{statusLabel}</span>
                                </td>
                                <td>{member.requestId ?? '-'}</td>
                                <td>
                                  <div className="admin-rescue-team-row-actions">
                                    <button
                                      type="button"
                                      className="admin-secondary-button small"
                                      onClick={() => handleChangeLeader(member)}
                                      disabled={isSubmitting || isLeader || !member.isActive}
                                    >
                                      <StarIcon className="admin-button-icon" />
                                      Đặt leader
                                    </button>

                                    <button
                                      type="button"
                                      className="admin-secondary-button small danger-tone"
                                      onClick={() => handleRemoveMember(member)}
                                      disabled={isSubmitting || isLeader}
                                    >
                                      <UserMinusIcon className="admin-button-icon" />
                                      Loại khỏi team
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="admin-rescue-team-detail-footer">
                  <span>
                    Cập nhật gần nhất: {displayTeam?.updatedAt ? formatDateTimeVN(displayTeam.updatedAt) : '-'}
                  </span>
                  <span>TeamId: {displayTeam?.teamId ?? '-'}</span>
                </div>
              </div>
            ) : (
              <div className="admin-empty-state">Chưa có team nào được chọn.</div>
            )}
          </article>
        </section>
      </div>

      {showCreateTeamModal && (
        <div className="admin-modal-overlay" role="presentation" onClick={handleCloseCreateTeamModal}>
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-create-team-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <span className="admin-modal-eyebrow">Tạo đội cứu hộ</span>
                <h3 id="admin-create-team-modal-title">Điền thông tin team mới</h3>
                <p>Nhập tên team, tọa độ lat/long và leader ban đầu.</p>
              </div>
              <button type="button" className="admin-modal-close-button" onClick={handleCloseCreateTeamModal} aria-label="Đóng">
                ×
              </button>
            </div>

            <form className="admin-rescue-team-modal-form" onSubmit={handleCreateTeam}>
              <div className="admin-rescue-team-modal-grid">
                <label className="admin-form-field">
                  <span>Tên team</span>
                  <input
                    type="text"
                    value={teamDraft.teamName}
                    onChange={(event) => setTeamDraft((previousValue) => ({ ...previousValue, teamName: event.target.value }))}
                    placeholder="Ví dụ: Đội Cứu Hộ Delta"
                    maxLength={120}
                    disabled={isSubmitting}
                  />
                </label>

                <label className="admin-form-field">
                  <span>Vĩ độ (lat)</span>
                  <input
                    type="number"
                    step="any"
                    value={teamDraft.baseLatitude}
                    onChange={(event) => setTeamDraft((previousValue) => ({ ...previousValue, baseLatitude: event.target.value }))}
                    placeholder="Ví dụ: 10.7769"
                    disabled={isSubmitting}
                  />
                </label>

                <label className="admin-form-field">
                  <span>Kinh độ (long)</span>
                  <input
                    type="number"
                    step="any"
                    value={teamDraft.baseLongitude}
                    onChange={(event) => setTeamDraft((previousValue) => ({ ...previousValue, baseLongitude: event.target.value }))}
                    placeholder="Ví dụ: 106.7009"
                    disabled={isSubmitting}
                  />
                </label>

                <label className="admin-form-field">
                  <span>Leader ban đầu</span>
                  <select
                    value={teamDraft.leaderUserId}
                    onChange={(event) => setTeamDraft((previousValue) => ({ ...previousValue, leaderUserId: event.target.value }))}
                    disabled={isSubmitting || eligibleLeaderUsers.length === 0}
                  >
                    <option value="">Chọn leader</option>
                    {eligibleLeaderUsers.map((user) => (
                      <option key={user.userId} value={user.userId}>
                        {getUserLabel(user)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="admin-secondary-button" onClick={handleCloseCreateTeamModal} disabled={isSubmitting}>
                  Hủy
                </button>
                <button type="submit" className="admin-primary-button" disabled={isSubmitting}>
                  <PlusIcon className="admin-button-icon" />
                  Tạo team mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminRescueTeamsPage