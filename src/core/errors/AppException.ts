/**
 * Enterprise Exception Hierarchy following Clean Architecture domain exception standards.
 */

export abstract class AppException extends Error {
  public abstract readonly statusCode?: number;
  public abstract readonly code: string;

  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = this.constructor.name;
    // Maintain proper stack trace in V8 engines (Chrome/Node)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  public toUserFriendlyMessage(): string {
    return this.message;
  }
}

export class NetworkException extends AppException {
  public readonly code = 'NETWORK_ERROR';
  public readonly statusCode?: number;

  constructor(message: string = 'Please check your internet connection and try again.', originalError?: any) {
    super(message, originalError);
  }
}

export class TimeoutException extends AppException {
  public readonly code = 'TIMEOUT_ERROR';
  public readonly statusCode = 408;

  constructor(message: string = 'The request timed out. Please try again.', originalError?: any) {
    super(message, originalError);
  }
}

export class AuthException extends AppException {
  public readonly code = 'AUTH_ERROR';
  
  constructor(message: string = 'Authentication failed or token expired.', public readonly statusCode: number = 401, originalError?: any) {
    super(message, originalError);
  }
}

export class ServerException extends AppException {
  public readonly code = 'SERVER_ERROR';

  constructor(message: string = 'A server error occurred. Our engineering team has been notified.', public readonly statusCode: number = 500, originalError?: any) {
    super(message, originalError);
  }
}

export class ValidationException extends AppException {
  public readonly code = 'VALIDATION_ERROR';
  public readonly statusCode = 422;

  constructor(
    message: string = 'Invalid input provided.',
    public readonly fieldErrors: Record<string, string> = {},
    originalError?: any
  ) {
    super(message, originalError);
  }

  public override toUserFriendlyMessage(): string {
    const fields = Object.keys(this.fieldErrors);
    if (fields.length > 0) {
      return `${this.message} (${fields.map(f => `${f}: ${this.fieldErrors[f]}`).join(', ')})`;
    }
    return this.message;
  }
}

export class CacheException extends AppException {
  public readonly code = 'CACHE_ERROR';
  public readonly statusCode?: number;

  constructor(message: string = 'Failed to load offline data.', originalError?: any) {
    super(message, originalError);
  }
}
