import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ArrowUpOnSquareIcon,
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
import './ManagerReliefExportPage.css'


const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)
const SUPPLY_ITEM_SEARCH_DEBOUNCE_MS = 350

const normalizeTextId = (value, fallback = '') => String(value ?? fallback).trim()
const normalizeSupplySearchKeyword = (value) =>
  String(value ?? '')
    .replace(/[^\p{L}\s]/gu, '')
    .replace(/\s{2,}/g, ' ')

const toNumericIfPossible = (value) => {
  const numeric = Number(value)
  return Number.isNaN(numeric) ? value : numeric
}

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

const normalizeRecipient = (item) => {
  const name = String(
    item?.receiverUnitName ??
      item?.receiver_unit_name ??
      item?.unitName ??
      item?.unit_name ??
      item?.name ??
      '',
  ).trim()
  const id = normalizeTextId(
    item?.receiverUnitId ?? item?.receiver_unit_id ?? item?.unitId ?? item?.unit_id ?? item?.id,
    name,
  )

  return {
    id,
    name,
    type: String(
      item?.receiverType ?? item?.receiver_type ?? item?.unitType ?? item?.unit_type ?? item?.type ?? 'Khu vực',
    ).trim(),
    region: String(item?.region ?? item?.province ?? item?.city ?? item?.district ?? '').trim(),
    address: String(item?.address ?? item?.fullAddress ?? item?.location ?? '').trim(),
  }
}

const normalizeSupply = (item) => {
  const id = normalizeTextId(item?.supplyId ?? item?.supply_id ?? item?.id)
  const name = String(item?.name ?? item?.supplyName ?? item?.supply_name ?? '').trim()

  return {
    id,
    name,
    type: String(item?.type ?? item?.category ?? item?.supplyType ?? item?.supply_type ?? '').trim(),
    unit: String(item?.unit ?? item?.unitName ?? item?.unit_name ?? 'đơn vị').trim(),
    stockQuantity: toFiniteNumber(item?.stockQuantity ?? item?.quantityInStock ?? item?.availableQuantity ?? item?.quantity),
  }
}

function ManagerReliefExportPage() {
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recipientOptions, setRecipientOptions] = useState([])
  const [supplies, setSupplies] = useState([])
  const [supplyLookup, setSupplyLookup] = useState({})
  const [selectedRecipientId, setSelectedRecipientId] = useState('')
  const [supplyQuantities, setSupplyQuantities] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [note, setNote] = useState('')
  const [supplySearchTerm, setSupplySearchTerm] = useState('')
  const [debouncedSupplySearchTerm, setDebouncedSupplySearchTerm] = useState('')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const hasLoadedInitialDataRef = useRef(false)
  const supplySearchRequestIdRef = useRef(0)

  const syncSupplyLookup = useCallback((items) => {
    setSupplyLookup((previousLookup) => {
      const nextLookup = { ...previousLookup }

      items.forEach((item) => {
        if (item?.id) {
          nextLookup[String(item.id)] = item
        }
      })

      return nextLookup
    })
  }, [])

  const loadSupplies = useCallback(
    async (keyword = '') => {
      const requestId = supplySearchRequestIdRef.current + 1
      supplySearchRequestIdRef.current = requestId

      try {
        const supplyResult = await managerService.getSupplies(
          keyword
            ? {
                searchBy: 'itemName',
                keyword,
              }
            : undefined,
        )
        const normalizedSupplies = supplyResult.map(normalizeSupply).filter((item) => item.id && item.name)

        if (requestId !== supplySearchRequestIdRef.current) {
          return
        }

        setSupplies(normalizedSupplies)
        syncSupplyLookup(normalizedSupplies)
      } catch (error) {
        if (requestId !== supplySearchRequestIdRef.current) {
          return
        }

        if (error?.response?.status === 401) {
          navigate('/login', { replace: true })
          return
        }

        setSupplies([])
        setErrorMessage('Khong the tai danh sach vat tu tu he thong. Vui long thu lai.')
      }
    },
    [navigate, syncSupplyLookup],
  )

  const fetchPageData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Lấy đơn vị xuất từ API mới
      try {
        const res = await api.get('/StockUnit/export-options')
        const exportOptions = Array.isArray(res.data)
          ? res.data
          : (res.data?.data || res.data?.Data || [])
        setRecipientOptions(exportOptions.map((item) => ({
          id: item.id || `source-${item.stockUnitId ?? item.id}`,
          stockUnitId: item.stockUnitId ?? item.id,
          name: item.name,
          type: item.type,
          region: item.region,
          address: item.address,
          supportsImport: Boolean(item.supportsImport),
          supportsExport: Boolean(item.supportsExport),
        })))
      } catch (err) {
        setRecipientOptions([])
      }

      // Fetch supplies from API
      try {
        const supplyResult = await managerService.getSupplies()
        const normalizedSupplies = supplyResult
          .map(normalizeSupply)
          .filter((item) => item.id && item.name)
        setSupplies(normalizedSupplies)
        syncSupplyLookup(normalizedSupplies)
      } catch (error) {
        if (error?.response?.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setSupplies([])
        setErrorMessage('Không thể tải danh sách vật tư từ hệ thống. Vui lòng thử lại.')
      }
    } finally {
      hasLoadedInitialDataRef.current = true
      setIsLoading(false)
    }
  }, [navigate, syncSupplyLookup])

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
    const normalizedKeyword = normalizeSupplySearchKeyword(supplySearchTerm).trim()
    const timeoutId = window.setTimeout(
      () => {
        setDebouncedSupplySearchTerm(normalizedKeyword)
      },
      normalizedKeyword ? SUPPLY_ITEM_SEARCH_DEBOUNCE_MS : 0,
    )

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [supplySearchTerm])

  useEffect(() => {
    if (!hasLoadedInitialDataRef.current) {
      return
    }

    loadSupplies(debouncedSupplySearchTerm)
  }, [debouncedSupplySearchTerm, loadSupplies])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 420)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const selectedRecipient = useMemo(
    () => recipientOptions.find((item) => String(item.id) === String(selectedRecipientId)) || null,
    [recipientOptions, selectedRecipientId],
  )

  const selectedSupplyItems = useMemo(
    () =>
      Object.keys(supplyQuantities)
        .map((supplyId) => {
          const supply = supplyLookup[String(supplyId)]
          if (!supply) {
            return null
          }

          return ({
          ...supply,
          rawQuantity: supplyQuantities[String(supply.id)],
          parsedQuantity: Number(supplyQuantities[String(supply.id)]),
          })
        })
        .filter(Boolean),
    [supplyLookup, supplyQuantities],
  )

  const filteredSupplies = useMemo(() => {
    return supplies
  }, [supplies])

  const supplyValidationMap = useMemo(() => {
    const next = {}

    selectedSupplyItems.forEach((item) => {
      const key = String(item.id)

      if (item.rawQuantity === '') {
        next[key] = 'Vui lòng nhập số lượng cần xuất.'
        return
      }

      // Chỉ cho phép số nguyên dương
      if (!Number.isFinite(item.parsedQuantity) || item.parsedQuantity <= 0 || !Number.isInteger(Number(item.rawQuantity))) {
        next[key] = 'Sai định dạng vui lòng thử lại!'
        return
      }

      if (item.stockQuantity !== null && item.parsedQuantity > item.stockQuantity) {
        next[key] = 'Số lượng vượt quá tồn kho hiện có.'
      }
    })

    return next
  }, [selectedSupplyItems])

  const validSelectedSupplyItems = useMemo(
    () => selectedSupplyItems.filter((item) => !supplyValidationMap[String(item.id)]),
    [selectedSupplyItems, supplyValidationMap],
  )

  const totalRequestedQuantity = useMemo(
    () => validSelectedSupplyItems.reduce((sum, item) => sum + item.parsedQuantity, 0),
    [validSelectedSupplyItems],
  )

  const canSubmit =
    Boolean(selectedRecipient) &&
    selectedSupplyItems.length > 0 &&
    Object.keys(supplyValidationMap).length === 0 &&
    !isLoading &&
    !isSubmitting

  const handleBack = () => {
    navigate('/manager')
  }

  const handleSelectRecipient = (recipientId) => {
    setSelectedRecipientId(String(recipientId))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleToggleSupply = (supplyId) => {
    const key = String(supplyId)

    setSupplyQuantities((prev) => {
      if (hasOwn(prev, key)) {
        const next = { ...prev }
        delete next[key]
        return next
      }

      return {
        ...prev,
        [key]: '1',
      }
    })

    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleChangeSupplyQuantity = (supplyId, value) => {
    const key = String(supplyId)
    setSupplyQuantities((prev) => ({
      ...prev,
      [key]: value,
    }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const resetForm = () => {
    setSelectedRecipientId('')
    setSupplyQuantities({})
  }

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    if (!selectedRecipient) {
      setErrorMessage('Vui lòng chọn đơn vị nhận cứu trợ.')
      return
    }

    if (selectedSupplyItems.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một vật tư để xuất kho.')
      return
    }

    if (Object.keys(supplyValidationMap).length > 0) {
      setErrorMessage('Vui lòng kiểm tra lại số lượng vật tư trước khi gửi.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      // Gọi API tạo đơn xuất cứu trợ: POST /api/StockHistory/export
      // Payload gồm: recipient info, supplyItems (supplyId, quantity), notes, vehicleIds
      // BE tạo StockHistory record (type=OUT), update ReliefItem quantity
      await managerService.createReliefExportOrder({
        ...selectedRecipient,
        stockUnitId: selectedRecipient.stockUnitId, // truyền đúng stockUnitId cho backend
        note: note || `Xuất cứu trợ cho ${selectedRecipient.name}`,
        teamId: toNumericIfPossible(selectedRecipient.stockUnitId ?? selectedRecipient.id),
        destination: selectedRecipient.name,
        recipientAddress: selectedRecipient.address,
        address: selectedRecipient.address,
        supplyItems: validSelectedSupplyItems.map((item) => ({
          supplyId: toNumericIfPossible(item.id),
          quantity: item.parsedQuantity,
        })),
        vehicleIds: [], // TODO: Implement vehicle selection form and wire up selectedVehicleIds
      })

      setSuccessMessage('Tạo phiếu xuất kho thành công.')
      // Reset form và chuyển trang sau 1.5 giây
      setTimeout(() => {
        resetForm()
        navigate('/manager/import-receipts')
      }, 1500)
      await fetchPageData()
    } catch (error) {
      if (error?.response?.status === 401) {
        navigate('/login', { replace: true })
        return
      }

      if (error?.response?.status === 404) {
        setErrorMessage('API tạo phiếu xuất kho chưa sẵn sàng hoặc endpoint chưa được cấu hình.')
      } else {
        setErrorMessage(managerService.getErrorMessage(error))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="manager-relief-export-page">
        <button type="button" className="back-button" onClick={handleBack}>
          <ArrowLeftIcon className="icon" />
          
        </button>
        <div className="page-loading">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu xuất kho cứu trợ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="manager-relief-export-page">
      <button type="button" className="back-button" onClick={handleBack}>
        <ArrowLeftIcon className="icon" />
        
      </button>

      <header className="page-header">
        <p className="page-kicker">Điều phối kho cứu trợ</p>
        <h1>
          <ArrowUpOnSquareIcon className="icon" />
          Xuất kho cứu trợ
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
          <section className="panel">
            <div className="section-heading">
              <div className="section-title">
                <BuildingOffice2Icon className="icon" />
                <h2>Chọn đơn vị nhận</h2>
              </div>
            </div>

            <div
              className="recipient-grid"
              style={{ '--recipient-grid-columns': resolveRecipientGridColumns(recipientOptions.length) }}
            >
              {recipientOptions.map((recipient) => {
                const isSelected = String(recipient.id) === String(selectedRecipientId)

                return (
                  <button
                    key={recipient.id}
                    type="button"
                    className={`recipient-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectRecipient(recipient.id)}
                  >
                    <span className="recipient-type">{recipient.type}</span>
                    <strong>{recipient.name}</strong>
                    <span className="recipient-region">{recipient.region || 'Chưa có khu vực'}</span>
                    <span className="recipient-address">
                      <MapPinIcon className="icon" />
                      {recipient.address || 'Chưa có địa chỉ chi tiết'}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="panel">
            <div className="section-heading">
              <div className="section-title">
                <CubeIcon className="icon" />
                <h2>Chọn danh sách vật tư điều phối</h2>
              </div>
              <div className="section-tools">
                {selectedSupplyItems.length > 0 && (
                  <span className="section-meta">{selectedSupplyItems.length} vật tư đã chọn</span>
                )}
                <label className="supply-search" htmlFor="manager-export-supply-search">
                  <MagnifyingGlassIcon className="icon" />
                  <input
                    id="manager-export-supply-search"
                    type="text"
                    value={supplySearchTerm}
                    onChange={(event) => setSupplySearchTerm(normalizeSupplySearchKeyword(event.target.value))}
                    placeholder="Tìm theo tên vật tư"
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
                    <th>Tồn kho</th>
                    <th>Đơn vị</th>
                    <th>Số lượng xuất</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSupplies.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty-row">
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
                        <td>{supply.stockQuantity ?? '-'}</td>
                        <td>{supply.unit || '-'}</td>
                        <td>
                          <div className="quantity-input-wrap">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              max={supply.stockQuantity ?? undefined}
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

        <aside className="page-sidebar">
          <section className="panel summary-panel">
            <div className="section-title">
              <CheckCircleIcon className="icon" />
              <h2>Thông tin tổng hợp</h2>
            </div>

            <div className="summary-stats">
              <div className="summary-item">
                <span>Đơn vị nhận</span>
                <strong>{selectedRecipient ? selectedRecipient.name : 'Chưa chọn'}</strong>
              </div>
              <div className="summary-item">
                <span>Tổng số lượng vật tư xuất</span>
                <strong>{totalRequestedQuantity}</strong>
              </div>
            </div>

            <button type="button" className="submit-button" onClick={handleSubmit} disabled={!canSubmit}>
              {isSubmitting ? 'Đang tạo phiếu xuất kho...' : 'Gửi phiếu xuất kho'}
            </button>

            <div className="summary-block">
              <h3>Vật tư đã chọn</h3>
              {validSelectedSupplyItems.length === 0 ? (
                <p className="summary-empty">Chưa có vật tư hợp lệ.</p>
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
                      {validSelectedSupplyItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.unit}</td>
                          <td>{item.parsedQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Ô ghi chú giống UI RequestForm */}
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

            <p className="summary-note">
              
            </p>
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

export default ManagerReliefExportPage

