import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import LogoutConfirmModal from '../components/LogoutConfirmModal'
import MapLocationPicker from '../components/MapLocationPicker'
import authService from '../services/authService'
import adminService from '../services/adminService'
import { HOME_ROUTE_BY_ROLE, formatDateTimeVN, normalizeRole } from './adminShared'
import './AdminRescueTeamsPage.css'

const INITIAL_FORM_STATE = {
  teamName: '',
  leaderUserId: '',
  baseLatitude: null,
  baseLongitude: null,
  address: '',
  memberIds: [],
}

const memberRoleWhitelist = new Set([
  'CITIZEN',
  'RESCUE_TEAM_LEADER',
  'RESCUE_TEAM',
  'RESCUE_TEAM_MEMBER',
])

const toNumberOrNull = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const normalizeTeamMember = (member) => ({
  userId: member?.userId ?? member?.UserId ?? member?.id ?? null,
  fullName: member?.fullName ?? member?.FullName ?? member?.name ?? member?.username ?? 'Chưa rõ',
  username: member?.username ?? member?.Username ?? '',
  email: member?.email ?? member?.Email ?? '',
  phone: member?.phone ?? member?.Phone ?? '',
  role: normalizeRole(member?.role ?? member?.Role),
  memberRole: normalizeRole(member?.memberRole ?? member?.MemberRole),
  isActive: member?.isActive ?? member?.IsActive ?? true,
  requestId: member?.requestId ?? member?.RequestId ?? null,
  joinedAt: member?.joinedAt ?? member?.JoinedAt ?? null,
})

const buildFormStateFromTeam = (team) => ({
  teamName: team?.name || '',
  leaderUserId: team?.leaderUserId ? String(team.leaderUserId) : '',
  baseLatitude: team?.baseLatitude ?? null,
  baseLongitude: team?.baseLongitude ?? null,
  address: team?.baseAddress || '',
  memberIds: team?.memberIds ?? [],
})

const normalizeTeam = (team) => {
  const id =
    team?.teamId ??
    team?.team_id ??
    team?.rescueTeamId ??
    team?.rescue_team_id ??
    team?.id ??
    team?.operationId ??
    null

  const leaderUserId =
    team?.leaderUserId ??
    team?.leader_id ??
    team?.leaderId ??
    team?.leader?.userId ??
    team?.leader?.id ??
    null

  const baseLatitude = toNumberOrNull(team?.baseLatitude ?? team?.base_latitude ?? team?.latitude ?? null)
  const baseLongitude = toNumberOrNull(team?.baseLongitude ?? team?.base_longitude ?? team?.longitude ?? null)

  const memberCountRaw =
    team?.totalMembers ??
    team?.TotalMembers ??
    team?.memberCount ??
    team?.member_count ??
    team?.teamMembers?.length ??
    team?.members?.length ??
    0
  const memberCount = Number.isFinite(Number(memberCountRaw)) ? Number(memberCountRaw) : 0

  const leaderName =
    team?.leaderFullName ??
    team?.leader_name ??
    team?.leaderName ??
    team?.leader?.fullName ??
    team?.leader?.name ??
    ''

  const leaderPhone =
    team?.leaderPhone ??
    team?.leader_phone ??
    team?.leader?.phone ??
    team?.leaderPhoneNumber ??
    ''

  const baseAddress =
    team?.baseAddress ??
    team?.address ??
    team?.location ??
    team?.base_address ??
    team?.locationAddress ??
    ''

  const normalizedLeader = team?.leader ? normalizeTeamMember(team.leader) : null
  const rawMembers = Array.isArray(team?.members ?? team?.teamMembers) ? team.members ?? team.teamMembers : []
  const members = rawMembers.map(normalizeTeamMember)

  const memberIdsSource =
    members.length > 0
      ? members.map((member) => member.userId)
      : Array.isArray(team?.memberIds ?? team?.member_ids)
        ? team.memberIds ?? team.member_ids
        : []

  const memberIds = memberIdsSource
    .map((entry) => {
      if (entry && typeof entry === 'object') {
        return entry.userId ?? entry.memberId ?? entry.id ?? entry.teamMemberId ?? null
      }

      return entry
    })
    .map((value) => (value !== null && value !== undefined ? String(value) : null))
    .filter(Boolean)

  const createdAt = team?.createdAt ?? team?.created_at ?? team?.CreatedAt ?? null

  return {
    id,
    name: team?.teamName ?? team?.team_name ?? team?.name ?? `Đội ${id ?? 'chưa rõ'}`,
    leaderUserId,
    leaderName: normalizedLeader?.fullName || leaderName,
    leaderPhone: normalizedLeader?.phone || leaderPhone,
    memberIds,
    memberCount,
    baseLatitude,
    baseLongitude,
    baseAddress,
    createdAt,
    members,
    leader: normalizedLeader,
  }
}

function AdminRescueTeamsPage() {
  const navigate = useNavigate()
  const [currentUser] = useState(() => authService.getUserInfo())
  const [teams, setTeams] = useState([])
  const [memberOptions, setMemberOptions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isFormLoading, setIsFormLoading] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false)
  const [memberSearchTerm, setMemberSearchTerm] = useState('')

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

  const loadUserOptions = useCallback(async () => {
    try {
      const users = await adminService.getUsers()

      const memberList = users
        .filter(
          (user) =>
            (user?.isActive ?? user?.IsActive) !== false &&
            memberRoleWhitelist.has(normalizeRole(user.role ?? user.Role)),
        )
        .map((user) => ({
          value: String(user.userId ?? user.UserId),
          label:
            user.fullName ?? user.FullName
              ? `${user.fullName ?? user.FullName} (${user.username ?? user.Username})`
              : user.username ?? user.Username,
          fullName: user.fullName ?? user.FullName ?? user.username ?? user.Username ?? '-',
          phone: user.phone ?? user.Phone ?? '',
          email: user.email ?? user.Email ?? '',
          username: user.username ?? user.Username ?? '',
          teamId: toNumberOrNull(user.teamId ?? user.TeamId ?? null),
          teamName:
            user.teamName ??
            user.TeamName ??
            user.team?.name ??
            user.team?.teamName ??
            user.team?.team_name ??
            '',
          role: normalizeRole(user.role ?? user.Role),
        }))

      setMemberOptions(memberList)
    } catch (error) {
      if (handleUnauthorized(error)) {
        return
      }

      setErrorMessage(adminService.getErrorMessage(error))
    }
  }, [handleUnauthorized])

  const loadTeams = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setIsLoading(true)
        setErrorMessage('')
      }

      try {
        const data = await adminService.getRescueTeamManagementList()
        const normalized = Array.isArray(data) ? data.map(normalizeTeam) : []
        setTeams(normalized)
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

    loadUserOptions()
    loadTeams()
  }, [hasAdminAccess, isAuthenticated, loadUserOptions, loadTeams, navigate])

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE)
    setFormError('')
    setIsEditMode(false)
    setIsFormLoading(false)
    setSelectedTeam(null)
    setMemberSearchTerm('')
  }

  const openForm = (mode, team = null, { editMode = false, loading = false } = {}) => {
    setFormMode(mode)
    setFormError('')
    setIsEditMode(editMode)
    setIsFormLoading(loading)
    setMemberSearchTerm('')
    setSelectedTeam(team)

    if (team) {
      setFormData(buildFormStateFromTeam(team))
    } else {
      setFormData(INITIAL_FORM_STATE)
    }

    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    resetForm()
  }

  const handleCreateDraft = () => {
    setConfirmAction({
      type: 'create-team',
      title: 'Tạo đội cứu hộ',
      message: 'Biểu mẫu tạo đội cứu hộ sẽ được mở để bạn nhập thông tin đội mới.',
      confirmLabel: 'Tiếp tục',
      cancelLabel: 'Hủy',
    })
  }

  const applySelectedTeam = useCallback((team, { editMode = false } = {}) => {
    const normalizedTeam = normalizeTeam(team)
    setSelectedTeam(normalizedTeam)
    setFormData(buildFormStateFromTeam(normalizedTeam))
    setFormError('')
    setFormMode('edit')
    setIsEditMode(editMode)
    setIsFormLoading(false)
    return normalizedTeam
  }, [])

  const handleRowClick = async (team) => {
    if (!team?.id) {
      return
    }

    openForm('edit', team, { editMode: false, loading: true })

    try {
      const detail = await adminService.getRescueTeamDetail(team.id)
      applySelectedTeam(detail, { editMode: false })
    } catch (error) {
      if (handleUnauthorized(error)) {
        return
      }

      setIsFormOpen(false)
      setSelectedTeam(null)
      setIsFormLoading(false)
      setErrorMessage(adminService.getErrorMessage(error))
    }
  }

  const handleRowKeyDown = (event, team) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleRowClick(team)
    }
  }

  const handleLeaderChange = (event) => {
    const value = event.target.value

    setFormData((prev) => ({
      ...prev,
      leaderUserId: value,
    }))
  }

  const handleLocationChange = ({ latitude, longitude, address }) => {
    setFormData((prev) => ({
      ...prev,
      baseLatitude: latitude,
      baseLongitude: longitude,
      address,
    }))
  }

  const handleMemberToggle = (memberId) => {
    setFormData((prev) => {
      const normalizedId = String(memberId)
      const isSelected = prev.memberIds.includes(normalizedId)
      const memberIds = isSelected
        ? prev.memberIds.filter((id) => id !== normalizedId)
        : [...prev.memberIds, normalizedId]

      const nextLeaderUserId =
        isSelected && prev.leaderUserId === normalizedId ? '' : prev.leaderUserId

      return {
        ...prev,
        memberIds,
        leaderUserId: nextLeaderUserId,
      }
    })
  }

  const leaderOptions = useMemo(() => {
    const selected = memberOptions.filter((option) => formData.memberIds.includes(option.value))
    if (
      formData.leaderUserId &&
      !selected.some((option) => option.value === formData.leaderUserId)
    ) {
      const extra = memberOptions.find((option) => option.value === formData.leaderUserId)
      if (extra) {
        selected.push(extra)
      }
    }

    return selected
  }, [memberOptions, formData.leaderUserId, formData.memberIds])

  const filteredMemberOptions = useMemo(() => {
    const normalizedSearch = String(memberSearchTerm ?? '')
      .replace(/\D/g, '')
      .trim()

    if (!normalizedSearch) {
      return memberOptions
    }

    return memberOptions.filter((option) => String(option.phone ?? '').replace(/\D/g, '').includes(normalizedSearch))
  }, [memberOptions, memberSearchTerm])

  const detailMembers = useMemo(() => {
    return Array.isArray(selectedTeam?.members) ? selectedTeam.members : []
  }, [selectedTeam])

  const closeConfirmModal = () => {
    if (isConfirmSubmitting) {
      return
    }

    setConfirmAction(null)
  }

  const handleBackdropClick = (event) => {
    if (event.target !== event.currentTarget || isSubmitting || isFormLoading) {
      return
    }

    closeForm()
  }

  const handleDeleteTeamClick = (event, team) => {
    event.stopPropagation()

    setConfirmAction({
      type: 'delete-team',
      teamId: team.id,
      title: 'Xóa đội cứu hộ',
      message: `Bạn có chắc muốn xóa đội "${team.name}" không? Chỉ xóa được khi đội chưa liên kết rescue request hoặc rescue operation.`,
      confirmLabel: 'Xóa đội',
      cancelLabel: 'Hủy',
    })
  }

  const handleRemoveMemberClick = (member) => {
    if (!selectedTeam?.id) {
      return
    }

    setConfirmAction({
      type: 'remove-member',
      teamId: selectedTeam.id,
      userId: member.userId,
      title: 'Xóa thành viên khỏi đội',
      message: `Bạn có chắc muốn loại "${member.fullName}" ra khỏi đội không?`,
      confirmLabel: 'Xóa thành viên',
      cancelLabel: 'Hủy',
    })
  }

  const handleConfirmAction = async () => {
    if (!confirmAction) {
      return
    }

    if (confirmAction.type === 'create-team') {
      setConfirmAction(null)
      openForm('create', null, { editMode: true })
      return
    }

    setIsConfirmSubmitting(true)

    try {
      if (confirmAction.type === 'delete-team') {
        const response = await adminService.deleteRescueTeam(confirmAction.teamId)

        setSuccessMessage(response?.message || response?.Message || 'Đã xóa đội cứu hộ.')
        setErrorMessage('')
        setFormError('')
        if (selectedTeam?.id === confirmAction.teamId) {
          closeForm()
        }

        await Promise.all([loadTeams({ silent: true }), loadUserOptions()])
      }

      if (confirmAction.type === 'remove-member') {
        const response = await adminService.removeRescueTeamMember(
          confirmAction.teamId,
          confirmAction.userId,
        )
        const updatedTeam = response?.data ?? response?.Data

        if (updatedTeam) {
          applySelectedTeam(updatedTeam, { editMode: false })
        }

        setSuccessMessage(response?.message || response?.Message || 'Đã xóa thành viên khỏi đội.')
        setErrorMessage('')
        setFormError('')
        await Promise.all([loadTeams({ silent: true }), loadUserOptions()])
      }

      setConfirmAction(null)
    } catch (error) {
      if (handleUnauthorized(error)) {
        return
      }

      const nextMessage = adminService.getErrorMessage(error)
      if (confirmAction.type === 'remove-member') {
        setFormError(nextMessage)
      } else {
        setErrorMessage(nextMessage)
      }
    } finally {
      setIsConfirmSubmitting(false)
    }
  }

  const handleStartEditing = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setFormError('')
    window.setTimeout(() => {
      setIsEditMode(true)
    }, 0)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    const shouldCreate = formMode === 'create'

    if (!formData.teamName.trim()) {
      setFormError('Vui lòng nhập tên đội cứu hộ.')
      return
    }

    if (!formData.leaderUserId) {
      setFormError('Phải chọn một Trưởng đội.')
      return
    }

    if (formData.baseLatitude === null || formData.baseLongitude === null) {
      setFormError('Chọn vị trí trụ sở đội trên bản đồ.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        teamName: formData.teamName.trim(),
        leaderUserId: Number(formData.leaderUserId),
        address: formData.address?.trim() || undefined,
        baseLatitude: formData.baseLatitude,
        baseLongitude: formData.baseLongitude,
        memberUserIds: formData.memberIds.map((id) => Number(id)),
      }

      const response =
        shouldCreate
          ? await adminService.createRescueTeam(payload)
          : await adminService.updateRescueTeam(selectedTeam?.id, payload)

      setErrorMessage('')
      setSuccessMessage(
        response?.message ||
          (shouldCreate ? 'Đã tạo đội cứu hộ mới.' : 'Thông tin đội cứu hộ đã được cập nhật.'),
      )

      await Promise.all([loadTeams({ silent: true }), loadUserOptions()])
      closeForm()
    } catch (error) {
      if (handleUnauthorized(error)) {
        return
      }

      setFormError(adminService.getErrorMessage(error))
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

  const sortedTeams = useMemo(() => {
    return [...teams].sort((firstTeam, secondTeam) => {
      const firstDate = new Date(firstTeam.createdAt ?? 0).getTime()
      const secondDate = new Date(secondTeam.createdAt ?? 0).getTime()
      return secondDate - firstDate
    })
  }, [teams])

  const handleLogout = () => {
    authService.logout()
    navigate('/login', { replace: true })
  }

  const modalTitle = formMode === 'create'
    ? 'Tạo đội cứu hộ'
    : isEditMode
    ? selectedTeam?.name
      ? `Chỉnh sửa ${selectedTeam.name}`
      : 'Chỉnh sửa đội cứu hộ'
    : selectedTeam?.name
      ? `Chi tiết ${selectedTeam.name}`
      : 'Chi tiết đội cứu hộ'
  const submitButtonLabel = formMode === 'create' ? 'Tạo đội' : 'Lưu thay đổi'
  const locationDisplayText =
    Number.isFinite(Number(formData.baseLatitude)) && Number.isFinite(Number(formData.baseLongitude))
      ? `${Number(formData.baseLatitude).toFixed(6)}, ${Number(formData.baseLongitude).toFixed(6)}`
      : 'Chưa chọn vị trí'
  const detailLeaderName =
    memberOptions.find((option) => option.value === formData.leaderUserId)?.fullName ||
    selectedTeam?.leaderName ||
    '-'
  const previewLeaderOptions = leaderOptions.length
    ? leaderOptions
    : detailLeaderName !== '-'
      ? [
          {
            value: formData.leaderUserId || '__leader_preview__',
            label: detailLeaderName,
          },
        ]
      : []
  const previewLeaderValue = formData.leaderUserId || previewLeaderOptions[0]?.value || ''

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
      <section className="admin-workspace-card admin-rescue-section">
        <div className="admin-section-header">
          <div>
            <h2>Quản lý đội cứu hộ</h2>
          </div>
          <button type="button" className="admin-primary-button" onClick={handleCreateDraft}>
            Tạo đội cứu hộ
          </button>
        </div>

        <div className="admin-rescue-table-wrap">
          <table className="admin-table admin-rescue-team-table">
            <thead>
              <tr>
                <th>Đội cứu hộ</th>
                <th>Trưởng đội</th>
                <th>Thành viên</th>
                <th>Vị trí</th>
                <th>Địa chỉ</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.length === 0 && (
                <tr>
                  <td colSpan="7" className="admin-table-placeholder">
                    Chưa có đội cứu hộ nào được khai báo.
                  </td>
                </tr>
              )}

              {sortedTeams.map((team, index) => {
                const lat = Number(team.baseLatitude)
                const lng = Number(team.baseLongitude)
                const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng)

                return (
                  <tr
                    key={team.id ?? `${team.name}-${index}`}
                    className="clickable-row"
                    onClick={() => handleRowClick(team)}
                    onKeyDown={(event) => handleRowKeyDown(event, team)}
                    role="button"
                    tabIndex={0}
                  >
                    <td>
                      <strong>{team.name}</strong>
                    </td>
                    <td>
                      <div className="admin-rescue-leader">
                        <span>{team.leaderName || '-'}</span>
                      </div>
                    </td>
                    <td>{team.memberCount ?? '-'}</td>
                    <td>
                      {hasCoordinates ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : '-'}
                    </td>
                    <td>{team.baseAddress || '-'}</td>
                    <td>{formatDateTimeVN(team.createdAt)}</td>
                    <td className="admin-rescue-row-actions">
                      <button
                        type="button"
                        className="admin-table-danger-button"
                        onClick={(event) => handleDeleteTeamClick(event, team)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isFormOpen && (
        <div className="admin-modal-backdrop" onClick={handleBackdropClick}>
          <div className="admin-modal admin-modal-wide" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h3>{modalTitle}</h3>
              </div>
            </div>

            {formError && (
              <div className="admin-feedback error">
                <ExclamationTriangleIcon className="admin-feedback-icon" />
                <span>{formError}</span>
              </div>
            )}

            {isFormLoading ? (
              <div className="admin-team-detail-loading">Đang tải chi tiết đội cứu hộ...</div>
            ) : (
              <form className="admin-rescue-form" onSubmit={handleSubmit}>
                <div className="admin-rescue-form-layout">
                  <div className="admin-rescue-form-column">
                    <div className="admin-form-block">
                      <div className="admin-rescue-form-grid">
                        <label>
                          <span className="admin-form-section-title">Tên đội cứu hộ</span>
                          <input
                            type="text"
                            value={formData.teamName}
                            onChange={(event) => setFormData((prev) => ({ ...prev, teamName: event.target.value }))}
                            placeholder="VD. Đội cứu hộ Quận 1"
                            readOnly={!isEditMode}
                            required
                          />
                        </label>
                      </div>
                    </div>

                    <div className="admin-form-block">
                      <div className="admin-form-section-header">
                        <span className="admin-form-section-title">Chọn vị trí đội cứu hộ</span>
                        <div className="admin-location-summary-wrap">
                          <MapPinIcon className="admin-section-heading-icon" />
                          <span className="admin-location-summary">{locationDisplayText}</span>
                        </div>
                      </div>
                      <div className="admin-rescue-form-map">
                        <MapLocationPicker
                          latitude={formData.baseLatitude}
                          longitude={formData.baseLongitude}
                          address={formData.address}
                          onLocationChange={handleLocationChange}
                          disabled={!isEditMode}
                          showCoordinates={false}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="admin-rescue-form-column">
                    <div className="admin-form-block">
                      <div className="admin-form-section-header">
                        <span className="admin-form-section-title">Thành viên đội cứu hộ</span>
                        {isEditMode ? (
                          <input
                            type="text"
                            value={memberSearchTerm}
                            onChange={(event) => setMemberSearchTerm(event.target.value)}
                            className="admin-member-search-input"
                            placeholder="Tìm theo số điện thoại"
                          />
                        ) : null}
                      </div>

                      {isEditMode ? (
                        <div className="admin-member-table-card">
                          <div className="admin-member-table-scroll">
                            <table className="admin-member-table">
                              <colgroup>
                                <col className="admin-member-col-select" />
                                <col className="admin-member-col-name" />
                                <col className="admin-member-col-phone" />
                                <col className="admin-member-col-team" />
                              </colgroup>
                              <thead>
                                <tr>
                                  <th aria-label="Chọn thành viên" />
                                  <th>Họ và tên</th>
                                  <th>Số điện thoại</th>
                                  <th>Đội hiện tại</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredMemberOptions.length === 0 ? (
                                  <tr>
                                    <td colSpan="4" className="admin-member-table-placeholder">
                                      Không tìm thấy thành viên phù hợp.
                                    </td>
                                  </tr>
                                ) : (
                                  filteredMemberOptions.map((option) => {
                                    const isSelected = formData.memberIds.includes(option.value)
                                    const displayName = option.fullName || option.label || 'Chưa rõ'
                                    const hasAssignedTeam = Boolean(option.teamId) || Boolean(option.teamName)
                                    const teamLabel = option.teamName || 'Chưa có đội'

                                    return (
                                      <tr key={option.value}>
                                        <td className="admin-member-table-checkbox">
                                          {hasAssignedTeam ? (
                                            <span className="admin-member-checkbox-placeholder">-</span>
                                          ) : (
                                            <input
                                              type="checkbox"
                                              value={option.value}
                                              checked={isSelected}
                                              onChange={() => handleMemberToggle(option.value)}
                                            />
                                          )}
                                        </td>
                                        <td>
                                          <div className="admin-member-name">
                                            <strong>{displayName}</strong>
                                          </div>
                                        </td>
                                        <td>{option.phone || '-'}</td>
                                        <td>{teamLabel}</td>
                                      </tr>
                                    )
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="admin-member-table-card">
                          <div className="admin-member-table-scroll">
                            <table className="admin-member-table admin-member-table-preview">
                              <colgroup>
                                <col className="admin-member-col-name" />
                                <col className="admin-member-col-phone" />
                                <col className="admin-member-col-role" />
                                <col className="admin-member-col-action" />
                              </colgroup>
                              <thead>
                                <tr>
                                  <th>Họ và tên</th>
                                  <th>Số điện thoại</th>
                                  <th>Vai trò</th>
                                  <th>Thao tác</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailMembers.length === 0 ? (
                                  <tr>
                                    <td colSpan="4" className="admin-member-table-placeholder">
                                      Chưa có thành viên trong đội cứu hộ.
                                    </td>
                                  </tr>
                                ) : (
                                  detailMembers.map((member) => {
                                    const isLeader = member.memberRole === 'LEADER'

                                    return (
                                      <tr key={member.userId}>
                                        <td>
                                          <div className="admin-member-name">
                                            <strong>{member.fullName || member.username || 'Chưa rõ'}</strong>
                                          </div>
                                        </td>
                                        <td>{member.phone || '-'}</td>
                                        <td>{isLeader ? 'Trưởng đội' : 'Thành viên'}</td>
                                        <td>
                                          {isLeader ? (
                                            <span className="admin-member-static-text">Không thể xóa</span>
                                          ) : (
                                            <button
                                              type="button"
                                              className="admin-table-danger-button"
                                              onClick={() => handleRemoveMemberClick(member)}
                                            >
                                              Xóa
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="admin-form-block">
                      <div className="admin-form-section-header admin-form-section-header-static">
                        <span className="admin-form-section-title">Trưởng đội</span>
                      </div>

                      <div className="admin-leader-select-group">
                        {isEditMode ? (
                          <select
                            value={formData.leaderUserId}
                            onChange={handleLeaderChange}
                            disabled={leaderOptions.length === 0}
                            required
                            aria-label="Trưởng đội"
                          >
                            <option value="">Chọn Trưởng đội</option>
                            {leaderOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select value={previewLeaderValue} disabled aria-label="Trưởng đội">
                            {previewLeaderOptions.length === 0 ? (
                              <option value="">Chưa có Trưởng đội</option>
                            ) : (
                              previewLeaderOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))
                            )}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="admin-modal-actions">
                  {isEditMode ? (
                    <button
                      key="submit-team-form"
                      type="submit"
                      className="admin-primary-button"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Đang lưu...' : submitButtonLabel}
                    </button>
                  ) : (
                    <button
                      key="enable-edit-mode"
                      type="button"
                      className="admin-primary-button"
                      onClick={handleStartEditing}
                    >
                      Chỉnh sửa
                    </button>
                  )}
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={closeForm}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <LogoutConfirmModal
        open={Boolean(confirmAction)}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel={isConfirmSubmitting ? 'Đang xử lý...' : confirmAction?.confirmLabel}
        cancelLabel={confirmAction?.cancelLabel}
        onConfirm={handleConfirmAction}
        onCancel={closeConfirmModal}
        confirmDisabled={isConfirmSubmitting}
        cancelDisabled={isConfirmSubmitting}
      />
    </AdminLayout>
  )
}

export default AdminRescueTeamsPage
