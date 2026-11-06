import Link from 'next/link'
import { RecordsTable } from '@/modules/routing/records-table'

const reportViews = {
  overview: {
    label: 'Overview',
    title: 'Commercial overview',
    columns: [
      'Customer',
      'Open RFQs',
      'Quotes sent',
      'Confirmed orders',
      'Order value',
    ],
    rows: [
      ['Han River Foods', '9', '6', '3', 'USD 42,800'],
      ['Pacific Blue Trading', '7', '5', '2', 'USD 18,250'],
      ['Nordic Catch GmbH', '5', '4', '2', 'USD 63,100'],
    ],
  },
  orders: {
    label: 'By order',
    title: 'Order report',
    columns: ['Order', 'Customer', 'Confirmed', 'Items', 'Order value'],
    rows: [
      ['SO-2026-026', 'Han River Foods', 'Nov 04', '2', 'USD 42,800'],
      ['SO-2026-025', 'Pacific Blue Trading', 'Nov 01', '1', 'USD 18,250'],
      ['SO-2026-023', 'Nordic Catch GmbH', 'Oct 28', '3', 'USD 63,100'],
    ],
  },
  products: {
    label: 'By product',
    title: 'Product report',
    columns: ['Product', 'Specification', 'Orders', 'Quantity', 'Order value'],
    rows: [
      [
        'Frozen Pacific Cod',
        'Fillet · 200–400g',
        '8',
        '18,400 kg',
        'USD 73,600',
      ],
      ['Vannamei Shrimp', 'PDTO · 16/20', '6', '12,600 kg', 'USD 88,200'],
      ['Frozen Squid', 'Rings · 1 kg pack', '3', '3,600 kg', 'USD 28,800'],
    ],
  },
  customers: {
    label: 'By customer',
    title: 'Customer report',
    columns: ['Customer', 'Open RFQs', 'Quotes sent', 'Orders', 'Last order'],
    rows: [
      ['Han River Foods', '9', '6', '3', 'Nov 04, 2026'],
      ['Pacific Blue Trading', '7', '5', '2', 'Nov 01, 2026'],
      ['Nordic Catch GmbH', '5', '4', '2', 'Oct 28, 2026'],
    ],
  },
  sales: {
    label: 'By sales owner',
    title: 'Sales owner report',
    columns: [
      'Sales owner',
      'RFQs handled',
      'Quotes sent',
      'Orders confirmed',
      'Conversion',
    ],
    rows: [
      ['Linh Nguyen', '18', '12', '5', '41.7%'],
      ['Minh Tran', '14', '9', '4', '44.4%'],
      ['Lan Pham', '10', '7', '2', '28.6%'],
    ],
  },
} satisfies Record<
  string,
  {
    label: string
    title: string
    columns: string[]
    rows: string[][]
  }
>

type ReportKey = keyof typeof reportViews

export default async function DashboardPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ view?: string }>
}>) {
  const requestedView = (await searchParams).view
  const viewKey: ReportKey = isReportKey(requestedView)
    ? requestedView
    : 'overview'
  const view = reportViews[viewKey]

  return (
    <section aria-labelledby="dashboard-title" className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
            M30 · R1 planned
          </p>
          <h1
            className="mt-2 text-3xl font-semibold tracking-tight"
            id="dashboard-title"
          >
            Reports
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Illustrative pipeline and confirmed activity. All counts and values
            below are fictional examples.
          </p>
        </div>
        <span className="text-muted-foreground rounded-full border border-dashed px-3 py-2 text-xs">
          Prototype · no CRM connection
        </span>
      </div>

      <nav
        aria-label="Report categories"
        className="bg-card flex gap-1 overflow-x-auto rounded-lg border p-1"
      >
        {(Object.keys(reportViews) as ReportKey[]).map((key) => (
          <Link
            aria-current={key === viewKey ? 'page' : undefined}
            className={`rounded-md px-3 py-2 text-sm whitespace-nowrap ${key === viewKey ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            href={key === 'overview' ? '/dashboard' : `/dashboard?view=${key}`}
            key={key}
          >
            {reportViews[key].label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Open RFQs"
          value="42"
          detail="Example · selected period"
        />
        <Metric
          label="Quotes sent"
          value="28"
          detail="Example · selected period"
        />
        <Metric
          label="Confirmed orders"
          value="11"
          detail="Won orders counted once · example"
        />
        <Metric
          label="Quote conversion"
          value="39.3%"
          detail="11 confirmed ÷ 28 quotes sent · example"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <section
          aria-labelledby="activity-chart-title"
          className="bg-card rounded-xl border p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold" id="activity-chart-title">
                {view.title} activity
              </h2>
              <p className="text-muted-foreground mt-1 text-xs">
                Monthly RFQs, quotes sent and confirmed orders · illustrative
              </p>
            </div>
            <span className="text-muted-foreground text-xs">
              Jul – Sep 2026
            </span>
          </div>
          <div
            aria-label="Illustrative monthly commercial activity chart"
            className="mt-6 flex h-48 items-end gap-5 border-b border-l px-4"
            role="img"
          >
            {[
              ['Jul', 52, 31],
              ['Aug', 69, 44],
              ['Sep', 86, 62],
            ].map(([month, rfqs, quotes]) => (
              <div
                className="flex h-full flex-1 items-end justify-center gap-2"
                key={month}
              >
                <span
                  className="bg-primary/80 w-6 rounded-t"
                  style={{ height: `${rfqs}%` }}
                />
                <span
                  className="bg-secondary/40 w-6 rounded-t"
                  style={{ height: `${quotes}%` }}
                />
                <span className="sr-only">
                  {month}: RFQs {rfqs}, quotes {quotes}
                </span>
              </div>
            ))}
          </div>
          <div
            className="text-muted-foreground mt-2 flex justify-around text-xs"
            aria-hidden="true"
          >
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
          </div>
          <div className="text-muted-foreground mt-4 flex gap-4 text-xs">
            <span>
              <i className="bg-primary/80 mr-2 inline-block size-2 rounded-full" />
              RFQs
            </span>
            <span>
              <i className="bg-secondary/60 mr-2 inline-block size-2 rounded-full" />
              Quotes
            </span>
          </div>
        </section>

        <section
          aria-labelledby="pipeline-title"
          className="bg-card rounded-xl border p-5 shadow-sm"
        >
          <h2 className="font-semibold" id="pipeline-title">
            Pipeline health
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Stage counts · illustrative
          </p>
          <div className="mt-5 space-y-4">
            <PipelineRow label="Open RFQs" value="42" percent={100} />
            <PipelineRow label="Quoted" value="28" percent={67} />
            <PipelineRow label="Confirmed" value="11" percent={26} />
          </div>
          <div className="mt-6 space-y-3 border-t pt-4 text-sm">
            <p className="flex justify-between gap-3">
              <span className="text-muted-foreground">Confirmed · USD</span>
              <strong>USD 128,400</strong>
            </p>
            <p className="flex justify-between gap-3">
              <span className="text-muted-foreground">Confirmed · KRW</span>
              <strong>KRW 84,200,000</strong>
            </p>
            <p className="bg-muted text-muted-foreground rounded-md p-3 text-xs leading-5">
              Currencies stay separate. No FX conversion or margin is included
              in this view.
            </p>
          </div>
        </section>
      </div>

      <section className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="border-b p-4">
          <h2 className="font-semibold">{view.title}</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            {view.rows.length} illustrative rows · mockup source:
            dashboard-reporting.mockup.html
          </p>
        </div>
        <RecordsTable
          columns={view.columns}
          label={view.title}
          rows={view.rows}
        />
        <p className="text-muted-foreground border-t px-4 py-3 text-xs">
          Production totals must reconcile with the same filtered, authorized
          record lists. No export or live data is connected.
        </p>
      </section>
    </section>
  )
}

function isReportKey(value: string | undefined): value is ReportKey {
  return value !== undefined && Object.hasOwn(reportViews, value)
}

function Metric({
  label,
  value,
  detail,
}: Readonly<{ label: string; value: string; detail: string }>) {
  return (
    <article className="bg-card rounded-xl border p-4 shadow-sm">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
    </article>
  )
}

function PipelineRow({
  label,
  value,
  percent,
}: Readonly<{ label: string; value: string; percent: number }>) {
  return (
    <div className="grid grid-cols-[86px_minmax(0,1fr)_32px] items-center gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="bg-muted h-2 overflow-hidden rounded-full">
        <span
          className="bg-primary block h-full rounded-full"
          style={{ width: `${percent}%` }}
        />
      </span>
      <strong className="text-right">{value}</strong>
    </div>
  )
}
