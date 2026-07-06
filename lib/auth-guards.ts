import { auth } from './auth'
import { prisma } from './prisma'

export interface CurrentUser {
  id: string
  email: string
  name: string | null
  role: 'SUBSCRIBER' | 'ADMIN'
}

/** The signed-in user with role, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth()
  if (!session?.user) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  })
  return user as CurrentUser | null
}

/** Returns the admin user, or null if not signed in / not an admin. */
export async function requireAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser()
  return user?.role === 'ADMIN' ? user : null
}
