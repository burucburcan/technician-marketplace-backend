import { useTranslation } from 'react-i18next';

export const AdminCategoriesPage = () => {
  const { t } = useTranslation();
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">{t('admin.categoryManagement')}</h1>
      <p className="text-gray-600 mt-2">{t('admin.categoryManagementDescription')}</p>
      <div className="mt-6 p-8 bg-white rounded-lg shadow">
        <p className="text-center text-gray-500">Category management coming soon...</p>
      </div>
    </div>
  );
};

