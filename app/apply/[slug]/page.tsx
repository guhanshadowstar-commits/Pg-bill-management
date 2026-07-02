"use client";

import { use, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type RoomOption = { id: string; room_number: string };

export default function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    desired_room_id: "",
    desired_check_in: "",
    id_proof: "",
    notes: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    fetch(`/api/applications?slug=${encodeURIComponent(slug)}&rooms=1`)
      .then(async (res) => {
        if (res.status === 404) {
          setInvalidLink(true);
          return [];
        }
        return res.ok ? res.json() : [];
      })
      .then((data) => setRooms(Array.isArray(data) ? data : []))
      .catch(() => setRooms([]));
  }, [slug]);

  async function submit() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          full_name: form.full_name,
          phone: form.phone || null,
          email: form.email || null,
          desired_room_id: form.desired_room_id || null,
          desired_check_in: form.desired_check_in || null,
          id_proof: form.id_proof || null,
          notes: form.notes || null
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not submit application");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Could not submit application. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (invalidLink) {
    return (
      <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center">
        <Card className="w-full text-center">
          <h2 className="text-2xl font-bold">Link not found</h2>
          <p className="mt-2 text-sm text-mist">This application link is invalid or no longer active. Please ask the PG owner for a fresh link.</p>
        </Card>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center">
        <Card className="w-full text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Application received</p>
          <h2 className="mt-2 text-2xl font-bold">Thank you, {form.full_name.trim()}!</h2>
          <p className="mt-2 text-sm text-mist">
            Your application has been sent to the PG owner. They will contact you on the phone number or email you provided.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center">
      <Card className="w-full">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">PG Tenant Application</p>
          <h2 className="mt-2 text-2xl font-bold">Apply to join this PG</h2>
          <p className="mt-2 text-sm text-mist">Fill in your details below. The owner reviews every application before confirming a bed.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-mist">Full name *</label>
            <Input
              value={form.full_name}
              onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
              placeholder="Your full name"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-mist">Phone</label>
              <Input
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="Mobile number"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-mist">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-mist">Preferred room (optional)</label>
              <Select
                value={form.desired_room_id}
                onChange={(event) => setForm((prev) => ({ ...prev, desired_room_id: event.target.value }))}
              >
                <option value="">No preference</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    Room {room.room_number}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-mist">Desired check-in date</label>
              <Input
                type="date"
                value={form.desired_check_in}
                onChange={(event) => setForm((prev) => ({ ...prev, desired_check_in: event.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-mist">ID proof (type and number)</label>
            <Input
              value={form.id_proof}
              onChange={(event) => setForm((prev) => ({ ...prev, id_proof: event.target.value }))}
              placeholder="example: Aadhaar 1234 5678 9012"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-mist">Notes</label>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Anything else the owner should know"
              rows={3}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none ring-gold/40 placeholder:text-mist focus:ring dark:border-white/15 dark:bg-black/20"
            />
          </div>

          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

          <Button onClick={submit} disabled={!form.full_name.trim() || loading} className="w-full">
            {loading ? "Submitting..." : "Submit application"}
          </Button>
        </div>
      </Card>
    </main>
  );
}
