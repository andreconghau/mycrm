'use client'

import { createContext, useContext, useSyncExternalStore } from 'react'
import { availableMarkets, profile, resolveMarket } from './market-data'

const storageKey = `r1-market:${profile.id}`
const eventName = 'r1-market-changed'
let sessionSelection: string | null = null
function subscribe(notify: () => void) {
  window.addEventListener('storage', notify)
  window.addEventListener(eventName, notify)
  return () => {
    window.removeEventListener('storage', notify)
    window.removeEventListener(eventName, notify)
  }
}
function snapshot() {
  let preferred = sessionSelection ?? profile.last_market_id
  try {
    preferred = localStorage.getItem(storageKey) ?? preferred
  } catch {
    /* Storage is optional. */
  }
  return resolveMarket(profile.id, preferred) ?? ''
}
const serverSnapshot = () => null
const MarketContext = createContext<{
  marketId: string | null
  markets: ReturnType<typeof availableMarkets>
  selectMarket: (id: string) => void
} | null>(null)

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const selected = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  function selectMarket(id: string) {
    if (!availableMarkets(profile.id).some((m) => m.id === id)) return
    sessionSelection = id
    try {
      localStorage.setItem(storageKey, id)
    } catch {
      /* Keep the in-session selection. */
    }
    window.dispatchEvent(new Event(eventName))
  }
  return (
    <MarketContext.Provider
      value={{
        marketId: selected || null,
        markets: availableMarkets(profile.id),
        selectMarket,
      }}
    >
      {selected !== null ? (
        children
      ) : (
        <p role="status" className="p-6">
          Loading / Đang tải…
        </p>
      )}
    </MarketContext.Provider>
  )
}

export function useMarket() {
  const context = useContext(MarketContext)
  if (!context) throw new Error('MarketProvider is required')
  return context
}
