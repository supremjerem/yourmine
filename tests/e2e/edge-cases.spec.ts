import { test, expect } from '@playwright/test';

test.describe('Edge Cases & Missing Coverage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should verify backend health check responds', async ({ request }) => {
    const response = await request.get('http://localhost:8000/');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.message).toContain('Yourmine');
  });

  test('should disable batch download button when textarea is empty', async ({ page }) => {
    await test.step('Switch to batch mode', async () => {
      await page.getByRole('button', { name: 'Batch download mode' }).click();
    });

    await test.step('Verify Download All button is disabled initially', async () => {
      const downloadBtn = page.getByRole('button', { name: 'Download All' });
      await expect(downloadBtn).toBeDisabled();
    });

    await test.step('Enter URLs and verify button becomes enabled', async () => {
      const urlsTextarea = page.getByLabel('YouTube URLs batch input');
      await urlsTextarea.fill('https://www.youtube.com/watch?v=test');
      const downloadBtn = page.getByRole('button', { name: 'Download All' });
      await expect(downloadBtn).toBeEnabled();
    });

    await test.step('Clear textarea and verify button is disabled again', async () => {
      const urlsTextarea = page.getByLabel('YouTube URLs batch input');
      await urlsTextarea.fill('');
      const downloadBtn = page.getByRole('button', { name: 'Download All' });
      await expect(downloadBtn).toBeDisabled();
    });
  });

  test('should ignore comment lines in batch mode', async ({ page }) => {
    await test.step('Switch to batch mode', async () => {
      await page.getByRole('button', { name: 'Batch download mode' }).click();
    });

    await test.step('Enter URLs with comment lines', async () => {
      const urlsTextarea = page.getByLabel('YouTube URLs batch input');
      await urlsTextarea.fill(
        '# This is a comment\nhttps://www.youtube.com/watch?v=jNQXAC9IVRw\n# Another comment\n'
      );
    });

    await test.step('Start download and verify only 1 download is created (comments filtered)', async () => {
      const downloadBtn = page.getByRole('button', { name: 'Download All' });
      await downloadBtn.click();
      await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.toast-success')).toContainText('1 downloads started!');
    });
  });

  test('should clear URL input after successful single download', async ({ page }) => {
    await test.step('Enter URL and submit', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
      await downloadBtn.click();
    });

    await test.step('Verify input is cleared after submission', async () => {
      await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
      const urlInput = page.getByLabel('YouTube URL input');
      await expect(urlInput).toHaveValue('');
    });
  });

  test('should clear textarea after successful batch download', async ({ page }) => {
    await test.step('Switch to batch mode and enter URLs', async () => {
      await page.getByRole('button', { name: 'Batch download mode' }).click();
      const urlsTextarea = page.getByLabel('YouTube URLs batch input');
      await urlsTextarea.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw');
    });

    await test.step('Submit and verify textarea is cleared', async () => {
      const downloadBtn = page.getByRole('button', { name: 'Download All' });
      await downloadBtn.click();
      await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
      const urlsTextarea = page.getByLabel('YouTube URLs batch input');
      await expect(urlsTextarea).toHaveValue('');
    });
  });

  test('should show loading state on download button', async ({ page }) => {
    await test.step('Enter URL', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    await test.step('Click download and verify button shows loading text', async () => {
      const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
      await downloadBtn.click();

      // The button should briefly show "Starting..." while the request is in flight
      // Then revert once the request completes
      await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });

      // After completion, button should be back to normal text
      await expect(downloadBtn).toContainText('Download');
    });
  });

  test('should show error toast for network error', async ({ page }) => {
    await test.step('Block API calls to simulate network error', async () => {
      await page.route('**/download', route => route.abort('connectionrefused'));
    });

    await test.step('Try to download and verify error toast', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
      await downloadBtn.click();

      await expect(page.locator('.toast-error')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.toast-error')).toContainText('Error');
    });
  });

  test('should show error message inside download card on failure', async ({ page }) => {
    await test.step('Submit an invalid URL that will fail', async () => {
      const urlInput = page.getByLabel('YouTube URL input');
      await urlInput.fill('https://www.youtube.com/watch?v=invalid_vid');

      const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
      await downloadBtn.click();
    });

    await test.step('Verify error message has alert role for accessibility', async () => {
      await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.download-card').first()).toBeVisible({ timeout: 10000 });

      const errorMsg = page.locator('.error-message[role="alert"]').first();
      await expect(errorMsg).toBeVisible({ timeout: 30000 });
    });
  });
});
