import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ForgotPassword from '../components/ForgotPassword'

// ForgotPasswordPage bọc route /forgot-password.
// Nếu đi từ /reset-password quay lại, page này nhận state resume để mở thẳng bước verify.
const ForgotPasswordPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const resumeState = location.state ?? {}
  // resumeForgotPassword cho phép người dùng quay lại đúng step OTP/mật khẩu mới
  // thay vì phải nhập lại số điện thoại từ đầu.
  const shouldResumeVerifyStep = Boolean(resumeState?.resumeForgotPassword && resumeState?.phone)

  return (
    <ForgotPassword
      closeVariant={shouldResumeVerifyStep ? 'home' : 'back'}
      initialStep={shouldResumeVerifyStep ? 'verify' : 'request'}
      initialPhone={shouldResumeVerifyStep ? String(resumeState?.phone ?? '') : ''}
      initialMaskedEmail={shouldResumeVerifyStep ? String(resumeState?.maskedEmail ?? '') : ''}
      initialOtpErrorMessage={shouldResumeVerifyStep ? String(resumeState?.message ?? '') : ''}
      initialOtp={shouldResumeVerifyStep ? String(resumeState?.otp ?? '') : ''}
      onClose={() => navigate('/')}
      onShowLogin={() => navigate('/login')}
    />
  )
}

export default ForgotPasswordPage
