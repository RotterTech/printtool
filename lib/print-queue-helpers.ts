/**
 * Print queue helper functions for all label types.
 * Each function sends a print job to /api/print-queue.
 */

type QueueResult = { success: boolean; error?: string };

async function sendToQueue(
  job_type: string,
  reference_id: string,
  label_data: Record<string, unknown>
): Promise<QueueResult> {
  const res = await fetch("/api/print-queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_type, reference_id, label_data }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || "Printen mislukt" };
  return { success: true };
}

/** Queue a repair label (matches renderRepairLabel field names) */
export async function queueRepairLabel(repair: {
  job_id?: string;
  jobid?: string;
  jobId?: string;
  id?: string;
  first_name?: string;
  last_name?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  device_brand?: string;
  device_model?: string;
  serial_number?: string;
  created_at?: string;
  problem_description?: string;
  agreed_price?: string;
}): Promise<QueueResult> {
  const jobId =
    repair.job_id || repair.jobid || repair.jobId || repair.id || "—";
  const firstName = repair.first_name || "";
  const lastName = repair.last_name || "";
  const klant =
    (firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : repair.customer_name) || "Klant";

  return sendToQueue("repair_label", jobId, {
    jobId,
    klant,
    email: repair.customer_email || "",
    telefoon: repair.customer_phone || "",
    merk: repair.device_brand || "",
    model: repair.device_model || "",
    serial: repair.serial_number || "",
    datum: repair.created_at || new Date().toISOString(),
    probleem: repair.problem_description || "",
    prijs: repair.agreed_price || "",
  });
}

/** Queue a part label (matches renderPartLabel field names) */
export async function queuePartLabel(part: {
  id?: string;
  short_id?: string;
  part_id?: string;
  category?: string;
  part_type?: string;
  brand?: string;
  source_brand?: string;
  model?: string;
  source_model?: string;
  specs?: string;
  part_specs?: string;
  serial_number?: string;
  part_serial?: string;
  note?: string;
  part_notes?: string;
  quantity?: number;
}): Promise<QueueResult> {
  const displayId = part.short_id || part.part_id || part.id || "?";
  return sendToQueue("part_label", displayId, {
    short_id: part.short_id || "",
    displayId,
    category: part.category || part.part_type || "Onderdeel",
    brand: part.brand || part.source_brand || "",
    model: part.model || part.source_model || "",
    specs: part.specs || part.part_specs || "",
    serial_number: part.serial_number || part.part_serial || "",
    note: part.note || part.part_notes || "",
    quantity: part.quantity || 1,
  });
}

/** Queue a refurbished label (matches renderRefurbishedLabel field names) */
export async function queueRefurbishedLabel(laptop: {
  id?: string;
  brand: string;
  model: string;
  cpu?: string;
  ram?: string;
  ssd?: string;
  screen?: string;
  graphics?: string;
  ports?: string[];
  os?: string;
  price?: string;
  origin?: string;
}): Promise<QueueResult> {
  return sendToQueue("refurbished_label", laptop.id || "?", {
    id: laptop.id || "",
    brand: laptop.brand,
    model: laptop.model,
    cpu: laptop.cpu || "",
    ram: laptop.ram || "",
    ssd: laptop.ssd || "",
    screen: laptop.screen || "",
    graphics: laptop.graphics || "",
    ports: laptop.ports || [],
    os: laptop.os || "",
    price: laptop.price || "",
    origin: laptop.origin || "",
  });
}

/** Queue an APK label (matches renderApkLabel field names) */
export async function queueApkLabel(job: {
  id?: string;
  job_id?: string;
  customer_name?: string;
  device_brand?: string;
  device_model?: string;
  performed_by?: string;
  created_at?: string;
  checklist_data?: Record<string, unknown>;
}): Promise<QueueResult> {
  const jobId = job.job_id || job.id || "—";
  return sendToQueue("apk_label", jobId, {
    job_id: jobId,
    customer_name: job.customer_name || "",
    device_brand: job.device_brand || "",
    device_model: job.device_model || "",
    performed_by: job.performed_by || "",
    datum: job.created_at || new Date().toISOString(),
    checklist_data: job.checklist_data || {},
  });
}

/** Queue an accessory label (matches renderAccessoryLabel field names) */
export async function queueAccessoryLabel(acc: {
  type: string;
  label: string;
  quantity?: number;
  notes?: string;
  jobId: string;
  customerName: string;
}): Promise<QueueResult> {
  return sendToQueue("accessory_label", acc.jobId, {
    type: acc.type,
    label: acc.label,
    quantity: acc.quantity || 1,
    notes: acc.notes || "",
    jobId: acc.jobId,
    customerName: acc.customerName,
  });
}
