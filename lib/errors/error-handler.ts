export interface ApiResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(
  error: unknown, 
  fallbackMessage: string,
  logContext?: string
): ApiResult {
  const errorMsg = error instanceof Error ? error.message : fallbackMessage;
  
  if (logContext) {
    console.error(`${logContext}:`, error);
  }
  
  return { success: false, error: errorMsg };
}

export function createSuccessResult<T>(data?: T): ApiResult<T> {
  return { success: true, data };
}

export function validateInput(
  value: string,
  fieldName: string,
  minLength = 1,
  maxLength = 255
): string | null {
  if (!value || value.trim().length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  
  if (value.length > maxLength) {
    return `${fieldName} must be less than ${maxLength} characters`;
  }
  
  return null;
}

export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) return "Email is required";
  if (!emailRegex.test(email)) return "Please enter a valid email address";
  
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/(?=.*[a-z])/.test(password)) return "Password must contain a lowercase letter";
  if (!/(?=.*[A-Z])/.test(password)) return "Password must contain an uppercase letter";
  if (!/(?=.*\d)/.test(password)) return "Password must contain a number";
  
  return null;
}