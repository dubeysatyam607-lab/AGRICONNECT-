import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ENDPOINT = 'https://api.web3forms.com/submit';

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('submitWeb3Form', () => {
  it('POSTs the access key + payload to the endpoint and resolves on success', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', 'test-access-key');
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { submitWeb3Form } = await import('./web3forms');
    await submitWeb3Form({ subject: 'Contact form: Ramesh', name: 'Ramesh', phone: '9876543210' });

    expect(fetchMock).toHaveBeenCalledWith(
      ENDPOINT,
      expect.objectContaining({ method: 'POST' })
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.access_key).toBe('test-access-key');
    expect(body.subject).toBe('Contact form: Ramesh');
    expect(body.phone).toBe('9876543210');
  });

  it('throws a friendly error when the access key is not configured', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', '');
    vi.resetModules();

    const { submitWeb3Form } = await import('./web3forms');
    await expect(submitWeb3Form({ subject: 'x' })).rejects.toThrow(/not configured/i);
  });

  it('throws when the endpoint returns a non-2xx status', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', 'test-access-key');
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    const { submitWeb3Form } = await import('./web3forms');
    await expect(submitWeb3Form({ subject: 'x' })).rejects.toThrow(/429/);
  });

  it('throws when Web3Forms reports success:false', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', 'test-access-key');
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) }));

    const { submitWeb3Form } = await import('./web3forms');
    await expect(submitWeb3Form({ subject: 'x' })).rejects.toThrow(/rejected/i);
  });

  it('resolves even if the response body is not JSON', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', 'test-access-key');
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('bad json'); } }));

    const { submitWeb3Form } = await import('./web3forms');
    await expect(submitWeb3Form({ subject: 'x' })).resolves.toBeUndefined();
  });
});
