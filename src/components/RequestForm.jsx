import React, { useEffect, useRef, useState } from 'react'
import { HomeIcon, MapPinIcon } from '@heroicons/react/24/outline'
import authService from '../services/authService'
import rescueRequestService from '../services/rescueRequestService'
import './RequestForm.css'

// Popup tạo request cho citizen/guest.
// Dữ liệu map và form sẽ được đổi sang payload BE tại rescueRequestService.
const INITIAL_FORM_DATA = {
  requestId: null,
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
const PEOPLE_COUNT_MIN_ERROR_MESSAGE = 'Số người tối thiểu phải là 1.'
const PEOPLE_COUNT_ERROR_MESSAGE = 'Số người phải lớn hơn hoặc bằng tổng số người già và trẻ em.'

function isVietnamesePhoneNumber(number) {
  return /^(\+84|84|0)(3|5|7|8|9|1[2689])[0-9]{8}$/.test(number)
}

function ReadonlyInfoField({ icon: Icon, value, placeholder }) {
  return (
    <div className="request-readonly-display" aria-readonly="true">
      <Icon className="request-readonly-icon" />
      <span>{value || placeholder}</span>
    </div>
  )
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
  const [mapLat, setMapLat] = useState(null)
  const [mapLng, setMapLng] = useState(null)

  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

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
        // Chỉ cho pick điểm trong TP.HCM để đồng nhất với rule nghiệp vụ hiện tại.
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

          if (!isHcm) {
            setErrorMessage('Chỉ hỗ trợ trong khu vực TP.HCM.')
            return
          }

          setMapLat(lat)
          setMapLng(lng)
          setFormData((prev) => ({
            ...prev,
            location: `${lat},${lng}`,
            address: data?.display_name || `${lat}, ${lng}`,
          }))

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng])
          } else {
            markerRef.current = window.L.marker([lat, lng]).addTo(map)
          }

          setErrorMessage('')
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

  const getPeopleCountValidationMessage = (nextFormData) => {
    const totalPeople = Number.parseInt(String(nextFormData.totalPeople ?? '').trim(), 10)
    const elderlyRaw = Number.parseInt(String(nextFormData.elderly ?? '').trim(), 10)
    const childrenRaw = Number.parseInt(String(nextFormData.children ?? '').trim(), 10)
    const elderly = Number.isFinite(elderlyRaw) ? elderlyRaw : 0
    const children = Number.isFinite(childrenRaw) ? childrenRaw : 0

    if (!Number.isFinite(totalPeople) || totalPeople < 1) {
      return PEOPLE_COUNT_MIN_ERROR_MESSAGE
    }

    if (totalPeople < elderly + children) {
      return PEOPLE_COUNT_ERROR_MESSAGE
    }

    return ''
  }

  const clearMessageIfMatches = (messages) => {
    setErrorMessage((currentMessage) => (messages.includes(currentMessage) ? '' : currentMessage))
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

  const handleClose = () => {
    if (isSubmitting) {
      return
    }

    onClose?.(null)
  }

  const handlePeopleFieldBlur = () => {
    // Validate ngay khi rời ô thay vì đợi submit toàn form.
    const validationMessage = getPeopleCountValidationMessage(formData)
    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    clearMessageIfMatches([PEOPLE_COUNT_MIN_ERROR_MESSAGE, PEOPLE_COUNT_ERROR_MESSAGE])
  }

  const handlePhoneBlur = () => {
    if (!isVietnamesePhoneNumber(formData.phone)) {
      setErrorMessage(PHONE_ERROR_MESSAGE)
      return
    }

    clearMessageIfMatches([PHONE_ERROR_MESSAGE])
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
      setErrorMessage(PHONE_ERROR_MESSAGE)
      return
    }

    const peopleValidationMessage = getPeopleCountValidationMessage(formData)
    if (peopleValidationMessage) {
      setErrorMessage(peopleValidationMessage)
      return
    }

    const validation = rescueRequestService.validateCreatePayloadInput(formData)
    if (!validation.valid) {
      setErrorMessage(validation.message)
      return
    }

    setIsSubmitting(true)

    try {
      // Thành công xong sẽ trả request vừa tạo về Dashboard để refresh lịch sử và trạng thái nút chính.
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
        status: 'Pending',
      }

      window.setTimeout(() => {
        onClose?.(submittedRequest)
      }, 700)
    } catch (error) {
      setErrorMessage(rescueRequestService.getCreateRequestErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderPeopleInputs = () => (
    <>
      <div className="form-field-inline">
        <label>Số người</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          min="1"
          value={formData.totalPeople}
          onChange={(event) => {
            const numericValue = sanitizeNumberText(event.target.value)
            setFormData((prev) => ({ ...prev, totalPeople: numericValue }))
          }}
          onBlur={handlePeopleFieldBlur}
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
          onBlur={handlePeopleFieldBlur}
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
          onBlur={handlePeopleFieldBlur}
          disabled={isSubmitting}
        />
      </div>
    </>
  )

  return (
    <div className="request-overlay">
      <div className="request-modal">
        <h2>Yêu Cầu Cứu Hộ</h2>

        {errorMessage && <div className="request-feedback request-feedback-error">{errorMessage}</div>}
        {successMessage && <div className="request-feedback request-feedback-success">{successMessage}</div>}

        <form onSubmit={handleSubmit}>
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
                      clearMessageIfMatches([PHONE_ERROR_MESSAGE])
                    }
                  }}
                  onBlur={handlePhoneBlur}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="form-field">
                <label>Vị trí</label>
                <ReadonlyInfoField
                  icon={MapPinIcon}
                  value={formData.location}
                  placeholder="Chưa chọn vị trí"
                />
              </div>

              <div className="form-field">
                <div className="form-label-row">
                  <label>Chọn vị trí trên bản đồ</label>
                  <div className="form-label-meta-group">
                    <span className="form-label-meta">Chỉ chọn trong khu vực TP.HCM</span>
                  </div>
                </div>
                <div
                  ref={mapContainerRef}
                  id="map"
                  className="leaflet-container"
                  style={{
                    height: '400px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    marginBottom: '10px',
                  }}
                />
              </div>

              <div className="form-field">
                <div className="form-label-row">
                  <label>Địa chỉ</label>
                  <span className="form-label-meta">Địa chỉ được cập nhật tự động theo điểm đã chọn</span>
                </div>
                <ReadonlyInfoField
                  icon={HomeIcon}
                  value={formData.address}
                  placeholder="Địa chỉ sẽ hiển thị sau khi chọn vị trí"
                />
              </div>

              <div className="form-field people-group">
                {renderPeopleInputs()}
              </div>
            </div>

            <div className="form-right">
              <div className="form-field people-group people-group-right">
                {renderPeopleInputs()}
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
                    Ngập trên 1m
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
