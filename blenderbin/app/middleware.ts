// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './lib/firebase-admin';

// Array of public routes that don't require authentication
const publicRoutes = ['/auth', '/', '/about', '/contact']; 

function isPublicRoute(path: string) {
  return publicRoutes.some(route => path.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Always allow public routes
  if (isPublicRoute(path)) {
    return NextResponse.next();
  }

  try {
    const sessionCookie = request.cookies.get('session')?.value;

    // If no session cookie on protected route, redirect to auth
    if (!sessionCookie) {
      const url = new URL('/auth', request.url);
      url.searchParams.set('from', path);
      return NextResponse.redirect(url);
    }

    // Verify the session cookie
    try {
      await auth.verifySessionCookie(sessionCookie);
      return NextResponse.next();
    } catch {
      // Session is invalid, redirect to auth
      const response = NextResponse.redirect(new URL('/auth', request.url));
      response.cookies.delete('session');
      return response;
    }
  } catch {
    // Something went wrong, redirect to auth as a fallback
    const response = NextResponse.redirect(new URL('/auth', request.url));
    response.cookies.delete('session');
    return response;
  }
}

export const config = {
  matcher: [
    '/checkout/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/dashboard/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
};