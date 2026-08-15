import { test, expect } from '@playwright/test';

test.describe('Google Login (production verification)', () => {
  test('Continue with Google redirects to Supabase OAuth with the approved app callback', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/auth/login');

    const googleButton = page.getByRole('button', { name: /Continue with Google/i });
    await expect(googleButton).toBeVisible();

    // Intercept the request the app fires when the button is clicked.
    const authorizeRequest = page.waitForRequest(
      (req) => req.url().includes('/auth/v1/authorize'),
      { timeout: 20000 },
    );

    await googleButton.click();

    const req = await authorizeRequest;
    const url = new URL(req.url());

    // The app must never hardcode a redirect host — it must derive it from its
    // own origin (localhost here, real domain in production).
    expect(url.searchParams.get('provider')).toBe('google');
    expect(url.searchParams.get('redirect_to')).toBe('http://localhost:8080/auth/callback');

    // No application console errors while the login page is rendered.
    const appErrors = consoleErrors.filter((e) => !/favicon|Source map/i.test(e));
    expect(appErrors).toEqual([]);
  });
});

test.describe('Protected routes (Google auth must not bypass security)', () => {
  test('unauthenticated user cannot reach /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
  });

  test('unauthenticated user cannot reach /admin', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
  });
});
