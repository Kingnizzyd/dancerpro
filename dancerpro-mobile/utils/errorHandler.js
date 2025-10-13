import { Alert } from 'react-native';

// Error handling utilities
export const showErrorAlert = (title, message) => {
  Alert.alert(title || 'Error', message || 'An unexpected error occurred');
};

export const showSuccessAlert = (title, message) => {
  Alert.alert(title || 'Success', message || 'Operation completed successfully');
};

export const handleError = (error, context = '') => {
  console.error(`Error in ${context}:`, error);
  
  let message = 'An unexpected error occurred';
  
  if (error.response) {
    // Server responded with error status
    message = error.response.data?.message || `Server error: ${error.response.status}`;
  } else if (error.request) {
    // Network error
    message = 'Network error. Please check your connection.';
  } else if (error.message) {
    // Other error with message
    message = error.message;
  }
  
  showErrorAlert('Error', message);
  return message;
};

// Validation errors
export class ValidationErrors extends Error {
  constructor(errors) {
    super('Validation failed');
    this.name = 'ValidationErrors';
    this.errors = errors;
  }
}

// Form validation utility
export const validateForm = (fields, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(fieldName => {
    const value = fields[fieldName];
    const fieldRules = rules[fieldName];
    
    fieldRules.forEach(rule => {
      if (rule.required && (!value || value.trim() === '')) {
        errors[fieldName] = rule.message || `${fieldName} is required`;
      } else if (rule.minLength && value && value.length < rule.minLength) {
        errors[fieldName] = rule.message || `${fieldName} must be at least ${rule.minLength} characters`;
      } else if (rule.email && value && !isValidEmail(value)) {
        errors[fieldName] = rule.message || 'Please enter a valid email address';
      } else if (rule.pattern && value && !rule.pattern.test(value)) {
        errors[fieldName] = rule.message || `${fieldName} format is invalid`;
      }
    });
  });
  
  if (Object.keys(errors).length > 0) {
    throw new ValidationErrors(errors);
  }
  
  return true;
};

// Email validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Network request wrapper with error handling
export const safeApiCall = async (apiCall, context = '') => {
  try {
    return await apiCall();
  } catch (error) {
    handleError(error, context);
    throw error;
  }
};