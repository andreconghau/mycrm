'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'

type Revision = {
  id: number
  revisionNo: number
  status: string
  version: number
  nameEn: string | null
  nameVi: string | null
  nameKo: string | null
  descriptionEn: string | null
  descriptionVi: string | null
  descriptionKo: string | null
  grade: string | null
  processing: string | null
  netWeightPerPack: string | null
  weightUnit: string | null
  packsPerCarton: number | null
  uom: string | null
  packaging: string | null
  sizeBand: string | null
  sizeUnit: string | null
  treatment: string | null
  frozenForm: string | null
  grossWeightPerPack: string | null
  cartonNetWeight: string | null
  glazingPercent: string | null
  packagingMaterial: string | null
  moq: string | null
  moqUnit: string | null
  storageTempC: string | null
  shelfLifeMonths: number | null
  originCountry: string | null
  certifications: string[] | null
  labelLanguages: string[] | null
  buyerRequirements: string | null
  notes: string | null
}

export function SpecificationDetail({
  id,
  marketCode,
  locale,
  canManage,
  onClose,
}: Readonly<{
  id: number
  marketCode: string
  locale: 'en' | 'vi'
  canManage: boolean
  onClose: () => void
}>) {
  const vi = locale === 'vi'
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [compare, setCompare] = useState<Record<string, unknown> | null>(null)
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Revision | null>(null)
  const [dirty, setDirty] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const detailPanel = useRef<HTMLElement>(null)
  const requestClose = useCallback(() => {
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }, [dirty, onClose])

  const load = useCallback(async () => {
    const response = await fetch(
      `/api/v1/specifications/${id}/revisions?market=${encodeURIComponent(marketCode)}`,
      { cache: 'no-store' },
    )
    const body = await response.json()
    if (!response.ok)
      throw new Error(body.error?.message ?? 'Could not load revisions')
    const values: Revision[] = Array.isArray(body.data)
      ? body.data
      : (body.data.items ?? body.data.revisions ?? [])
    setRevisions(values)
    setLeft((current) => current || String(values.at(-1)?.revisionNo ?? ''))
    setRight((current) => current || String(values[0]?.revisionNo ?? ''))
  }, [id, marketCode])

  useEffect(() => {
    void Promise.resolve().then(() =>
      load().catch((cause) => setError(cause.message)),
    )
  }, [load])

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const panel = detailPanel.current
    panel?.querySelector<HTMLElement>('button, input, select')?.focus()
    function trap(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
      }
      if (event.key !== 'Tab' || !panel) return
      const controls = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (!controls.length) return
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault()
        controls.at(-1)?.focus()
      } else if (
        !event.shiftKey &&
        document.activeElement === controls.at(-1)
      ) {
        event.preventDefault()
        controls[0].focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => {
      document.removeEventListener('keydown', trap)
      previous?.focus()
    }
  }, [requestClose])

  async function mutate(path: string, body: Record<string, unknown>) {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(
        `${path}?market=${encodeURIComponent(marketCode)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken(),
          },
          body: JSON.stringify(body),
        },
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error?.message ?? 'Request failed')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function compareRevisions() {
    setError('')
    try {
      const response = await fetch(
        `/api/v1/specifications/${id}/compare-revisions?market=${encodeURIComponent(marketCode)}&left=${left}&right=${right}`,
        { cache: 'no-store' },
      )
      const body = await response.json()
      if (!response.ok)
        throw new Error(body.error?.message ?? 'Could not compare revisions')
      setCompare(body.data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed')
    }
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const form = new FormData(event.currentTarget)
    const body = Object.fromEntries(
      [
        'nameEn',
        'nameVi',
        'nameKo',
        'descriptionEn',
        'descriptionVi',
        'descriptionKo',
        'grade',
        'processing',
        'netWeightPerPack',
        'weightUnit',
        'packsPerCarton',
        'uom',
        'packaging',
      ].map((key) => [key, String(form.get(key) ?? '').trim()]),
    ) as Record<string, unknown>
    body.version = editing.version
    body.packsPerCarton = Number(body.packsPerCarton)
    for (const key of [
      'grossWeightPerPack',
      'cartonNetWeight',
      'glazingPercent',
      'moq',
      'storageTempC',
    ]) {
      const value = String(form.get(key) ?? '').trim()
      body[key] = value || null
    }
    for (const key of [
      'sizeBand',
      'sizeUnit',
      'treatment',
      'frozenForm',
      'packagingMaterial',
      'originCountry',
      'moqUnit',
      'buyerRequirements',
      'notes',
    ]) {
      const value = String(form.get(key) ?? '').trim()
      body[key] = value || null
    }
    body.shelfLifeMonths = String(form.get('shelfLifeMonths') ?? '').trim()
      ? Number(form.get('shelfLifeMonths'))
      : null
    body.certifications = String(form.get('certifications') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    body.labelLanguages = String(form.get('labelLanguages') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    setBusy(true)
    setError('')
    try {
      const response = await fetch(
        `/api/v1/specifications/${id}/revisions/${editing.revisionNo}?market=${encodeURIComponent(marketCode)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken(),
          },
          body: JSON.stringify(body),
        },
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error?.message ?? 'Could not update draft')
      setDirty(false)
      setEditing(null)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/40"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <aside
        ref={detailPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="spec-detail-title"
        className="bg-background flex h-full w-full max-w-3xl flex-col shadow-xl"
      >
        <header className="flex items-start justify-between border-b p-5">
          <div>
            <p className="text-primary text-xs font-semibold uppercase">
              R1 · M07
            </p>
            <h2 id="spec-detail-title" className="mt-1 text-xl font-semibold">
              {vi ? 'Chi tiết thông số' : 'Specification details'} · {id}
            </h2>
          </div>
          <button
            type="button"
            className="hover:bg-muted min-h-10 rounded-md px-3"
            onClick={requestClose}
          >
            {vi ? 'Đóng' : 'Close'}
          </button>
        </header>
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {error && (
            <p
              role="alert"
              className="text-destructive rounded-md border p-3 text-sm"
            >
              {error}
            </p>
          )}
          <section>
            <h3 className="mb-3 font-semibold">
              {vi ? 'Lịch sử revision' : 'Revision history'}
            </h3>
            {revisions.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {vi ? 'Chưa có revision.' : 'No revisions found.'}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">{vi ? 'Tên EN' : 'Name (EN)'}</th>
                      <th className="p-3">{vi ? 'Grade' : 'Grade'}</th>
                      <th className="p-3">{vi ? 'Đóng gói' : 'Packaging'}</th>
                      <th className="p-3">{vi ? 'Trạng thái' : 'Status'}</th>
                      <th className="p-3">{vi ? 'Thao tác' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revisions.map((revision) => (
                      <tr className="border-t" key={revision.id}>
                        <td className="p-3">V{revision.revisionNo}</td>
                        <td className="p-3">{revision.nameEn ?? '—'}</td>
                        <td className="p-3">{revision.grade ?? '—'}</td>
                        <td className="p-3">{revision.packaging ?? '—'}</td>
                        <td className="p-3">{revision.status}</td>
                        <td className="p-3">
                          {canManage && revision.status === 'DRAFT' && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                className="text-primary min-h-10 font-medium hover:underline"
                                onClick={() => {
                                  setEditing(revision)
                                  setDirty(false)
                                }}
                              >
                                {vi ? 'Sửa' : 'Edit'}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                className="text-primary min-h-10 font-medium hover:underline"
                                onClick={() =>
                                  void mutate(
                                    `/api/v1/specifications/${id}/revisions/${revision.revisionNo}/publish`,
                                    { version: revision.version },
                                  )
                                }
                              >
                                {vi ? 'Phê duyệt' : 'Approve'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {editing && (
            <section className="rounded-lg border p-4">
              <h3 className="mb-3 font-semibold">
                {vi
                  ? `Sửa bản nháp V${editing.revisionNo}`
                  : `Edit draft V${editing.revisionNo}`}
              </h3>
              {confirmDiscard ? (
                <div
                  role="alertdialog"
                  aria-label={vi ? 'Xác nhận bỏ thay đổi' : 'Confirm discard'}
                  className="bg-muted flex flex-wrap items-center justify-between gap-3 rounded-md p-3 text-sm"
                >
                  <span>
                    {vi
                      ? 'Bỏ các thay đổi chưa lưu?'
                      : 'Discard unsaved changes?'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="min-h-10 rounded-md px-3"
                      onClick={() => setConfirmDiscard(false)}
                    >
                      {vi ? 'Tiếp tục sửa' : 'Keep editing'}
                    </button>
                    <button
                      type="button"
                      className="bg-destructive text-destructive-foreground min-h-10 rounded-md px-3"
                      onClick={() => {
                        setDirty(false)
                        setEditing(null)
                        setConfirmDiscard(false)
                      }}
                    >
                      {vi ? 'Bỏ thay đổi' : 'Discard changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={saveDraft}
                  onChange={() => setDirty(true)}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {(
                    [
                      ['nameEn', 'Name (EN)', editing.nameEn],
                      ['nameVi', 'Tên (VI)', editing.nameVi],
                      ['nameKo', '이름 (KO)', editing.nameKo],
                      ['grade', 'Grade', editing.grade],
                      [
                        'processing',
                        vi ? 'Chế biến' : 'Processing',
                        editing.processing,
                      ],
                      [
                        'netWeightPerPack',
                        vi ? 'Khối lượng/gói' : 'Net weight/pack',
                        editing.netWeightPerPack,
                      ],
                      [
                        'packsPerCarton',
                        vi ? 'Gói/thùng' : 'Packs/carton',
                        editing.packsPerCarton,
                      ],
                      [
                        'packaging',
                        vi ? 'Đóng gói' : 'Packaging',
                        editing.packaging,
                      ],
                    ] as const
                  ).map(([name, label, value]) => (
                    <label key={name} className="space-y-1 text-sm">
                      {label}
                      <input
                        required
                        name={name}
                        defaultValue={value ?? ''}
                        className="bg-background min-h-11 w-full rounded-md border px-3"
                      />
                    </label>
                  ))}
                  <label className="space-y-1 text-sm">
                    {vi ? 'Đơn vị khối lượng' : 'Weight unit'}
                    <select
                      name="weightUnit"
                      defaultValue={editing.weightUnit ?? 'KG'}
                      className="bg-background min-h-11 w-full rounded-md border px-3"
                    >
                      {['KG', 'MT', 'LB'].map((unit) => (
                        <option key={unit}>{unit}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    UOM
                    <select
                      name="uom"
                      defaultValue={editing.uom ?? 'CTN'}
                      className="bg-background min-h-11 w-full rounded-md border px-3"
                    >
                      {['CTN', 'KG', 'MT', 'PCS', 'LB'].map((unit) => (
                        <option key={unit}>{unit}</option>
                      ))}
                    </select>
                  </label>
                  {(
                    [
                      [
                        'grossWeightPerPack',
                        vi ? 'Khối lượng tổng/gói' : 'Gross weight/pack',
                        editing.grossWeightPerPack,
                      ],
                      [
                        'cartonNetWeight',
                        vi ? 'Khối lượng tịnh/thùng' : 'Carton net weight',
                        editing.cartonNetWeight,
                      ],
                      ['glazingPercent', 'Glazing (%)', editing.glazingPercent],
                      ['sizeBand', 'Size band', editing.sizeBand],
                      [
                        'sizeUnit',
                        vi ? 'Đơn vị size' : 'Size unit',
                        editing.sizeUnit,
                      ],
                      [
                        'treatment',
                        vi ? 'Xử lý' : 'Treatment',
                        editing.treatment,
                      ],
                      [
                        'frozenForm',
                        vi ? 'Dạng đông' : 'Frozen form',
                        editing.frozenForm,
                      ],
                      [
                        'packagingMaterial',
                        vi ? 'Vật liệu bao bì' : 'Packaging material',
                        editing.packagingMaterial,
                      ],
                      [
                        'storageTempC',
                        vi
                          ? 'Nhiệt độ bảo quản (°C)'
                          : 'Storage temperature (°C)',
                        editing.storageTempC,
                      ],
                      [
                        'shelfLifeMonths',
                        vi ? 'Hạn dùng (tháng)' : 'Shelf life (months)',
                        editing.shelfLifeMonths,
                      ],
                      ['moq', 'MOQ', editing.moq],
                      [
                        'originCountry',
                        vi
                          ? 'Nước xuất xứ (mã ISO)'
                          : 'Origin country (ISO code)',
                        editing.originCountry,
                      ],
                      [
                        'certifications',
                        vi
                          ? 'Chứng nhận (phân cách dấu phẩy)'
                          : 'Certifications (comma-separated)',
                        editing.certifications?.join(', '),
                      ],
                      [
                        'labelLanguages',
                        vi
                          ? 'Ngôn ngữ nhãn (phân cách dấu phẩy)'
                          : 'Label languages (comma-separated)',
                        editing.labelLanguages?.join(', '),
                      ],
                    ] as const
                  ).map(([name, label, value]) => (
                    <label key={name} className="space-y-1 text-sm">
                      {label}
                      <input
                        name={name}
                        defaultValue={value ?? ''}
                        className="bg-background min-h-11 w-full rounded-md border px-3"
                      />
                    </label>
                  ))}
                  {(
                    [
                      [
                        'descriptionEn',
                        'Description (EN)',
                        editing.descriptionEn,
                      ],
                      ['descriptionVi', 'Mô tả (VI)', editing.descriptionVi],
                      ['descriptionKo', '설명 (KO)', editing.descriptionKo],
                    ] as const
                  ).map(([name, label, value]) => (
                    <label
                      key={name}
                      className="space-y-1 text-sm sm:col-span-2"
                    >
                      {label}
                      <textarea
                        name={name}
                        defaultValue={value ?? ''}
                        className="bg-background min-h-24 w-full rounded-md border p-3"
                      />
                    </label>
                  ))}
                  <label className="space-y-1 text-sm">
                    {vi ? 'Đơn vị MOQ' : 'MOQ unit'}
                    <select
                      name="moqUnit"
                      defaultValue={editing.moqUnit ?? ''}
                      className="bg-background min-h-11 w-full rounded-md border px-3"
                    >
                      <option value="">—</option>
                      {['KG', 'MT', 'CTN', 'PCS', 'LB'].map((unit) => (
                        <option key={unit}>{unit}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    {vi ? 'Yêu cầu buyer' : 'Buyer requirements'}
                    <textarea
                      name="buyerRequirements"
                      defaultValue={editing.buyerRequirements ?? ''}
                      className="bg-background min-h-20 w-full rounded-md border p-3"
                    />
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    {vi ? 'Ghi chú nội bộ' : 'Internal notes'}
                    <textarea
                      name="notes"
                      defaultValue={editing.notes ?? ''}
                      className="bg-background min-h-20 w-full rounded-md border p-3"
                    />
                  </label>
                  <div className="flex justify-end gap-2 sm:col-span-2">
                    <button
                      type="button"
                      disabled={busy}
                      className="min-h-10 rounded-md px-4"
                      onClick={requestClose}
                    >
                      {vi ? 'Hủy' : 'Cancel'}
                    </button>
                    <button
                      disabled={busy || !dirty}
                      className="bg-primary text-primary-foreground min-h-10 rounded-md px-4"
                    >
                      {busy
                        ? vi
                          ? 'Đang lưu…'
                          : 'Saving…'
                        : vi
                          ? 'Lưu bản nháp'
                          : 'Save draft'}
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}
          <section className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">
              {vi ? 'So sánh hai revision' : 'Compare revisions'}
            </h3>
            <div className="flex flex-wrap gap-3">
              <label className="space-y-1 text-sm">
                {vi ? 'Bản trái' : 'Left revision'}
                <select
                  className="bg-background min-h-10 rounded-md border px-3"
                  value={left}
                  onChange={(event) => setLeft(event.target.value)}
                >
                  {revisions.map((item) => (
                    <option key={item.id} value={item.revisionNo}>
                      V{item.revisionNo}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                {vi ? 'Bản phải' : 'Right revision'}
                <select
                  className="bg-background min-h-10 rounded-md border px-3"
                  value={right}
                  onChange={(event) => setRight(event.target.value)}
                >
                  {revisions.map((item) => (
                    <option key={item.id} value={item.revisionNo}>
                      V{item.revisionNo}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="bg-primary text-primary-foreground min-h-10 self-end rounded-md px-4"
                onClick={() => void compareRevisions()}
                disabled={!left || !right}
              >
                {vi ? 'So sánh' : 'Compare'}
              </button>
            </div>
            {compare && (
              <pre className="bg-muted max-h-72 overflow-auto rounded-md p-3 text-xs">
                {JSON.stringify(compare, null, 2)}
              </pre>
            )}
          </section>
          {canManage && (
            <button
              type="button"
              disabled={busy || revisions.length === 0}
              className="bg-primary text-primary-foreground min-h-10 rounded-md px-4 text-sm"
              onClick={() => {
                const latest = revisions[revisions.length - 1]
                if (latest)
                  void mutate(`/api/v1/specifications/${id}/revisions`, {
                    version: latest.version,
                    sourceRevisionNo: latest.revisionNo,
                  })
              }}
            >
              {busy
                ? vi
                  ? 'Đang lưu…'
                  : 'Saving…'
                : vi
                  ? 'Tạo revision kế tiếp'
                  : 'Create next revision'}
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}

function csrfToken() {
  const cookie = document.cookie
    .split('; ')
    .find(
      (value) =>
        value.startsWith('crm_csrf=') || value.startsWith('__Host-crm_csrf='),
    )
  return cookie ? decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1)) : ''
}
