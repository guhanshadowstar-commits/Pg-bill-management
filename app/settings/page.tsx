"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Settings = {
  vacancy_notice_days: number;
  guest_policy_text: string | null;
  apply_slug: string | null;
};

export default function SettingsPage() {
  const [noticeDays, setNoticeDays] = useState("30");
  const [policyText, setPolicyText] = useState("");
  const [applySlug, setApplySlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data: Settings) => {
        if (data && typeof data.vacancy_notice_days === "number") {
          setNoticeDays(String(data.vacancy_notice_days));
          setPolicyText(data.guest_policy_text || "");
          setApplySlug(data.apply_slug);
        } else {
          setError("Could not load settings");
        }
      })
      .catch(() => setError("Could not load settings"))
      .finally(() => setLoading(false));
  }, []);

  const applyLink = applySlug && typeof window !== "undefined" ? `${window.location.origin}/apply/${applySlug}` : "";

  async function copyLink() {
    if (!applyLink) return;
    await navigator.clipboard.writeText(applyLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function save() {
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacancy_notice_days: Number(noticeDays), guest_policy_text: policyText })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not save settings");
        return;
      }

      setMessage("Settings saved.");
    } catch {
      setError("Could not save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold">Owner Settings</h2>
        <p className="mt-1 text-sm text-mist">Vacancy notice rules and house policy shown to your PG.</p>

        <div className="mt-4 max-w-md space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-mist">Vacancy notice period (days)</label>
            <Input
              type="number"
              min={0}
              max={365}
              value={noticeDays}
              onChange={(event) => setNoticeDays(event.target.value)}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-mist">
              Tenants must give at least this many days of notice before vacating to get their advance refunded.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-mist">Guest policy</label>
            <textarea
              value={policyText}
              onChange={(event) => setPolicyText(event.target.value)}
              disabled={loading}
              rows={5}
              placeholder="example: Visitors allowed only in the common area between 9am and 8pm."
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none ring-gold/40 placeholder:text-mist focus:ring dark:border-white/15 dark:bg-black/20"
            />
          </div>

          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          {message && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500 dark:text-emerald-300">{message}</p>}

          <Button onClick={save} disabled={loading || saving}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Application link</h2>
        <p className="mt-1 text-sm text-mist">Share this public link so prospective tenants can apply online.</p>
        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
          <code className="flex-1 overflow-x-auto rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.03]">
            {applyLink || (loading ? "Loading link..." : "Link unavailable")}
          </code>
          <Button onClick={copyLink} disabled={!applyLink}>
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      </Card>
    </main>
  );
}
