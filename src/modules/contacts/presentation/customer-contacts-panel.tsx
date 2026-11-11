'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type PanelContact = {
  id: number
  displayName?: string
  jobTitle?: string | null
  active?: boolean
}

/**
 * Compact in-scope contact list for the customer detail screen. It reuses the
 * authorized `/contacts?customerId=` list rather than a second contact API.
 */
export function CustomerContactsPanel({
  customerId,
  marketCode,
  locale,
}: Readonly<{ customerId: number; marketCode: string; locale: 'en' | 'vi' }>) {
  const vi = locale === 'vi'
  const [items, setItems] = useState<PanelContact[] | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!marketCode) return
    let active = true
    const params = new URLSearchParams({
      market: marketCode,
      customerId: String(customerId),
      limit: '10',
    })
    void fetch(`/api/v1/contacts?${params}`, { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 403) {
          if (active) setDenied(true)
          return null
        }
        if (!response.ok) return null
        const body = await response.json()
        return body.data.items as PanelContact[]
      })
      .then((result) => {
        if (active && result) setItems(result)
      })
      .catch(() => {
        if (active) setItems([])
      })
    return () => {
      active = false
    }
  }, [customerId, marketCode])

  if (denied) return null

  return (
    <section
      aria-labelledby="customer-contacts-title"
      className="bg-card space-y-3 rounded-xl border p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold" id="customer-contacts-title">
          {vi ? 'Liên hệ của buyer' : 'Buyer contacts'}
        </h2>
        <Link
          className="text-primary text-sm hover:underline"
          href={`/${locale}/contacts?market=${encodeURIComponent(marketCode)}&customerId=${customerId}`}
        >
          {vi ? 'Mở trang liên hệ' : 'Open contacts'}
        </Link>
      </div>
      {items === null ? (
        <p className="text-muted-foreground text-sm" role="status">
          {vi ? 'Đang tải…' : 'Loading…'}
        </p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {vi ? 'Chưa có liên hệ.' : 'No contacts yet.'}
        </p>
      ) : (
        <ul className="divide-y">
          {items.map((contact) => (
            <li className="py-2 text-sm" key={contact.id}>
              <Link
                className="text-primary hover:underline"
                href={`/${locale}/contacts/${contact.id}?market=${encodeURIComponent(marketCode)}`}
              >
                {contact.displayName}
              </Link>
              {contact.jobTitle ? (
                <span className="text-muted-foreground ml-2">
                  {contact.jobTitle}
                </span>
              ) : null}
              {contact.active === false && (
                <span className="text-muted-foreground ml-2 text-xs">
                  · {vi ? 'đã vô hiệu hóa' : 'inactive'}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
