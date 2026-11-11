import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CustomerCreateDrawer } from './customer-create-drawer'

const router = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}))

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/Customer code/), {
    target: { value: 'CUS-001' },
  })
  fireEvent.change(screen.getByLabelText(/Legal name/), {
    target: { value: 'Pacific Buyer Co.' },
  })
  fireEvent.change(screen.getByLabelText(/Buyer country/), {
    target: { value: 'KR' },
  })
}

describe('CustomerCreateDrawer', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    router.push.mockReset()
  })

  it('creates a customer and opens its detail page', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { id: 42 } }, { status: 201 }))
    vi.stubGlobal('fetch', fetch)

    render(
      <CustomerCreateDrawer
        locale="en"
        marketCode="KR"
        onClose={vi.fn()}
        open
      />,
    )
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: 'Save customer' }))

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/en/customers/42?market=KR'),
    )
    expect(fetch).toHaveBeenCalledOnce()
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toMatchObject({
      code: 'CUS-001',
      legalName: 'Pacific Buyer Co.',
      countryCode: 'KR',
      status: 'PROSPECT',
    })
  })

  it('requires confirmation before discarding entered values', () => {
    const onClose = vi.fn()
    render(
      <CustomerCreateDrawer
        locale="en"
        marketCode="KR"
        onClose={onClose}
        open
      />,
    )
    fireEvent.change(screen.getByLabelText(/Customer code/), {
      target: { value: 'DRAFT' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Close customer form' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('reviews duplicate identifiers before creating a separate customer', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              id: 7,
              code: 'CUS-007',
              legalName: 'Existing Buyer',
              countryCode: 'KR',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ data: { id: 43 } }, { status: 201 }),
      )
    vi.stubGlobal('fetch', fetch)

    render(
      <CustomerCreateDrawer
        locale="en"
        marketCode="KR"
        onClose={vi.fn()}
        open
      />,
    )
    fillRequiredFields()
    fireEvent.change(screen.getByLabelText('Identifier type'), {
      target: { value: 'tax' },
    })
    fireEvent.change(screen.getByLabelText('Registration / tax identifier'), {
      target: { value: 'TAX-123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save customer' }))

    expect(
      await screen.findByText('Matching buyer identifier found'),
    ).toBeInTheDocument()
    expect(screen.getByText('Existing Buyer')).toBeInTheDocument()
    expect(router.push).not.toHaveBeenCalled()

    fireEvent.click(
      screen.getByRole('button', { name: 'Create separate customer' }),
    )
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/en/customers/43?market=KR'),
    )
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
