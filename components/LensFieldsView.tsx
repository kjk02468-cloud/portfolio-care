import {
  SURPRISE_LABELS,
  IMPACT_LABELS,
  STRENGTH_LABELS,
} from '@/lib/lens-fields'

type Fields = Record<string, unknown>

const str = (f: Fields, k: string) =>
  typeof f[k] === 'string' ? (f[k] as string) : ''
const list = (f: Fields, k: string): string[] =>
  Array.isArray(f[k]) ? (f[k] as unknown[]).map(String).filter(Boolean) : []
const pairs = (f: Fields, k: string): Record<string, string>[] =>
  Array.isArray(f[k]) ? (f[k] as Record<string, string>[]) : []

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <div className="w-28 shrink-0 text-sm text-secondary">{label}</div>
      <div className="min-w-0 flex-1 text-sm text-primary">{children}</div>
    </div>
  )
}

function Chip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'gain' | 'loss' | 'brand'
}) {
  const cls =
    tone === 'gain'
      ? 'bg-gain/15 text-gain'
      : tone === 'loss'
        ? 'bg-loss/15 text-loss'
        : tone === 'brand'
          ? 'bg-brand/10 text-brand'
          : 'bg-surface-2 text-secondary'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  )
}

export function LensFieldsView({
  lensType,
  fields,
}: {
  lensType: string
  fields: Fields
}) {
  const rows = buildRows(lensType, fields)
  if (rows.length === 0) return null

  return (
    <div className="card space-y-3 p-5">
      <p className="text-sm font-medium text-secondary">렌즈 정보</p>
      <div className="space-y-3">{rows}</div>
    </div>
  )
}

function buildRows(lensType: string, f: Fields): React.ReactNode[] {
  const rows: React.ReactNode[] = []
  const push = (key: string, label: string, node: React.ReactNode) =>
    rows.push(
      <Row key={key} label={label}>
        {node}
      </Row>,
    )

  if (lensType === 'earnings') {
    if (str(f, 'quarter')) push('q', '분기', str(f, 'quarter'))
    const s = str(f, 'surprise')
    if (s)
      push(
        's',
        '서프라이즈',
        <Chip tone={s === 'beat' ? 'gain' : s === 'miss' ? 'loss' : 'neutral'}>
          {SURPRISE_LABELS[s] ?? s}
        </Chip>,
      )
    const metrics = pairs(f, 'keyMetrics').filter((m) => m.key || m.value)
    if (metrics.length)
      push(
        'm',
        '핵심 지표',
        <dl className="space-y-1">
          {metrics.map((m, i) => (
            <div key={i} className="flex gap-2">
              <dt className="text-secondary">{m.key}</dt>
              <dd className="font-medium tabular-nums">{m.value}</dd>
            </div>
          ))}
        </dl>,
      )
  }

  if (lensType === 'valuechain') {
    if (str(f, 'industry')) push('i', '산업', <Chip tone="brand">{str(f, 'industry')}</Chip>)
    const steps = list(f, 'chainSteps')
    const bottleneck = str(f, 'bottleneckStep')
    if (steps.length)
      push(
        'c',
        '밸류체인',
        <div className="flex flex-wrap items-center gap-1.5">
          {steps.map((step, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <Chip tone={step === bottleneck ? 'loss' : 'neutral'}>
                {step}
                {step === bottleneck && ' · 병목'}
              </Chip>
              {i < steps.length - 1 && <span className="text-muted">→</span>}
            </span>
          ))}
        </div>,
      )
    if (bottleneck && !steps.includes(bottleneck))
      push('b', '병목 단계', <Chip tone="loss">{bottleneck}</Chip>)
    if (str(f, 'capitalConcentration'))
      push('cc', '자본 집중', str(f, 'capitalConcentration'))
  }

  if (lensType === 'macro') {
    const ind = list(f, 'indicators')
    if (ind.length)
      push(
        'ind',
        '지표',
        <div className="flex flex-wrap gap-1.5">
          {ind.map((x, i) => (
            <Chip key={i}>{x}</Chip>
          ))}
        </div>,
      )
    if (str(f, 'direction')) push('d', '방향', <Chip tone="brand">{str(f, 'direction')}</Chip>)
    if (str(f, 'marketImpact')) push('mi', '시장 영향', str(f, 'marketImpact'))
    if (str(f, 'portfolioImpact'))
      push('pi', '포트폴리오 영향', str(f, 'portfolioImpact'))
  }

  if (lensType === 'news') {
    const dir = str(f, 'impactDirection')
    if (dir)
      push(
        'dir',
        '영향',
        <Chip tone={dir === 'positive' ? 'gain' : dir === 'negative' ? 'loss' : 'neutral'}>
          {IMPACT_LABELS[dir] ?? dir}
        </Chip>,
      )
    const st = str(f, 'strength')
    if (st) push('st', '강도', <Chip>{STRENGTH_LABELS[st] ?? st}</Chip>)
    if (str(f, 'sourceUrl'))
      push(
        'url',
        '원문',
        <a
          href={str(f, 'sourceUrl')}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-brand underline"
        >
          {str(f, 'sourceUrl')}
        </a>,
      )
  }

  if (lensType === 'financials') {
    const items = pairs(f, 'perTickerKeyItems').filter((x) => x.ticker || x.items)
    if (items.length)
      push(
        'pt',
        '종목별 핵심 항목',
        <dl className="space-y-1">
          {items.map((x, i) => (
            <div key={i} className="flex gap-2">
              <dt className="font-medium text-primary">{x.ticker}</dt>
              <dd className="text-secondary">{x.items}</dd>
            </div>
          ))}
        </dl>,
      )
  }

  return rows
}
