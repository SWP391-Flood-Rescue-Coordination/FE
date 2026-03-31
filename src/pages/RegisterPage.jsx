import React from 'react';
import { useNavigate } from 'react-router-dom';
import Register from '../components/Register';

// RegisterPage chỉ nối route /register với Register.jsx và các nút điều hướng quay về / hoặc /login.
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
