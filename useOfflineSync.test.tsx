import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useOfflineSync } from './useOfflineSync';
import { supabase } from '@/integrations/supabase/client';

// Mock the dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null })
    }))
  }
}));

describe('useOfflineSync', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with queueCount 0 when localStorage is empty', () => {
    const { result } = renderHook(() => useOfflineSync());
    expect(result.current.queueCount).toBe(0);
  });

  it('should initialize with correct queueCount from localStorage', () => {
    const mockQueue = [
      { id: 1, table: 'test_table', payload: { foo: 'bar' }, timestamp: new Date() }
    ];
    localStorage.setItem('offline_queue', JSON.stringify(mockQueue));

    const { result } = renderHook(() => useOfflineSync());
    expect(result.current.queueCount).toBe(1);
  });

  it('saveToQueue should add an item to localStorage and update count', () => {
    const { result } = renderHook(() => useOfflineSync());

    act(() => {
      result.current.saveToQueue('users', { name: 'John Doe' });
    });

    // Check state update
    expect(result.current.queueCount).toBe(1);

    // Check localStorage update
    const storedQueue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    expect(storedQueue).toHaveLength(1);
    expect(storedQueue[0].table).toBe('users');
    expect(storedQueue[0].payload).toEqual({ name: 'John Doe' });
    expect(storedQueue[0].id).toBeDefined();
    expect(storedQueue[0].timestamp).toBeDefined();
  });

  it('syncQueue should process items and clear the queue', async () => {
    const mockQueue = [
      { id: 1, table: 'test_table', payload: { data: 'test1' }, timestamp: new Date() },
      { id: 2, table: 'test_table2', payload: { data: 'test2' }, timestamp: new Date() }
    ];
    localStorage.setItem('offline_queue', JSON.stringify(mockQueue));

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.syncQueue();
    });

    // Supabase should have been called twice
    expect(supabase.from).toHaveBeenCalledWith('test_table');
    expect(supabase.from).toHaveBeenCalledWith('test_table2');

    // Queue should be cleared
    expect(result.current.queueCount).toBe(0);
    expect(localStorage.getItem('offline_queue')).toBe('[]');
  });

  it('syncQueue should not do anything if queue is empty', async () => {
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.syncQueue();
    });

    // Supabase should not have been called
    expect(supabase.from).not.toHaveBeenCalled();
    expect(result.current.queueCount).toBe(0);
  });
});
