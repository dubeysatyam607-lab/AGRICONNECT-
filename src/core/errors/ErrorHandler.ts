import {
  AppException,
  NetworkException,
  TimeoutException,
  AuthException,
  ServerException,
  ValidationException,
} from './AppException';
import { z } from 'zod';

/**
 * Enterprise Centralized Error Handler.
 * Intercepts errors across API, UI, and state layers, maps them to AppExceptions, and logs to telemetry.
 */
export class ErrorHandler {
  /**
   * Normalize any error type (AxiosError, Supabase error, ZodError, Error) into an AppException
   */
  public static handle(error: any): AppException {
    if (error instanceof AppException) {
      return error;
    }

    // Handle Zod Schema Validation Errors
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      return new ValidationException('Please check your form inputs.', fieldErrors, error);
    }

    // Handle Axios / Network / HTTP Errors
    if (error?.isAxiosError || error?.response || error?.request) {
      const status = error.response?.status;
      const data = error.response?.data;
      const msg = data?.message || data?.error || error.message;

      if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
        return new TimeoutException('Network request timed out.', error);
      }
      if (!error.response && error.request) {
        return new NetworkException('Unable to connect to server. Please check your internet.', error);
      }
      if (status === 401 || status === 403) {
        return new AuthException(msg || 'Your session expired. Please sign in again.', status, error);
      }
      if (status === 422 || status === 400) {
        return new ValidationException(msg || 'Invalid request parameters.', data?.errors || {}, error);
      }
      if (status >= 500) {
        return new ServerException(msg || 'Server temporarily unavailable.', status, error);
      }
    }

    // Handle Supabase errors
    if (error?.code && typeof error.code === 'string') {
      if (error.code.startsWith('PGRST') || error.code.startsWith('23')) {
        return new ServerException(error.message || 'Database transaction error', 500, error);
      }
      if (error.status === 400 || error.status === 422 || error.message?.includes('already registered')) {
        return new ValidationException(error.message, {}, error);
      }
      if (error.status === 401 || error.status === 403) {
        return new AuthException(error.message || 'Authentication error', error.status, error);
      }
    }

    // Fallback standard error
    const message = error?.message || 'An unexpected error occurred.';
    return new ServerException(message, 500, error);
  }

  /**
   * Log exception to crash telemetry / console
   */
  public static log(error: any, context?: string): void {
    const appEx = ErrorHandler.handle(error);
    if (process.env.NODE_ENV !== 'production') {
      console.group(`[ErrorHandler] Exception captured${context ? ` in ${context}` : ''}:`);
      console.error('Type:', appEx.constructor.name);
      console.error('Code:', appEx.code);
      console.error('Message:', appEx.message);
      if (appEx.originalError) {
        console.error('Original Error:', appEx.originalError);
      }
      console.groupEnd();
    }
    // Note: Can forward to CrashLoggingService here once resolved from DI
  }
}
