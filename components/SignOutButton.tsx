'use client'

import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/' })}
      className="whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-secondary transition hover:text-primary hover:bg-surface-2"
    >
      로그아웃
    </button>
  )
}
