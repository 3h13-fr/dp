'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLocale } from 'next-intl';

type DateRangeCalendarProps = {
  startDate: string | null;
  endDate: string | null;
  onSelect: (startDate: string | null, endDate: string | null) => void;
  minDate?: Date;
  unavailableDates?: Set<string>; // Set of date strings in YYYY-MM-DD format
  className?: string;
  // Optional: force display of specific month/year
  displayYear?: number;
  displayMonth?: number; // 0-11
  // Optional: hide navigation (for use in multi-month views)
  hideNavigation?: boolean;
};

type DateState = {
  year: number;
  month: number;
};

export function DateRangeCalendar({
  startDate,
  endDate,
  onSelect,
  minDate = new Date(),
  unavailableDates = new Set(),
  className = '',
  displayYear,
  displayMonth,
  hideNavigation = false,
}: DateRangeCalendarProps) {
  const locale = useLocale();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const min = minDate;
  min.setHours(0, 0, 0, 0);

  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Parse dates
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  // Get month/year from props, start date, or today
  const getInitialState = (): DateState => {
    if (displayYear !== undefined && displayMonth !== undefined) {
      return { year: displayYear, month: displayMonth };
    }
    if (start) {
      return { year: start.getFullYear(), month: start.getMonth() };
    }
    return { year: today.getFullYear(), month: today.getMonth() };
  };

  const [currentMonth, setCurrentMonth] = useState<DateState>(getInitialState());

  // Update current month if display props change
  useEffect(() => {
    if (displayYear !== undefined && displayMonth !== undefined) {
      setCurrentMonth({ year: displayYear, month: displayMonth });
    }
  }, [displayYear, displayMonth]);

  // Get days in month
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  // Format date to YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if date is unavailable
  const isUnavailable = (date: Date): boolean => {
    const dateStr = formatDateString(date);
    return unavailableDates.has(dateStr) || date < min;
  };

  // Check if date is in range
  const isInRange = (date: Date): boolean => {
    if (!start || !end) return false;
    const dateStr = formatDateString(date);
    const startStr = formatDateString(start);
    const endStr = formatDateString(end);
    return dateStr >= startStr && dateStr <= endStr;
  };

  // Check if date is start or end
  const isStartOrEnd = (date: Date): boolean => {
    if (!start && !end) return false;
    const dateStr = formatDateString(date);
    if (start && formatDateString(start) === dateStr) return true;
    if (end && formatDateString(end) === dateStr) return true;
    return false;
  };

  // Check if date is today
  const isToday = (date: Date): boolean => {
    return formatDateString(date) === formatDateString(today);
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    if (isUnavailable(date)) return;

    const dateStr = formatDateString(date);

    // If clicking on an already selected date, reset
    if (start && formatDateString(start) === dateStr) {
      onSelect(null, null);
      return;
    }
    if (end && formatDateString(end) === dateStr) {
      onSelect(null, null);
      return;
    }

    // If no start date, set it
    if (!start) {
      onSelect(dateStr, null);
      return;
    }

    // If start exists but no end
    if (start && !end) {
      const startDateObj = new Date(start);
      startDateObj.setHours(0, 0, 0, 0);
      
      // If clicked date is before start, make it the new start
      if (date < startDateObj) {
        onSelect(dateStr, null);
        return;
      }
      
      // Otherwise set as end
      onSelect(startDate, dateStr);
      return;
    }

    // If both exist, reset and set new start
    onSelect(dateStr, null);
  };

  // Handle date hover (for preview)
  const handleDateHover = (date: Date) => {
    if (isUnavailable(date)) {
      setHoverDate(null);
      return;
    }
    if (!start) {
      setHoverDate(null);
      return;
    }
    const dateStr = formatDateString(date);
    setHoverDate(dateStr);
  };

  // Check if date is in hover range
  const isInHoverRange = (date: Date): boolean => {
    if (!start || !hoverDate) return false;
    const dateStr = formatDateString(date);
    const startStr = formatDateString(start);
    return dateStr >= startStr && dateStr <= hoverDate;
  };

  // Generate calendar days for a month
  const generateCalendarDays = (year: number, month: number): (Date | null)[] => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  // Get month name
  const getMonthName = (year: number, month: number): string => {
    const date = new Date(year, month, 1);
    return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' });
  };

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const days = generateCalendarDays(currentMonth.year, currentMonth.month);
  const dayNames = locale === 'fr' 
    ? ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={className}>
      {/* Header with month navigation */}
      {!hideNavigation && (
        <div className="flex items-center justify-between mb-4">
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
          <h3 className="text-base font-semibold text-black capitalize">
            {getMonthName(currentMonth.year, currentMonth.month)}
          </h3>
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
      )}
      {hideNavigation && (
        <h3 className="text-base font-semibold text-black capitalize mb-4 text-center">
          {getMonthName(currentMonth.year, currentMonth.month)}
        </h3>
      )}

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day names */}
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-neutral-500 py-2">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dateStr = formatDateString(date);
          const unavailable = isUnavailable(date);
          const inRange = isInRange(date) || (start && hoverDate && isInHoverRange(date));
          const isStartOrEndDate = isStartOrEnd(date);
          const isTodayDate = isToday(date);

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleDateClick(date)}
              onMouseEnter={() => handleDateHover(date)}
              onMouseLeave={() => setHoverDate(null)}
              disabled={unavailable}
              className={`
                aspect-square text-sm font-medium transition-colors
                ${unavailable 
                  ? 'text-neutral-300 cursor-not-allowed' 
                  : 'text-black hover:bg-neutral-100 cursor-pointer'
                }
                ${inRange && !isStartOrEndDate 
                  ? 'bg-primary/10' 
                  : ''
                }
                ${isStartOrEndDate 
                  ? 'rounded-full bg-primary text-white hover:bg-primary' 
                  : 'rounded-lg'
                }
                ${isTodayDate && !isStartOrEndDate 
                  ? 'border border-primary' 
                  : ''
                }
              `}
              aria-label={date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
