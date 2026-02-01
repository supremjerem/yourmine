import { test, expect } from '@playwright/test';

test.describe('Single Download Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should start a single MP3 download', async ({ page }) => {
    await test.step('Enter YouTube URL and click download', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
      
      await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      await downloadBtn.click();
    });
    
    await test.step('Verify download started toast appears', async () => {
      await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.toast-success')).toContainText('Download started!');
    });
    
    await test.step('Verify download card is created', async () => {
      await expect(page.locator('.download-card').first()).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(3000);
      const statusBadge = page.locator('.status-badge').first();
      await expect(statusBadge).toBeVisible();
    });
  });

  test('should start a single WAV download', async ({ page }) => {
    await test.step('Select WAV format', async () => {
      const wavRadio = page.getByRole('radio', { name: 'WAV lossless format' });
      await wavRadio.click();
      await expect(wavRadio).toBeChecked();
    });
    
    await test.step('Enter YouTube URL and start download', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
      
      await urlInput.fill('https://www.youtube.com/watch?v=9bZkp7q19f0');
      await downloadBtn.click();
    });
    
    await test.step('Verify download started with WAV format', async () => {
      await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.download-card').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.download-format').first()).toContainText('WAV');
    });
  });

  test('should display progress bar during download', async ({ page }) => {
    await test.step('Start a download', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
      
      await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      await downloadBtn.click();
    });
    
    await test.step('Verify progress bar appears with correct attributes', async () => {
      await expect(page.locator('.download-card').first()).toBeVisible({ timeout: 10000 });
      const progressBar = page.locator('.progress-bar-wrapper').first();
      await expect(progressBar).toBeVisible({ timeout: 15000 });
      await expect(progressBar).toHaveAttribute('role', 'progressbar');
    });
  });

  test('should auto-move to history when completed', async ({ page }) => {
    await test.step('Start a download', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
      
      await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      await downloadBtn.click();
    });

    await test.step('Wait for download to start', async () => {
      await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.download-card').first()).toBeVisible({ timeout: 10000 });
    });
    
    await test.step('Wait for download completion', async () => {
      await expect(
        page.locator('.toast-success').filter({ hasText: /downloaded to your Downloads folder/i })
      ).toBeVisible({ timeout: 60000 });
    });
    
    await test.step('Verify download appears in history', async () => {
      const historyTab = page.getByRole('button', { name: /Download history/ });
      await expect(historyTab).toContainText(/History \(\d+\)/);
      await historyTab.click();
      await expect(page.locator('.download-card').first()).toBeVisible();
    });
  });
});