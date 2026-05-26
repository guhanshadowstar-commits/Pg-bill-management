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
