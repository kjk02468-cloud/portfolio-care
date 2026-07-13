import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-guards'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SignOutButton } from '@/components/SignOutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-brand-fg font-bold">
                P
              </span>
              <span className="hidden whitespace-nowrap font-semibold text-primary sm:inline">
                Portfolio Care
              </span>
            </Link>
            <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
              <Link
                href="/dashboard"
                className="whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium text-secondary hover:bg-surface-2 hover:text-primary sm:px-3"
              >
                포트폴리오
              </Link>
              <Link
                href="/dashboard/feed"
                className="whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium text-secondary hover:bg-surface-2 hover:text-primary sm:px-3"
              >
                분석
              </Link>
              <Link
                href="/dashboard/stages"
                className="whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium text-secondary hover:bg-surface-2 hover:text-primary sm:px-3"
              >
                단계
              </Link>
              <Link
                href="/dashboard/model"
                className="whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium text-secondary hover:bg-surface-2 hover:text-primary sm:px-3"
              >
                모델
              </Link>
              <Link
                href="/dashboard/principles"
                className="hidden whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium text-secondary hover:bg-surface-2 hover:text-primary sm:inline sm:px-3"
              >
                원칙
              </Link>
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin/posts"
                  className="whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium text-brand hover:bg-brand/10 sm:px-3"
                >
                  관리자
                </Link>
              )}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-secondary sm:inline">
              {user.name || user.email}
            </span>
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
