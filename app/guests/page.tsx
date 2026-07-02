"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Tenant = { id: string; full_name: string };

type GuestRequestRow = {
  id: string;
  guest_name: string;
  guest_phone: string | null;
  start_date: string;
  end_date: string;
  status: "pending" | "approved" | "rejected";
  charge_amount: number | null;
  notes: string | null;
  tenants: { full_name: string } | null;
};

export default function GuestsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [requests, setRequests] = useState<GuestRequestRow[]>([]);
  const [policy, setPolicy] = useState("");
  const [form, setForm] = useState({ tenant_id: "", guest_name: "", guest_phone: "", start_date: today, end_date: today, notes: "" });
  const [chargeInputs, setChargeInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function load() {
    const [t, g, s] = await Promise.all([
      fetch("/api/tenants").then((x) => x.json()),
      fetch("/api/guests").then((x) => x.json()),
      fetch("/api/settings").then((x) => x.json())
    ]);
    setTenants(Array.isArray(t) ? t : []);
    setRequests(Array.isArray(g) ? g : []);
    setPolicy(s?.guest_policy_text || "");
    if (t?.[0] && !form.tenant_id) setForm((p) => ({ ...p, tenant_id: t[0].id }));
  }

  useEffect(() => {
    load();
  }, []);

  async function createRequest() {
    setError("");
    const res = await fetch("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
      return;
    }
    setForm((p) => ({ ...p, guest_name: "", guest_phone: "", notes: "" }));
    await load();
  }

  async function act(id: string, action: "approve" | "reject") {
    setError("");
    const body: Record<string, unknown> = { action };
    if (action === "approve") {
      const amount = Number(chargeInputs[id]);
      if (!Number.isFinite(amount) || amount < 0) {
        setError("Enter a guest charge amount (0 or more) before approving.");
        return;
      }
      body.charge_amount = amount;
    }
    const res = await fetch(`/api/guests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
      return;
    }
    await load();
  }

  return (
    <main className="space-y-4">
      {policy && (
        <Card>
          <h3 className="text-lg font-semibold">Your Guest Policy</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-mist">{policy}</p>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold">New Guest Request</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select value={form.tenant_id} onChange={(e) => setForm((p) => ({ ...p, tenant_id: e.target.value }))}>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </Select>
          <Input placeholder="Guest name" value={form.guest_name} onChange={(e) => setForm((p) => ({ ...p, guest_name: e.target.value }))} />
          <Input placeholder="Guest phone (optional)" value={form.guest_phone} onChange={(e) => setForm((p) => ({ ...p, guest_phone: e.target.value }))} />
          <Input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
          <Input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} />
          <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        </div>
        <div className="mt-3">
          <Button onClick={createRequest} disabled={!form.tenant_id || !form.guest_name}>Add Request</Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Guest Requests</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-mist dark:border-white/10">
                <th className="py-2">Guest</th><th>Host Tenant</th><th>Dates</th><th>Status</th><th>Charge</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-2">
                    {r.guest_name}
                    {r.guest_phone && <span className="block text-xs text-mist">{r.guest_phone}</span>}
                  </td>
                  <td>{r.tenants?.full_name || "-"}</td>
                  <td>{r.start_date} → {r.end_date}</td>
                  <td>
                    <span
                      className={
                        r.status === "approved"
                          ? "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-300"
                          : r.status === "rejected"
                            ? "rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-600 dark:text-red-300"
                            : "rounded-full bg-black/5 px-2 py-1 text-xs text-mist dark:bg-white/10"
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>{r.charge_amount !== null ? `₹${r.charge_amount}` : "-"}</td>
                  <td>
                    {r.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="₹ charge"
                          className="w-24 rounded-lg border border-black/10 bg-white px-2 py-1 text-xs outline-none dark:border-white/15 dark:bg-black/20"
                          value={chargeInputs[r.id] || ""}
                          onChange={(e) => setChargeInputs((p) => ({ ...p, [r.id]: e.target.value }))}
                        />
                        <button className="rounded-lg border border-black/10 px-2 py-1 text-xs dark:border-white/20" onClick={() => act(r.id, "approve")}>
                          Approve
                        </button>
                        <button className="rounded-lg border border-black/10 px-2 py-1 text-xs dark:border-white/20" onClick={() => act(r.id, "reject")}>
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!requests.length && <p className="pt-2 text-sm text-mist">No guest requests yet.</p>}
        </div>
      </Card>
    </main>
  );
}
