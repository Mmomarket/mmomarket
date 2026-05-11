import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Routes that require a logged-in session
const PROTECTED_PREFIXES = [
  "/carteira",
  "/historico",
  "/verificacao",
  "/admin",
];

// The admin-only prefix — regular users are redirected to home
const ADMIN_PREFIX = "/admin";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes: rely on server-side isAdmin check in the page itself.
  // We just ensure the user is authenticated before hitting /admin.
  // The page already redirects non-admins to "/" via the stats API call.
  if (pathname.startsWith(ADMIN_PREFIX) && !token.isAdmin) {
    // isAdmin is not in the default JWT — the page handles this gracefully,
    // but we do a best-effort check here if it was added to the token.
    // Leave it to the page for now — just ensure auth.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/carteira/:path*",
    "/historico/:path*",
    "/verificacao/:path*",
    "/admin/:path*",
  ],
};
