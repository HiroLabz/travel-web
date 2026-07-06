import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/create',
  '/trip',
  '/profile',
  '/household',
  '/archived-trips',
  '/onboarding',
];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login'];

// Auth routes that should NOT redirect to dashboard (authenticated users need access)
const authRoutesAllowAuthenticated = ['/change-password'];

// Public routes that don't require authentication
const publicRoutes = ['/', '/api/auth/session'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get the session cookie
  const sessionCookie = request.cookies.get('__session');
  const isAuthenticated = !!sessionCookie?.value;

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Check if the current path is an auth route (login/signup)
  const isAuthRoute = authRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Check if it's an auth route that allows authenticated users
  const isAuthRouteAllowAuthenticated = authRoutesAllowAuthenticated.some(route =>
    pathname.startsWith(route)
  );

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith('/api/')
  );

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // Static files like .css, .js, .png, etc.
  ) {
    return NextResponse.next();
  }

  // If user is not authenticated and trying to access a protected route
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is not authenticated and trying to access auth routes that need auth (like change-password)
  if (!isAuthenticated && isAuthRouteAllowAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and trying to access auth routes (login/signup)
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
