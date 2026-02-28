import { useTranslation } from 'react-i18next';

export const VerifyEmailPage = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
        {t('auth.verifyEmail')}
      </h2>
      <p className="text-gray-600">
        Please check your email and click the verification link.
      </p>
    </div>
  );
};
