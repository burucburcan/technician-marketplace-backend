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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = t('auth.firstNameRequired');
    if (!formData.lastName.trim()) errors.lastName = t('auth.lastNameRequired');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) errors.email = t('auth.invalidEmail');
    if (formData.password.length < 8) errors.password = t('auth.passwordTooShort');
    if (!/[A-Z]/.test(formData.password)) errors.password = t('auth.uppercaseRequired');
    if (formData.password.length < 8 && !/[A-Z]/.test(formData.password)) errors.password = t('auth.passwordTooShort') + ' / ' + t('auth.uppercaseRequired');
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = t('auth.passwordsDoNotMatch');
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
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

  const [showPasswordTip, setShowPasswordTip] = useState(false);
  const passwordLength = formData.password.length;
  const passwordMeetsMin = passwordLength >= 8;
  const passwordHasUpper = /[A-Z]/.test(formData.password);
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-6">
        {t('common.register')}
      </h2>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {(error as { data?: { message?: string } })?.data?.message || t('auth.registerFailed')}
        </div>
      )}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('auth.firstName')}
            </label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => {
                setFormData({ ...formData, firstName: e.target.value });
                if (validationErrors.firstName) setValidationErrors(prev => ({ ...prev, firstName: '' }));
              }}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              data-testid="first-name-input"
            />
            {validationErrors.firstName && (
              <p className="mt-1 text-red-500 text-sm">{validationErrors.firstName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('auth.lastName')}
            </label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => {
                setFormData({ ...formData, lastName: e.target.value });
                if (validationErrors.lastName) setValidationErrors(prev => ({ ...prev, lastName: '' }));
              }}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              data-testid="last-name-input"
            />
            {validationErrors.lastName && (
              <p className="mt-1 text-red-500 text-sm">{validationErrors.lastName}</p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('auth.email')}
          </label>
          <input
            type="email"
            required
            placeholder={t('auth.emailPlaceholder')}
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (validationErrors.email) setValidationErrors(prev => ({ ...prev, email: '' }));
            }}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
            data-testid="email-input"
          />
          {validationErrors.email && (
            <p className="mt-1 text-red-500 text-sm">{validationErrors.email}</p>
          )}
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">
            {t('auth.password')}
          </label>
          <div className="relative">
            <input
              type="password"
              required
              value={formData.password}
              onFocus={() => setShowPasswordTip(true)}
              onBlur={() => setShowPasswordTip(false)}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (validationErrors.password) setValidationErrors(prev => ({ ...prev, password: '' }));
              }}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              data-testid="password-input"
            />
            {showPasswordTip && (
              <div className="absolute left-full top-0 ml-3 w-56 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg z-10">
                <p className="font-semibold mb-2">{t('auth.passwordRequirements')}</p>
                <div className="space-y-1">
                  <p className={`flex items-center gap-1 ${passwordMeetsMin ? 'text-green-400' : 'text-gray-300'}`}>
                    {passwordMeetsMin ? '✓' : '○'} {t('auth.minPasswordLength')}
                  </p>
                  <p className={`flex items-center gap-1 ${passwordHasUpper ? 'text-green-400' : 'text-gray-300'}`}>
                    {passwordHasUpper ? '✓' : '○'} {t('auth.uppercaseRequired')}
                  </p>
                </div>
                <div className="absolute right-full top-3 w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-gray-800 border-b-[6px] border-b-transparent"></div>
              </div>
            )}
          </div>
          {validationErrors.password && (
            <p className="mt-1 text-red-500 text-sm">{validationErrors.password}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('auth.confirmPassword')}
          </label>
          <input
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => {
              setFormData({ ...formData, confirmPassword: e.target.value });
              if (validationErrors.confirmPassword) setValidationErrors(prev => ({ ...prev, confirmPassword: '' }));
            }}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
            data-testid="confirm-password-input"
          />
          {passwordsMismatch && (
            <p className="mt-1 text-red-500 text-sm">{t('auth.passwordsDoNotMatch')}</p>
          )}
          {passwordsMatch && (
            <p className="mt-1 text-green-600 text-sm">✓</p>
          )}
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
