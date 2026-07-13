'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function markAll() {
    setLoading(true)
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={markAll}
      disabled={disabled || loading}
      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-secondary transition hover:bg-surface-2 disabled:opacity-50"
    >
      {loading ? '처리 중…' : '모두 읽음'}
    </button>
  )
}
