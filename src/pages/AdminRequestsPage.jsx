import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import authService from '../services/authService'
import adminService from '../services/adminService'
import {
  HOME_ROUTE_BY_ROLE,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_OPTIONS,
  formatDateTimeVN,
  formatPriority,
  normalizeRole,
  normalizeStatus,
} from './adminShared'

const REQUEST_PHONE_SEARCH_DEBOUNCE_MS = 350
const PHONE_SEARCH_MAX_LENGTH = 11

const normalizePhoneSearchKeyword = (value) =>
  String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, PHONE_SEARCH_MAX_LENGTH)
    .trim()

/*
  AdminRequestsPage là màn quản trị rescue request của admin.
  Flow trình bày:
  App.jsx -> /admin/requests -> AdminRequestsPage.jsx -> adminService.getRequests/cancelRequest.
*/
function AdminRequestsPage() {
  const navigate = useNavigate()
  const hasLoadedOnceRef = useRef(false)
  const requestSearchRequestIdRef = useRef(0)
  const [currentUser] = useState(() => authService.getUserInfo())
  const [requests, setRequests] = useState([])
  const [requestSearchTerm, setRequestSearchTerm] = useState('')
  const [debouncedRequestSearchTerm, setDebouncedRequestSearchTerm] = useState('')
  const [requestStatusFilter, setRequestStatusFilter] = useState('')
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [cancelingRequestId, setCancelingRequestId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isAuthenticated = authService.isAuthenticated()
  const roleKey = normalizeRole(currentUser?.role)
  const hasAdminAccess = isAuthenticated && roleKey === 'ADMIN'
  const fallbackHomeRoute = HOME_ROUTE_BY_ROLE[roleKey] || '/'
  const normalizedRequestSearchTerm = useMemo(
    () => normalizePhoneSearchKeyword(requestSearchTerm),
    [requestSearchTerm],
  )

  const handleUnauthorized = useCallback(
    (error) => {
      if (error?.response?.status === 401) {
        authService.logout()
        navigate('/login', { replace: true })
        return true
      }

      return false
    },
    [navigate],
  )

  // Tải danh sách request theo status filter để bảng và ô tìm kiếm dùng chung một nguồn dữ liệu.
  // API: GET /api/RescueRequest?status={status} hoặc GET /api/RescueRequest (lấy tất cả)
  // Return: Danh sách rescue request với các field requestId, status, priority, location, description, etc.
  // Xử lý: Set loading state, call service, catch error + handle 401
  const loadRequests = useCallback(
    async ({ fullPage = false } = {}) => {
      const requestId = requestSearchRequestIdRef.current + 1
      requestSearchRequestIdRef.current = requestId

      if (fullPage) {
        setIsPageLoading(true)
      } else {
        setIsTableLoading(true)
      }

      if (!fullPage) {
        setErrorMessage('')
      }

      try {
        // Gọi API lấy danh sách yêu cầu cứu hộ: GET /api/RescueRequest
        // Filter theo status nếu có (PENDING, VERIFIED, ASSIGNED, etc.)
        // FE dùng danh sách để render bảng, search, và các action
        const requestItems = await adminService.getRequests({
          status: requestStatusFilter,
          searchBy: debouncedRequestSearchTerm ? 'phone' : '',
          keyword: debouncedRequestSearchTerm,
        })
        if (requestId !== requestSearchRequestIdRef.current) {
          return
        }
        setRequests(requestItems)
      } catch (error) {
        if (handleUnauthorized(error)) {
          return
        }

        if (requestId !== requestSearchRequestIdRef.current) {
          return
        }

        setErrorMessage(adminService.getErrorMessage(error))
      } finally {
        if (requestId === requestSearchRequestIdRef.current) {
          if (fullPage) {
            setIsPageLoading(false)
          } else {
            setIsTableLoading(false)
          }
        }

        hasLoadedOnceRef.current = true
      }
    },
    [debouncedRequestSearchTerm, handleUnauthorized, requestStatusFilter],
  )

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    if (!hasAdminAccess) {
      return
    }

    loadRequests({ fullPage: !hasLoadedOnceRef.current })
  }, [hasAdminAccess, isAuthenticated, loadRequests, navigate])

  useEffect(() => {
    if (!successMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage('')
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [successMessage])

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => {
        setDebouncedRequestSearchTerm(normalizedRequestSearchTerm)
      },
      normalizedRequestSearchTerm ? REQUEST_PHONE_SEARCH_DEBOUNCE_MS : 0,
    )

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [normalizedRequestSearchTerm])

  const displayedRequests = useMemo(() => {
    const sortedRequests = [...requests]

    sortedRequests.sort((firstRequest, secondRequest) => {
      const firstRequestId = Number(firstRequest?.requestId)
      const secondRequestId = Number(secondRequest?.requestId)
      const hasFirstRequestId = Number.isFinite(firstRequestId)
      const hasSecondRequestId = Number.isFinite(secondRequestId)

      if (hasFirstRequestId && hasSecondRequestId && firstRequestId !== secondRequestId) {
        return firstRequestId - secondRequestId
      }

      if (hasFirstRequestId !== hasSecondRequestId) {
        return hasFirstRequestId ? -1 : 1
      }

      const firstCreatedAt = new Date(firstRequest?.createdAt ?? 0).getTime()
      const secondCreatedAt = new Date(secondRequest?.createdAt ?? 0).getTime()
      return firstCreatedAt - secondCreatedAt
    })

    return sortedRequests
  }, [requests])

  const handleLogout = () => {
    authService.logout()
    navigate('/login', { replace: true })
  }

  // Admin chỉ có một action nghiệp vụ chính ở màn này: chuyển request sang trạng thái Hủy.
  // Flow: User xác nhận hủy request → call API → set status = CANCELLED → reload list
  const handleCancelRequest = async (request) => {
    const requestId = request.requestId
    if (!requestId) {
      return
    }

    if (!window.confirm(`Chuyển yêu cầu #${requestId} sang trạng thái Hủy?`)) {
      return
    }

    setCancelingRequestId(requestId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      // Gọi API hủy request: PUT /api/RescueRequest/{requestId}/status
      // Payload: { status: 'CANCELLED' }
      // Flow: PENDING/VERIFIED/ASSIGNED → CANCELLED, người dùng sẽ nhận được thông báo
      // BE update RescueRequest.status = CANCELLED, ghi lại admin who cancelled
      const result = await adminService.cancelRequest(requestId)
      setSuccessMessage(result?.message || `Đã chuyển yêu cầu #${requestId} sang trạng thái Hủy.`)
      await loadRequests({ fullPage: false })
    } catch (error) {
      if (handleUnauthorized(error)) {
        return
      }

      setErrorMessage(adminService.getErrorMessage(error))
    } finally {
      setCancelingRequestId(null)
    }
  }

  const feedback = (
    <>
      {errorMessage && (
        <div className="admin-feedback error">
          <ExclamationTriangleIcon className="admin-feedback-icon" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="admin-feedback success">
          <CheckCircleIcon className="admin-feedback-icon" />
          <span>{successMessage}</span>
        </div>
      )}
    </>
  )

  return (
    <AdminLayout
      currentUser={currentUser}
      isAuthenticated={isAuthenticated}
      hasAdminAccess={hasAdminAccess}
      fallbackHomeRoute={fallbackHomeRoute}
      onLogout={handleLogout}
      isLoading={isPageLoading}
      feedback={feedback}
      loadingMessage="Đang tải danh sách yêu cầu..."
    >
      <section className="admin-workspace-card">
        <div className="admin-section-header">
          <div>
            <h2>Quản lý yêu cầu</h2>
            <p>Chọn một yêu cầu trong danh sách để chuyển sang trạng thái hủy.</p>
          </div>

          <div className="admin-filter-row">
            <label className="admin-search-box compact" htmlFor="admin-request-search">
              <MagnifyingGlassIcon className="admin-search-icon" />
              <input
                id="admin-request-search"
                type="text"
                value={requestSearchTerm}
                onChange={(event) => setRequestSearchTerm(normalizePhoneSearchKeyword(event.target.value))}
                {...{ placeholder: 'Tìm theo số điện thoại' }}
                placeholder="Tìm theo số điện thoại"
                inputMode="numeric"
              />
            </label>

            <select
              className="admin-filter-select"
              value={requestStatusFilter}
              onChange={(event) => setRequestStatusFilter(event.target.value)}
            >
              {REQUEST_STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'ALL'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table admin-request-table">
            <thead>
              <tr>
                <th>Mã yêu cầu</th>
                <th>Người gửi</th>
                <th>Số điện thoại</th>
                <th>Địa chỉ</th>
                <th>Mức ưu tiên</th>
                <th>Trạng thái</th>
                <th>Tạo lúc</th>
                <th>Cập nhật</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isTableLoading && (
                <tr>
                  <td colSpan="9" className="admin-table-placeholder">
                    Đang tải danh sách yêu cầu...
                  </td>
                </tr>
              )}

              {!isTableLoading && displayedRequests.length === 0 && (
                <tr>
                  <td colSpan="9" className="admin-table-placeholder">
                    Không có yêu cầu phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}

              {!isTableLoading &&
                displayedRequests.map((request) => {
                  const normalizedRequestStatus = normalizeStatus(request.status)
                  const isAlreadyCancelled = normalizedRequestStatus === 'CANCELLED'
                  const isCanceling = cancelingRequestId === request.requestId

                  return (
                    <tr key={request.requestId}>
                      <td>{request.requestId}</td>
                      <td>
                        <div className="admin-main-cell">
                          <strong>{request.citizenName || 'Khách vãng lai'}</strong>
                          <span>{request.title || request.description || '-'}</span>
                        </div>
                      </td>
                      <td>{request.citizenPhone || '-'}</td>
                      <td>{request.address || '-'}</td>
                      <td>{formatPriority(request.priorityLevelId)}</td>
                      <td>
                        <span className={`admin-badge request-status ${normalizedRequestStatus.toLowerCase()}`}>
                          {REQUEST_STATUS_LABELS[normalizedRequestStatus] || request.status || '-'}
                        </span>
                      </td>
                      <td>{formatDateTimeVN(request.createdAt)}</td>
                      <td>{formatDateTimeVN(request.updatedAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-primary-button small"
                          onClick={() => handleCancelRequest(request)}
                          disabled={isAlreadyCancelled || isCanceling}
                        >
                          {isAlreadyCancelled ? 'Đã hủy' : isCanceling ? 'Đang chuyển...' : 'Chuyển sang hủy'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  )
}

export default AdminRequestsPage
