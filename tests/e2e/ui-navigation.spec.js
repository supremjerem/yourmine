import { test, expect } from '@playwright/test';

test.describe('UI & Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display the application header', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Yourmine');
    await expect(page.locator('header p')).toContainText('YouTube Audio Downloader');
  });

  test('should have mode toggle buttons', async ({ page }) => {
    const singleBtn = page.getByRole('button', { name: 'Single download mode' });
    const batchBtn = page.getByRole('button', { name: 'Batch download mode' });
    
    await expect(singleBtn).toBeVisible();
    await expect(batchBtn).toBeVisible();
    await expect(singleBtn).toHaveClass(/active/);
  });

  test('should have format selection radio buttons', async ({ page }) => {
    const mp3Radio = page.getByRole('radio', { name: 'MP3 lossy format' });
    const wavRadio = page.getByRole('radio', { name: 'WAV lossless format' });
    
    await expect(mp3Radio).toBeVisible();
    await expect(wavRadio).toBeVisible();
    await expect(mp3Radio).toBeChecked();
  });

  test('should switch between single and batch mode', async ({ page }) => {
    const urlInput = page.getByLabel('YouTube URL input');
    await expect(urlInput).toBeVisible();

    await page.getByRole('button', { name: 'Batch download mode' }).click();
    
    const urlsTextarea = page.getByLabel('YouTube URLs batch input');
    await expect(urlsTextarea).toBeVisible();
    await expect(urlInput).not.toBeVisible();

    await page.getByRole('button', { name: 'Single download mode' }).click();
    await expect(urlInput).toBeVisible();
  });

  test('should switch audio format', async ({ page }) => {
    const mp3Radio = page.getByRole('radio', { name: 'MP3 lossy format' });
    const wavRadio = page.getByRole('radio', { name: 'WAV lossless format' });
    
    await expect(mp3Radio).toBeChecked();
    
    await wavRadio.click();
    await expect(wavRadio).toBeChecked();
    await expect(mp3Radio).not.toBeChecked();
    
    await mp3Radio.click();
    await expect(mp3Radio).toBeChecked();
  });

  test('should switch between Current and History tabs', async ({ page }) => {
    const currentTab = page.getByRole('button', { name: /Current downloads/ });
    const historyTab = page.getByRole('button', { name: /Download history/ });
    
    await expect(currentTab).toHaveClass(/active/);
    
    await historyTab.click();
    await expect(historyTab).toHaveClass(/active/);
    await expect(currentTab).not.toHaveClass(/active/);
    
    await currentTab.click();
    await expect(currentTab).toHaveClass(/active/);
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    await expect(page.getByLabel('YouTube URL input')).toBeVisible();
    await expect(page.getByLabel('MP3 lossy format')).toBeVisible();
    await expect(page.getByLabel('WAV lossless format')).toBeVisible();
    
    const modeToggle = page.locator('[role="group"][aria-label="Download mode selection"]');
    await expect(modeToggle).toBeVisible();
    
    const formatSelector = page.locator('[role="group"][aria-label="Audio format selection"]');
    await expect(formatSelector).toBeVisible();
  });
});
