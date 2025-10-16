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

// Phone formatting and validation utilities (lightweight E.164 heuristics)
// Note: For robust international support, consider libphonenumber-js.
// These helpers cover common US-style inputs and already E.164 formatted numbers.

// Validate basic E.164 format: leading '+', 8–15 digits total after '+'
export const isValidE164 = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const s = phone.trim();
  if (!s.startsWith('+')) return false;
  const digits = s.slice(1).replace(/\D/g, '');
  const reconstructed = `+${digits}`;
  return reconstructed === s && digits.length >= 8 && digits.length <= 15;
};

// Attempt to convert common inputs to E.164. Defaults to US (+1) if no country code.
export const toE164 = (raw, defaultCountry = 'US') => {
  if (!raw) return null;
  const input = String(raw).trim();
  // Preserve leading '+' and digits; strip other characters
  const cleaned = input.replace(/[^0-9+]/g, '');
  if (!cleaned) return null;

  // Already E.164?
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1).replace(/\D/g, '');
    const candidate = `+${digits}`;
    return isValidE164(candidate) ? candidate : null;
  }

  // No '+' present: apply simple heuristics
  const digitsOnly = cleaned.replace(/\D/g, '');
  // US heuristics
  if (defaultCountry === 'US') {
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    }
  }

  // Fallback: if length seems within E.164 range, assume it's a country code prefixed number missing '+'
  if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }

  return null;
};

// Pretty print phone for UI (minimal). Keeps E.164 or formats US numbers.
export const prettyPhone = (phone) => {
  if (!phone) return '';
  const s = String(phone).trim();
  if (isValidE164(s)) {
    // If US number, format as (XXX) XXX-XXXX
    if (s.startsWith('+1') && s.length === 12) {
      const d = s.slice(2);
      return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
    }
    return s;
  }
  // Attempt to format raw US-like inputs
  const digits = s.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  }
  return s;
};