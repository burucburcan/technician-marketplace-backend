import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLazyCheckAvailabilityQuery } from '../../store/api/professionalApi';

interface AvailabilityCalendarProps {
  professionalId: string;
  onSelectSlot?: (date: Date, time: string) => void;
}

export const AvailabilityCalendar = ({
  professionalId,
  onSelectSlot,
}: AvailabilityCalendarProps) => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [checkAvailability, { data: slots, isLoading }] = useLazyCheckAvailabilityQuery();

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const handleDateClick = async (date: Date) => {
    setSelectedDate(date);
    await checkAvailability({
      professionalId,
      date: date.toISOString().split('T')[0],
      duration: 60,
    });
  };

  const handlePreviousMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date | null) => {
    if (!date) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isPast = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const days = getDaysInMonth(selectedDate);
  const monthName = selectedDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('professional.availability')}
        </h3>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h4 className="text-lg font-medium text-gray-900 capitalize">{monthName}</h4>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const past = isPast(date);
            const today = isToday(date);
            const selected = isSelected(date);

            return (
              <button
                key={date.toISOString()}
                onClick={() => !past && handleDateClick(date)}
                disabled={past}
                className={`
                  aspect-square rounded-lg text-sm font-medium transition-colors
                  ${past ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'}
                  ${today ? 'border-2 border-blue-500' : ''}
                  ${selected ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-900'}
                `}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slots */}
      {slots && slots.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            {t('professional.availableSlots')}
          </h4>
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">{t('common.loading')}</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot, index) => (
                <button
                  key={index}
                  onClick={() => onSelectSlot && onSelectSlot(slot.date, slot.startTime)}
                  disabled={!slot.isAvailable}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      slot.isAvailable
                        ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {slot.startTime}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {slots && slots.length === 0 && !isLoading && (
        <div className="border-t border-gray-200 pt-6 text-center text-gray-500">
          {t('professional.noAvailableSlots')}
        </div>
      )}
    </div>
  );
};
