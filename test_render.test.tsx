import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, it, beforeEach } from 'vitest';
import FarmerHome from './src/components/agri/FarmerHome';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { RoleProvider } from './src/contexts/RoleContext';
import { initializeDIContainer } from './src/core/di/init';

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn().mockImplementationOnce((success) => Promise.resolve(success({
    coords: {
      latitude: 18.6298,
      longitude: 73.7997,
    }
  }))),
};
vi.stubGlobal('navigator', {
  ...global.navigator,
  geolocation: mockGeolocation,
});

// Mock hooks and services
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'test-user-id',
      email: 'test@bharatkrishi.in',
      user_metadata: {
        full_name: 'Test Farmer',
      },
    },
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
    toasts: [],
  }))
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { role: 'farmer' } })
        }))
      })),
      insert: vi.fn().mockResolvedValue({ error: null })
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  }
}));

import Index from './src/pages/Index';
import { AuthProvider } from './src/hooks/useAuth';

describe('Index Render Test', () => {
  beforeEach(() => {
    initializeDIContainer();
  });

  it('should render Index without throwing any error', () => {
    render(
      <AuthProvider>
        <Index />
      </AuthProvider>
    );
  });
});
