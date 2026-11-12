import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/en/login')
  await page.getByLabel('Work email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/en\/dashboard$/)
}

test('anonymous Price List endpoints fail closed', async ({ page }) => {
  expect((await page.request.get('/api/v1/price-lists?market=KR')).status()).toBe(401)
  expect((await page.request.get('/api/v1/price-lists/applicable?market=KR&productId=1&quantity=1&unit=KG&currency=USD')).status()).toBe(401)
  expect((await page.request.get('/api/v1/price-selections?market=KR')).status()).toBe(401)
  await page.goto('/en/price-lists')
  await expect(page).toHaveURL(/\/en\/login$/)
})

test('admin creates and approves synthetic Price List, enforces CSRF and records manual reason', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD
  const market = process.env.E2E_MARKET_CODE
  if (!email || !password || !market) throw new Error('Browser admin market fixture is missing')
  await signIn(page, email, password)
  const productsResponse = await page.request.get('/api/v1/products?status=ACTIVE')
  expect(productsResponse.status()).toBe(200)
  const product = (await productsResponse.json()).data.items[0]
  if (!product) throw new Error('An active product is required for Price List e2e')

  const missingCsrf = await page.request.post(`/api/v1/price-lists?market=${encodeURIComponent(market)}`, {
    data: { code: `NO-CSRF-${randomUUID()}`, tier: 'GENERAL', currency: 'USD', validFrom: '2026-01-01T00:00:00.000Z', validTo: null },
  })
  expect(missingCsrf.status()).toBe(403)

  await page.goto('/en/price-lists')
  await page.getByRole('button', { name: 'New Price List' }).click()
  const drawer = page.getByRole('dialog')
  const code = `E2E-${randomUUID().slice(0, 8)}`
  await drawer.getByLabel('Price List code').fill(code)
  await drawer.getByLabel('Valid from').fill('2026-01-01T00:00')
  await drawer.getByRole('button', { name: 'Save Price List' }).click()
  await expect(page.getByRole('heading', { name: code })).toBeVisible()

  const detail = page.getByRole('dialog')
  const selectors = detail.locator('select')
  await selectors.first().selectOption({ index: 1 })
  await detail.locator('[name="unitPrice"]').fill('123.45')
  await detail.locator('[name="validFrom"]').fill('2026-01-01T00:00')
  await detail.getByRole('button', { name: 'Add price item' }).click()
  await expect(detail.getByText(product.sku, { exact: false })).toBeVisible()
  await detail.getByRole('button', { name: 'Approve' }).click()
  await expect(detail.getByText('ACTIVE')).toBeVisible()

  const csrf = await page.evaluate(() => {
    const entry = document.cookie.split('; ').find((value) => value.startsWith('crm_csrf=') || value.startsWith('__Host-crm_csrf='))
    return entry ? decodeURIComponent(entry.slice(entry.indexOf('=') + 1)) : ''
  })
  const manual = {
    productId: product.id, selectedAmount: '88.00', currency: 'USD', unit: 'KG',
    priceBasis: 'NET', quantity: '2',
  }
  const withoutReason = await page.request.post(`/api/v1/price-selections?market=${encodeURIComponent(market)}`, {
    headers: { 'X-CSRF-Token': csrf }, data: manual,
  })
  expect([400, 422]).toContain(withoutReason.status())
  const withReason = await page.request.post(`/api/v1/price-selections?market=${encodeURIComponent(market)}`, {
    headers: { 'X-CSRF-Token': csrf }, data: { ...manual, reason: 'Customer requested negotiated terms' },
  })
  expect(withReason.status()).toBe(201)
  expect((await withReason.json()).data.contextType).toBe('AD_HOC')
})

test('sale may read Price Lists but cannot mutate them', async ({ page }) => {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD
  const market = process.env.E2E_MARKET_CODE
  if (!email || !password || !market) throw new Error('Browser sale market fixture is missing')
  await signIn(page, email, password)
  await page.goto('/en/price-lists')
  await expect(page.getByRole('heading', { name: 'Price Lists' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'New Price List' })).toHaveCount(0)
  expect((await page.request.get(`/api/v1/price-lists?market=${encodeURIComponent(market)}`)).status()).toBe(200)
  const response = await page.request.post(`/api/v1/price-lists?market=${encodeURIComponent(market)}`, {
    data: { code: `SALE-${randomUUID()}`, tier: 'GENERAL', currency: 'USD', validFrom: '2026-01-01T00:00:00.000Z', validTo: null },
  })
  expect(response.status()).toBe(403)
  await page.route('**/api/v1/price-lists?*', (route) => route.fulfill({
    status: 403,
    contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'ACTION_FORBIDDEN', message: 'Action forbidden' } }),
  }))
  await page.goto('/en/price-lists')
  await expect(page.locator('main [role="alert"]')).toContainText('You do not have permission to view Price Lists in this market.')
  await expect(page.getByRole('button', { name: 'New Price List' })).toHaveCount(0)
  await expect(page.getByLabel('Search Price Lists')).toHaveCount(0)
})
