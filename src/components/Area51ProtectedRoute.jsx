import React from 'react';
import { Navigate } from 'react-router-dom';

const Area51ProtectedRoute = ({ children }) => {
  const isAuthenticated = sessionStorage.getItem('area51Auth') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/area-51" replace />;
  }
  
  return children;
};

export default Area51ProtectedRoute;