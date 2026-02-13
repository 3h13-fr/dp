'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { FullScreenModal } from './FullScreenModal';
import { DateRangeCalendar } from './DateRangeCalendar';

type MobileDatePickerProps = {
  open: boolean;
  onClose: () => void;
  startDate: string | null;
  endDate: string | null;
  onSelect: (startDate: string | null, endDate: string | null) => void;
  minDate?: Date;
  unavailableDates?: Set<string>;
};

export function MobileDatePicker({
  open,
  onClose,
  startDate,
  endDate,
  onSelect,
  minDate,
  unavailableDates,
}: MobileDatePickerProps) {
  const t = useTranslations('mobileSearch');
  const tDatePicker = useTranslations('datePicker');
  const locale = useLocale();
  const [localStartDate, setLocalStartDate] = useState<string | null>(startDate);
  const [localEndDate, setLocalEndDate] = useState<string | null>(endDate);

  // Sync local state with props when modal opens
  useEffect(() => {
    if (open) {
      setLocalStartDate(startDate);
      setLocalEndDate(endDate);
    }
  }, [open, startDate, endDate]);

  const handleCalendarSelect = (start: string | null, end: string | null) => {
    setLocalStartDate(start);
    setLocalEndDate(end);
  };

  const handleClear = () => {
    setLocalStartDate(null);
    setLocalEndDate(null);
    onSelect(null, null);
  };

  const handleNext = () => {
    onSelect(localStartDate, localEndDate);
    onClose();
  };

  // Generate months to display (current month + next 11 months)
  const generateMonths = () => {
    const months: Array<{ year: number; month: number }> = [];
    const today = new Date();
    const startMonth = localStartDate
      ? new Date(localStartDate)
      : today;

    // Start from the selected start date month, or today
    const startYear = startMonth.getFullYear();
    const startMonthIndex = startMonth.getMonth();

    for (let i = 0; i < 12; i++) {
      const date = new Date(startYear, startMonthIndex + i, 1);
      months.push({
        year: date.getFullYear(),
        month: date.getMonth(),
      });
    }

    return months;
  };

  const months = generateMonths();

  return (
    <FullScreenModal open={open} onClose={onClose} title={t('selectDates')}>
      <div className="flex flex-col h-full">
        {/* Scrollable calendar months */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-8">
            {months.map((month, index) => (
              <DateRangeCalendar
                key={`${month.year}-${month.month}`}
                startDate={localStartDate}
                endDate={localEndDate}
                onSelect={handleCalendarSelect}
                minDate={minDate}
                unavailableDates={unavailableDates}
                displayYear={month.year}
                displayMonth={month.month}
                hideNavigation={true}
              />
            ))}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 border-t border-neutral-200 bg-white px-4 py-4 safe-area-pb">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-black transition-colors"
            >
              {tDatePicker('clearAll')}
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!localStartDate || !localEndDate}
              className={`flex-1 px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${
                !localStartDate || !localEndDate
                  ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-ds-primary-hover'
              }`}
            >
              {tDatePicker('next')}
            </button>
          </div>
        </div>
      </div>
    </FullScreenModal>
  );
}
