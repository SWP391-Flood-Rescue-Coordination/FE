import React, { useEffect, useMemo, useRef, useState } from 'react';
// Map states
const sanitizeNumberText = (value) => String(value ?? '').replace(/[^0-9]/g, '');
import authService from '../services/authService';
import rescueRequestService from '../services/rescueRequestService';
import './ViewRequest.css';

const EMPTY_FORM_DATA = {
  requestId: null,
  accessCode: null,
  phone: '',
  location: '',
  address: '',
  totalPeople: 0,
  conditions: {
    needSupplies: false,
    houseCollapsed: false,
    needMedical: false,
    floodUnder1m: false,
    floodOver1m: false,
  },
  notes: '',
  status: 'Pending',
};

function ViewRequest({ onClose, requestData, requestId }) {
  // Map/marker refs declared once, logic handled below
  const isAuthenticated = authService.isAuthenticated();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM_DATA);

  const normalizedStatus = rescueRequestService.normalizeStatus(formData.status);
  const isTerminal = rescueRequestService.isTerminalStatus(formData.status);

  const canGuestEdit = useMemo(
    () => !isAuthenticated && Boolean(formData?.requestId),
    [isAuthenticated, formData?.requestId],
  );

  const canStartEdit = !isTerminal && !isLoading && !isConfirming;
  const canConfirmRescued = normalizedStatus === 'CONFIRMED' && !isLoading && !isConfirming && !isEditing;

  useEffect(() => {
    const loadRequestData = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        let sourceData = null;
        const requestDataId = requestData?.requestId ?? requestData?.RequestId ?? null;
        const resolvedRequestId = requestId ?? requestDataId ?? null;

        if (requestData) {
          sourceData = requestData;
        }

        if (isAuthenticated) {
          if (resolvedRequestId) {
            const detailData = await rescueRequestService.getRequestById(resolvedRequestId);
            sourceData = {
              ...(sourceData || {}),
              ...(detailData || {}),
            };
          } else if (!sourceData) {
            sourceData = await rescueRequestService.getMyLatestRequest();
          }
        } else if (!sourceData) {
          sourceData = await rescueRequestService.getTrackedGuestRequestStatus();
        }

        if (!sourceData) {
          setFormData(EMPTY_FORM_DATA);
          setErrorMessage('Không tìm thấy yêu cầu cứu hộ nào.');
          return;
        }

        const formatted = rescueRequestService.toRequestFormData(sourceData);
        setFormData({
          ...EMPTY_FORM_DATA,
          ...formatted,
          requestId: formatted?.requestId ?? sourceData?.requestId ?? requestId ?? null,
          accessCode: formatted?.accessCode ?? sourceData?.accessCode ?? null,
          conditions: {
            ...EMPTY_FORM_DATA.conditions,
            ...(formatted?.conditions || {}),
          },
        });
      } catch (error) {
        if (error?.response?.status === 404) {
          setErrorMessage('Không tìm thấy yêu cầu cứu hộ nào.');
        } else {
          setErrorMessage('Không thể tải dữ liệu yêu cầu. Vui lòng thử lại.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadRequestData();
  }, [requestData, requestId, isAuthenticated]);

  // --- Map and Marker Logic ---
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize map only once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    try {
      const HCM_BOUNDS = window.L.latLngBounds(
        [10.20, 106.20],
        [11.20, 107.10]
      );
      const map = window.L.map(mapContainerRef.current, {
        center: [10.7769, 106.7009],
        zoom: 12,
        maxBounds: HCM_BOUNDS,
        maxBoundsViscosity: 1.0,
      });
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenStreetMap',
      }).addTo(map);
      mapRef.current = map;
      // Click event to select location
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        setFormData((prev) => ({
          ...prev,
          location: `${lat},${lng}`,
        }));
        // Update marker
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = window.L.marker([lat, lng]).addTo(map);
        }
        // Get address from coordinates using Nominatim
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await response.json();
          if (data?.address) {
            const address = data.address.address || data.display_name || `${lat}, ${lng}`;
            setFormData((prev) => ({
              ...prev,
              address: address,
            }));
          }
        } catch (error) {
          // Fallback: use coordinates if geocoding fails
        }
      });
    } catch (error) {
      // Prevent blank form if map fails
      console.error('Map initialization error:', error);
    }
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update marker and map view when location changes
  useEffect(() => {
    if (!mapRef.current) return;
    const loc = String(formData.location || '').split(',');
    const lat = parseFloat(loc[0]);
    const lng = parseFloat(loc[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = window.L.marker([lat, lng]).addTo(mapRef.current);
      }
      mapRef.current.setView([lat, lng], mapRef.current.getZoom() || 12);
    }
  }, [formData.location]);

  const getStatusLabel = (status) => {
    const statusMap = {
      PENDING: 'Đang chờ xử lý',
      VERIFIED: 'Đã xác minh',
      ASSIGNED: 'Đã phân công',
      IN_PROGRESS: 'Đang cứu hộ',
      CONFIRMED: 'Đã xác nhận',
      COMPLETED: 'Đã hoàn thành',
      CANCELLED: 'Đã hủy',
      DUPLICATE: 'Trùng lặp',
    };
    return statusMap[rescueRequestService.normalizeStatus(status)] || status;
  };

// (removed duplicate map click event and trailing code)

// (removed duplicate/partial handler definitions and code fragments)

  const handleOpenMap = () => {
    const coordinates = rescueRequestService.parseCoordinates(formData.location);
    let query = '';

    if (coordinates.latitude !== null && coordinates.longitude !== null) {
      query = `${coordinates.latitude},${coordinates.longitude}`;
    } else {
      const address = String(formData.address ?? '').trim();
      if (address) {
        query = address;
      }
    }

    if (!query) {
      query = '10.762622,106.660172';
    }

    window.open(`https://www.google.com/maps?q=${encodeURIComponent(query)}`, '_blank');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEditing) {
      return;
    }

    if (!isAuthenticated && !canGuestEdit) {
      setErrorMessage('Không tìm thấy mã yêu cầu để chỉnh sửa yêu cầu guest.');
      setIsEditing(false);
      return;
    }

    if (isAuthenticated && !canGuestEdit) {
      // Luồng đã đăng nhập hiện chưa có API sửa riêng.
      // Giữ UI chỉnh sửa bình thường và đóng chế độ sửa tại FE.
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const updateResult = await rescueRequestService.updateGuestRequest(
        formData.requestId,
        formData,
        formData.accessCode,
      );

      if (!updateResult?.success) {
        setErrorMessage(updateResult?.message || 'Không thể cập nhật yêu cầu.');
        return;
      }

      const refreshed = await rescueRequestService.getTrackedGuestRequestStatus();
      const formatted = rescueRequestService.toRequestFormData({
        ...refreshed,
        accessCode: formData.accessCode,
      });

      setFormData((prev) => ({
        ...prev,
        ...formatted,
        requestId: prev.requestId,
        accessCode: prev.accessCode,
        conditions: {
          ...EMPTY_FORM_DATA.conditions,
          ...(formatted?.conditions || {}),
        },
      }));

      setIsEditing(false);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Không thể cập nhật yêu cầu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (e) => {
    if (isEditing) {
      return;
    }

    e.preventDefault();

    if (!canStartEdit) {
      if (isTerminal) {
        setErrorMessage('Yêu cầu đã ở trạng thái kết thúc, không thể chỉnh sửa.');
      }
      return;
    }

    setErrorMessage('');
    setIsEditing(true);
  };

  const handleConfirmRescued = async () => {
    const currentRequestId = formData?.requestId;
    if (!currentRequestId) {
      setErrorMessage('Không tìm thấy mã yêu cầu để xác nhận.');
      return;
    }

    if (!window.confirm('Xác nhận bạn đã được cứu hộ an toàn?')) {
      return;
    }

    setIsConfirming(true);
    setErrorMessage('');

    try {
      if (isAuthenticated) {
        await rescueRequestService.confirmRescued(currentRequestId);
      } else {
        const guestPhone = String(formData?.phone ?? '').trim();
        if (!guestPhone) {
          setErrorMessage('Số điện thoại là bắt buộc để xác nhận.');
          return;
        }
        await rescueRequestService.confirmRescuedAsGuest(currentRequestId, guestPhone);
      }

      setFormData((prev) => ({
        ...prev,
        status: 'Completed',
      }));
    } catch (error) {
      setErrorMessage(rescueRequestService.getConfirmRescuedErrorMessage(error));
    } finally {
      setIsConfirming(false);
    }
  };

  const handleConditionChange = (condition) => {
    setFormData((prev) => {
      const nextValue = !prev.conditions[condition];
      const nextConditions = {
        ...prev.conditions,
        [condition]: nextValue,
      };

      if (condition === 'floodUnder1m' && nextValue) {
        nextConditions.floodOver1m = false;
      }

      if (condition === 'floodOver1m' && nextValue) {
        nextConditions.floodUnder1m = false;
      }

      return {
        ...prev,
        conditions: nextConditions,
      };
    });
  };

  const editButtonDisabled = isEditing ? isLoading || isConfirming : !canStartEdit;

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

        {!isLoading && formData.status && (
          <div className={`status-banner status-${normalizedStatus.toLowerCase()}`}>
            <strong>Trạng thái:</strong> {getStatusLabel(formData.status)}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-left">
              <div className="form-field">
                <label>Số điện thoại</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                  required
                />
              </div>


              <div className="form-field">
                <label>Vị trí</label>
                <div className="location-group">
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    disabled={!isEditing}
                    required
                  />
                  <button type="button" className="location-btn" disabled={!isEditing} onClick={handleOpenMap}>
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
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="form-field">
                <label>Số người</label>
                <input
                  type="number"
                  value={formData.totalPeople}
                  onChange={(e) => setFormData({ ...formData, totalPeople: parseInt(e.target.value, 10) || 0 })}
                  disabled={!isEditing}
                  min="0"
                  required
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
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={!isEditing}
                ></textarea>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type={isEditing ? 'submit' : 'button'}
              className={`submit-btn ${editButtonDisabled ? 'disabled' : ''}`}
              onClick={handleEditClick}
              disabled={editButtonDisabled}
            >
              {isEditing ? 'Lưu thay đổi' : 'Chỉnh sửa'}
            </button>

            {canConfirmRescued && (
              <button
                type="button"
                className={`submit-btn confirm-btn ${isConfirming ? 'disabled' : ''}`}
                onClick={handleConfirmRescued}
                disabled={isConfirming}
              >
                {isConfirming ? 'Đang xác nhận...' : 'Hoàn tất'}
              </button>
            )}

            <button type="button" className="cancel-btn" onClick={onClose} disabled={isLoading || isConfirming}>
              Đóng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ViewRequest;
