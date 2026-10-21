export const PUBLIC_ROUTES = ['/login', '/registro']

export const DEFAULT_AUTHENTICATED_REDIRECT = '/'
export const DEFAULT_UNAUTHENTICATED_REDIRECT = '/login'

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
}
