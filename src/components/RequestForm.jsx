import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import authService from '../services/authService'
import rescueRequestService from '../services/rescueRequestService'
import './RequestForm.css'

const INITIAL_FORM_DATA = {
  requestId: null,
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

const CITIZEN_ROLE = 'CITIZEN'

const sanitizeNumberText = (value) => String(value ?? '').replace(/[^0-9]/g, '')

function RequestForm({ onClose }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleConditionChange = (condition) => {
    setFormData((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        [condition]: !prev.conditions[condition],
      },
    }))
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

    if (!authService.isAuthenticated()) {
      setErrorMessage('Bạn cần đăng nhập để gửi yêu cầu cứu hộ.')
      window.setTimeout(() => {
        navigate('/login')
      }, 800)
      return
    }

    const user = authService.getUserInfo()
    const role = String(user?.role ?? '').toUpperCase()
    if (role !== CITIZEN_ROLE) {
      setErrorMessage('Chỉ tài khoản Công dân mới được gửi yêu cầu cứu hộ.')
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
        status: 'Pending',
      }

      window.setTimeout(() => {
        if (onClose) {
          onClose(submittedRequest)
        }
      }, 700)
    } catch (error) {
      const status = error?.response?.status
      setErrorMessage(rescueRequestService.getCreateRequestErrorMessage(error))

      if (status === 401) {
        window.setTimeout(() => {
          navigate('/login')
        }, 900)
      }
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
                <small className="request-input-hint">Nhập theo cấu trúc sau: "vĩ độ", "kinh độ"</small>
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
                    Ngập dưới 1 mét
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.floodOver1m}
                      onChange={() => handleConditionChange('floodOver1m')}
                      disabled={isSubmitting}
                    />
                    Ngập trên 1 mét
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
