import { formatDateTimeVN } from './adminShared';
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  MapPinIcon,
  CubeIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  FunnelIcon,
  XMarkIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import managerService from '../services/managerService'
import './ManagerImportReceiptsListPage.css'

function ManagerImportReceiptsListPage() {
  const navigate = useNavigate()


  const [activeTab, setActiveTab] = useState('all') // 'all', 'import', or 'export'
  const [isLoading, setIsLoading] = useState(true)
  const [receipts, setReceipts] = useState([])
  const [filteredReceipts, setFilteredReceipts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  
  // Filter states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch danh sách phiếu nhập/xuất kho
  const fetchReceipts = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    setSearchTerm('')

    try {
      let data = []

      if (activeTab === 'all') {
        // Fetch both import and export receipts from API
        const [importResult, exportResult] = await Promise.allSettled([
          managerService.getImportReceipts(),
          managerService.getExportReceipts(),
        ])

        const markedImport = 
          importResult.status === 'fulfilled' && Array.isArray(importResult.value)
            ? importResult.value.map(r => ({ ...r, type: 'import' }))
            : []

        const markedExport = 
          exportResult.status === 'fulfilled' && Array.isArray(exportResult.value)
            ? exportResult.value.map(r => ({ ...r, type: 'export' }))
            : []
        
        // Combine and sort by date
        data = [...markedImport, ...markedExport].sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        )

        if (importResult.status === 'rejected' || exportResult.status === 'rejected') {
          setErrorMessage('Không thể tải đầy đủ dữ liệu từ hệ thống.')
        }
      } else if (activeTab === 'import') {
        const result = await managerService.getImportReceipts()
        data = Array.isArray(result) ? result.map(r => ({ ...r, type: 'import' })) : []
      } else {
        const result = await managerService.getExportReceipts()
        data = Array.isArray(result) ? result.map(r => ({ ...r, type: 'export' })) : []
      }
      
      setReceipts(data)
      setFilteredReceipts(data)
    } catch (error) {
      console.error('Error fetching receipts:', error)
      const errorMsg = managerService.getErrorMessage(error)
      setErrorMessage(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    const user = authService.getUserInfo()
    if (!user || user.role !== 'MANAGER') {
      navigate('/login', { replace: true })
      return
    }
    
    fetchReceipts()
  }, [navigate, fetchReceipts])

  // Handle search and filters
  useEffect(() => {
    let filtered = [...receipts]

    // Filter by search term
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(receipt => {
        const type = receipt.type || (receipt.source ? 'import' : 'export')
        
        if (type === 'import') {
          return (
            receipt.source?.toLowerCase().includes(lowerSearch) ||
            receipt.receiveAddress?.toLowerCase().includes(lowerSearch)
          )
        } else {
          return (
            receipt.destination?.toLowerCase().includes(lowerSearch) ||
            receipt.recipientAddress?.toLowerCase().includes(lowerSearch)
          )
        }
      })
    }

    // Filter by date range
    if (startDate) {
      const startDateTime = new Date(startDate).setHours(0, 0, 0, 0)
      filtered = filtered.filter(receipt => 
        new Date(receipt.createdAt) >= startDateTime
      )
    }
    
    if (endDate) {
      const endDateTime = new Date(endDate).setHours(23, 59, 59, 999)
      filtered = filtered.filter(receipt => 
        new Date(receipt.createdAt) <= endDateTime
      )
    }

    setFilteredReceipts(filtered)
  }, [searchTerm, receipts, startDate, endDate])

  // Reset filters
  const handleResetFilters = () => {
    setStartDate('')
    setEndDate('')
    setSearchTerm('')
  }

  const handleBack = () => {
    navigate('/manager')
  }

  const handleViewDetail = (receipt) => {
    setSelectedReceipt(receipt)
    setShowDetailModal(true)
  }

  const handleCloseModal = () => {
    setShowDetailModal(false)
    setSelectedReceipt(null)
  }

  const formatDateTime = (dateString) => formatDateTimeVN(dateString)

  if (isLoading) {
    return (
      <div className="manager-import-receipts-list-page">
        <div className="page-loading">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="manager-import-receipts-list-page">
      <button onClick={handleBack} className="back-button" aria-label="Quay lại">
        <ArrowLeftIcon className="icon" />
      </button>

      <div className="page-header">
        <h1>
          <ClipboardDocumentListIcon className="icon" />
          Quản Lý Phiếu Kho
        </h1>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Squares2X2Icon className="icon" />
          Tất Cả
        </button>
        <button
          className={`tab-button ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <ArrowDownTrayIcon className="icon" />
          Phiếu Nhập
        </button>
        <button
          className={`tab-button ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          <ArrowUpTrayIcon className="icon" />
          Phiếu Xuất
        </button>
      </div>

      <div className="page-content">
        {errorMessage && (
          <div className="error-message">
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="list-toolbar">
          <div className="search-bar">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              placeholder={
                activeTab === 'all'
                  ? 'Tìm kiếm theo nguồn/đích, địa chỉ...'
                  : activeTab === 'import'
                  ? 'Tìm kiếm theo nguồn gốc, địa chỉ tiếp nhận...'
                  : 'Tìm kiếm theo đơn vị nhận, địa chỉ...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-header compact">
            <button
              className="filter-toggle-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FunnelIcon className="icon" />
              <span>Bộ lọc tổng hợp</span>
              {(startDate || endDate) && (
                <span className="filter-active-badge">•</span>
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="advanced-filters">
            <div className="filters-row">
              <div className="filter-group">
                <label>
                  <CalendarIcon className="icon" />
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || undefined}
                />
              </div>

              <div className="filter-group">
                <label>
                  <CalendarIcon className="icon" />
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                />
              </div>

              <button 
                className="reset-filter-btn"
                onClick={handleResetFilters}
              >
                <XMarkIcon className="icon" />
                Xóa bộ lọc
              </button>
            </div>

            <div className="filter-summary">
              <span className="filter-result-count">
                <strong>{filteredReceipts.length}</strong> kết quả
              </span>
            </div>
          </div>
        )}

        {/* Receipts List */}
        {filteredReceipts.length === 0 ? (
          <div className="empty-state">
            <ClipboardDocumentListIcon className="empty-icon" />
            <p>
              {searchTerm || startDate || endDate
                ? 'Không tìm thấy phiếu nào phù hợp'
                : activeTab === 'all'
                ? 'Chưa có phiếu nào'
                : `Chưa có phiếu ${activeTab === 'import' ? 'nhập' : 'xuất'} nào`
              }
            </p>
          </div>
        ) : (
          <div className="receipts-table-wrap">
            <table className="receipts-table">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Loại phiếu</th>
                  <th>Nguồn / Đơn vị nhận</th>
                  <th>Địa chỉ</th>
                  <th>Số loại vật tư</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((receipt) => {
                  const receiptType = receipt.type || (receipt.source ? 'import' : 'export')
                  const primaryLabel = receiptType === 'import' ? receipt.source : receipt.destination
                  const addressLabel =
                    receiptType === 'import' ? receipt.receiveAddress : receipt.recipientAddress

                  return (
                    <tr
                      key={`${receiptType}-${receipt.receiptId}`}
                      className={`receipt-row ${receiptType}`}
                      onClick={() => handleViewDetail(receipt)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handleViewDetail(receipt)
                        }
                      }}
                      tabIndex={0}
                    >
                      <td>
                        <div className="receipt-code-cell">
                          <strong>#{receipt.receiptId}</strong>
                        </div>
                      </td>
                      <td>
                        <span className={`receipt-type-badge ${receiptType}`}>
                          {receiptType === 'import' ? 'Phiếu nhập' : 'Phiếu xuất'}
                        </span>
                      </td>
                      <td>
                        <div className="receipt-main-cell">
                          <strong>{primaryLabel || '-'}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="receipt-address-text">{addressLabel || 'Chưa có địa chỉ'}</span>
                      </td>
                      <td>{receipt.totalItems}</td>
                      <td>{formatDateTime(receipt.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedReceipt && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const modalType = selectedReceipt.type || (selectedReceipt.source ? 'import' : 'export')
              return (
                <>
                  <div className={`modal-header ${modalType}`}>
                    <div className="modal-title">
                      {modalType === 'import' ? (
                        <ArrowDownTrayIcon className="icon" />
                      ) : (
                        <ArrowUpTrayIcon className="icon" />
                      )}
                      <h2>Chi tiết phiếu {modalType === 'import' ? 'nhập' : 'xuất'} kho #{selectedReceipt.receiptId}</h2>
                    </div>
                    <button className="btn-close" onClick={handleCloseModal}>
                      <span>×</span>
                    </button>
                  </div>

                  <div className="modal-body">
                    <div className="detail-section">
                      <h3>Thông tin chung</h3>
                      <div className="detail-grid">
                        {modalType === 'import' ? (
                          <>
                            <div className="detail-item">
                              <span className="detail-label">Nguồn gốc</span>
                              <span className="detail-value">{selectedReceipt.source}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Địa chỉ tiếp nhận</span>
                              <span className="detail-value">{selectedReceipt.receiveAddress}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="detail-item">
                              <span className="detail-label">Đơn vị nhận</span>
                              <span className="detail-value">{selectedReceipt.destination}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Địa chỉ giao hàng</span>
                              <span className="detail-value">{selectedReceipt.recipientAddress}</span>
                            </div>
                          </>
                        )}
                        <div className="detail-item">
                          <span className="detail-label">Ngày tạo</span>
                          <span className="detail-value">{formatDateTime(selectedReceipt.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="detail-section">
                      <h3>Danh sách vật tư</h3>
                      <div className="items-table-container">
                        <table className="items-table">
                          <thead>
                            <tr>
                              <th>STT</th>
                              <th>Tên vật tư</th>
                              <th>Phân loại</th>
                              <th>Số lượng</th>
                              <th>Đơn vị</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedReceipt.items.map((item, index) => (
                              <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{item.itemName}</td>
                                <td>{item.categoryName}</td>
                                <td className="quantity">{item.quantity}</td>
                                <td>{item.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Bảng ghi chú */}
                    <div className="detail-section">
                      <h3>Ghi chú</h3>
                      <div className="note-table-container">
                        <table className="note-table">
                          <tbody>
                            <tr>
                              <td style={{fontSize: '1rem', color: '#374151', padding: '1.1rem'}}>{selectedReceipt.note || 'Không có ghi chú.'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagerImportReceiptsListPage

