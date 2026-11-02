// Skeleton loaders + spinner for async states

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-9 w-9 rounded-xl" />
          </div>
          <SkeletonBlock className="mt-3 h-7 w-20" />
          <SkeletonBlock className="mt-2 h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <SkeletonBlock key={i} className="h-3 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonBlock key={c} className={`h-4 flex-1 ${c === 0 ? 'max-w-[140px]' : ''}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCharts() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <SkeletonBlock className="mb-4 h-4 w-40" />
          <div className="flex h-72 items-end gap-3 px-2">
            {[40, 70, 55, 85, 60, 75, 50].map((h, j) => (
              <div
                key={j}
                className="flex-1 animate-pulse rounded-t-lg bg-sky-200/50"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
