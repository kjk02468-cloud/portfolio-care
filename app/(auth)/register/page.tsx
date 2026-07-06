import { Suspense } from 'react'
import { AuthForm } from '@/components/AuthForm'

export default function RegisterPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-primary">회원가입</h1>
      <p className="mb-6 text-sm text-secondary">
        계정을 만들면 시작용 포트폴리오가 자동으로 생성됩니다.
      </p>
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </div>
  )
}
