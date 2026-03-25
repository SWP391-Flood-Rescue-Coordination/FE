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
  if (explicitLastMaintenance) {
    payload.LastMaintenance = explicitLastMaintenance
  }

  return payload
}

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const isLowStockSupply = (item) => {
  const quantity = toNumber(item?.quantity)
  const minQuantity = toNumber(item?.minQuantity)
  return quantity <= minQuantity
}

const normalizeVehicle = (vehicle) => ({
  vehicleId: vehicle?.vehicleId ?? vehicle?.VehicleId ?? null,
  vehicleCode: vehicle?.vehicleCode ?? vehicle?.VehicleCode ?? '',
  vehicleName: vehicle?.vehicleName ?? vehicle?.VehicleName ?? '',
  vehicleTypeName: vehicle?.vehicleTypeName ?? vehicle?.VehicleTypeName ?? '',
  vehicleTypeId:
    toVehicleTypeId(
      vehicle?.vehicleTypeId ?? vehicle?.VehicleTypeId ?? vehicle?.vehicleTypeName ?? vehicle?.VehicleTypeName,
    ) ?? null,
  vehicleType: vehicle?.vehicleTypeName ?? vehicle?.VehicleTypeName ?? '',
  licensePlate: vehicle?.licensePlate ?? vehicle?.LicensePlate ?? '',
  capacity: vehicle?.capacity ?? vehicle?.Capacity ?? null,
  status: vehicle?.status ?? vehicle?.Status ?? '',
  currentLocation: vehicle?.currentLocation ?? vehicle?.CurrentLocation ?? '',
  latitude: vehicle?.latitude ?? vehicle?.Latitude ?? null,
  longitude: vehicle?.longitude ?? vehicle?.Longitude ?? null,
  lastMaintenance: vehicle?.lastMaintenance ?? vehicle?.LastMaintenance ?? null,
  lastMaintenanceDate: vehicle?.lastMaintenance ?? vehicle?.LastMaintenance ?? null,
  updatedAt: vehicle?.updatedAt ?? vehicle?.UpdatedAt ?? null,
})

const normalizeSupply = (item) => ({
  supplyId: item?.itemId ?? item?.supplyId ?? item?.id,
  id: item?.itemId ?? item?.supplyId ?? item?.id,
  name: item?.itemName || item?.item_name || item?.name || item?.supplyName || item?.supply_name || '',
  type:
    item?.categoryName ||
    item?.category_name ||
    item?.type ||
    item?.category ||
    (item?.categoryId != null ? `Nhóm ${item.categoryId}` : '-'),
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
  unit: item?.unit || item?.Unit || item?.unit_name || 'đơn vị',
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
  date: entry?.date,
  body: entry?.body,
  fromTo: entry?.fromTo ?? entry?.from_to ?? '',
  note: entry?.note ?? '',
})

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

const normalizeImportReceipt = (entry, supplyNameMap) => {
  const items = toReceiptItems(entry, supplyNameMap)
  return {
    receiptId: entry.id,
    type: 'import',
    source: entry.fromTo || 'Không rõ nguồn',
    note: extractNoteOnly(entry.note),
    receiveAddress: extractAddressOnly(entry.note),
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
    destination: entry.fromTo || 'Không rõ đơn vị nhận',
    note: extractNoteOnly(entry.note),
    recipientAddress: extractAddressOnly(entry.note),
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
    itemName: item?.itemName ?? item?.name ?? item?.supplyName ?? 'Không rõ vật tư',
    categoryName: item?.categoryName ?? item?.category ?? '-',
    quantity: toNumber(item?.quantity),
    unit: item?.unit ?? 'đơn vị',
  }))

  return {
    receiptId: entry?.receiptId ?? entry?.id,
    type: 'import',
    source: entry?.source ?? entry?.fromTo ?? 'Không rõ nguồn',
    receiveAddress: entry?.receiveAddress ?? entry?.receive_address ?? entry?.note ?? '',
    createdAt: entry?.createdAt ?? entry?.created_at ?? null,
    createdBy: entry?.createdBy ?? '-',
    totalItems: toNumber(entry?.totalItems, items.length),
    items,
  }
}

const normalizeExportReceiptFromManager = (entry) => {
  const items = normalizeArray(entry?.items).map((item) => ({
    itemId: item?.itemId ?? item?.item_id ?? item?.supplyId,
    itemName: item?.itemName ?? item?.name ?? item?.supplyName ?? 'Không rõ vật tư',
    categoryName: item?.categoryName ?? item?.category ?? '-',
    quantity: toNumber(item?.quantity),
    unit: item?.unit ?? 'đơn vị',
  }))

  return {
    receiptId: entry?.receiptId ?? entry?.id,
    type: 'export',
    destination: entry?.destination ?? entry?.recipientUnitName ?? entry?.fromTo ?? 'Không rõ đơn vị nhận',
    recipientAddress: entry?.recipientAddress ?? entry?.recipient_address ?? entry?.note ?? '',
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
      console.error('[managerService] getDashboardStats error:', error)
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
      console.error('[managerService] getVehicleStats error:', error)
      throw error
    }
  },

  getSupplyStats: async () => {
    try {
      const supplies = await managerService.getSupplies()
      const lowStockCount = supplies.filter(isLowStockSupply).length

      return {
        totalTypes: supplies.length,
        lowStock: lowStockCount,
      }
    } catch (error) {
      console.error('[managerService] getSupplyStats error:', error)
      throw error
    }
  },

  getTodayStats: async () => {
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

      const totalStockQuantity = supplies.reduce((sum, item) => sum + toNumber(item.quantity), 0)
      const consumptionRate =
        totalStockQuantity > 0
          ? Math.min(100, Math.round((suppliesDistributed / totalStockQuantity) * 100))
          : 0

      return {
        requestsServed: toNumber(stats?.todayRequests ?? stats?.TodayRequests),
        peopleHelped: 0,
        suppliesDistributed,
        vehiclesUsed: inUseVehicles.length,
        consumptionRate,
      }
    } catch (error) {
      console.error('[managerService] getTodayStats error:', error)
      return {
        requestsServed: 0,
        peopleHelped: 0,
        suppliesDistributed: 0,
        vehiclesUsed: 0,
        consumptionRate: 0,
      }
    }
  },

  getAllVehicles: async (status = '') => {
    try {
      const normalizedStatus = toVehicleApiStatusValue(status)
      const params = normalizedStatus ? { status: normalizedStatus } : undefined
      const response = await api.get('/Vehicle', { params })
      return normalizeArray(unwrapApiData(response)).map(normalizeVehicle)
    } catch (error) {
      console.error('[managerService] getAllVehicles error:', error)
      throw error
    }
  },

  getVehicleById: async (vehicleId) => {
    const response = await api.get(`/Vehicle/${vehicleId}`)
    return normalizeVehicle(unwrapApiData(response))
  },

  createVehicle: async (vehicleData) => {
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
    const response = await api.put(`/Vehicle/${vehicleId}`, buildVehiclePayload(vehicleData, { originalStatus }))
    const payload = response?.data ?? {}
    return {
      ...payload,
      Data: payload?.Data ? normalizeVehicle(payload.Data) : payload?.Data,
      data: payload?.data ? normalizeVehicle(payload.data) : payload?.data,
    }
  },

  deleteVehicle: async (vehicleId) => {
    const response = await api.delete(`/Vehicle/${vehicleId}`)
    return response?.data ?? {}
  },

  getVehicleTypeOptions: () => VEHICLE_TYPE_OPTIONS.map((item) => ({ ...item })),

  getSupplies: async () => {
    try {
      const response = await api.get('/ReliefItem/low-stock', {
        params: { n: MAX_RELIEF_ITEM_THRESHOLD },
      })
      const payload = response?.data
      const items = payload?.items ?? payload?.Items ?? unwrapApiData(response)
      return normalizeArray(items).map(normalizeSupply)
    } catch (error) {
      console.error('[managerService] getSupplies error:', error)
      throw error
    }
  },

  getRecipientUnits: async () => {
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
      console.error('[managerService] getRecipientUnits error:', error)
      return []
    }
  },

  getLowStockSupplies: async () => {
    try {
      const response = await api.get('/ReliefItem/low-stock', {
        params: { n: 6 },
      })
      const payload = response?.data
      const items = payload?.items ?? payload?.Items ?? unwrapApiData(response)
      return normalizeArray(items).map(normalizeSupply)
    } catch (error) {
      console.error('[managerService] getLowStockSupplies error:', error)
      throw error
    }
  },

  addSupply: async (supplyData) => {
    try {
      void supplyData
      throw createNotImplementedError('API thêm vật tư chưa được backend hỗ trợ.')
    } catch (error) {
      console.error('[managerService] addSupply error:', error)
      throw error
    }
  },

  updateSupply: async (supplyId, supplyData) => {
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
      console.error('[managerService] updateSupply error:', error)
      throw error
    }
  },

  deleteSupply: async (supplyId) => {
    try {
      void supplyId
      throw createNotImplementedError('API xóa vật tư chưa được backend hỗ trợ.')
    } catch (error) {
      console.error('[managerService] deleteSupply error:', error)
      throw error
    }
  },

  getDetailedReport: async (startDate, endDate) => {
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
      console.error('[managerService] getDetailedReport error:', error)
      throw error
    }
  },

  exportReport: async (reportType, startDate, endDate) => {
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
      console.error('[managerService] exportReport error:', error)
      throw error
    }
  },

  createReliefExportOrder: async (payload) => {
    try {
      const body = {
        teamId: toNumber(payload?.teamId ?? payload?.recipientUnitId ?? 1),
        destination: String(payload?.destination ?? payload?.recipientAddress ?? payload?.address ?? '').trim(),
        note: String(payload?.notes ?? payload?.note ?? '').trim(),
        items: normalizeArray(payload?.supplyItems)
          .map((item) => ({
            itemId: toNumber(item?.supplyId ?? item?.itemId),
            quantity: toNumber(item?.quantity),
          }))
          .filter((item) => Number.isFinite(item.itemId) && Number.isFinite(item.quantity) && item.quantity > 0),
        vehicleIds: normalizeArray(payload?.vehicleIds).map((id) => toNumber(id)).filter(Number.isFinite),
      }

      console.log('[managerService] createReliefExportOrder REQUEST BODY:', JSON.stringify(body, null, 2))
      console.log('[managerService] createReliefExportOrder Items Detail:', body.items)
      console.log('[managerService] createReliefExportOrder VehicleIds:', body.vehicleIds)

      const response = await api.post('/StockHistory/export', body)
      
      console.log('[managerService] createReliefExportOrder RESPONSE:', {
        status: response.status,
        data: response.data,
      })
      
      return unwrapApiData(response)
    } catch (error) {
      console.error('[managerService] createReliefExportOrder ERROR DETAIL:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
        url: error?.config?.url,
        requestBody: error?.config?.data,
      })
      throw error
    }
  },

  getCategories: async () => {
    try {
      try {
        // Endpoint không tồn tại trên backend,  tạm skip
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

      return Array.from(dedup.values())
    } catch (error) {
      console.error('[managerService] getCategories error:', error)
      throw error
    }
  },

  createImportReceipt: async (payload) => {
    try {
      const body = {
        source: String(payload?.source ?? payload?.fromTo ?? '').trim(),
        note: String(payload?.note ?? '').trim(),
        items: normalizeReceiptItemsInput(payload?.items),
      }

      console.log('[managerService] createImportReceipt REQUEST:', {
        endpoint: '/StockHistory/import',
        body,
      })

      const response = await api.post('/StockHistory/import', body)
      
      console.log('[managerService] createImportReceipt RESPONSE:', {
        status: response.status,
        data: response.data,
      })
      
      return unwrapApiData(response)
    } catch (error) {
      console.error('[managerService] createImportReceipt ERROR:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
        url: error?.config?.url,
      })
      throw error
    }
  },

  getImportReceipts: async () => {
    try {
      const [response, supplies] = await Promise.all([
        api.get('/StockHistory', { params: { type: 'IN' } }),
        managerService.getSupplies().catch(() => []),
      ])
      const supplyNameMap = toSupplyNameMap(supplies)
      const rows = normalizeArray(unwrapApiData(response)).map(normalizeStockEntry)
      return rows.map((entry) => normalizeImportReceipt(entry, supplyNameMap))
    } catch (error) {
      console.error('[managerService] getImportReceipts error:', error)
      return []
    }
  },

  getExportReceipts: async () => {
    try {
      const [response, supplies] = await Promise.all([
        api.get('/StockHistory', { params: { type: 'OUT' } }),
        managerService.getSupplies().catch(() => []),
      ])
      const supplyNameMap = toSupplyNameMap(supplies)
      const rows = normalizeArray(unwrapApiData(response)).map(normalizeStockEntry)
      return rows.map((entry) => normalizeExportReceipt(entry, supplyNameMap))
    } catch (error) {
      console.error('[managerService] getExportReceipts error:', error)
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
