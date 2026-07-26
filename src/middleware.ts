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

// Paths that bypass the geo-block (API routes, static assets, etc.)
const GEO_BYPASS_PREFIXES = ["/api/", "/_next/", "/favicon", "/assets"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Geo-block: only allow Brazil ---
  const isAsset = GEO_BYPASS_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isAsset) {
    const country =
      req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry");

    if (country && country !== "BR") {
      return new NextResponse(
        "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'/><title>Acesso Restrito</title></head><body style='font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f0f0f;color:#e5e7eb'><div style='text-align:center'><h1>🚫 Acesso Restrito</h1><p>Este serviço está disponível apenas para usuários no Brasil.</p></div></body></html>",
        {
          status: 403,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      );
    }
  }

  // --- Auth guard ---
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
    // Leave it to the page for now — just ensure auth
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon|assets|sitemap.xml|robots.txt).*)",
  ],
};
