'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { DateRangeCalendar } from './DateRangeCalendar';

type DesktopDatePickerProps = {
  open: boolean;
  onClose: () => void;
  startDate: string | null;
  endDate: string | null;
  onSelect: (startDate: string | null, endDate: string | null) => void;
  minDate?: Date;
  unavailableDates?: Set<string>;
  anchorRef?: React.RefObject<HTMLElement>;
};

export function DesktopDatePicker({
  open,
  onClose,
  startDate,
  endDate,
  onSelect,
  minDate,
  unavailableDates,
  anchorRef,
}: DesktopDatePickerProps) {
  const t = useTranslations('datePicker');
  const locale = useLocale();
  const [localStartDate, setLocalStartDate] = useState<string | null>(startDate);
  const [localEndDate, setLocalEndDate] = useState<string | null>(endDate);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync local state with props when popover opens
  useEffect(() => {
    if (open) {
      setLocalStartDate(startDate);
      setLocalEndDate(endDate);
    }
  }, [open, startDate, endDate]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose, anchorRef]);

  // Get next month
  const getNextMonth = (year: number, month: number): { year: number; month: number } => {
    if (month === 11) {
      return { year: year + 1, month: 0 };
    }
    return { year, month: month + 1 };
  };

  // Get initial months to display
  const getInitialMonths = () => {
    if (localStartDate) {
      const start = new Date(localStartDate);
      return {
        month1: { year: start.getFullYear(), month: start.getMonth() },
        month2: getNextMonth(start.getFullYear(), start.getMonth()),
      };
    }
    const today = new Date();
    return {
      month1: { year: today.getFullYear(), month: today.getMonth() },
      month2: getNextMonth(today.getFullYear(), today.getMonth()),
    };
  };

  const [months, setMonths] = useState(getInitialMonths());

  // Reset months when popover opens
  useEffect(() => {
    if (open) {
      setMonths(getInitialMonths());
    }
  }, [open]);

  const handleCalendarSelect = (start: string | null, end: string | null) => {
    setLocalStartDate(start);
    setLocalEndDate(end);
  };

  const handleClear = () => {
    setLocalStartDate(null);
    setLocalEndDate(null);
    onSelect(null, null);
  };

  const handleApply = () => {
    onSelect(localStartDate, localEndDate);
    onClose();
  };

  // Navigate both months together
  const goToPreviousMonth = () => {
    setMonths((prev) => {
      const prevMonth1 = prev.month1.month === 0
        ? { year: prev.month1.year - 1, month: 11 }
        : { year: prev.month1.year, month: prev.month1.month - 1 };
      return {
        month1: prevMonth1,
        month2: prev.month1,
      };
    });
  };

  const goToNextMonth = () => {
    setMonths((prev) => {
      const nextMonth2 = prev.month2.month === 11
        ? { year: prev.month2.year + 1, month: 0 }
        : { year: prev.month2.year, month: prev.month2.month + 1 };
      return {
        month1: prev.month2,
        month2: nextMonth2,
      };
    });
  };

  // Get month name for header
  const getMonthHeader = (year: number, month: number): string => {
    const date = new Date(year, month, 1);
    return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' });
  };

  if (!open) return null;

  // Calculate position relative to anchor
  const getPosition = () => {
    if (!anchorRef?.current) return {};
    const rect = anchorRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
    };
  };

  const position = getPosition();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        aria-hidden
        onClick={onClose}
      />
      {/* Popover */}
      <div
        ref={popoverRef}
        className="fixed z-50 bg-white rounded-lg border border-neutral-200 shadow-xl p-6"
        style={{ 
          minWidth: '680px',
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {/* Header with navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Previous month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2 text-base font-semibold text-black capitalize">
            <span>{getMonthHeader(months.month1.year, months.month1.month)}</span>
            <span className="text-neutral-400">/</span>
            <span>{getMonthHeader(months.month2.year, months.month2.month)}</span>
          </div>
          <button
            type="button"
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Next month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Two calendars side by side */}
        <div className="flex gap-8">
          <div className="flex-1">
            <DateRangeCalendar
              startDate={localStartDate}
              endDate={localEndDate}
              onSelect={handleCalendarSelect}
              minDate={minDate}
              unavailableDates={unavailableDates}
              displayYear={months.month1.year}
              displayMonth={months.month1.month}
              hideNavigation={true}
            />
          </div>
          <div className="flex-1">
            <DateRangeCalendar
              startDate={localStartDate}
              endDate={localEndDate}
              onSelect={handleCalendarSelect}
              minDate={minDate}
              unavailableDates={unavailableDates}
              displayYear={months.month2.year}
              displayMonth={months.month2.month}
              hideNavigation={true}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-neutral-200">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-black transition-colors"
          >
            {t('clear')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!localStartDate || !localEndDate}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              !localStartDate || !localEndDate
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-ds-primary-hover'
            }`}
          >
            {t('apply')}
          </button>
        </div>
      </div>
    </>
  );
}
