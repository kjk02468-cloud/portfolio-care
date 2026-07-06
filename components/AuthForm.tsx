'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') ?? '/dashboard'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isRegister = mode === 'register'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isRegister) {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? '회원가입에 실패했습니다.')
        }
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
      }
      router.push(callbackUrl)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isRegister && (
        <Field label="이름 (선택)">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className={inputCls}
            placeholder="홍길동"
          />
        </Field>
      )}
      <Field label="이메일">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className={inputCls}
          placeholder="you@example.com"
        />
      </Field>
      <Field label="비밀번호">
        <input
          type="password"
          required
          minLength={isRegister ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          className={inputCls}
          placeholder={isRegister ? '8자 이상' : '••••••••'}
        />
      </Field>

      {error && (
        <p className="rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-brand-fg transition hover:bg-brand-strong disabled:opacity-60"
      >
        {loading ? '처리 중…' : isRegister ? '회원가입' : '로그인'}
      </button>

      <p className="text-center text-sm text-secondary">
        {isRegister ? '이미 계정이 있으신가요? ' : '계정이 없으신가요? '}
        <Link
          href={isRegister ? '/login' : '/register'}
          className="font-medium text-brand hover:underline"
        >
          {isRegister ? '로그인' : '회원가입'}
        </Link>
      </p>
    </form>
  )
}

const inputCls =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-secondary">
        {label}
      </span>
      {children}
    </label>
  )
}
