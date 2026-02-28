import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationsPanel } from './NotificationsPanel';

export const Header = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-blue-600">
                Technician Marketplace
              </span>
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/search"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900"
              >
                {t('nav.search')}
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <>
                <NotificationsPanel userId={user?.id || ''} />
                <Link
                  to="/messages"
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </Link>
                <Link
                  to={`/${user?.role}`}
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  {t('nav.dashboard')}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="text-gray-700 hover:text-gray-900"
                >
                  {t('common.login')}
                </Link>
                <Link
                  to="/auth/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  {t('common.register')}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};
