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
  AVAILABLE: { label: 'Sáºµn sÃ ng', color: 'success' },
  INUSE: { label: 'Äang sá»­ dá»¥ng', color: 'info' },
  MAINTENANCE: { label: 'Báº£o trÃ¬', color: 'warning' },
  DISABLED: { label: 'NgÆ°ng hoáº¡t Ä‘á»™ng', color: 'danger' },
}

const FILTER_BUTTONS = [
  { key: '', label: 'Tá»•ng phÆ°Æ¡ng tiá»‡n', icon: 'all' },
  { key: 'AVAILABLE', label: 'Äang sáºµn sÃ ng', icon: 'available' },
  { key: 'INUSE', label: 'Äang sá»­ dá»¥ng', icon: 'inuse' },
  { key: 'MAINTENANCE', label: 'BÃ¡o trÃ¬', icon: 'maintenance' },
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

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((v) => normalizeVehicleStatus(v.status) === statusFilter)
    }

    setFilteredVehicles(filtered)
  }, [searchTerm, statusFilter, vehicles])

  const handleBack = () => {
    navigate('/manager')
  }

  const handleFilterClick = (filterKey) => {
    setStatusFilter(filterKey)
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
        <button className="back-button" onClick={handleBack}>
          <span className="arrow-icon">â†</span>
          Quay láº¡i
        </button>
        <div className="page-loading">
          <div className="loading-spinner"></div>
          <p>Äang táº£i danh sÃ¡ch phÆ°Æ¡ng tiá»‡n...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="manager-vehicles-page">
      <button className="back-button" onClick={handleBack}>
        <span className="arrow-icon">â†</span>
        Quay láº¡i
      </button>
      
      <header className="page-header">
        <h1>
          <TruckIcon className="icon" />
          Quáº£n lÃ½ PhÆ°Æ¡ng tiá»‡n
        </h1>
      </header>

      <div className="page-layout">
        {/* Sidebar Filters */}
        <aside className="sidebar">
          <div className="sidebar-filters">
            {FILTER_BUTTONS.map((filter) => (
              <button
                key={filter.key}
                className={`filter-btn ${statusFilter === filter.key ? 'active' : ''}`}
                onClick={() => handleFilterClick(filter.key)}
              >
                <span className="filter-label">{filter.label}</span>
                <span className="filter-count">{getStatusCount(filter.key)}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
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
              placeholder="TÃ¬m kiáº¿m theo tÃªn, loáº¡i, biá»ƒn sá»‘, mÃ£ phÆ°Æ¡ng tiá»‡n..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Vehicles Table */}
        {filteredVehicles.length === 0 ? (
          <div className="empty-state">
            <TruckIcon className="icon" />
            <p>KhÃ´ng tÃ¬m tháº¥y phÆ°Æ¡ng tiá»‡n nÃ o</p>
          </div>
        ) : (
          <div className="vehicles-table-container">
            <table className="vehicles-table">
              <thead>
                <tr>
                  <th>Vehicle ID</th>
                  <th>MÃ£ phÆ°Æ¡ng tiá»‡n</th>
                  <th>TÃªn phÆ°Æ¡ng tiá»‡n</th>
                  <th>Biá»ƒn sá»‘</th>
                  <th>Type ID</th>
                  <th>Sá»©c chá»©a</th>
                  <th>Tráº¡ng thÃ¡i</th>
                  <th>Cáº­p nháº­t bá»Ÿi</th>
                  <th>Vá»‹ trÃ­ hiá»‡n táº¡i</th>
                  <th>Thá»i gian báº£o hÃ nh gáº§n nháº¥t</th>
                  <th>Thá»i gian cáº­p nháº­t</th>
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
    </div>
  )
}

export default ManagerVehiclesPage

