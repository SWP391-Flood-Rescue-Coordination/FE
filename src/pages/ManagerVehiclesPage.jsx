import { formatDateTimeVN } from './adminShared'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import managerService from '../services/managerService'
import VehicleFormModal from '../components/VehicleFormModal'
import './ManagerVehiclesPage.css'

// Page CRUD phương tiện của manager:
// list, search, filter và mở modal thêm/sửa/xóa xe.
const STATUS_MAP = {
  AVAILABLE: { label: 'Sẵn sàng', color: 'success' },
  INUSE: { label: 'Đang sử dụng', color: 'info' },
  MAINTENANCE: { label: 'Bảo trì', color: 'warning' },
}

const FILTER_BUTTONS = [
  { key: '', label: 'Tổng phương tiện' },
  { key: 'AVAILABLE', label: 'Đang sẵn sàng' },
  { key: 'INUSE', label: 'Đang sử dụng' },
  { key: 'MAINTENANCE', label: 'Bảo trì' },
]

const normalizeVehicleStatus = (status) => String(status ?? '').trim().toUpperCase().replace(/[\s-]+/g, '')
const normalizeVehicleTypeKey = (value) => String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '')
const formatCoordinates = (latitude, longitude) => {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return '-'
  }

  return `${latitude}, ${longitude}`
}

const formatDateTimeWithSecondsVN = (value) => {
  return formatDateTimeVN(value, { second: '2-digit' })
}

function ManagerVehiclesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [vehicles, setVehicles] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(() => normalizeVehicleStatus(searchParams.get('status') || ''))
  const [errorMessage, setErrorMessage] = useState('')
  const [toast, setToast] = useState(null)
  const [modalMode, setModalMode] = useState(null)
  const [modalError, setModalError] = useState('')
  const [isModalSubmitting, setIsModalSubmitting] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  const vehicleTypeOptions = useMemo(() => managerService.getVehicleTypeOptions(), [])
  const vehicleTypeLabelMap = useMemo(
    () =>
      new Map(
        vehicleTypeOptions.map((option) => [normalizeVehicleTypeKey(option.code), option.label]),
      ),
    [vehicleTypeOptions],
  )

  const showToast = useCallback((type, message) => {
    setToast({ type, message })
  }, [])

  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null)
    }, 3200)

    return () => window.clearTimeout(timeoutId)
  }, [toast])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 420)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const data = await managerService.getAllVehicles('')
      setVehicles(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching vehicles:', error)
      setErrorMessage(managerService.getErrorMessage(error))

      if (error?.response?.status === 401) {
        navigate('/login', { replace: true })
      }
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login', { replace: true })
      return
    }

    fetchVehicles()
  }, [navigate, fetchVehicles])

  useEffect(() => {
    setStatusFilter(normalizeVehicleStatus(searchParams.get('status') || ''))
  }, [searchParams])

  const filteredVehicles = useMemo(() => {
    let filtered = [...vehicles]

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (vehicle) =>
          vehicle.vehicleName?.toLowerCase().includes(term)
          || vehicle.vehicleTypeName?.toLowerCase().includes(term)
          || vehicle.licensePlate?.toLowerCase().includes(term)
          || vehicle.vehicleCode?.toLowerCase().includes(term)
          || vehicle.currentLocation?.toLowerCase().includes(term),
      )
    }

    if (statusFilter) {
      filtered = filtered.filter((vehicle) => normalizeVehicleStatus(vehicle.status) === statusFilter)
    }

    return filtered
  }, [searchTerm, statusFilter, vehicles])

  const handleBack = () => {
    navigate('/manager')
  }

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleChangeStatusFilter = (nextStatus) => {
    setStatusFilter(nextStatus)

    if (nextStatus) {
      setSearchParams({ status: nextStatus })
      return
    }

    setSearchParams({})
  }

  const getStatusBadge = (status) => {
    const normalizedStatus = normalizeVehicleStatus(status)
    return STATUS_MAP[normalizedStatus] || { label: status || '-', color: 'default' }
  }

  const getStatusCount = (status) => {
    if (!status) {
      return vehicles.length
    }

    return vehicles.filter((vehicle) => normalizeVehicleStatus(vehicle.status) === status).length
  }

  const getVehicleTypeLabel = (vehicle) => {
    const matchedByCode = vehicleTypeLabelMap.get(normalizeVehicleTypeKey(vehicle.vehicleTypeName))
    if (matchedByCode) {
      return matchedByCode
    }

    const matchedById = vehicleTypeOptions.find((option) => Number(option.id) === Number(vehicle.vehicleTypeId))
    return matchedById?.label || vehicle.vehicleTypeName || '-'
  }

  const handleOpenCreate = () => {
    setSelectedVehicle(null)
    setModalError('')
    setModalMode('create')
  }

  const handleOpenEdit = async (vehicleId) => {
    setModalError('')
    setIsModalSubmitting(true)

    try {
      // Gọi API lấy chi tiết xe: GET /api/Vehicle/{vehicleId}
      // Return: Thông tin xe đầy đủ (vehicleCode, capacity, location, status, etc.)
      // FE dùng dữ liệu để fill vào form edit trong modal cho user chỉnh sửa
      const vehicle = await managerService.getVehicleById(vehicleId)
      setSelectedVehicle(vehicle)
      setModalMode('edit')
    } catch (error) {
      showToast('error', managerService.getErrorMessage(error))
    } finally {
      setIsModalSubmitting(false)
    }
  }

  const handleDeleteVehicle = async (vehicle) => {
    if (!vehicle?.vehicleId) {
      return
    }

    if (normalizeVehicleStatus(vehicle.status) === 'INUSE') {
      showToast('error', 'Không thể xóa phương tiện đang trong nhiệm vụ.')
      return
    }

    const confirmed = window.confirm(`Xóa phương tiện "${vehicle.vehicleCode}"?`)
    if (!confirmed) {
      return
    }

    try {
      // Gọi API xóa xe: DELETE /api/Vehicle/{vehicleId}
      // Chỉ xóa được xe ở status AVAILABLE (không đang dùng INUSE hay bảo trì MAINTENANCE)
      // BE xóa Vehicle record + tất cả dữ liệu liên quan (history, etc.)
      // Return: Success message
      const response = await managerService.deleteVehicle(vehicle.vehicleId)
      await fetchVehicles()
      showToast('success', response?.message || response?.Message || 'Xóa phương tiện thành công.')
    } catch (error) {
      showToast('error', managerService.getErrorMessage(error))
    }
  }

  const handleSubmitVehicle = async (formData) => {
    setModalError('')
    setIsModalSubmitting(true)

    try {
      // Modal dùng chung cho create/edit, chỉ khác service call theo mode hiện tại.
      // Create: POST /api/Vehicle
      //   Payload: { vehicleCode, name, capacity, location, registrationNumber, type, purchaseDate, ... }
      //   Validate: capacity ≥ 2, vehicleCode unique, location bắt buộc
      // Update: PUT /api/Vehicle/{vehicleId}
      //   Payload: { name, capacity, location, ... }
      //   Restrict: Không cập nhật status nếu xe đang INUSE
      // BE return: Vehicle mới/updated kèm vehicleId, status
      const response = modalMode === 'create'
        ? await managerService.createVehicle(formData)
        : await managerService.updateVehicle(
          selectedVehicle?.vehicleId,
          formData,
          selectedVehicle?.status,
        )

      await fetchVehicles()
      setModalMode(null)
      setSelectedVehicle(null)
      showToast(
        'success',
        response?.message
        || response?.Message
        || (modalMode === 'create' ? 'Thêm phương tiện thành công.' : 'Cập nhật phương tiện thành công.'),
      )
    } catch (error) {
      const message = managerService.getErrorMessage(error)
      setModalError(message)
      throw error
    } finally {
      setIsModalSubmitting(false)
    }
  }

  const handleCloseModal = () => {
    if (isModalSubmitting) {
      return
    }

    setModalMode(null)
    setSelectedVehicle(null)
    setModalError('')
  }

  if (isLoading) {
    return (
      <div className="manager-vehicles-page">
        <button type="button" className="back-button" onClick={handleBack} aria-label="Quay lại" title="Quay lại">
          <ArrowLeftIcon className="icon" />
        </button>
        <div className="page-loading">
          <div className="loading-spinner"></div>
          <p>Đang tải danh sách phương tiện...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="manager-vehicles-page">
      <button type="button" className="back-button" onClick={handleBack} aria-label="Quay lại" title="Quay lại">
        <ArrowLeftIcon className="icon" />
      </button>

      <header className="page-header">
        <h1>
          <TruckIcon className="icon" />
          Quản lý Phương tiện
        </h1>
      </header>

      <div className="status-toolbar" role="tablist" aria-label="Lọc trạng thái phương tiện">
        {FILTER_BUTTONS.map((filter) => (
          <button
            key={filter.key}
            className={`status-chip ${statusFilter === filter.key ? 'active' : ''}`}
            onClick={() => handleChangeStatusFilter(filter.key)}
            type="button"
          >
            <span>{filter.label}</span>
            <span className="chip-count">{getStatusCount(filter.key)}</span>
          </button>
        ))}
      </div>

      <div className="page-content">
        {errorMessage && <div className="error-message">{errorMessage}</div>}

        <div className="search-toolbar">
          <div className="search-section">
            <div className="search-box">
              <MagnifyingGlassIcon className="icon" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, loại, biển số, mã phương tiện..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <button type="button" className="vehicle-primary-action" onClick={handleOpenCreate}>
            <PlusIcon className="vehicle-primary-action-icon" />
            Thêm phương tiện
          </button>
        </div>

        {filteredVehicles.length === 0 ? (
          <div className="empty-state">
            <TruckIcon className="icon" />
            <p>Không tìm thấy phương tiện nào</p>
          </div>
        ) : (
          <div className="vehicles-table-container">
            <table className="vehicles-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã phương tiện</th>
                  <th>Tên phương tiện</th>
                  <th>Biển số</th>
                  <th>Loại phương tiện</th>
                  <th>Sức chứa</th>
                  <th>Trạng thái</th>
                  <th>Vị trí hiện tại</th>
                  <th>Tọa độ</th>
                  <th>Bảo trì gần nhất</th>
                  <th>TG Cập nhật</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => {
                  const statusInfo = getStatusBadge(vehicle.status)
                  const isInUseVehicle = normalizeVehicleStatus(vehicle.status) === 'INUSE'

                  return (
                    <tr key={vehicle.vehicleId}>
                      <td>{vehicle.vehicleId}</td>
                      <td className="vehicle-code">{vehicle.vehicleCode || 'N/A'}</td>
                      <td className="vehicle-name">{vehicle.vehicleName || 'N/A'}</td>
                      <td className="vehicle-license-cell">
                        <div className="vehicle-license-wrap">
                          <span className="license-plate">{vehicle.licensePlate || 'N/A'}</span>
                        </div>
                      </td>
                      <td>{getVehicleTypeLabel(vehicle)}</td>
                      <td>{vehicle.capacity ?? '-'}</td>
                      <td>
                        <span className={`vehicle-status-badge ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="vehicle-location-cell">
                        <div className="vehicle-location-text">{vehicle.currentLocation || '-'}</div>
                      </td>
                      <td className="vehicle-coordinates-cell">
                        <div className="vehicle-coordinates-text">
                          {formatCoordinates(vehicle.latitude, vehicle.longitude)}
                        </div>
                      </td>
                      <td>{vehicle.lastMaintenance ? formatDateTimeWithSecondsVN(vehicle.lastMaintenance) : '-'}</td>
                      <td>{vehicle.updatedAt ? formatDateTimeVN(vehicle.updatedAt) : '-'}</td>
                      <td>
                        <div className="vehicle-action-group">
                          <button
                            type="button"
                            className="vehicle-action-btn edit"
                            onClick={() => handleOpenEdit(vehicle.vehicleId)}
                          >
                            <PencilSquareIcon className="vehicle-action-icon" />
                            Sửa
                          </button>
                          <button
                            type="button"
                            className={`vehicle-action-btn delete ${isInUseVehicle ? 'disabled' : ''}`}
                            onClick={() => handleDeleteVehicle(vehicle)}
                            disabled={isInUseVehicle}
                          >
                            <TrashIcon className="vehicle-action-icon" />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalMode && (
        <VehicleFormModal
          mode={modalMode}
          initialVehicle={selectedVehicle}
          vehicleTypeOptions={vehicleTypeOptions}
          isSubmitting={isModalSubmitting}
          serverError={modalError}
          onClose={handleCloseModal}
          onSubmit={handleSubmitVehicle}
        />
      )}

      {toast && (
        <div className={`vehicle-toast ${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.message}
        </div>
      )}

      {showScrollTop && (
        <button type="button" className="scroll-top-button" onClick={handleScrollToTop} aria-label="Lên đầu trang">
          <ChevronUpIcon className="icon" />
        </button>
      )}
    </div>
  )
}

export default ManagerVehiclesPage
