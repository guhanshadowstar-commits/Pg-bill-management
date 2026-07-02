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

type RemindersResponse = {
  unpaidEb: { id: string; tenant_name: string; room_number: string; bill_month: string | null; amount_due: number }[];
  unpaidRent: { id: string; tenant_name: string; room_number: string; charge_month: string | null; amount_due: number }[];
  licensesDueSoon: { id: string; license_name: string; expiry_date: string; days_left: number }[];
  pendingGuests: { id: string; guest_name: string; tenant_name: string; start_date: string; end_date: string }[];
};

function ReminderCard({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        <span
          className={
            count > 0
              ? "rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-600 dark:text-amber-300"
              : "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-300"
          }
        >
          {count}
        </span>
      </div>
      <div className="mt-2 space-y-1 text-sm text-mist">{children}</div>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [reminders, setReminders] = useState<RemindersResponse | null>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData).catch(() => setData(null));
    fetch("/api/reminders").then((r) => r.json()).then((d) => setReminders(d?.unpaidEb ? d : null)).catch(() => setReminders(null));
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <ReminderCard title="Unpaid EB" count={reminders?.unpaidEb.length ?? 0}>
          {(reminders?.unpaidEb || []).slice(0, 5).map((r) => (
            <p key={r.id}>{r.tenant_name} · Room {r.room_number} · ₹{r.amount_due}</p>
          ))}
          {!reminders?.unpaidEb.length && <p>All EB splits are paid.</p>}
        </ReminderCard>
        <ReminderCard title="Unpaid Rent" count={reminders?.unpaidRent.length ?? 0}>
          {(reminders?.unpaidRent || []).slice(0, 5).map((r) => (
            <p key={r.id}>{r.tenant_name} · Room {r.room_number} · ₹{r.amount_due}</p>
          ))}
          {!reminders?.unpaidRent.length && <p>All rent is collected.</p>}
        </ReminderCard>
        <ReminderCard title="Licenses Due" count={reminders?.licensesDueSoon.length ?? 0}>
          {(reminders?.licensesDueSoon || []).slice(0, 5).map((l) => (
            <p key={l.id}>{l.license_name} · {l.days_left < 0 ? "expired" : `${l.days_left}d left`}</p>
          ))}
          {!reminders?.licensesDueSoon.length && <p>No renewals due in 60 days.</p>}
        </ReminderCard>
        <ReminderCard title="Guest Requests" count={reminders?.pendingGuests.length ?? 0}>
          {(reminders?.pendingGuests || []).slice(0, 5).map((g) => (
            <p key={g.id}>{g.guest_name} → {g.tenant_name}</p>
          ))}
          {!reminders?.pendingGuests.length && <p>No pending guest requests.</p>}
        </ReminderCard>
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
            <p>Enter the real monthly EB bill and the app counts each tenant's actual stay days.</p>
            <p>Empty beds are not charged because only occupied person-days are counted.</p>
          </div>
        </Card>
      </section>
    </main>
  );
}
