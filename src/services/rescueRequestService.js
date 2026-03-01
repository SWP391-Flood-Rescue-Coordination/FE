import api from './api'

const CONDITION_DESCRIPTION_MAP = {
  needSupplies: 'Het nhu yeu pham',
  houseCollapsed: 'Sap nha',
  needMedical: 'Can dieu tri y te',
  floodUnder1m: 'Ngap duoi 1m',
  floodOver1m: 'Ngap tren 1m',
}

const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'CANCELED', 'DUPLICATE', 'DUPLICATED'])

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

const toReportFormData = (requestItem) => {
  const latitude = requestItem?.latitude
  const longitude = requestItem?.longitude
  const hasCoordinates = latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined
  const description = String(requestItem?.description ?? '').trim()

  return {
    requestId: requestItem?.requestId ?? requestItem?.request_id ?? null,
    phone: String(requestItem?.phone ?? '').trim(),
    location: hasCoordinates ? `${latitude},${longitude}` : '',
    address: String(requestItem?.address ?? '').trim(),
    totalPeople:
      requestItem?.numberOfAffectedPeople !== null && requestItem?.numberOfAffectedPeople !== undefined
        ? String(requestItem.numberOfAffectedPeople)
        : '',
    conditions: inferConditionsFromDescription(description),
    notes: description,
    status: requestItem?.status ?? 'Pending',
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
    return 'Chi tai khoan Cong dan moi co quyen gui yeu cau cuu ho.'
  }

  if (status >= 500) {
    return 'He thong dang gap loi. Vui long thu lai sau.'
  }

  return data?.message || data?.title || 'Khong the gui yeu cau cuu ho. Vui long thu lai.'
}

const buildCreatePayload = (formData) => {
  const { latitude, longitude } = parseCoordinates(formData?.location)
  const peopleRaw = Number.parseInt(String(formData?.totalPeople ?? '').trim(), 10)

  return {
    title: buildTitle(formData?.conditions),
    phone: String(formData?.phone ?? '').trim(),
    description: buildDescription(formData?.notes, formData?.conditions),
    latitude,
    longitude,
    address: String(formData?.address ?? '').trim(),
    numberOfAffectedPeople: Number.isFinite(peopleRaw) ? peopleRaw : null,
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
  return response?.data
}

const normalizeArray = (value) => (Array.isArray(value) ? value : [])

const rescueRequestService = {
  createRescueRequest: async (formData) => {
    const payload = buildCreatePayload(formData)
    const response = await api.post('/RescueRequest', payload)
    return response?.data ?? {}
  },

  getMyRequests: async () => {
    const response = await api.get('/RescueRequest/my-requests')
    return normalizeArray(unwrapApiData(response))
  },

  parseCoordinates,
  normalizeStatus,
  isTerminalStatus,
  toReportFormData,
  buildCreatePayload,
  validateCreatePayloadInput,
  getCreateRequestErrorMessage,
}

export default rescueRequestService
