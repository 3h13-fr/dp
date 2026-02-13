'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MobileDatePicker } from './MobileDatePicker';
import { FullScreenModal } from './FullScreenModal';
import type { ListingType } from '@/components/HeaderSearchBar';

type DateRangeScreenProps = {
  open: boolean;
  onClose: () => void;
  listingType: ListingType;
  startDate: string;
  endDate: string;
  onSelect: (startDate: string, endDate: string) => void;
};

export function DateRangeScreen({
  open,
  onClose,
  listingType,
  startDate,
  endDate,
  onSelect,
}: DateRangeScreenProps) {
  const t = useTranslations('mobileSearch');
  const isLocation = listingType === 'location';
  const needsTime = listingType === 'location' || listingType === 'ride';
  
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(startDate || null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(endDate || null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Extract time from datetime strings
  useEffect(() => {
    if (startDate && startDate.includes('T')) {
      setStartTime(startDate.slice(11, 16));
      setSelectedStartDate(startDate.slice(0, 10));
    }
    if (endDate && endDate.includes('T')) {
      setEndTime(endDate.slice(11, 16));
      setSelectedEndDate(endDate.slice(0, 10));
    }
  }, [startDate, endDate]);

  const handleDateSelect = (start: string | null, end: string | null) => {
    setSelectedStartDate(start);
    setSelectedEndDate(end);
    if (needsTime) {
      // Show time picker after date selection
      setShowTimePicker(true);
    } else {
      // For experience, no time needed
      if (isLocation) {
        if (start && end) {
          onSelect(start, end);
        }
      } else {
        if (start) {
          onSelect(start, '');
        }
      }
    }
  };

  const handleTimeConfirm = () => {
    if (needsTime) {
      if (isLocation) {
        if (selectedStartDate && selectedEndDate) {
          const startDateTime = `${selectedStartDate}T${startTime || '09:00'}`;
          const endDateTime = `${selectedEndDate}T${endTime || '09:00'}`;
          onSelect(startDateTime, endDateTime);
        }
      } else {
        // For ride
        if (selectedStartDate) {
          const startDateTime = `${selectedStartDate}T${startTime || '09:00'}`;
          onSelect(startDateTime, '');
        }
      }
    }
    setShowTimePicker(false);
    onClose();
  };

  const handleTimeCancel = () => {
    setShowTimePicker(false);
    onClose();
  };

  if (!open) return null;

  if (showTimePicker && needsTime) {
    return (
      <FullScreenModal open={true} onClose={handleTimeCancel} title={t('selectTime') || 'Sélectionner l\'heure'}>
        <div className="flex flex-col h-full px-4 py-6">
          <div className="flex-1 space-y-6">
            {isLocation ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('startTime') || 'Heure de début'}
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 text-lg border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('endTime') || 'Heure de fin'}
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 text-lg border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('startTime') || 'Heure'}
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 text-lg border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>
          <div className="sticky bottom-0 border-t border-neutral-200 bg-white pt-4 safe-area-pb">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleTimeCancel}
                className="flex-1 px-4 py-3 text-sm font-medium text-neutral-600 hover:text-black transition-colors"
              >
                {t('cancel') || 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleTimeConfirm}
                disabled={isLocation ? (!selectedStartDate || !selectedEndDate) : !selectedStartDate}
                className={`flex-1 px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${
                  isLocation ? (!selectedStartDate || !selectedEndDate) : !selectedStartDate
                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-ds-primary-hover'
                }`}
              >
                {t('confirm') || 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      </FullScreenModal>
    );
  }

  return (
    <MobileDatePicker
      open={open && !showTimePicker}
      onClose={onClose}
      startDate={selectedStartDate}
      endDate={isLocation ? selectedEndDate : null}
      onSelect={handleDateSelect}
      minDate={new Date()}
    />
  );
}
