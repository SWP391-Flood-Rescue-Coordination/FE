import React, { useEffect, useMemo, useRef, useState } from 'react'
import authService from '../services/authService'
import rescueRequestService from '../services/rescueRequestService'
import './ViewRequest.css'

const sanitizeNumberText = (value) => String(value ?? '').replace(/[^0-9]/g, '')

const EMPTY_FORM_DATA = {
  requestId: null,
  accessCode: null,
  phone: '',
  location: '',
  address: '',
  totalPeople: '',
  elderly: '',
  children: '',
  conditions: {
    needSupplies: false,
    houseCollapsed: false,
    needMedical: false,
    floodUnder1m: false,
    floodOver1m: false,
  },
  notes: '',
  status: 'Pending',
  canReportSafe: false,
}

const SAFE_PROMPT_MESSAGE =
  'Đội cứu hộ đã xác nhận hoàn tất nhiệm vụ. Nếu bạn đã an toàn, vui lòng bấm "Báo an toàn" để đóng yêu cầu này.'
const PEOPLE_COUNT_ERROR_MESSAGE = 'Số người phải lớn hơn hoặc bằng tổng số người già và trẻ em.'
const PHONE_ERROR_MESSAGE = 'Số điện thoại không hợp lệ!'

function ViewRequest({ onClose, requestData, requestId }) {
  const isAuthenticated = authService.isAuthenticated()
  const currentUser = authService.getUserInfo()
  const roleKey = String(currentUser?.role ?? '').toUpperCase()
  const usesCitizenRequestFlow = isAuthenticated && roleKey === 'CITIZEN'
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isReportingSafe, setIsReportingSafe] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [formData, setFormData] = useState(EMPTY_FORM_DATA)

  const normalizedStatus = rescueRequestService.normalizeStatus(formData.status)
  const canReportSafe = Boolean(formData?.canReportSafe) && normalizedStatus === 'ASSIGNED'
  const canAcknowledgeSafe = canReportSafe && !isLoading && !isReportingSafe

  const canGuestEdit = useMemo(
    () => !usesCitizenRequestFlow && Boolean(formData?.requestId),
    [usesCitizenRequestFlow, formData?.requestId],
  )

  const canStartEdit = normalizedStatus === 'PENDING' && !isLoading && !isReportingSafe

  useEffect(() => {
    const loadRequestData = async () => {
      setIsLoading(true)
      setErrorMessage('')
      setSuccessMessage('')

      try {
        let sourceData = null
        const requestDataId = requestData?.requestId ?? requestData?.RequestId ?? null
        const resolvedRequestId = requestId ?? requestDataId ?? null
        const resolvedAccessCode =
          requestData?.accessCode ?? requestData?.AccessCode ?? formData?.accessCode ?? null

        if (requestData) {
          sourceData = requestData
        }

        if (usesCitizenRequestFlow) {
          if (resolvedRequestId) {
            const detailData = await rescueRequestService.getRequestById(resolvedRequestId)
            sourceData = {
              ...(sourceData || {}),
              ...(detailData || {}),
            }
          } else if (!sourceData) {
            sourceData = await rescueRequestService.getMyLatestRequest()
          }
        } else if (resolvedRequestId) {
          const detailData = await rescueRequestService.getGuestRequestStatus(
            resolvedRequestId,
            resolvedAccessCode,
          )
          sourceData = {
            ...(sourceData || {}),
            ...(detailData || {}),
          }
        } else if (!sourceData) {
          sourceData = await rescueRequestService.getTrackedGuestRequestStatus()
        }

        if (!sourceData) {
          setFormData(EMPTY_FORM_DATA)
          setErrorMessage('Không tìm thấy yêu cầu cứu hộ nào.')
          return
        }

        const formatted = rescueRequestService.toRequestFormData(sourceData)
        const resolvedRequestIdForState =
          formatted?.requestId ?? sourceData?.requestId ?? requestId ?? null

        setFormData({
          ...EMPTY_FORM_DATA,
          ...formatted,
          requestId: resolvedRequestIdForState,
          accessCode: formatted?.accessCode ?? sourceData?.accessCode ?? null,
          canReportSafe: Boolean(formatted?.canReportSafe),
          conditions: {
            ...EMPTY_FORM_DATA.conditions,
            ...(formatted?.conditions || {}),
          },
        })
      } catch (error) {
        if (error?.response?.status === 404) {
          setErrorMessage('Không tìm thấy yêu cầu cứu hộ nào.')
        } else {
          setErrorMessage('Không thể tải dữ liệu yêu cầu. Vui lòng thử lại.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadRequestData()
  }, [requestData, requestId, usesCitizenRequestFlow])

  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    try {
      const hcmBounds = window.L.latLngBounds(
        [10.2, 106.2],
        [11.2, 107.1],
      )

      const map = window.L.map(mapContainerRef.current, {
        center: [10.7769, 106.7009],
        zoom: 12,
        maxBounds: hcmBounds,
        maxBoundsViscosity: 1.0,
      })

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenStreetMap',
      }).addTo(map)

      mapRef.current = map

      map.on('click', async (event) => {
        const { lat, lng } = event.latlng

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          )
          const data = await response.json()
          const addressObj = data?.address || {}
          const addressFields = [
            addressObj.city,
            addressObj.state,
            addressObj.county,
            addressObj.town,
            addressObj.village,
            addressObj.suburb,
            data?.display_name,
          ]

          const isHcm = addressFields.some(
            (value) =>
              typeof value === 'string' &&
              (value.toLowerCase().includes('hồ chí minh') || value.toLowerCase().includes('ho chi minh')),
          )

          if (isHcm) {
            setFormData((prev) => ({
              ...prev,
              location: `${lat},${lng}`,
              address: data.address?.address || data.display_name || `${lat}, ${lng}`,
            }))

            if (markerRef.current) {
              markerRef.current.setLatLng([lat, lng])
            } else {
              markerRef.current = window.L.marker([lat, lng]).addTo(map)
            }
            setErrorMessage('')
          } else {
            setErrorMessage('Chỉ hỗ trợ trong khu vực TP.HCM')
          }
        } catch {
          setErrorMessage('Không thể xác định địa chỉ từ vị trí này.')
        }
      })
    } catch (error) {
      console.error('Map initialization error:', error)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    const [latText, lngText] = String(formData.location || '').split(',')
    const lat = Number.parseFloat(latText)
    const lng = Number.parseFloat(lngText)

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = window.L.marker([lat, lng]).addTo(mapRef.current)
      }
      mapRef.current.setView([lat, lng], mapRef.current.getZoom() || 12)
    }
  }, [formData.location])

  const getStatusLabel = (status) => {
    const statusMap = {
      PENDING: 'Đang chờ xử lý',
      VERIFIED: 'Đã xác minh',
      ASSIGNED: 'Đã phân công',
      IN_PROGRESS: 'Đang cứu hộ',
      CONFIRMED: 'Đã phân công',
      COMPLETED: 'Đã hoàn thành',
      CANCELLED: 'Đã hủy',
      CANCELED: 'Đã hủy',
      DUPLICATE: 'Trùng lặp',
    }

    return statusMap[rescueRequestService.normalizeStatus(status)] || status
  }

  const isVietnamesePhoneNumber = (number) => /^(\+84|84|0)(3|5|7|8|9|1[2689])[0-9]{8}$/.test(number)

  const hasInvalidPeopleCounts = (nextFormData) => {
    const totalPeople = Number.parseInt(String(nextFormData.totalPeople ?? '').trim(), 10)
    const elderlyRaw = Number.parseInt(String(nextFormData.elderly ?? '').trim(), 10)
    const childrenRaw = Number.parseInt(String(nextFormData.children ?? '').trim(), 10)
    const elderly = Number.isFinite(elderlyRaw) ? elderlyRaw : 0
    const children = Number.isFinite(childrenRaw) ? childrenRaw : 0

    return Number.isFinite(totalPeople) && totalPeople < elderly + children
  }

  const handlePeopleGroupBlur = (event) => {
    if (!isEditing) {
      return
    }

    if (!(event.target instanceof HTMLElement) || !event.target.closest('.people-group')) {
      return
    }

    if (hasInvalidPeopleCounts(formData)) {
      setErrorMessage(PEOPLE_COUNT_ERROR_MESSAGE)
      return
    }

    setErrorMessage((currentMessage) =>
      currentMessage === PEOPLE_COUNT_ERROR_MESSAGE ? '' : currentMessage,
    )
  }

  const handlePhoneBlur = () => {
    if (!isEditing) {
      return
    }

    if (!isVietnamesePhoneNumber(formData.phone)) {
      setErrorMessage(PHONE_ERROR_MESSAGE)
      return
    }

    setErrorMessage((currentMessage) =>
      currentMessage === PHONE_ERROR_MESSAGE ? '' : currentMessage,
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!isEditing) {
      return
    }

    if (!isVietnamesePhoneNumber(formData.phone)) {
      setErrorMessage('Số điện thoại không hợp lệ!')
      return
    }

    if (hasInvalidPeopleCounts(formData)) {
      setErrorMessage(PEOPLE_COUNT_ERROR_MESSAGE)
      return
    }

    if (!isAuthenticated && !canGuestEdit) {
      setErrorMessage('Không tìm thấy mã yêu cầu để chỉnh sửa yêu cầu guest.')
      setIsEditing(false)
      return
    }

    if (usesCitizenRequestFlow && !formData.requestId) {
      setErrorMessage('Không tìm thấy yêu cầu để cập nhật.')
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const updateResult = usesCitizenRequestFlow
        ? await rescueRequestService.updateMyRequest(formData.requestId, formData)
        : await rescueRequestService.updateGuestRequest(
            formData.requestId,
            formData,
            formData.accessCode,
          )

      if (!updateResult?.success) {
        setErrorMessage(updateResult?.message || 'Không thể cập nhật yêu cầu.')
        return
      }

      const refreshed = usesCitizenRequestFlow
        ? await rescueRequestService.getRequestById(formData.requestId)
        : (await rescueRequestService.getTrackedGuestRequestStatus())
          || await rescueRequestService.getGuestRequestStatus(formData.requestId, formData.accessCode)

      const formatted = rescueRequestService.toRequestFormData({
        ...formData,
        ...refreshed,
        accessCode: formData.accessCode,
      })

      setFormData((prev) => ({
        ...prev,
        ...formatted,
        requestId: prev.requestId,
        accessCode: prev.accessCode,
        canReportSafe: Boolean(formatted?.canReportSafe),
        conditions: {
          ...EMPTY_FORM_DATA.conditions,
          ...(formatted?.conditions || {}),
        },
      }))

      setIsEditing(false)
      setSuccessMessage('Lưu thay đổi thành công.')
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Không thể cập nhật yêu cầu. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditClick = (event) => {
    if (isEditing) {
      return
    }

    event.preventDefault()

    if (!canStartEdit) {
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setIsEditing(true)
  }

  const handleReportSafe = async () => {
    if (!canAcknowledgeSafe) {
      return
    }

    const requestIdValue = formData.requestId
    if (!requestIdValue) {
      setErrorMessage('Không tìm thấy yêu cầu để báo an toàn.')
      return
    }

    setIsReportingSafe(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      if (usesCitizenRequestFlow) {
        await rescueRequestService.confirmRescued(requestIdValue)
      } else {
        const phone = String(formData.phone ?? '').trim()
        if (!phone) {
          setErrorMessage('Không tìm thấy số điện thoại để báo an toàn.')
          return
        }

        await rescueRequestService.confirmRescuedAsGuest(requestIdValue, phone)
      }

      const refreshed = usesCitizenRequestFlow
        ? await rescueRequestService.getRequestById(requestIdValue)
        : (await rescueRequestService.getTrackedGuestRequestStatus())
          || await rescueRequestService.getGuestRequestStatus(requestIdValue, formData.accessCode)

      const formatted = rescueRequestService.toRequestFormData({
        ...formData,
        ...refreshed,
        accessCode: formData.accessCode,
      })

      setFormData((prev) => ({
        ...prev,
        ...formatted,
        requestId: prev.requestId,
        accessCode: prev.accessCode,
        canReportSafe: Boolean(formatted?.canReportSafe),
        conditions: {
          ...EMPTY_FORM_DATA.conditions,
          ...(formatted?.conditions || {}),
        },
      }))

      setSuccessMessage('Báo an toàn thành công. Yêu cầu đã được đánh dấu hoàn tất.')
    } catch (error) {
      setErrorMessage(rescueRequestService.getConfirmRescuedErrorMessage(error))
    } finally {
      setIsReportingSafe(false)
    }
  }

  const handleConditionChange = (condition) => {
    setFormData((prev) => {
      const nextValue = !prev.conditions[condition]
      const nextConditions = {
        ...prev.conditions,
        [condition]: nextValue,
      }

      if (condition === 'floodUnder1m' && nextValue) {
        nextConditions.floodOver1m = false
      }

      if (condition === 'floodOver1m' && nextValue) {
        nextConditions.floodUnder1m = false
      }

      return {
        ...prev,
        conditions: nextConditions,
      }
    })
  }

  const editButtonDisabled = isEditing ? isLoading || isReportingSafe : !canStartEdit

  return (
    <div className="request-overlay">
      <div className="request-modal">
        <h2>Trạng Thái Yêu Cầu Cứu Hộ</h2>

        {isLoading && (
          <div className="request-feedback request-feedback-info">
            Đang tải dữ liệu...
          </div>
        )}

        {errorMessage && (
          <div className="request-feedback request-feedback-error">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="request-feedback request-feedback-success">
            {successMessage}
          </div>
        )}

        {!isLoading && canReportSafe && (
          <div className="request-feedback request-feedback-safe-prompt">
            <span className="request-feedback-safe-prompt-text">{SAFE_PROMPT_MESSAGE}</span>
            Đội cứu hộ đã xác nhận hoàn tất. Vui lòng bấm &quot;Báo an toàn&quot; để đóng yêu cầu.
          </div>
        )}

        {!isLoading && formData.status && (
          <div className={`status-banner status-${normalizedStatus.toLowerCase()}`}>
            <strong>Trạng thái:</strong> {getStatusLabel(normalizedStatus)}
          </div>
        )}

        <form onSubmit={handleSubmit} onBlurCapture={handlePeopleGroupBlur}>
          <div className="form-row">
            <div className="form-left">
              <div className="form-field">
                <label>Số điện thoại</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => {
                    const numericValue = sanitizeNumberText(event.target.value)
                    setFormData((prev) => ({ ...prev, phone: numericValue }))
                    if (isVietnamesePhoneNumber(numericValue)) {
                      setErrorMessage((currentMessage) =>
                        currentMessage === PHONE_ERROR_MESSAGE ? '' : currentMessage,
                      )
                    }
                  }}
                  onBlur={handlePhoneBlur}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="form-field">
                <label>Vị trí</label>
                <input
                  type="text"
                  value={formData.location}
                  disabled
                  required
                  style={{ width: '100%' }}
                />
                <small className="request-input-hint">Chỉ chọn trên bản đồ</small>
              </div>

              <div className="form-field">
                <label>Chọn vị trí trên bản đồ</label>
                <div
                  ref={mapContainerRef}
                  id="map-view-request"
                  style={{
                    height: '400px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    marginBottom: '10px',
                  }}
                  className="leaflet-container"
                />
                {formData.location && (
                  <small className="request-input-hint">
                    Vị trí đã chọn: {formData.location}
                  </small>
                )}
              </div>

              <div className="form-field">
                <label>Địa chỉ</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="form-field">
                <div className="people-group">
                  <div className="form-field-inline">
                    <label>Số người</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="0"
                      value={formData.totalPeople}
                      onChange={isEditing ? (event) => {
                        const numericValue = sanitizeNumberText(event.target.value)
                        setFormData((prev) => ({ ...prev, totalPeople: numericValue }))
                      } : undefined}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="form-field-inline">
                    <label>Người già</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="0"
                      value={formData.elderly}
                      onChange={isEditing ? (event) => {
                        const numericValue = sanitizeNumberText(event.target.value)
                        setFormData((prev) => ({ ...prev, elderly: numericValue }))
                      } : undefined}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="form-field-inline">
                    <label>Trẻ em</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="0"
                      value={formData.children}
                      onChange={isEditing ? (event) => {
                        const numericValue = sanitizeNumberText(event.target.value)
                        setFormData((prev) => ({ ...prev, children: numericValue }))
                      } : undefined}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-right">
              <div className="form-field">
                <label>Tình trạng</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.needSupplies}
                      onChange={() => handleConditionChange('needSupplies')}
                      disabled={!isEditing}
                    />
                    Hết nhu yếu phẩm
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.houseCollapsed}
                      onChange={() => handleConditionChange('houseCollapsed')}
                      disabled={!isEditing}
                    />
                    Sập nhà
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.needMedical}
                      onChange={() => handleConditionChange('needMedical')}
                      disabled={!isEditing}
                    />
                    Cần điều trị y tế
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.floodUnder1m}
                      onChange={() => handleConditionChange('floodUnder1m')}
                      disabled={!isEditing}
                    />
                    Ngập &lt; 1m
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.floodOver1m}
                      onChange={() => handleConditionChange('floodOver1m')}
                      disabled={!isEditing}
                    />
                    Ngập &gt; 1m
                  </label>
                </div>
              </div>

              <div className="form-field">
                <label>Ghi chú:</label>
                <textarea
                  rows="5"
                  value={formData.notes}
                  onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="confirm-btn"
              onClick={handleReportSafe}
              disabled={!canAcknowledgeSafe}
            >
              Báo an toàn
            </button>

            <button
              type={isEditing ? 'submit' : 'button'}
              className={`submit-btn ${editButtonDisabled ? 'disabled' : ''}`}
              onClick={handleEditClick}
              disabled={editButtonDisabled}
            >
              {isEditing ? 'Lưu thay đổi' : 'Chỉnh sửa'}
            </button>

            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={isLoading || isReportingSafe}
            >
              Đóng
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ViewRequest
