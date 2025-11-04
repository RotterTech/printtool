import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup'];
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname);

  // Check if Supabase env vars are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing, allow public routes and skip auth for protected routes
  // (This allows the app to work even if env vars aren't set yet)
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isPublicRoute) {
      return NextResponse.next();
    }
    // For protected routes without env vars, still allow access
    // (In production, you'd want to handle this differently)
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            // Ensure cookies are set with proper path and domain
            const cookieOptions = {
              ...options,
              path: '/',
              sameSite: 'lax' as const,
              ...(options?.maxAge ? { maxAge: options.maxAge } : {}),
            };
            
            request.cookies.set({
              name,
              value,
              ...cookieOptions,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...cookieOptions,
            });
          },
          remove(name: string, options: any) {
            const cookieOptions = {
              ...options,
              path: '/',
              sameSite: 'lax' as const,
            };
            
            request.cookies.set({
              name,
              value: '',
              ...cookieOptions,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value: '',
              ...cookieOptions,
            });
          },
        },
      }
    );

    // First try to get the session (this also refreshes if needed)
    const { data: { session } } = await supabase.auth.getSession();
    
    // Then get the user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // If there's an error getting user but we have a session, try to use session user
    const authenticatedUser = user || session?.user;

    // If user is not logged in and trying to access protected route
    if (!authenticatedUser && !isPublicRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      return NextResponse.redirect(redirectUrl);
    }

    // If user is logged in and trying to access login/signup, redirect to home
    if (authenticatedUser && isPublicRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/';
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    // If there's an error with Supabase, allow public routes to proceed
    if (isPublicRoute) {
      return NextResponse.next();
    }
    // For protected routes, log error but allow access to prevent breaking
    // In production, you might want to redirect to login on error
    console.error('Proxy error:', error);
    // Allow access to prevent redirect loops
    return NextResponse.next();
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
