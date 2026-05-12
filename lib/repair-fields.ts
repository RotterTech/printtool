/**
 * Centralized repair field definitions.
 * Single source of truth for all repair form fields.
 * Used by: RepairForm, EditRepairForm, API routes, dashboard tables, detail pages.
 */

export const REPAIR_STATUSES = [
  "Nieuw",
  "Besteld",
  "In reparatie",
  "Reparatie klaar",
  "Afgehaald",
  "Geannuleerd",
] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number];

/** Shape of a repair record as stored in the database */
export type RepairRecord = {
  id: string;
  job_id: string;
  // Name fields (new split)
  first_name: string;
  last_name: string;
  // Legacy combined name (kept for backward compat, computed on save)
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  klantnummer: string;
  adres: string;
  woonplaats: string;
  device_brand: string;
  device_model: string;
  device_type: string;
  device_password: string;
  serial_number: string;
  problem_description: string;
  status: string;
  onderdeel_besteld: boolean;
  onderdeel_naam: string;
  onderdeel_leverancier: string;
  datum_in: string;
  datum_uit: string | null;
  agreed_price: number | null;
  kosten: number | string | null;
  accessories: { type: string; label: string; quantity: number; notes: string }[];
  send_to_wefact: boolean;
  created_at: string;
  company_id: string | null;
  // Legacy aliases
  jobid?: string;
};

/**
 * Build a full display name from first_name + last_name.
 * Falls back to customer_name for old records.
 */
export function getDisplayName(repair: Record<string, any>): string {
  const first = repair.first_name?.trim() || "";
  const last = repair.last_name?.trim() || "";
  if (first || last) return `${first} ${last}`.trim();
  // Fallback chain for legacy data
  return (
    repair.customer_name ||
    repair.klant ||
    repair.CompanyName ||
    ((repair.FirstName || repair.Initials || "") + " " + (repair.Surname || repair.SurName || "")).trim() ||
    "Onbekende naam"
  );
}

/**
 * Compute customer_name from first_name + last_name for DB storage.
 */
export function computeCustomerName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}
