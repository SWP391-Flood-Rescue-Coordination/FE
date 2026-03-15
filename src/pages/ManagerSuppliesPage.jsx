import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeftIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import managerService from '../services/managerService'
import './ManagerSuppliesPage.css'

function ManagerSuppliesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const [isLoading, setIsLoading] = useState(true)
  const [supplies, setSupplies] = useState([])
  const [filteredSupplies, setFilteredSupplies] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedSupply, setSelectedSupply] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    quantity: '',
    unit: '',
    minQuantity: '',
  })

  const fetchSupplies = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const data = await managerService.getSupplies()
      
      setSupplies(data)
      setFilteredSupplies(data)
    } catch (error) {
      console.error('Error fetching supplies:', error)
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

    // Check URL params for filter
    const params = new URLSearchParams(location.search)
    const filter = params.get('filter')
    if (filter === 'lowStock') {
      setFilterMode('lowStock')
    }

    fetchSupplies()
  }, [navigate, fetchSupplies, location.search])

  useEffect(() => {
    let filtered = supplies

    // Apply lowStock filter first
    if (filterMode === 'lowStock') {
      filtered = filtered.filter((s) => s.quantity <= s.minQuantity)
    }

    // Then apply search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.name?.toLowerCase().includes(term) ||
          s.type?.toLowerCase().includes(term)
      )
    }

    setFilteredSupplies(filtered)
  }, [searchTerm, supplies, filterMode])

  const handleBack = () => {
    navigate('/manager')
  }

  const handleAddSupply = () => {
    setFormData({
      name: '',
      type: '',
      quantity: '',
      unit: '',
      minQuantity: '',
    })
    setShowAddModal(true)
  }

  const handleEditSupply = (supply) => {
    setSelectedSupply(supply)
    setFormData({
      name: supply.name || '',
      type: supply.type || '',
      quantity: supply.quantity || '',
      unit: supply.unit || '',
      minQuantity: supply.minQuantity || '',
    })
    setShowEditModal(true)
  }

  const handleDeleteSupply = async (supplyId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa vật tư này?')) {
      return
    }

    try {
      await managerService.deleteSupply(supplyId)
      alert('Xóa vật tư thành công!')
      fetchSupplies()
    } catch (error) {
      alert('Lỗi: ' + managerService.getErrorMessage(error))
    }
  }

  const handleSubmitAdd = async (e) => {
    e.preventDefault()
    
    try {
      await managerService.addSupply({
        ...formData,
        quantity: Number(formData.quantity),
        minQuantity: Number(formData.minQuantity),
      })
      alert('Thêm vật tư thành công!')
      setShowAddModal(false)
      fetchSupplies()
    } catch (error) {
      alert('Lỗi: ' + managerService.getErrorMessage(error))
    }
  }

  const handleSubmitEdit = async (e) => {
    e.preventDefault()
    
    try {
      await managerService.updateSupply(selectedSupply.supplyId, {
        ...formData,
        quantity: Number(formData.quantity),
        minQuantity: Number(formData.minQuantity),
      })
      alert('Cập nhật vật tư thành công!')
      setShowEditModal(false)
      fetchSupplies()
    } catch (error) {
      alert('Lỗi: ' + managerService.getErrorMessage(error))
    }
  }

  const isLowStock = (supply) => {
    return Number(supply.quantity) <= Number(supply.minQuantity)
  }

  const lowStockCount = supplies.filter(isLowStock).length

  if (isLoading) {
    return (
      <div className="manager-supplies-page">
        <button className="back-button" onClick={handleBack} aria-label="Quay lại" title="Quay lại">
          <span className="arrow-icon">←</span>
        </button>
        <div className="page-loading">
          <div className="loading-spinner"></div>
          <p>Đang tải danh sách vật tư...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="manager-supplies-page">
      <button className="back-button" onClick={handleBack} aria-label="Quay lại" title="Quay lại">
        <span className="arrow-icon">←</span>
      </button>
      <header className="page-header">
        <h1>
          <CubeIcon className="icon" />
          Quản lý Vật tư
        </h1>
      </header>

      <div className="page-content">
        {errorMessage && (
          <div className="error-message">{errorMessage}</div>
        )}

        {lowStockCount > 0 && (
          <div className="warning-banner">
            <ExclamationTriangleIcon className="icon" />
            <span>Có {lowStockCount} loại vật tư sắp hết hàng!</span>
          </div>
        )}

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <MagnifyingGlassIcon className="icon" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, loại vật tư..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {filterMode === 'lowStock' && (
            <div className="active-filter-badge">
              <ExclamationTriangleIcon className="icon" />
              <span>Chỉ hiển thị: Vật tư sắp hết</span>
              <button 
                className="clear-filter-btn"
                onClick={() => {
                  setFilterMode('')
                  navigate('/manager/supplies', { replace: true })
                }}
                title="Xóa bộ lọc"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-label">Tổng loại:</span>
            <span className="stat-value">{supplies.length}</span>
          </div>
          <div className="stat-item warning">
            <span className="stat-label">Sắp hết:</span>
            <span className="stat-value">{lowStockCount}</span>
          </div>
        </div>

        {/* Supplies Grid */}
        {filteredSupplies.length === 0 ? (
          <div className="empty-state">
            <CubeIcon className="icon" />
            <p>Không tìm thấy vật tư nào</p>
          </div>
        ) : (
          <div className="supplies-grid">
            {filteredSupplies.map((supply) => (
              <div
                key={supply.supplyId}
                className={`supply-card ${isLowStock(supply) ? 'low-stock' : ''}`}
              >
                {isLowStock(supply) && (
                  <div className="low-stock-badge">
                    <ExclamationTriangleIcon className="icon" />
                    Sắp hết
                  </div>
                )}
                
                <div className="supply-header">
                  <h3>{supply.name}</h3>
                  <span className="supply-type">{supply.type}</span>
                </div>

                <div className="supply-stats">
                  <div className="stat">
                    <span className="label">Số lượng:</span>
                    <span className={`value ${isLowStock(supply) ? 'warning' : ''}`}>
                      {supply.quantity} {supply.unit}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="label">Mức tối thiểu:</span>
                    <span className="value">
                      {supply.minQuantity} {supply.unit}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="label">Ngày nhập:</span>
                    <span className="value">
                      {supply.importDate
                        ? new Date(supply.importDate).toLocaleDateString('vi-VN')
                        : '-'}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="label">Ngày xuất:</span>
                    <span className="value">
                      {supply.exportDate
                        ? new Date(supply.exportDate).toLocaleDateString('vi-VN')
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Thêm vật tư mới</h2>
            <form onSubmit={handleSubmitAdd}>
              <div className="form-group">
                <label>Tên vật tư *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Loại *</label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Số lượng *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Đơn vị *</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Mức tối thiểu *</label>
                <input
                  type="number"
                  value={formData.minQuantity}
                  onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                  required
                  min="0"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="primary">
                  Thêm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Chỉnh sửa vật tư</h2>
            <form onSubmit={handleSubmitEdit}>
              <div className="form-group">
                <label>Tên vật tư *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Loại *</label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Số lượng *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Đơn vị *</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Mức tối thiểu *</label>
                <input
                  type="number"
                  value={formData.minQuantity}
                  onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                  required
                  min="0"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="primary">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagerSuppliesPage
