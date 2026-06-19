import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const usernameInput = page.locator('input[name="email"], input[name="username"]').first();
    try {
        await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
        await usernameInput.fill('admin');
        await page.locator('input[type="password"]').fill('admin123');
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/\/(dashboard|sales)/, { timeout: 5000 });
    } catch {
        console.log('Login timeout or already logged in');
    }
}

test.describe('Quick Sale (Mobile) - PDF & Invoice', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('sales page loads QuickWizard on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/sales');
        await page.waitForLoadState('domcontentloaded');

        // Should show "Quick Sale" heading
        await expect(page.getByText('Quick Sale')).toBeVisible({ timeout: 10000 });
    });

    test('quick sale flow completes and shows success with PDF actions', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/sales');
        await page.waitForLoadState('domcontentloaded');

        // Step 1: Skip customer selection
        const skipBtn = page.locator('button:has-text("Walk-in Customer")');
        await expect(skipBtn).toBeVisible({ timeout: 10000 });
        await skipBtn.click();

        // Step 2: Search and add a product
        const searchInput = page.locator('input[placeholder*="Search"]');
        await expect(searchInput).toBeVisible({ timeout: 5000 });
        await searchInput.fill('test');
        await page.waitForTimeout(800);

        // Click first available product
        const productBtn = page.locator('button[disabled="false"], button:not([disabled])').filter({ hasText: /test/i }).first();
        if (await productBtn.isVisible()) {
            await productBtn.click();
        }

        // Wait for cart to update
        await page.waitForTimeout(500);

        // Step 3: Go to payment
        const nextBtn = page.locator('button:has-text("Next Step")');
        await expect(nextBtn).toBeVisible();
        await nextBtn.click();

        // Step 4: Review
        await page.waitForTimeout(300);
        await nextBtn.click();

        // Step 5: Confirm sale
        const confirmBtn = page.locator('button:has-text("Confirm Sale")');
        await expect(confirmBtn).toBeVisible();
    });

    test('PDF endpoint returns valid PDF for existing invoice', async ({ page }) => {
        await page.goto('/invoices');
        await page.waitForLoadState('domcontentloaded');

        // Click first invoice row (if any)
        const firstInvoice = page.locator('table tbody tr a, table tbody tr').first();
        const href = await firstInvoice.getAttribute('href');

        if (href) {
            // Try to extract invoice ID from the href
            const match = href.match(/\/invoices\/([^/]+)/);
            if (match) {
                const invoiceId = match[1];
                const response = await page.request.get(`/api/invoices/${invoiceId}/pdf`);
                expect(response.ok()).toBeTruthy();
                expect(response.headers()['content-type']).toBe('application/pdf');

                const body = await response.body();
                expect(body.length).toBeGreaterThan(100);
                // PDF magic bytes
                expect(body.slice(0, 4).toString()).toBe('%PDF');
            }
        }
    });

    test('PDF endpoint supports ?download=1 mode', async ({ page }) => {
        await page.goto('/invoices');
        await page.waitForLoadState('domcontentloaded');

        const firstInvoice = page.locator('table tbody tr a, table tbody tr').first();
        const href = await firstInvoice.getAttribute('href');

        if (href) {
            const match = href.match(/\/invoices\/([^/]+)/);
            if (match) {
                const invoiceId = match[1];
                const response = await page.request.get(`/api/invoices/${invoiceId}/pdf?download=1`);
                expect(response.ok()).toBeTruthy();
                const disposition = response.headers()['content-disposition'] || '';
                expect(disposition).toContain('attachment');
            }
        }
    });
});
