import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  MapPinIcon,
  CubeIcon,
  EyeIcon,
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
        // Lấy cả phiếu nhập và phiếu xuất
        const importReceipts = await managerService.getImportReceipts().catch(() => [
          {
            receiptId: 1,
            type: 'import',
            source: 'Công ty TNHH Vật tư Cứu hộ Á Châu',
            receiveAddress: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
            createdAt: '2026-03-05T10:30:00',
            createdBy: 'admin',
            totalItems: 3,
            items: [
              { itemName: 'Nước uống', categoryName: 'Nhu yếu phẩm', quantity: 100, unit: 'chai' },
              { itemName: 'Mì gói', categoryName: 'Thực phẩm', quantity: 200, unit: 'gói' },
              { itemName: 'Áo mưa', categoryName: 'Quần áo', quantity: 50, unit: 'cái' },
            ]
          },
          {
            receiptId: 2,
            type: 'import',
            source: 'Công ty CP Thiết bị An toàn Việt Nam',
            receiveAddress: '456 Võ Văn Tần, Phường 6, Quận 3, TP.HCM',
            createdAt: '2026-03-07T14:15:00',
            createdBy: 'manager',
            totalItems: 2,
            items: [
              { itemName: 'Chăn màn', categoryName: 'Sinh hoạt', quantity: 80, unit: 'cái' },
              { itemName: 'Thuốc men', categoryName: 'Y tế', quantity: 150, unit: 'hộp' },
            ]
          },
          {
            receiptId: 3,
            type: 'import',
            source: 'Công ty TNHH Trang thiết bị Y tế Medico',
            receiveAddress: '789 Điện Biên Phủ, Phường 25, Bình Thạnh, TP.HCM',
            createdAt: '2026-03-08T09:00:00',
            createdBy: 'admin',
            totalItems: 4,
            items: [
              { itemName: 'Nước uống', categoryName: 'Nhu yếu phẩm', quantity: 300, unit: 'chai' },
              { itemName: 'Mì gói', categoryName: 'Thực phẩm', quantity: 500, unit: 'gói' },
              { itemName: 'Bánh mì', categoryName: 'Thực phẩm', quantity: 200, unit: 'ổ' },
              { itemName: 'Khẩu trang', categoryName: 'Y tế', quantity: 1000, unit: 'cái' },
            ]
          },
        ])

        const exportReceipts = await Promise.resolve([
          {
            receiptId: 101,
            type: 'export',
            destination: 'Đội Cứu Hộ Alpha',
            recipientAddress: '12 Đường Trần Hưng Đạo, Quận 1, TP.HCM',
            createdAt: '2026-03-10T08:45:00',
            createdBy: 'manager',
            totalItems: 3,
            items: [
              { itemName: 'Nước uống', categoryName: 'Nhu yếu phẩm', quantity: 50, unit: 'chai' },
              { itemName: 'Mì gói', categoryName: 'Thực phẩm', quantity: 100, unit: 'gói' },
              { itemName: 'Khăn mặt', categoryName: 'Sinh hoạt', quantity: 30, unit: 'cái' },
            ]
          },
          {
            receiptId: 102,
            type: 'export',
            destination: 'Đội Cứu Hộ Beta',
            recipientAddress: '456 Đường Lý Thái Tổ, Quận 10, TP.HCM',
            createdAt: '2026-03-11T13:20:00',
            createdBy: 'admin',
            totalItems: 2,
            items: [
              { itemName: 'Thuốc men', categoryName: 'Y tế', quantity: 60, unit: 'hộp' },
              { itemName: 'Chăn màn', categoryName: 'Sinh hoạt', quantity: 40, unit: 'cái' },
            ]
          },
          {
            receiptId: 103,
            type: 'export',
            destination: 'Trung Tâm Cứu Trợ Gamma',
            recipientAddress: '789 Đường Nguyễn Thị Minh Khai, Quận 3, TP.HCM',
            createdAt: '2026-03-09T10:00:00',
            createdBy: 'manager',
            totalItems: 4,
            items: [
              { itemName: 'Nước uống', categoryName: 'Nhu yếu phẩm', quantity: 200, unit: 'chai' },
              { itemName: 'Mì gói', categoryName: 'Thực phẩm', quantity: 300, unit: 'gói' },
              { itemName: 'Âo mưa', categoryName: 'Quần áo', quantity: 50, unit: 'cái' },
              { itemName: 'Khẩu trang', categoryName: 'Y tế', quantity: 500, unit: 'cái' },
            ]
          },
        ])

        // Mark import/export types
        const markedImport = importReceipts.map(r => ({ ...r, type: 'import' }))
        const markedExport = exportReceipts.map(r => ({ ...r, type: 'export' }))
        
        // Combine and sort by date
        data = [...markedImport, ...markedExport].sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        )
      } else if (activeTab === 'import') {
        data = await managerService.getImportReceipts().catch(() => [
          {
            receiptId: 1,
            type: 'import',
            source: 'Công ty TNHH Vật tư Cứu hộ Á Châu',
            receiveAddress: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
            createdAt: '2026-03-05T10:30:00',
            createdBy: 'admin',
            totalItems: 3,
            items: [
              { itemName: 'Nước uống', categoryName: 'Nhu yếu phẩm', quantity: 100, unit: 'chai' },
              { itemName: 'Mì gói', categoryName: 'Thực phẩm', quantity: 200, unit: 'gói' },
              { itemName: 'Áo mưa', categoryName: 'Quần áo', quantity: 50, unit: 'cái' },
            ]
          },
          {
            receiptId: 2,
            type: 'import',
            source: 'Công ty CP Thiết bị An toàn Việt Nam',
            receiveAddress: '456 Võ Văn Tần, Phường 6, Quận 3, TP.HCM',
            createdAt: '2026-03-07T14:15:00',
            createdBy: 'manager',
            totalItems: 2,
            items: [
              { itemName: 'Chăn màn', categoryName: 'Sinh hoạt', quantity: 80, unit: 'cái' },
              { itemName: 'Thuốc men', categoryName: 'Y tế', quantity: 150, unit: 'hộp' },
            ]
          },
          {
            receiptId: 3,
            type: 'import',
            source: 'Công ty TNHH Trang thiết bị Y tế Medico',
            receiveAddress: '789 Điện Biên Phủ, Phường 25, Bình Thạnh, TP.HCM',
            createdAt: '2026-03-08T09:00:00',
            createdBy: 'admin',
            totalItems: 4,
            items: [
              { itemName: 'Nước uống', categoryName: 'Nhu yếu phẩm', quantity: 300, unit: 'chai' },
              { itemName: 'Mì gói', categoryName: 'Thực phẩm', quantity: 500, unit: 'gói' },
              { itemName: 'Bánh mì', categoryName: 'Thực phẩm', quantity: 200, unit: 'ổ' },
              { itemName: 'Khẩu trang', categoryName: 'Y tế', quantity: 1000, unit: 'cái' },
            ]
          },
        ])
        data = data.map(r => ({ ...r, type: 'import' }))
      } else {
        // Export receipts
        data = await Promise.resolve([
          {
            receiptId: 101,
            type: 'export',
            destination: 'Đội Cứu Hộ Alpha',
            recipientAddress: '12 Đường Trần Hưng Đạo, Quận 1, TP.HCM',
            createdAt: '2026-03-10T08:45:00',
            createdBy: 'manager',
            totalItems: 3,
            items: [
              { itemName: 'Nước uống', categoryName: 'Nhu yếu phẩm', quantity: 50, unit: 'chai' },
              { itemName: 'Mì gói', categoryName: 'Thực phẩm', quantity: 100, unit: 'gói' },
              { itemName: 'Khăn mặt', categoryName: 'Sinh hoạt', quantity: 30, unit: 'cái' },
            ]
          },
          {
            receiptId: 102,
            type: 'export',
            destination: 'Đội Cứu Hộ Beta',
            recipientAddress: '456 Đường Lý Thái Tổ, Quận 10, TP.HCM',
            createdAt: '2026-03-11T13:20:00',
            createdBy: 'admin',
            totalItems: 2,
            items: [
              { itemName: 'Thuốc men', categoryName: 'Y tế', quantity: 60, unit: 'hộp' },
              { itemName: 'Chăn màn', categoryName: 'Sinh hoạt', quantity: 40, unit: 'cái' },
            ]
          },
          {
            receiptId: 103,
            type: 'export',
            destination: 'Trung Tâm Cứu Trợ Gamma',
            recipientAddress: '789 Đường Nguyễn Thị Minh Khai, Quận 3, TP.HCM',
            createdAt: '2026-03-09T10:00:00',
            createdBy: 'manager',
            totalItems: 4,
            items: [
              { itemName: 'Nước uống', categoryName: 'Nhu yếu phẩm', quantity: 200, unit: 'chai' },
              { itemName: 'Mì gói', categoryName: 'Thực phẩm', quantity: 300, unit: 'gói' },
              { itemName: 'Âo mưa', categoryName: 'Quần áo', quantity: 50, unit: 'cái' },
              { itemName: 'Khẩu trang', categoryName: 'Y tế', quantity: 500, unit: 'cái' },
            ]
          },
        ])
        data = data.map(r => ({ ...r, type: 'export' }))
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

  const formatDateTime = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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

        {/* Filter Toggle Button */}
        <div className="filter-header">
          <button 
            className="filter-toggle-btn"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FunnelIcon className="icon" />
            <span>Bộ lọc tổng hợp</span>
            {(startDate || endDate) && (
              <span className="filter-active-badge">●</span>
            )}
          </button>
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

        {/* Search Bar */}
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
          <div className="receipts-grid">
            {filteredReceipts.map((receipt) => {
              const receiptType = receipt.type || (receipt.source ? 'import' : 'export')
              return (
                <div key={`${receiptType}-${receipt.receiptId}`} className={`receipt-card ${receiptType}`}>
                  <div className="receipt-header">
                    <div className={`receipt-id ${receiptType}`}>
                      {receiptType === 'import' ? (
                        <ArrowDownTrayIcon className="icon" />
                      ) : (
                        <ArrowUpTrayIcon className="icon" />
                      )}
                      Phiếu {receiptType === 'import' ? 'Nhập' : 'Xuất'} #{receipt.receiptId}
                    </div>
                    <div className="receipt-date">
                      <CalendarIcon className="icon" />
                      {formatDateTime(receipt.createdAt)}
                    </div>
                  </div>

                  <div className="receipt-body">
                    {receiptType === 'import' ? (
                      <>
                        <div className="receipt-info-row">
                          <span className="label">Nguồn gốc:</span>
                          <span className="value">{receipt.source}</span>
                        </div>

                        <div className="receipt-info-row">
                          <MapPinIcon className="icon-small" />
                          <span className="value small">{receipt.receiveAddress}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="receipt-info-row">
                          <span className="label">Đơn vị nhận:</span>
                          <span className="value">{receipt.destination}</span>
                        </div>

                        <div className="receipt-info-row">
                          <MapPinIcon className="icon-small" />
                          <span className="value small">{receipt.recipientAddress}</span>
                        </div>
                      </>
                    )}

                    <div className="receipt-info-row">
                      <CubeIcon className="icon-small" />
                      <span className="value small">
                        {receipt.totalItems} loại vật tư
                      </span>
                    </div>
                  </div>

                  <div className="receipt-footer">
                    <button
                      className="btn-view-detail"
                      onClick={() => handleViewDetail(receipt)}
                    >
                      <EyeIcon className="icon" />
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              )
            })}
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
