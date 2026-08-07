export const PRICE_UNITS = [
  { value: "fixed", label: "Fixed price" },
  { value: "hour", label: "Per hour" },
  { value: "day", label: "Per day" },
  { value: "visit", label: "Per visit" },
  { value: "sqft", label: "Per sq.ft" },
  { value: "quote", label: "On request / quote" },
];

export const REQUEST_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const priceUnitLabel = (unit?: string | null) =>
  PRICE_UNITS.find((u) => u.value === unit)?.label ?? "Fixed price";

export const statusLabel = (status?: string | null) =>
  REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status ?? "—";

export const formatServicePrice = (price: number, unit?: string | null) => {
  if (unit === "quote" || !price) return "On request";
  const suffix =
    unit === "hour" ? " / hour" : unit === "day" ? " / day" : unit === "visit" ? " / visit" : unit === "sqft" ? " / sq.ft" : "";
  return `₹${price}${suffix}`;
};

export interface UtilityCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface UtilityService {
  id: string;
  provider_user_id: string | null;
  category_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  price_unit: string;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  coverage_area: string | null;
  local_body_id: string | null;
  ward_number: number | null;
  is_active: boolean;
  is_approved: boolean;
  sort_order: number;
  created_at: string;
}

export interface UtilityRequest {
  id: string;
  service_id: string;
  customer_user_id: string | null;
  contact_name: string;
  contact_phone: string;
  address: string | null;
  preferred_date: string | null;
  notes: string | null;
  status: string;
  admin_notes: string | null;
  quoted_amount: number | null;
  created_at: string;
}