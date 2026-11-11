import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContactCreateDrawer } from './contact-create-drawer'

const router = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => router }))

const buyerResponse = {
  data: {
    items: [{ id: 12, code: 'BUY-012', legalName: 'Pacific Buyer Co.' }],
  },
}

async function selectBuyer() {
  fireEvent.click(await screen.findByRole('option', { name: /Pacific Buyer/ }))
}

describe('ContactCreateDrawer', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    router.push.mockReset()
  })

  it('creates a contact under a selected buyer and opens its detail page', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(buyerResponse))
      .mockResolvedValueOnce(Response.json({ data: [] }))
      .mockResolvedValueOnce(
        Response.json({ data: { id: 91 } }, { status: 201 }),
      )
    vi.stubGlobal('fetch', fetch)

    render(
      <ContactCreateDrawer
        locale="en"
        marketCode="KR"
        onClose={vi.fn()}
        open
      />,
    )
    await selectBuyer()
    fireEvent.change(screen.getByLabelText(/Contact name/), {
      target: { value: 'Min Park' },
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'min@example.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }))

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/en/contacts/91?market=KR'),
    )
    const createCall = fetch.mock.calls.find(([url]) =>
      String(url).startsWith('/api/v1/contacts?'),
    )
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      customerId: 12,
      displayName: 'Min Park',
      channels: [
        { kind: 'email', handle: 'min@example.test', isPrimary: true },
      ],
    })
  })

  it('requires confirmation before discarding entered values', async () => {
    const onClose = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json(buyerResponse)),
    )
    render(
      <ContactCreateDrawer
        locale="en"
        marketCode="KR"
        onClose={onClose}
        open
      />,
    )
    fireEvent.change(screen.getByLabelText(/Contact name/), {
      target: { value: 'Draft contact' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Close contact form' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('reviews duplicate channels before creating a separate contact', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(buyerResponse))
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              id: 7,
              displayName: 'Existing Contact',
              customerLegalName: 'Pacific Buyer Co.',
              matchedKind: 'email',
              sameCustomer: true,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ data: { id: 92 } }, { status: 201 }),
      )
    vi.stubGlobal('fetch', fetch)
    render(
      <ContactCreateDrawer
        locale="en"
        marketCode="KR"
        onClose={vi.fn()}
        open
      />,
    )
    await selectBuyer()
    fireEvent.change(screen.getByLabelText(/Contact name/), {
      target: { value: 'Another Contact' },
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'shared@example.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }))

    expect(
      await screen.findByText('Matching contact channel found'),
    ).toBeInTheDocument()
    expect(screen.getByText('Existing Contact')).toBeInTheDocument()
    expect(router.push).not.toHaveBeenCalled()

    fireEvent.click(
      screen.getByRole('button', { name: 'Create separate contact' }),
    )
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/en/contacts/92?market=KR'),
    )
  })
})
