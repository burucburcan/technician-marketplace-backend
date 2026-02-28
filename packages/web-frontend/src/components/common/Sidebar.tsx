import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { UserRole } from '../../types';

export const Sidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);

  const getMenuItems = () => {
    const basePath = `/${user?.role}`;
    
    switch (user?.role) {
      case UserRole.USER:
        return [
          { path: basePath, label: t('nav.dashboard') },
          { path: `${basePath}/bookings`, label: t('nav.bookings') },
          { path: `${basePath}/profile`, label: t('nav.profile') },
        ];
      case UserRole.PROFESSIONAL:
        return [
          { path: basePath, label: t('nav.dashboard') },
          { path: `${basePath}/bookings`, label: t('nav.bookings') },
          { path: `${basePath}/portfolio`, label: t('professional.portfolio') },
          { path: `${basePath}/profile`, label: t('nav.profile') },
        ];
      case UserRole.PROVIDER:
        return [
          { path: basePath, label: t('nav.dashboard') },
          { path: `${basePath}/professionals`, label: 'Professionals' },
        ];
      case UserRole.ADMIN:
        return [
          { path: basePath, label: t('nav.dashboard') },
          { path: `${basePath}/users`, label: 'Users' },
          { path: `${basePath}/professionals`, label: 'Professionals' },
          { path: `${basePath}/categories`, label: 'Categories' },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <aside className="w-64 bg-white shadow-sm min-h-screen">
      <nav className="mt-5 px-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`group flex items-center px-2 py-2 text-base font-medium rounded-md mb-1 ${
              location.pathname === item.path
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
};
