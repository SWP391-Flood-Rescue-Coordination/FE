import api from './api'

// Service manager gom cả vehicle, vật tư và phiếu nhập/xuất để dashboard và page con dùng chung.
const unwrapApiData = (response) => {
  if (response?.data?.data !== undefined) {
    return response.data.data
  }
  if (response?.data?.Data !== undefined) {
    return response.data.Data
  }
  return response?.data
}

const normalizeArray = (value) => (Array.isArray(value) ? value : [])

const RELIEF_CATEGORY_LABEL_MAP = {
  1: 'Lương thực',
  2: 'Nước',
  3: 'Y tế',
  4: 'Quần áo',
  5: 'Nơi ở',
}

const repairDisplayText = (value, fallback = '') => {
  let text = String(value ?? '').trim()
  if (!text) {
    return fallback
  }

  if (/[ÃÂÄÆáºá»]/.test(text)) {
    try {
      text = decodeURIComponent(escape(text))
    } catch {
      // Giữ nguyên chuỗi cũ nếu không thể giải mã lại.
    }
  }

  return text
    .replace(/\bH\?p\b/g, 'Hộp')
    .replace(/\bD\?n v\?\b/g, 'Đơn vị')
    .replace(/\bDon vi\b/gi, 'Đơn vị')
    .trim() || fallback
}

const resolveReliefCategoryLabel = (name, categoryId) => {
  const repairedName = repairDisplayText(name, '')
  const matchedGroup = repairedName.match(/^Nh[oó]m\s*(\d+)$/i)
  const normalizedCategoryId = Number.isFinite(Number(categoryId))
    ? Number(categoryId)
    : matchedGroup
      ? Number(matchedGroup[1])
      : NaN

  if (Number.isFinite(normalizedCategoryId) && RELIEF_CATEGORY_LABEL_MAP[normalizedCategoryId]) {
    return RELIEF_CATEGORY_LABEL_MAP[normalizedCategoryId]
  }

  return repairedName || '-'
}

const MAX_RELIEF_ITEM_THRESHOLD = 2147483647

const REQUEST_STATUS_TO_API_VALUE = {
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  ASSIGNED: 'Assigned',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  CANCELED: 'Cancelled',
  DUPLICATE: 'Duplicate',
}

const VEHICLE_STATUS_TO_API_VALUE = {
  AVAILABLE: 'AVAILABLE',
  INUSE: 'INUSE',
  IN_USE: 'INUSE',
  MAINTENANCE: 'MAINTENANCE',
  DISABLED: 'DISABLED',
}

const VEHICLE_TYPE_OPTIONS = [
  { id: 2, code: 'BOAT', label: 'Thuyền' },
  { id: 3, code: 'TRUCK', label: 'Xe tải' },
  { id: 4, code: 'HELICOPTER', label: 'Trực thăng' },
  { id: 5, code: 'AMPHIBIOUS', label: 'Xe lưỡng cư' },
  { id: 6, code: 'DRONE', label: 'Thiết bị bay' },
]

// Các helper build payload ở đây giúp FE hiển thị tiếng Việt
// nhưng vẫn gửi đúng enum/id mà BE đang nhận.
const toApiRequestStatusValue = (status) => {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  return REQUEST_STATUS_TO_API_VALUE[normalized] || status
}

const toVehicleApiStatusValue = (status) => {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  return VEHICLE_STATUS_TO_API_VALUE[normalized] || status
}

const normalizeVehicleTypeKey = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '')

const toVehicleTypeId = (value) => {
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return numeric
  }

  const normalized = normalizeVehicleTypeKey(value)
  const matched = VEHICLE_TYPE_OPTIONS.find(
    (option) =>
      normalizeVehicleTypeKey(option.label) === normalized || normalizeVehicleTypeKey(option.code) === normalized,
  )

  return matched?.id ?? null
}

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const toNullableText = (value) => {
  const text = String(value ?? '').trim()
  return text || null
}

const buildVehiclePayload = (vehicleData, { isCreate = false, originalStatus = '' } = {}) => {
  const status = toVehicleApiStatusValue(vehicleData?.status)
  const normalizedOriginalStatus = String(originalStatus ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '')
  const isMaintenanceTransition = !isCreate && normalizedOriginalStatus !== 'MAINTENANCE' && status === 'MAINTENANCE'

  const payload = {
    VehicleName: toNullableText(vehicleData?.vehicleName),
    VehicleTypeId: toVehicleTypeId(vehicleData?.vehicleTypeId ?? vehicleData?.vehicleTypeName),
    Capacity: toNullableNumber(vehicleData?.capacity),
    CurrentLocation: toNullableText(vehicleData?.currentLocation),
    Latitude: toNullableNumber(vehicleData?.latitude),
    Longitude: toNullableNumber(vehicleData?.longitude),
  }

  if (isCreate || vehicleData?.licensePlate !== undefined) {
    payload.LicensePlate = String(vehicleData?.licensePlate ?? '').trim()
  }

  if (status && (isCreate || normalizedOriginalStatus !== 'INUSE')) {
    // Xe đang INUSE không được cho FE đổi trạng thái thủ công khi sửa.
    payload.Status = status
  }

  const explicitLastMaintenance = toNullableText(vehicleData?.lastMaintenance)
  if (explicitLastMaintenance && !isMaintenanceTransition) {
    payload.LastMaintenance = explicitLastMaintenance
  }

  return payload
}

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const firstNonEmptyText = (...values) => {
  for (const value of values) {
    const text = String(value ?? '').trim()
    if (text) {
      return text
    }
  }

  return ''
}

const toOptionalBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) {
    return fallback
  }

  return Boolean(value)
}

const isLowStockSupply = (item) => {
  const quantity = toNumber(item?.quantity)
  const minQuantity = toNumber(item?.minQuantity)
  return quantity <= minQuantity
}

const normalizeVehicle = (vehicle) => ({
  vehicleId: vehicle?.vehicleId ?? vehicle?.VehicleId ?? null,
  vehicleCode: repairDisplayText(vehicle?.vehicleCode ?? vehicle?.VehicleCode ?? '', ''),
  vehicleName: repairDisplayText(vehicle?.vehicleName ?? vehicle?.VehicleName ?? '', ''),
  vehicleTypeName: repairDisplayText(vehicle?.vehicleTypeName ?? vehicle?.VehicleTypeName ?? '', ''),
  vehicleTypeId:
    toVehicleTypeId(
      vehicle?.vehicleTypeId ?? vehicle?.VehicleTypeId ?? vehicle?.vehicleTypeName ?? vehicle?.VehicleTypeName,
    ) ?? null,
  vehicleType: repairDisplayText(vehicle?.vehicleTypeName ?? vehicle?.VehicleTypeName ?? '', ''),
  licensePlate: repairDisplayText(vehicle?.licensePlate ?? vehicle?.LicensePlate ?? '', ''),
  capacity: vehicle?.capacity ?? vehicle?.Capacity ?? null,
  status: repairDisplayText(vehicle?.status ?? vehicle?.Status ?? '', ''),
  currentLocation: repairDisplayText(vehicle?.currentLocation ?? vehicle?.CurrentLocation ?? '', ''),
  latitude: vehicle?.latitude ?? vehicle?.Latitude ?? null,
  longitude: vehicle?.longitude ?? vehicle?.Longitude ?? null,
  lastMaintenance: vehicle?.lastMaintenance ?? vehicle?.LastMaintenance ?? null,
  lastMaintenanceDate: vehicle?.lastMaintenance ?? vehicle?.LastMaintenance ?? null,
  updatedAt: vehicle?.updatedAt ?? vehicle?.UpdatedAt ?? null,
})

const normalizeSupply = (item) => ({
  supplyId: item?.itemId ?? item?.supplyId ?? item?.id,
  id: item?.itemId ?? item?.supplyId ?? item?.id,
  name: repairDisplayText(item?.itemName || item?.item_name || item?.name || item?.supplyName || item?.supply_name || '', ''),
  type: resolveReliefCategoryLabel(
    item?.categoryName ||
      item?.category_name ||
      item?.type ||
      item?.category ||
      (item?.categoryId != null ? `Nhóm ${item.categoryId}` : '-'),
    item?.categoryId ?? item?.category_id ?? item?.CategoryId,
  ),
  categoryId: item?.categoryId ?? item?.category_id ?? item?.CategoryId,
  quantity: toNumber(
    item?.quantity ??
      item?.Quantity ??
      item?.stockQuantity ??
      item?.stock_quantity ??
      item?.quantityInStock ??
      item?.quantity_in_stock ??
      item?.availableQuantity,
  ),
  unit: repairDisplayText(item?.unit || item?.Unit || item?.unit_name || 'đơn vị', 'đơn vị'),
  minQuantity: toNumber(item?.minQuantity ?? item?.min_quantity ?? item?.MinQuantity),
  isActive: Boolean(item?.isActive),
  importDate: item?.createdAt ?? item?.created_at,
  exportDate: item?.updatedAt ?? item?.updated_at,
  itemCode: item?.itemCode ?? item?.item_code,
})

const parseStockBody = (body) => {
  const raw = String(body ?? '').trim()
  if (!raw) {
    return []
  }

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [itemIdRaw, quantityRaw] = entry.split('-').map((part) => String(part ?? '').trim())
      const itemId = Number(itemIdRaw)
      const quantity = Number(quantityRaw)
      return {
        itemId: Number.isFinite(itemId) ? itemId : null,
        quantity: Number.isFinite(quantity) ? quantity : null,
      }
    })
    .filter((entry) => entry.itemId !== null && entry.quantity !== null)
}

const toSupplyNameMap = (supplies) => {
  const map = new Map()
  normalizeArray(supplies).forEach((item) => {
    const id = Number(item?.supplyId ?? item?.id)
    const name = String(item?.name ?? '').trim()
    const unit = String(item?.unit ?? '').trim()
    const categoryName = String(item?.type ?? '').trim()
    if (Number.isFinite(id) && name) {
      map.set(id, { name, unit, categoryName })
    }
  })
  return map
}

const normalizeStockEntry = (entry) => ({
  id: entry?.id,
  type: String(entry?.type ?? '').trim().toUpperCase(),
  date: entry?.date ?? entry?.createdAt ?? entry?.created_at ?? entry?.Date ?? null,
  body: entry?.body,
  fromTo: entry?.fromTo ?? entry?.from_to ?? '',
  note: entry?.note ?? '',
  source: entry?.source ?? entry?.Source ?? '',
  destination: entry?.destination ?? entry?.Destination ?? '',
  address: entry?.address ?? entry?.Address ?? '',
  receiveAddress: entry?.receiveAddress ?? entry?.receive_address ?? entry?.ReceiveAddress ?? '',
  recipientAddress: entry?.recipientAddress ?? entry?.recipient_address ?? entry?.RecipientAddress ?? '',
  stockUnitId:
    entry?.stockUnitId ??
    entry?.stock_unit_id ??
    entry?.StockUnitId ??
    entry?.stockUnit?.stockUnitId ??
    entry?.stockUnit?.StockUnitId ??
    entry?.stockUnit?.id ??
    entry?.StockUnit?.stockUnitId ??
    entry?.StockUnit?.StockUnitId ??
    entry?.StockUnit?.id ??
    null,
  stockUnit: entry?.stockUnit ?? entry?.StockUnit ?? null,
})

const toStockUnitAddressMap = (stockUnits) => {
  const map = new Map()

  normalizeArray(stockUnits).forEach((unit) => {
    const address = firstNonEmptyText(unit?.address, unit?.Address)
    if (!address) {
      return
    }

    ;[unit?.stockUnitId, unit?.StockUnitId, unit?.id, unit?.Id].forEach((key) => {
      const normalizedKey = String(key ?? '').trim()
      if (normalizedKey) {
        map.set(normalizedKey, address)
      }
    })
  })

  return map
}

const toReceiptItems = (entry, supplyNameMap) =>
  parseStockBody(entry?.body).map((part) => {
    const resolved = supplyNameMap.get(part.itemId) || {}
    return {
      itemId: part.itemId,
      itemName: resolved.name || `Vật tư #${part.itemId}`,
      categoryName: resolved.categoryName || '-',
      quantity: part.quantity,
      unit: resolved.unit || 'đơn vị',
    }
  })

const resolveStockUnitAddress = (entry, stockUnitAddressMap = new Map()) =>
  firstNonEmptyText(
    entry?.stockUnit?.address,
    entry?.stockUnit?.Address,
    stockUnitAddressMap.get(String(entry?.stockUnitId ?? '').trim()),
    stockUnitAddressMap.get(String(entry?.stockUnit?.stockUnitId ?? '').trim()),
    stockUnitAddressMap.get(String(entry?.stockUnit?.id ?? '').trim()),
  )

const resolveReceiptAddress = (entry, stockUnitAddressMap = new Map(), ...values) =>
  firstNonEmptyText(
    resolveStockUnitAddress(entry, stockUnitAddressMap),
    ...values,
    extractAddressOnly(entry?.note),
  )

const buildStockHistoryNote = ({ address = '', note = '' } = {}) => {
  const normalizedAddress = firstNonEmptyText(address)
  const normalizedNote = firstNonEmptyText(note)

  if (normalizedAddress && normalizedNote) {
    return `Address: ${normalizedAddress} | Note: ${normalizedNote}`
  }

  if (normalizedAddress) {
    return `Address: ${normalizedAddress}`
  }

  return normalizedNote
}

const normalizeImportReceipt = (entry, supplyNameMap) => {
  const items = toReceiptItems(entry, supplyNameMap)
  return {
    receiptId: entry.id,
    type: 'import',
    source: repairDisplayText(entry.fromTo || 'Không rõ nguồn', 'Không rõ nguồn'),
    note: repairDisplayText(extractNoteOnly(entry.note), ''),
    receiveAddress: repairDisplayText(extractAddressOnly(entry.note), ''),
    createdAt: entry.date,
    createdBy: '-',
    totalItems: items.length,
    items,
  }
}

const normalizeExportReceipt = (entry, supplyNameMap) => {
  const items = toReceiptItems(entry, supplyNameMap)
  return {
    receiptId: entry.id,
    type: 'export',
    destination: repairDisplayText(entry.fromTo || 'Không rõ đơn vị nhận', 'Không rõ đơn vị nhận'),
    note: repairDisplayText(extractNoteOnly(entry.note), ''),
    recipientAddress: repairDisplayText(extractAddressOnly(entry.note), ''),
    createdAt: entry.date,
    createdBy: '-',
    totalItems: items.length,
    items,
  }

}

// Helper để tách địa chỉ và ghi chú
function extractAddressOnly(note) {
  if (!note) return '';
  const addressMatch = note.match(/^Địa điểm nhận: ([^|]+)\s*\|/);
  return addressMatch ? addressMatch[1].trim() : '';
}

function extractNoteOnly(note) {
  if (!note) return '';
  const noteMatch = note.match(/\|\s*Ghi chú:\s*(.*)$/);
  return noteMatch ? noteMatch[1].trim() : note;
}

const extractStructuredAddress = (note) => {
  const rawNote = String(note ?? '').trim()
  if (!rawNote) {
    return ''
  }

  const match = rawNote.match(
    /(?:^|\|\s*)(?:Äá»‹a Ä‘iá»ƒm nháº­n|Dia diem nhan|Address|Recipient address)\s*:\s*([^|]+?)(?:\s*(?:\||$))/i,
  )

  return match ? match[1].trim() : extractAddressOnly(rawNote)
}

const extractStructuredNote = (note) => {
  const rawNote = String(note ?? '').trim()
  if (!rawNote) {
    return ''
  }

  const match = rawNote.match(/(?:^|\|\s*)(?:Ghi chÃº|Ghi chu|Note)\s*:\s*(.*)$/i)
  if (match) {
    return match[1].trim()
  }

  if (extractStructuredAddress(rawNote)) {
    return ''
  }

  return extractNoteOnly(rawNote)
}

const normalizeImportReceiptEntry = (entry, supplyNameMap, stockUnitAddressMap = new Map()) => {
  const items = toReceiptItems(entry, supplyNameMap)

  return {
    receiptId: entry?.id,
    type: 'import',
    source: repairDisplayText(entry?.source || entry?.fromTo || 'KhÃ´ng rÃµ nguá»“n', 'KhÃ´ng rÃµ nguá»“n'),
    note: repairDisplayText(extractStructuredNote(entry?.note), ''),
    receiveAddress: repairDisplayText(
      resolveReceiptAddress(entry, stockUnitAddressMap, entry?.receiveAddress, entry?.address),
      '',
    ),
    createdAt: entry?.date,
    createdBy: '-',
    totalItems: items.length,
    items,
  }
}

const normalizeExportReceiptEntry = (entry, supplyNameMap, stockUnitAddressMap = new Map()) => {
  const items = toReceiptItems(entry, supplyNameMap)

  return {
    receiptId: entry?.id,
    type: 'export',
    destination: repairDisplayText(
      entry?.destination || entry?.fromTo || 'KhÃ´ng rÃµ Ä‘Æ¡n vá»‹ nháº­n',
      'KhÃ´ng rÃµ Ä‘Æ¡n vá»‹ nháº­n',
    ),
    note: repairDisplayText(extractStructuredNote(entry?.note), ''),
    recipientAddress: repairDisplayText(
      resolveReceiptAddress(entry, stockUnitAddressMap, entry?.recipientAddress, entry?.address),
      '',
    ),
    createdAt: entry?.date,
    createdBy: '-',
    totalItems: items.length,
    items,
  }
}

const createNotImplementedError = (message) => {
  const error = new Error(message)
  error.response = {
    status: 501,
    data: {
      message,
    },
  }
  return error
}

const isNotFoundError = (error) => error?.response?.status === 404

const normalizeReceiptItemsInput = (items) =>
  normalizeArray(items)
    .map((item) => {
      const itemId = Number(item?.item_id ?? item?.itemId ?? item?.supplyId ?? item?.id)
      const quantity = Number(item?.quantity)

      return {
        itemId: Number.isFinite(itemId) ? itemId : null,
        quantity: Number.isFinite(quantity) ? quantity : null,
      }
    })
    .filter((item) => item.itemId !== null && item.quantity !== null && item.quantity > 0)

const normalizeCategory = (item) => {
  const categoryId = Number(item?.categoryId ?? item?.category_id ?? item?.id)
  return {
    categoryId: Number.isFinite(categoryId) ? categoryId : null,
    name: String(item?.name ?? item?.categoryName ?? '').trim() || 'Chưa đặt tên',
  }
}

const normalizeImportReceiptFromManager = (entry) => {
  const items = normalizeArray(entry?.items).map((item) => ({
    itemId: item?.itemId ?? item?.item_id ?? item?.supplyId,
    itemName: repairDisplayText(item?.itemName ?? item?.name ?? item?.supplyName ?? 'Không rõ vật tư', 'Không rõ vật tư'),
    categoryName: repairDisplayText(item?.categoryName ?? item?.category ?? '-', '-'),
    quantity: toNumber(item?.quantity),
    unit: repairDisplayText(item?.unit ?? 'đơn vị', 'đơn vị'),
  }))

  return {
    receiptId: entry?.receiptId ?? entry?.id,
    type: 'import',
    source: repairDisplayText(entry?.source ?? entry?.fromTo ?? 'Không rõ nguồn', 'Không rõ nguồn'),
    receiveAddress: repairDisplayText(
      firstNonEmptyText(
        entry?.receiveAddress,
        entry?.receive_address,
        entry?.address,
        entry?.stockUnit?.address,
        extractStructuredAddress(entry?.note),
      ),
      '',
    ),
    createdAt: entry?.createdAt ?? entry?.created_at ?? null,
    createdBy: entry?.createdBy ?? '-',
    totalItems: toNumber(entry?.totalItems, items.length),
    items,
  }
}

const normalizeExportReceiptFromManager = (entry) => {
  const items = normalizeArray(entry?.items).map((item) => ({
    itemId: item?.itemId ?? item?.item_id ?? item?.supplyId,
    itemName: repairDisplayText(item?.itemName ?? item?.name ?? item?.supplyName ?? 'Không rõ vật tư', 'Không rõ vật tư'),
    categoryName: repairDisplayText(item?.categoryName ?? item?.category ?? '-', '-'),
    quantity: toNumber(item?.quantity),
    unit: repairDisplayText(item?.unit ?? 'đơn vị', 'đơn vị'),
  }))

  return {
    receiptId: entry?.receiptId ?? entry?.id,
    type: 'export',
    destination: repairDisplayText(
      entry?.destination ?? entry?.recipientUnitName ?? entry?.fromTo ?? 'Không rõ đơn vị nhận',
      'Không rõ đơn vị nhận',
    ),
    recipientAddress: repairDisplayText(
      firstNonEmptyText(
        entry?.recipientAddress,
        entry?.recipient_address,
        entry?.address,
        entry?.stockUnit?.address,
        extractStructuredAddress(entry?.note),
      ),
      '',
    ),
    createdAt: entry?.createdAt ?? entry?.created_at ?? null,
    createdBy: entry?.createdBy ?? '-',
    totalItems: toNumber(entry?.totalItems, items.length),
    items,
  }
}

const getStatistics = async () => {
  const response = await api.get('/RescueRequest/statistics')
  return unwrapApiData(response) || {}
}

const getLowStockCount = async (threshold = 6) => {
  const response = await api.get('/ReliefItem/low-stock/count', {
    params: { n: threshold },
  })
  return toNumber(unwrapApiData(response), 0)
}

const managerService = {
  getDashboardStats: async () => {
    // Lấy thống kê tổng hợp: tổng request, request theo status, request hôm nay
    // Output: { totalRequests, pendingRequests, verifiedRequests, inProgressRequests, completedRequests, cancelledRequests, duplicateRequests, todayRequests }
    // Lỗi: 401 (hết phiên), 500 (lỗi server)
    try {
      const stats = await getStatistics()
      return {
        totalRequests: toNumber(stats?.totalRequests ?? stats?.TotalRequests),
        pendingRequests: toNumber(stats?.pendingRequests ?? stats?.PendingRequests),
        verifiedRequests: toNumber(stats?.verifiedRequests ?? stats?.VerifiedRequests),
        inProgressRequests: toNumber(stats?.inProgressRequests ?? stats?.InProgressRequests),
        completedRequests: toNumber(stats?.completedRequests ?? stats?.CompletedRequests),
        cancelledRequests: toNumber(stats?.cancelledRequests ?? stats?.CancelledRequests),
        duplicateRequests: toNumber(stats?.duplicateRequests ?? stats?.DuplicateRequests),
        todayRequests: toNumber(stats?.todayRequests ?? stats?.TodayRequests),
      }
    } catch (error) {
      throw error
    }
  },

  getVehicleStats: async () => {
    try {
      // Dashboard manager đang tự tổng hợp thống kê xe từ các API list theo status.
      const [allVehicles, availableVehicles, inUseVehicles, maintenanceVehicles] = await Promise.all([
        managerService.getAllVehicles(''),
        managerService.getAllVehicles('AVAILABLE'),
        managerService.getAllVehicles('INUSE'),
        managerService.getAllVehicles('MAINTENANCE'),
      ])

      return {
        total: allVehicles.length,
        available: availableVehicles.length,
        inUse: inUseVehicles.length,
        maintenance: maintenanceVehicles.length,
      }
    } catch (error) {
      throw error
    }
  },

  getSupplyStats: async () => {
    // Lấy thống kê vật tư: tổng loại vật tư, số loại tồn kho thấp
    // Output: { totalTypes, lowStock }
    // Lỗi: 401 (hết phiên), 5009 (lỗi server)
    try {
      const supplies = await managerService.getSupplies()
      const lowStockCount = supplies.filter(isLowStockSupply).length

      return {
        totalTypes: supplies.length,
        lowStock: lowStockCount,
      }
    } catch (error) {
      throw error
    }
  },



  getTodayStats: async () => {
    // Lấy thống kê hoạt động hôm nay: request phục vụ, xe đang dùng, vật tư phân phối
    // Output: { requestsServed, suppliesDistributed, vehiclesUsed }
    // Lỗi: 401 (hết phiên), 500 (lỗi server) - nếu lỗi trả về stats = 0
    try {
      const [stats, outTransactions, inUseVehicles, supplies] = await Promise.all([
        getStatistics(),
        api
          .get('/StockHistory', { params: { type: 'OUT' } })
          .then((response) => normalizeArray(unwrapApiData(response)).map(normalizeStockEntry))
          .catch(() => []),
        managerService.getAllVehicles('INUSE'),
        managerService.getSupplies(),
      ])

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todayOutTransactions = outTransactions.filter((entry) => {
        const date = new Date(entry.date)
        return Number.isFinite(date.getTime()) && date >= today
      })

      const suppliesDistributed = todayOutTransactions.reduce((sum, entry) => {
        return sum + parseStockBody(entry.body).reduce((entrySum, part) => entrySum + toNumber(part.quantity), 0)
      }, 0)

      return {
        requestsServed: toNumber(stats?.todayRequests ?? stats?.TodayRequests),
        suppliesDistributed,
        vehiclesUsed: inUseVehicles.length,
      }
    } catch (error) {
      return {
        requestsServed: 0,
        suppliesDistributed: 0,
        vehiclesUsed: 0,
      }
    }
  },

  getAllVehicles: async (options = '') => {
    // Lấy danh sách phương tiện với lọc theo trạng thái
    // Input: status (optional) - AVAILABLE/INUSE/MAINTENANCE
    // Output: Mảng vehicle chuẩn hóa
    // Lỗi: 401 (hết phiên), 500 (lỗi server)
    try {
      const normalizedOptions =
        options !== null && typeof options === 'object' && !Array.isArray(options) ? options : { status: options }
      const { status = '', searchBy = '', keyword = '' } = normalizedOptions
      const normalizedStatus = toVehicleApiStatusValue(status)
      const normalizedSearchBy = String(searchBy ?? '').trim()
      const normalizedKeyword = String(keyword ?? '').trim()
      const params = {}

      if (normalizedStatus) {
        params.status = normalizedStatus
      }

      if (normalizedSearchBy && normalizedKeyword) {
        params.searchBy = normalizedSearchBy
        params.keyword = normalizedKeyword
      }

      const response = await api.get('/Vehicle', { params })
      return normalizeArray(unwrapApiData(response)).map(normalizeVehicle)
    } catch (error) {
      throw error
    }
  },

  getVehicleById: async (vehicleId) => {
    // Lấy chi tiết phương tiện cụ thể
    // Input: vehicleId - ID phương tiện
    // Output: Vehicle object chuẩn hóa
    // Lỗi: 401 (hết phiên), 404 (không tìm thấy), 500 (lỗi server)
    const response = await api.get(`/Vehicle/${vehicleId}`)
    return normalizeVehicle(unwrapApiData(response))
  },

  createVehicle: async (vehicleData) => {
    // Tạo phương tiện mới (VehicleCode do backend sinh, FE tạo payload theo DTO mới)
    // Input: vehicleData - { name, type, licensePlate, capacity, location, latitude, longitude, status }
    // Output: Response với Data chứa vehicle đã tạo
    // Lỗi: 400 (dữ liệu không hợp lệ), 401 (hết phiên), 500 (lỗi server)
    // FE tạo payload theo DTO mới của BE, còn VehicleCode do backend sinh.
    const response = await api.post('/Vehicle', buildVehiclePayload(vehicleData, { isCreate: true }))
    const payload = response?.data ?? {}
    return {
      ...payload,
      Data: payload?.Data ? normalizeVehicle(payload.Data) : payload?.Data,
      data: payload?.data ? normalizeVehicle(payload.data) : payload?.data,
    }
  },

  updateVehicle: async (vehicleId, vehicleData, originalStatus = '') => {
    // Cập nhật thông tin phương tiện (không cập nhật status nếu xe đang INUSE)
    // Input: vehicleId, vehicleData, originalStatus - trạng thái cũ
    // Output: Response với Data chứa vehicle đã cập nhật
    // Lỗi: 400 (dữ liệu không hợp lệ), 401 (hết phiên), 404 (không tìm), 500 (lỗi)
    const response = await api.put(`/Vehicle/${vehicleId}`, buildVehiclePayload(vehicleData, { originalStatus }))
    const payload = response?.data ?? {}
    return {
      ...payload,
      Data: payload?.Data ? normalizeVehicle(payload.Data) : payload?.Data,
      data: payload?.data ? normalizeVehicle(payload.data) : payload?.data,
    }
  },

  deleteVehicle: async (vehicleId) => {
    // Xóa phương tiện
    // Input: vehicleId - ID phương tiện cần xóa
    // Output: Response success
    // Lỗi: 401 (hết phiên), 404 (không tìm thấy), 500 (lỗi server)
    const response = await api.delete(`/Vehicle/${vehicleId}`)
    return response?.data ?? {}
  },

  getVehicleTypeOptions: () => VEHICLE_TYPE_OPTIONS.map((item) => ({ ...item })),

  getSupplies: async (options = {}) => {
    // Lấy danh sách vật tư cứu trợ (lương thực, nước, y tế, quần áo, nơi ở)
    // Output: Mảng supply chuẩn hóa với id, name, type, quantity, unit, minQuantity
    // Lỗi: 401 (hết phiên), 500 (lỗi server)
    try {
      const normalizedOptions =
        options !== null && typeof options === 'object' && !Array.isArray(options) ? options : { keyword: options }
      const { searchBy = '', keyword = '' } = normalizedOptions
      const normalizedSearchBy = String(searchBy ?? '').trim()
      const normalizedKeyword = String(keyword ?? '').trim()
      const params = {}

      if (normalizedSearchBy && normalizedKeyword) {
        params.searchBy = normalizedSearchBy
        params.keyword = normalizedKeyword
      }

      const response = await api.get('/ReliefItem', { params })
      const payload = response?.data
      const items = payload?.items ?? payload?.Items ?? unwrapApiData(response)
      return normalizeArray(items).map(normalizeSupply)
    } catch (error) {
      throw error
    }
  },

  getRecipientUnits: async () => {
    // Lấy danh sách đơn vị tiếp nhận từ lịch sử định lộ (nhóm duy nhất)
    // Output: Mảng unit objects { receiverUnitId, receiverUnitName, receiverType, address }
    // Lỗi: 401 (hết phiên), 500 (lỗi server) - trả về [] nếu lỗi
    try {
      const response = await api.get('/StockHistory', {
        params: { type: 'OUT' },
      })

      const rows = normalizeArray(unwrapApiData(response)).map(normalizeStockEntry)
      const unique = new Map()

      rows.forEach((entry) => {
        const name = String(entry.fromTo ?? '').trim()
        if (!name || unique.has(name.toLowerCase())) {
          return
        }

        unique.set(name.toLowerCase(), {
          receiverUnitId: `unit-${unique.size + 1}`,
          receiverUnitName: name,
          receiverType: 'Đơn vị tiếp nhận',
          region: '',
          address: '',
        })
      })

      return Array.from(unique.values())
    } catch (error) {
      return []
    }
  },

  getImportOptions: async () => {
    // Lấy danh sách tùy chọn đơn vị nhập kho
    // Output: Mảng unit objects với thông tin đơn vị nhập
    // Lỗi: 401 (hết phiên), 4004 (endpoint không tồn tại), 500 (lỗi) - trả về [] nếu lỗi
    // Lấy đơn vị nhập kho
    try {
      const response = await api.get('/StockUnit/import-options')
      const data = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || response.data?.Data || [])
      return data
    } catch (error) {
      return []
    }
  },

  getExportOptions: async () => {
    // Lấy danh sách tùy chọn đơn vị xuất kho
    // Output: Mảng unit objects với thông tin đơn vị xuất
    // Lỗi: 401 (hết phiên), 404 (endpoint không tồn tại), 500 (lỗi) - trả về [] nếu lỗi
    // Lấy đơn vị xuất kho
    try {
      const response = await api.get('/StockUnit/export-options')
      const data = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || response.data?.Data || [])
      return data
    } catch (error) {
      return []
    }
  },

  getLowStockSupplies: async () => {
    // Lấy danh sách vật tư có tồn kho thấp (n = 6 mặc định)
    // Output: Mảng supply chuẩn hóa - những mặt hàng quantity <= minQuantity
    // Lỗi: 401 (hết phiên), 500 (lỗi server)
    try {
      const response = await api.get('/ReliefItem/low-stock', {
        params: { n: 6 },
      })
      const payload = response?.data
      const items = payload?.items ?? payload?.Items ?? unwrapApiData(response)
      return normalizeArray(items).map(normalizeSupply)
    } catch (error) {
      throw error
    }
  },

  addSupply: async (supplyData) => {
    // Thêm vật tư mới
    // Input: supplyData - { name, type, unit, quantity, minQuantity }
    // Output: Supply object
    // Lỗi: 501 (API chưa được backend hỗ trợ), 400, 401, 500
    try {
      void supplyData
      throw createNotImplementedError('API thêm vật tư chưa được backend hỗ trợ.')
    } catch (error) {
      throw error
    }
  },

  updateSupply: async (supplyId, supplyData) => {
    // Cập nhật thông tin vật tư (tên, đơn vị, số lượng tối thiểu, loại)
    // Input: supplyId - ID vật tư, supplyData - { name, unit, minQuantity, categoryId }
    // Output: Cập nhật supply object
    // Lỗi: 400 (dữ liệu không hợp lệ), 401 (hết phiên), 404 (không tìm), 500 (lỗi)
    try {
      const payload = {}

      if (supplyData?.name !== undefined) {
        payload.itemName = String(supplyData.name).trim()
      }
      if (supplyData?.unit !== undefined) {
        payload.unit = String(supplyData.unit).trim()
      }
      if (supplyData?.minQuantity !== undefined) {
        payload.minQuantity = toNumber(supplyData.minQuantity)
      }

      const numericCategoryId = Number(supplyData?.categoryId)
      if (Number.isFinite(numericCategoryId)) {
        payload.categoryId = numericCategoryId
      }

      const response = await api.put(`/ReliefItem/${supplyId}`, payload)
      return unwrapApiData(response)
    } catch (error) {
      throw error
    }
  },

  deleteSupply: async (supplyId) => {
    // Xóa vật tư
    // Input: supplyId - ID vật tư cần xóa
    // Output: Response success
    // Lỗi: 501 (API chưa được backend hỗ trợ), 401, 404, 500
    try {
      void supplyId
      throw createNotImplementedError('API xóa vật tư chưa được backend hỗ trợ.')
    } catch (error) {
      throw error
    }
  },

  getDetailedReport: async (startDate, endDate) => {
    // Lấy báo cáo chi tiết về rescue request trong khoảng thời gian
    // Input: startDate, endDate - ngày bắt đầu và kết thúc (ISO format)
    // Output: Mảng filtered requests theo ngày tạo
    // Lỗi: 401 (hết phiên), 500 (lỗi server)
    try {
      const params = {}
      if (startDate) {
        params.startDate = startDate
      }
      if (endDate) {
        params.endDate = endDate
      }

      const response = await api.get('/RescueRequest', { params })
      const rows = normalizeArray(unwrapApiData(response))

      return rows.filter((item) => {
        const createdAt = new Date(item?.createdAt)
        if (!Number.isFinite(createdAt.getTime())) {
          return false
        }

        if (startDate) {
          const start = new Date(startDate)
          start.setHours(0, 0, 0, 0)
          if (createdAt < start) {
            return false
          }
        }

        if (endDate) {
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999)
          if (createdAt > end) {
            return false
          }
        }

        return true
      })
    } catch (error) {
      throw error
    }
  },

  exportReport: async (reportType, startDate, endDate) => {
    // Xuất báo cáo theo kiểu (summary hoặc completed) thành file CSV
    // Input: reportType - 'summary' hoặc 'completed', startDate, endDate
    // Output: Blob (file CSV để download)
    // Lỗi: 401 (hết phiên), 500 (lỗi server)
    try {
      const reportRows = await managerService.getDetailedReport(startDate, endDate)
      const normalizedReportType = String(reportType ?? 'summary').trim().toLowerCase()
      const selectedRows =
        normalizedReportType === 'completed'
          ? reportRows.filter(
              (item) => toApiRequestStatusValue(item?.status) === REQUEST_STATUS_TO_API_VALUE.COMPLETED,
            )
          : reportRows

      const csvRows = [
        'requestId,title,status,address,createdAt,updatedAt',
        ...selectedRows.map((item) => {
          const values = [
            item?.requestId ?? '',
            item?.title ?? '',
            item?.status ?? '',
            item?.address ?? '',
            item?.createdAt ?? '',
            item?.updatedAt ?? '',
          ]

          return values
            .map((value) => `"${String(value).replaceAll('"', '""')}"`)
            .join(',')
        }),
      ]

      return new Blob([csvRows.join('\n')], {
        type: 'text/csv;charset=utf-8;',
      })
    } catch (error) {
      throw error
    }
  },

  createReliefExportOrder: async (payload) => {
    // Tạo đơn xuất cứu trợ: chỉ định vật tư, đơn vị xuất, địa chỉ nhận, phương tiện
    // Input: payload - { stockUnitId, destination, items: [{itemId, quantity}], vehicleIds, notes }
    // Output: Response success với id phiếu xuất
    // Lỗi: 400 (dữ liệu không hợp lệ), 401 (hết phiên), 500 (lỗi server)
    try {
      const stockUnitId = toNumber(payload?.stockUnitId ?? payload?.stockUnit?.stockUnitId)
      const address = firstNonEmptyText(
        payload?.address,
        payload?.recipientAddress,
        payload?.destination,
        payload?.stockUnit?.address,
      )
      const note = buildStockHistoryNote({
        address,
        note: payload?.notes ?? payload?.note,
      })

      const body = {
        stockUnitId: toNumber(payload?.stockUnitId), // truyền đúng stockUnitId cho backend
        teamId: toNumber(payload?.teamId ?? payload?.recipientUnitId ?? 1),
        destination: String(payload?.destination ?? payload?.recipientAddress ?? payload?.address ?? '').trim(),
        note: String(payload?.notes ?? payload?.note ?? '').trim(),
        stockUnitId,
        id: firstNonEmptyText(payload?.id, payload?.stockUnit?.id, stockUnitId ? `source-${stockUnitId}` : ''),
        name: firstNonEmptyText(payload?.name, payload?.stockUnit?.name),
        type: firstNonEmptyText(payload?.type, payload?.stockUnit?.type),
        region: firstNonEmptyText(payload?.region, payload?.stockUnit?.region),
        address,
        recipientAddress: address,
        supportsImport: toOptionalBoolean(payload?.supportsImport, false),
        supportsExport: toOptionalBoolean(payload?.supportsExport, true),
        teamId: toNumber(payload?.teamId ?? payload?.recipientUnitId ?? stockUnitId ?? 1),
        destination: firstNonEmptyText(payload?.destination, payload?.name, address),
        note,
        items: normalizeArray(payload?.supplyItems)
          .map((item) => ({
            itemId: toNumber(item?.supplyId ?? item?.itemId),
            quantity: toNumber(item?.quantity),
          }))
          .filter((item) => Number.isFinite(item.itemId) && Number.isFinite(item.quantity) && item.quantity > 0),
        vehicleIds: normalizeArray(payload?.vehicleIds).map((id) => toNumber(id)).filter(Number.isFinite),
      }

      const response = await api.post('/StockHistory/export', body)
      
      return unwrapApiData(response)
    } catch (error) {
      throw error
    }
  },

  getCategories: async () => {
    // Lấy danh sách loại vật tư (dedup từ danh sách supplies hoặc từ API endpoint nếu có)
    // Output: Mảng category { categoryId, name }
    // Lỗi: 401 (hết phiên), 500 (lỗi server) - nếu lỗi trả lại categories từ supplies
    try {
      try {
        // Endpoint không tồn tại trên backend, tạm skip
        throw new Error('Categories endpoint not implemented yet')
      } catch (categoriesError) {
        if (!isNotFoundError(categoriesError)) {
          // Ignore 404, fallback to supply deduplication
        }
      }

      const supplies = await managerService.getSupplies()
      const dedup = new Map()

      supplies.forEach((item) => {
        const categoryId = Number(item?.categoryId)
        if (!Number.isFinite(categoryId) || dedup.has(categoryId)) {
          return
        }

        dedup.set(categoryId, {
          categoryId,
          name: item?.type || `Nhóm ${categoryId}`,
        })
      })

      const normalizedCategories = Array.from(dedup.values()).map((item) => ({
        ...item,
        name: resolveReliefCategoryLabel(item?.name, item?.categoryId),
      }))

      return normalizedCategories
    } catch (error) {
      throw error
    }
  },

  createImportReceipt: async (payload) => {
    // Tạo phiếu nhập kho: chỉ định vật tư nhập, đơn vị nguồn, địa chỉ
    // Input: payload - { stockUnitId, source, items: [{itemId, quantity}], address, notes }
    // Output: Response success với id phiếu nhập
    // Lỗi: 400 (dữ liệu không hợp lệ), 401 (hết phiên), 500 (lỗi server)
    try {
      const stockUnitId = toNullableNumber(payload?.stockUnitId ?? payload?.stockUnit?.stockUnitId)
      const address = firstNonEmptyText(
        payload?.receive_address,
        payload?.receiveAddress,
        payload?.address,
        payload?.stockUnit?.address,
      )
      const note = buildStockHistoryNote({
        address,
        note: payload?.note,
      })

      const body = {
        source: String(payload?.source ?? payload?.fromTo ?? '').trim(),
        note: String(payload?.note ?? '').trim(),
        stockUnitId,
        id: firstNonEmptyText(payload?.id, payload?.stockUnit?.id),
        name: firstNonEmptyText(payload?.name, payload?.stockUnit?.name, payload?.source),
        type: firstNonEmptyText(payload?.type, payload?.stockUnit?.type),
        region: firstNonEmptyText(payload?.region, payload?.stockUnit?.region),
        address,
        receiveAddress: address,
        receive_address: address,
        supportsImport: toOptionalBoolean(payload?.supportsImport, true),
        supportsExport: toOptionalBoolean(payload?.supportsExport, false),
        source: firstNonEmptyText(payload?.source, payload?.fromTo, payload?.name),
        note,
        items: normalizeReceiptItemsInput(payload?.items),
      }

      const response = await api.post('/StockHistory/import', body)
      
      return unwrapApiData(response)
    } catch (error) {
      throw error
    }
  },

  getImportReceipts: async (options = {}) => {
    // Lấy danh sách phiếu nhập kho đã tạo
    // Output: Mảng import receipt chuẩn hóa { receiptId, type, source, items, createdAt }
    // Lỗi: 401 (hết phiên), 500 (lỗi server) - trả về [] nếu lỗi
    try {
      const normalizedOptions =
        options !== null && typeof options === 'object' && !Array.isArray(options) ? options : { receiptId: options }
      const receiptIdKeyword = String(normalizedOptions?.receiptId ?? '').trim()
      const params = { type: 'IN' }

      if (receiptIdKeyword) {
        params.searchBy = 'id'
        params.keyword = receiptIdKeyword
      }

      const [response, supplies, stockUnits] = await Promise.all([
        api.get('/StockHistory', { params }),
        managerService.getSupplies().catch(() => []),
        managerService.getImportOptions().catch(() => []),
      ])
      const supplyNameMap = toSupplyNameMap(supplies)
      const stockUnitAddressMap = toStockUnitAddressMap(stockUnits)
      const rows = normalizeArray(unwrapApiData(response)).map(normalizeStockEntry)
      return rows.map((entry) => normalizeImportReceiptEntry(entry, supplyNameMap, stockUnitAddressMap))
    } catch (error) {
      return []
    }
  },

  getExportReceipts: async (options = {}) => {
    // Lấy danh sách phiếu xuất kho đã tạo
    // Output: Mảng export receipt chuẩn hóa { receiptId, type, destination, items, createdAt }
    // Lỗi: 401 (hết phiên), 500 (lỗi server) - trả về [] nếu lỗi
    try {
      const normalizedOptions =
        options !== null && typeof options === 'object' && !Array.isArray(options) ? options : { receiptId: options }
      const receiptIdKeyword = String(normalizedOptions?.receiptId ?? '').trim()
      const params = { type: 'OUT' }

      if (receiptIdKeyword) {
        params.searchBy = 'id'
        params.keyword = receiptIdKeyword
      }

      const [response, supplies, stockUnits] = await Promise.all([
        api.get('/StockHistory', { params }),
        managerService.getSupplies().catch(() => []),
        managerService.getExportOptions().catch(() => []),
      ])
      const supplyNameMap = toSupplyNameMap(supplies)
      const stockUnitAddressMap = toStockUnitAddressMap(stockUnits)
      const rows = normalizeArray(unwrapApiData(response)).map(normalizeStockEntry)
      return rows.map((entry) => normalizeExportReceiptEntry(entry, supplyNameMap, stockUnitAddressMap))
    } catch (error) {
      return []
    }
  },

  getErrorMessage: (error) => {
    const status = error?.response?.status
    const data = error?.response?.data
    const serverMessage =
      data?.message ||
      data?.Message ||
      data?.title ||
      data?.error ||
      data?.detail

    if (!status) {
      return serverMessage || error?.message || 'Không thể kết nối đến máy chủ API.'
    }

    if (status === 401) {
      return serverMessage || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    }

    if (status === 403) {
      return serverMessage || 'Bạn không có quyền truy cập chức năng này.'
    }

    if (status === 404) {
      return serverMessage || 'Không tìm thấy dữ liệu.'
    }

    if (status === 501) {
      return serverMessage || 'API chưa được backend hỗ trợ.'
    }

    if (status >= 500) {
      return serverMessage || 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'
    }

    return serverMessage || 'Có lỗi xảy ra. Vui lòng thử lại.'
  },
}

export default managerService
