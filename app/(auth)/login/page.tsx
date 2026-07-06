import { Suspense } from 'react'
import { AuthForm } from '@/components/AuthForm'

export default function LoginPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-primary">다시 오셨네요</h1>
      <p className="mb-6 text-sm text-secondary">
        로그인하고 내 포트폴리오를 확인해 보세요.
      </p>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  )
}
