'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeletePostButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function onDelete() {
    if (!confirm('이 분석글을 삭제할까요?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' })
      if (res.ok) router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading}
      className="text-xs text-muted transition hover:text-loss disabled:opacity-50"
    >
      삭제
    </button>
  )
}
