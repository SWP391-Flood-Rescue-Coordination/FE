import { formatDateTimeVN } from './adminShared'
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ChevronUpIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
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
  const [showSetMinModal, setShowSetMinModal] = useState(false)
  const [selectedSupply, setSelectedSupply] = useState(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    quantity: '',
    unit: '',
    minQuantity: '',
  })
  const [minValue, setMinValue] = useState('')

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

    const params = new URLSearchParams(location.search)
    const filter = params.get('filter')

    if (filter === 'lowStock' || filter === 'stable') {
      setFilterMode(filter)
    } else {
      setFilterMode('')
    }

    fetchSupplies()
  }, [fetchSupplies, location.search, navigate])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 420)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    let filtered = supplies

    if (filterMode === 'lowStock') {
      filtered = filtered.filter((supply) => supply.quantity <= supply.minQuantity)
    } else if (filterMode === 'stable') {
      filtered = filtered.filter((supply) => supply.quantity > supply.minQuantity)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (supply) =>
          supply.name?.toLowerCase().includes(term)
          || supply.type?.toLowerCase().includes(term),
      )
    }

    setFilteredSupplies(filtered)
  }, [filterMode, searchTerm, supplies])

  const handleBack = () => {
    navigate('/manager')
  }

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

  const handleSetMinimum = (supply) => {
    setSelectedSupply(supply)
    setMinValue(String(supply.minQuantity || ''))
    setShowSetMinModal(true)
  }

  const handleSubmitSetMin = async (event) => {
    event.preventDefault()

    const newMin = Number(minValue)
    if (Number.isNaN(newMin) || newMin < 0) {
      alert('Vui lòng nhập giá trị hợp lệ!')
      return
    }

    try {
      await managerService.updateSupply(selectedSupply.supplyId, {
        minQuantity: newMin,
      })
      alert('Cập nhật mức tối thiểu thành công!')
      setShowSetMinModal(false)
      fetchSupplies()
    } catch (error) {
      alert(`Lỗi: ${managerService.getErrorMessage(error)}`)
    }
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
      alert(`Lỗi: ${managerService.getErrorMessage(error)}`)
    }
  }

  const handleSubmitAdd = async (event) => {
    event.preventDefault()

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
      alert(`Lỗi: ${managerService.getErrorMessage(error)}`)
    }
  }

  const handleSubmitEdit = async (event) => {
    event.preventDefault()

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
      alert(`Lỗi: ${managerService.getErrorMessage(error)}`)
    }
  }

  const isLowStock = (supply) => Number(supply.quantity) <= Number(supply.minQuantity)

  const lowStockCount = supplies.filter(isLowStock).length

  if (isLoading) {
    return (
      <div className="manager-supplies-page">
        <button type="button" className="back-button" onClick={handleBack} aria-label="Quay lại">
          <ArrowLeftIcon className="icon" />
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
      <button type="button" className="back-button" onClick={handleBack} aria-label="Quay lại">
        <ArrowLeftIcon className="icon" />
      </button>

      <header className="page-header">
        <h1>
          <CubeIcon className="icon" />
          Quản lý vật tư
        </h1>
      </header>

      <div className="page-content">
        {errorMessage && <div className="error-message">{errorMessage}</div>}

        {lowStockCount > 0 && (
          <div className="warning-banner">
            <ExclamationTriangleIcon className="icon" />
            <span>Có {lowStockCount} loại vật tư sắp hết hàng!</span>
          </div>
        )}

        <div className="filters-section">
          <div className="search-box">
            <MagnifyingGlassIcon className="icon" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, loại vật tư..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          {(filterMode === 'lowStock' || filterMode === 'stable') && (
            <div className="active-filter-badge">
              <ExclamationTriangleIcon className="icon" />
              <span>
                {filterMode === 'lowStock' ? 'Chỉ hiển thị: Vật tư sắp hết' : 'Chỉ hiển thị: Vật tư ổn định'}
              </span>
              <button
                type="button"
                className="clear-filter-btn"
                onClick={() => {
                  setFilterMode('')
                  navigate('/manager/supplies', { replace: true })
                }}
                title="Xóa bộ lọc"
              >
                ×
              </button>
            </div>
          )}
        </div>

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
                    <span className="value">{supply.importDate ? formatDateTimeVN(supply.importDate) : '-'}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Ngày xuất:</span>
                    <span className="value">{supply.exportDate ? formatDateTimeVN(supply.exportDate) : '-'}</span>
                  </div>
                </div>

                <div className="supply-actions">
                  <button
                    type="button"
                    className="btn-set-min"
                    onClick={() => handleSetMinimum(supply)}
                    title="Đặt mức tối thiểu"
                  >
                    Đặt Mức Tối Thiểu
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h2>Thêm vật tư mới</h2>
            <form onSubmit={handleSubmitAdd}>
              <div className="form-group">
                <label>Tên vật tư *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Loại *</label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(event) => setFormData({ ...formData, type: event.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Số lượng *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(event) => setFormData({ ...formData, quantity: event.target.value })}
                    required
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Đơn vị *</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(event) => setFormData({ ...formData, unit: event.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Mức tối thiểu *</label>
                <input
                  type="number"
                  value={formData.minQuantity}
                  onChange={(event) => setFormData({ ...formData, minQuantity: event.target.value })}
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

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h2>Chỉnh sửa vật tư</h2>
            <form onSubmit={handleSubmitEdit}>
              <div className="form-group">
                <label>Tên vật tư *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Loại *</label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(event) => setFormData({ ...formData, type: event.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Số lượng *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(event) => setFormData({ ...formData, quantity: event.target.value })}
                    required
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Đơn vị *</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(event) => setFormData({ ...formData, unit: event.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Mức tối thiểu *</label>
                <input
                  type="number"
                  value={formData.minQuantity}
                  onChange={(event) => setFormData({ ...formData, minQuantity: event.target.value })}
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

      {showSetMinModal && selectedSupply && (
        <div className="modal-overlay" onClick={() => setShowSetMinModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h2>Đặt mức tối thiểu - {selectedSupply.name}</h2>
            <form onSubmit={handleSubmitSetMin}>
              <div className="form-group">
                <label>Mức tối thiểu mới *</label>
                <div className="input-with-unit">
                  <input
                    type="number"
                    value={minValue}
                    onChange={(event) => setMinValue(event.target.value)}
                    required
                    min="0"
                    placeholder="Nhập giá trị"
                  />
                  <span className="unit">{selectedSupply.unit}</span>
                </div>
                <small>Giá trị hiện tại: {selectedSupply.minQuantity} {selectedSupply.unit}</small>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowSetMinModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="primary">
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
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

export default ManagerSuppliesPage
