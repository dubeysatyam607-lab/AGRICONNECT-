// tests/e2e/future_farming_blog.spec.ts
import { test, expect } from '@playwright/test';

test('Future Farming blog article appears and navigates correctly', async ({ page }) => {
  // Go to the blog listing page
  await page.goto('/blogs');

  // Find the article card by its title
  const articleTitle = 'The Future of Farming Is Connected: How AgriConnect Is Building the Digital Infrastructure for Agriculture';
  const articleLink = page.getByRole('link', { name: articleTitle });
  await expect(articleLink).toBeVisible();

  // Click the article to navigate to the detailed page
  await articleLink.click();

  // Verify we are on the detailed page
  await expect(page).toHaveURL(/\/blogs\/future-of-farming/);
  await expect(page.getByRole('heading', { name: 'The Future of Farming Is Connected' })).toBeVisible();
  // Verify some excerpt text is present
  await expect(page.getByText('Agriculture is entering a new technological era')).toBeVisible();
});
