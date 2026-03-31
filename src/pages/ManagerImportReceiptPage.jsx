import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ArrowDownOnSquareIcon,
  BuildingOffice2Icon,
  ChevronUpIcon,
  CheckCircleIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import managerService from '../services/managerService'
import api from '../services/api'
import './ManagerImportReceiptPage.css'

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

const toFiniteNumber = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const resolveRecipientGridColumns = (count) => {
  const total = Math.max(1, Number(count) || 0)
  const maxColumns = Math.min(4, total)
  let bestColumns = 1
  let bestScore = Number.POSITIVE_INFINITY

  for (let columns = 1; columns <= maxColumns; columns += 1) {
    const rows = Math.ceil(total / columns)
    const emptySlots = rows * columns - total
    const score =
      emptySlots * 10 +
      (emptySlots === 1 ? 2 : 0) +
      Math.abs(rows - columns) +
      (columns === 1 ? 6 : 0) -
      columns * 0.1

    if (score < bestScore) {
      bestScore = score
      bestColumns = columns
    }
  }

  return bestColumns
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
  const [sourceOptions, setSourceOptions] = useState([])
  const [supplySearchTerm, setSupplySearchTerm] = useState('')
  const [showScrollTop, setShowScrollTop] = useState(false)
  
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
        managerService.getSupplies(),
        managerService.getCategories(),
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
      } else {
        setCategories([])
      }

      // Lấy đơn vị nhập từ API mới
      try {
        const res = await api.get('/StockUnit/import-options')
        const importOptions = Array.isArray(res.data)
          ? res.data
          : (res.data?.data || res.data?.Data || [])
        setSourceOptions(importOptions.map((item) => ({
          id: item.id || `source-${item.stockUnitId ?? item.id}`,
          name: item.name,
          type: item.type,
          region: item.region,
          address: item.address,
          supportsImport: Boolean(item.supportsImport),
          supportsExport: Boolean(item.supportsExport),
          stockUnitId: item.stockUnitId ?? item.id,
        })))
      } catch (err) {
        setSourceOptions([])
      }

      const hasRejected = [suppliesResult, categoriesResult].some(
        (result) => result.status === 'rejected',
      )
      if (hasRejected) {
        setErrorMessage('Không thể tải đầy đủ dữ liệu từ hệ thống. Vui lòng thử lại.')
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

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 420)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  const filteredSupplies = useMemo(() => {
    const keyword = String(supplySearchTerm ?? '').trim().toLowerCase()
    if (!keyword) {
      return supplies
    }

    return supplies.filter((supply) => {
      const haystack = [supply.name, supply.type, supply.unit].join(' ').toLowerCase()
      return haystack.includes(keyword)
    })
  }, [supplies, supplySearchTerm])

  // Total quantity
  const totalQuantity = useMemo(() => {
    return selectedSupplyItems.reduce((sum, item) => {
      return sum + (item.parsedQuantity ?? 0)
    }, 0)
  }, [selectedSupplyItems])

  const selectedSource = useMemo(
    () => sourceOptions.find((item) => String(item.id) === String(selectedSourceId)) || null,
    [sourceOptions, selectedSourceId],
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
      newQuantities[key] = '1'
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
    
    // Validate chỉ cho phép số nguyên dương
    const newValidation = { ...supplyValidationMap }
    const numericValue = toFiniteNumber(value)
    if (!value || !numericValue || numericValue <= 0 || !Number.isInteger(Number(value))) {
      newValidation[key] = 'Sai định dạng vui lòng thử lại!'
    } else {
      delete newValidation[key]
    }
    setSupplyValidationMap(newValidation)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    
    // Validate
    if (!selectedSourceId) {
      setErrorMessage('Vui lòng chọn đơn vị nhập')
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
        ...selectedSource,
        source: selectedSource?.name || '',
        receive_address: selectedSource?.address || '',
        receiveAddress: selectedSource?.address || '',
        address: selectedSource?.address || '',
        note: note || '',
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

  const [note, setNote] = useState('')

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isLoading) {
    return (
      <div className="manager-import-receipt-page">
        <button type="button" className="back-button" onClick={handleBack}>
          <ArrowLeftIcon className="icon" />
          
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
      </button>

      <header className="page-header">
        <p className="page-kicker">Quản lý kho cứu trợ</p>
        <h1>
          <ArrowDownOnSquareIcon className="icon" />
          Nhập kho cứu trợ
        </h1>
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
            </div>

            <div
              className="recipient-grid"
              style={{ '--recipient-grid-columns': resolveRecipientGridColumns(sourceOptions.length) }}
            >
              {sourceOptions.length === 0 && (
                <div className="empty-row">Chưa có nguồn nhập từ dữ liệu hệ thống.</div>
              )}

              {sourceOptions.map((source) => {
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
              <div className="section-tools">
                {selectedSupplyItems.length > 0 && (
                  <span className="section-meta">{selectedSupplyItems.length} vật tư đã chọn</span>
                )}
                <label className="supply-search" htmlFor="manager-import-supply-search">
                  <MagnifyingGlassIcon className="icon" />
                  <input
                    id="manager-import-supply-search"
                    type="text"
                    value={supplySearchTerm}
                    onChange={(event) => setSupplySearchTerm(event.target.value)}
                    placeholder="Tìm vật tư..."
                  />
                </label>
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table supplies-table">
                <thead>
                  <tr>
                    <th>Vật tư</th>
                    <th>Loại</th>
                    <th>Đơn vị</th>
                    <th>Số lượng nhập</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSupplies.length === 0 && (
                    <tr>
                      <td colSpan="4" className="empty-row">
                        {supplies.length === 0 ? 'Không có vật tư khả dụng.' : 'Không tìm thấy vật tư phù hợp.'}
                      </td>
                    </tr>
                  )}

                  {filteredSupplies.map((supply) => {
                    const key = String(supply.id)
                    const isSelected = hasOwn(supplyQuantities, key)
                    const validationMessage = supplyValidationMap[key]

                    return (
                      <tr
                        key={supply.id}
                        className={`supply-row ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => !isSubmitting && handleToggleSupply(supply.id)}
                      >
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
                              step="1"
                              value={isSelected ? supplyQuantities[key] : ''}
                              onChange={(event) => handleChangeSupplyQuantity(supply.id, event.target.value)}
                              onClick={(event) => event.stopPropagation()}
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

            <button
              type="button"
              className="submit-button"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Gửi phiếu nhập kho'}
            </button>

            <div className="summary-block">
              <h3>Vật tư đã chọn</h3>
              {selectedSupplyItems.length === 0 ? (
                <p className="summary-empty">Chưa chọn vật tư nào</p>
              ) : (
                <div className="summary-table-wrap">
                  <table className="summary-table">
                    <thead>
                      <tr>
                        <th>Vật tư</th>
                        <th>Đơn vị</th>
                        <th>Số lượng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSupplyItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.unit || '-'}</td>
                          <td>{item.parsedQuantity || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Ô ghi chú giống export */}
            <label className="note-label">Ghi chú (tùy chọn)</label>
            <div className="form-field">
              <textarea
                className="note-textarea"
                rows="4"
                value={note || ''}
                onChange={e => setNote(e.target.value)}
                placeholder="Nhập thêm thông tin chi tiết nếu cần..."
                style={{ width: '100%' }}
                disabled={isSubmitting}
              />
            </div>

          </section>
        </aside>
      </div>

      {showScrollTop && (
        <button type="button" className="scroll-top-button" onClick={handleScrollToTop} aria-label="Lên đầu trang">
          <ChevronUpIcon className="icon" />
        </button>
      )}
    </div>
  )
}

export default ManagerImportReceiptPage
