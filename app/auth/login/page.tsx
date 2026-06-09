"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      const nextPath = new URLSearchParams(window.location.search).get("next");
      router.push((nextPath?.startsWith("/") ? nextPath : "/") as Route);
      router.refresh();
    } catch {
      setError("Unable to login. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center">
      <Card className="w-full">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">PG Owner Login</p>
          <h2 className="mt-2 text-2xl font-bold">
            {mode === "login" ? "Secure access for the PG owner" : "Create your PG owner account"}
          </h2>
          <p className="mt-2 text-sm text-mist">
            {mode === "login"
              ? "Login is required before managing rooms, tenants, bills, and payments."
              : "Your rooms, tenants, bills, payments, and history will be private to this owner account."}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-mist">Username</label>
            <Input
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="example: royalpg"
            />
          </div>
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-mist">Email (optional)</label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="owner@example.com"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-mist">Password</label>
            <Input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              placeholder="Enter owner password"
            />
          </div>

          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

          <Button onClick={submit} disabled={!form.username.trim() || !form.password || loading} className="w-full">
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create owner account"}
          </Button>
        </div>

        <div className="mt-5 rounded-xl border border-black/10 bg-black/[0.02] p-3 text-xs text-mist dark:border-white/10 dark:bg-white/[0.03]">
          {mode === "login" ? (
            <>
              New owner?{" "}
              <button className="font-semibold text-gold" onClick={() => {
                setMode("signup");
                setError("");
              }}>
                Create an owner account
              </button>
              . Vercel owner accounts are only an emergency fallback now.
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button className="font-semibold text-gold" onClick={() => {
                setMode("login");
                setError("");
              }}>
                Login here
              </button>
              . Each owner account gets separated PG data automatically.
            </>
          )}
        </div>
      </Card>
    </main>
  );
}
