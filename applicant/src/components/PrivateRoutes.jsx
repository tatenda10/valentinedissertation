import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoutes = () => {
  const { client, loading } = useAuth();
  
  // Show nothing while checking authentication
  if (loading) {
    return null;
  }

  // If we have a client, render the child routes
  return client ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoutes; 