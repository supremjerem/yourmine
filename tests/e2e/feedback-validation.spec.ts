import { test, expect } from '@playwright/test';

test.describe('Feedback & Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should show failed status for invalid YouTube video', async ({ page }) => {
    await test.step('Enter a well-formed URL for a video that does not exist', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      // A valid 11-character ID, so it reaches the downloader and fails there
      // rather than being rejected up front by URL validation.
      await urlInput.fill('https://www.youtube.com/watch?v=aaaaaaaaaaa');
    });

    await test.step('Start download', async () => {
      const downloadBtn = page.getByRole('button', { name: 'Rip', exact: true });
      await downloadBtn.click();
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 5000 });
    });

    await test.step('Wait for download to fail in Current tab', async () => {
      await expect(page.locator('[data-testid="status-badge"]').filter({ hasText: /failed/i }).first()).toBeVisible({ timeout: 30000 });
      await expect(page.locator('[data-testid="error-message"]').first()).toBeVisible();
    });
  });

  test('should reject a URL that is not a YouTube video', async ({ page }) => {
    // The backend hands URLs to yt-dlp, whose generic extractor will fetch any
    // host. Non-YouTube URLs must be refused before a job is ever created.
    await test.step('Enter a non-YouTube URL', async () => {
      await page.getByLabel('YouTube URL input').fill('http://192.168.1.1/');
    });

    await test.step('Verify it is refused and no download is created', async () => {
      await page.getByRole('button', { name: 'Rip', exact: true }).click();
      await expect(page.locator('[data-testid="toast-error"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="download-card"]')).toHaveCount(0);
    });
  });

  test('should disable download button when input is empty', async ({ page }) => {
    await test.step('Verify button is disabled initially', async () => {
      const downloadBtn = page.getByRole('button', { name: 'Rip', exact: true });
      await expect(downloadBtn).toBeDisabled();
    });

    await test.step('Enter URL and verify button is enabled', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      await urlInput.fill('https://www.youtube.com/watch?v=test');
      const downloadBtn = page.getByRole('button', { name: 'Rip', exact: true });
      await expect(downloadBtn).toBeEnabled();
    });
  });

  test('should persist downloads in localStorage after refresh', async ({ page }) => {
    await test.step('Start a download', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      const downloadBtn = page.getByRole('button', { name: 'Rip', exact: true });
      await urlInput.fill('https://www.youtube.com/watch?v=9bZkp7q19f0');
      await downloadBtn.click();
    });

    await test.step('Wait for download card to appear', async () => {
      await expect(page.locator('[data-testid="download-card"]').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('Refresh and verify downloads persist in History tab', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');
      const historyTab = page.getByRole('button', { name: /Download history/ });
      await historyTab.click();
      const downloadCards = page.locator('[data-testid="download-card"]');
      const count = await downloadCards.count();
      await expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  test('should clear all history when clicking Clear History button', async ({ page }) => {
    await test.step('Start a download', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      const downloadBtn = page.getByRole('button', { name: 'Rip', exact: true });
      await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      await downloadBtn.click();
    });

    await test.step('Wait for download to complete', async () => {
      await expect(page.locator('[data-testid="download-card"]').first()).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="toast-success"]').filter({ hasText: /Saved .* to Downloads/i })
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
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="toast-success"]')).toContainText('Earlier downloads cleared');
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
      const clearBtn = page.getByRole('button', { name: 'Clear all download history' });
      await expect(clearBtn).not.toBeVisible();
    });
  });
});
