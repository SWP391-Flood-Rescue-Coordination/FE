import React from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '../components/Login';

const LoginPage = () => {
  const navigate = useNavigate();

  return (
    <Login 
      onClose={() => navigate('/')}
      onShowForgotPassword={() => navigate('/forgot-password')}
      onShowRegister={() => navigate('/register')}
    />
  );
};

export default LoginPage;
