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
  UserIcon
} from '@heroicons/react/24/outline'
import authService from '../services/authService'
import managerService from '../services/managerService'
import './ManagerImportReceiptsListPage.css'

function ManagerImportReceiptsListPage() {
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('import') // 'import' or 'export'
  const [isLoading, setIsLoading] = useState(true)
  const [receipts, setReceipts] = useState([])
  const [filteredReceipts, setFilteredReceipts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Fetch danh sách phiếu nhập/xuất kho
  const fetchReceipts = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    setSearchTerm('')

    try {
      let data

      if (activeTab === 'import') {
        data = await managerService.getImportReceipts().catch(() => [
          {
            receiptId: 1,
            source: 'Nhà tài trợ ABC',
            receiveAddress: '123 Đường Lê Văn Việt, Quận 9, TP.HCM',
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
            source: 'Tổ chức Từ Thiện XYZ',
            receiveAddress: '456 Đường Nguyễn Văn Linh, Quận 7, TP.HCM',
            createdAt: '2026-03-07T14:15:00',
            createdBy: 'manager1',
            totalItems: 2,
            items: [
              { itemName: 'Chăn màn', categoryName: 'Sinh hoạt', quantity: 80, unit: 'cái' },
              { itemName: 'Thuốc men', categoryName: 'Y tế', quantity: 150, unit: 'hộp' },
            ]
          },
          {
            receiptId: 3,
            source: 'Sở Cứu Trợ Khẩn Cấp',
            receiveAddress: '789 Đường Võ Văn Kiệt, Quận 5, TP.HCM',
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
      } else {
        // Export receipts - Mock data hoặc từ API
        data = await Promise.resolve([
          {
            receiptId: 101,
            destination: 'Đội Cứu Hộ Alpha',
            recipientAddress: '12 Đường Trần Hưng Đạo, Quận 1, TP.HCM',
            createdAt: '2026-03-10T08:45:00',
            createdBy: 'manager1',
            totalItems: 3,
            items: [
              { itemName: 'Nước uống', categoryName: 'Nhu yếu phẩm', quantity: 50, unit: 'chai' },
              { itemName: 'Mì gói', categoryName: 'Thực phẩm', quantity: 100, unit: 'gói' },
              { itemName: 'Khăn mặt', categoryName: 'Sinh hoạt', quantity: 30, unit: 'cái' },
            ]
          },
          {
            receiptId: 102,
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
            destination: 'Trung Tâm Cứu Trợ Gamma',
            recipientAddress: '789 Đường Nguyễn Thị Minh Khai, Quận 3, TP.HCM',
            createdAt: '2026-03-12T10:00:00',
            createdBy: 'manager2',
            totalItems: 4,
            items: [
              { itemName: 'Nước uống', categoryName: 'Nhu yếu phẩm', quantity: 200, unit: 'chai' },
              { itemName: 'Mì gói', categoryName: 'Thực phẩm', quantity: 300, unit: 'gói' },
              { itemName: 'Âo mưa', categoryName: 'Quần áo', quantity: 50, unit: 'cái' },
              { itemName: 'Khẩu trang', categoryName: 'Y tế', quantity: 500, unit: 'cái' },
            ]
          },
        ])
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

  // Handle search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredReceipts(receipts)
      return
    }

    const lowerSearch = searchTerm.toLowerCase()
    const filtered = receipts.filter(receipt => {
      if (activeTab === 'import') {
        return (
          receipt.source?.toLowerCase().includes(lowerSearch) ||
          receipt.receiveAddress?.toLowerCase().includes(lowerSearch) ||
          receipt.createdBy?.toLowerCase().includes(lowerSearch)
        )
      } else {
        return (
          receipt.destination?.toLowerCase().includes(lowerSearch) ||
          receipt.recipientAddress?.toLowerCase().includes(lowerSearch) ||
          receipt.createdBy?.toLowerCase().includes(lowerSearch)
        )
      }
    })
    setFilteredReceipts(filtered)
  }, [searchTerm, receipts, activeTab])

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

        {/* Search Bar */}
        <div className="search-bar">
          <MagnifyingGlassIcon className="search-icon" />
          <input
            type="text"
            placeholder={
              activeTab === 'import'
                ? 'Tìm kiếm theo nguồn gốc, địa chỉ tiếp nhận, người tạo...'
                : 'Tìm kiếm theo đơn vị nhận, địa chỉ, người tạo...'
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
              {searchTerm
                ? `Không tìm thấy phiếu ${activeTab === 'import' ? 'nhập' : 'xuất'} nào`
                : `Chưa có phiếu ${activeTab === 'import' ? 'nhập' : 'xuất'} nào`
              }
            </p>
          </div>
        ) : (
          <div className="receipts-grid">
            {filteredReceipts.map((receipt) => (
              <div key={receipt.receiptId} className={`receipt-card ${activeTab}`}>
                <div className="receipt-header">
                  <div className={`receipt-id ${activeTab}`}>
                    {activeTab === 'import' ? (
                      <ArrowDownTrayIcon className="icon" />
                    ) : (
                      <ArrowUpTrayIcon className="icon" />
                    )}
                    Phiếu #{receipt.receiptId}
                  </div>
                  <div className="receipt-date">
                    <CalendarIcon className="icon" />
                    {formatDateTime(receipt.createdAt)}
                  </div>
                </div>

                <div className="receipt-body">
                  {activeTab === 'import' ? (
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

                  <div className="receipt-info-row">
                    <span className="label">Người tạo:</span>
                    <span className="value">{receipt.createdBy}</span>
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
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedReceipt && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-header ${activeTab}`}>
              <div className="modal-title">
                {activeTab === 'import' ? (
                  <ArrowDownTrayIcon className="icon" />
                ) : (
                  <ArrowUpTrayIcon className="icon" />
                )}
                <h2>Chi tiết phiếu {activeTab === 'import' ? 'nhập' : 'xuất'} kho #{selectedReceipt.receiptId}</h2>
              </div>
              <button className="btn-close" onClick={handleCloseModal}>
                <span>×</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Thông tin chung</h3>
                <div className="detail-grid">
                  {activeTab === 'import' ? (
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
                  <div className="detail-item">
                    <span className="detail-label">Người tạo</span>
                    <span className="detail-value">
                      <UserIcon className="icon-inline" />
                      {selectedReceipt.createdBy}
                    </span>
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
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagerImportReceiptsListPage
