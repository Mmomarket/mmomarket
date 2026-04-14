import Navbar from "@/components/layout/Navbar";
import SessionProvider from "@/components/providers/SessionProvider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MMOMarket - Intermediação de Moedas Digitais para MMORPGs",
  description:
    "Compre e venda moedas digitais de MMORPGs com segurança. Tibia, Mu Online, Ragnarok e muito mais.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100">
        <SessionProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-gray-800 py-6 px-4">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
              <p>
                © {new Date().getFullYear()} MMOMarket. Todos os direitos
                reservados.
              </p>
              <p>Taxa de plataforma: 2% por transação</p>
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
