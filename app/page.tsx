import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ThemeToggle } from '@/components/ThemeToggle'

const features = [
  {
    title: '실시간 시세 연동',
    desc: '보유 종목의 현재가를 자동으로 불러와 평가금액과 수익률을 계산합니다.',
  },
  {
    title: '거래 기반 자동 집계',
    desc: '매수·매도 내역만 입력하면 보유수량과 평균단가가 자동으로 계산됩니다.',
  },
  {
    title: '자산 배분 시각화',
    desc: '종목별 비중과 자산 추이를 차트로 한눈에 파악합니다.',
  },
  {
    title: '다중 포트폴리오',
    desc: '계좌·전략별로 포트폴리오를 나눠 관리하고 전체를 합산해 봅니다.',
  },
]

export default async function HomePage() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-brand-fg font-bold">
            P
          </span>
          <span className="text-lg font-semibold text-primary">Portfolio Care</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:text-primary"
          >
            로그인
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition hover:bg-brand-strong"
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
            내 투자, 한 화면에서
            <br />
            <span className="text-brand">수익률까지 명확하게</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-secondary">
            종목과 거래를 등록하면 실시간 시세로 평가금액·손익·자산 배분을
            자동으로 계산해 보여줍니다.
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
