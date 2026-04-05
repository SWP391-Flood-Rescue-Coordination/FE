import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import authService from '../services/authService'
import adminService from '../services/adminService'
import { HOME_ROUTE_BY_ROLE, formatDateTimeVN, normalizeRole, normalizeText } from './adminShared'
import './AdminStockUnitsPage.css'

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'INACTIVE', label: 'Ngừng hoạt động' },
]

const EMPTY_DRAFT = {
  unitCode: '',
  unitName: '',
  unitType: '',
  region: '',
  address: '',
  supportsImport: true,
  supportsExport: true,
  isActive: true,
}

const normalizeStockUnitStatus = (stockUnit) => {
  if (typeof stockUnit?.isActive === 'boolean') {
    return stockUnit.isActive ? 'ACTIVE' : 'INACTIVE'
  }

  if (typeof stockUnit?.status === 'boolean') {
    return stockUnit.status ? 'ACTIVE' : 'INACTIVE'
  }

  const rawStatus = String(stockUnit?.status ?? stockUnit?.Status ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')

  if (rawStatus === 'ACTIVE' || rawStatus === 'ENABLE' || rawStatus === 'ENABLED' || rawStatus === '1') {
    return 'ACTIVE'
  }

  if (rawStatus === 'INACTIVE' || rawStatus === 'DISABLED' || rawStatus === '0') {
    return 'INACTIVE'
  }

  return rawStatus || 'INACTIVE'
}

const getStockUnitStatusMeta = (stockUnit) => {
  const statusKey = normalizeStockUnitStatus(stockUnit)

  if (statusKey === 'ACTIVE') {
    return {
      key: 'ACTIVE',
      label: 'Hoạt động',
      badgeClass: 'active',
      actionLabel: 'Chuyển sang ngừng hoạt động',
      nextIsActive: false,
    }
  }

  return {
    key: 'INACTIVE',
    label: 'Ngừng hoạt động',
    badgeClass: 'inactive',
    actionLabel: 'Kích hoạt đơn vị',
    nextIsActive: true,
  }
}

const normalizeStockUnit = (stockUnit) => ({
  stockUnitId: stockUnit?.stockUnitId ?? stockUnit?.StockUnitId ?? stockUnit?.id ?? stockUnit?.Id ?? null,
  unitCode: stockUnit?.unitCode ?? stockUnit?.UnitCode ?? stockUnit?.stockUnitCode ?? stockUnit?.StockUnitCode ?? '',
  unitName: stockUnit?.unitName ?? stockUnit?.UnitName ?? stockUnit?.name ?? stockUnit?.Name ?? stockUnit?.stockUnitName ?? stockUnit?.StockUnitName ?? '',
  unitType: stockUnit?.unitType ?? stockUnit?.UnitType ?? stockUnit?.type ?? stockUnit?.Type ?? '',
  name: stockUnit?.unitName ?? stockUnit?.UnitName ?? stockUnit?.name ?? stockUnit?.Name ?? stockUnit?.stockUnitName ?? stockUnit?.StockUnitName ?? '',
  type: stockUnit?.unitType ?? stockUnit?.UnitType ?? stockUnit?.type ?? stockUnit?.Type ?? '',
  region: stockUnit?.region ?? stockUnit?.Region ?? '',
  address: stockUnit?.address ?? stockUnit?.Address ?? '',
  supportsImport: Boolean(stockUnit?.supportsImport ?? stockUnit?.SupportsImport),
  supportsExport: Boolean(stockUnit?.supportsExport ?? stockUnit?.SupportsExport),
  isActive: getStockUnitStatusMeta(stockUnit).key === 'ACTIVE',
  status: getStockUnitStatusMeta(stockUnit).key,
  createdAt: stockUnit?.createdAt ?? stockUnit?.CreatedAt ?? null,
  updatedAt: stockUnit?.updatedAt ?? stockUnit?.UpdatedAt ?? null,
  contactName: stockUnit?.contactName ?? stockUnit?.ContactName ?? '',
  contactPhone: stockUnit?.contactPhone ?? stockUnit?.ContactPhone ?? '',
  managerName: stockUnit?.managerName ?? stockUnit?.ManagerName ?? '',
  note: stockUnit?.note ?? stockUnit?.Note ?? '',
})

const buildDraftFromStockUnit = (stockUnit) => ({
  unitCode: stockUnit?.unitCode ?? '',
  unitName: stockUnit?.unitName ?? stockUnit?.name ?? '',
  unitType: stockUnit?.unitType ?? stockUnit?.type ?? '',
  region: stockUnit?.region ?? '',
  address: stockUnit?.address ?? '',
  supportsImport: Boolean(stockUnit?.supportsImport),
  supportsExport: Boolean(stockUnit?.supportsExport),
  isActive: Boolean(stockUnit?.isActive),
})

const getStockUnitIdentifier = (response) => {
  const candidate =
    response?.Data ??
    response?.data ??
    response?.data?.data ??
    response?.data?.Data ??
    response?.stockUnit ??
    response?.StockUnit ??
    response

  return candidate?.stockUnitId ?? candidate?.StockUnitId ?? candidate?.id ?? candidate?.Id ?? null
}

function AdminStockUnitsPage() {
  const navigate = useNavigate()
  const [currentUser] = useState(() => authService.getUserInfo())
  const [stockUnits, setStockUnits] = useState([])
  const [selectedStockUnitId, setSelectedStockUnitId] = useState(null)
  const [editorMode, setEditorMode] = useState('edit')
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isStatusUpdating, setIsStatusUpdating] = useState(false)
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

  const loadStockUnits = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setIsLoading(true)
        setErrorMessage('')
      }

      try {
        const items = await adminService.getStockUnits()
        setStockUnits(items)

        if (editorMode === 'edit' && selectedStockUnitId === null && items.length > 0) {
          setSelectedStockUnitId(items[0].stockUnitId)
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
    [editorMode, handleUnauthorized, selectedStockUnitId],
  )

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    if (!hasAdminAccess) {
      return
    }

    loadStockUnits()
  }, [hasAdminAccess, isAuthenticated, loadStockUnits, navigate])

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

  const selectedStockUnit = useMemo(
    () => stockUnits.find((item) => String(item.stockUnitId) === String(selectedStockUnitId)) || null,
    [selectedStockUnitId, stockUnits],
  )

  useEffect(() => {
    if (editorMode === 'create') {
      setDraft(EMPTY_DRAFT)
      return
    }

    if (!selectedStockUnit) {
      return
    }

    setDraft(buildDraftFromStockUnit(selectedStockUnit))
  }, [editorMode, selectedStockUnit])

  const filteredStockUnits = useMemo(() => {
    let items = [...stockUnits]

    if (statusFilter) {
      items = items.filter((item) => normalizeStockUnitStatus(item) === statusFilter)
    }

    const keyword = normalizeText(searchTerm)
    if (!keyword) {
      return items
    }

    return items.filter((item) => {
      const haystack = [
        item.stockUnitId,
        item.unitCode,
        item.unitName,
        item.unitType,
        item.name,
        item.type,
        item.region,
        item.address,
        item.contactName,
        item.contactPhone,
        item.managerName,
        item.status,
        item.createdAt,
        item.updatedAt,
      ].join(' ')

      return normalizeText(haystack).includes(keyword)
    })
  }, [searchTerm, statusFilter, stockUnits])

  const statusCounts = useMemo(() => {
    const active = stockUnits.filter((item) => normalizeStockUnitStatus(item) === 'ACTIVE').length
    const inactive = stockUnits.filter((item) => normalizeStockUnitStatus(item) === 'INACTIVE').length

    return {
      total: stockUnits.length,
      active,
      inactive,
    }
  }, [stockUnits])

  const handleLogout = () => {
    authService.logout()
    navigate('/login', { replace: true })
  }

  const handleSelectStockUnit = (stockUnit) => {
    setEditorMode('edit')
    setSelectedStockUnitId(stockUnit.stockUnitId)
    setErrorMessage('')
  }

  const handleStartCreate = () => {
    setEditorMode('create')
    setSelectedStockUnitId(null)
    setDraft(EMPTY_DRAFT)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleResetForm = () => {
    if (editorMode === 'create') {
      setDraft(EMPTY_DRAFT)
      return
    }

    if (selectedStockUnit) {
      setDraft(buildDraftFromStockUnit(selectedStockUnit))
    }
  }

  const handleSave = async () => {
    if (!draft.unitCode.trim() || !draft.unitName.trim() || !draft.unitType.trim()) {
      setErrorMessage('Vui lòng nhập mã, tên và loại đơn vị trước khi lưu.')
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      if (editorMode === 'create') {
        const response = await adminService.createStockUnit(draft)
        const nextId = getStockUnitIdentifier(response)

        await loadStockUnits({ silent: true })
        if (nextId !== null && nextId !== undefined) {
          setSelectedStockUnitId(nextId)
          setEditorMode('edit')
        }

        setSuccessMessage(response?.message || response?.Message || 'Đã tạo đơn vị xuất nhập mới.')
        return
      }

      if (!selectedStockUnitId) {
        return
      }

      const response = await adminService.updateStockUnit(selectedStockUnitId, draft)
      await loadStockUnits({ silent: true })
      setSelectedStockUnitId(selectedStockUnitId)
      setEditorMode('edit')
      setSuccessMessage(response?.message || response?.Message || 'Đã cập nhật thông tin đơn vị.')
    } catch (error) {
      if (handleUnauthorized(error)) {
        return
      }

      setErrorMessage(adminService.getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!selectedStockUnit) {
      return
    }

    const currentStatusMeta = getStockUnitStatusMeta(selectedStockUnit)
    if (!window.confirm(`Chuyển đơn vị "${selectedStockUnit.name || selectedStockUnit.stockUnitId}" sang ${currentStatusMeta.nextIsActive ? 'Hoạt động' : 'Ngừng hoạt động'}?`)) {
      return
    }

    setIsStatusUpdating(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await adminService.changeStockUnitStatus(selectedStockUnit.stockUnitId, currentStatusMeta.nextIsActive)
      await loadStockUnits({ silent: true })
      setSelectedStockUnitId(selectedStockUnit.stockUnitId)
      setEditorMode('edit')
      setSuccessMessage(response?.message || response?.Message || 'Đã cập nhật trạng thái đơn vị.')
    } catch (error) {
      if (handleUnauthorized(error)) {
        return
      }

      setErrorMessage(adminService.getErrorMessage(error))
    } finally {
      setIsStatusUpdating(false)
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

  const editorStatusMeta = getStockUnitStatusMeta(selectedStockUnit ?? { status: draft.isActive ? 'ACTIVE' : 'INACTIVE' })
  const editorTitle = editorMode === 'create' ? 'Tạo đơn vị mới' : selectedStockUnit?.name || 'Chưa chọn đơn vị'
  const editorSubtitle =
    editorMode === 'create'
      ? 'Nhập thông tin bên dưới để tạo một đơn vị xuất nhập mới.'
      : 'Xem thông tin chi tiết, chỉnh sửa và đổi trạng thái ngay tại đây.'

  return (
    <AdminLayout
      currentUser={currentUser}
      isAuthenticated={isAuthenticated}
      hasAdminAccess={hasAdminAccess}
      fallbackHomeRoute={fallbackHomeRoute}
      onLogout={handleLogout}
      isLoading={isLoading}
      feedback={feedback}
      loadingMessage="Đang tải danh sách đơn vị xuất nhập..."
    >
      <section className="admin-workspace-card admin-stock-units-shell">
        <div className="admin-section-header">
          <div>
            <h2>Quản lý đơn vị xuất nhập</h2>
            <p>Chọn một đơn vị trong danh sách để xem chi tiết, cập nhật thông tin hoặc chuyển trạng thái hoạt động.</p>
          </div>

          <div className="admin-stock-units-header-actions">
            <label className="admin-search-box compact" htmlFor="admin-stock-unit-search">
              <MagnifyingGlassIcon className="admin-search-icon" />
              <input
                id="admin-stock-unit-search"
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm theo mã, tên, khu vực, địa chỉ, người phụ trách..."
              />
            </label>

            <button type="button" className="admin-primary-button" onClick={handleStartCreate}>
              <PlusIcon className="admin-button-icon" />
              Tạo đơn vị
            </button>
          </div>
        </div>

        <div className="admin-summary-inline admin-stock-unit-summary">
          <span>Tổng: {statusCounts.total}</span>
          <span>Hoạt động: {statusCounts.active}</span>
          <span>Ngừng hoạt động: {statusCounts.inactive}</span>
        </div>

        <div className="admin-filter-row admin-stock-unit-filters" aria-label="Lọc trạng thái đơn vị xuất nhập">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value || 'ALL'}
              type="button"
              className={`admin-status-chip ${statusFilter === filter.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(filter.value)}
            >
              <span>{filter.label}</span>
              <span className="chip-count">
                {filter.value === 'ACTIVE' ? statusCounts.active : filter.value === 'INACTIVE' ? statusCounts.inactive : statusCounts.total}
              </span>
            </button>
          ))}
        </div>

        <div className="admin-stock-units-layout">
          <section className="admin-stock-unit-list-panel">
            <div className="admin-section-header compact">
              <div>
                <h2>Danh sách đơn vị</h2>
                <p>Bấm vào một dòng để mở khung chi tiết ở bên phải.</p>
              </div>
            </div>

            <div className="admin-table-wrap admin-stock-unit-table-wrap">
              <table className="admin-table admin-stock-unit-table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tên đơn vị</th>
                    <th>Loại</th>
                    <th>Khu vực</th>
                    <th>Nhập</th>
                    <th>Xuất</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStockUnits.length === 0 && (
                    <tr>
                      <td colSpan="7" className="admin-table-placeholder">
                        Không có đơn vị nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}

                  {filteredStockUnits.map((stockUnit) => {
                    const statusMeta = getStockUnitStatusMeta(stockUnit)
                    const isSelected = String(stockUnit.stockUnitId) === String(selectedStockUnitId)

                    return (
                      <tr
                        key={stockUnit.stockUnitId}
                        className={isSelected ? 'selected' : ''}
                        onClick={() => handleSelectStockUnit(stockUnit)}
                      >
                        <td>{stockUnit.stockUnitId ?? '-'}</td>
                        <td>
                          <span className="admin-stock-unit-name" title={stockUnit.unitName || stockUnit.name || '-'}>
                            {stockUnit.unitName || stockUnit.name || '-'}
                          </span>
                          {stockUnit.unitCode ? (
                            <span className="admin-stock-unit-code" title={stockUnit.unitCode}>
                              {` (${stockUnit.unitCode})`}
                            </span>
                          ) : null}
                        </td>
                        <td>{stockUnit.unitType || stockUnit.type || '-'}</td>
                        <td>{stockUnit.region || '-'}</td>
                        <td>
                          <span className={`admin-badge ${stockUnit.supportsImport ? 'active' : 'inactive'}`}>
                            {stockUnit.supportsImport ? 'Có' : 'Không'}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-badge ${stockUnit.supportsExport ? 'active' : 'inactive'}`}>
                            {stockUnit.supportsExport ? 'Có' : 'Không'}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="admin-stock-unit-editor-panel">
            <div className="admin-stock-unit-editor-header">
              <div>
                <span className="admin-sidebar-eyebrow">{editorMode === 'create' ? 'Tạo mới' : 'Khung chi tiết'}</span>
                <h2>{editorTitle}</h2>
                <p>{editorSubtitle}</p>
              </div>

              <div className="admin-stock-unit-editor-actions">
                <span className={`admin-badge ${editorStatusMeta.badgeClass}`}>{editorStatusMeta.label}</span>
                {editorMode !== 'create' && selectedStockUnit && (
                  <button
                    type="button"
                    className={`admin-secondary-button small ${selectedStockUnit.isActive ? 'danger-tone' : ''}`}
                    onClick={handleToggleStatus}
                    disabled={isStatusUpdating || isSaving}
                  >
                    {isStatusUpdating ? 'Đang cập nhật...' : editorStatusMeta.actionLabel}
                  </button>
                )}
              </div>
            </div>

            <div className="admin-stock-unit-meta-grid">
              <div>
                <span>Mã đơn vị</span>
                <strong>{selectedStockUnit?.stockUnitId ?? '-'}</strong>
              </div>
              <div>
                <span>Tạo lúc</span>
                <strong>{selectedStockUnit?.createdAt ? formatDateTimeVN(selectedStockUnit.createdAt) : '-'}</strong>
              </div>
              <div>
                <span>Cập nhật</span>
                <strong>{selectedStockUnit?.updatedAt ? formatDateTimeVN(selectedStockUnit.updatedAt) : '-'}</strong>
              </div>
            </div>

            <div className="admin-stock-unit-form-grid">
              <label className="admin-stock-unit-field">
                <span>Mã đơn vị</span>
                <input
                  type="text"
                  value={draft.unitCode}
                  onChange={(event) => setDraft((previousValue) => ({ ...previousValue, unitCode: event.target.value }))}
                  placeholder="Nhập mã đơn vị"
                />
              </label>

              <label className="admin-stock-unit-field full">
                <span>Tên đơn vị</span>
                <input
                  type="text"
                  value={draft.unitName}
                  onChange={(event) => setDraft((previousValue) => ({ ...previousValue, unitName: event.target.value }))}
                  placeholder="Nhập tên đơn vị"
                />
              </label>

              <label className="admin-stock-unit-field">
                <span>Loại đơn vị</span>
                <input
                  type="text"
                  value={draft.unitType}
                  onChange={(event) => setDraft((previousValue) => ({ ...previousValue, unitType: event.target.value }))}
                  placeholder="Ví dụ: Kho trung chuyển"
                />
              </label>

              <label className="admin-stock-unit-field">
                <span>Khu vực</span>
                <input
                  type="text"
                  value={draft.region}
                  onChange={(event) => setDraft((previousValue) => ({ ...previousValue, region: event.target.value }))}
                  placeholder="Nhập khu vực quản lý"
                />
              </label>

              <label className="admin-stock-unit-field full">
                <span>Địa chỉ</span>
                <textarea
                  rows="4"
                  value={draft.address}
                  onChange={(event) => setDraft((previousValue) => ({ ...previousValue, address: event.target.value }))}
                  placeholder="Nhập địa chỉ chi tiết"
                />
              </label>

              <label className="admin-stock-unit-check">
                <input
                  type="checkbox"
                  checked={draft.supportsImport}
                  onChange={(event) =>
                    setDraft((previousValue) => ({ ...previousValue, supportsImport: event.target.checked }))
                  }
                />
                <span>Hỗ trợ nhập kho</span>
              </label>

              <label className="admin-stock-unit-check">
                <input
                  type="checkbox"
                  checked={draft.supportsExport}
                  onChange={(event) =>
                    setDraft((previousValue) => ({ ...previousValue, supportsExport: event.target.checked }))
                  }
                />
                <span>Hỗ trợ xuất kho</span>
              </label>
            </div>

            <div className="admin-stock-unit-form-actions">
              <button type="button" className="admin-primary-button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : editorMode === 'create' ? 'Xác nhận tạo' : 'Xác nhận cập nhật'}
              </button>
              <button type="button" className="admin-secondary-button" onClick={handleResetForm} disabled={isSaving}>
                Khôi phục
              </button>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => loadStockUnits()}
                disabled={isSaving || isStatusUpdating}
              >
                <ArrowPathIcon className="admin-button-icon" />
                Tải lại
              </button>
            </div>

          </aside>
        </div>
      </section>
    </AdminLayout>
  )
}

export default AdminStockUnitsPage