import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// Protect the dashboard: unauthenticated users are redirected to /login.
export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/dashboard') && !isLoggedIn) {
    const url = new URL('/login', req.nextUrl.origin)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // Keep signed-in users out of the auth pages.
  if ((pathname === '/login' || pathname === '/register') && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
}
