import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If ACCESS_PASSWORD is not set, allow access (dev mode convenience)
  if (!process.env.ACCESS_PASSWORD) {
    return NextResponse.next();
  }

  // Define public paths that bypass auth
  const publicPaths = ["/login", "/api/auth/login", "/favicon.ico"];

  // Skip middleware for public paths and Next.js internals
  if (
    publicPaths.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static")
  ) {
    return NextResponse.next();
  }

  // Get the auth cookie
  const authCookie = request.cookies.get("auth_session");

  if (!authCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  try {
    // Verify the JWT signature
    // This ensures the cookie was created by our server using the known password
    const secret = new TextEncoder().encode(process.env.ACCESS_PASSWORD);
    await jwtVerify(authCookie.value, secret);

    // Verification successful, proceed
    return NextResponse.next();
  } catch {
    // Verification failed (tampered or expired token)
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const response = NextResponse.redirect(url);

    // Clear the invalid cookie
    response.cookies.delete("auth_session");

    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
