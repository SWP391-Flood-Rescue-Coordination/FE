import React from 'react';
import { useNavigate } from 'react-router-dom';
import ForgotPassword from '../components/ForgotPassword';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  return (
    <ForgotPassword 
      onClose={() => navigate('/')}
      onShowLogin={() => navigate('/login')}
    />
  );
};

export default ForgotPasswordPage;
