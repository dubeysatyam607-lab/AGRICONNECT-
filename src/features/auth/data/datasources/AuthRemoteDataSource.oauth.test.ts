import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OAUTH_CALLBACK_PATH } from '@/config/oauth';

const { signInWithOAuthMock, fromMock } = vi.hoisted(() => ({
  signInWithOAuthMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => signInWithOAuthMock(...args),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: fromMock,
  },
}));

vi.mock('@/utils/auditLog', () => ({ auditLog: vi.fn() }));

import { authRemoteDataSource as ds } from './AuthRemoteDataSource';
import { syncOAuthProfileFromIdentity } from './AuthRemoteDataSource';

type ProfileRow = { id?: string; full_name?: string | null; avatar_url?: string | null };

function profileChain(overrides: {
  row?: ProfileRow | null;
  selectError?: { message: string } | null;
  insertError?: { message: string } | null;
  updateError?: { message: string } | null;
} = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: overrides.row ?? null, error: overrides.selectError ?? null }),
    insert: vi.fn().mockResolvedValue({ error: overrides.insertError ?? null }),
    update: vi.fn().mockReturnThis(),
  };
  // postgrest-js builders are thenable — `await from().update().eq()` yields
  // `{ data, error }`. Mirror that so the update path resolves like Supabase.
  (chain as unknown as PromiseLike<{ error: { message: string } | null }>).then = (resolve, reject) => {
    const err = overrides.updateError ?? null;
    const result = err ? Promise.reject(new Error(err.message)) : Promise.resolve({ error: null });
    return result.then(resolve, reject);
  };
  return chain;
}

describe('Google OAuth trigger (signInWithOAuth)', () => {
  beforeEach(() => {
    signInWithOAuthMock.mockReset().mockResolvedValue({ error: null });
  });

  it('uses the current app origin + callback path as redirect_to (no hardcoded URL)', async () => {
    await ds.signInWithOAuth('google');
    expect(signInWithOAuthMock).toHaveBeenCalledTimes(1);
    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${OAUTH_CALLBACK_PATH}` },
    });
  });

  it('throws a friendly ServerException when Supabase rejects the request', async () => {
    signInWithOAuthMock.mockResolvedValue({ error: { message: 'provider is not enabled', status: 500 } });
    await expect(ds.signInWithOAuth('google')).rejects.toThrow('provider is not enabled');
  });
});

describe('syncOAuthProfileFromIdentity (safe Google profile enrichment)', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('inserts a minimal profile when none exists (first-time Google user)', async () => {
    fromMock.mockReturnValue(profileChain({ row: null }));
    const user = {
      id: 'u-1',
      email: 'ramesh@gmail.com',
      user_metadata: { full_name: 'Ramesh Kumar', avatar_url: 'https://lh3.googleusercontent.com/pic', provider: 'google' },
      app_metadata: { provider: 'google' },
    };

    const result = await syncOAuthProfileFromIdentity(user);

    expect(result).toEqual({ profileExisted: false, updatedFields: ['full_name', 'avatar_url'] });
    const insert = fromMock.mock.results[0].value.insert;
    expect(insert).toHaveBeenCalledWith({
      id: 'u-1',
      full_name: 'Ramesh Kumar',
      avatar_url: 'https://lh3.googleusercontent.com/pic',
      role: 'farmer',
    });
  });

  it('fills only empty fields on an existing profile and never touches role/location', async () => {
    fromMock.mockReturnValue(profileChain({ row: { id: 'u-1', full_name: null, avatar_url: null } }));
    const user = {
      id: 'u-1',
      user_metadata: { full_name: 'Ramesh Kumar', avatar_url: 'https://lh3.googleusercontent.com/pic' },
      app_metadata: { provider: 'google' },
    };

    const result = await syncOAuthProfileFromIdentity(user);

    expect(result).toEqual({ profileExisted: true, updatedFields: ['full_name', 'avatar_url'] });
    const chain = fromMock.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith({ full_name: 'Ramesh Kumar', avatar_url: 'https://lh3.googleusercontent.com/pic' });
    expect(chain.update.mock.calls[0][0]).not.toHaveProperty('role');
    expect(chain.update.mock.calls[0][0]).not.toHaveProperty('location');
  });

  it('never overwrites a manually entered name or avatar', async () => {
    fromMock.mockReturnValue(profileChain({ row: { id: 'u-1', full_name: 'Manual Name', avatar_url: null } }));
    const user = {
      id: 'u-1',
      user_metadata: { full_name: 'Google Name', avatar_url: 'https://lh3.googleusercontent.com/pic' },
      app_metadata: { provider: 'google' },
    };

    const result = await syncOAuthProfileFromIdentity(user);

    expect(result).toEqual({ profileExisted: true, updatedFields: ['avatar_url'] });
    const chain = fromMock.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith({ avatar_url: 'https://lh3.googleusercontent.com/pic' });
    expect(chain.update.mock.calls[0][0]).not.toHaveProperty('full_name');
  });

  it('does not fabricate farm/location/weather fields from the Google identity', async () => {
    fromMock.mockReturnValue(profileChain({ row: null }));
    const user = {
      id: 'u-2',
      user_metadata: {
        full_name: 'Ramesh Kumar',
        avatar_url: 'https://pic',
        // A malicious/buggy provider could surface these — they must be ignored.
        location: 'Pune',
        district: 'Pune',
        state: 'Maharashtra',
        farm_size: '5 acres',
        village: 'Wagholi',
        crop: 'wheat',
        weather_location: 'Pune',
      },
      app_metadata: { provider: 'google' },
    };

    await syncOAuthProfileFromIdentity(user);

    const insert = fromMock.mock.results[0].value.insert;
    const payload = insert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toEqual({
      id: 'u-2',
      full_name: 'Ramesh Kumar',
      avatar_url: 'https://pic',
      role: 'farmer',
    });
  });

  it('skips DB writes entirely for non-Google providers', async () => {
    const user = {
      id: 'u-3',
      user_metadata: { full_name: 'X' },
      app_metadata: { provider: 'email' },
    };
    const result = await syncOAuthProfileFromIdentity(user);
    expect(result).toEqual({ profileExisted: true, updatedFields: [] });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('swallows DB read errors (best-effort; never breaks the OAuth sign-in)', async () => {
    fromMock.mockReturnValue(profileChain({ row: null, selectError: { message: 'permission denied' } }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await syncOAuthProfileFromIdentity({
      id: 'u-4',
      user_metadata: { full_name: 'R' },
      app_metadata: { provider: 'google' },
    });
    expect(result).toEqual({ profileExisted: false, updatedFields: [] });
    warn.mockRestore();
  });
});
