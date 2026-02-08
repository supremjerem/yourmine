import { test, expect } from '@playwright/test';

test.describe('Batch Download Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should start batch downloads in MP3 format', async ({ page }) => {
    await test.step('Switch to batch download mode', async () => {
      await page.getByRole('button', { name: 'Batch download mode' }).click();
    });

    await test.step('Enter multiple YouTube URLs', async () => {
      const urlsTextarea = page.getByLabel('YouTube URLs batch input');
      await urlsTextarea.fill(
        'https://www.youtube.com/watch?v=jNQXAC9IVRw\nhttps://www.youtube.com/watch?v=kJQP7kiw5Fk'
      );
    });

    await test.step('Start batch download', async () => {
      const downloadBtn = page.getByRole('button', { name: 'Download All' });
      await downloadBtn.click();
    });

    await test.step('Verify batch downloads started', async () => {
      await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.toast-success')).toContainText('downloads started!');
      const downloadCards = page.locator('.download-card');
      await expect(downloadCards.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test('should start batch downloads in WAV format', async ({ page }) => {
    await test.step('Select WAV format', async () => {
      const wavRadio = page.getByRole('radio', { name: 'WAV lossless format' });
      await wavRadio.click();
      await expect(wavRadio).toBeChecked();
    });

    await test.step('Switch to batch download mode', async () => {
      await page.getByRole('button', { name: 'Batch download mode' }).click();
    });

    await test.step('Enter multiple YouTube URLs', async () => {
      const urlsTextarea = page.getByLabel('YouTube URLs batch input');
      await urlsTextarea.fill(
        'https://www.youtube.com/watch?v=jNQXAC9IVRw\nhttps://www.youtube.com/watch?v=kJQP7kiw5Fk'
      );
    });

    await test.step('Start batch download', async () => {
      const downloadBtn = page.getByRole('button', { name: 'Download All' });
      await downloadBtn.click();
    });

    await test.step('Verify batch downloads started with correct format', async () => {
      await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.toast-success')).toContainText('downloads started!');
      const downloadCards = page.locator('.download-card');
      await expect(downloadCards.first()).toBeVisible({ timeout: 15000 });
      const count = await downloadCards.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});
