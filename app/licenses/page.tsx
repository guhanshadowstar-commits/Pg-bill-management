"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LicenseRow = {
  id: string;
  license_name: string;
  expiry_date: string;
  notes: string | null;
};

function daysLeft(expiry: string) {
  const today = new Date(new Date().toISOString().slice(0, 10));
  return Math.ceil((new Date(expiry).getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [form, setForm] = useState({ license_name: "", expiry_date: "", notes: "" });
  const [error, setError] = useState("");

  async function load() {
    const data = await fetch("/api/licenses").then((x) => x.json());
    setLicenses(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    setError("");
    const res = await fetch("/api/licenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
      return;
    }
    setForm({ license_name: "", expiry_date: "", notes: "" });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/licenses/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <main className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold">Add License / Renewal</h2>
        <p className="mt-1 text-sm text-mist">Track PG licenses like food license, trade license, or fire safety so renewals are never missed.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input placeholder="License name (e.g. Food License)" value={form.license_name} onChange={(e) => setForm((p) => ({ ...p, license_name: e.target.value }))} />
          <Input type="date" value={form.expiry_date} onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))} />
          <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          <Button onClick={add} disabled={!form.license_name || !form.expiry_date}>Add License</Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Licenses</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-mist dark:border-white/10">
                <th className="py-2">License</th><th>Expiry</th><th>Days Left</th><th>Notes</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((l) => {
                const left = daysLeft(l.expiry_date);
                const dueSoon = left <= 60;
                return (
                  <tr key={l.id} className="border-b border-black/5 dark:border-white/5">
                    <td className="py-2">{l.license_name}</td>
                    <td>{l.expiry_date}</td>
                    <td>
                      <span
                        className={
                          dueSoon
                            ? "rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-600 dark:text-amber-300"
                            : "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-300"
                        }
                      >
                        {left < 0 ? `Expired ${Math.abs(left)}d ago` : `${left} days`}
                      </span>
                    </td>
                    <td className="text-mist">{l.notes || "-"}</td>
                    <td>
                      <button className="rounded-lg border border-black/10 px-2 py-1 text-xs dark:border-white/20" onClick={() => remove(l.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!licenses.length && <p className="pt-2 text-sm text-mist">No licenses tracked yet.</p>}
        </div>
      </Card>
    </main>
  );
}
