export type OwnerAccount = {
  id: string;
  username: string;
  email: string | null;
  password_hash: string;
  created_at: string;
};

export type Room = {
  id: string;
  owner_id: string;
  room_number: string;
  sharing_type: number;
  meter_number: string | null;
  status: "active" | "inactive";
  created_at: string;
};

export type Tenant = {
  id: string;
  owner_id: string;
  full_name: string;
  phone: string | null;
  payment_status: "pending" | "paid" | "partial";
  created_at: string;
};

export type OccupancyLog = {
  id: string;
  owner_id: string;
  room_id: string;
  tenant_id: string;
  check_in: string;
  check_out: string | null;
  created_at: string;
};

export type ElectricityBill = {
  id: string;
  owner_id: string;
  room_id: string;
  bill_month: string;
  total_amount: number;
  total_person_days: number;
  per_person_day_cost: number;
  created_at: string;
};

export type BillSplit = {
  id: string;
  owner_id: string;
  bill_id: string;
  tenant_id: string;
  days_stayed: number;
  amount: number;
  status: "pending" | "paid" | "partial";
  created_at: string;
};

export type Payment = {
  id: string;
  owner_id: string;
  bill_split_id: string;
  paid_amount: number;
  payment_date: string;
  status: "pending" | "paid" | "partial";
  method: string;
  txn_ref: string | null;
  created_at: string;
};

export type DBShape = {
  owner_accounts: OwnerAccount[];
  rooms: Room[];
  tenants: Tenant[];
  occupancy_logs: OccupancyLog[];
  electricity_bills: ElectricityBill[];
  bill_splits: BillSplit[];
  payments: Payment[];
};
