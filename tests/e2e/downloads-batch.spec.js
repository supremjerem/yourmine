import { test, expect } from '@playwright/test';

test.describe('Batch Download Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should start batch downloads in MP3 format', async ({ page }) => {
    await page.getByRole('button', { name: 'Batch download mode' }).click();
    
    const urlsTextarea = page.getByLabel('YouTube URLs batch input');
    const downloadBtn = page.getByRole('button', { name: 'Download All' });
    
    await urlsTextarea.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw\nhttps://www.youtube.com/watch?v=kJQP7kiw5Fk');
    
    await downloadBtn.click();
    
    await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toast-success')).toContainText('downloads started!');
    
    await page.waitForTimeout(2000);
    const downloadCards = page.locator('.download-card');
    await expect(downloadCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('should start batch downloads in WAV format', async ({ page }) => {
    const wavRadio = page.getByRole('radio', { name: 'WAV lossless format' });
    await wavRadio.click();
    await expect(wavRadio).toBeChecked();
    
    await page.getByRole('button', { name: 'Batch download mode' }).click();
    
    const urlsTextarea = page.getByLabel('YouTube URLs batch input');
    const downloadBtn = page.getByRole('button', { name: 'Download All' });
    
    await urlsTextarea.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw\nhttps://www.youtube.com/watch?v=kJQP7kiw5Fk');
    
    await downloadBtn.click();
    
    await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toast-success')).toContainText('downloads started!');
    
    // Wait for at least one download card to appear
    await expect(page.locator('.download-card').first()).toBeVisible({ timeout: 15000 });
    
    // Give time for format to display
    await page.waitForTimeout(2000);
    
    // Check that at least one download card exists
    const downloadCards = page.locator('.download-card');
    const count = await downloadCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
