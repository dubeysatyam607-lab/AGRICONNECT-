import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { secureStorage } from '@/core/storage/SecureStorage';
import { supabase } from '@/integrations/supabase/client';
import { snackbarService } from '@/core/services/SnackbarService';

/**
 * Enterprise Token Refresh Interceptor with Request Queueing.
 * Intercepts 401 Unauthorized responses, queues pending calls, refreshes JWT token cleanly, and replays calls.
 */

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
  config: InternalAxiosRequestConfig;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token && prom.config.headers) {
      prom.config.headers.Authorization = `Bearer ${token}`;
      prom.resolve(axios(prom.config));
    }
  });

  failedQueue = [];
};

export function setupTokenRefreshInterceptor(axiosInstance: AxiosInstance): void {
  axiosInstance.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // If error is 401 Unauthorized and not already retried
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        if (isRefreshing) {
          // Queue request until ongoing refresh completes
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject, config: originalRequest });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Perform JWT session refresh via Supabase auth engine
          const { data, error: refreshError } = await supabase.auth.refreshSession();
          const newToken = data?.session?.access_token;

          if (refreshError || !newToken) {
            throw refreshError || new Error('Token refresh returned null');
          }

          // Persist new access and refresh tokens
          await secureStorage.setItem('access_token', newToken);
          if (data.session.refresh_token) {
            await secureStorage.setItem('refresh_token', data.session.refresh_token);
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }

          processQueue(null, newToken);
          return axiosInstance(originalRequest);
        } catch (refreshErr: any) {
          processQueue(refreshErr, null);
          await secureStorage.clear();
          await supabase.auth.signOut();
          
          snackbarService.error('Your session has expired. Please sign in again.');
          
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
}
