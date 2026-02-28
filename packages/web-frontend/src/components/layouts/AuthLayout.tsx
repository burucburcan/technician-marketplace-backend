import { Outlet } from 'react-router-dom';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
