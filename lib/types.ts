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
  monthly_rent: number | null;
  status: "active" | "inactive";
  created_at: string;
};

export type Bed = {
  id: string;
  owner_id: string;
  room_id: string;
  bed_label: string;
  status: "vacant" | "occupied" | "reserved" | "maintenance";
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
  bed_id: string | null;
  check_in: string;
  check_out: string | null;
  created_at: string;
};

export type RoomMeterReading = {
  id: string;
  owner_id: string;
  room_id: string;
  occupancy_log_id: string | null;
  reading_value: number;
  reading_type: "checkin" | "checkout" | "month_end";
  reading_date: string;
  created_at: string;
};

export type RentCharge = {
  id: string;
  owner_id: string;
  room_id: string;
  charge_month: string;
  total_rent: number;
  occupant_count: number;
  per_tenant_amount: number;
  created_at: string;
};

export type RentPayment = {
  id: string;
  owner_id: string;
  rent_charge_id: string;
  tenant_id: string;
  paid_amount: number;
  status: "pending" | "partial" | "paid";
  paid_at: string | null;
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

export type OwnerSettings = {
  id: string;
  owner_id: string;
  vacancy_notice_days: number;
  guest_policy_text: string | null;
  apply_slug: string | null;
  created_at: string;
};

export type TenantApplication = {
  id: string;
  owner_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  desired_room_id: string | null;
  desired_check_in: string | null;
  id_proof: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type VacancyRequest = {
  id: string;
  owner_id: string;
  tenant_id: string | null;
  occupancy_log_id: string | null;
  requested_vacate_date: string;
  notice_given_date: string;
  notice_days_required: number;
  advance_refund_eligible: boolean;
  status: "pending" | "approved" | "completed" | "cancelled";
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
