import { test, expect } from '@playwright/test';

test('verify zero trust navigation on defencewire.in', async ({ page }) => {
  console.log('🌐 Opening defencewire.in/#curator...');
  await page.goto('https://defencewire.in/#curator', { waitUntil: 'networkidle' });

  const modal = page.locator('.dw-editor-modal-overlay');
  await expect(modal).toBeVisible({ timeout: 5000 });

  const btn = page.locator('a.dw-editor-btn--promote');
  await expect(btn).toBeVisible();

  console.log('🔘 Button href:', await btn.getAttribute('href'));
  console.log('🔘 Button text:', await btn.innerText());

  // Click the link and wait for navigation
  await Promise.all([
    page.waitForURL((url) => url.hostname.includes('cloudflareaccess.com') || url.pathname.includes('/api/curator/auth'), { timeout: 15000 }),
    btn.click()
  ]);

  console.log('🎯 Final URL after click:', page.url());
  expect(page.url()).toContain('cloudflareaccess.com');
});
