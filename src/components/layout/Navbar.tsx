"use client";

import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/", label: "Mercado", icon: "📊" },
  { href: "/negociar", label: "Negociar", icon: "💱" },
  { href: "/carteira", label: "Carteira", icon: "💰" },
  { href: "/verificacao", label: "Verificação", icon: "✅" },
  { href: "/historico", label: "Histórico", icon: "📋" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (session) {
      fetch("/api/admin/stats")
        .then((r) => r.json())
        .then((data) => setIsAdmin(data.isAdmin === true))
        .catch(() => setIsAdmin(false));
    }
  }, [session]);

  const allLinks = [
    ...navLinks,
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: "🛡️" }] : []),
  ];

  const isAuth = pathname === "/login" || pathname === "/registro";
  if (isAuth) return null;

  return (
    <nav className="sticky top-0 z-40 bg-gray-900/80 border-b border-gray-800 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              MMO<span className="text-emerald-400">Market</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {allLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-gray-800 text-emerald-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50",
                )}
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {status === "loading" ? (
              <div className="w-24 h-8 bg-gray-800 animate-pulse rounded-lg" />
            ) : session?.user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-gray-500">{session.user.email}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
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
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
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
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-gray-800 text-emerald-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50",
                )}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
            <div className="pt-3 mt-3 border-t border-gray-800">
              {session?.user ? (
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-gray-800 rounded-lg text-left cursor-pointer"
                >
                  Sair da Conta
                </button>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/login"
                    className="block px-3 py-2.5 text-sm text-gray-300 hover:text-white rounded-lg hover:bg-gray-800"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/registro"
                    className="block px-3 py-2.5 text-sm text-emerald-400 font-medium hover:bg-gray-800 rounded-lg"
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
