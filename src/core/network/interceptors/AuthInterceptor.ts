import { InternalAxiosRequestConfig } from 'axios';
import { secureStorage } from '@/core/storage/SecureStorage';
import { supabase } from '@/integrations/supabase/client';

/**
 * Enterprise Auth Interceptor.
 * Injects authenticated JWT Bearer token into outgoing HTTP request headers.
 */
export async function authRequestInterceptor(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
  try {
    // Attempt to retrieve token from SecureStorage first
    let token = await secureStorage.getItem('access_token');
    
    // If not in SecureStorage, check Supabase auth session
    if (!token) {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token || null;
      if (token) {
        await secureStorage.setItem('access_token', token);
      }
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('[AuthInterceptor] Failed to attach authorization token', error);
  }

  return config;
}
