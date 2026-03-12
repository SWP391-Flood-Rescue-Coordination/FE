export const ROLE_ORDER = ['ADMIN', 'MANAGER', 'COORDINATOR', 'RESCUE_TEAM', 'CITIZEN']

export const REQUEST_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Mới tạo' },
  { value: 'VERIFIED', label: 'Đã xác minh' },
  { value: 'ASSIGNED', label: 'Đã phân công' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'CANCELLED', label: 'Hủy' },
  { value: 'DUPLICATE', label: 'Trùng lặp' },
]

export const REQUEST_STATUS_LABELS = {
  PENDING: 'Mới tạo',
  VERIFIED: 'Đã xác minh',
  ASSIGNED: 'Đã phân công',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Hủy',
  DUPLICATE: 'Trùng lặp',
}

export const DEFAULT_TEAM_SUMMARY = {
  total: 0,
  operating: 0,
  available: 0,
}

export const HOME_ROUTE_BY_ROLE = {
  ADMIN: '/admin',
  MANAGER: '/manager',
  COORDINATOR: '/rescue-coordinator',
  RESCUE_TEAM: '/rescue-team',
  CITIZEN: '/',
}

export const normalizeRole = (value) => {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  return normalized === 'RESCUE_COORDINATOR' ? 'COORDINATOR' : normalized
}

export const normalizeStatus = (value) => {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  return normalized === 'CANCELED' ? 'CANCELLED' : normalized
}

export const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

export const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleString('vi-VN')
}

export const formatPriority = (priorityLevelId) => {
  const numericPriority = Number(priorityLevelId)
  if (!Number.isFinite(numericPriority)) {
    return '-'
  }

  if (numericPriority === 3) {
    return 'Cao'
  }

  if (numericPriority === 2) {
    return 'Trung bình'
  }

  if (numericPriority === 1) {
    return 'Thấp'
  }

  return `Mức ${numericPriority}`
}
