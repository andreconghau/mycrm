import { expect, test } from '@playwright/test'

test('anonymous specification APIs fail closed', async ({ page }) => {
  const list = await page.request.get('/api/v1/specifications?market=KR')
  const byProduct = await page.request.get(
    '/api/v1/products/1/specifications?market=KR',
  )

  expect(list.status()).toBe(401)
  expect(byProduct.status()).toBe(401)

  await page.goto('/en/products/specifications')
  await expect(page).toHaveURL(/\/en\/login$/)
})

test('admin authenticated specification read returns scoped data', async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD
  const market = process.env.E2E_MARKET_CODE
  if (!email || !password || !market)
    throw new Error('Browser admin market fixture is missing')

  await page.goto('/en/login')
  await page.getByLabel('Work email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/en\/dashboard$/)

  const response = await page.request.get(
    `/api/v1/specifications?market=${encodeURIComponent(market)}`,
  )
  expect(response.status()).toBe(200)
  expect((await response.json()).data.items).toBeInstanceOf(Array)
})
