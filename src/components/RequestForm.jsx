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

function isVietnamesePhoneNumber(number) {
  return /^(\+84|84|0)(3|5|7|8|9|1[2689])[0-9]{8}$/.test(number);
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
        const { lat, lng } = e.latlng;
        // Get address from coordinates using Nominatim (free reverse geocoding)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await response.json();
          // Kiểm tra nhiều trường trong address object
          const addressObj = data?.address || {};
          const addressFields = [
            addressObj.city,
            addressObj.state,
            addressObj.county,
            addressObj.town,
            addressObj.village,
            addressObj.suburb,
            data?.display_name
          ];
          const isHCM = addressFields.some(f =>
            typeof f === 'string' &&
            (f.toLowerCase().includes('hồ chí minh') || f.toLowerCase().includes('ho chi minh'))
          );
          if (isHCM) {
            setMapLat(lat);
            setMapLng(lng);
            setFormData((prev) => ({
              ...prev,
              location: `${lat},${lng}`,
              address: data.address.address || data.display_name || `${lat}, ${lng}`,
            }));
            // Update marker
            if (markerRef.current) {
              markerRef.current.setLatLng([lat, lng]);
            } else {
              markerRef.current = window.L.marker([lat, lng]).addTo(map);
            }
            setErrorMessage('');
          } else {
            setErrorMessage('Chỉ hỗ trợ trong khu vực TP.HCM');
          }
        } catch (error) {
          console.warn('Reverse geocoding error:', error);
          setErrorMessage('Không thể xác định địa chỉ từ vị trí này.');
        }
      });
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

    // Validate phone
    if (!isVietnamesePhoneNumber(formData.phone)) {
      setErrorMessage('Số điện thoại không hợp lệ!')
      return
    }

    // Validate số người, người già, trẻ em
    const totalPeople = Number.parseInt(formData.totalPeople || '0', 10);
    const elderly = Number.parseInt(formData.elderly || '0', 10);
    const children = Number.parseInt(formData.children || '0', 10);
    if (totalPeople < elderly + children) {
      setErrorMessage('Số người phải lớn hơn hoặc bằng tổng số người già và trẻ em.');
      return;
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
                    if (!isVietnamesePhoneNumber(numericValue)) {
                      setErrorMessage('Số điện thoại không hợp lệ!')
                    } else {
                      setErrorMessage('')
                    }
                  }}
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
                  disabled={true}
                  required
                  style={{ width: '100%', background: '#e0e3e9', color: '#555', cursor: 'not-allowed' }}
                />
                <small className="request-input-hint">Chỉ chọn trên bản đồ</small>
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
