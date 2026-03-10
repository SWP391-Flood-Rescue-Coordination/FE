import api from './api'

const MANAGER_BASE = '/Manager'

const unwrapApiData = (response) => {
  if (response?.data?.data !== undefined) {
    return response.data.data
  }
  return response?.data
}

const normalizeArray = (value) => (Array.isArray(value) ? value : [])

const VEHICLE_STATUS_TO_API_VALUE = {
  AVAILABLE: 'AVAILABLE',
  INUSE: 'INUSE',
  IN_USE: 'INUSE',
  MAINTENANCE: 'MAINTENANCE',
  DISABLED: 'DISABLED',
}

const toVehicleApiStatusValue = (status) => {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  return VEHICLE_STATUS_TO_API_VALUE[normalized] || status
}

const managerService = {
  getDashboardStats: async () => {
    try {
      const response = await api.get(`${MANAGER_BASE}/dashboard-stats`)
      return unwrapApiData(response)
    } catch (error) {
      console.error('[managerService] getDashboardStats error:', error)
      throw error
    }
  },

  getVehicleStats: async () => {
    try {
      const response = await api.get(`${MANAGER_BASE}/vehicle-stats`)
      return unwrapApiData(response)
    } catch (error) {
      console.error('[managerService] getVehicleStats error:', error)
      throw error
    }
  },

  getSupplyStats: async () => {
    try {
      const response = await api.get(`${MANAGER_BASE}/supply-stats`)
      return unwrapApiData(response)
    } catch (error) {
      console.error('[managerService] getSupplyStats error:', error)
      throw error
    }
  },

  getTodayStats: async () => {
    try {
      const response = await api.get(`${MANAGER_BASE}/today-stats`)
      return unwrapApiData(response)
    } catch (error) {
      console.error('[managerService] getTodayStats error:', error)
      throw error
    }
  },

  getAllVehicles: async (status = '') => {
    try {
      const normalizedStatus = toVehicleApiStatusValue(status)
      const params = normalizedStatus ? { status: normalizedStatus } : undefined
      const response = await api.get('/Vehicle', { params })
      return normalizeArray(unwrapApiData(response))
    } catch (error) {
      console.error('[managerService] getAllVehicles error:', error)
      throw error
    }
  },

  getSupplies: async () => {
    try {
      const response = await api.get(`${MANAGER_BASE}/supplies`)
      return normalizeArray(unwrapApiData(response))
    } catch (error) {
      console.error('[managerService] getSupplies error:', error)
      throw error
    }
  },

  getRecipientUnits: async () => {
    try {
      const response = await api.get(`${MANAGER_BASE}/recipient-units`)
      return normalizeArray(unwrapApiData(response))
    } catch (error) {
      console.error('[managerService] getRecipientUnits error:', error)
      throw error
    }
  },

  getLowStockSupplies: async () => {
    try {
      const response = await api.get(`${MANAGER_BASE}/supplies/low-stock`)
      return normalizeArray(unwrapApiData(response))
    } catch (error) {
      console.error('[managerService] getLowStockSupplies error:', error)
      throw error
    }
  },

  addSupply: async (supplyData) => {
    try {
      const response = await api.post(`${MANAGER_BASE}/supplies`, supplyData)
      return unwrapApiData(response)
    } catch (error) {
      console.error('[managerService] addSupply error:', error)
      throw error
    }
  },

  updateSupply: async (supplyId, supplyData) => {
    try {
      const response = await api.put(`${MANAGER_BASE}/supplies/${supplyId}`, supplyData)
      return unwrapApiData(response)
    } catch (error) {
      console.error('[managerService] updateSupply error:', error)
      throw error
    }
  },

  deleteSupply: async (supplyId) => {
    try {
      const response = await api.delete(`${MANAGER_BASE}/supplies/${supplyId}`)
      return unwrapApiData(response)
    } catch (error) {
      console.error('[managerService] deleteSupply error:', error)
      throw error
    }
  },

  getDetailedReport: async (startDate, endDate) => {
    try {
      const params = { startDate, endDate }
      const response = await api.get(`${MANAGER_BASE}/reports`, { params })
      return unwrapApiData(response)
    } catch (error) {
      console.error('[managerService] getDetailedReport error:', error)
      throw error
    }
  },

  exportReport: async (reportType, startDate, endDate) => {
    try {
      const response = await api.get(`${MANAGER_BASE}/reports/export`, {
        params: { reportType, startDate, endDate },
        responseType: 'blob',
      })
      return response.data
    } catch (error) {
      console.error('[managerService] exportReport error:', error)
      throw error
    }
  },

  createReliefExportOrder: async (payload) => {
    try {
      const response = await api.post(`${MANAGER_BASE}/relief-export-orders`, payload)
      return unwrapApiData(response)
    } catch (error) {
      console.error('[managerService] createReliefExportOrder error:', error)
      throw error
    }
  },

  getCategories: async () => {
    try {
      const response = await api.get(`${MANAGER_BASE}/categories`)
      return normalizeArray(unwrapApiData(response))
    } catch (error) {
      console.error('[managerService] getCategories error:', error)
      throw error
    }
  },

  createImportReceipt: async (payload) => {
    try {
      const response = await api.post(`${MANAGER_BASE}/import-receipts`, payload)
      return unwrapApiData(response)
    } catch (error) {
      console.error('[managerService] createImportReceipt error:', error)
      throw error
    }
  },

  getImportReceipts: async () => {
    try {
      const response = await api.get(`${MANAGER_BASE}/import-receipts`)
      return normalizeArray(unwrapApiData(response))
    } catch (error) {
      console.error('[managerService] getImportReceipts error:', error)
      throw error
    }
  },

  getErrorMessage: (error) => {
    const status = error?.response?.status
    const data = error?.response?.data

    if (status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    }

    if (status === 403) {
      return 'Bạn không có quyền truy cập chức năng này.'
    }

    if (status === 404) {
      return 'Không tìm thấy dữ liệu.'
    }

    if (status >= 500) {
      return 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'
    }

    return data?.message || data?.Message || 'Có lỗi xảy ra. Vui lòng thử lại.'
  },
}

export default managerService
