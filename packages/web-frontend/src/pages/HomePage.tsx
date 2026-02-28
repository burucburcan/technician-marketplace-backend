import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const HomePage = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Find Professional Services
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Connect with qualified technicians and artists for your home and artistic projects
          </p>
          <div className="mt-8">
            <Link
              to="/search"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              {t('professional.searchProfessionals')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
