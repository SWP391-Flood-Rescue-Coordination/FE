import React, { useMemo, useState } from 'react';
import './CoordinatorRequests.css';

const conditionOptions = [
  'Hết nhu yếu phẩm',
  'Sập nhà',
  'Cần điều trị y tế',
  'Ngập < 1m',
  'Ngập > 1m'
];

const statusOptions = [
  'PENDING',
  'VERIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED'
];

const priorityOptions = ['1', '2', '3', '4', '5'];

const initialMockRequests = [
  {
    requestId: 1,
    citizenId: null,
    citizenName: 'Nguyễn Văn A',
    citizenPhone: '0901234567',
    isGuest: true,
    title: 'Cần hỗ trợ gấp',
    description: 'Nước ngập mái nhà',
    condition: 'Ngập > 1m',
    address: 'Xã X, Huyện Y',
    priorityLevelId: 1,
    status: 'PENDING',
    createdAt: '2023-10-15T10:00:00Z'
  },
  {
    requestId: 2,
    citizenId: 12,
    citizenName: 'Trần Thị B',
    citizenPhone: '0912345678',
    isGuest: false,
    title: 'Thiếu lương thực',
    description: 'Gia đình bị cô lập 2 ngày',
    condition: 'Hết nhu yếu phẩm',
    address: 'Phường Z, Quận 3',
    priorityLevelId: 2,
    status: 'IN_PROGRESS',
    createdAt: '2023-10-15T11:20:00Z'
  },
  {
    requestId: 3,
    citizenId: 25,
    citizenName: 'Lê Văn C',
    citizenPhone: '0934567890',
    isGuest: false,
    title: 'Cần sơ tán',
    description: 'Nhà có người già, nước dâng nhanh',
    condition: 'Ngập < 1m',
    address: 'Thị trấn K, Huyện M',
    priorityLevelId: 1,
    status: 'PENDING',
    createdAt: '2023-10-15T12:05:00Z'
  }
];

const CoordinatorRequests = () => {
  const [requestsData, setRequestsData] = useState(initialMockRequests);
  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const [conditionFilter, setConditionFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loggedInFilter, setLoggedInFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // TODO (BE): Replace initialMockRequests with API data from:
  // GET /api/coordinator/requests?status=PENDING
  // Expected response shape: { success: true, data: [ { requestId, citizenId, citizenName, citizenPhone, isGuest, title, description, condition, address, priorityLevelId, status, createdAt, ... } ] }

  const requests = useMemo(() => {
    return requestsData.filter((req) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const name = (req.citizenName || '').toLowerCase();
        const phone = String(req.citizenPhone || '').toLowerCase();
        if (!name.includes(term) && !phone.includes(term)) return false;
      }
      if (conditionFilter && req.condition !== conditionFilter) return false;
      if (priorityFilter && String(req.priorityLevelId) !== String(priorityFilter)) {
        return false;
      }
      if (statusFilter && req.status?.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      if (loggedInFilter) {
        const isLoggedIn = !req.isGuest;
        if (loggedInFilter === 'Có' && !isLoggedIn) return false;
        if (loggedInFilter === 'Không' && isLoggedIn) return false;
      }
      return true;
    });
  }, [requestsData, conditionFilter, priorityFilter, statusFilter, loggedInFilter]);

  const startEdit = (req) => {
    setEditingId(req.requestId);
    setEditRow({ ...req });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRow(null);
  };

  const handleFieldChange = (field, value) => {
    setEditRow((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = () => {
    if (!editRow) return;
    // TODO (BE): Update request.
    // PUT /api/coordinator/set-request/{id}
    // Body: { status, priorityLevelId }
    setRequestsData((prev) =>
      prev.map((req) =>
        req.requestId === editRow.requestId ? { ...editRow } : req
      )
    );
    setEditingId(null);
    setEditRow(null);
    setShowSaveSuccess(true);
  };

  const isEditing = (reqId) => editingId === reqId;

  return (
    <div className="coordinator-page">
      <div className="coordinator-header">
        <h1>Danh sách yêu cầu cứu hộ</h1>
        <p>Trang mặc định sau khi đăng nhập với role Coordinator</p>
      </div>

      <div className="search-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Tìm theo tên hoặc số điện thoại"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="requests-table">
        <div className="table-header">
          <div>ID</div>
          <div>Người gửi</div>
          <div>Điện thoại</div>
          <button type="button" className="filter-button">
            Đã đăng nhập
            <span className="filter-icon">▾</span>
            <select
              className="filter-select"
              value={loggedInFilter}
              onChange={(e) => setLoggedInFilter(e.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="Có">Có</option>
              <option value="Không">Không</option>
            </select>
          </button>
          <button type="button" className="filter-button">
            Tình trạng
            <span className="filter-icon">▾</span>
            <select
              className="filter-select"
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
            >
              <option value="">Tất cả</option>
              {conditionOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </button>
          <div>Mô tả</div>
          <div>Địa chỉ</div>
          <button type="button" className="filter-button">
            Mức độ ưu tiên
            <span className="filter-icon">▾</span>
            <select
              className="filter-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">Tất cả</option>
              {priorityOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </button>
          <button type="button" className="filter-button">
            Trạng thái
            <span className="filter-icon">▾</span>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả</option>
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </button>
          <div>Thời gian</div>
          <div>Thao tác</div>
        </div>
        {requests.length === 0 ? (
          <div className="table-empty">Chưa có yêu cầu nào.</div>
        ) : (
          requests.map((req) => {
            const editing = isEditing(req.requestId);
            const row = editing && editRow ? editRow : req;
            const loggedInText = req.isGuest ? 'Không' : 'Có';
            return (
              <div className="table-row" key={req.requestId}>
                <div>{req.requestId}</div>
                <div>
                  {editing ? (
                    <input
                      className="row-input"
                      type="text"
                      value={row.citizenName ?? req.citizenName ?? ''}
                      onChange={(e) => handleFieldChange('citizenName', e.target.value)}
                    />
                  ) : (
                    req.citizenName || 'Khách vãng lai'
                  )}
                </div>
                <div>
                  {editing ? (
                    <input
                      className="row-input"
                      type="text"
                      value={row.citizenPhone ?? req.citizenPhone ?? ''}
                      onChange={(e) => handleFieldChange('citizenPhone', e.target.value)}
                    />
                  ) : (
                    req.citizenPhone || '--'
                  )}
                </div>
                <div>
                  {editing ? (
                    <select
                      className="row-input"
                      value={(row.isGuest ?? req.isGuest) ? 'Không' : 'Có'}
                      onChange={(e) => handleFieldChange('isGuest', e.target.value === 'Không')}
                    >
                      <option value="Có">Có</option>
                      <option value="Không">Không</option>
                    </select>
                  ) : (
                    loggedInText
                  )}
                </div>
                <div>
                  {editing ? (
                    <select
                      className="row-input"
                      value={row.condition ?? req.condition ?? ''}
                      onChange={(e) => handleFieldChange('condition', e.target.value)}
                    >
                      {conditionOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    req.condition
                  )}
                </div>
                <div>
                  {editing ? (
                    <input
                      className="row-input"
                      type="text"
                      value={row.description ?? req.description ?? ''}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                    />
                  ) : (
                    req.description
                  )}
                </div>
                <div>
                  {editing ? (
                    <input
                      className="row-input"
                      type="text"
                      value={row.address ?? req.address ?? ''}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                    />
                  ) : (
                    req.address
                  )}
                </div>
                <div>
                  {editing ? (
                    <select
                      className="row-input"
                      value={row.priorityLevelId ?? req.priorityLevelId ?? ''}
                      onChange={(e) => handleFieldChange('priorityLevelId', e.target.value === '' ? '' : Number(e.target.value))}
                    >
                      {priorityOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    req.priorityLevelId
                  )}
                </div>
                <div>
                  {editing ? (
                    <select
                      className="row-input"
                      value={row.status ?? req.status ?? ''}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    req.status
                  )}
                </div>
                <div>
                  {editing ? (
                    <input
                      className="row-input"
                      type="text"
                      value={row.createdAt ?? req.createdAt ?? ''}
                      onChange={(e) => handleFieldChange('createdAt', e.target.value)}
                    />
                  ) : (
                    req.createdAt
                  )}
                </div>
                <div className="row-actions">
                  {editing ? (
                    <>
                      <button type="button" className="row-save-button" onClick={saveEdit}>
                        Lưu
                      </button>
                      <button type="button" className="row-cancel-button" onClick={cancelEdit}>
                        Hủy
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="row-edit-button"
                      onClick={() => startEdit(req)}
                    >
                      Sửa
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showSaveSuccess && (
        <div className="save-overlay">
          <div className="save-popup">
            <h3>Lưu thành công!</h3>
            <button type="button" onClick={() => setShowSaveSuccess(false)}>
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinatorRequests;
