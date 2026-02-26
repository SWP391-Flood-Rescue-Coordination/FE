import api from './api'

const CONDITION_DESCRIPTION_MAP = {
  needSupplies: 'Het nhu yeu pham',
  houseCollapsed: 'Sap nha',
  needMedical: 'Can dieu tri y te',
  floodUnder1m: 'Ngap duoi 1m',
  floodOver1m: 'Ngap tren 1m',
}

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

const rescueRequestService = {
  createRescueRequest: async (formData) => {
    const payload = buildCreatePayload(formData)
    const response = await api.post('/RescueRequest', payload)
    return response?.data ?? {}
  },
  buildCreatePayload,
  validateCreatePayloadInput,
  getCreateRequestErrorMessage,
}

export default rescueRequestService
