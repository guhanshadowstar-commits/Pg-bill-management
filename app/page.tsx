"use client";

import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card } from "@/components/ui/card";

type DashboardResponse = {
  total_rooms: number;
  active_tenants: number;
  pending_payments: number;
  monthly_revenue: number;
  recent_bills: {
    id: string;
    bill_month: string;
    total_amount: number;
    rooms: { room_number: string };
  }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData).catch(() => setData(null));
  }, []);

  const monthLabel = useMemo(() => new Date().toLocaleString("en-IN", { month: "long", year: "numeric" }), []);

  return (
    <main className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Total Rooms" value={String(data?.total_rooms ?? "--")} />
        <StatCard label="Active Tenants" value={String(data?.active_tenants ?? "--")} />
        <StatCard label={`Revenue (${monthLabel})`} value={data ? `₹${data.monthly_revenue}` : "--"} />
        <StatCard label="Pending Payments" value={String(data?.pending_payments ?? "--")} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Recent Bills</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-mist dark:border-white/10">
                  <th className="py-2">Room</th>
                  <th>Month</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent_bills || []).map((bill) => (
                  <tr key={bill.id} className="border-b border-black/5 dark:border-white/5">
                    <td className="py-2">{bill.rooms.room_number}</td>
                    <td>{bill.bill_month.slice(0, 7)}</td>
                    <td>₹{bill.total_amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.recent_bills?.length && <p className="pt-2 text-sm text-mist">No bills generated yet.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">How It Calculates</h2>
          <p className="text-sm text-mist">Individual Bill = (Days Stayed / Total Person-Days) × Total Electricity Bill</p>
          <div className="mt-4 rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
            <p>Example: Bill ₹4000, Person-Days 85</p>
            <p>Per Person-Day = ₹47.0588</p>
          </div>
        </Card>
      </section>
    </main>
  );
}
