import { Suspense } from 'react'
import { AuthForm } from '@/components/AuthForm'

export default function RegisterPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-primary">시작해 볼까요</h1>
      <p className="mb-6 text-sm text-secondary">
        가입하면 바로 쓸 수 있는 포트폴리오 하나를 만들어 드려요.
      </p>
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </div>
  )
}
