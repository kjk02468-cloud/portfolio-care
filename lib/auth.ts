import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { loginSchema } from './validation'

// 지정된 이메일은 로그인 시 자동으로 ADMIN으로 승격 (SQL 없이 관리자 지정).
// 소스: 코드 기본값(DEFAULT_ADMIN_EMAILS) ∪ ADMIN_EMAILS 환경변수(쉼표 구분).
// 환경변수를 못 넣는 상황을 위해 기본값을 코드에 둔다. 공개 저장소면 이메일이
// 노출되므로, 관리자 변경 시 이 목록 대신 ADMIN_EMAILS 환경변수를 쓰는 걸 권장.
const DEFAULT_ADMIN_EMAILS = ['kjk02468@naver.com']

function adminEmailSet(): Set<string> {
  const fromEnv = (process.env.ADMIN_EMAILS ?? '').split(',')
  return new Set(
    [...DEFAULT_ADMIN_EMAILS, ...fromEnv]
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Self-hosted: trust the deployment host (set AUTH_URL in production).
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        // 지정된 관리자 이메일이면 아직 SUBSCRIBER인 경우 ADMIN으로 승격(1회 반영).
        if (user.role !== 'ADMIN' && adminEmailSet().has(user.email.toLowerCase())) {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN' },
          })
        }

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
