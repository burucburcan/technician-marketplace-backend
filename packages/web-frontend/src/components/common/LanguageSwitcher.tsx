import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useUpdateUserProfileMutation } from '../../store/api/userApi';
import { useState } from 'react';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [updateProfile] = useUpdateUserProfileMutation();
  const [isChanging, setIsChanging] = useState(false);

  const changeLanguage = async (lng: string) => {
    if (isChanging) return;
    
    setIsChanging(true);
    try {
      // Change language in i18next
      await i18n.changeLanguage(lng);
      
      // Save to localStorage
      localStorage.setItem('language', lng);
      
      // If user is authenticated, save to user profile
      if (isAuthenticated && user?.id) {
        try {
          await updateProfile({
            userId: user.id,
            data: { language: lng as 'es' | 'en' }
          }).unwrap();
        } catch (error) {
          console.error('Failed to update language preference in profile:', error);
          // Don't show error to user - language is still changed locally
        }
      }
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => changeLanguage('es')}
        disabled={isChanging}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          i18n.language === 'es'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        } ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Cambiar a español"
      >
        ES
      </button>
      <button
        onClick={() => changeLanguage('en')}
        disabled={isChanging}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          i18n.language === 'en'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        } ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
};
