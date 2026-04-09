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
  RESCUE_TEAM_LEADER: '/rescue-team',
  RESCUE_TEAM_MEMBER: '/rescue-team/member',
  CITIZEN: '/',
}

export const normalizeRole = (value) => {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  // Normalize rescue coordinator name
  if (normalized === 'RESCUE_COORDINATOR') return 'COORDINATOR'
  
  // Keep specific rescue team roles distinct (don't collapse to RESCUE_TEAM)
  if (normalized === 'RESCUE_TEAM_LEADER' || normalized === 'RESCUE_TEAM_MEMBER') {
    return normalized
  }
  
  return normalized
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

const VIETNAM_TIME_ZONE = 'Asia/Bangkok'

// Convert backend UTC+0 timestamp to proper Vietnam time (UTC+7)
// Backend timestamps without timezone indicator are assumed to be UTC+0
export const convertUtcToVietnam = (value) => {
  if (!value) {
    return null
  }

  let date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  // If timestamp string doesn't have timezone indicator, it's UTC+0 from backend
  // Add UTC+7 offset (7 * 60 * 60 * 1000 ms)
  if (typeof value === 'string' && !value.includes('Z') && !value.match(/[+-]\d{2}:\d{2}$/)) {
    date = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  }

  return date
}

export const toVietnamTime = (value) => {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDateTimeVN = (value, extraOptions = {}) => {
  const date = toVietnamTime(value)
  if (!date) {
    return '-'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...extraOptions,
  }).format(date)
}

// Format relative time in Vietnam timezone (e.g., "2 phút trước", "Vừa xong")
export const formatRelativeTimeVN = (timestamp) => {
  if (!timestamp) return null

  // Convert backend UTC+0 to Vietnam UTC+7
  const then = convertUtcToVietnam(timestamp)
  if (!then) return null

  const now = new Date()
  const diffMs = now - then
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'Vừa xong'
  if (diffMinutes < 60) return `${diffMinutes} phút trước`
  if (diffHours < 24) return `${diffHours} giờ trước`
  if (diffDays === 1) return 'Hôm qua'
  if (diffDays < 7) return `${diffDays} ngày trước`

  // Fallback: HH:MM Vietnam time
  return then.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
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
