"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Room = {
  id: string;
  room_number: string;
  sharing_type: number;
  monthly_rent: number | null;
  status: "active" | "inactive";
};

type Bed = {
  id: string;
  room_id: string;
  bed_label: string;
  status: "vacant" | "occupied" | "reserved" | "maintenance";
};

const STATUS_BADGE: Record<Bed["status"], string> = {
  vacant: "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-300",
  occupied: "rounded-full bg-gold/10 px-2 py-1 text-xs text-gold dark:text-gold",
  reserved: "rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-600 dark:text-amber-300",
  maintenance: "rounded-full bg-black/5 px-2 py-1 text-xs text-mist dark:bg-white/10"
};

const STATUS_OPTIONS: Bed["status"][] = ["vacant", "occupied", "reserved", "maintenance"];

export default function BedsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [rentEdits, setRentEdits] = useState<Record<string, string>>({});
  const [bedLabel, setBedLabel] = useState<Record<string, string>>({});

  async function load() {
    const [r, b] = await Promise.all([
      fetch("/api/rooms").then((x) => x.json()),
      fetch("/api/beds").then((x) => x.json())
    ]);
    setRooms(Array.isArray(r) ? r : []);
    setBeds(Array.isArray(b) ? b : []);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveRent(room: Room) {
    const value = rentEdits[room.id];
    if (value === undefined) return;
    await fetch(`/api/rooms/${room.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthly_rent: value ? Number(value) : null })
    });
    setRentEdits((p) => {
      const next = { ...p };
      delete next[room.id];
      return next;
    });
    await load();
  }

  async function addBed(room: Room) {
    const label = (bedLabel[room.id] || "").trim();
    if (!label) return;
    await fetch("/api/beds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id: room.id, bed_label: label, status: "vacant" })
    });
    setBedLabel((p) => ({ ...p, [room.id]: "" }));
    await load();
  }

  async function changeStatus(bed: Bed, status: Bed["status"]) {
    await fetch(`/api/beds/${bed.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    await load();
  }

  return (
    <main className="space-y-4">
      {rooms.map((room) => {
        const roomBeds = beds.filter((bed) => bed.room_id === room.id);
        const rentValue = rentEdits[room.id] ?? (room.monthly_rent != null ? String(room.monthly_rent) : "");

        return (
          <Card key={room.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Room {room.room_number}</h2>
                <p className="text-xs text-mist">{room.sharing_type}-sharing</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Monthly Rent"
                  className="w-40"
                  value={rentValue}
                  onChange={(e) => setRentEdits((p) => ({ ...p, [room.id]: e.target.value }))}
                />
                <Button onClick={() => saveRent(room)} disabled={rentEdits[room.id] === undefined}>
                  Save Rent
                </Button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-mist dark:border-white/10">
                    <th className="py-2">Bed</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {roomBeds.map((bed) => (
                    <tr key={bed.id} className="border-b border-black/5 dark:border-white/5">
                      <td className="py-2">{bed.bed_label}</td>
                      <td>
                        <span className={STATUS_BADGE[bed.status]}>{bed.status}</span>
                      </td>
                      <td>
                        <select
                          value={bed.status}
                          onChange={(e) => changeStatus(bed, e.target.value as Bed["status"])}
                          className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs dark:border-white/20 dark:bg-black/20"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {!roomBeds.length && (
                    <tr>
                      <td colSpan={3} className="py-2 text-mist">
                        No beds yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Bed label (e.g. A1)"
                value={bedLabel[room.id] || ""}
                onChange={(e) => setBedLabel((p) => ({ ...p, [room.id]: e.target.value }))}
              />
              <Button onClick={() => addBed(room)} disabled={!(bedLabel[room.id] || "").trim()}>
                Add Bed
              </Button>
            </div>
          </Card>
        );
      })}
      {!rooms.length && (
        <Card>
          <p className="text-sm text-mist">No rooms yet. Add a room first.</p>
        </Card>
      )}
    </main>
  );
}
