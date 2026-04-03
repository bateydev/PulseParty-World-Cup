/**
 * Locale-specific formatting utilities
 * Requirements: 8.6
 */

/**
 * Format a date/timestamp according to the user's locale
 * @param date - Date string or Date object
 * @param locale - Locale code (en, fr, de, sw)
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date,
  locale: string = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
}

/**
 * Format a time according to the user's locale
 * @param date - Date string or Date object
 * @param locale - Locale code (en, fr, de, sw)
 * @returns Formatted time string
 */
export function formatTime(date: string | Date, locale: string = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format a date and time according to the user's locale
 * @param date - Date string or Date object
 * @param locale - Locale code (en, fr, de, sw)
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: string | Date,
  locale: string = 'en'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format a relative time (e.g., "2 minutes ago")
 * @param date - Date string or Date object
 * @param locale - Locale code (en, fr, de, sw)
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  date: string | Date,
  locale: string = 'en'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  }
}

/**
 * Format a number according to the user's locale
 * @param value - Number to format
 * @param locale - Locale code (en, fr, de, sw)
 * @param options - Intl.NumberFormatOptions
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  locale: string = 'en',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a percentage according to the user's locale
 * @param value - Number to format (0-100)
 * @param locale - Locale code (en, fr, de, sw)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  locale: string = 'en',
  decimals: number = 1
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Format a score (e.g., "2 - 1")
 * @param homeScore - Home team score
 * @param awayScore - Away team score
 * @param locale - Locale code (en, fr, de, sw)
 * @returns Formatted score string
 */
export function formatScore(
  homeScore: number,
  awayScore: number,
  locale: string = 'en'
): string {
  const home = formatNumber(homeScore, locale);
  const away = formatNumber(awayScore, locale);
  return `${home} - ${away}`;
}

/**
 * Format a duration in seconds to MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (MM:SS)
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Format a match minute (e.g., "45+2'")
 * @param minute - Match minute
 * @param addedTime - Added time (optional)
 * @returns Formatted minute string
 */
export function formatMatchMinute(minute: number, addedTime?: number): string {
  if (addedTime && addedTime > 0) {
    return `${minute}+${addedTime}'`;
  }
  return `${minute}'`;
}

/**
 * Format points with locale-specific number formatting
 * @param points - Points value
 * @param locale - Locale code (en, fr, de, sw)
 * @returns Formatted points string
 */
export function formatPoints(points: number, locale: string = 'en'): string {
  return formatNumber(points, locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format a rank (e.g., "1st", "2nd", "3rd")
 * @param rank - Rank number
 * @param locale - Locale code (en, fr, de, sw)
 * @returns Formatted rank string
 */
export function formatRank(rank: number, locale: string = 'en'): string {
  // English ordinal suffixes
  if (locale === 'en') {
    const j = rank % 10;
    const k = rank % 100;
    if (j === 1 && k !== 11) {
      return `${rank}st`;
    }
    if (j === 2 && k !== 12) {
      return `${rank}nd`;
    }
    if (j === 3 && k !== 13) {
      return `${rank}rd`;
    }
    return `${rank}th`;
  }

  // French ordinal
  if (locale === 'fr') {
    return rank === 1 ? `${rank}er` : `${rank}e`;
  }

  // German ordinal
  if (locale === 'de') {
    return `${rank}.`;
  }

  // Swahili - just the number
  return `${rank}`;
}
