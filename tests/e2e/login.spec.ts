import { expect, test } from '@playwright/test'

test('login page is accessible and contains no marketing placeholder', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'SIMRS EMR' })).toBeVisible()
  await expect(page.getByLabel('Username')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
})
