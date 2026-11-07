import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }, testInfo) => {
  if (
    testInfo.title.includes('anonymous') ||
    testInfo.title.startsWith('root route') ||
    testInfo.title.startsWith('admin Swagger')
  )
    return
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD
  if (!email || !password) throw new Error('Browser auth fixture is missing')
  await page.goto('/en/login')
  await page.getByLabel('Work email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/en\/dashboard$/)
})

test('root route opens the Vietnamese sign-in scaffold', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/vi\/login$/)
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
})

test('anonymous API and workspace requests fail closed', async ({ page }) => {
  const response = await page.request.get('/api/v1/me')
  expect(response.status()).toBe(401)
  expect((await page.request.get('/api/v1/openapi.json')).status()).toBe(401)
  expect(
    (await page.request.get('/api/v1/swagger-assets/swagger-ui.css')).status(),
  ).toBe(401)
  await page.goto('/en/dashboard')
  await expect(page).toHaveURL(/\/en\/login$/)
})

test('wrong-role access administration fails closed', async ({ page }) => {
  await page.goto('/en/admin/users')
  await expect(
    page.getByRole('heading', { name: 'Access denied' }),
  ).toBeVisible()
  const response = await page.request.get('/api/v1/admin/users')
  expect(response.status()).toBe(403)
  expect((await page.request.get('/api/v1/openapi.json')).status()).toBe(403)
  expect(
    (await page.request.get('/api/v1/swagger-assets/swagger-ui.css')).status(),
  ).toBe(403)
  await page.goto('/en/api-docs')
  await expect(
    page.getByRole('heading', { name: 'Access denied' }),
  ).toBeVisible()
})

test('admin Swagger renders the protected contract and executes a safe request', async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD
  if (!email || !password) throw new Error('Browser admin fixture is missing')

  await page.goto('/en/login')
  await page.getByLabel('Work email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/en\/dashboard$/)

  const contract = await page.request.get('/api/v1/openapi.json')
  expect(contract.status()).toBe(200)
  expect(contract.headers()['cache-control']).toBe('private, no-store')

  await page.goto('/en/api-docs')
  await expect(
    page.getByRole('heading', { name: 'API documentation' }),
  ).toBeVisible()
  const operation = page
    .locator('.opblock')
    .filter({ hasText: '/api/v1/me' })
    .first()
  await expect(operation).toBeVisible()
  await operation.locator('.opblock-summary').click()
  await operation.getByRole('button', { name: 'Try it out' }).click()
  await operation.getByRole('button', { name: 'Execute' }).click()
  await expect(
    operation.locator('.live-responses-table').getByRole('cell', {
      name: '200',
      exact: true,
    }),
  ).toBeVisible()
})

test('refresh rotates credentials and stale reuse revokes the session', async ({
  page,
  context,
  request,
}) => {
  const cookies = await context.cookies()
  const oldRefresh = cookies.find((cookie) => cookie.name === 'crm_refresh')
  const oldCsrf = cookies.find((cookie) => cookie.name === 'crm_csrf')
  expect(oldRefresh).toBeTruthy()
  expect(oldCsrf).toBeTruthy()

  const rotatedStatus = await page.evaluate(async (csrf) => {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
    })
    return response.status
  }, oldCsrf!.value)
  expect(rotatedStatus).toBe(200)

  const stale = await request.post('/api/v1/auth/refresh', {
    headers: {
      cookie: `crm_refresh=${oldRefresh!.value}; crm_csrf=${oldCsrf!.value}`,
      origin: 'http://127.0.0.1:3000',
      'x-csrf-token': oldCsrf!.value,
    },
  })
  expect(stale.status()).toBe(401)
  expect((await page.request.get('/api/v1/me')).status()).toBe(401)
})

test('logout revokes the current session and clears credentials', async ({
  page,
  context,
  request,
}) => {
  const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000'
  const cookies = await context.cookies()
  const refresh = cookies.find((cookie) => cookie.name === 'crm_refresh')
  const csrf = cookies.find((cookie) => cookie.name === 'crm_csrf')
  expect(refresh).toBeTruthy()
  expect(csrf).toBeTruthy()

  const invalidCsrf = await page.request.post('/api/v1/auth/logout', {
    headers: {
      origin,
      'x-csrf-token': 'invalid-csrf-token',
    },
  })
  expect(invalidCsrf.status()).toBe(403)
  expect((await page.request.get('/api/v1/me')).status()).toBe(200)

  const response = await page.request.post('/api/v1/auth/logout', {
    headers: {
      origin,
      'x-csrf-token': csrf!.value,
    },
  })
  expect(response.status()).toBe(204)
  expect(response.headers()['cache-control']).toBe('private, no-store')
  expect((await page.request.get('/api/v1/me')).status()).toBe(401)

  const staleRefresh = await request.post('/api/v1/auth/refresh', {
    headers: {
      cookie: `crm_refresh=${refresh!.value}; crm_csrf=${csrf!.value}`,
      origin: 'http://127.0.0.1:3000',
      'x-csrf-token': csrf!.value,
    },
  })
  expect(staleRefresh.status()).toBe(401)
  expect(
    (await context.cookies()).some((cookie) =>
      ['crm_access', 'crm_refresh', 'crm_csrf'].includes(cookie.name),
    ),
  ).toBe(false)

  await page.goto('/en/dashboard')
  await expect(page).toHaveURL(/\/en\/login$/)
})

test('logout button redirects after revoking the browser session', async ({
  page,
  context,
}) => {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/en\/login$/)
  expect((await page.request.get('/api/v1/me')).status()).toBe(401)
  expect(
    (await context.cookies()).some((cookie) =>
      ['crm_access', 'crm_refresh', 'crm_csrf'].includes(cookie.name),
    ),
  ).toBe(false)
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
