"use client";

import { usePathname, useRouter } from "next/navigation";

export function LogoutButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/auth/login") return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="rounded-xl border border-black/10 px-3 py-2 text-sm transition hover:border-gold dark:border-white/15"
    >
      Logout
    </button>
  );
}
