import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogoutButton } from "@/components/auth/logout-button";

export const metadata: Metadata = {
  title: "PG EB Manager",
  description: "Luxury-grade PG Electricity Bill Management"
};

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/rooms", label: "Rooms" },
  { href: "/beds", label: "Beds" },
  { href: "/tenants", label: "Tenants" },
  { href: "/bills", label: "Bills" },
  { href: "/rent", label: "Rent" },
  { href: "/applications", label: "Applications" },
  { href: "/vacancy", label: "Vacancy" },
  { href: "/guests", label: "Guests" },
  { href: "/licenses", label: "Licenses" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
  { href: "/ai", label: "AI Help" },
  { href: "/manual", label: "Manual" }
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8">
          <header className="mb-8 rounded-2xl border border-black/10 bg-white/75 p-4 shadow-soft backdrop-blur dark:border-white/10 dark:bg-black/20">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight">PG Electricity Bill Manager</h1>
                <p className="text-xs text-mist">Fair splits by occupancy days</p>
              </div>
              <div className="flex items-center gap-4">
                <nav className="flex gap-5 text-sm">
                  {nav.map((item) => (
                    <Link key={item.href} href={item.href} className="hover:text-gold">
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <ThemeToggle />
                <LogoutButton />
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
