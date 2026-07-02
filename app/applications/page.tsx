"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ApplicationRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  desired_check_in: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  rooms: { room_number: string } | null;
};

type Settings = { apply_slug: string | null };

const statusStyles: Record<ApplicationRow["status"], string> = {
  pending: "rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-600 dark:text-amber-300",
  approved: "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-300",
  rejected: "rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-600 dark:text-red-300"
};

export default function ApplicationsPage() {
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [copied, setCopied] = useState(false);

  async function load() {
    const [applications, ownerSettings] = await Promise.all([
      fetch("/api/applications").then((res) => res.json()),
      fetch("/api/settings").then((res) => res.json())
    ]);
    setRows(Array.isArray(applications) ? applications : []);
    setSettings(ownerSettings?.apply_slug !== undefined ? ownerSettings : null);
  }

  useEffect(() => {
    load().catch(() => setError("Could not load applications"));
  }, []);

  const applyLink = settings?.apply_slug && typeof window !== "undefined"
    ? `${window.location.origin}/apply/${settings.apply_slug}`
    : "";

  async function copyLink() {
    if (!applyLink) return;
    await navigator.clipboard.writeText(applyLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function act(id: string, action: "approve" | "reject") {
    setError("");
    setBusyId(id);

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Could not ${action} application`);
        return;
      }
      await load();
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold">Shareable application link</h2>
        <p className="mt-1 text-sm text-mist">Send this link to prospective tenants. Applications land below for your approval.</p>
        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
          <code className="flex-1 overflow-x-auto rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.03]">
            {applyLink || "Loading link..."}
          </code>
          <Button onClick={copyLink} disabled={!applyLink}>
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Tenant Applications</h2>
        <p className="mt-1 text-sm text-mist">Approving creates a tenant record. Assign a bed and check-in meter reading from the Tenants page.</p>

        {error && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-mist dark:border-white/10">
                <th className="py-2">Name</th>
                <th>Phone</th>
                <th>Room preference</th>
                <th>Desired check-in</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-2 font-medium">{row.full_name}</td>
                  <td>{row.phone || "-"}</td>
                  <td>{row.rooms?.room_number ? `Room ${row.rooms.room_number}` : "No preference"}</td>
                  <td>{row.desired_check_in || "-"}</td>
                  <td>
                    <span className={statusStyles[row.status]}>{row.status}</span>
                  </td>
                  <td>
                    {row.status === "pending" ? (
                      <div className="flex gap-2 py-1">
                        <Button onClick={() => act(row.id, "approve")} disabled={busyId === row.id} className="px-3 py-1 text-xs">
                          Approve
                        </Button>
                        <Button
                          onClick={() => act(row.id, "reject")}
                          disabled={busyId === row.id}
                          className="bg-red-500/80 px-3 py-1 text-xs text-white"
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-mist">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="pt-4 text-sm text-mist">No applications yet. Share the link above to start receiving them.</p>}
        </div>
      </Card>
    </main>
  );
}
