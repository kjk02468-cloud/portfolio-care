import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ThemeToggle } from '@/components/ThemeToggle'

const features = [
  {
    title: '가격은 알아서 최신으로',
    desc: '내가 담은 종목이 지금 얼마인지, 실시간 시세로 바로 보여드려요.',
  },
  {
    title: '계산은 맡겨두세요',
    desc: '사고판 기록만 남기면 평균 단가랑 수익률은 알아서 정리돼요.',
  },
  {
    title: '어디에 얼마나 담겼는지',
    desc: '종목별 비중과 자산 흐름을 차트로 한눈에 볼 수 있어요.',
  },
  {
    title: '계좌는 따로, 전체는 한 번에',
    desc: '계좌나 전략별로 나눠 담고, 합쳐서 전체도 볼 수 있어요.',
  },
]

export default async function HomePage() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-brand-fg font-bold">
            P
          </span>
          <span className="hidden whitespace-nowrap text-lg font-semibold text-primary sm:inline">
            Portfolio Care
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:text-primary"
          >
            로그인
          </Link>
          <Link
            href="/register"
            className="whitespace-nowrap rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition hover:bg-brand-strong"
          >
            시작하기
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4">
        <section className="py-16 sm:py-24">
          <p className="mb-4 inline-block rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-secondary">
            투자 포트폴리오 관리 대시보드
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-primary sm:text-5xl">
            지금 내 투자,
            <br />
            <span className="text-brand">얼마나 잘하고 있을까?</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-secondary">
            사고판 기록만 남기면 실시간 시세로 수익률과 자산 배분까지
            알아서 계산해 드려요.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-brand px-6 py-3 font-medium text-brand-fg transition hover:bg-brand-strong"
            >
              무료로 시작하기
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-border bg-surface px-6 py-3 font-medium text-primary transition hover:bg-surface-2"
            >
              로그인
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-2">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="card card-interactive animate-rise p-6"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <h3 className="mb-2 font-semibold text-primary">{f.title}</h3>
              <p className="text-sm text-secondary">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <p className="mx-auto max-w-6xl px-4 text-sm text-muted">
          Portfolio Care · 투자 포트폴리오 관리 데모
        </p>
      </footer>
    </div>
  )
}
