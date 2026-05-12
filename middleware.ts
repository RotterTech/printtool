import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define public paths that don't require authentication
  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isSignupPage = request.nextUrl.pathname.startsWith("/signup");
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth");
  const isStatusPage = request.nextUrl.pathname.startsWith("/status");
  const isPublicPath = isLoginPage || isSignupPage || isAuthCallback || isStatusPage;

  // Check if it's an API route
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  // Check if it's a static file (images, css, js, etc.)
  const isStaticFile =
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname === "/manifest.json" ||
    request.nextUrl.pathname === "/sw.js" ||
    request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|css|js|woff|woff2|ttf|eot)$/);

  // Allow API routes and static files without authentication check
  if (isApiRoute || isStaticFile) {
    return supabaseResponse;
  }

  // If no user and trying to access protected route, redirect to login
  if (!user && !isPublicPath) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is logged in and trying to access login/signup, redirect to dashboard
  if (user && (isLoginPage || isSignupPage)) {
    const redirectUrl = new URL("/", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
