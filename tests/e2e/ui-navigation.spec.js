import { test, expect } from '@playwright/test';

test.describe('UI & Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display the application header', async ({ page }) => {
    await test.step('Verify header content', async () => {
      await expect(page.locator('h1')).toContainText('Yourmine');
      await expect(page.locator('header p')).toContainText('YouTube Audio Downloader');
    });
  });

  test('should have mode toggle buttons', async ({ page }) => {
    await test.step('Verify mode toggle buttons are visible', async () => {
      const singleBtn = page.getByRole('button', { name: 'Single download mode' });
      const batchBtn = page.getByRole('button', { name: 'Batch download mode' });
      
      await expect(singleBtn).toBeVisible();
      await expect(batchBtn).toBeVisible();
    });

    await test.step('Verify single mode is active by default', async () => {
      const singleBtn = page.getByRole('button', { name: 'Single download mode' });
      await expect(singleBtn).toHaveClass(/active/);
    });
  });

  test('should have format selection radio buttons', async ({ page }) => {
    await test.step('Verify format radio buttons are visible', async () => {
      const mp3Radio = page.getByRole('radio', { name: 'MP3 lossy format' });
      const wavRadio = page.getByRole('radio', { name: 'WAV lossless format' });
      
      await expect(mp3Radio).toBeVisible();
      await expect(wavRadio).toBeVisible();
    });

    await test.step('Verify MP3 is selected by default', async () => {
      const mp3Radio = page.getByRole('radio', { name: 'MP3 lossy format' });
      await expect(mp3Radio).toBeChecked();
    });
  });

  test('should switch between single and batch mode', async ({ page }) => {
    await test.step('Verify single mode shows URL input', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      await expect(urlInput).toBeVisible();
    });

    await test.step('Switch to batch mode', async () => {
      await page.getByRole('button', { name: 'Batch download mode' }).click();
    });

    await test.step('Verify batch mode shows textarea', async () => {
      const urlsTextarea = page.getByLabel('YouTube URLs batch input');
      await expect(urlsTextarea).toBeVisible();
      const urlInput = page.getByLabel('YouTube URL input');
      await expect(urlInput).not.toBeVisible();
    });

    await test.step('Switch back to single mode', async () => {
      await page.getByRole('button', { name: 'Single download mode' }).click();
      const urlInput = page.getByLabel('YouTube URL input');
      await expect(urlInput).toBeVisible();
    });
  });

  test('should switch audio format', async ({ page }) => {
    await test.step('Verify MP3 is selected initially', async () => {
      const mp3Radio = page.getByRole('radio', { name: 'MP3 lossy format' });
      await expect(mp3Radio).toBeChecked();
    });

    await test.step('Switch to WAV format', async () => {
      const wavRadio = page.getByRole('radio', { name: 'WAV lossless format' });
      await wavRadio.click();
      await expect(wavRadio).toBeChecked();
      const mp3Radio = page.getByRole('radio', { name: 'MP3 lossy format' });
      await expect(mp3Radio).not.toBeChecked();
    });

    await test.step('Switch back to MP3 format', async () => {
      const mp3Radio = page.getByRole('radio', { name: 'MP3 lossy format' });
      await mp3Radio.click();
      await expect(mp3Radio).toBeChecked();
    });
  });

  test('should switch between Current and History tabs', async ({ page }) => {
    await test.step('Verify Current tab is active initially', async () => {
      const currentTab = page.getByRole('button', { name: /Current downloads/ });
      await expect(currentTab).toHaveClass(/active/);
    });

    await test.step('Switch to History tab', async () => {
      const historyTab = page.getByRole('button', { name: /Download history/ });
      await historyTab.click();
      await expect(historyTab).toHaveClass(/active/);
      const currentTab = page.getByRole('button', { name: /Current downloads/ });
      await expect(currentTab).not.toHaveClass(/active/);
    });

    await test.step('Switch back to Current tab', async () => {
      const currentTab = page.getByRole('button', { name: /Current downloads/ });
      await currentTab.click();
      await expect(currentTab).toHaveClass(/active/);
    });
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    await test.step('Verify input accessibility labels', async () => {
      await expect(page.getByLabel('YouTube URL input')).toBeVisible();
      await expect(page.getByLabel('MP3 lossy format')).toBeVisible();
      await expect(page.getByLabel('WAV lossless format')).toBeVisible();
    });

    await test.step('Verify ARIA groups are present', async () => {
      const modeToggle = page.locator('[role="group"][aria-label="Download mode selection"]');
      await expect(modeToggle).toBeVisible();
      
      const formatSelector = page.locator('[role="group"][aria-label="Audio format selection"]');
      await expect(formatSelector).toBeVisible();
    });
  });
});
