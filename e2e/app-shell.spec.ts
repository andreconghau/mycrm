import { expect, test } from '@playwright/test'

test('root route sends the visitor to the sign-in scaffold', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('dashboard route renders the workspace shell', async ({ page }) => {
  await page.goto('/dashboard')

  await expect(
    page.getByRole('navigation', { name: 'Workspace navigation' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  const viewportWidths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }))

  expect(viewportWidths.scroll).toBeLessThanOrEqual(viewportWidths.viewport)
})

test('workspace navigation is keyboard reachable', async ({ page }) => {
  await page.goto('/dashboard')
  await page.keyboard.press('Tab')

  await expect(
    page.getByRole('link', { name: 'Seafood Export CRM' }),
  ).toBeFocused()
})
