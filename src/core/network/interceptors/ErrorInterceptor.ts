import { AxiosError } from 'axios';
import { ErrorHandler } from '@/core/errors/ErrorHandler';
import { AppException } from '@/core/errors/AppException';

/**
 * Enterprise Network Error Interceptor.
 * Transforms raw Axios HTTP rejections into structured domain AppException instances.
 */
export function networkErrorInterceptor(error: AxiosError): Promise<never> {
  const appException: AppException = ErrorHandler.handle(error);

  // Log error to console/telemetry via centralized ErrorHandler
  ErrorHandler.log(error, `NetworkRequest [${error.config?.method?.toUpperCase() || 'GET'} ${error.config?.url || ''}]`);

  return Promise.reject(appException);
}
