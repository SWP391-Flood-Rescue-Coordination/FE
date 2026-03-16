import api from './api'

const CONDITION_DESCRIPTION_MAP = {
  needSupplies: 'Het nhu yeu pham',
  houseCollapsed: 'Sap nha',
  needMedical: 'Can dieu tri y te',
  floodUnder1m: 'Ngap duoi 1m',
  floodOver1m: 'Ngap tren 1m',
}

const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'CANCELED', 'DUPLICATE', 'DUPLICATED'])
const GUEST_REQUEST_TRACKING_KEY = 'guestRescueRequestTracking'
const GUEST_REQUEST_DETAILS_KEY = 'guestRescueRequestDetails'

const normalizeText = (value) => String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const flattenValidationErrors = (errors) => {
  if (!errors || typeof errors !== 'object') {
    return []
  }

  return Object.values(errors)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(Boolean)
    .map((value) => String(value))
}

const parseCoordinates = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return { latitude: null, longitude: null }
  }

  const [latText, lngText] = raw.split(',').map((item) => item.trim())
  if (!latText || !lngText) {
    return { latitude: null, longitude: null }
  }

  const latitude = Number(latText)
  const longitude = Number(lngText)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { latitude: null, longitude: null }
  }

  return { latitude, longitude }
}

const hasMeaningfulValue = (value) => {
  if (value === null || value === undefined) {
    return false
  }

  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  return true
}

const pickFirstMeaningful = (...values) => {
  for (const value of values) {
    if (hasMeaningfulValue(value)) {
      return value
    }
  }
  return null
}

const toNullableCoordinate = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const toNullableInteger = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number.parseInt(String(value), 10)
  return Number.isFinite(numeric) ? numeric : null
}

const mergeGuestRequestData = (apiData, cachedDetails, tracking) => {
  const source = apiData && typeof apiData === 'object' ? apiData : {}
  const cached = cachedDetails && typeof cachedDetails === 'object' ? cachedDetails : {}

  const requestIdRaw = pickFirstMeaningful(
    source?.requestId,
    source?.request_id,
    cached?.requestId,
    tracking?.requestId,
  )
  const requestId = toNullableInteger(requestIdRaw)
  const accessCode = String(
    pickFirstMeaningful(source?.accessCode, source?.AccessCode, cached?.accessCode, tracking?.accessCode) ?? '',
  ).trim()

  const phone = String(
    pickFirstMeaningful(source?.phone, source?.contactPhone, source?.citizenPhone, cached?.phone) ?? '',
  ).trim()

  const address = String(pickFirstMeaningful(source?.address, cached?.address) ?? '').trim()
  const description = String(pickFirstMeaningful(source?.description, cached?.description) ?? '').trim()

  const latitude = toNullableCoordinate(pickFirstMeaningful(source?.latitude, cached?.latitude))
  const longitude = toNullableCoordinate(pickFirstMeaningful(source?.longitude, cached?.longitude))

  const numberOfPeople = toNullableInteger(
    pickFirstMeaningful(
      source?.numberOfPeople,
      source?.number_of_people,
      source?.numberOfAffectedPeople,
      source?.number_of_affected_people,
      cached?.numberOfPeople,
      cached?.numberOfAffectedPeople,
    ),
  )

  return {
    ...cached,
    ...source,
    requestId,
    accessCode: accessCode || null,
    phone,
    address,
    description,
    latitude,
    longitude,
    numberOfPeople,
    status: String(pickFirstMeaningful(source?.status, cached?.status) ?? 'Pending'),
    createdAt: pickFirstMeaningful(source?.createdAt, source?.created_at, cached?.createdAt) ?? null,
    updatedAt:
      pickFirstMeaningful(source?.updatedAt, source?.updated_at, cached?.updatedAt) ?? new Date().toISOString(),
  }
}

const normalizeStatus = (status) => String(status ?? '').trim().toUpperCase().replace(/\s+/g, '_')

const isTerminalStatus = (status) => TERMINAL_STATUSES.has(normalizeStatus(status))

const buildTitle = (conditions) => {
  if (conditions?.needMedical) {
    return 'Can ho tro y te khan cap'
  }

  if (conditions?.houseCollapsed) {
    return 'Sap nha can cuu ho'
  }

  if (conditions?.floodOver1m) {
    return 'Ngap sau can cuu ho'
  }

  return 'Yeu cau cuu ho khan cap'
}

const buildDescription = (notes, conditions) => {
  const activeConditions = Object.entries(conditions || {})
    .filter(([, checked]) => Boolean(checked))
    .map(([key]) => CONDITION_DESCRIPTION_MAP[key])
    .filter(Boolean)

  const notesText = String(notes ?? '').trim()
  const conditionText = activeConditions.join('; ')

  if (notesText && conditionText) {
    return `${notesText}. Tinh trang: ${conditionText}.`
  }

  if (notesText) {
    return notesText
  }

  if (conditionText) {
    return `Tinh trang: ${conditionText}.`
  }

  return ''
}

const inferConditionsFromDescription = (description) => {
  const normalized = normalizeText(description)

  return {
    needSupplies: normalized.includes('nhu yeu') || normalized.includes('thuc pham') || normalized.includes('nuoc uong'),
    houseCollapsed: normalized.includes('sap nha') || normalized.includes('suc do') || normalized.includes('ngoi nha bi hu'),
    needMedical: normalized.includes('y te') || normalized.includes('can cuu thuong') || normalized.includes('can dieu tri'),
    floodUnder1m: normalized.includes('duoi 1m') || normalized.includes('< 1m'),
    floodOver1m: normalized.includes('tren 1m') || normalized.includes('> 1m') || normalized.includes('ngap sau'),
  }
}

const normalizeConditions = (conditions) => ({
  needSupplies: Boolean(conditions?.needSupplies),
  houseCollapsed: Boolean(conditions?.houseCollapsed),
  needMedical: Boolean(conditions?.needMedical),
  floodUnder1m: Boolean(conditions?.floodUnder1m),
  floodOver1m: Boolean(conditions?.floodOver1m),
})

const toRequestFormData = (requestItem) => {
  const rawLocation = String(requestItem?.location ?? requestItem?.Location ?? '').trim()
  const latitude = toNullableCoordinate(pickFirstMeaningful(requestItem?.latitude, requestItem?.Latitude))
  const longitude = toNullableCoordinate(pickFirstMeaningful(requestItem?.longitude, requestItem?.Longitude))
  const hasCoordinates = latitude !== null && longitude !== null
  const description = String(
    pickFirstMeaningful(requestItem?.description, requestItem?.Description, requestItem?.notes, requestItem?.Notes) ?? '',
  ).trim()
  const rawConditions = requestItem?.conditions ?? requestItem?.Conditions
  const hasConditionObject = rawConditions && typeof rawConditions === 'object' && !Array.isArray(rawConditions)
  const peopleValue = pickFirstMeaningful(
    requestItem?.totalPeople,
    requestItem?.TotalPeople,
    requestItem?.numberOfAffectedPeople,
    requestItem?.NumberOfAffectedPeople,
    requestItem?.numberOfPeople,
    requestItem?.NumberOfPeople,
    requestItem?.number_of_affected_people,
    requestItem?.number_of_people,
  )

  return {
    requestId: requestItem?.requestId ?? requestItem?.RequestId ?? requestItem?.request_id ?? null,
    accessCode: pickFirstMeaningful(requestItem?.accessCode, requestItem?.AccessCode) ?? null,
    phone: String(
      pickFirstMeaningful(
        requestItem?.phone,
        requestItem?.Phone,
        requestItem?.contactPhone,
        requestItem?.ContactPhone,
        requestItem?.citizenPhone,
        requestItem?.CitizenPhone,
      ) ?? '',
    ).trim(),
    location: rawLocation || (hasCoordinates ? `${latitude},${longitude}` : ''),
    address: String(pickFirstMeaningful(requestItem?.address, requestItem?.Address) ?? '').trim(),
    totalPeople: hasMeaningfulValue(peopleValue) ? String(peopleValue).trim() : '',
    conditions: hasConditionObject ? normalizeConditions(rawConditions) : inferConditionsFromDescription(description),
    notes: String(
      pickFirstMeaningful(
        requestItem?.notes,
        requestItem?.Notes,
        requestItem?.description,
        requestItem?.Description,
      ) ?? '',
    ).trim(),
    status: pickFirstMeaningful(requestItem?.status, requestItem?.Status) ?? 'Pending',
    submittedDate:
      pickFirstMeaningful(
        requestItem?.submittedDate,
        requestItem?.SubmittedDate,
        requestItem?.createdAt,
        requestItem?.CreatedAt,
        requestItem?.created_at,
      ) ?? null,
    updatedAt: pickFirstMeaningful(requestItem?.updatedAt, requestItem?.UpdatedAt, requestItem?.updated_at) ?? null,
  }
}

const getCreateRequestErrorMessage = (error) => {
  const status = error?.response?.status
  const data = error?.response?.data

  if (status === 400) {
    const validationMessages = flattenValidationErrors(data?.errors)
    if (validationMessages.length > 0) {
      return validationMessages.join(' ')
    }
    return data?.message || data?.title || 'Du lieu gui len khong hop le.'
  }

  if (status === 401) {
    return 'Phien dang nhap da het han hoac khong hop le. Vui long dang nhap lai.'
  }

  if (status === 403) {
    return data?.message || 'Ban khong co quyen thuc hien thao tac nay.'
  }

  if (status >= 500) {
    return 'He thong dang gap loi. Vui long thu lai sau.'
  }

  return data?.message || data?.title || 'Khong the gui yeu cau cuu ho. Vui long thu lai.'
}

const getConfirmRescuedErrorMessage = (error) => {
  const status = error?.response?.status
  const data = error?.response?.data

  if (status === 400) {
    const validationMessages = flattenValidationErrors(data?.errors)
    if (validationMessages.length > 0) {
      return validationMessages.join(' ')
    }
    return data?.message || data?.Message || 'Khong the xac nhan yeu cau nay.'
  }

  if (status === 401) {
    return 'Phien dang nhap da het han. Vui long dang nhap lai.'
  }

  if (status === 403) {
    return data?.message || data?.Message || 'Ban khong co quyen xac nhan yeu cau nay.'
  }

  if (status === 404) {
    return data?.message || data?.Message || 'Khong tim thay yeu cau can xac nhan.'
  }

  if (status >= 500) {
    return 'He thong dang gap loi. Vui long thu lai sau.'
  }

  return data?.message || data?.Message || data?.title || 'Khong the xac nhan da duoc cuu ho.'
}

const buildCreatePayload = (formData) => {
  const { latitude, longitude } = parseCoordinates(formData?.location)
  const peopleRaw = Number.parseInt(String(formData?.totalPeople ?? '').trim(), 10)

  return {
    title: buildTitle(formData?.conditions),
    contactName: String(formData?.contactName ?? '').trim() || null,
    contactPhone: String(formData?.phone ?? '').trim(),
    description: buildDescription(formData?.notes, formData?.conditions),
    latitude,
    longitude,
    address: String(formData?.address ?? '').trim(),
    numberOfPeople: Number.isFinite(peopleRaw) ? peopleRaw : null,
  }
}

const validateCreatePayloadInput = (formData) => {
  const phone = String(formData?.phone ?? '').trim()
  if (!phone) {
    return { valid: false, message: 'Vui long nhap so dien thoai.' }
  }

  const location = String(formData?.location ?? '').trim()
  const { latitude, longitude } = parseCoordinates(location)
  if (latitude === null || longitude === null) {
    return { valid: false, message: 'Vi tri khong hop le. Vui long nhap theo dinh dang: 10.762622,106.660172' }
  }

  const address = String(formData?.address ?? '').trim()
  if (!address) {
    return { valid: false, message: 'Vui long nhap dia chi cu the.' }
  }

  return { valid: true, message: '' }
}

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

const parseGuestTracking = (rawValue) => {
  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue)
    const requestId = Number.parseInt(String(parsed?.requestId ?? ''), 10)
    const accessCode = String(parsed?.accessCode ?? '').trim()
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return null
    }

    return { requestId, accessCode: accessCode || null }
  } catch {
    return null
  }
}

const getGuestTracking = () => parseGuestTracking(localStorage.getItem(GUEST_REQUEST_TRACKING_KEY))

const storeGuestTracking = (requestId, accessCode = null) => {
  const normalizedRequestId = Number.parseInt(String(requestId ?? ''), 10)
  const normalizedAccessCode = String(accessCode ?? '').trim()

  if (!Number.isInteger(normalizedRequestId) || normalizedRequestId <= 0) {
    return
  }

  localStorage.setItem(
    GUEST_REQUEST_TRACKING_KEY,
    JSON.stringify({ requestId: normalizedRequestId, accessCode: normalizedAccessCode || null }),
  )
}

const clearGuestTracking = () => {
  localStorage.removeItem(GUEST_REQUEST_TRACKING_KEY)
}

const parseGuestDetails = (rawValue) => {
  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const getGuestDetails = () => parseGuestDetails(localStorage.getItem(GUEST_REQUEST_DETAILS_KEY))

const storeGuestDetails = (details) => {
  if (!details || typeof details !== 'object') {
    return
  }
  localStorage.setItem(GUEST_REQUEST_DETAILS_KEY, JSON.stringify(details))
}

const clearGuestDetails = () => {
  localStorage.removeItem(GUEST_REQUEST_DETAILS_KEY)
}

const buildGuestDetailsFromForm = (formData, requestId = null, status = 'Pending', accessCode = null) => {
  const { latitude, longitude } = parseCoordinates(formData?.location)
  const peopleRaw = Number.parseInt(String(formData?.totalPeople ?? '').trim(), 10)

  return {
    requestId,
    accessCode: String(accessCode ?? '').trim() || null,
    phone: String(formData?.phone ?? '').trim(),
    latitude,
    longitude,
    address: String(formData?.address ?? '').trim(),
    numberOfPeople: Number.isFinite(peopleRaw) ? peopleRaw : null,
    description: buildDescription(formData?.notes, formData?.conditions),
    status,
    updatedAt: new Date().toISOString(),
  }
}

const buildGuestUpdatePayload = (formData) => {
  const { latitude, longitude } = parseCoordinates(formData?.location)
  const peopleRaw = Number.parseInt(String(formData?.totalPeople ?? '').trim(), 10)

  return {
    title: buildTitle(formData?.conditions),
    contactPhone: String(formData?.phone ?? '').trim() || null,
    description: buildDescription(formData?.notes, formData?.conditions),
    latitude,
    longitude,
    address: String(formData?.address ?? '').trim(),
    numberOfPeople: Number.isFinite(peopleRaw) ? peopleRaw : null,
  }
}

const rescueRequestService = {
  getCitizenDashboardStatistics: async () => {
    const response = await api.get('/RescueRequest/citizen-dashboard-statistics', { skipAuth: true })
    return unwrapApiData(response)
  },

  createRescueRequest: async (formData) => {
    const payload = buildCreatePayload(formData)
    const response = await api.post('/RescueRequest', payload)
    const rawData = response?.data ?? {}
    const requestId = toNullableInteger(
      pickFirstMeaningful(rawData?.requestId, rawData?.RequestId, rawData?.data?.requestId, rawData?.Data?.requestId),
    )
    const successRaw = pickFirstMeaningful(rawData?.success, rawData?.Success, true)
    const accessCodeRaw = pickFirstMeaningful(
      rawData?.accessCode,
      rawData?.AccessCode,
      rawData?.data?.accessCode,
      rawData?.Data?.accessCode,
    )
    const accessCode = String(accessCodeRaw ?? '').trim() || null

    const data = {
      ...rawData,
      requestId,
      accessCode,
      success: Boolean(successRaw),
    }

    if (requestId) {
      storeGuestTracking(requestId, accessCode)
      storeGuestDetails(
        buildGuestDetailsFromForm(formData, requestId, 'Pending', accessCode),
      )
    }

    return data
  },

  getMyRequests: async () => {
    const response = await api.get('/RescueRequest/my-requests')
    return normalizeArray(unwrapApiData(response))
  },

  getMyLatestRequest: async () => {
    const response = await api.get('/RescueRequest/my-latest-request')
    return unwrapApiData(response)
  },

  getGuestRequestStatus: async (requestId, accessCode = null) => {
    const params = { requestId }
    if (String(accessCode ?? '').trim()) {
      params.accessCode = String(accessCode).trim()
    }

    const response = await api.get('/RescueRequest/guest/status', { params })
    return unwrapApiData(response)
  },

  getTrackedGuestRequestStatus: async () => {
    const tracking = getGuestTracking()
    if (!tracking) {
      return null
    }

    const cachedDetails = getGuestDetails()
    const data = await rescueRequestService.getGuestRequestStatus(tracking.requestId, tracking.accessCode)
    const merged = mergeGuestRequestData(data, cachedDetails, tracking)

    storeGuestDetails(merged)
    storeGuestTracking(merged?.requestId ?? tracking.requestId, merged?.accessCode ?? tracking.accessCode)
    return merged
  },

  updateGuestRequest: async (requestId, formData, accessCode = null) => {
    const payload = buildGuestUpdatePayload(formData)
    const query = {}
    if (String(accessCode ?? '').trim()) {
      query.accessCode = String(accessCode).trim()
    }

    const requestConfig = Object.keys(query).length > 0 ? { params: query } : undefined
    const response = await api.put(`/RescueRequest/guest/update/${requestId}`, payload, requestConfig)
    const result = response?.data ?? {}

    if (result?.success) {
      const existingDetails = getGuestDetails()
      storeGuestDetails({
        ...(existingDetails || {}),
        ...buildGuestDetailsFromForm(
          formData,
          requestId,
          existingDetails?.status || 'Pending',
          accessCode ?? existingDetails?.accessCode ?? null,
        ),
      })
    }

    return result
  },

  confirmRescued: async (requestId) => {
    const response = await api.put(`/RescueRequest/${requestId}/confirm-rescued`)
    return response?.data ?? {}
  },

  confirmRescuedAsGuest: async (requestId, phone) => {
    const payload = {
      phone: String(phone ?? '').trim(),
    }
    const response = await api.put(`/RescueRequest/guest/${requestId}/confirm-rescued`, payload)
    const result = response?.data ?? {}

    const successRaw = pickFirstMeaningful(result?.success, result?.Success, false)
    if (Boolean(successRaw)) {
      const existingDetails = getGuestDetails()
      const resolvedStatus = String(pickFirstMeaningful(result?.status, result?.Status, 'Completed'))
      storeGuestDetails({
        ...(existingDetails || {}),
        requestId: toNullableInteger(requestId),
        phone: payload.phone || existingDetails?.phone || '',
        status: resolvedStatus,
        updatedAt: new Date().toISOString(),
      })
    }

    return result
  },

  getRequestById: async (requestId) => {
    const response = await api.get(`/RescueRequest/${requestId}`)
    return unwrapApiData(response)
  },

  getGuestTracking,
  storeGuestTracking,
  clearGuestTracking,
  getGuestDetails,
  storeGuestDetails,
  clearGuestDetails,

  parseCoordinates,
  normalizeStatus,
  isTerminalStatus,
  toRequestFormData,
  buildCreatePayload,
  buildGuestUpdatePayload,
  validateCreatePayloadInput,
  getCreateRequestErrorMessage,
  getConfirmRescuedErrorMessage,
}

export default rescueRequestService
