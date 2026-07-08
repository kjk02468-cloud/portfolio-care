import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-guards'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SignOutButton } from '@/components/SignOutButton'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await requireAdmin()
  if (!admin) redirect('/dashboard')

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/admin/posts" className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-brand-fg font-bold">
                A
              </span>
              <span className="hidden whitespace-nowrap font-semibold text-primary sm:inline">
                관리자
              </span>
            </Link>
            <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
              <Link
                href="/admin/posts"
                className="whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium text-secondary hover:bg-surface-2 hover:text-primary sm:px-3"
              >
                분석글
              </Link>
              <Link
                href="/admin/stocks"
                className="whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium text-secondary hover:bg-surface-2 hover:text-primary sm:px-3"
              >
                종목
              </Link>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:text-primary sm:inline"
            >
              사이트로
            </Link>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
