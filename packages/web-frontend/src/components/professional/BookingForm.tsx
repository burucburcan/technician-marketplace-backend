import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ProfessionalType } from '../../types';
import { useCreateBookingMutation, useUploadReferenceImagesMutation } from '../../store/api/bookingApi';
import type { Location } from '../../types';
import type { ProfessionalDetail } from '../../store/api/professionalApi';

interface BookingFormProps {
  professional: ProfessionalDetail;
  onSuccess?: () => void;
}

export const BookingForm = ({ professional, onSuccess }: BookingFormProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [createBooking, { isLoading }] = useCreateBookingMutation();
  const [uploadImages] = useUploadReferenceImagesMutation();

  const isArtist = professional.professionalType === ProfessionalType.ARTIST;

  const [formData, setFormData] = useState({
    serviceCategory: professional.specializations[0] || '',
    scheduledDate: '',
    scheduledTime: '',
    estimatedDuration: 60,
    address: '',
    city: '',
    state: '',
    postalCode: '',
    description: '',
    
    // Artistic project fields
    projectType: '',
    estimatedProjectDuration: '',
    minPrice: '',
    maxPrice: '',
    specialRequirements: '',
    materials: [] as string[],
  });

  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setReferenceFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setReferenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Validate required fields
      if (!formData.scheduledDate || !formData.scheduledTime) {
        setError(t('booking.error.dateTimeRequired'));
        return;
      }

      if (!formData.address || !formData.city) {
        setError(t('booking.error.addressRequired'));
        return;
      }

      if (isArtist && !formData.projectType) {
        setError(t('booking.error.projectTypeRequired'));
        return;
      }

      // Combine date and time
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);

      // Prepare location
      const serviceAddress: Location = {
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: 'MX',
        postalCode: formData.postalCode,
        coordinates: {
          latitude: 0,
          longitude: 0,
        },
      };

      // Prepare booking data
      const bookingData: any = {
        professionalId: professional.id,
        professionalType: professional.professionalType,
        serviceCategory: formData.serviceCategory,
        scheduledDate: scheduledDateTime,
        estimatedDuration: formData.estimatedDuration,
        serviceAddress,
        description: formData.description,
        estimatedPrice: professional.hourlyRate * (formData.estimatedDuration / 60),
      };

      // Add artistic project details if artist
      if (isArtist) {
        bookingData.projectDetails = {
          projectType: formData.projectType,
          estimatedDuration: formData.estimatedProjectDuration,
          priceRange: {
            min: parseFloat(formData.minPrice) || 0,
            max: parseFloat(formData.maxPrice) || 0,
            currency: 'MXN',
          },
          specialRequirements: formData.specialRequirements,
          materials: formData.materials,
        };
      }

      // Create booking
      const result = await createBooking(bookingData).unwrap();

      // Upload reference images if any
      if (referenceFiles.length > 0) {
        await uploadImages({
          bookingId: result.id,
          files: referenceFiles,
        }).unwrap();
      }

      // Success
      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/bookings/${result.id}`);
      }
    } catch (err: any) {
      setError(err.data?.message || t('booking.error.createFailed'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Service Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('booking.serviceCategory')}
        </label>
        <select
          name="serviceCategory"
          value={formData.serviceCategory}
          onChange={handleInputChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {professional.specializations.map((spec) => (
            <option key={spec} value={spec}>
              {t(`search.categories.${spec}`, spec)}
            </option>
          ))}
        </select>
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('booking.date')}
          </label>
          <input
            type="date"
            name="scheduledDate"
            value={formData.scheduledDate}
            onChange={handleInputChange}
            min={new Date().toISOString().split('T')[0]}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('booking.time')}
          </label>
          <input
            type="time"
            name="scheduledTime"
            value={formData.scheduledTime}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('booking.estimatedDuration')}
        </label>
        <select
          name="estimatedDuration"
          value={formData.estimatedDuration}
          onChange={handleInputChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={30}>30 {t('booking.minutes')}</option>
          <option value={60}>1 {t('booking.hour')}</option>
          <option value={90}>1.5 {t('booking.hours')}</option>
          <option value={120}>2 {t('booking.hours')}</option>
          <option value={180}>3 {t('booking.hours')}</option>
          <option value={240}>4 {t('booking.hours')}</option>
        </select>
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('booking.address')}
        </label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          required
          placeholder={t('booking.addressPlaceholder')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('booking.city')}
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('booking.state')}
          </label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('booking.postalCode')}
          </label>
          <input
            type="text"
            name="postalCode"
            value={formData.postalCode}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('booking.description')}
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
          placeholder={t('booking.descriptionPlaceholder')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Artistic Project Details */}
      {isArtist && (
        <div className="border-t border-gray-200 pt-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('booking.artisticProjectDetails')}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('booking.projectType')}
            </label>
            <input
              type="text"
              name="projectType"
              value={formData.projectType}
              onChange={handleInputChange}
              required
              placeholder={t('booking.projectTypePlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('booking.estimatedProjectDuration')}
            </label>
            <input
              type="text"
              name="estimatedProjectDuration"
              value={formData.estimatedProjectDuration}
              onChange={handleInputChange}
              placeholder={t('booking.estimatedProjectDurationPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('booking.minPrice')}
              </label>
              <input
                type="number"
                name="minPrice"
                value={formData.minPrice}
                onChange={handleInputChange}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('booking.maxPrice')}
              </label>
              <input
                type="number"
                name="maxPrice"
                value={formData.maxPrice}
                onChange={handleInputChange}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('booking.specialRequirements')}
            </label>
            <textarea
              name="specialRequirements"
              value={formData.specialRequirements}
              onChange={handleInputChange}
              rows={3}
              placeholder={t('booking.specialRequirementsPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Reference Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('booking.referenceImages')}
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="reference-images"
            />
            <label
              htmlFor="reference-images"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {t('booking.uploadImages')}
            </label>
            {referenceFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {referenceFiles.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Reference ${index + 1}`}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estimated Price */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-700">{t('booking.estimatedPrice')}</span>
          <span className="text-2xl font-bold text-gray-900">
            ${(professional.hourlyRate * (formData.estimatedDuration / 60)).toFixed(2)} MXN
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {t('booking.priceNote')}
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? t('common.loading') : t('booking.submitBooking')}
      </button>
    </form>
  );
};
