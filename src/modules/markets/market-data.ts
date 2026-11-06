import markets from '@/constants/dummy/markets.json'
import memberships from '@/constants/dummy/market-memberships.json'
import profile from '@/constants/dummy/profile.json'

export { markets, profile }
export function availableMarkets(userId: string) {
  return markets.filter(
    (m) =>
      m.status === 'active' &&
      memberships.some(
        (g) =>
          g.user_id === userId && g.market_id === m.id && g.status === 'active',
      ),
  )
}
export function resolveMarket(userId: string, preferred: string | null) {
  const allowed = availableMarkets(userId)
  return allowed.find((m) => m.id === preferred)?.id ?? allowed[0]?.id ?? null
}
