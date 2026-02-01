import { test, expect } from '@playwright/test';

test.describe('Feedback & Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should show error toast for invalid URL', async ({ page }) => {
    const urlInput = page.getByLabel('YouTube URL input');
    const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
    
    await urlInput.fill('not-a-valid-url');
    await downloadBtn.click();
    
    await expect(page.locator('.toast-error')).toBeVisible({ timeout: 5000 });
  });

  test('should disable download button when input is empty', async ({ page }) => {
    const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
    
    await expect(downloadBtn).toBeDisabled();
    
    const urlInput = page.getByLabel('YouTube URL input');
    await urlInput.fill('https://www.youtube.com/watch?v=test');
    
    await expect(downloadBtn).toBeEnabled();
  });

  test('should persist downloads in localStorage after refresh', async ({ page }) => {
    const urlInput = page.getByLabel('YouTube URL input');
    const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
    
    await urlInput.fill('https://www.youtube.com/watch?v=9bZkp7q19f0');
    await downloadBtn.click();
    
    await expect(page.locator('.download-card').first()).toBeVisible({ timeout: 10000 });
    
    const currentTab = page.getByRole('button', { name: /Current downloads/ });
    const initialCount = await currentTab.textContent();
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const currentTabAfter = page.getByRole('button', { name: /Current downloads/ });
    const countAfter = await currentTabAfter.textContent();
    
    const downloadCards = page.locator('.download-card');
    const count = await downloadCards.count();
    await expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should clear all history when clicking Clear History button', async ({ page }) => {
    // Start a download and wait for completion
    const urlInput = page.getByLabel('YouTube URL input');
    const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
    
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await downloadBtn.click();
    
    await expect(page.locator('.download-card').first()).toBeVisible({ timeout: 10000 });
    
    // Wait for completion toast (auto-moves to history)
    await expect(page.locator('.toast-success').filter({ hasText: /downloaded to your Downloads folder/i })).toBeVisible({ timeout: 60000 });
    
    // Switch to history tab
    const historyTab = page.getByRole('button', { name: /Download history/ });
    await historyTab.click();
    
    // Clear button should appear
    const clearBtn = page.getByRole('button', { name: 'Clear all download history' });
    await expect(clearBtn).toBeVisible();
    
    // Click clear history
    await clearBtn.click();
    
    // Should show success toast
    await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toast-success')).toContainText('History cleared!');
    
    // History should be empty
    await expect(page.locator('.empty-state')).toBeVisible();
    
    // Clear button should not be visible anymore
    await expect(clearBtn).not.toBeVisible();
  });
});
