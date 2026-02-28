import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useRegisterMutation } from '../../store/api/authApi';
import { setCredentials } from '../../store/slices/authSlice';

export const RegisterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [register, { isLoading, error }] = useRegisterMutation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      }).unwrap();
      dispatch(setCredentials({ user: result.user, token: result.accessToken }));
      navigate('/auth/verify-email');
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-6">
        {t('common.register')}
      </h2>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          Registration failed. Please try again.
        </div>
      )}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              data-testid="first-name-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              data-testid="last-name-input"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('auth.email')}
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
            data-testid="email-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('auth.password')}
          </label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
            data-testid="password-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('auth.confirmPassword')}
          </label>
          <input
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
            data-testid="confirm-password-input"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          data-testid="register-button"
        >
          {isLoading ? t('common.loading') : t('common.register')}
        </button>
      </form>
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          {t('auth.hasAccount')}{' '}
          <Link to="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
            {t('common.login')}
          </Link>
        </p>
      </div>
    </div>
  );
};
