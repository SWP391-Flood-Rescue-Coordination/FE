import React, { useState, useEffect, useRef } from 'react'
import authService from '../services/authService'
import rescueRequestService from '../services/rescueRequestService'
import './RequestForm.css'

const INITIAL_FORM_DATA = {
  requestId: null,
  accessCode: null,
  contactName: '',
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
}

const sanitizeNumberText = (value) => String(value ?? '').replace(/[^0-9]/g, '')
const PHONE_ERROR_MESSAGE = 'Số điện thoại không hợp lệ!'
const PEOPLE_COUNT_ERROR_MESSAGE = 'Số người phải lớn hơn hoặc bằng tổng số người già và trẻ em.'

function isVietnamesePhoneNumber(number) {
  return /^(\+84|84|0)(3|5|7|8|9|1[2689])[0-9]{8}$/.test(number)
}

function RequestForm({ onClose }) {
  const [formData, setFormData] = useState(() => ({
    ...INITIAL_FORM_DATA,
    contactName: String(authService.getUserInfo()?.fullName ?? '').trim(),
    phone: sanitizeNumberText(authService.getDefaultPhone()),
    conditions: {
      ...INITIAL_FORM_DATA.conditions,
    },
  }))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [mapLat, setMapLat] = useState(null)
  const [mapLng, setMapLng] = useState(null)

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
            setMapLat(lat)
            setMapLng(lng)
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
        } catch (error) {
          console.warn('Reverse geocoding error:', error)
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

  const handleClose = () => {
    if (isSubmitting) {
      return
    }

    if (onClose) {
      onClose(null)
    }
  }

  const hasInvalidPeopleCounts = (nextFormData) => {
    const totalPeople = Number.parseInt(String(nextFormData.totalPeople ?? '').trim(), 10)
    const elderlyRaw = Number.parseInt(String(nextFormData.elderly ?? '').trim(), 10)
    const childrenRaw = Number.parseInt(String(nextFormData.children ?? '').trim(), 10)
    const elderly = Number.isFinite(elderlyRaw) ? elderlyRaw : 0
    const children = Number.isFinite(childrenRaw) ? childrenRaw : 0

    return Number.isFinite(totalPeople) && totalPeople < elderly + children
  }

  const handlePeopleGroupBlur = (event) => {
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
    setErrorMessage('')
    setSuccessMessage('')

    if (mapLat === null || mapLng === null) {
      setErrorMessage('Vui lòng chọn vị trí trên bản đồ trước khi gửi yêu cầu.')
      return
    }

    if (!isVietnamesePhoneNumber(formData.phone)) {
      setErrorMessage('Số điện thoại không hợp lệ!')
      return
    }

    const validation = rescueRequestService.validateCreatePayloadInput(formData)
    if (!validation.valid) {
      setErrorMessage(validation.message)
      return
    }

    setIsSubmitting(true)

    try {
      const data = await rescueRequestService.createRescueRequest(formData)

      if (!data?.success) {
        setErrorMessage(data?.message || 'Không thể gửi yêu cầu cứu hộ. Vui lòng thử lại.')
        return
      }

      setSuccessMessage(data?.message || 'Gửi yêu cầu cứu hộ thành công.')

      const submittedRequest = {
        ...formData,
        mode: 'create',
        submittedDate: new Date().toISOString(),
        requestId: data?.requestId ?? null,
        accessCode: data?.accessCode ?? null,
        status: 'Pending',
      }

      window.setTimeout(() => {
        if (onClose) {
          onClose(submittedRequest)
        }
      }, 700)
    } catch (error) {
      setErrorMessage(rescueRequestService.getCreateRequestErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="request-overlay">
      <div className="request-modal">
        <h2>Yêu Cầu Cứu Hộ</h2>

        {errorMessage && <div className="request-feedback request-feedback-error">{errorMessage}</div>}
        {successMessage && <div className="request-feedback request-feedback-success">{successMessage}</div>}

        <form onSubmit={handleSubmit} onBlurCapture={handlePeopleGroupBlur}>
          <div className="form-row">
            <div className="form-left">
              <div className="form-field">
                <label>Số điện thoại</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
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
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="form-field">
                <label>Vị trí</label>
                <input
                  type="text"
                  value={formData.location}
                  placeholder="Ví dụ: 10.762622,106.660172"
                  disabled
                  required
                  style={{ width: '100%', background: '#e0e3e9', color: '#555', cursor: 'not-allowed' }}
                />
                <small className="request-input-hint">Chỉ chọn trên bản đồ</small>
              </div>

              <div className="form-field">
                <label>Chọn vị trí trên bản đồ</label>
                <div
                  ref={mapContainerRef}
                  id="map"
                  style={{
                    height: '400px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    marginBottom: '10px',
                  }}
                  className="leaflet-container"
                />
                {mapLat && mapLng && (
                  <small className="request-input-hint">
                    Vị trí đã chọn: {mapLat.toFixed(6)}, {mapLng.toFixed(6)}
                  </small>
                )}
              </div>

              <div className="form-field">
                <label>Địa chỉ</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="form-field people-group">
                <div className="form-field-inline">
                  <label>Số người</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    value={formData.totalPeople}
                    onChange={(event) => {
                      const numericValue = sanitizeNumberText(event.target.value)
                      setFormData((prev) => ({ ...prev, totalPeople: numericValue }))
                    }}
                    disabled={isSubmitting}
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
                    onChange={(event) => {
                      const numericValue = sanitizeNumberText(event.target.value)
                      setFormData((prev) => ({ ...prev, elderly: numericValue }))
                    }}
                    disabled={isSubmitting}
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
                    onChange={(event) => {
                      const numericValue = sanitizeNumberText(event.target.value)
                      setFormData((prev) => ({ ...prev, children: numericValue }))
                    }}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="form-right">
              <div className="form-field people-group people-group-right">
                <div className="form-field-inline">
                  <label>Số người</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    value={formData.totalPeople}
                    onChange={(event) => {
                      const numericValue = sanitizeNumberText(event.target.value)
                      setFormData((prev) => ({ ...prev, totalPeople: numericValue }))
                    }}
                    disabled={isSubmitting}
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
                    onChange={(event) => {
                      const numericValue = sanitizeNumberText(event.target.value)
                      setFormData((prev) => ({ ...prev, elderly: numericValue }))
                    }}
                    disabled={isSubmitting}
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
                    onChange={(event) => {
                      const numericValue = sanitizeNumberText(event.target.value)
                      setFormData((prev) => ({ ...prev, children: numericValue }))
                    }}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Tình trạng</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.needSupplies}
                      onChange={() => handleConditionChange('needSupplies')}
                      disabled={isSubmitting}
                    />
                    Hết nhu yếu phẩm
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.houseCollapsed}
                      onChange={() => handleConditionChange('houseCollapsed')}
                      disabled={isSubmitting}
                    />
                    Sập nhà
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.needMedical}
                      onChange={() => handleConditionChange('needMedical')}
                      disabled={isSubmitting}
                    />
                    Cần điều trị y tế
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.floodUnder1m}
                      onChange={() => handleConditionChange('floodUnder1m')}
                      disabled={isSubmitting}
                    />
                    Ngập dưới 1m
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.floodOver1m}
                      onChange={() => handleConditionChange('floodOver1m')}
                      disabled={isSubmitting}
                    />
                    Ngập từ 1m trở lên
                  </label>
                </div>
              </div>

              <div className="form-field notes-field">
                <label>Ghi chú (tùy chọn)</label>
                <textarea
                  rows="4"
                  value={formData.notes}
                  onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                  disabled={isSubmitting}
                  placeholder="Nhập thêm thông tin chi tiết nếu cần..."
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
            <button type="button" className="cancel-btn" onClick={handleClose} disabled={isSubmitting}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RequestForm
