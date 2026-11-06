export default function DashboardPage() {
  return (
    <section aria-labelledby="dashboard-title" className="space-y-3">
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm font-medium">
          R1 workspace
        </p>
        <h1
          className="text-3xl font-semibold tracking-tight"
          id="dashboard-title"
        >
          Dashboard
        </h1>
      </div>
      <p className="text-muted-foreground max-w-2xl">
        The application shell is ready. Dashboard data and CRM modules will be
        added in approved feature slices.
      </p>
    </section>
  )
}
