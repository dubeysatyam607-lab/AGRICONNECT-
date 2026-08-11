import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { authRequestInterceptor } from './interceptors/AuthInterceptor';
import { setupTokenRefreshInterceptor } from './interceptors/TokenRefreshInterceptor';
import { networkErrorInterceptor } from './interceptors/ErrorInterceptor';
import { connectivityMonitor } from '@/core/services/ConnectivityMonitor';
import { NetworkException } from '@/core/errors/AppException';

/**
 * Enterprise Dio-Equivalent API Client Layer for TypeScript/React.
 * Configured with JWT Auth injection, automated 401 token refresh queueing, offline retry, and error normalization.
 */
export class DioClient {
  private instance: AxiosInstance;

  constructor(baseURL: string = '/api', timeoutMs: number = 15000) {
    this.instance = axios.create({
      baseURL,
      timeout: timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Version': '1.0.0-enterprise',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // 1. Request Interceptor: Check offline status & attach JWT token
    this.instance.interceptors.request.use(async (config) => {
      if (!connectivityMonitor.isOnline()) {
        throw new NetworkException('Offline mode: Cannot reach server. Please check internet connection.');
      }
      return await authRequestInterceptor(config);
    }, error => Promise.reject(error));

    // 2. Response Interceptor: Token Refresh queueing for 401s
    setupTokenRefreshInterceptor(this.instance);

    // 3. Response Error Interceptor: Map rejections to AppException
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      networkErrorInterceptor
    );
  }

  /**
   * Generic GET request with automatic type casting
   */
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  /**
   * Generic POST request
   */
  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Generic PUT request
   */
  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Generic PATCH request
   */
  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * Generic DELETE request
   */
  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }

  /**
   * Expose underlying Axios instance for special configurations
   */
  public getRawInstance(): AxiosInstance {
    return this.instance;
  }
}

// Global enterprise API client instance
export const dioClient = new DioClient();
