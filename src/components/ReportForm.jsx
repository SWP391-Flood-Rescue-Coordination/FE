import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import authService from '../services/authService'
import rescueRequestService from '../services/rescueRequestService'
import './ReportForm.css'

const INITIAL_FORM_DATA = {
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
  status: 'pending',
}

const CITIZEN_ROLE = 'CITIZEN'

const sanitizeNumberText = (value) => String(value ?? '').replace(/[^0-9]/g, '')

function ReportForm({ onClose }) {
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

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!authService.isAuthenticated()) {
      setErrorMessage('Ban can dang nhap tai khoan cong dan truoc khi gui yeu cau.')
      window.setTimeout(() => {
        navigate('/login')
      }, 800)
      return
    }

    const user = authService.getUserInfo()
    const role = String(user?.role ?? '').toUpperCase()
    if (role !== CITIZEN_ROLE) {
      setErrorMessage('Chi tai khoan Cong dan moi duoc gui yeu cau cuu ho.')
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
        setErrorMessage(data?.message || 'Khong the gui yeu cau cuu ho. Vui long thu lai.')
        return
      }

      setSuccessMessage(data?.message || 'Gui yeu cau cuu ho thanh cong.')

      const submittedReport = {
        ...formData,
        submittedDate: new Date().toISOString(),
        requestId: data?.requestId ?? null,
        status: 'pending',
      }

      window.setTimeout(() => {
        if (onClose) {
          onClose(submittedReport)
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
    <div className="report-overlay">
      <div className="report-modal">
        <h2>Bao Cao Cuu Ho</h2>

        {errorMessage && <div className="report-feedback report-feedback-error">{errorMessage}</div>}
        {successMessage && <div className="report-feedback report-feedback-success">{successMessage}</div>}

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
                <label>Vi tri</label>
                <div className="location-group">
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
                    placeholder="Vi du: 10.762622,106.660172"
                    disabled={isSubmitting}
                    required
                  />
                  <button type="button" className="location-btn" disabled={isSubmitting}>
                    Chon vi tri
                  </button>
                </div>
                <small className="report-input-hint">Nhap theo format: latitude,longitude</small>
              </div>

              <div className="form-field">
                <label>Dia chi</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="form-field people-count-field">
                <label>So luong dau nguoi bi anh huong</label>
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
                <label>Tinh trang</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.needSupplies}
                      onChange={() => handleConditionChange('needSupplies')}
                      disabled={isSubmitting}
                    />
                    Het nhu yeu pham
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.houseCollapsed}
                      onChange={() => handleConditionChange('houseCollapsed')}
                      disabled={isSubmitting}
                    />
                    Sap nha
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.needMedical}
                      onChange={() => handleConditionChange('needMedical')}
                      disabled={isSubmitting}
                    />
                    Can dieu tri y te
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.floodUnder1m}
                      onChange={() => handleConditionChange('floodUnder1m')}
                      disabled={isSubmitting}
                    />
                    Ngap duoi 1m
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.conditions.floodOver1m}
                      onChange={() => handleConditionChange('floodOver1m')}
                      disabled={isSubmitting}
                    />
                    Ngap tren 1m
                  </label>
                </div>
              </div>

              <div className="form-field">
                <label>Ghi chu</label>
                <textarea
                  rows="4"
                  value={formData.notes}
                  onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Dang gui...' : 'Nop bao cao'}
            </button>
            <button type="button" className="cancel-btn" onClick={handleClose} disabled={isSubmitting}>
              Huy
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ReportForm
