"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Occupancy = {
  id: string;
  tenant_id: string;
  check_in: string;
  check_out: string | null;
  rooms: { room_number: string };
  tenants: { full_name: string };
};

type VacancyRow = {
  id: string;
  requested_vacate_date: string;
  notice_given_date: string;
  notice_days_required: number;
  advance_refund_eligible: boolean;
  status: "pending" | "approved" | "completed" | "cancelled";
  tenants: { full_name: string } | null;
  occupancy_logs: { check_in: string; rooms: { room_number: string } | null } | null;
};

const statusStyles: Record<VacancyRow["status"], string> = {
  pending: "rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-600 dark:text-amber-300",
  approved: "rounded-full bg-sky-500/10 px-2 py-1 text-xs text-sky-600 dark:text-sky-300",
  completed: "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-300",
  cancelled: "rounded-full bg-black/5 px-2 py-1 text-xs text-mist dark:bg-white/10"
};

export default function VacancyPage() {
  const [occupancy, setOccupancy] = useState<Occupancy[]>([]);
  const [rows, setRows] = useState<VacancyRow[]>([]);
  const [form, setForm] = useState({ occupancy_log_id: "", requested_vacate_date: "", notice_given_date: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");

  async function load() {
    const [logs, requests] = await Promise.all([
      fetch("/api/occupancy").then((res) => res.json()),
      fetch("/api/vacancy").then((res) => res.json())
    ]);
    setOccupancy(Array.isArray(logs) ? logs.filter((log: Occupancy) => !log.check_out) : []);
    setRows(Array.isArray(requests) ? requests : []);
  }

  useEffect(() => {
    load().catch(() => setError("Could not load vacancy requests"));
  }, []);

  const selectedLog = useMemo(
    () => occupancy.find((log) => log.id === form.occupancy_log_id) || null,
    [occupancy, form.occupancy_log_id]
  );

  async function submit() {
    if (!selectedLog) return;
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/vacancy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: selectedLog.tenant_id,
          occupancy_log_id: selectedLog.id,
          requested_vacate_date: form.requested_vacate_date,
          notice_given_date: form.notice_given_date || undefined
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not create vacancy request");
        return;
      }

      setForm({ occupancy_log_id: "", requested_vacate_date: "", notice_given_date: "" });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function act(id: string, action: "approve" | "complete" | "cancel") {
    setError("");
    setBusyId(id);

    try {
      const res = await fetch(`/api/vacancy/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Could not ${action} request`);
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
        <h2 className="text-lg font-semibold">New Vacancy Request</h2>
        <p className="mt-1 text-sm text-mist">
          Record a tenant&apos;s notice to vacate. Advance refund eligibility is calculated from your notice period setting.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-mist">Tenant (active stay)</label>
            <Select
              value={form.occupancy_log_id}
              onChange={(event) => setForm((prev) => ({ ...prev, occupancy_log_id: event.target.value }))}
            >
              <option value="">Select tenant</option>
              {occupancy.map((log) => (
                <option key={log.id} value={log.id}>
                  {log.tenants.full_name} — Room {log.rooms.room_number}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-mist">Requested vacate date</label>
            <Input
              type="date"
              value={form.requested_vacate_date}
              onChange={(event) => setForm((prev) => ({ ...prev, requested_vacate_date: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-mist">Notice given date (default today)</label>
            <Input
              type="date"
              value={form.notice_given_date}
              onChange={(event) => setForm((prev) => ({ ...prev, notice_given_date: event.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={submit} disabled={!form.occupancy_log_id || !form.requested_vacate_date || saving} className="w-full">
              {saving ? "Saving..." : "Create request"}
            </Button>
          </div>
        </div>

        {error && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Vacancy Requests</h2>
        <p className="mt-1 text-sm text-mist">
          Completing a request only closes the notice. Do the actual checkout (meter reading + bed release) from the Tenants page.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-mist dark:border-white/10">
                <th className="py-2">Tenant</th>
                <th>Room</th>
                <th>Notice given</th>
                <th>Vacate date</th>
                <th>Required days</th>
                <th>Advance refund eligible</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-2 font-medium">{row.tenants?.full_name || "-"}</td>
                  <td>{row.occupancy_logs?.rooms?.room_number ? `Room ${row.occupancy_logs.rooms.room_number}` : "-"}</td>
                  <td>{row.notice_given_date}</td>
                  <td>{row.requested_vacate_date}</td>
                  <td>{row.notice_days_required}</td>
                  <td>
                    <span
                      className={
                        row.advance_refund_eligible
                          ? "rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300"
                          : "rounded-full bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-300"
                      }
                    >
                      {row.advance_refund_eligible ? "Yes" : "No"}
                    </span>
                  </td>
                  <td>
                    <span className={statusStyles[row.status]}>{row.status}</span>
                  </td>
                  <td>
                    <div className="flex gap-2 py-1">
                      {row.status === "pending" && (
                        <>
                          <Button onClick={() => act(row.id, "approve")} disabled={busyId === row.id} className="px-3 py-1 text-xs">
                            Approve
                          </Button>
                          <Button
                            onClick={() => act(row.id, "cancel")}
                            disabled={busyId === row.id}
                            className="bg-red-500/80 px-3 py-1 text-xs text-white"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {row.status === "approved" && (
                        <Button onClick={() => act(row.id, "complete")} disabled={busyId === row.id} className="px-3 py-1 text-xs">
                          Mark completed
                        </Button>
                      )}
                      {(row.status === "completed" || row.status === "cancelled") && <span className="text-xs text-mist">-</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="pt-4 text-sm text-mist">No vacancy requests yet.</p>}
        </div>
      </Card>
    </main>
  );
}
