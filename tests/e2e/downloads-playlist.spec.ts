import { test, expect } from '@playwright/test';

// Playlist IDs the simulated backend understands: a plain one holds three
// videos, "PLlong" outgrows any cap, and "invalid" is reported unavailable.
const PLAYLIST = 'https://www.youtube.com/playlist?list=PLabcdefghij';
const LONG_PLAYLIST = 'https://www.youtube.com/playlist?list=PLlongabcdef';
const UNAVAILABLE_PLAYLIST = 'https://www.youtube.com/playlist?list=invalidabcdef';

test.describe('Playlist Download Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should queue every video of a playlist', async ({ page }) => {
    await test.step('Submit a playlist link', async () => {
      await page.getByLabel('YouTube URL input').fill(PLAYLIST);
      await page.getByRole('button', { name: 'Rip', exact: true }).click();
    });

    await test.step('Verify one card per video', async () => {
      await expect(page.locator('[data-testid="toast-success"]')).toContainText('Queued 3 downloads');
      await expect(page.locator('[data-testid="download-card"]')).toHaveCount(3);
    });
  });

  test('should say when a long playlist was cut short', async ({ page }) => {
    await page.getByLabel('YouTube URL input').fill(LONG_PLAYLIST);
    await page.getByRole('button', { name: 'Rip', exact: true }).click();

    await expect(page.locator('[data-testid="toast-success"]')).toContainText('playlist cut at 50 videos');
  });

  test('should report an unavailable playlist', async ({ page }) => {
    await page.getByLabel('YouTube URL input').fill(UNAVAILABLE_PLAYLIST);
    await page.getByRole('button', { name: 'Rip', exact: true }).click();

    await expect(page.locator('[data-testid="toast-error"]')).toContainText('Playlist unavailable');
    await expect(page.locator('[data-testid="download-card"]')).toHaveCount(0);
  });
});
