import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ForgotPassword from '../components/ForgotPassword'

const ForgotPasswordPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const resumeState = location.state ?? {}
  const shouldResumeVerifyStep = Boolean(resumeState?.resumeForgotPassword && resumeState?.phone)

  return (
    <ForgotPassword
      initialStep={shouldResumeVerifyStep ? 'verify' : 'request'}
      initialPhone={shouldResumeVerifyStep ? String(resumeState?.phone ?? '') : ''}
      initialMaskedEmail={shouldResumeVerifyStep ? String(resumeState?.maskedEmail ?? '') : ''}
      initialOtpErrorMessage={shouldResumeVerifyStep ? String(resumeState?.message ?? '') : ''}
      onClose={() => navigate('/')}
      onShowLogin={() => navigate('/login')}
      onOtpVerified={() => navigate('/reset-password')}
    />
  )
}

export default ForgotPasswordPage
