import React from 'react'
import { useNavigate } from 'react-router-dom'
import Login from '../components/Login'

const ROLE_ROUTE_MAP = {
  CITIZEN: '/',
  COORDINATOR: '/rescue-coordinator',
  RESCUE_TEAM: '/rescue-team',
  MANAGER: '/manager',
  ADMIN: '/admin',
}

const LoginPage = () => {
  const navigate = useNavigate()

  const handleLoginSuccess = (user) => {
    const role = String(user?.role ?? '').toUpperCase()
    const destination = ROLE_ROUTE_MAP[role] || '/'
    navigate(destination, { replace: true })
  }

  return (
    <Login
      onClose={() => navigate('/')}
      onShowForgotPassword={() => navigate('/forgot-password')}
      onShowRegister={() => navigate('/register')}
      onLoginSuccess={handleLoginSuccess}
    />
  )
}

export default LoginPage
