import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRequestPasswordResetMutation } from '../../store/api/authApi';

export const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const [requestReset, { isLoading, isSuccess, error }] = useRequestPasswordResetMutation();
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestReset({ email }).unwrap();
    } catch (err) {
      console.error('Password reset request failed:', err);
    }
  };

  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-6">
        {t('auth.forgotPassword')}
      </h2>
      {isSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
          Password reset link sent to your email.
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          Failed to send reset link. Please try again.
        </div>
      )}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('auth.email')}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
            data-testid="email-input"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          data-testid="reset-button"
        >
          {isLoading ? t('common.loading') : t('common.submit')}
        </button>
      </form>
    </div>
  );
};
