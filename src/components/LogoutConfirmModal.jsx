import './LogoutConfirmModal.css'

function LogoutConfirmModal({
  open,
  onConfirm,
  onCancel,
  title = 'Đăng Xuất',
  message = 'Bạn có chắc chắn muốn đăng xuất không?',
  confirmLabel = 'Đăng xuất',
  cancelLabel = 'Hủy',
  confirmDisabled = false,
  cancelDisabled = false,
}) {
  if (!open) {
    return null
  }

  return (
    <div className="success-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="success-box">
        <h2 id="confirm-modal-title" className="success-title">
          {title}
        </h2>
        <p className="register-subtitle logout-confirm-message">{message}</p>
        <button
          type="button"
          onClick={onConfirm}
          className="success-button confirm-action"
          disabled={confirmDisabled}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="success-button cancel"
          disabled={cancelDisabled}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  )
}

export default LogoutConfirmModal
