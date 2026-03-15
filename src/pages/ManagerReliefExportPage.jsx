import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArchiveBoxArrowDownIcon,
  ArrowLeftIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import managerService from '../services/managerService'
import './ManagerReliefExportPage.css'

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

const normalizeTextId = (value, fallback = '') => String(value ?? fallback).trim()

const toNumericIfPossible = (value) => {
  const numeric = Number(value)
  return Number.isNaN(numeric) ? value : numeric
}

const toFiniteNumber = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
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
  const [selectedRecipientId, setSelectedRecipientId] = useState('')
  const [supplyQuantities, setSupplyQuantities] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const fetchPageData = useCallback(async () => {
    setIsLoading(true)

    try {
      const [recipientResult, supplyResult] = await Promise.allSettled([
        managerService.getRecipientUnits(),
        managerService.getSupplies(),
      ])

      const hasUnauthorized = [recipientResult, supplyResult].some(
        (result) => result.status === 'rejected' && result.reason?.response?.status === 401,
      )

      if (hasUnauthorized) {
        navigate('/login', { replace: true })
        return
      }

      if (recipientResult.status === 'fulfilled') {
        const normalizedRecipients = recipientResult.value
          .map(normalizeRecipient)
          .filter((item) => item.id && item.name)
        setRecipientOptions(normalizedRecipients)
      } else {
        setRecipientOptions([])
      }

      if (supplyResult.status === 'fulfilled') {
        const normalizedSupplies = supplyResult.value
          .map(normalizeSupply)
          .filter((item) => item.id && item.name)
        setSupplies(normalizedSupplies)
      } else {
        setSupplies([])
      }

      const hasRejected = [recipientResult, supplyResult].some((result) => result.status === 'rejected')
      if (hasRejected) {
        setErrorMessage('Không thể tải đầy đủ dữ liệu từ hệ thống. Vui lòng thử lại.')
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

    const currentUser = authService.getUserInfo()
    const roleKey = String(currentUser?.role ?? '').toUpperCase()
    if (roleKey !== 'MANAGER' && roleKey !== 'ADMIN') {
      navigate('/', { replace: true })
      return
    }

    fetchPageData()
  }, [fetchPageData, navigate])

  const selectedRecipient = useMemo(
    () => recipientOptions.find((item) => String(item.id) === String(selectedRecipientId)) || null,
    [recipientOptions, selectedRecipientId],
  )

  const selectedSupplyItems = useMemo(
    () =>
      supplies
        .filter((supply) => hasOwn(supplyQuantities, String(supply.id)))
        .map((supply) => ({
          ...supply,
          rawQuantity: supplyQuantities[String(supply.id)],
          parsedQuantity: Number(supplyQuantities[String(supply.id)]),
        })),
    [supplies, supplyQuantities],
  )

  const supplyValidationMap = useMemo(() => {
    const next = {}

    selectedSupplyItems.forEach((item) => {
      const key = String(item.id)

      if (item.rawQuantity === '') {
        next[key] = 'Vui lòng nhập số lượng cần xuất.'
        return
      }

      if (!Number.isFinite(item.parsedQuantity) || item.parsedQuantity <= 0) {
        next[key] = 'Số lượng phải lớn hơn 0.'
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
      await managerService.createReliefExportOrder({
        recipientUnitId: toNumericIfPossible(selectedRecipient.id),
        recipientUnitName: selectedRecipient.name,
        recipientType: selectedRecipient.type,
        recipientRegion: selectedRecipient.region,
        supplyItems: validSelectedSupplyItems.map((item) => ({
          supplyId: toNumericIfPossible(item.id),
          quantity: item.parsedQuantity,
        })),
      })

      setSuccessMessage('Tạo phiếu xuất kho thành công.')
      resetForm()
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
        <button type="button" className="back-button" onClick={handleBack} aria-label="Quay lại" title="Quay lại">
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
      <button type="button" className="back-button" onClick={handleBack} aria-label="Quay lại" title="Quay lại">
        <ArrowLeftIcon className="icon" />
      </button>

      <header className="page-header">
        <p className="page-kicker">Điều phối kho cứu trợ</p>
        <h1>
          <ArchiveBoxArrowDownIcon className="icon" />
          Xuất kho cứu trợ
        </h1>
        <p className="page-description">
          Chọn đơn vị nhận, danh sách vật tư và phương tiện vận chuyển trước khi gửi phiếu xuất kho.
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
          <section className="panel">
            <div className="section-heading">
              <div className="section-title">
                <BuildingOffice2Icon className="icon" />
                <h2>Chọn đơn vị nhận</h2>
              </div>
              <span className="section-meta">{recipientOptions.length} đơn vị khả dụng</span>
            </div>

            <div className="recipient-grid">
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
              <span className="section-meta">{selectedSupplyItems.length} vật tư đã chọn</span>
            </div>

            <div className="table-wrap">
              <table className="data-table supplies-table">
                <thead>
                  <tr>
                    <th>Chọn</th>
                    <th>Vật tư</th>
                    <th>Loại</th>
                    <th>Tồn kho</th>
                    <th>Đơn vị</th>
                    <th>Số lượng xuất</th>
                  </tr>
                </thead>
                <tbody>
                  {supplies.length === 0 && (
                    <tr>
                      <td colSpan="6" className="empty-row">
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
                        <td>{supply.stockQuantity ?? '-'}</td>
                        <td>{supply.unit || '-'}</td>
                        <td>
                          <div className="quantity-input-wrap">
                            <input
                              type="number"
                              min="1"
                              max={supply.stockQuantity ?? undefined}
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

            <div className="summary-block">
              <h3>Vật tư đã chọn</h3>
              {validSelectedSupplyItems.length === 0 ? (
                <p className="summary-empty">Chưa có vật tư hợp lệ.</p>
              ) : (
                <div className="chip-list">
                  {validSelectedSupplyItems.map((item) => (
                    <span key={item.id} className="info-chip">
                      {item.name}: {item.parsedQuantity} {item.unit}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button type="button" className="submit-button" onClick={handleSubmit} disabled={!canSubmit}>
              {isSubmitting ? 'Đang tạo phiếu xuất kho...' : 'Gửi phiếu xuất kho'}
            </button>

            <p className="summary-note">
              Không thể xuất kho khi chưa chọn đơn vị nhận hoặc vật tư hợp lệ.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default ManagerReliefExportPage
