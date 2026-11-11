'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useMarket } from '@/modules/markets/market-context'
import { csrfToken } from './contact-workspace'

type Contact = {
  id: number
  customerId?: number
  customerLegalName?: string
  displayName?: string
  jobTitle?: string | null
  department?: string | null
  preferredLanguage?: string | null
  timezone?: string | null
  active?: boolean
  version?: number
  primaryContexts?: string[]
  historical?: boolean
  transferredAt?: string
}

type Channel = {
  id: number
  kind: string
  handle: string
  isPrimary: boolean
  verifiedAt?: string | null
  version: number
}

type Preference = {
  id: number
  purpose: string
  allowed: boolean
  evidenceFileId?: number | null
  recordedAt: string
  version: number
}

type TimelineEvent = {
  id: number
  actorId?: number | null
  action: string
  resourceVersion?: number | null
  reason?: string | null
  result: string
  occurredAt: string
}

const primaryContexts = ['procurement', 'invoicing', 'consignee'] as const
const preferencePurposes = ['commercial', 'operational', 'marketing'] as const

export function ContactDetail({
  id,
  locale,
  roles,
}: Readonly<{ id: number; locale: 'en' | 'vi'; roles: string[] }>) {
  const vi = locale === 'vi'
  const search = useSearchParams()
  const { marketId, markets } = useMarket()
  const marketCode =
    search.get('market') ??
    markets.find((item) => item.id === marketId)?.code ??
    ''
  const [contact, setContact] = useState<Contact | null>(null)
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [channelsDenied, setChannelsDenied] = useState(false)
  const [preferences, setPreferences] = useState<Preference[] | null>(null)
  const [preferencesDenied, setPreferencesDenied] = useState(false)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const canEdit =
    roles.includes('sale') || roles.includes('manager') || roles.includes('admin')
  const readOnly = contact?.historical === true || contact?.active === false

  const marketQuery = `market=${encodeURIComponent(marketCode)}`

  const loadContact = useCallback(async () => {
    if (!marketCode) return null
    const response = await fetch(`/api/v1/contacts/${id}?${marketQuery}`, {
      cache: 'no-store',
    })
    if (!response.ok)
      throw new Error(response.status === 404 ? 'NOT_FOUND' : 'LOAD_FAILED')
    const body = await response.json()
    return body.data as Contact
  }, [id, marketCode, marketQuery])

  const loadChildren = useCallback(async () => {
    if (!marketCode) return
    const [channelResponse, preferenceResponse, timelineResponse] =
      await Promise.all([
        fetch(`/api/v1/contacts/${id}/channels?${marketQuery}`, {
          cache: 'no-store',
        }),
        fetch(`/api/v1/contacts/${id}/preferences?${marketQuery}`, {
          cache: 'no-store',
        }),
        fetch(`/api/v1/contacts/${id}/timeline?${marketQuery}`, {
          cache: 'no-store',
        }),
      ])
    if (channelResponse.status === 403) setChannelsDenied(true)
    else if (channelResponse.ok)
      setChannels((await channelResponse.json()).data as Channel[])
    if (preferenceResponse.status === 403) setPreferencesDenied(true)
    else if (preferenceResponse.ok)
      setPreferences((await preferenceResponse.json()).data as Preference[])
    if (timelineResponse.ok)
      setTimeline((await timelineResponse.json()).data.items as TimelineEvent[])
  }, [id, marketCode, marketQuery])

  useEffect(() => {
    let active = true
    void loadContact()
      .then(async (value) => {
        if (!active || !value) return
        setContact(value)
        if (!value.historical) await loadChildren()
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(
          reason instanceof Error && reason.message === 'NOT_FOUND'
            ? vi
              ? 'Không tìm thấy liên hệ trong phạm vi truy cập.'
              : 'Contact not found in your authorized scope.'
            : vi
              ? 'Không thể tải liên hệ.'
              : 'Contact could not be loaded.',
        )
      })
    return () => {
      active = false
    }
  }, [loadContact, loadChildren, vi])

  async function send(
    path: string,
    body: Record<string, unknown>,
    successMessage: string,
    method: 'POST' | 'PATCH' = 'POST',
  ) {
    if (!contact?.version) return false
    setPending(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/v1/contacts/${id}${path}?${marketQuery}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken(),
        },
        body: JSON.stringify({ version: contact.version, ...body }),
      })
      if (!response.ok) {
        setError(
          response.status === 409
            ? vi
              ? 'Bản ghi đã thay đổi. Tải lại trước khi lưu.'
              : 'This record changed. Reload before saving.'
            : response.status === 422
              ? vi
                ? 'Dữ liệu không đạt điều kiện nghiệp vụ (ví dụ: tệp bằng chứng chưa hợp lệ).'
                : 'A business prerequisite failed (for example the evidence file is not usable).'
              : response.status === 404
                ? vi
                  ? 'Không tìm thấy bản ghi trong phạm vi truy cập.'
                  : 'Record not found in your authorized scope.'
                : vi
                  ? 'Không thể lưu thay đổi.'
                  : 'Changes could not be saved.',
        )
        return false
      }
      setNotice(successMessage)
      const refreshed = await loadContact()
      if (refreshed) {
        setContact(refreshed)
        if (!refreshed.historical) await loadChildren()
      }
      return true
    } catch {
      setError(vi ? 'Lỗi kết nối.' : 'Connection error.')
      return false
    } finally {
      setPending(false)
    }
  }

  if (error && !contact) {
    return (
      <section className="space-y-4">
        <Link
          className="text-primary text-sm hover:underline"
          href={`/${locale}/contacts?${marketQuery}`}
        >
          ← {vi ? 'Liên hệ' : 'Contacts'}
        </Link>
        <p className="text-destructive" role="alert">
          {error}
        </p>
      </section>
    )
  }
  if (!contact)
    return (
      <p className="text-muted-foreground p-6" role="status">
        {vi ? 'Đang tải…' : 'Loading…'}
      </p>
    )

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <Link
        className="text-primary text-sm hover:underline"
        href={`/${locale}/contacts?${marketQuery}`}
      >
        ← {vi ? 'Liên hệ' : 'Contacts'}
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs">
            {contact.customerLegalName ??
              `${vi ? 'Khách hàng' : 'Customer'} #${contact.customerId ?? '—'}`}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {contact.displayName}
          </h1>
          {contact.historical && (
            <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              {vi
                ? 'Bản lịch sử chỉ đọc tại thời điểm bàn giao khách hàng.'
                : 'Read-only history snapshot at customer handover time.'}
            </p>
          )}
        </div>
        <span className="rounded-full border px-3 py-1 text-sm">
          {contact.active === false
            ? vi
              ? 'Đã vô hiệu hóa'
              : 'INACTIVE'
            : vi
              ? 'Đang hoạt động'
              : 'ACTIVE'}
        </span>
      </header>

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-emerald-700" role="status">
          {notice}
        </p>
      )}

      {canEdit && !readOnly ? (
        <form
          className="bg-card grid gap-4 rounded-xl border p-5 shadow-sm sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            void send(
              '',
              {
                displayName: form.get('displayName'),
                jobTitle: form.get('jobTitle') || null,
                department: form.get('department') || null,
                preferredLanguage: form.get('preferredLanguage') || null,
                timezone: form.get('timezone') || null,
              },
              vi ? 'Đã lưu thay đổi.' : 'Changes saved.',
              'PATCH',
            )
          }}
        >
          <h2 className="font-semibold sm:col-span-2">
            {vi ? 'Thông tin liên hệ' : 'Contact details'}
          </h2>
          <DetailField
            label={vi ? 'Tên liên hệ' : 'Contact name'}
            name="displayName"
            defaultValue={contact.displayName ?? ''}
            required
          />
          <DetailField
            label={vi ? 'Chức danh' : 'Job title'}
            name="jobTitle"
            defaultValue={contact.jobTitle ?? ''}
          />
          <DetailField
            label={vi ? 'Bộ phận' : 'Department'}
            name="department"
            defaultValue={contact.department ?? ''}
          />
          <DetailField
            label={vi ? 'Ngôn ngữ ưu tiên' : 'Preferred language'}
            name="preferredLanguage"
            defaultValue={contact.preferredLanguage ?? ''}
          />
          <DetailField
            label={vi ? 'Múi giờ (IANA)' : 'Timezone (IANA)'}
            name="timezone"
            defaultValue={contact.timezone ?? ''}
          />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              className="bg-primary text-primary-foreground min-h-10 rounded-md px-4 text-sm font-medium disabled:opacity-60"
              disabled={pending}
            >
              {vi ? 'Lưu thay đổi' : 'Save changes'}
            </button>
            <button
              className="min-h-10 rounded-md border px-4 text-sm disabled:opacity-60"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                const reason = window.prompt(
                  vi ? 'Lý do vô hiệu hóa' : 'Deactivation reason',
                )
                if (!reason?.trim()) return
                void send(
                  '/deactivate',
                  { reason },
                  vi ? 'Đã vô hiệu hóa liên hệ.' : 'Contact deactivated.',
                )
              }}
              type="button"
            >
              {vi ? 'Vô hiệu hóa' : 'Deactivate'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-card grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
          <DetailValue
            label={vi ? 'Chức danh' : 'Job title'}
            value={contact.jobTitle}
          />
          <DetailValue
            label={vi ? 'Bộ phận' : 'Department'}
            value={contact.department}
          />
          <DetailValue
            label={vi ? 'Ngôn ngữ ưu tiên' : 'Preferred language'}
            value={contact.preferredLanguage}
          />
          <DetailValue
            label={vi ? 'Múi giờ' : 'Timezone'}
            value={contact.timezone}
          />
        </div>
      )}

      <section
        aria-labelledby="primary-title"
        className="bg-card space-y-3 rounded-xl border p-5"
      >
        <h2 className="font-semibold" id="primary-title">
          {vi ? 'Liên hệ chính theo ngữ cảnh' : 'Primary contact per context'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {vi
            ? 'Mỗi ngữ cảnh độc lập. Đổi liên hệ chính không xóa thư từ hay đơn hàng trước đó.'
            : 'Contexts are independent. Changing a primary never removes prior correspondence or past orders.'}
        </p>
        <ul className="flex flex-wrap gap-2">
          {primaryContexts.map((context) => {
            const assigned = contact.primaryContexts?.includes(context)
            return (
              <li key={context}>
                <button
                  className={`min-h-10 rounded-md border px-3 text-sm disabled:opacity-60 ${assigned ? 'border-emerald-600 text-emerald-700' : ''}`}
                  disabled={pending || !canEdit || readOnly || assigned}
                  onClick={() =>
                    void send(
                      '/set-primary',
                      { context },
                      vi
                        ? 'Đã ghi nhận liên hệ chính.'
                        : 'Primary designation recorded.',
                    )
                  }
                  type="button"
                >
                  {context}
                  {assigned ? ` · ${vi ? 'đang là chính' : 'primary'}` : ''}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section
        aria-labelledby="channels-title"
        className="bg-card space-y-3 rounded-xl border p-5"
      >
        <h2 className="font-semibold" id="channels-title">
          {vi ? 'Kênh liên hệ' : 'Contact channels'}
        </h2>
        {channelsDenied ? (
          <p className="text-muted-foreground text-sm">
            {vi
              ? 'Bạn không được cấp quyền đọc chi tiết kênh liên hệ.'
              : 'You are not granted access to channel details.'}
          </p>
        ) : channels === null ? (
          <p className="text-muted-foreground text-sm" role="status">
            {vi ? 'Đang tải…' : 'Loading…'}
          </p>
        ) : channels.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {vi ? 'Chưa ghi nhận kênh nào.' : 'No channel has been recorded.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {channels.map((channel) => (
              <li className="rounded-md border p-3 text-sm" key={channel.id}>
                <span className="text-muted-foreground">{channel.kind} · </span>
                {channel.handle}
                {channel.isPrimary && (
                  <span className="ml-2 rounded-full border px-2 text-xs">
                    {vi ? 'Chính' : 'Primary'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && !readOnly && !channelsDenied && (
          <form
            className="grid gap-3 sm:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()
              const formElement = event.currentTarget
              const form = new FormData(formElement)
              void send(
                '/channels',
                {
                  kind: form.get('kind'),
                  handle: form.get('handle'),
                  isPrimary: Boolean(form.get('isPrimary')),
                },
                vi ? 'Đã ghi nhận kênh liên hệ.' : 'Channel recorded.',
              ).then((ok) => {
                if (ok) formElement.reset()
              })
            }}
          >
            <label className="space-y-1 text-sm">
              <span className="font-medium">{vi ? 'Loại' : 'Kind'}</span>
              <select
                className="bg-background min-h-10 w-full rounded-md border px-3"
                name="kind"
              >
                {['email', 'phone', 'whatsapp', 'kakao', 'line', 'other'].map(
                  (kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ),
                )}
              </select>
            </label>
            <DetailField
              label={vi ? 'Giá trị' : 'Handle'}
              name="handle"
              required
            />
            <label className="flex items-end gap-2 text-sm">
              <input name="isPrimary" type="checkbox" />
              <span>{vi ? 'Là kênh chính' : 'Primary for this kind'}</span>
            </label>
            <div className="flex items-end">
              <button
                className="min-h-10 rounded-md border px-4 text-sm disabled:opacity-60"
                disabled={pending}
              >
                {vi ? 'Thêm kênh' : 'Add channel'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section
        aria-labelledby="preferences-title"
        className="bg-card space-y-3 rounded-xl border p-5"
      >
        <h2 className="font-semibold" id="preferences-title">
          {vi ? 'Đồng ý liên lạc' : 'Communication consent'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {vi
            ? 'Đồng ý phải được ghi nhận rõ ràng; hệ thống không suy diễn từ việc thiếu dữ liệu.'
            : 'Consent must be recorded explicitly; absence is never read as permission.'}
        </p>
        {preferencesDenied ? (
          <p className="text-muted-foreground text-sm">
            {vi
              ? 'Bạn không được cấp quyền đọc tùy chọn liên lạc.'
              : 'You are not granted access to communication preferences.'}
          </p>
        ) : preferences === null ? (
          <p className="text-muted-foreground text-sm" role="status">
            {vi ? 'Đang tải…' : 'Loading…'}
          </p>
        ) : preferences.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {vi
              ? 'Chưa ghi nhận tùy chọn nào (mặc định là không được liên lạc).'
              : 'No preference recorded (default is do-not-contact).'}
          </p>
        ) : (
          <ul className="space-y-2">
            {preferences.map((preference) => (
              <li className="rounded-md border p-3 text-sm" key={preference.id}>
                <span className="text-muted-foreground">
                  {preference.purpose} ·{' '}
                </span>
                {preference.allowed
                  ? vi
                    ? 'Được phép'
                    : 'Allowed'
                  : vi
                    ? 'Không được liên lạc'
                    : 'Do not contact'}
                <time
                  className="text-muted-foreground ml-2"
                  dateTime={preference.recordedAt}
                >
                  {new Date(preference.recordedAt).toLocaleString(locale)}
                </time>
              </li>
            ))}
          </ul>
        )}
        {canEdit && !readOnly && !preferencesDenied && (
          <form
            className="grid gap-3 sm:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()
              const formElement = event.currentTarget
              const form = new FormData(formElement)
              const evidence = String(form.get('evidenceFileId') ?? '').trim()
              void send(
                '/preferences',
                {
                  purpose: form.get('purpose'),
                  allowed: form.get('allowed') === 'true',
                  recordedAt: new Date().toISOString(),
                  ...(evidence ? { evidenceFileId: Number(evidence) } : {}),
                },
                vi ? 'Đã ghi nhận tùy chọn.' : 'Preference recorded.',
              ).then((ok) => {
                if (ok) formElement.reset()
              })
            }}
          >
            <label className="space-y-1 text-sm">
              <span className="font-medium">{vi ? 'Mục đích' : 'Purpose'}</span>
              <select
                className="bg-background min-h-10 w-full rounded-md border px-3"
                name="purpose"
              >
                {preferencePurposes.map((purpose) => (
                  <option key={purpose} value={purpose}>
                    {purpose}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">
                {vi ? 'Quyết định' : 'Decision'}
              </span>
              <select
                className="bg-background min-h-10 w-full rounded-md border px-3"
                name="allowed"
              >
                <option value="false">
                  {vi ? 'Không được liên lạc' : 'Do not contact'}
                </option>
                <option value="true">{vi ? 'Được phép' : 'Allowed'}</option>
              </select>
            </label>
            <DetailField
              label={vi ? 'ID tệp bằng chứng' : 'Evidence file ID'}
              name="evidenceFileId"
              type="number"
            />
            <div className="flex items-end">
              <button
                className="min-h-10 rounded-md border px-4 text-sm disabled:opacity-60"
                disabled={pending}
              >
                {vi ? 'Ghi nhận' : 'Record'}
              </button>
            </div>
          </form>
        )}
      </section>

      {canEdit && !readOnly && (
        <form
          className="bg-card space-y-3 rounded-xl border p-5"
          onSubmit={(event) => {
            event.preventDefault()
            const formElement = event.currentTarget
            const form = new FormData(formElement)
            void send(
              '/transfer',
              {
                targetCustomerId: Number(form.get('targetCustomerId')),
                reason: form.get('reason'),
              },
              vi ? 'Đã chuyển liên hệ sang buyer khác.' : 'Contact transferred.',
            ).then((ok) => {
              if (ok) formElement.reset()
            })
          }}
        >
          <h2 className="font-semibold">
            {vi ? 'Chuyển sang buyer khác' : 'Transfer to another buyer'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {vi
              ? 'Chỉ chuyển được tới buyer bạn có quyền. Lý do được ghi vào audit; chỉ định liên hệ chính ở buyer cũ sẽ được bỏ.'
              : 'Only a buyer you may access is accepted. The reason is audited; primary designations at the former buyer are released.'}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField
              label={vi ? 'ID buyer đích' : 'Destination customer ID'}
              name="targetCustomerId"
              type="number"
              required
            />
            <DetailField
              label={vi ? 'Lý do chuyển' : 'Transfer reason'}
              name="reason"
              required
              minLength={3}
            />
          </div>
          <button
            className="min-h-10 rounded-md border px-4 text-sm disabled:opacity-60"
            disabled={pending}
          >
            {vi ? 'Chuyển liên hệ' : 'Transfer contact'}
          </button>
        </form>
      )}

      {timeline.length > 0 && (
        <section
          aria-labelledby="timeline-title"
          className="bg-card space-y-3 rounded-xl border p-5"
        >
          <h2 className="font-semibold" id="timeline-title">
            {vi ? 'Dòng thời gian được ghi nhận' : 'Audited timeline'}
          </h2>
          <ol className="space-y-2">
            {timeline.map((event) => (
              <li className="rounded-md border p-3 text-sm" key={event.id}>
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{event.action}</strong>
                  <time
                    className="text-muted-foreground"
                    dateTime={event.occurredAt}
                  >
                    {new Date(event.occurredAt).toLocaleString(locale)}
                  </time>
                </div>
                <p className="text-muted-foreground mt-1">
                  {vi ? 'Người thực hiện' : 'Actor'}: {event.actorId ?? '—'} ·{' '}
                  {event.result}
                  {event.reason ? ` · ${event.reason}` : ''}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  )
}

function DetailField({
  label,
  name,
  defaultValue,
  type = 'text',
  required,
  maxLength,
  minLength,
}: Readonly<{
  label: string
  name: string
  defaultValue?: string
  type?: string
  required?: boolean
  maxLength?: number
  minLength?: number
}>) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        className="bg-background min-h-10 w-full rounded-md border px-3"
        defaultValue={defaultValue}
        maxLength={maxLength}
        minLength={minLength}
        name={name}
        required={required}
        type={type}
      />
    </label>
  )
}

function DetailValue({
  label,
  value,
}: Readonly<{ label: string; value?: string | null }>) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-sm">{value || '—'}</p>
    </div>
  )
}
