import { NextRequest, NextResponse } from 'next/server'
import {
  isPublicRoute,
  DEFAULT_AUTHENTICATED_REDIRECT,
  DEFAULT_UNAUTHENTICATED_REDIRECT,
} from '@/lib/auth/routes'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('token')?.value

  if (!token && !isPublicRoute(pathname)) {
    const url = req.nextUrl.clone()
    url.pathname = DEFAULT_UNAUTHENTICATED_REDIRECT
    return NextResponse.redirect(url)
  }

  if (token && isPublicRoute(pathname)) {
    const url = req.nextUrl.clone()
    url.pathname = DEFAULT_AUTHENTICATED_REDIRECT
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
