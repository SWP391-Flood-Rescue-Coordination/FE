import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import authService from '../services/authService'

// Route /reset-password hiện chỉ còn để tương thích điều hướng cũ.
// Nó đọc context đang lưu trong authService rồi đẩy người dùng về lại /forgot-password.
const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const resetContext = authService.getForgotPasswordResetContext()

  useEffect(() => {
    navigate('/forgot-password', {
      replace: true,
      state: {
        resumeForgotPassword: Boolean(resetContext?.phone),
        phone: resetContext?.phone || '',
        maskedEmail: resetContext?.maskedEmail || '',
        otp: resetContext?.otp || '',
      },
    })
  }, [navigate, resetContext])

  return null
}

export default ResetPasswordPage
