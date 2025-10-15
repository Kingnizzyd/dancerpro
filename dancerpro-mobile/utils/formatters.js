// Currency formatting utility
// Simple in-memory caches for Intl formatters to avoid re-creating formatters
const currencyFormatterCache = new Map();
const numberFormatterCache = new Map();
const dateTimeFormatterCache = new Map();

function getCacheKey(locale, options) {
  // Stable stringify for options object (sort keys)
  const keys = Object.keys(options || {}).sort();
  const normalized = keys.reduce((acc, k) => {
    acc[k] = options[k];
    return acc;
  }, {});
  return `${locale}|${JSON.stringify(normalized)}`;
}

export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }

  try {
    const key = `${locale}|${currency}|2`;
    let formatter = currencyFormatterCache.get(key);
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      currencyFormatterCache.set(key, formatter);
    }
    return formatter.format(Number(amount));
  } catch (error) {
    // Fallback for unsupported locales or currencies
    return `$${Number(amount).toFixed(2)}`;
  }
};

// Date formatting utilities
export const formatDate = (date, options = {}) => {
  if (!date) return '';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  try {
    const locale = 'en-US';
    const fmtOptions = { ...defaultOptions, ...options };
    const key = getCacheKey(locale, fmtOptions);
    let formatter = dateTimeFormatterCache.get(key);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(locale, fmtOptions);
      dateTimeFormatterCache.set(key, formatter);
    }
    return formatter.format(new Date(date));
  } catch (error) {
    return date.toString();
  }
};

export const formatDateTime = (date) => {
  if (!date) return '';

  try {
    const locale = 'en-US';
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    const key = getCacheKey(locale, options);
    let formatter = dateTimeFormatterCache.get(key);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(locale, options);
      dateTimeFormatterCache.set(key, formatter);
    }
    return formatter.format(new Date(date));
  } catch (error) {
    return date.toString();
  }
};

export const formatTime = (date) => {
  if (!date) return '';

  try {
    const locale = 'en-US';
    const options = {
      hour: '2-digit',
      minute: '2-digit',
    };
    const key = getCacheKey(locale, options);
    let formatter = dateTimeFormatterCache.get(key);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(locale, options);
      dateTimeFormatterCache.set(key, formatter);
    }
    return formatter.format(new Date(date));
  } catch (error) {
    return date.toString();
  }
};

// Number formatting utilities
export const formatNumber = (number, decimals = 0, locale = 'en-US') => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }

  try {
    const key = `${locale}|${decimals}`;
    let formatter = numberFormatterCache.get(key);
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      numberFormatterCache.set(key, formatter);
    }
    return formatter.format(Number(number));
  } catch (error) {
    // Fallback
    return Number(number).toFixed(decimals);
  }
};

export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  
  return `${Number(value).toFixed(decimals)}%`;
};

// Duration formatting
export const formatDuration = (minutes) => {
  if (!minutes || isNaN(minutes)) return '0h 0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
};

// Text formatting utilities
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalizeFirst = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const capitalizeWords = (text) => {
  if (!text) return '';
  return text.split(' ').map(word => capitalizeFirst(word)).join(' ');
};