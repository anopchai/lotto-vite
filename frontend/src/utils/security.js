/**
 * Frontend Security Utilities
 * Provides client-side validation and XSS protection
 */

// XSS Protection
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:text\/html/gi, '')
    .trim();
};

// Validate lottery number format on frontend
export const validateLottoNumber = (number, type) => {
  if (!number || typeof number !== 'string') return false;
  
  const patterns = {
    '2up': /^\\d{2}$/,
    '2down': /^\\d{2}$/,
    '3up': /^\\d{3}$/,
    '3toad': /^\\d{3}$/,
    '3straight_toad': /^\\d{3}$/,
    'runup': /^\\d{1}$/,
    'rundown': /^\\d{1}$/
  };
  
  return patterns[type] ? patterns[type].test(number) : false;
};

// Validate agent code
export const validateAgentCode = (code) => {
  if (!code || typeof code !== 'string') return false;
  return /^[A-Za-z0-9_-]{3,20}$/.test(code);
};

// Validate Thai phone number
export const validatePhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[-\\s]/g, '');
  return /^(\\+66|0)[0-9]{8,9}$/.test(cleaned);
};

// Validate price/amount
export const validatePrice = (price) => {
  const num = parseFloat(price);
  return !isNaN(num) && num >= 0 && num <= 999999;
};

// Input sanitization for forms
export const sanitizeFormData = (formData) => {
  if (Array.isArray(formData)) {
    return formData.map(sanitizeFormData);
  }
  
  if (formData && typeof formData === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeInput(value);
      } else {
        sanitized[key] = sanitizeFormData(value);
      }
    }
    return sanitized;
  }
  
  return formData;
};

// Password strength validation
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password must not exceed 128 characters' };
  }
  
  // Check for common weak passwords
  const weakPasswords = ['123456', 'password', 'admin', 'user'];
  if (weakPasswords.includes(password.toLowerCase())) {
    return { valid: false, message: 'Password is too common' };
  }
  
  return { valid: true };
};

// Validate buyer name
export const validateBuyerName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const sanitized = name.trim();
  return sanitized.length >= 2 && sanitized.length <= 100;
};

// Rate limiting helper for client-side
class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }
  
  canMakeRequest() {
    const now = Date.now();
    
    // Remove old requests outside time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    // Check if we can make a new request
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    // Add new request timestamp
    this.requests.push(now);
    return true;
  }
  
  getTimeUntilNextRequest() {
    if (this.requests.length < this.maxRequests) return 0;
    
    const oldestRequest = Math.min(...this.requests);
    const timeUntilReset = this.timeWindow - (Date.now() - oldestRequest);
    return Math.max(0, timeUntilReset);
  }
}

// Create rate limiter instances for different operations
export const loginRateLimiter = new RateLimiter(5, 300000); // 5 attempts per 5 minutes
export const apiRateLimiter = new RateLimiter(50, 60000); // 50 requests per minute

// Secure local storage wrapper
export const secureStorage = {
  set(key, value) {
    try {
      // Add timestamp for auto-expiry
      const data = {
        value,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },
  
  get(key, maxAge = 24 * 60 * 60 * 1000) { // Default 24 hours
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const data = JSON.parse(item);
      const age = Date.now() - data.timestamp;
      
      if (age > maxAge) {
        localStorage.removeItem(key);
        return null;
      }
      
      return data.value;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return null;
    }
  },
  
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  },
  
  clear() {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }
};

// Content Security Policy helpers
export const CSPHelpers = {
  // Check if inline scripts are blocked
  isInlineScriptBlocked() {
    try {
      eval('1'); // This will throw if CSP blocks eval
      return false;
    } catch {
      return true;
    }
  },
  
  // Safe way to add event listeners
  addEventListenerSafe(element, event, handler, options) {
    if (element && typeof element.addEventListener === 'function') {
      element.addEventListener(event, handler, options);
    }
  }
};

// Input validation rules
export const validationRules = {
  required: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  },
  
  minLength: (min) => (value) => {
    if (typeof value !== 'string') return false;
    return value.length >= min;
  },
  
  maxLength: (max) => (value) => {
    if (typeof value !== 'string') return false;
    return value.length <= max;
  },
  
  pattern: (regex) => (value) => {
    if (typeof value !== 'string') return false;
    return regex.test(value);
  },
  
  numeric: (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value);
  },
  
  positiveNumber: (value) => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  }
};

// Form validation helper
export const validateForm = (data, rules) => {
  const errors = {};
  
  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = data[field];
    
    for (const rule of fieldRules) {
      if (typeof rule === 'function') {
        if (!rule(value)) {
          errors[field] = errors[field] || [];
          errors[field].push('Validation failed');
        }
      } else if (typeof rule === 'object') {
        if (!rule.validator(value)) {
          errors[field] = errors[field] || [];
          errors[field].push(rule.message || 'Validation failed');
        }
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};