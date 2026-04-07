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
  leaderPhone: '',
  baseLatitude: null,
  baseLongitude: null,
  address: '',
  memberIds: [],
}

const memberRoleWhitelist = new Set([
  'RESCUE_TEAM_LEADER',
  'RESCUE_TEAM',
  'RESCUE_TEAM_MEMBER',
])

const toNumberOrNull = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

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

  const rawMemberEntries =
    team?.memberIds ??
    team?.member_ids ??
    team?.members ??
    team?.teamMembers ??
    []

  const memberIds = Array.isArray(rawMemberEntries)
    ? rawMemberEntries
        .map((entry) => {
          if (entry && typeof entry === 'object') {
            return entry.userId ?? entry.memberId ?? entry.id ?? entry.teamMemberId ?? null
          }
          return entry
        })
        .map((value) => (value !== null && value !== undefined ? String(value) : null))
        .filter(Boolean)
    : []

  const createdAt = team?.createdAt ?? team?.created_at ?? team?.CreatedAt ?? null

  return {
    id,
    name: team?.teamName ?? team?.team_name ?? team?.name ?? `Đội ${id ?? 'chưa rõ'}`,
    leaderUserId,
    leaderName,
    leaderPhone,
    memberIds,
    memberCount,
    baseLatitude,
    baseLongitude,
    baseAddress,
    createdAt,
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
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [draftTeams, setDraftTeams] = useState([])
  const [isCreateConfirmOpen, setIsCreateConfirmOpen] = useState(false)
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

  const createDraftTeam = useCallback(() => {
    return {
      id: `draft-${Date.now()}`,
      name: 'Đội cứu hộ mới',
      leaderName: '',
      leaderPhone: '',
      memberIds: [],
      memberCount: 0,
      baseLatitude: null,
      baseLongitude: null,
      baseAddress: '',
      createdAt: new Date().toISOString(),
      isDraft: true,
    }
  }, [])

  const handleCreateDraft = () => {
    setIsCreateConfirmOpen(true)
  }

  const handleCreateDraftConfirm = () => {
    setDraftTeams((prev) => [createDraftTeam(), ...prev])
    setIsCreateConfirmOpen(false)
  }

  const handleCreateDraftCancel = () => {
    setIsCreateConfirmOpen(false)
  }

  const loadUserOptions = useCallback(async () => {
    try {
      const users = await adminService.getUsers()

      const memberList = users
        .filter((user) => memberRoleWhitelist.has(normalizeRole(user.role)))
        .map((user) => ({
          value: String(user.userId),
          label: user.fullName ? `${user.fullName} (${user.username})` : user.username,
          fullName: user.fullName || user.username || '-',
          phone: user.phone || '',
          teamName:
            user.teamName ?? user.team?.name ?? user.team?.teamName ?? user.team?.team_name ?? '-',
          role: normalizeRole(user.role),
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
        const data = await adminService.getRescueTeams()
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
    setSelectedTeam(null)
    setMemberSearchTerm('')
  }

  const openForm = (mode, team = null, { editMode = false } = {}) => {
    setFormMode(mode)
    resetForm()
    setIsEditMode(editMode)

    if (team) {
      setSelectedTeam(team)
      setFormData({
        teamName: team.name || '',
        leaderUserId: team.leaderUserId ? String(team.leaderUserId) : '',
        leaderPhone: team.leaderPhone || '',
        baseLatitude: team.baseLatitude ?? null,
        baseLongitude: team.baseLongitude ?? null,
        address: team.baseAddress || '',
        memberIds: team.memberIds ?? [],
      })
    }

    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    resetForm()
  }

  const handleRowClick = (team) => {
    openForm(team?.isDraft ? 'create' : 'edit', team, { editMode: false })
  }

  const handleRowKeyDown = (event, team) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleRowClick(team)
    }
  }

  const handleLeaderChange = (event) => {
    const value = event.target.value
    const selected = memberOptions.find((item) => item.value === value)

    setFormData((prev) => ({
      ...prev,
      leaderUserId: value,
      leaderPhone: selected?.phone || '',
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
        leaderPhone: nextLeaderUserId ? prev.leaderPhone : '',
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

  useEffect(() => {
    if (formMode !== 'edit' || !isFormOpen || !selectedTeam) {
      return
    }

    if (formData.memberIds.length > 0) {
      return
    }

    if (memberOptions.length === 0) {
      return
    }

    const fallbackMemberIds = memberOptions
      .slice(0, Math.min(2, memberOptions.length))
      .map((option) => option.value)

    if (fallbackMemberIds.length === 0) {
      return
    }

    const leaderFromTeam =
      selectedTeam.leaderUserId !== undefined && selectedTeam.leaderUserId !== null
        ? String(selectedTeam.leaderUserId)
        : ''
    const hasTeamLeaderOption = Boolean(
      leaderFromTeam && memberOptions.some((option) => option.value === leaderFromTeam),
    )
    const fallbackLeaderId = hasTeamLeaderOption ? leaderFromTeam : fallbackMemberIds[0]
    const fallbackLeaderOption = memberOptions.find((option) => option.value === fallbackLeaderId)

    setFormData((prev) => ({
      ...prev,
      memberIds: fallbackMemberIds,
      leaderUserId: fallbackLeaderId,
      leaderPhone: fallbackLeaderOption?.phone || prev.leaderPhone,
    }))
  }, [formMode, isFormOpen, selectedTeam, memberOptions, formData.memberIds.length])

  const selectedMemberOptions = useMemo(() => {
    return memberOptions.filter((option) => formData.memberIds.includes(option.value))
  }, [memberOptions, formData.memberIds])

  const handleStartEditing = () => {
    setFormError('')
    setIsEditMode(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    const shouldCreate = Boolean(selectedTeam?.isDraft) || formMode === 'create'

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
        leaderPhone: formData.leaderPhone?.trim() || undefined,
        baseLatitude: formData.baseLatitude,
        baseLongitude: formData.baseLongitude,
        MemberUserIds: formData.memberIds.map((id) => Number(id)),
      }

      const response =
        shouldCreate
          ? await adminService.createRescueTeam(payload)
          : await adminService.updateRescueTeam(selectedTeam?.id, payload)

      setSuccessMessage(
        response?.message ||
          (shouldCreate ? 'Đã tạo đội cứu hộ mới.' : 'Thông tin đội cứu hộ đã được cập nhật.'),
      )

      await loadTeams({ silent: true })
      if (selectedTeam?.isDraft) {
        setDraftTeams((prev) => prev.filter((team) => team.id !== selectedTeam.id))
      }
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

  const visibleTeams = useMemo(() => {
    const baseList = [...draftTeams, ...sortedTeams]
    return baseList
  }, [draftTeams, sortedTeams])

  const handleLogout = () => {
    authService.logout()
    navigate('/login', { replace: true })
  }

  const modalTitle = isEditMode
    ? selectedTeam?.name
      ? `Chỉnh sửa ${selectedTeam.name}`
      : 'Chỉnh sửa đội cứu hộ'
    : selectedTeam?.name
      ? `Chi tiết ${selectedTeam.name}`
      : 'Chi tiết đội cứu hộ'
  const submitButtonLabel = selectedTeam?.isDraft ? 'Tạo đội' : selectedTeam ? 'Lưu thay đổi' : 'Tạo đội'
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
              </tr>
            </thead>
            <tbody>
              {visibleTeams.length === 0 && (
                <tr>
                  <td colSpan="6" className="admin-table-placeholder">
                    Chưa có đội cứu hộ nào được khai báo.
                  </td>
                </tr>
              )}

              {visibleTeams.map((team, index) => {
                const lat = Number(team.baseLatitude)
                const lng = Number(team.baseLongitude)
                const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng)

                return (
                  <tr
                    key={team.id ?? `${team.name}-${index}`}
                    className={`clickable-row ${team.isDraft ? 'team-draft-row' : ''}`}
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isFormOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal admin-modal-wide">
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
                                  const teamLabel = option.teamName || 'Chưa có đội'

                                  return (
                                    <tr key={option.value}>
                                      <td className="admin-member-table-checkbox">
                                        <input
                                          type="checkbox"
                                          value={option.value}
                                          checked={isSelected}
                                          onChange={() => handleMemberToggle(option.value)}
                                        />
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
                              <col className="admin-member-col-team" />
                            </colgroup>
                            <thead>
                              <tr>
                                <th>Họ và tên</th>
                                <th>Số điện thoại</th>
                                <th>Đội hiện tại</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedMemberOptions.length === 0 ? (
                                <tr>
                                  <td colSpan="3" className="admin-member-table-placeholder">
                                    Chưa có thành viên trong đội cứu hộ.
                                  </td>
                                </tr>
                              ) : (
                                selectedMemberOptions.map((option) => {
                                  const displayName = option.fullName || option.label || 'Chưa rõ'
                                  const teamLabel = option.teamName || 'Chưa có đội'

                                  return (
                                    <tr key={option.value}>
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
                  <button type="submit" className="admin-primary-button" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang lưu...' : submitButtonLabel}
                  </button>
                ) : (
                  <button type="button" className="admin-primary-button" onClick={handleStartEditing}>
                    Chỉnh sửa
                  </button>
                )}
                <button type="button" className="admin-secondary-button" onClick={closeForm} disabled={isSubmitting}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <LogoutConfirmModal
        open={isCreateConfirmOpen}
        title="Tạo đội cứu hộ"
        message="Một hàng dữ liệu mẫu sẽ được thêm vào bảng. Sau đó bạn bấm đúng hàng đó để chỉnh sửa thông tin đội."
        confirmLabel="Thêm mới"
        cancelLabel="Hủy"
        onConfirm={handleCreateDraftConfirm}
        onCancel={handleCreateDraftCancel}
      />
    </AdminLayout>
  )
}

export default AdminRescueTeamsPage
