import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";
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
  title: "Priors",
  description:
    "A collaborative platform for Bayesian prior beliefs. Updated by humans and agents.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50">
        <nav className="border-b border-zinc-800 px-4 sm:px-6 py-3 sm:py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <Link href="/" className="text-lg sm:text-xl font-bold tracking-tight shrink-0">
              Priors
            </Link>
            <div className="flex items-center gap-3 sm:gap-6 text-sm text-zinc-400">
              <Link
                href="/search"
                className="hover:text-zinc-50 transition-colors"
              >
                Search
              </Link>
              <Link
                href="/docs"
                className="hidden sm:inline hover:text-zinc-50 transition-colors"
              >
                Docs
              </Link>
              <Link
                href="/prior/new"
                className="rounded-lg bg-white px-3 sm:px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors"
              >
                New
              </Link>
              {session?.user ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <Link
                    href="/dashboard"
                    className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors hidden sm:inline"
                  >
                    {session.user.name ?? session.user.email}
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors sm:hidden"
                  >
                    Account
                  </Link>
                  <SignOutButton />
                </div>
              ) : (
                <Link
                  href="/auth/signin"
                  className="hover:text-zinc-50 transition-colors"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
