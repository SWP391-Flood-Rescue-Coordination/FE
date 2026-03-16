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

  // Map states
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [mapLat, setMapLat] = useState(null)
  const [mapLng, setMapLng] = useState(null)
  const [mapReady, setMapReady] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    try {
      const HCM_BOUNDS = window.L.latLngBounds(
        [10.20, 106.20], // SW
        [11.20, 107.10]  // NE
      )

      const map = window.L.map(mapContainerRef.current, {
        center: [10.7769, 106.7009],
        zoom: 12,
        maxBounds: HCM_BOUNDS,
        maxBoundsViscosity: 1.0,
      })

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenStreetMap',
      }).addTo(map)

      mapRef.current = map
      setMapReady(true)

      // Click event to select location
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng
        setMapLat(lat)
        setMapLng(lng)
        setFormData((prev) => ({
          ...prev,
          location: `${lat},${lng}`,
        }))

        // Update marker
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          markerRef.current = window.L.marker([lat, lng]).addTo(map)
        }

        // Get address from coordinates using Nominatim (free reverse geocoding)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          )
          const data = await response.json()
          if (data?.address) {
            const address = data.address.address || data.display_name || `${lat}, ${lng}`
            setFormData((prev) => ({
              ...prev,
              address: address,
            }))
          }
        } catch (error) {
          console.warn('Reverse geocoding error:', error)
          // Fallback: use coordinates if geocoding fails
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

  const handleOpenMap = () => {
    const coordinates = rescueRequestService.parseCoordinates(formData.location)
    let query = ''

    if (coordinates.latitude !== null && coordinates.longitude !== null) {
      query = `${coordinates.latitude},${coordinates.longitude}`
    } else {
      const address = String(formData.address ?? '').trim()
      if (address) {
        query = address
      }
    }

    if (!query) {
      query = '10.762622,106.660172'
    }

    window.open(`https://www.google.com/maps?q=${encodeURIComponent(query)}`, '_blank')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    // Validate map location selected
    if (mapLat === null || mapLng === null) {
      setErrorMessage('Vui lòng chọn vị trí trên bản đồ trước khi gửi yêu cầu.')
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
                  }}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="form-field">
                <label>Vị trí</label>
                <div className="location-group">
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
                    placeholder="Ví dụ: 10.762622,106.660172"
                    disabled={isSubmitting}
                    required
                  />
                  <button type="button" className="location-btn" disabled={isSubmitting} onClick={handleOpenMap}>
                    Chọn vị trí
                  </button>
                </div>
                <small className="request-input-hint">Nhập theo định dạng: vĩ độ,kinh độ</small>
              </div>

              {/* Interactive Map */}
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

              <div className="form-field people-count-field">
                <label>Số lượng người ảnh hưởng</label>
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

              <div className="form-field">
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
