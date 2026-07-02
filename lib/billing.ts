import { endOfMonth, max, min, parseISO, startOfMonth } from "date-fns";

type LogInput = {
  tenantId: string;
  tenantName: string;
  checkIn: string;
  checkOut: string | null;
};

export type BillSplitResult = {
  tenantId: string;
  tenantName: string;
  daysStayed: number;
  amount: number;
};

export type BillCalculationResult = {
  totalBill: number;
  totalPersonDays: number;
  perPersonDayCost: number;
  roomNumber: string;
  month: string;
  splits: BillSplitResult[];
};

function dayOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysInclusive(start: Date, end: Date) {
  const ms = dayOnly(end).getTime() - dayOnly(start).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

export function getDaysStayedInMonth(checkIn: string, checkOut: string | null, monthISO: string) {
  const monthStart = startOfMonth(parseISO(monthISO));
  const monthEnd = endOfMonth(parseISO(monthISO));
  const inDate = parseISO(checkIn);
  const outDate = checkOut ? parseISO(checkOut) : monthEnd;

  const overlapStart = max([inDate, monthStart]);
  const overlapEnd = min([outDate, monthEnd]);
  if (overlapStart > overlapEnd) return 0;

  return daysInclusive(overlapStart, overlapEnd);
}

export function calculateBillSplit(params: {
  totalBill: number;
  month: string;
  roomNumber: string;
  logs: LogInput[];
}): BillCalculationResult {
  const rows = params.logs
    .map((log) => ({ ...log, daysStayed: getDaysStayedInMonth(log.checkIn, log.checkOut, params.month) }))
    .filter((x) => x.daysStayed > 0);

  const totalPersonDays = rows.reduce((sum, r) => sum + r.daysStayed, 0);
  const perPersonDayCost = totalPersonDays > 0 ? params.totalBill / totalPersonDays : 0;

  const splits: BillSplitResult[] = rows.map((r) => ({
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    daysStayed: r.daysStayed,
    amount: Number((r.daysStayed * perPersonDayCost).toFixed(2))
  }));

  return {
    totalBill: params.totalBill,
    totalPersonDays,
    perPersonDayCost: Number(perPersonDayCost.toFixed(4)),
    roomNumber: params.roomNumber,
    month: params.month,
    splits
  };
}

// ===========================================================================
// Segmented (meter-reading based) billing engine
// ===========================================================================

export type MeterReadingInput = {
  reading_value: number;
  reading_type: string;
  reading_date: string;
  occupancy_log_id: string | null;
};

export type OccupancyLogInput = {
  id: string;
  tenant_id: string;
  bed_id: string | null;
  check_in: string;
  check_out: string | null;
};

export type SegmentResult = {
  startDate: string;
  endDate: string;
  units: number;
  cost: number;
  tenantIds: string[];
};

export type SegmentedBillResult = {
  segments: SegmentResult[];
  tenantTotals: Record<string, number>;
  error?: string;
};

function toDayOnly(value: string) {
  return parseISO(value).getTime();
}

function isWithinMonth(dateISO: string, monthISO: string) {
  const monthStart = startOfMonth(parseISO(monthISO));
  const monthEnd = endOfMonth(parseISO(monthISO));
  const date = parseISO(dateISO);
  return date.getTime() >= monthStart.getTime() && date.getTime() <= monthEnd.getTime();
}

export function calculateSegmentedBill(params: {
  roomId: string;
  month: string;
  totalBill: number;
  readings: MeterReadingInput[];
  occupancyLogs: OccupancyLogInput[];
}): SegmentedBillResult {
  const sortedReadings = [...params.readings].sort(
    (a, b) => toDayOnly(a.reading_date) - toDayOnly(b.reading_date)
  );

  if (sortedReadings.length < 2) {
    return { error: "Missing meter reading for month boundary", segments: [], tenantTotals: {} };
  }

  const readingDates = new Set(sortedReadings.map((r) => r.reading_date));

  for (const log of params.occupancyLogs) {
    if (isWithinMonth(log.check_in, params.month) && !readingDates.has(log.check_in)) {
      return { error: `Missing meter reading for check-in on ${log.check_in}`, segments: [], tenantTotals: {} };
    }
    if (log.check_out && isWithinMonth(log.check_out, params.month) && !readingDates.has(log.check_out)) {
      return { error: `Missing meter reading for check-out on ${log.check_out}`, segments: [], tenantTotals: {} };
    }
  }

  const rawSegments: { startDate: string; endDate: string; units: number }[] = [];
  let totalUnits = 0;

  for (let i = 0; i < sortedReadings.length - 1; i += 1) {
    const current = sortedReadings[i];
    const next = sortedReadings[i + 1];
    const units = next.reading_value - current.reading_value;
    rawSegments.push({ startDate: current.reading_date, endDate: next.reading_date, units });
    totalUnits += units;
  }

  const tenantTotals: Record<string, number> = {};
  const segments: SegmentResult[] = [];

  rawSegments.forEach((segment) => {
    const segmentCost = totalUnits > 0
      ? Number(((segment.units / totalUnits) * params.totalBill).toFixed(2))
      : 0;

    const segmentStart = toDayOnly(segment.startDate);
    const segmentEnd = toDayOnly(segment.endDate);

    const presentTenants = params.occupancyLogs
      .map((log) => {
        const logCheckIn = toDayOnly(log.check_in);
        const logCheckOut = log.check_out ? toDayOnly(log.check_out) : Infinity;
        const overlapStart = Math.max(logCheckIn, segmentStart);
        const overlapEnd = Math.min(logCheckOut, segmentEnd);
        const overlapDays = Math.max(0, Math.floor((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)));
        return { tenantId: log.tenant_id, overlapDays };
      })
      .filter((t) => t.overlapDays > 0);

    const totalSegmentDays = presentTenants.reduce((sum, t) => sum + t.overlapDays, 0);

    presentTenants.forEach((tenant) => {
      const share = totalSegmentDays > 0
        ? Number(((tenant.overlapDays / totalSegmentDays) * segmentCost).toFixed(2))
        : 0;

      tenantTotals[tenant.tenantId] = Number(((tenantTotals[tenant.tenantId] || 0) + share).toFixed(2));
    });

    segments.push({
      startDate: segment.startDate,
      endDate: segment.endDate,
      units: segment.units,
      cost: segmentCost,
      tenantIds: presentTenants.map((t) => t.tenantId)
    });
  });

  return { segments, tenantTotals };
}
