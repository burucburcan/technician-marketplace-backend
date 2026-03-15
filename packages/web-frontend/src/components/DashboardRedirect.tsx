import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { RootState } from '../store';
import { UserRole } from '../types';

export const DashboardRedirect = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  if (user?.role === UserRole.PROFESSIONAL) {
    return <Navigate to="/professional" replace />;
  }

  return <Navigate to="/user" replace />;
};
