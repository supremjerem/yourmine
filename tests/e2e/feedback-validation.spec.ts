import { test, expect } from '@playwright/test';

test.describe('Feedback & Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should show failed status for invalid YouTube video', async ({ page }) => {
    await test.step('Enter an invalid YouTube video URL', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      await urlInput.fill('https://www.youtube.com/watch?v=invalid_video_id_12345');
    });

    await test.step('Start download', async () => {
      const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
      await downloadBtn.click();
      await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
    });

    await test.step('Wait for download to fail in Current tab', async () => {
      await expect(page.locator('.status-badge').filter({ hasText: 'failed' }).first()).toBeVisible({ timeout: 30000 });
      await expect(page.locator('.error-message').first()).toBeVisible();
    });
  });

  test('should disable download button when input is empty', async ({ page }) => {
    await test.step('Verify button is disabled initially', async () => {
      const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
      await expect(downloadBtn).toBeDisabled();
    });

    await test.step('Enter URL and verify button is enabled', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      await urlInput.fill('https://www.youtube.com/watch?v=test');
      const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
      await expect(downloadBtn).toBeEnabled();
    });
  });

  test('should persist downloads in localStorage after refresh', async ({ page }) => {
    await test.step('Start a download', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
      await urlInput.fill('https://www.youtube.com/watch?v=9bZkp7q19f0');
      await downloadBtn.click();
    });

    await test.step('Wait for download card to appear', async () => {
      await expect(page.locator('.download-card').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('Refresh and verify downloads persist in History tab', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');
      const historyTab = page.getByRole('button', { name: 'History' });
      await historyTab.click();
      const downloadCards = page.locator('.download-card');
      const count = await downloadCards.count();
      await expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  test('should clear all history when clicking Clear History button', async ({ page }) => {
    await test.step('Start a download', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
      await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      await downloadBtn.click();
    });

    await test.step('Wait for download to complete', async () => {
      await expect(page.locator('.download-card').first()).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('.toast-success').filter({ hasText: /downloaded to your Downloads folder/i })
      ).toBeVisible({ timeout: 60000 });
    });

    await test.step('Switch to history tab and clear history', async () => {
      const historyTab = page.getByRole('button', { name: /Download history/ });
      await historyTab.click();
      const clearBtn = page.getByRole('button', { name: 'Clear all download history' });
      await expect(clearBtn).toBeVisible();
      await clearBtn.click();
    });

    await test.step('Verify history is cleared', async () => {
      await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.toast-success')).toContainText('History cleared!');
      await expect(page.locator('.empty-state')).toBeVisible();
      const clearBtn = page.getByRole('button', { name: 'Clear all download history' });
      await expect(clearBtn).not.toBeVisible();
    });
  });
});
