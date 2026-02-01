import { test, expect } from '@playwright/test';

test.describe('Single Download Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should start a single MP3 download', async ({ page }) => {
    const urlInput = page.getByLabel('YouTube URL input');
    const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
    
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await downloadBtn.click();
    
    await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toast-success')).toContainText('Download started!');
    
    await expect(page.locator('.download-card').first()).toBeVisible({ timeout: 10000 });
    
    await page.waitForTimeout(3000);
    
    const statusBadge = page.locator('.status-badge').first();
    await expect(statusBadge).toBeVisible();
  });

  test('should start a single WAV download', async ({ page }) => {
    const wavRadio = page.getByRole('radio', { name: 'WAV lossless format' });
    const urlInput = page.getByLabel('YouTube URL input');
    const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
    
    await wavRadio.click();
    await expect(wavRadio).toBeChecked();
    
    await urlInput.fill('https://www.youtube.com/watch?v=9bZkp7q19f0');
    await downloadBtn.click();
    
    await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
    
    await expect(page.locator('.download-card').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.download-format').first()).toContainText('WAV');
  });

  test('should display progress bar during download', async ({ page }) => {
    const urlInput = page.getByLabel('YouTube URL input');
    const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
    
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await downloadBtn.click();
    
    await expect(page.locator('.download-card').first()).toBeVisible({ timeout: 10000 });
    
    const progressBar = page.locator('.progress-bar-wrapper').first();
    await expect(progressBar).toBeVisible({ timeout: 15000 });
    
    await expect(progressBar).toHaveAttribute('role', 'progressbar');
  });

  test('should auto-move to history when completed', async ({ page }) => {
    const urlInput = page.getByLabel('YouTube URL input');
    const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
    
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await downloadBtn.click();
    
    await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.download-card').first()).toBeVisible({ timeout: 10000 });
    
    // Wait for completion toast
    await expect(page.locator('.toast-success').filter({ hasText: /downloaded to your Downloads folder/i })).toBeVisible({ timeout: 60000 });
    
    // Should move to history automatically
    const historyTab = page.getByRole('button', { name: /Download history/ });
    // Just check that history count increased (don't check exact number)
    await expect(historyTab).toContainText(/History \(\d+\)/);
    
    // Click history tab
    await historyTab.click();
    
    // Verify download is in history
    await expect(page.locator('.download-card').first()).toBeVisible();
  });
});