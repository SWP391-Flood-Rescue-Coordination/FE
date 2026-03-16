import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TruckIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import managerService from '../services/managerService'
import './ManagerVehiclesPage.css'

const STATUS_MAP = {
  AVAILABLE: { label: 'Sẵn sàng', color: 'success' },
  INUSE: { label: 'Đang sử dụng', color: 'info' },
  MAINTENANCE: { label: 'Bảo trì', color: 'warning' },
  DISABLED: { label: 'Ngừng hoạt động', color: 'danger' },
}

const FILTER_BUTTONS = [
  { key: '', label: 'Tổng phương tiện' },
  { key: 'AVAILABLE', label: 'Đang sẵn sàng' },
  { key: 'INUSE', label: 'Đang sử dụng' },
  { key: 'MAINTENANCE', label: 'Bảo trì' },
]

const normalizeVehicleStatus = (status) => String(status ?? '').trim().toUpperCase().replace(/[\s-]+/g, '')

function ManagerVehiclesPage() {
  const navigate = useNavigate()
  
  const [isLoading, setIsLoading] = useState(true)
  const [vehicles, setVehicles] = useState([])
  const [filteredVehicles, setFilteredVehicles] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const data = await managerService.getAllVehicles('')
      setVehicles(data)
      setFilteredVehicles(data)
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
    let filtered = [...vehicles]

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (v) =>
          v.vehicleName?.toLowerCase().includes(term) ||
          v.vehicleType?.toLowerCase().includes(term) ||
          v.licensePlate?.toLowerCase().includes(term) ||
          v.vehicleCode?.toLowerCase().includes(term)
      )
    }

    if (statusFilter) {
      filtered = filtered.filter((v) => normalizeVehicleStatus(v.status) === statusFilter)
    }

    setFilteredVehicles(filtered)
  }, [searchTerm, statusFilter, vehicles])

  const handleBack = () => {
    navigate('/manager')
  }

  const getStatusBadge = (status) => {
    const statusInfo = STATUS_MAP[normalizeVehicleStatus(status)] || { label: status, color: 'default' }
    return statusInfo.label
  }

  const getStatusCount = (status) => {
    if (!status) return vehicles.length
    return vehicles.filter((v) => normalizeVehicleStatus(v.status) === status).length
  }

  if (isLoading) {
    return (
      <div className="manager-vehicles-page">
        <button className="back-button" onClick={handleBack} aria-label="Quay lại" title="Quay lại">
          <span className="arrow-icon">←</span>
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
      <button className="back-button" onClick={handleBack} aria-label="Quay lại" title="Quay lại">
        <span className="arrow-icon">←</span>
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
            onClick={() => setStatusFilter(filter.key)}
            type="button"
          >
            <span>{filter.label}</span>
            <span className="chip-count">{getStatusCount(filter.key)}</span>
          </button>
        ))}
      </div>

      <div className="page-content">

        {errorMessage && (
          <div className="error-message">{errorMessage}</div>
        )}

        {/* Search Bar */}
        <div className="search-section">
          <div className="search-box">
            <MagnifyingGlassIcon className="icon" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, loại, biển số, mã phương tiện..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Vehicles Table */}
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
                  <th>Vehicle ID</th>
                  <th>Mã phương tiện</th>
                  <th>Tên phương tiện</th>
                  <th>Biển số</th>
                  <th>Type ID</th>
                  <th>Sức chứa</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật bởi</th>
                  <th>Vị trí hiện tại</th>
                  <th>Thời gian bảo hành gần nhất</th>
                  <th>Thời gian cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.vehicleId}>
                    <td>{vehicle.vehicleId}</td>
                    <td className="vehicle-code">{vehicle.vehicleCode || 'N/A'}</td>
                    <td className="vehicle-name">{vehicle.vehicleName || 'N/A'}</td>
                    <td className="license-plate">{vehicle.licensePlate || 'N/A'}</td>
                    <td>{vehicle.vehicleTypeId || '-'}</td>
                    <td>{vehicle.capacity || '-'}</td>
                    <td>{getStatusBadge(vehicle.status)}</td>
                    <td>{vehicle.coordinator || '-'}</td>
                    <td>{vehicle.currentLocation || '-'}</td>
                    <td>
                      {vehicle.lastMaintenanceDate
                        ? new Date(vehicle.lastMaintenanceDate).toLocaleDateString('vi-VN')
                        : '-'}
                    </td>
                    <td>
                      {vehicle.createdAt
                        ? new Date(vehicle.createdAt).toLocaleDateString('vi-VN')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ManagerVehiclesPage

