// Web3Forms configuration — delivers form submissions straight to the site
// owner's inbox without a backend server.
// Create / manage your form + access key at https://web3forms.com.
export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

// Public form identifier — designed to be embedded in client-side forms (like a
// form ID). Provided at build time via VITE_WEB3FORMS_ACCESS_KEY (.env for local
// dev, .env.production so hosted builds get it too).
export const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY ?? '';

export interface Web3FormsPayload {
  subject: string;
  from_name?: string;
  [field: string]: unknown;
}

export async function submitWeb3Form(payload: Web3FormsPayload): Promise<void> {
  if (!WEB3FORMS_ACCESS_KEY) {
    throw new Error('Web3Forms is not configured (VITE_WEB3FORMS_ACCESS_KEY missing).');
  }
  const response = await fetch(WEB3FORMS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ access_key: WEB3FORMS_ACCESS_KEY, ...payload }),
  });
  if (!response.ok) {
    throw new Error(`Web3Forms request failed with status ${response.status}.`);
  }
  const data = (await response.json().catch(() => null)) as { success?: boolean } | null;
  if (data && data.success === false) {
    throw new Error('Web3Forms rejected the submission.');
  }
}
