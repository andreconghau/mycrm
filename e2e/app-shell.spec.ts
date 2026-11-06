import { expect, test } from '@playwright/test'

test('root route opens the Vietnamese sign-in scaffold', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/vi\/login$/)
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
})

test('locale switch keeps the current workspace route', async ({ page }) => {
  await page.goto('/en/dashboard')
  await page.getByRole('button', { name: 'VI', exact: true }).click()

  await expect(page).toHaveURL(/\/vi\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Báo cáo' })).toBeVisible()
})

test('global search opens matching R1 results', async ({ page }) => {
  await page.goto('/en/dashboard')
  const search = page.getByRole('searchbox', { name: 'Search CRM' })
  await search.fill('Han River Foods')
  await search.press('Enter')

  await expect(page).toHaveURL(/\/en\/search\?q=Han%20River%20Foods$/)
  await expect(
    page.getByRole('heading', { name: 'Search results' }),
  ).toBeVisible()
  await expect(
    page.getByRole('main').getByText('Customers', { exact: true }),
  ).toBeVisible()
})

test('profile drawer edits display name and avatar initials', async ({
  page,
}) => {
  await page.goto('/en/dashboard')
  await page.getByRole('button', { name: 'Profile' }).click()
  const drawer = page.getByRole('dialog', { name: 'Edit profile' })
  await expect(drawer).toBeVisible()
  await drawer.getByLabel('Display name').fill('Linh Example')
  await drawer.getByLabel('Avatar initials').fill('LE')
  await drawer.getByRole('button', { name: 'Save changes' }).click()

  await expect(
    page.getByRole('button', { name: 'Profile', exact: true }),
  ).toContainText('Linh Example')
  await expect(page.getByText('LE', { exact: true })).toBeVisible()
})

test('desktop sidebar collapses and remembers its state', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'), 'Desktop viewport only')
  await page.goto('/en/dashboard')
  await page.getByRole('button', { name: 'Collapse sidebar' }).click()

  await expect(
    page.getByRole('button', { name: 'Expand sidebar' }),
  ).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem('r1-sidebar-collapsed')),
    )
    .toBe('true')
})

test('mobile sidebar opens as an off-canvas navigation', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Mobile viewport only')
  await page.goto('/en/dashboard')
  await page.getByRole('button', { name: 'Open navigation' }).click()

  await expect(
    page.getByRole('navigation', { name: 'Export workspace navigation' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Customers' })).toBeVisible()
})

test('market selection isolates lists and persists across locale and reload', async ({
  page,
}) => {
  await page.goto('/en/customers')
  const table = page.getByRole('table')
  await expect(table).toContainText('Han River Foods')
  await page
    .getByRole('combobox', { name: 'Market', exact: true })
    .selectOption('market-jp')
  await expect(table).toContainText('Pacific Blue Trading')
  await expect(table).not.toContainText('Han River Foods')
  await page.reload()
  await expect(table).toContainText('Pacific Blue Trading')
  await page.getByRole('button', { name: 'VI', exact: true }).click()
  await expect(
    page.getByRole('combobox', { name: 'Thị trường', exact: true }),
  ).toHaveValue('market-jp')
  await expect(table).toContainText('Pacific Blue Trading')
})

test('market changes scope dashboard and search without leaking previous results', async ({
  page,
}) => {
  await page.goto('/en/dashboard')
  await page
    .getByRole('combobox', { name: 'Market', exact: true })
    .selectOption('market-us')
  await expect(page.getByRole('table')).toContainText('Nordic Catch GmbH')
  await expect(page.getByRole('table')).not.toContainText('Han River Foods')
  await page.goto('/en/search?q=Han%20River')
  await expect(page.getByRole('main')).toContainText('No matching records.')
  await page
    .getByRole('combobox', { name: 'Market', exact: true })
    .selectOption('market-kr')
  await expect(page.getByRole('main')).toContainText('Customers')
  await page.getByRole('button', { name: 'VI', exact: true }).click()
  await expect(page).toHaveURL(/\/vi\/search\?q=Han%20River$/)
})

test('an invalid stored market falls back to an authorized option', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('r1-market:usr-linh', 'market-invalid'),
  )
  await page.goto('/en/customers')
  await expect(
    page.getByRole('combobox', { name: 'Market', exact: true }),
  ).toHaveValue('market-kr')
  await expect(page.getByRole('table')).toContainText('Han River Foods')
})
