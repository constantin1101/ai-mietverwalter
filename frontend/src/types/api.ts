// Auto-mirrors the backend Pydantic response models

export interface StaffelAlert {
  unit_id: string;
  address: string;
  tenant_name: string;
  current_rent: number;
  next_rent: number;
  next_date: string;
  days_until: number;
}

export interface IndexAlert {
  unit_id: string;
  address: string;
  tenant_name: string;
  current_rent: number;
  index_type: string;
  base_date: string | null;
  interval_months: number;
  months_since_base: number;
}

export interface TrackersResponse {
  staffel_alerts: StaffelAlert[];
  index_alerts: IndexAlert[];
}

export interface DeadlineCard {
  id: string;
  title: string;
  due_date: string;
  deadline_type: string;
  is_completed: boolean;
  unit_id: string | null;
  address: string | null;
  tenant_name: string | null;
}

export interface DocumentCard {
  id: string;
  filename: string;
  document_type: string;
  status: string;
  created_at: string;
  file_size_bytes: number | null;
  unit_id: string | null;
  street: string | null;
  house_number: string | null;
  city: string | null;
  unit_number: string | null;
  primary_tenant_name: string | null;
}

export interface PortfolioKPIs {
  total_units: number;
  total_monthly_rent: number;
  avg_rent_per_sqm: number | null;
  upcoming_deadlines: number;
}

export interface UnitCard {
  id: string;
  property_id: string;
  street: string;
  house_number: string;
  city: string;
  postal_code: string;
  unit_number: string | null;
  floor: number | null;
  area_sqm: number | null;
  rooms: number | null;
  has_cellar: boolean;
  has_parking: boolean;
  lease_id: string;
  base_rent: number;
  operating_costs: number | null;
  rent_type: "fixed" | "indexed" | "graduated";
  primary_tenant_name: string;
  primary_tenant_email: string | null;
}

export interface TenantSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}

export interface LeaseSummary {
  id: string;
  start_date: string;
  end_date: string | null;
  is_fixed_term: boolean;
  notice_period_months: number;
  base_rent: number;
  operating_costs: number | null;
  deposit: number | null;
  payment_day: number;
  payment_method: string | null;
  rent_type: string;
  cosmetic_repairs_clause: string | null;
  pets_allowed: boolean | null;
  subletting_allowed: boolean | null;
}

export interface PropertySummary {
  id: string;
  street: string;
  house_number: string;
  city: string;
  postal_code: string;
}

export interface Deadline {
  id: string;
  title: string;
  due_date: string;
  deadline_type: string;
  is_completed: boolean;
  notify_days_before: number[];
}

export interface Document {
  id: string;
  filename: string;
  document_type: string;
  status: string;
  created_at: string;
  file_size_bytes: number | null;
}

export interface UnitDetail {
  id: string;
  property: PropertySummary;
  unit_number: string | null;
  floor: number | null;
  area_sqm: number | null;
  rooms: number | null;
  has_cellar: boolean;
  has_parking: boolean;
  parking_number: string | null;
  lease: LeaseSummary;
  tenants: TenantSummary[];
  deadlines: Deadline[];
  documents: Document[];
}
