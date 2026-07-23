/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  SUPER_ADMIN = "Super Admin",
  WAREHOUSE_ADMIN = "Warehouse Admin",
  SUPERINTENDENT = "Superintendent",
  VESSEL_CREW = "Vessel Crew",
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
}

export interface InboundReceiving {
  id: string;
  purchase_order_num: string;
  delivery_note_num: string;
  vendor_id: string;
  vendor_name: string;
  items: Array<{
    spare_part_id: string;
    spare_part_name: string;
    part_number: string;
    qty_ordered: number;
    qty_received: number;
    qty_rejected: number;
    qc_status: "Verified" | "Rejected" | "Pending";
    reject_reason?: string;
  }>;
  status: ReceivingStatus;
  reject_reason?: string;
  return_note_num?: string;
  photo_evidence_url?: string;
  signature_data_url?: string;
  received_date: string;
  created_by: string;
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
}

export interface OutboundDispatch {
  id: string;
  request_reference: string; // Vessel request ID or Sales/WMS code
  vessel_name: string;
  consignee: string;
  items: Array<{
    spare_part_id: string;
    spare_part_name: string;
    part_number: string;
    qty_requested: number;
    qty_dispatched: number;
    unit: string;
    unit_price: number;
    qty_approved?: number;
    qty_remaining?: number;
    notes?: string;
  }>;
  status: DispatchStatus;
  courier_name?: string;
  tracking_number?: string;
  manifest_number?: string;
  surat_jalan_number?: string;
  bon_pengeluaran_number?: string;
  dispatch_date?: string;
  created_by: string;
  dispatch_number?: string;
  tug8_number?: string;
  warehouse_name?: string;
  delivery_destination?: string;
  notes?: string;
  driver_pic?: string;
  work_order_ref?: string;
  account_code?: string;
  function_code?: string;
}

export enum RequestUrgency {
  NORMAL = "Normal",
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
  target_port: string;
  vessels: SPKVesselItem[];
  status: "Draft" | "Pending Picking" | "Picking in Progress" | "Picked & Ready" | "Dispatched" | "Incomplete";
  created_at: string;
  created_by: string;
  remarks?: string;
}

export type MaterialRequestStatus = "Draft" | "Submitted" | "Approved" | "Rejected" | "Processed";

export interface MaterialRequestItem {
  spare_part_id: string;
  spare_part_name: string;
  part_number: string;
  unit: string;
  avg_monthly_usage: number; // Pemakaian rata-rata per bulan
  remaining_stock: number; // Sisa Persediaan
  requested_qty: number; // Permintaan
  notes?: string; // Keterangan
  item_status?: "Arrived" | "Pending" | "Returned"; // Status kedatangan barang
}

export interface MaterialRequest {
  id: string;
  request_number: string;
  request_date: string;
  requester_name: string;
  vessel_name: string;
  warehouse_name: string;
  delivery_address: string;
  work_order_ref: string; // Perintah Kerja
  account_code: string; // Kode Akun
  function_code: string; // Fungsi
  remarks?: string;
  status: MaterialRequestStatus;
  items: MaterialRequestItem[];
  created_at: string;
  updated_at: string;
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
  part_name: string;
  unit: string;
  qty_issued: number;
  qty_used: number;
  qty_returnable: number;
  qty_returned: number;
  notes?: string;
}

export interface MaterialReturn {
  id: string;
  return_number: string;
  return_date: string;
  vessel_name: string;
  warehouse_name: string;
  spk_number: string;
  work_order_number: string;
  dispatch_reference: string; // TUG 8 dispatch reference
  return_reason: string;
  notes?: string;
  status: MaterialReturnStatus;
  items: MaterialReturnItem[];
  created_by: string;
  created_at: string;
  updated_at: string;
  reject_reason?: string;
  account_code?: string;
  function_code?: string;
}


