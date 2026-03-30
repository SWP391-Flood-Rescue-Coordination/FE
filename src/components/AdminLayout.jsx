import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeftOnRectangleIcon,
  ArrowPathIcon,
  Bars3Icon,
  ClipboardDocumentListIcon,
  Squares2X2Icon,
  UserCircleIcon,
  UserGroupIcon,
  XMarkIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import adminService from '../services/adminService'
import './AdminLayout.css'
import LogoutConfirmModal from './LogoutConfirmModal'

const NAV_ITEMS = [
  {
    to: '/admin',
    end: true,
    label: 'Bảng điều khiển',
    description: 'Tổng quan tài khoản và đội cứu hộ',
    icon: Squares2X2Icon,
  },
  {
    to: '/admin/users',
    end: true,
    label: 'Quản lý người dùng',
    description: 'Cập nhật vai trò và trạng thái tài khoản',
    icon: UserGroupIcon,
  },
  {
    to: '/admin/requests',
    end: true,
    label: 'Quản lý yêu cầu',
    description: 'Chuyển yêu cầu về trạng thái hủy',
    icon: ClipboardDocumentListIcon,
  },
]

function AdminLayout({
  currentUser,
  isAuthenticated,
  hasAdminAccess,
  fallbackHomeRoute,
  onLogout,
  isLoading = false,
  loadingMessage = 'Đang tải dữ liệu quản trị...',
  feedback = null,
  children,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const userMenuRef = useRef(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSidebarDrawer, setShowSidebarDrawer] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  useEffect(() => {
    setShowSidebarDrawer(false)
  }, [location.pathname])

  useEffect(() => {
    if (!showSidebarDrawer) {
      return undefined
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowSidebarDrawer(false)
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showSidebarDrawer])

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }
  const handleLogoutConfirm = () => {
    onLogout && onLogout()
    setShowLogoutConfirm(false)
  }
  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false)
  }

  if (!isAuthenticated) {
    return null
  }

  if (!hasAdminAccess) {
    return (
      <div className="admin-page">
        <header className="admin-header">
          <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>
          <button type="button" className="admin-header-icon-button danger" onClick={handleLogout} aria-label="Đăng xuất">
            <ArrowLeftOnRectangleIcon className="admin-header-icon" />
          </button>
        </header>

        <main className="admin-content denied">
          <section className="admin-denied-card">
            <div className="admin-denied-icon">
              <XCircleIcon className="admin-denied-svg" />
            </div>
            <h2>Không có quyền vào trang này</h2>
            <p>Trang quản trị chỉ dành cho tài khoản có vai trò quản trị viên.</p>
            <div className="admin-denied-actions">
              <button type="button" className="admin-primary-button" onClick={() => navigate(fallbackHomeRoute, { replace: true })}>
                Quay về trang phù hợp
              </button>
              <button type="button" className="admin-secondary-button" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Hệ Thống Quản Lí Cứu Hộ Cứu Trợ Lũ Lụt</h1>

        <div className="admin-header-actions">
          <div className="admin-user-menu-wrap" ref={userMenuRef}>
            <button
              type="button"
              className="admin-header-icon-button"
              onClick={() => setShowUserMenu((previousValue) => !previousValue)}
              aria-label="Thông tin người dùng"
            >
              <UserCircleIcon className="admin-header-icon" />
            </button>

            {showUserMenu && (
              <div className="admin-user-card">
                <h3>Thông tin tài khoản</h3>
                <div className="admin-user-row">
                  <span>Tài khoản</span>
                  <strong>{currentUser?.username || '-'}</strong>
                </div>
                <div className="admin-user-row">
                  <span>Họ tên</span>
                  <strong>{currentUser?.fullName || '-'}</strong>
                </div>
                <div className="admin-user-row">
                  <span>Email</span>
                  <strong>{currentUser?.email || '-'}</strong>
                </div>
                <div className="admin-user-row">
                  <span>Vai trò</span>
                  <strong>{adminService.getRoleLabel(currentUser?.role)}</strong>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="admin-header-icon-button"
            onClick={() => {
              setShowUserMenu(false)
              setShowSidebarDrawer(true)
            }}
            aria-label="Mở menu quản trị"
          >
            <Bars3Icon className="admin-header-icon" />
          </button>

          <button type="button" className="admin-header-icon-button danger" onClick={handleLogout} aria-label="Đăng xuất">
            <ArrowLeftOnRectangleIcon className="admin-header-icon" />
          </button>
        </div>
      </header>

      <main className={`admin-content ${isLoading ? 'loading' : ''}`}>
        {isLoading ? (
          <div className="admin-loading-card">
            <ArrowPathIcon className="admin-loading-icon" />
            <p>{loadingMessage}</p>
          </div>
        ) : (
          <>
            {feedback}

            <div className="admin-shell">
              <section className="admin-main-column">{children}</section>
            </div>

            <div
              className={`admin-drawer-backdrop ${showSidebarDrawer ? 'visible' : ''}`}
              onClick={() => setShowSidebarDrawer(false)}
              aria-hidden={!showSidebarDrawer}
            />

            <aside
              className={`admin-drawer ${showSidebarDrawer ? 'open' : ''}`}
              aria-hidden={!showSidebarDrawer}
              aria-label="Menu quản trị"
            >
              <div className="admin-drawer-header">
                <div>
                  <span className="admin-sidebar-eyebrow">Điều hướng quản trị</span>
                  <h2>Khối nghiệp vụ</h2>
                </div>
                <button
                  type="button"
                  className="admin-header-icon-button"
                  onClick={() => setShowSidebarDrawer(false)}
                  aria-label="Đóng menu quản trị"
                >
                  <XMarkIcon className="admin-header-icon" />
                </button>
              </div>

              <p className="admin-drawer-copy">
                Chọn màn hình cần thao tác. Bảng điều khiển dùng để theo dõi tổng quan, còn các thay đổi dữ liệu đã được
                tách sang màn hình riêng.
              </p>

              <nav className="admin-sidebar-nav" aria-label="Điều hướng quản trị">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => `admin-sidebar-link ${isActive ? 'active' : ''}`}
                    >
                      <span className="admin-sidebar-link-icon">
                        <Icon className="admin-sidebar-link-svg" />
                      </span>
                      <span className="admin-sidebar-link-copy">
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                    </NavLink>
                  )
                })}
              </nav>
            </aside>

            <LogoutConfirmModal open={showLogoutConfirm} onConfirm={handleLogoutConfirm} onCancel={handleLogoutCancel} />
          </>
        )}
      </main>
    </div>
  )
}

export default AdminLayout
