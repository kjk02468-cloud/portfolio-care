const currencyFormatters = new Map<string, Intl.NumberFormat>()

export function formatCurrency(value: number, currency = 'USD'): string {
  let fmt = currencyFormatters.get(currency)
  if (!fmt) {
    fmt = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    })
    currencyFormatters.set(currency, fmt)
  }
  return fmt.format(Number.isFinite(value) ? value : 0)
}

export function formatPercent(value: number, digits = 2): string {
  const v = Number.isFinite(value) ? value : 0
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(digits)}%`
}

export function formatSignedCurrency(value: number, currency = 'USD'): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${formatCurrency(Math.abs(value), currency)}`
}

export function formatNumber(value: number, digits = 4): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0)
}
