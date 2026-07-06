import Link from 'next/link'
import { LENS_TYPES, LENS_LABELS, type LensTypeValue } from '@/lib/lens'

function href(lens: LensTypeValue | null, scope: 'mine' | 'all') {
  const params = new URLSearchParams()
  if (lens) params.set('lens', lens)
  if (scope === 'all') params.set('scope', 'all')
  const qs = params.toString()
  return `/dashboard/feed${qs ? `?${qs}` : ''}`
}

export function LensTabs({
  current,
  scope,
}: {
  current: LensTypeValue | null
  scope: 'mine' | 'all'
}) {
  const tabs: { key: LensTypeValue | null; label: string }[] = [
    { key: null, label: '전체' },
    ...LENS_TYPES.map((t) => ({ key: t, label: LENS_LABELS[t] })),
  ]

  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((t) => {
        const active = t.key === current
        return (
          <Link
            key={t.key ?? 'all'}
            href={href(t.key, scope)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active
                ? 'bg-brand text-brand-fg'
                : 'bg-surface-2 text-secondary hover:text-primary'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
