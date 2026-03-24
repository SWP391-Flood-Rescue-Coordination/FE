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
      onClose={() => navigate('/')}
      onShowLogin={() => navigate('/login')}
    />
  )
}

export default ResetPasswordPage
