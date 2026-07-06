import { Suspense } from 'react'
import { AuthForm } from '@/components/AuthForm'

export default function LoginPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-primary">로그인</h1>
      <p className="mb-6 text-sm text-secondary">
        포트폴리오 대시보드에 접속하세요.
      </p>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  )
}
