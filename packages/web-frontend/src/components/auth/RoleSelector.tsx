import { useTranslation } from 'react-i18next';
import { useState } from 'react';

export interface RoleSelectorProps {
  selectedRole: 'professional' | 'user' | null;
  onRoleSelect: (role: 'professional' | 'user') => void;
  error?: string;
}

export const RoleSelector = ({ selectedRole, onRoleSelect, error }: RoleSelectorProps) => {
  const { t } = useTranslation();
  const [announcement, setAnnouncement] = useState('');

  const handleSelect = (role: 'professional' | 'user') => {
    onRoleSelect(role);
    const label = role === 'professional'
      ? t('auth.roleSelection.professional')
      : t('auth.roleSelection.client');
    setAnnouncement(label);
  };

  const handleKeyDown = (e: React.KeyboardEvent, role: 'professional' | 'user') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(role);
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {t('auth.roleSelection.title')}
      </label>
      <div role="radiogroup" aria-label={t('auth.roleSelection.title')} className="grid grid-cols-2 gap-4">
        {/* Professional card */}
        <div
          role="radio"
          aria-checked={selectedRole === 'professional'}
          tabIndex={0}
          onClick={() => handleSelect('professional')}
          onKeyDown={(e) => handleKeyDown(e, 'professional')}
          className={`cursor-pointer rounded-lg border-2 p-4 text-center transition-colors ${
            selectedRole === 'professional'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
          data-testid="role-card-professional"
        >
          {/* Tools icon (inline SVG) */}
          <svg
            className="mx-auto h-10 w-10 text-gray-600 mb-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.049.58.025 1.193-.14 1.743"
            />
          </svg>
          <p className="text-sm font-semibold text-gray-900">
            {t('auth.roleSelection.professional')}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {t('auth.roleSelection.professionalDescription')}
          </p>
        </div>

        {/* Client card */}
        <div
          role="radio"
          aria-checked={selectedRole === 'user'}
          tabIndex={0}
          onClick={() => handleSelect('user')}
          onKeyDown={(e) => handleKeyDown(e, 'user')}
          className={`cursor-pointer rounded-lg border-2 p-4 text-center transition-colors ${
            selectedRole === 'user'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
          data-testid="role-card-client"
        >
          {/* Person icon (inline SVG) */}
          <svg
            className="mx-auto h-10 w-10 text-gray-600 mb-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
          <p className="text-sm font-semibold text-gray-900">
            {t('auth.roleSelection.client')}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {t('auth.roleSelection.clientDescription')}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-red-500 text-sm" data-testid="role-error">
          {error}
        </p>
      )}

      {/* aria-live region for screen reader announcements */}
      <div aria-live="polite" className="sr-only" data-testid="role-announcement">
        {announcement}
      </div>
    </div>
  );
};
