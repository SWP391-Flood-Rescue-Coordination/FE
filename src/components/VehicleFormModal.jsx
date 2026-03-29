import React, { useEffect, useMemo, useRef, useState } from 'react'
import { HomeIcon, MapPinIcon } from '@heroicons/react/24/outline'
import './RequestForm.css'
import './VehicleFormModal.css'

// Popup thêm/sửa xe tái sử dụng phong cách UI của RequestForm
// nhưng map dữ liệu sang payload vehicle của manager/admin.
const DEFAULT_STATUS = 'AVAILABLE'
const HCM_BOUNDS = {
  southWest: [10.2, 106.2],
  northEast: [11.2, 107.1],
  center: [10.7769, 106.7009],
}

const toDateInputValue = (value) => {
  const raw = String(value ?? '').trim()
  return raw ? raw.split('T')[0] : ''
}

const buildInitialFormData = (initialVehicle, vehicleTypeOptions) => {
  const latitude = initialVehicle?.latitude ?? null
  const longitude = initialVehicle?.longitude ?? null
  const defaultVehicleTypeId = vehicleTypeOptions[0]?.id ?? 2

  return {
    vehicleName: String(initialVehicle?.vehicleName ?? '').trim(),
    licensePlate: String(initialVehicle?.licensePlate ?? '').trim(),
    vehicleTypeId: initialVehicle?.vehicleTypeId ?? defaultVehicleTypeId,
    capacity:
      initialVehicle?.capacity === null || initialVehicle?.capacity === undefined
        ? ''
        : String(initialVehicle.capacity),
    status: String(initialVehicle?.status ?? DEFAULT_STATUS).trim().toUpperCase(),
    location: latitude !== null && longitude !== null ? `${latitude}, ${longitude}` : '',
    currentLocation: String(initialVehicle?.currentLocation ?? '').trim(),
    latitude,
    longitude,
    lastMaintenance: toDateInputValue(initialVehicle?.lastMaintenance),
  }
}

const sanitizeNumberText = (value) => String(value ?? '').replace(/[^0-9]/g, '')

function ReadonlyInfoField({ icon: Icon, value, placeholder, className = '' }) {
  return (
    <div className={`request-readonly-display ${className}`.trim()} aria-readonly="true">
      <Icon className="request-readonly-icon" />
      <span>{value || placeholder}</span>
    </div>
  )
}

function VehicleFormModal({
  mode,
  initialVehicle,
  vehicleTypeOptions,
  isSubmitting,
  serverError,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState(() => buildInitialFormData(initialVehicle, vehicleTypeOptions))
  const [localError, setLocalError] = useState('')
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    setFormData(buildInitialFormData(initialVehicle, vehicleTypeOptions))
    setLocalError('')
  }, [initialVehicle, vehicleTypeOptions])

  const normalizedInitialStatus = String(initialVehicle?.status ?? '').trim().toUpperCase()
  const isInUseVehicle = normalizedInitialStatus === 'INUSE'

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !window.L) {
      return
    }

    const bounds = window.L.latLngBounds(HCM_BOUNDS.southWest, HCM_BOUNDS.northEast)
    const map = window.L.map(mapContainerRef.current, {
      center: HCM_BOUNDS.center,
      zoom: 12,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
    })

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'OpenStreetMap',
    }).addTo(map)

    map.on('click', async (event) => {
      // Dùng lại logic map picker của citizen: chỉ cho chọn vị trí thuộc TP.HCM.
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
          (fieldValue) =>
            typeof fieldValue === 'string'
            && (fieldValue.toLowerCase().includes('hồ chí minh') || fieldValue.toLowerCase().includes('ho chi minh')),
        )

        if (!isHcm) {
          setLocalError('Chỉ chọn vị trí cho xe trong khu vực TP.HCM.')
          return
        }

        const locationText = `${lat}, ${lng}`
        const currentLocation = data?.display_name || locationText

        setFormData((prev) => ({
          ...prev,
          location: locationText,
          currentLocation,
          latitude: lat,
          longitude: lng,
        }))
        setLocalError('')

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          markerRef.current = window.L.marker([lat, lng]).addTo(map)
        }
      } catch {
        setLocalError('Không thể xác định địa chỉ từ vị trí đã chọn.')
      }
    })

    mapRef.current = map

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    const latitude = Number(formData.latitude)
    const longitude = Number(formData.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude])
    } else {
      markerRef.current = window.L.marker([latitude, longitude]).addTo(mapRef.current)
    }

    mapRef.current.setView([latitude, longitude], mapRef.current.getZoom() || 12)
  }, [formData.latitude, formData.longitude])

  const resolvedError = localError || serverError

  const statusOptions = useMemo(() => {
    // Xe đang INUSE không được đổi status trong popup để tránh lệch nghiệp vụ đang chạy.
    if (isInUseVehicle) {
      return [{ value: 'INUSE', label: 'Đang sử dụng' }]
    }

    return [
      { value: 'AVAILABLE', label: 'Sẵn sàng' },
      { value: 'MAINTENANCE', label: 'Bảo trì' },
    ]
  }, [isInUseVehicle])

  const handleCapacityBlur = () => {
    const capacity = Number(formData.capacity)
    if (!Number.isFinite(capacity) || capacity < 2) {
      setLocalError('Sức chứa phải lớn hơn hoặc bằng 2.')
      return
    }

    if (localError === 'Sức chứa phải lớn hơn hoặc bằng 2.') {
      setLocalError('')
    }
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    if (localError) {
      setLocalError('')
    }
  }

  const handleStatusChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      status: value,
    }))

    if (localError) {
      setLocalError('')
    }
  }

  const validateForm = () => {
    if (!formData.vehicleName) {
      return 'Vui lòng nhập tên phương tiện.'
    }

    if (!formData.licensePlate) {
      return 'Vui lòng nhập biển số.'
    }

    const capacity = Number(formData.capacity)
    if (!Number.isFinite(capacity) || capacity < 2) {
      return 'Sức chứa phải lớn hơn hoặc bằng 2.'
    }

    if (!formData.vehicleTypeId) {
      return 'Vui lòng chọn loại phương tiện.'
    }

    if (!formData.currentLocation || !formData.location) {
      return 'Vui lòng chọn vị trí cho xe trên bản đồ.'
    }

    const latitude = Number(formData.latitude)
    const longitude = Number(formData.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return 'Tọa độ vị trí không hợp lệ.'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationMessage = validateForm()
    if (validationMessage) {
      setLocalError(validationMessage)
      return
    }

    try {
      await onSubmit({
        ...formData,
        capacity: Number(formData.capacity),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
      })
    } catch {
      // Lỗi từ server sẽ được component cha truyền xuống qua serverError.
    }
  }

  return (
    <div className="request-overlay">
      <div className="request-modal vehicle-form-modal">
        <h2>{mode === 'create' ? 'Thêm phương tiện mới' : 'Chỉnh sửa phương tiện'}</h2>

        {resolvedError && <div className="request-feedback request-feedback-error">{resolvedError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-left">
              <div className="vehicle-form-inline-row vehicle-form-inline-row-top">
                <div className="form-field vehicle-field-name">
                  <label>Tên phương tiện</label>
                  <input
                    type="text"
                    value={formData.vehicleName}
                    onChange={(event) => handleInputChange('vehicleName', event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-field vehicle-field-license">
                  <label>Biển số</label>
                  <input
                    type="text"
                    className="vehicle-uppercase-input"
                    value={formData.licensePlate}
                    onChange={(event) => handleInputChange('licensePlate', event.target.value.toUpperCase())}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-field vehicle-field-capacity">
                  <label>Sức chứa</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.capacity}
                    onChange={(event) => handleInputChange('capacity', sanitizeNumberText(event.target.value))}
                    onBlur={handleCapacityBlur}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-field">
                <div className="form-label-row">
                  <label>Vị trí hiện tại</label>
                  <span className="form-label-meta">Địa chỉ được cập nhật tự động theo điểm đã chọn</span>
                </div>
                <ReadonlyInfoField
                  icon={HomeIcon}
                  className="vehicle-current-location-display"
                  value={formData.currentLocation}
                  placeholder="Chọn vị trí cho xe trên bản đồ"
                />
              </div>

              <div className="vehicle-form-inline-row vehicle-form-inline-row-bottom">
                <div className="form-field vehicle-field-coordinates">
                  <label>Tọa độ</label>
                  <ReadonlyInfoField
                    icon={MapPinIcon}
                    value={formData.location}
                    placeholder="Chưa chọn tọa độ"
                  />
                </div>

                <div className="form-field vehicle-field-type">
                  <label>Loại phương tiện</label>
                  <select
                    value={formData.vehicleTypeId}
                    onChange={(event) => handleInputChange('vehicleTypeId', Number(event.target.value))}
                    disabled={isSubmitting}
                    className="vehicle-select"
                  >
                    {vehicleTypeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field vehicle-field-status">
                  <label>Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(event) => handleStatusChange(event.target.value)}
                    disabled={isSubmitting || isInUseVehicle}
                    className="vehicle-select"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-right">
              <div className="form-field">
                <div className="form-label-row">
                  <label>Chọn vị trí trên bản đồ</label>
                  <div className="form-label-meta-group">
                    <span className="form-label-meta">Chỉ chọn trong khu vực TP.HCM</span>
                  </div>
                </div>
                <div
                  ref={mapContainerRef}
                  className="leaflet-container vehicle-map"
                  style={{
                    height: '360px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : mode === 'create' ? 'Thêm phương tiện' : 'Lưu thay đổi'}
            </button>
            <button type="button" className="cancel-btn" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VehicleFormModal
