"use client";

import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// SVG icon components
function IconMarket() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth={2}
        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16h16V4"
      />
    </svg>
  );
}
function IconTrade() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth={2}
        d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"
      />
    </svg>
  );
}
function IconWallet() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <rect x="1" y="5" width="22" height="14" rx="0" strokeWidth={2} />
      <path
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth={2}
        d="M16 12h4"
      />
    </svg>
  );
}
function IconProfile() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth={2}
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
      />
      <circle cx="12" cy="7" r="4" strokeWidth={2} />
    </svg>
  );
}
function IconVerify() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}
function IconAdmin() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

const navLinks = [
  { href: "/", label: "Mercado", Icon: IconMarket },
  { href: "/negociar", label: "Negociar", Icon: IconTrade },
  { href: "/carteira", label: "Carteira", Icon: IconWallet },
  { href: "/perfil", label: "Perfil", Icon: IconProfile },
  { href: "/verificacao", label: "Verificação", Icon: IconVerify },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (session) {
      fetch("/api/admin/stats")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setIsAdmin(data?.isAdmin === true))
        .catch(() => setIsAdmin(false));
    }
  }, [session]);

  const allLinks = [
    ...navLinks,
    ...(isAdmin ? [{ href: "/admin", label: "Admin", Icon: IconAdmin }] : []),
  ];

  const isAuth =
    pathname === "/login" ||
    pathname === "/registro" ||
    pathname === "/admin/login";
  if (isAuth) return null;

  return (
    <nav className="sticky top-0 z-40 bg-black/50 border-b border-gray-800 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/assets/logo.png"
              alt="MMOMarket"
              width={220}
              height={64}
              className="h-14 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {allLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-gray-800 text-emerald-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50",
                )}
              >
                <link.Icon />
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {status === "loading" ? (
              <div className="w-24 h-8 bg-gray-800 animate-pulse" />
            ) : session?.user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <Link
                    href="/perfil"
                    className="text-sm font-medium text-white hover:text-emerald-400 transition-colors"
                  >
                    {session.user.name}
                  </Link>
                  <p className="text-xs text-gray-500">{session.user.email}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  Sair
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="/registro"
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                >
                  Criar Conta
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white cursor-pointer"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-gray-800 mt-2 pt-3 space-y-1">
            {allLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-gray-800 text-emerald-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50",
                )}
              >
                <link.Icon />
                {link.label}
              </Link>
            ))}
            <div className="pt-3 mt-3 border-t border-gray-800">
              {session?.user ? (
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-gray-800 text-left cursor-pointer"
                >
                  Sair da Conta
                </button>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/login"
                    className="block px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/registro"
                    className="block px-3 py-2.5 text-sm text-emerald-400 font-medium hover:bg-gray-800"
                  >
                    Criar Conta
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
