import { test, expect, Page } from '@playwright/test';

// Helper: Login to the application
async function login(page: Page) {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const usernameInput = page.locator('input[name="email"], input[name="username"]').first();
    const passwordInput = page.locator('input[type="password"]');

    try {
        await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
        await usernameInput.fill('admin');
        await passwordInput.fill('admin123');
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/\/(dashboard|sales)/, { timeout: 5000 });
    } catch (e) {
        console.log('Login timeout or already logged in:', e);
    }
}

test.describe('Invoices Page', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.goto('/invoices');
        await page.waitForLoadState('networkidle');
    });

    test('download zip button is visible and triggers download', async ({ page }) => {
        const downloadButton = page.locator('button:has-text("Download ZIP"), button:has-text("تحميل ZIP")');
        await expect(downloadButton).toBeVisible();

        const [popup] = await Promise.all([
            page.waitForEvent('popup'),
            downloadButton.click()
        ]);

        const url = popup.url();
        expect(url).toContain('/api/invoices/export-zip');
    });
});
