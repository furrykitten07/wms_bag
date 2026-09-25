/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  SUPER_ADMIN = "Super Admin",
  KEPALA_GUDANG = "Kepala Gudang",
  WAREHOUSE_STAFF = "Petugas Gudang",
  WAREHOUSE_ADMIN = "Warehouse Admin",
  VERIFIER_RENDALHAR = "Verifikator Rendalhar",
  LOGISTICS_MANAGER = "Manager Logistik",
  VP_RENDALHAR = "VP RENDALHAR",
  SUPERINTENDENT = "Superintendent",
  VESSEL_CREW = "Vessel Crew",
}

export function normalizeUserRole(rawRole: any): UserRole {
  if (!rawRole) return UserRole.WAREHOUSE_ADMIN;
  const roleStr = String(rawRole).trim();
  const normalized = roleStr.toUpperCase().replace(/[\s_-]+/g, "_");

  if (normalized.includes("SUPER_ADMIN") || normalized === "SUPERADMIN") return UserRole.SUPER_ADMIN;
  if (normalized.includes("KEPALA_GUDANG") || normalized.includes("KEPALA")) return UserRole.KEPALA_GUDANG;
  if (normalized.includes("PETUGAS") || normalized.includes("STAFF_GUDANG") || normalized === "WAREHOUSE_STAFF") return UserRole.WAREHOUSE_STAFF;
  if (normalized.includes("VERIFIER") || (normalized.includes("RENDALHAR") && (normalized.includes("L1") || normalized.includes("VERIFIKATOR")))) return UserRole.VERIFIER_RENDALHAR;
  if (normalized.includes("LOGISTICS") || normalized.includes("MANAGER") || normalized.includes("EMIR")) return UserRole.LOGISTICS_MANAGER;
  if (normalized.includes("VP") || normalized.includes("RENDALHAR")) return UserRole.VP_RENDALHAR;
  if (normalized.includes("SUPERINTENDENT")) return UserRole.SUPERINTENDENT;
  if (normalized.includes("VESSEL") || normalized.includes("CREW") || normalized.includes("KAPAL")) return UserRole.VESSEL_CREW;
  if (normalized.includes("ADMIN")) return UserRole.WAREHOUSE_ADMIN;

  const enumValues = Object.values(UserRole);
  const found = enumValues.find(v => v.toLowerCase() === roleStr.toLowerCase());
  if (found) return found;

  return UserRole.WAREHOUSE_ADMIN;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  vesselName?: string; // Applicable for Vessel Crew
  password?: string;
}

export interface Vendor {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
}

export interface WarehouseLocation {
  id: string;
  code: string; // e.g. WH-JKT-A-R01-S02-B01
  warehouse: string; // e.g. "Jakarta HQ"
  zone: string; // e.g. "Zone A"
  rack: string; // e.g. "Rack 01"
  shelf: string; // e.g. "Shelf 02"
  bin: string; // e.g. "Bin 01"
}

export interface SparePart {
  id: string;
  sku: string;
  part_number: string;
  part_name: string;
  alternative_part_number?: string;
  category: string;
  vendor_id: string;
  vessel_compatibility: string; // comma-separated or descriptive text
  unit: string; // e.g. "PCS", "PCS", "SET", "KG"
  brand: string;
  maker: string;
  minimum_stock: number;
  maximum_stock: number;
  reorder_point: number;
  current_stock: number;
  reserved_stock: number;
  location_id: string; // warehouse location code or id
  barcode: string;
  qr_code: string;
  qr_slug?: string;
  qr_url?: string;
  public_item_slug?: string;
  qr_generated_date?: string;
  specification?: string;
  model?: string;
  item_status?: string;
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size?: string;
    uploaded_at?: string;
  }[];
  image_url?: string;
  description?: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export enum TransactionType {
  RECEIVING = "Inbound Receiving",
  DISPATCH = "Outbound Dispatch",
  VESSEL_CONSUMPTION = "Vessel Supply",
  STOCK_ADJUSTMENT = "Stock Adjustment",
  LOCATION_TRANSFER = "Location Transfer",
  RETURN = "Material Return",
}

export interface MovementLedgerEntry {
  id: string;
  transaction_type: TransactionType;
  spare_part_id: string;
  spare_part_name: string;
  part_number: string;
  source_location?: string;
  destination_location?: string;
  qty_in: number;
  qty_out: number;
  before_stock: number;
  after_stock: number;
  reference_number: string; // PO number or Vessel Request number
  remarks?: string;
  transaction_date: string;
  created_by: string;
}

export enum ReceivingStatus {
  PENDING = "Pending",
  ACCEPTED = "Accepted",
  PARTIAL_REJECT = "Partial Reject",
  FULL_REJECT = "Full Reject",
  VERIFIED = "Verified",
}

export interface InboundReceiving {
  id: string;
  purchase_order_num: string;
  delivery_note_num: string;
  spk_number?: string;
  spk_id?: string;
  vendor_id: string;
  vendor_name: string;
  items: Array<{
    spare_part_id: string;
    spare_part_name: string;
    part_name?: string;
    part_number: string;
    unit?: string;
    qty_ordered: number;
    qty_spk?: number;
    qty_received: number;
    qty_rejected: number;
    qc_status: "Verified" | "Rejected" | "Pending" | "Approved";
    status?: string;
    reject_reason?: string;
    item_matched?: "Sesuai" | "Tidak Sesuai" | boolean;
    qty_matched_status?: string;
    keeper_notes?: string;
    photo_url?: string;
  }>;
  status: ReceivingStatus;
  keeper_notes?: string;
  reject_reason?: string;
  return_note_num?: string;
  photo_evidence_url?: string;
  signature_data_url?: string;
  received_date: string;
  completion_date?: string;
  verified_at?: string;
  audit_logs?: Array<{
    timestamp: string;
    username: string;
    action: string;
    notes?: string;
    status_before?: string;
    status_after?: string;
  }>;
  created_at?: string;
  created_by: string;
  received_by?: string;
}

export enum DispatchStatus {
  WAITING = "Waiting",
  PICKING = "Picking",
  PACKED = "Packed",
  DISPATCHED = "Dispatched",
  DELIVERED = "Delivered",
  DRAFT = "Draft",
  READY_TO_DISPATCH = "Ready To Dispatch",
  COMPLETED = "Completed",
  IN_TRANSIT = "In Transit",
}

export interface OutboundDispatch {
  id: string;
  request_reference?: string; // Vessel request ID or Sales/WMS code
  vessel_name: string;
  consignee?: string;
  items: Array<{
    spare_part_id: string;
    spare_part_name: string;
    part_number: string;
    qty_requested?: number;
    qty_dispatched?: number;
    unit: string;
    unit_price?: number;
    qty_approved?: number;
    qty_remaining?: number;
    avg_monthly_usage?: number;
    remaining_stock?: number;
    requested_qty?: number;
    item_status?: string;
    notes?: string;
  }>;
  status: DispatchStatus | string;
  courier_name?: string;
  transporter_name?: string;
  tracking_number?: string;
  manifest_number?: string;
  surat_jalan_number?: string;
  bon_pengeluaran_number?: string;
  dispatch_date?: string;
  created_at?: string;
  updated_at?: string;
  created_by: string;
  dispatch_number?: string;
  tug8_number?: string;
  warehouse_name?: string;
  warehouse_origin?: string;
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  source_type?: string;
  delivery_destination?: string;
  destination_port?: string;
  notes?: string;
  driver_pic?: string;
  work_order_ref?: string;
  spk_id?: string;
  spk_number?: string;
  account_code?: string;
  function_code?: string;
  is_partial?: boolean;
  shipment_phase?: number;
  incomplete_items_summary?: string;
  dispatch_logs?: Array<{
    timestamp: string;
    action: string;
    user: string;
    notes?: string;
    phase?: number;
    dispatched_items_summary?: string;
  }>;
  aldi_signed?: boolean;
  aldi_signed_at?: string;
  aldi_signature_url?: string;
  alfin_signed?: boolean;
  alfin_signed_at?: string;
  alfin_signature_url?: string;
  emir_signed?: boolean;
  emir_signed_at?: string;
  emir_signature_url?: string;
  sumbono_signed?: boolean;
  sumbono_signed_at?: string;
  sumbono_signature_url?: string;
}

export enum RequestUrgency {
  NORMAL = "Normal",
  HIGH = "High",
  LOW = "Low",
  URGENT = "Urgent",
  CRITICAL = "Critical",
}

export enum RequestStatus {
  DRAFT = "Draft",
  SUBMITTED = "Submitted",
  APPROVED = "Approved",
  REJECTED = "Rejected",
  PICKING = "Picking",
  DISPATCHED = "Dispatched",
  DELIVERED = "Delivered",
  COMPLETED = "Completed",
}

export interface VesselRequest {
  id: string;
  request_number: string;
  vessel_name: string;
  requester_name: string;
  urgency: RequestUrgency;
  items: Array<{
    spare_part_id: string;
    spare_part_name: string;
    part_number: string;
    qty_requested: number;
    unit: string;
  }>;
  status: RequestStatus;
  attachment_url?: string;
  remarks?: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
}

export enum ApprovalType {
  VESSEL_REQUEST = "Vessel Supply Request",
  STOCK_ADJUSTMENT = "Stock Adjustment Verification",
  DISPATCH_RELEASE = "Cargo Dispatch Release",
}

export interface ApprovalTask {
  id: string;
  type: ApprovalType;
  reference_id: string;
  reference_number: string;
  vessel_or_area: string;
  requester_name: string;
  requested_date: string;
  summary: string;
  status: "Pending" | "Approved" | "Rejected";
  remarks?: string;
  actioned_by?: string;
  actioned_at?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  module: string;
  description: string;
  username: string;
  role: UserRole;
  timestamp: string;
}

export interface SPKItemSelection {
  spare_part_id: string;
  spare_part_name: string;
  part_number: string;
  qty_to_pick: number;
  unit: string;
}

export interface SPKVesselItem {
  vessel_name: string;
  items: SPKItemSelection[];
}

export interface SPKWorkOrder {
  id: string;
  spk_number: string;
  target_port?: string;
  vessels?: SPKVesselItem[];
  items?: any[];
  vessel_name?: string;
  description?: string;
  status: "Draft" | "Pending Picking" | "Picking in Progress" | "Picked & Ready" | "Dispatched" | "Incomplete" | "COMPLETED";
  created_at?: string;
  date_created?: string;
  created_by?: string;
  assigned_to?: string;
  remarks?: string;
}

export type MaterialRequestStatus = "Draft" | "Submitted" | "Approved" | "Rejected" | "Processed";

export interface MaterialRequestItem {
  spare_part_id: string;
  spare_part_name: string;
  part_number: string;
  unit: string;
  avg_monthly_usage?: number; // Pemakaian rata-rata per bulan
  remaining_stock: number; // Sisa Persediaan
  requested_qty: number; // Permintaan
  approved_qty?: number; // Jumlah yang disetujui
  unit_price?: number; // Harga satuan
  notes?: string; // Keterangan
  item_status?: "Arrived" | "Pending" | "Returned"; // Status kedatangan barang
}

export interface MaterialRequest {
  id: string;
  request_number: string;
  request_date?: string;
  requester_name?: string;
  vessel_name: string;
  warehouse_name?: string;
  delivery_address?: string;
  work_order_ref?: string; // Perintah Kerja
  account_code?: string; // Kode Akun
  function_code?: string; // Fungsi
  remarks?: string;
  status: MaterialRequestStatus;
  items: MaterialRequestItem[];
  created_at?: string;
  updated_at?: string;
  tug5_number?: string;
  tug6_number?: string;
  tug_type?: "TUG5" | "TUG6";
  department?: string;
  requested_by?: string;
  urgency?: RequestUrgency | string;
  spk_number?: string;
  spk_id?: string;
  tug_number?: string;
  destination_port?: string;
  warehouse?: string;
  created_by?: string;
  notes?: string;
  is_partial?: boolean;
  receiving_status?: string;
  receiving_ref_id?: string;
  completion_date?: string;
  incomplete_items_summary?: string;
  aldi_signed?: boolean;
  aldi_signed_at?: string;
  aldi_signature_url?: string;
  alfin_signed?: boolean;
  alfin_signed_at?: string;
  alfin_signature_url?: string;
  emir_signed?: boolean;
  emir_signed_at?: string;
  emir_signature_url?: string;
  sumbono_signed?: boolean;
  sumbono_signed_at?: string;
  sumbono_signature_url?: string;
}

export interface MRActivityLog {
  id: string;
  request_id: string;
  request_number: string;
  action: "Created" | "Edited" | "Submitted" | "Approved" | "Rejected" | "Printed" | "Downloaded";
  username: string;
  timestamp: string;
  details?: string;
}

export type MaterialReturnStatus = "Draft" | "Submitted" | "Pending Verification" | "Approved" | "Rejected" | "Completed";

export interface MaterialReturnItem {
  spare_part_id: string;
  part_number: string;
  part_name?: string;
  spare_part_name?: string;
  unit: string;
  avg_monthly_usage?: number;
  qty_issued?: number;
  qty_used?: number;
  qty_returnable?: number;
  qty_returned?: number;
  remaining_stock?: number;
  requested_qty?: number;
  item_status?: "Arrived" | "Pending" | "Returned";
  notes?: string;
}

export interface MaterialReturn {
  id: string;
  return_number: string;
  tug10_number?: string;
  return_date: string;
  vessel_name: string;
  warehouse_name?: string;
  spk_number?: string;
  spk_id?: string;
  work_order_number?: string;
  work_order_ref?: string;
  dispatch_reference?: string; // TUG 8 dispatch reference
  return_reason?: string;
  notes?: string;
  status: MaterialReturnStatus;
  items: MaterialReturnItem[];
  created_by?: string;
  returned_by?: string;
  created_at?: string;
  updated_at?: string;
  reject_reason?: string;
  account_code?: string;
  function_code?: string;
  aldi_signed?: boolean;
  aldi_signed_at?: string;
  aldi_signature_url?: string;
  alfin_signed?: boolean;
  alfin_signed_at?: string;
  alfin_signature_url?: string;
  emir_signed?: boolean;
  emir_signed_at?: string;
  emir_signature_url?: string;
  sumbono_signed?: boolean;
  sumbono_signed_at?: string;
  sumbono_signature_url?: string;
}

export interface DigitalSignature {
  id: string;
  role_title: string; // e.g. "Manager Logistik", "VP RENDALHAR", "Kepala Gudang", "Captain", "Staff Admin Logistik"
  user_name: string; // e.g. "Mohamat Emir Ferdian", "Sumbono", "Capt. H. Wijaya"
  signature_url: string; // Base64 image data URL or image URL
  notes?: string;
  created_at: string;
  updated_at: string;
}



