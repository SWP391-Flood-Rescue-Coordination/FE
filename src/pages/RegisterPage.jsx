import React from 'react';
import { useNavigate } from 'react-router-dom';
import Register from '../components/Register';

const RegisterPage = () => {
  const navigate = useNavigate();

  return (
    <Register 
      onClose={() => navigate('/')}
      onShowLogin={() => navigate('/login')}
    />
  );
};

export default RegisterPage;
