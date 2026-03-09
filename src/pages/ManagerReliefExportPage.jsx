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
  TruckIcon,
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import managerService from '../services/managerService'
import './ManagerReliefExportPage.css'

const DEFAULT_RECIPIENTS = [
  {
    id: 'ward-01',
    name: 'UBND Phường 22',
    type: 'Phường',
    region: 'Bình Thạnh, TP.HCM',
    address: '105 Nguyễn Hữu Cảnh, Phường 22, Bình Thạnh, TP.HCM',
  },
  {
    id: 'ward-02',
    name: 'Điểm tiếp nhận Phường 2',
    type: 'Phường',
    region: 'Tân Bình, TP.HCM',
    address: '15 Hồng Hà, Phường 2, Tân Bình, TP.HCM',
  },
  {
    id: 'ward-03',
    name: 'Ban điều phối Phường 9',
    type: 'Phường',
    region: 'Phú Nhuận, TP.HCM',
    address: '82 Hoàng Văn Thụ, Phường 9, Phú Nhuận, TP.HCM',
  },
  {
    id: 'ward-04',
    name: 'UBND Phường Bến Nghé',
    type: 'Phường',
    region: 'Quận 1, TP.HCM',
    address: '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM',
  },
  {
    id: 'ward-05',
    name: 'Điểm tập kết Phường 12',
    type: 'Phường',
    region: 'Quận 3, TP.HCM',
    address: '214 Nam Kỳ Khởi Nghĩa, Phường 12, Quận 3, TP.HCM',
  },
  {
    id: 'ward-06',
    name: 'Ban cứu trợ Bình Hưng',
    type: 'Khu vực',
    region: 'Bình Chánh, TP.HCM',
    address: '28 Phạm Hùng, xã Bình Hưng, Bình Chánh, TP.HCM',
  },
]

const DEFAULT_SUPPLIES = [
  { id: 1, name: 'Nước uống đóng chai', type: 'Nhu yếu phẩm', stockQuantity: 500, unit: 'chai' },
  { id: 2, name: 'Mì gói', type: 'Thực phẩm', stockQuantity: 300, unit: 'gói' },
  { id: 3, name: 'Áo mưa', type: 'Trang bị', stockQuantity: 120, unit: 'cái' },
  { id: 4, name: 'Thuốc men cơ bản', type: 'Y tế', stockQuantity: 200, unit: 'hộp' },
  { id: 5, name: 'Chăn mền', type: 'Sinh hoạt', stockQuantity: 80, unit: 'cái' },
]

const VEHICLE_STATUS_LABELS = {
  AVAILABLE: 'Sẵn sàng',
  INUSE: 'Đang sử dụng',
  MAINTENANCE: 'Bảo trì',
  DISABLED: 'Ngừng hoạt động',
}

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

const normalizeTextId = (value, fallback = '') => String(value ?? fallback).trim()

const normalizeVehicleStatus = (status) =>
  String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '')

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

const normalizeVehicle = (item) => ({
  id: normalizeTextId(item?.vehicleId ?? item?.vehicle_id ?? item?.id),
  vehicleCode: String(item?.vehicleCode ?? item?.vehicle_code ?? '').trim(),
  name: String(item?.vehicleName ?? item?.vehicle_name ?? item?.name ?? '').trim(),
  vehicleTypeName: String(item?.vehicleTypeName ?? item?.vehicle_type_name ?? item?.vehicleType ?? '').trim(),
  licensePlate: String(item?.licensePlate ?? item?.plateNumber ?? item?.plate_number ?? '').trim(),
  capacity: toFiniteNumber(item?.capacity),
  currentLocation: String(item?.currentLocation ?? item?.current_location ?? '').trim(),
  status: normalizeVehicleStatus(item?.status),
})

function ManagerReliefExportPage() {
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recipientOptions, setRecipientOptions] = useState([])
  const [supplies, setSupplies] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [selectedRecipientId, setSelectedRecipientId] = useState('')
  const [selectedVehicleIds, setSelectedVehicleIds] = useState([])
  const [supplyQuantities, setSupplyQuantities] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const fetchPageData = useCallback(async () => {
    setIsLoading(true)

    try {
      const [recipientResult, supplyResult, vehicleResult] = await Promise.allSettled([
        managerService.getRecipientUnits(),
        managerService.getSupplies(),
        managerService.getAllVehicles('AVAILABLE'),
      ])

      const hasUnauthorized = [recipientResult, supplyResult, vehicleResult].some(
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
        setRecipientOptions(normalizedRecipients.length > 0 ? normalizedRecipients : DEFAULT_RECIPIENTS)
      } else {
        setRecipientOptions(DEFAULT_RECIPIENTS)
      }

      if (supplyResult.status === 'fulfilled') {
        const normalizedSupplies = supplyResult.value
          .map(normalizeSupply)
          .filter((item) => item.id && item.name)
        setSupplies(normalizedSupplies.length > 0 ? normalizedSupplies : DEFAULT_SUPPLIES)
      } else {
        setSupplies(DEFAULT_SUPPLIES)
      }

      if (vehicleResult.status === 'fulfilled') {
        const normalizedVehicles = vehicleResult.value
          .map(normalizeVehicle)
          .filter((item) => item.id)
          .filter((item) => !item.status || item.status === 'AVAILABLE')
        setVehicles(normalizedVehicles)
      } else {
        setVehicles([])
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

  const selectedVehicleIdSet = useMemo(() => new Set(selectedVehicleIds), [selectedVehicleIds])

  const selectedVehicles = useMemo(
    () => vehicles.filter((vehicle) => selectedVehicleIdSet.has(String(vehicle.id))),
    [selectedVehicleIdSet, vehicles],
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
    selectedVehicleIds.length > 0 &&
    selectedSupplyItems.length > 0 &&
    Object.keys(supplyValidationMap).length === 0 &&
    !isLoading &&
    !isSubmitting

  const handleBack = () => {
    navigate('/manager/vehicles')
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

  const handleToggleVehicle = (vehicleId) => {
    const key = String(vehicleId)

    setSelectedVehicleIds((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    )
    setErrorMessage('')
    setSuccessMessage('')
  }

  const resetForm = () => {
    setSelectedRecipientId('')
    setSelectedVehicleIds([])
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

    if (selectedVehicleIds.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một phương tiện vận chuyển.')
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
        vehicleIds: selectedVehicleIds.map((item) => toNumericIfPossible(item)),
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
        <button type="button" className="back-button" onClick={handleBack}>
          <ArrowLeftIcon className="icon" />
          Quay lại
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
        Quay lại
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

          <section className="panel">
            <div className="section-heading">
              <div className="section-title">
                <TruckIcon className="icon" />
                <h2>Chọn phương tiện vận chuyển</h2>
              </div>
              <span className="section-meta">Chỉ hiển thị phương tiện sẵn sàng</span>
            </div>

            <div className="selection-toolbar">
              <strong>Danh sách xe sẵn sàng</strong>
              <span>Đã chọn: {selectedVehicleIds.length}</span>
            </div>

            <div className="table-wrap">
              <table className="data-table vehicle-table">
                <thead>
                  <tr>
                    <th>Chọn</th>
                    <th>Mã xe</th>
                    <th>Tên xe</th>
                    <th>Biển số</th>
                    <th>Loại xe</th>
                    <th>Sức chứa</th>
                    <th>Vị trí</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.length === 0 && (
                    <tr>
                      <td colSpan="8" className="empty-row">
                        Không có phương tiện phù hợp để điều phối.
                      </td>
                    </tr>
                  )}

                  {vehicles.map((vehicle) => {
                    const isChecked = selectedVehicleIdSet.has(String(vehicle.id))

                    return (
                      <tr key={vehicle.id} className={isChecked ? 'is-selected' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleVehicle(vehicle.id)}
                            disabled={isSubmitting}
                          />
                        </td>
                        <td>{vehicle.vehicleCode || '-'}</td>
                        <td>{vehicle.name || '-'}</td>
                        <td>{vehicle.licensePlate || '-'}</td>
                        <td>{vehicle.vehicleTypeName || '-'}</td>
                        <td>{vehicle.capacity ?? '-'}</td>
                        <td>{vehicle.currentLocation || '-'}</td>
                        <td>{VEHICLE_STATUS_LABELS[vehicle.status] || vehicle.status || '-'}</td>
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
              <div className="summary-item">
                <span>Phương tiện đã chọn</span>
                <strong>{selectedVehicles.length}</strong>
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

            <div className="summary-block">
              <h3>Danh sách phương tiện</h3>
              {selectedVehicles.length === 0 ? (
                <p className="summary-empty">Chưa chọn phương tiện vận chuyển.</p>
              ) : (
                <div className="vehicle-list">
                  {selectedVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="vehicle-list-item">
                      <strong>{vehicle.name || vehicle.vehicleCode || `Phương tiện #${vehicle.id}`}</strong>
                      <span>{vehicle.licensePlate || vehicle.currentLocation || '-'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="button" className="submit-button" onClick={handleSubmit} disabled={!canSubmit}>
              {isSubmitting ? 'Đang tạo phiếu xuất kho...' : 'Gửi phiếu xuất kho'}
            </button>

            <p className="summary-note">
              Không thể điều phối khi chưa chọn đơn vị nhận, vật tư hợp lệ hoặc phương tiện vận chuyển.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default ManagerReliefExportPage
