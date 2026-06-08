"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type HistoryRow = {
  id: string;
  check_in: string;
  check_out: string | null;
  days_stayed: number;
  rooms: { room_number: string };
  tenants: { full_name: string; phone: string | null };
};

type HistoryResponse = {
  from: string;
  to: string;
  total_records: number;
  active_records: number;
  checked_out_records: number;
  rows: HistoryRow[];
};

export default function HistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    fetch("/api/history").then((res) => res.json()).then(setData).catch(() => setData(null));
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.rows || []).filter((row) => {
      const matchesQuery =
        !q ||
        row.tenants.full_name.toLowerCase().includes(q) ||
        row.rooms.room_number.toLowerCase().includes(q) ||
        (row.tenants.phone || "").toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? !row.check_out : Boolean(row.check_out));
      return matchesQuery && matchesStatus;
    });
  }, [data?.rows, query, status]);

  return (
    <main className="space-y-4">
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-mist">Saved records</p>
          <p className="mt-2 text-3xl font-bold">{data?.total_records ?? "--"}</p>
          <p className="mt-1 text-xs text-mist">Last 3 years: {data ? `${data.from} to ${data.to}` : "loading"}</p>
        </Card>
        <Card>
          <p className="text-sm text-mist">Currently staying</p>
          <p className="mt-2 text-3xl font-bold text-emerald-500">{data?.active_records ?? "--"}</p>
          <p className="mt-1 text-xs text-mist">No checkout date yet</p>
        </Card>
        <Card>
          <p className="text-sm text-mist">Checked out</p>
          <p className="mt-2 text-3xl font-bold text-gold">{data?.checked_out_records ?? "--"}</p>
          <p className="mt-1 text-xs text-mist">Past incomers/outgoers saved</p>
        </Card>
      </section>

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Incomer and Outgoer History</h2>
            <p className="mt-1 text-sm text-mist">This is the permanent stay record used for future EB bill calculations.</p>
          </div>
          <div className="grid gap-2 md:w-[420px] md:grid-cols-2">
            <Input placeholder="Search tenant, room, phone" value={query} onChange={(event) => setQuery(event.target.value)} />
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All records</option>
              <option value="active">Active only</option>
              <option value="out">Checked out only</option>
            </Select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-mist dark:border-white/10">
                <th className="py-2">Tenant</th>
                <th>Phone</th>
                <th>Room</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-2 font-medium">{row.tenants.full_name}</td>
                  <td>{row.tenants.phone || "-"}</td>
                  <td>Room {row.rooms.room_number}</td>
                  <td>{row.check_in}</td>
                  <td>{row.check_out || "Active"}</td>
                  <td>{row.days_stayed}</td>
                  <td>
                    <span className={row.check_out ? "rounded-full bg-black/5 px-2 py-1 text-xs text-mist dark:bg-white/10" : "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-300"}>
                      {row.check_out ? "Checked out" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="pt-4 text-sm text-mist">No history found for this filter.</p>}
        </div>
      </Card>
    </main>
  );
}
