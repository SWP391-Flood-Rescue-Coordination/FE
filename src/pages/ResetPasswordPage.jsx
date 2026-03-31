import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ResetPassword from '../components/ResetPassword'
import authService from '../services/authService'

const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const resetContext = useMemo(() => authService.getForgotPasswordResetContext(), [])

  useEffect(() => {
    if (!resetContext?.phone || !resetContext?.otp) {
      navigate('/forgot-password', { replace: true })
    }
  }, [navigate, resetContext])

  if (!resetContext?.phone || !resetContext?.otp) {
    return null
  }

  return (
    <ResetPassword
      phone={resetContext.phone}
      otp={resetContext.otp}
      maskedEmail={resetContext.maskedEmail}
      onClose={() => navigate('/')}
      onShowLogin={() => navigate('/login')}
      onInvalidOtp={({ phone, maskedEmail, message }) =>
        navigate('/forgot-password', {
          replace: true,
          state: {
            resumeForgotPassword: true,
            phone,
            maskedEmail,
            message,
          },
        })
      }
    />
  )
}

export default ResetPasswordPage
