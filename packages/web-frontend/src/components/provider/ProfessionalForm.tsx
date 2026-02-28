import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ProfessionalType } from '../../types';
import type { ProfessionalFormData, ProviderProfessional } from '../../store/api/providerApi';

interface ProfessionalFormProps {
  professional?: ProviderProfessional;
  onSubmit: (data: ProfessionalFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ProfessionalForm: React.FC<ProfessionalFormProps> = ({
  professional,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<ProfessionalFormData>({
    professionalType: ProfessionalType.HANDYMAN,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    specializations: [],
    experienceYears: 0,
    hourlyRate: 0,
    serviceRadius: 50,
    artStyle: [],
    materials: [],
    techniques: [],
  });

  const [specializationInput, setSpecializationInput] = useState('');
  const [artStyleInput, setArtStyleInput] = useState('');
  const [materialInput, setMaterialInput] = useState('');
  const [techniqueInput, setTechniqueInput] = useState('');

  useEffect(() => {
    if (professional) {
      setFormData({
        professionalType: professional.professionalType,
        firstName: professional.firstName,
        lastName: professional.lastName,
        email: professional.email,
        phone: professional.phone,
        businessName: professional.businessName || '',
        specializations: professional.specializations,
        experienceYears: professional.experienceYears,
        hourlyRate: professional.hourlyRate,
        serviceRadius: 50, // Default value
        artStyle: [],
        materials: [],
        techniques: [],
      });
    }
  }, [professional]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addItem = (
    value: string,
    field: keyof ProfessionalFormData,
    setter: (value: string) => void
  ) => {
    if (value.trim()) {
      const currentArray = formData[field] as string[];
      setFormData({
        ...formData,
        [field]: [...currentArray, value.trim()],
      });
      setter('');
    }
  };

  const removeItem = (index: number, field: keyof ProfessionalFormData) => {
    const currentArray = formData[field] as string[];
    setFormData({
      ...formData,
      [field]: currentArray.filter((_, i) => i !== index),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Professional Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('provider.professionalType')} *
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value={ProfessionalType.HANDYMAN}
              checked={formData.professionalType === ProfessionalType.HANDYMAN}
              onChange={(e) =>
                setFormData({ ...formData, professionalType: e.target.value as ProfessionalType })
              }
              className="mr-2"
              disabled={!!professional}
            />
            {t('professional.handyman')}
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value={ProfessionalType.ARTIST}
              checked={formData.professionalType === ProfessionalType.ARTIST}
              onChange={(e) =>
                setFormData({ ...formData, professionalType: e.target.value as ProfessionalType })
              }
              className="mr-2"
              disabled={!!professional}
            />
            {t('professional.artist')}
          </label>
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('profile.firstName')} *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('profile.lastName')} *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('auth.email')} *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            disabled={!!professional}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('profile.phone')} *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('provider.businessName')}
          </label>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('professional.experience')} ({t('professional.years')}) *
          </label>
          <input
            type="number"
            min="0"
            value={formData.experienceYears}
            onChange={(e) =>
              setFormData({ ...formData, experienceYears: parseInt(e.target.value) || 0 })
            }
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('professional.hourlyRate')} ($) *
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.hourlyRate}
            onChange={(e) =>
              setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })
            }
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('professional.serviceRadius')} (km) *
          </label>
          <input
            type="number"
            min="1"
            value={formData.serviceRadius}
            onChange={(e) =>
              setFormData({ ...formData, serviceRadius: parseInt(e.target.value) || 50 })
            }
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Specializations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('professional.specializations')} *
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={specializationInput}
            onChange={(e) => setSpecializationInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem(specializationInput, 'specializations', setSpecializationInput);
              }
            }}
            placeholder={t('provider.addSpecialization')}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => addItem(specializationInput, 'specializations', setSpecializationInput)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('common.add')}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.specializations.map((spec, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
            >
              {spec}
              <button
                type="button"
                onClick={() => removeItem(index, 'specializations')}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Artist-specific fields */}
      {formData.professionalType === ProfessionalType.ARTIST && (
        <>
          {/* Art Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('professional.artStyle')}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={artStyleInput}
                onChange={(e) => setArtStyleInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem(artStyleInput, 'artStyle', setArtStyleInput);
                  }
                }}
                placeholder={t('provider.addArtStyle')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => addItem(artStyleInput, 'artStyle', setArtStyleInput)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('common.add')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.artStyle?.map((style, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center gap-2"
                >
                  {style}
                  <button
                    type="button"
                    onClick={() => removeItem(index, 'artStyle')}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Materials */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('professional.materials')}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={materialInput}
                onChange={(e) => setMaterialInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem(materialInput, 'materials', setMaterialInput);
                  }
                }}
                placeholder={t('provider.addMaterial')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => addItem(materialInput, 'materials', setMaterialInput)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('common.add')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.materials?.map((material, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-2"
                >
                  {material}
                  <button
                    type="button"
                    onClick={() => removeItem(index, 'materials')}
                    className="text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Techniques */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('professional.techniques')}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={techniqueInput}
                onChange={(e) => setTechniqueInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem(techniqueInput, 'techniques', setTechniqueInput);
                  }
                }}
                placeholder={t('provider.addTechnique')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => addItem(techniqueInput, 'techniques', setTechniqueInput)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('common.add')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.techniques?.map((technique, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm flex items-center gap-2"
                >
                  {technique}
                  <button
                    type="button"
                    onClick={() => removeItem(index, 'techniques')}
                    className="text-orange-600 hover:text-orange-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-4 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={isLoading}
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          disabled={isLoading}
        >
          {isLoading ? t('common.loading') : t('common.save')}
        </button>
      </div>
    </form>
  );
};
