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
          <div className="flex items-center gap-4">
            <Link href="/admin/posts" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-fg font-bold">
                A
              </span>
              <span className="font-semibold text-primary">관리자</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/admin/posts"
                className="rounded-lg px-3 py-1.5 font-medium text-secondary hover:bg-surface-2 hover:text-primary"
              >
                분석글
              </Link>
              <Link
                href="/admin/stocks"
                className="rounded-lg px-3 py-1.5 font-medium text-secondary hover:bg-surface-2 hover:text-primary"
              >
                종목
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:text-primary sm:inline"
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
