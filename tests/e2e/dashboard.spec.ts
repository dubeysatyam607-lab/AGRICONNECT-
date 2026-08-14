import { test, expect } from '@playwright/test';


  test.beforeEach(async ({ page }) => {
    // start from base URL, ensure app loads
    await page.goto('/');
    // wait for main content
    await expect(page.locator('h1.sr-only')).toHaveText('AgriConnect Dashboard');
  });

  test('should navigate to each major tab without errors', async ({ page }) => {
    const tabs = [
      { name: 'Market', path: '/mandi' },
      { name: 'Tractors', path: '/tractors' },
      { name: 'Store', path: '/store' },
      { name: 'Schemes', path: '/schemes' },
      { name: 'Loans', path: '/loans' },
      { name: 'Labor', path: '/labor' },
      { name: 'Cattle', path: '/cattle-market' },
      { name: 'Community', path: '/community' },
      { name: 'Analytics', path: '/farm-ledger' },
      { name: 'Profile', path: '/profile' },
    ];

    for (const tab of tabs) {
      // Click within the bottom navigation bar to avoid other buttons with same name
      await page.locator('nav').getByRole('button', { name: tab.name }).click();
      // simple sanity check: ensure main container renders after navigation
      await expect(page.locator('#main-content')).toBeVisible();
    }
  });

  // test('logout button clears session and redirects to login', async ({ page }) => {
  //   // assume user is logged in; navigate to profile settings where logout lives
  //   await page.locator('nav').getByRole('button', { name: 'Profile' }).click();
  //   // click logout button – it has text "Log Out"
  //   await page.getByRole('button', { name: /log out/i }).click();
  //   // after logout, verify we are back to the home dashboard (URL should be root)
  //   await expect(page).toHaveURL('/');
  //   // verify local storage cleared
  //   const token = await page.evaluate(() => localStorage.getItem('supabase.auth.token'));
  //   expect(token).toBeNull();
  // });
