import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import managerService from '../services/managerService'
import './ManagerImportReceiptPage.css'

const DEFAULT_SUPPLIES = [
  { supplyId: 1, name: 'Nước uống đóng chai', type: 'Nhu yếu phẩm', unit: 'chai' },
  { supplyId: 2, name: 'Mì gói', type: 'Thực phẩm', unit: 'gói' },
  { supplyId: 3, name: 'Áo mưa', type: 'Quần áo', unit: 'cái' },
  { supplyId: 4, name: 'Thuốc men cơ bản', type: 'Y tế', unit: 'hộp' },
  { supplyId: 5, name: 'Chăn màn', type: 'Sinh hoạt', unit: 'cái' },
]

const DEFAULT_SOURCES = [
  {
    id: 'source-01',
    name: 'UBND Phường 22',
    type: 'Phường',
    region: 'Bình Thạnh, TP.HCM',
    address: '105 Nguyễn Hữu Cảnh, Phường 22, Bình Thạnh, TP.HCM',
  },
  {
    id: 'source-02',
    name: 'Điểm tiếp nhận Phường 2',
    type: 'Phường',
    region: 'Tân Bình, TP.HCM',
    address: '15 Hồng Hà, Phường 2, Tân Bình, TP.HCM',
  },
  {
    id: 'source-03',
    name: 'Ban điều phối Phường 9',
    type: 'Phường',
    region: 'Phú Nhuận, TP.HCM',
    address: '82 Hoàng Văn Thụ, Phường 9, Phú Nhuận, TP.HCM',
  },
  {
    id: 'source-04',
    name: 'UBND Phường Bến Nghé',
    type: 'Phường',
    region: 'Quận 1, TP.HCM',
    address: '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM',
  },
  {
    id: 'source-05',
    name: 'Điểm tập kết Phường 12',
    type: 'Phường',
    region: 'Quận 3, TP.HCM',
    address: '214 Nam Kỳ Khởi Nghĩa, Phường 12, Quận 3, TP.HCM',
  },
  {
    id: 'source-06',
    name: 'Ban cứu trợ Bình Hưng',
    type: 'Khu vực',
    region: 'Bình Chánh, TP.HCM',
    address: '28 Phạm Hùng, xã Bình Hưng, Bình Chánh, TP.HCM',
  },
]

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

const toFiniteNumber = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function ManagerImportReceiptPage() {
  const navigate = useNavigate()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  // Data from API
  const [supplies, setSupplies] = useState([])
  const [categories, setCategories] = useState([])
  
  // Form data
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [supplyQuantities, setSupplyQuantities] = useState({})
  
  // Validation
  const [supplyValidationMap, setSupplyValidationMap] = useState({})

  // Fetch danh sách vật tư và categories
  const fetchPageData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const [suppliesResult, categoriesResult] = await Promise.allSettled([
        managerService.getSupplies().catch(() => DEFAULT_SUPPLIES),
        managerService.getCategories().catch(() => []),
      ])

      // Normalize supplies
      let normalizedSupplies = []
      if (suppliesResult.status === 'fulfilled' && Array.isArray(suppliesResult.value)) {
        normalizedSupplies = suppliesResult.value
          .map((item) => ({
            id: item?.supplyId ?? item?.id,
            name: String(item?.name ?? '').trim() || 'Không rõ tên',
            type: String(item?.type ?? item?.categoryName ?? '').trim() || '-',
            unit: String(item?.unit ?? '').trim() || 'cái',
          }))
          .filter((item) => item.id)
      }
      setSupplies(normalizedSupplies)

      // Categories
      if (categoriesResult.status === 'fulfilled' && Array.isArray(categoriesResult.value)) {
        setCategories(categoriesResult.value)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setErrorMessage('Không thể tải dữ liệu. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login', { replace: true })
      return
    }

    const currentUser = authService.getUserInfo()
    const roleKey = String(currentUser?.role ?? '').toUpperCase()
    if (roleKey !== 'MANAGER' && roleKey !== 'ADMIN') {
      navigate('/', { replace: true })
      return
    }

    fetchPageData()
  }, [fetchPageData, navigate])

  // Selected supply items with quantity
  const selectedSupplyItems = useMemo(
    () =>
      supplies
        .filter((supply) => hasOwn(supplyQuantities, String(supply.id)))
        .map((supply) => ({
          ...supply,
          rawQuantity: supplyQuantities[String(supply.id)],
          parsedQuantity: toFiniteNumber(supplyQuantities[String(supply.id)]),
        })),
    [supplies, supplyQuantities],
  )

  // Total quantity
  const totalQuantity = useMemo(() => {
    return selectedSupplyItems.reduce((sum, item) => {
      return sum + (item.parsedQuantity ?? 0)
    }, 0)
  }, [selectedSupplyItems])

  const selectedSource = useMemo(
    () => DEFAULT_SOURCES.find((item) => String(item.id) === String(selectedSourceId)) || null,
    [selectedSourceId],
  )

  const canSubmit = useMemo(() => {
    if (!selectedSourceId) return false
    if (selectedSupplyItems.length === 0) return false
    
    // Check all selected supplies have valid quantities
    for (const item of selectedSupplyItems) {
      if (!item.parsedQuantity || item.parsedQuantity <= 0) return false
    }
    
    return !isLoading && !isSubmitting
  }, [selectedSourceId, selectedSupplyItems, isLoading, isSubmitting])

  const handleBack = () => {
    navigate('/manager')
  }

  const handleSelectSource = (sourceId) => {
    setSelectedSourceId(String(sourceId))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleToggleSupply = (supplyId) => {
    const key = String(supplyId)
    const newQuantities = { ...supplyQuantities }
    
    if (hasOwn(newQuantities, key)) {
      delete newQuantities[key]
      // Clear validation for this supply
      const newValidation = { ...supplyValidationMap }
      delete newValidation[key]
      setSupplyValidationMap(newValidation)
    } else {
      newQuantities[key] = ''
    }
    
    setSupplyQuantities(newQuantities)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleChangeSupplyQuantity = (supplyId, value) => {
    const key = String(supplyId)
    setSupplyQuantities({
      ...supplyQuantities,
      [key]: value,
    })
    
    // Validate
    const newValidation = { ...supplyValidationMap }
    const numericValue = toFiniteNumber(value)
    
    if (!value || !numericValue || numericValue <= 0) {
      newValidation[key] = 'Số lượng phải lớn hơn 0'
    } else {
      delete newValidation[key]
    }
    
    setSupplyValidationMap(newValidation)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    
    // Validate
    if (!selectedSourceId) {
      setErrorMessage('Vui lòng chọn đơn vị nhận')
      return
    }
    
    if (selectedSupplyItems.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một vật tư')
      return
    }
    
    // Validate quantities
    const validationErrors = {}
    for (const item of selectedSupplyItems) {
      if (!item.parsedQuantity || item.parsedQuantity <= 0) {
        validationErrors[String(item.id)] = 'Số lượng không hợp lệ'
      }
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setSupplyValidationMap(validationErrors)
      setErrorMessage('Vui lòng kiểm tra lại số lượng các vật tư đã chọn')
      return
    }
    
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')
    
    try {
      const payload = {
        source: selectedSource?.name || '',
        receive_address: selectedSource?.address || '',
        items: selectedSupplyItems.map((item) => ({
          item_id: item.id,
          category_id: categories.find(c => c.name === item.type)?.categoryId || 1,
          quantity: item.parsedQuantity,
        })),
      }
      
      await managerService.createImportReceipt(payload)
      
      setSuccessMessage('Tạo phiếu nhập kho thành công!')
      
      // Reset form sau 2 giây
      setTimeout(() => {
        navigate('/manager/import-receipts')
      }, 1500)
    } catch (error) {
      console.error('Error creating import receipt:', error)
      if (error?.response?.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      const errorMsg = error?.response?.data?.message || 'Không thể tạo phiếu nhập kho. Vui lòng thử lại.'
      setErrorMessage(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="manager-import-receipt-page">
        <button type="button" className="back-button" onClick={handleBack}>
          <ArrowLeftIcon className="icon" />
          Quay lại
        </button>
        <div className="page-loading">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu nhập kho...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="manager-import-receipt-page">
      <button type="button" className="back-button" onClick={handleBack}>
        <ArrowLeftIcon className="icon" />
        Quay lại
      </button>

      <header className="page-header">
        <p className="page-kicker">Quản lý kho cứu trợ</p>
        <h1>
          <ClipboardDocumentListIcon className="icon" />
          Nhập kho cứu trợ
        </h1>
        <p className="page-description">
          Nhập thông tin nguồn hàng và chọn danh sách vật tư cần nhập vào kho.
        </p>
      </header>

      {errorMessage && (
        <div className="feedback-banner error">
          <ExclamationTriangleIcon className="icon" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="feedback-banner success">
          <CheckCircleIcon className="icon" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="page-grid">
        <main className="page-main">
          {/* Section 1: Chọn đơn vị nhận */}
          <section className="panel">
            <div className="section-heading">
              <div className="section-title">
                <BuildingOffice2Icon className="icon" />
                <h2>Chọn đơn vị nhập</h2>
              </div>
              <span className="section-meta">{DEFAULT_SOURCES.length} đơn vị khả dụng</span>
            </div>

            <div className="recipient-grid">
              {DEFAULT_SOURCES.map((source) => {
                const isSelected = String(source.id) === String(selectedSourceId)

                return (
                  <button
                    key={source.id}
                    type="button"
                    className={`recipient-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectSource(source.id)}
                    disabled={isSubmitting}
                  >
                    <span className="recipient-type">{source.type}</span>
                    <strong>{source.name}</strong>
                    <span className="recipient-region">{source.region || 'Chưa có khu vực'}</span>
                    <span className="recipient-address">
                      <MapPinIcon className="icon" />
                      {source.address || 'Chưa có địa chỉ chi tiết'}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Section 2: Chọn danh sách vật tư */}
          <section className="panel">
            <div className="section-heading">
              <div className="section-title">
                <CubeIcon className="icon" />
                <h2>Chọn danh sách vật tư cứu trợ</h2>
              </div>
              <span className="section-meta">{selectedSupplyItems.length} vật tư đã chọn</span>
            </div>

            <div className="table-wrap">
              <table className="data-table supplies-table">
                <thead>
                  <tr>
                    <th>Chọn</th>
                    <th>Vật tư</th>
                    <th>Loại</th>
                    <th>Đơn vị</th>
                    <th>Số lượng nhập</th>
                  </tr>
                </thead>
                <tbody>
                  {supplies.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty-row">
                        Không có vật tư khả dụng.
                      </td>
                    </tr>
                  )}

                  {supplies.map((supply) => {
                    const key = String(supply.id)
                    const isSelected = hasOwn(supplyQuantities, key)
                    const validationMessage = supplyValidationMap[key]

                    return (
                      <tr key={supply.id} className={isSelected ? 'is-selected' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSupply(supply.id)}
                            disabled={isSubmitting}
                          />
                        </td>
                        <td className="supply-name-cell">
                          <strong>{supply.name}</strong>
                        </td>
                        <td>{supply.type || '-'}</td>
                        <td>{supply.unit || '-'}</td>
                        <td>
                          <div className="quantity-input-wrap">
                            <input
                              type="number"
                              min="1"
                              step="0.01"
                              value={isSelected ? supplyQuantities[key] : ''}
                              onChange={(event) => handleChangeSupplyQuantity(supply.id, event.target.value)}
                              disabled={!isSelected || isSubmitting}
                              placeholder="Nhập số lượng"
                            />
                            {validationMessage && <span className="field-error">{validationMessage}</span>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        {/* Sidebar: Summary */}
        <aside className="page-sidebar">
          <section className="panel summary-panel">
            <div className="section-title">
              <CheckCircleIcon className="icon" />
              <h2>Thông tin tổng hợp</h2>
            </div>

            <div className="summary-stats">
              <div className="summary-item">
                <span>Đơn vị nhận</span>
                <strong>{selectedSource ? selectedSource.name : 'Chưa chọn'}</strong>
              </div>
              <div className="summary-item">
                <span>Số loại vật tư</span>
                <strong>{selectedSupplyItems.length}</strong>
              </div>
              <div className="summary-item">
                <span>Tổng số lượng</span>
                <strong>{totalQuantity}</strong>
              </div>
            </div>

            <div className="summary-block">
              <h3>Vật tư đã chọn</h3>
              {selectedSupplyItems.length === 0 ? (
                <p className="summary-empty">Chưa chọn vật tư nào</p>
              ) : (
                <div className="chip-list">
                  {selectedSupplyItems.map((item) => (
                    <div key={item.id} className="info-chip">
                      {item.name} × {item.parsedQuantity || 0}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="submit-button"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Gửi phiếu nhập kho'}
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default ManagerImportReceiptPage
