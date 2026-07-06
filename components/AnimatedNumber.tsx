'use client'

import { useEffect, useRef, useState } from 'react'
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from '@/lib/format'

type Kind = 'currency' | 'signed' | 'percent'

function render(kind: Kind, value: number, currency: string) {
  switch (kind) {
    case 'signed':
      return formatSignedCurrency(value, currency)
    case 'percent':
      return formatPercent(value)
    default:
      return formatCurrency(value, currency)
  }
}

/**
 * Counts a number up from 0 to its value on mount — a subtle fintech touch.
 * Skips the animation entirely under prefers-reduced-motion.
 */
export function AnimatedNumber({
  value,
  kind = 'currency',
  currency = 'USD',
  className,
  durationMs = 750,
}: {
  value: number
  kind?: Kind
  currency?: string
  className?: string
  durationMs?: number
}) {
  const [display, setDisplay] = useState(0)
  const frame = useRef<number | undefined>(undefined)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reduce ? 0 : durationMs
    const start = performance.now()
    const tick = (now: number) => {
      const t = duration <= 0 ? 1 : Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 4) // easeOutQuart
      setDisplay(value * eased)
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [value, durationMs])

  return <span className={className}>{render(kind, display, currency)}</span>
}
