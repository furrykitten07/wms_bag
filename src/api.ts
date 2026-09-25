/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  User, 
  UserRole,
  SparePart, 
  Vendor, 
  WarehouseLocation, 
  InboundReceiving, 
  OutboundDispatch, 
  VesselRequest, 
  ApprovalTask, 
  MovementLedgerEntry, 
  AuditLog,
  SPKWorkOrder,
  MaterialRequest,
  MaterialReturn,
  TransactionType,
  DispatchStatus,
  ReceivingStatus,
  DigitalSignature
} from "./types.js";
import { supabase, isSupabaseConfigured, uploadSignatureToStorage } from "./supabaseClient.js";
import { 
  demoSpareParts, 
  demoSPKs, 
  demoMaterialRequests, 
  demoMaterialRequestsTUG6,
  demoDispatches, 
  demoReceiving, 
  demoMaterialReturns 
} from "./demoSeedData.js";

// Default System Signatures Seed
export const defaultSignatures: DigitalSignature[] = [
  {
    id: "sig-1",
    role_title: "Manager Logistik",
    user_name: "Mohamat Emir Ferdian",
    signature_url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="70" viewBox="0 0 220 70"><path d="M 15 45 C 35 15, 45 65, 75 30 C 95 15, 115 55, 145 35 C 165 25, 185 50, 205 38" stroke="%230f172a" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M 40 52 L 180 48" stroke="%231e293b" stroke-width="1.8" fill="none" stroke-linecap="round"/><text x="125" y="62" font-family="cursive" font-size="11" font-weight="bold" fill="%23334155">M. Emir Ferdian</text></svg>`,
    notes: "Tanda Tangan Utama Manager Logistik",
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-01T10:00:00.000Z"
  },
  {
    id: "sig-2",
    role_title: "VP RENDALHAR",
    user_name: "Sumbono",
    signature_url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="70" viewBox="0 0 220 70"><path d="M 20 40 C 35 10, 50 60, 80 20 C 110 5, 130 55, 160 30 C 180 20, 195 45, 205 35" stroke="%230f172a" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M 30 48 C 80 55, 140 45, 190 48" stroke="%231e293b" stroke-width="1.8" fill="none" stroke-linecap="round"/><text x="140" y="62" font-family="cursive" font-size="11" font-weight="bold" fill="%23334155">Sumbono</text></svg>`,
    notes: "Tanda Tangan VP RENDALHAR",
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-01T10:00:00.000Z"
  },

  {
    id: "sig-4",
    role_title: "Kepala Gudang",
    user_name: "MAGHFUR MUHAMMAD ALFIN",
    signature_url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="70" viewBox="0 0 220 70"><path d="M 15 42 C 35 15, 50 58, 80 25 C 100 12, 120 52, 150 30 C 170 20, 185 45, 205 35" stroke="%230f172a" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M 30 50 L 180 46" stroke="%231e293b" stroke-width="1.8" fill="none" stroke-linecap="round"/><text x="45" y="62" font-family="cursive" font-size="11" font-weight="bold" fill="%23334155">Maghfur M. Alfin</text></svg>`,
    notes: "Tanda Tangan Kepala Gudang",
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-01T10:00:00.000Z"
  },
  {
    id: "sig-5",
    role_title: "Petugas Gudang",
    user_name: "Aldi Hidayat",
    signature_url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="70" viewBox="0 0 220 70"><path d="M 20 42 C 45 15, 60 55, 90 28 C 110 15, 130 52, 160 32 C 180 22, 190 48, 200 40" stroke="%230f172a" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M 35 52 L 185 48" stroke="%231e293b" stroke-width="1.8" fill="none" stroke-linecap="round"/><text x="75" y="62" font-family="cursive" font-size="11" font-weight="bold" fill="%23334155">Aldi Hidayat</text></svg>`,
    notes: "Tanda Tangan Petugas Gudang",
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-01T10:00:00.000Z"
  }
];

function loadLocalSignatures(): DigitalSignature[] {
  try {
    const saved = localStorage.getItem("wms_digital_signatures");
    if (saved) {
      let parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Enforce updated role assignments for Kepala Gudang & Petugas Gudang
        parsed = parsed.map((s: any) => {
          if (s.role_title === "Kepala Gudang" || s.id === "sig-4") {
            return {
              ...s,
              id: "sig-4",
              role_title: "Kepala Gudang",
              user_name: "MAGHFUR MUHAMMAD ALFIN",
              notes: "Tanda Tangan Kepala Gudang",
              signature_url: (s.signature_url && !s.signature_url.includes("Merak")) ? s.signature_url : defaultSignatures[2].signature_url
            };
          }
          if (s.role_title === "Petugas Gudang" || s.id === "sig-5") {
            return {
              ...s,
              id: "sig-5",
              role_title: "Petugas Gudang",
              user_name: "Aldi Hidayat",
              notes: "Tanda Tangan Petugas Gudang",
              signature_url: (s.signature_url && !s.signature_url.includes("Maghfur")) ? s.signature_url : defaultSignatures[3].signature_url
            };
          }
          return s;
        });

        const hasKepalaGudang = parsed.some((s: any) => s.role_title === "Kepala Gudang");
        if (!hasKepalaGudang) parsed.push(defaultSignatures[2]);
        const hasPetugasGudang = parsed.some((s: any) => s.role_title === "Petugas Gudang");
        if (!hasPetugasGudang) parsed.push(defaultSignatures[3]);

        localStorage.setItem("wms_digital_signatures", JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load signatures from localStorage", e);
  }
  try {
    localStorage.setItem("wms_digital_signatures", JSON.stringify(defaultSignatures));
  } catch (e) {}
  return [...defaultSignatures];
}

function saveLocalSignatures(sigs: DigitalSignature[]) {
  try {
    localStorage.setItem("wms_digital_signatures", JSON.stringify(sigs));
  } catch (e) {
    console.error("Failed to save signatures to localStorage", e);
  }
}

let localSignatures: DigitalSignature[] = loadLocalSignatures();

// We dynamically track the current simulated user's username for the headers
let currentUsername = "superadmin";

export function setCurrentUserHeader(username: string) {
  currentUsername = username;
}

export function getCurrentUserHeader(): string {
  return currentUsername;
}

// Local fallback state
let localUsers: User[] = [
  { id: "usr-1", username: "superadmin", name: "Fikri Haikal (Superadmin)", email: "superadmin@maritime-logistics.com", role: UserRole.SUPER_ADMIN, password: "admin123" },
  { id: "usr-3", username: "alfin", name: "Maghfur Muhammad Alfin", email: "alfin.rendalhar@maritime-logistics.com", role: UserRole.KEPALA_GUDANG, password: "admin123" },
  { id: "usr-6", username: "aldi", name: "Aldi Hidayat", email: "aldi.hidayat@maritime-logistics.com", role: UserRole.WAREHOUSE_STAFF, password: "admin123" },
  { id: "usr-4", username: "emir", name: "Mohamat Emir Ferdian", email: "emir.ferdian@maritime-logistics.com", role: UserRole.LOGISTICS_MANAGER, password: "admin123" },
  { id: "usr-5", username: "sumbono", name: "Sumbono", email: "sumbono@maritime-logistics.com", role: UserRole.VP_RENDALHAR, password: "admin123" }
];

let localVendors: Vendor[] = [
  { id: "vnd-1", name: "Wärtsilä Marine Power Systems", code: "VND-WRT-01", email: "parts.marine@wartsila.com", phone: "+358 10 709 0000", address: "Helsinki, Finland", contactPerson: "Mikael Lindqvist" },
  { id: "vnd-2", name: "MAN Energy Solutions SE", code: "VND-MAN-02", email: "prime-serv@man-es.com", phone: "+49 821 3220", address: "Augsburg, Germany", contactPerson: "Hans Müller" },
  { id: "vnd-3", name: "Nagasaki Ship Propeller Co.", code: "VND-NSP-03", email: "sales@nagasaki-prop.jp", phone: "+81 95 824 1111", address: "Nagasaki, Japan", contactPerson: "Hiroshi Sato" },
  { id: "vnd-4", name: "Jakarta Maritime Sparepart Ind.", code: "VND-JMS-04", email: "sales@jakartamaritime.co.id", phone: "+62 21 4390 1234", address: "Tanjung Priok, Jakarta, Indonesia", contactPerson: "Yudi Pratama" }
];

let localLocations: WarehouseLocation[] = [
  { id: "loc-1", code: "A1", warehouse: "Jakarta HQ Warehouse", zone: "Zone A (Ground level, Max 1m)", rack: "Rack A", shelf: "Level 1 (Low)", bin: "A1-G" },
  { id: "loc-2", code: "A2", warehouse: "Jakarta HQ Warehouse", zone: "Zone A (Mid level, 1m - 2m)", rack: "Rack A", shelf: "Level 2 (Mid)", bin: "A2-M" },
  { id: "loc-3", code: "A3", warehouse: "Jakarta HQ Warehouse", zone: "Zone A (High level, 2m+, Use Ladder!)", rack: "Rack A", shelf: "Level 3 (High)", bin: "A3-H" },
  { id: "loc-4", code: "B1", warehouse: "Jakarta HQ Warehouse", zone: "Zone B (Ground level, Max 1m)", rack: "Rack B", shelf: "Level 1 (Low)", bin: "B1-G" },
  { id: "loc-5", code: "B2", warehouse: "Jakarta HQ Warehouse", zone: "Zone B (Mid level, 1m - 2m)", rack: "Rack B", shelf: "Level 2 (Mid)", bin: "B2-M" },
  { id: "loc-6", code: "B3", warehouse: "Jakarta HQ Warehouse", zone: "Zone B (High level, 2m+, Use Ladder!)", rack: "Rack B", shelf: "Level 3 (High)", bin: "B3-H" },
  { id: "loc-7", code: "C1", warehouse: "Jakarta HQ Warehouse", zone: "Zone C (Ground level, Max 1m)", rack: "Rack C", shelf: "Level 1 (Low)", bin: "C1-G" },
  { id: "loc-8", code: "C2", warehouse: "Jakarta HQ Warehouse", zone: "Zone C (Mid level, 1m - 2m)", rack: "Rack C", shelf: "Level 2 (Mid)", bin: "C2-M" },
  { id: "loc-9", code: "C3", warehouse: "Jakarta HQ Warehouse", zone: "Zone C (High level, 2m+, Use Ladder!)", rack: "Rack C", shelf: "Level 3 (High)", bin: "C3-H" }
];

function loadLocalReceiving(): InboundReceiving[] {
  try {
    const saved = localStorage.getItem("wms_local_receiving");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [...demoReceiving];
}

function saveLocalReceiving(data: InboundReceiving[]) {
  try {
    localStorage.setItem("wms_local_receiving", JSON.stringify(data));
  } catch (e) {}
}

function loadLocalDispatches(): OutboundDispatch[] {
  try {
    const saved = localStorage.getItem("wms_local_dispatch");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Filter out any dummy July 2026 / demo data records
        const cleaned = parsed.filter((d: any) => d && !String(d.id || "").startsWith("dsp-juli"));
        if (cleaned.length !== parsed.length) {
          saveLocalDispatches(cleaned);
        }
        return cleaned;
      }
    }
  } catch (e) {}
  return [];
}

function saveLocalDispatches(data: OutboundDispatch[]) {
  try {
    localStorage.setItem("wms_local_dispatch", JSON.stringify(data));
  } catch (e) {}
}

let localSpareParts: SparePart[] = [...demoSpareParts];
let localSPKs: SPKWorkOrder[] = [...demoSPKs];
let localMaterialRequests: MaterialRequest[] = [...demoMaterialRequests];
let localMaterialRequestsTUG6: MaterialRequest[] = [...demoMaterialRequestsTUG6];
let localDispatches: OutboundDispatch[] = loadLocalDispatches();
let localReceiving: InboundReceiving[] = loadLocalReceiving();
let localMaterialReturns: MaterialReturn[] = [...demoMaterialReturns];

let localLedger: MovementLedgerEntry[] = demoSpareParts.slice(0, 15).map((p, idx) => ({
  id: `mvt-${idx + 1}`,
  transaction_type: idx % 2 === 0 ? TransactionType.RECEIVING : TransactionType.DISPATCH,
  spare_part_id: p.id,
  spare_part_name: p.part_name,
  part_number: p.part_number,
  source_location: idx % 2 === 0 ? undefined : "WH-JKT-A1",
  destination_location: idx % 2 === 0 ? "WH-JKT-A1" : undefined,
  qty_in: idx % 2 === 0 ? 10 : 0,
  qty_out: idx % 2 === 0 ? 0 : 3,
  before_stock: p.current_stock,
  after_stock: p.current_stock + (idx % 2 === 0 ? 10 : -3),
  reference_number: `REF-2026-${String(100 + idx)}`,
  remarks: "Mutasi otomatis simulasi data lokal",
  transaction_date: new Date(new Date("2026-06-30T12:00:00Z").getTime() - (idx * 5 * 86400000)).toISOString(),
  created_by: "System Admin"
}));

function getLocalFallbackData<T>(url: string, options: RequestInit = {}): T {
  const urlObj = new URL(url, "http://localhost");
  const path = urlObj.pathname;
  const body = options.body ? JSON.parse(options.body as string) : {};

  if (path === "/api/auth/login") {
    const matched = localUsers.find(u => u.username.toLowerCase() === (body.username || "").toLowerCase()) || localUsers[0];
    return { success: true, user: matched } as any;
  }
  if (path === "/api/auth/me") {
    const matched = localUsers.find(u => u.username === currentUsername) || localUsers[0];
    return matched as any;
  }
  if (path === "/api/users") return localUsers as any;
  if (path.startsWith("/api/signatures") && options.method === "POST" && path === "/api/signatures") {
    const newSig: DigitalSignature = {
      id: `sig-${Date.now()}`,
      role_title: body.role_title || "Role Kustom",
      user_name: body.user_name || "Nama Kustom",
      signature_url: body.signature_url || "",
      notes: body.notes || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    localSignatures = [newSig, ...localSignatures];
    saveLocalSignatures(localSignatures);
    return newSig as any;
  }
  if (path === "/api/signatures/reset" && options.method === "POST") {
    localSignatures = [...defaultSignatures];
    saveLocalSignatures(localSignatures);
    return localSignatures as any;
  }
  if (path.startsWith("/api/signatures/") && options.method === "PUT") {
    const id = path.split("/").pop();
    const idx = localSignatures.findIndex(s => s.id === id);
    if (idx !== -1) {
      localSignatures[idx] = {
        ...localSignatures[idx],
        ...body,
        updated_at: new Date().toISOString()
      };
      saveLocalSignatures(localSignatures);
      return localSignatures[idx] as any;
    }
  }
  if (path.startsWith("/api/signatures/") && options.method === "DELETE") {
    const id = path.split("/").pop();
    localSignatures = localSignatures.filter(s => s.id !== id);
    saveLocalSignatures(localSignatures);
    return { success: true, id } as any;
  }
  if (path.startsWith("/api/signatures")) return localSignatures as any;

  if (path.startsWith("/api/inventory")) return localSpareParts as any;
  if (path.startsWith("/api/warehouse/locations")) return localLocations as any;
  if (path.startsWith("/api/vendors")) return localVendors as any;
  if (path.startsWith("/api/spk")) return localSPKs as any;
  if (path === "/api/receiving" && options.method === "POST") {
    const newRec: InboundReceiving = {
      id: `rec-${Date.now()}`,
      purchase_order_num: body.purchase_order_num || `PO-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      delivery_note_num: body.delivery_note_num || `DN-${Date.now().toString().slice(-5)}`,
      spk_number: body.spk_number,
      spk_id: body.spk_id,
      vendor_id: body.vendor_id || "vnd-1",
      vendor_name: body.vendor_name || "Vendor Logistik BAG",
      items: body.items || [],
      status: body.status || ReceivingStatus.ACCEPTED,
      keeper_notes: body.keeper_notes,
      reject_reason: body.reject_reason,
      return_note_num: body.return_note_num,
      photo_evidence_url: body.photo_evidence_url || "",
      signature_data_url: body.signature_data_url || "",
      received_date: body.received_date || new Date().toISOString(),
      completion_date: body.completion_date || (body.status === ReceivingStatus.ACCEPTED || body.status === ReceivingStatus.VERIFIED ? new Date().toISOString() : undefined),
      audit_logs: body.audit_logs || [{
        timestamp: new Date().toISOString(),
        username: currentUsername || "Penjaga Gudang",
        action: "Penerimaan Dicatat",
        notes: (body.status === ReceivingStatus.ACCEPTED || body.status === ReceivingStatus.VERIFIED) ? "Fisik & QTY Terverifikasi Sesuai & Lengkap" : "Dicatat dengan catatan fisik / ketidaksesuaian barang",
        status_before: "-",
        status_after: body.status || ReceivingStatus.PENDING
      }],
      created_by: currentUsername || "Penjaga Gudang"
    };
    localReceiving = [newRec, ...localReceiving];
    saveLocalReceiving(localReceiving);
    return newRec as any;
  }
  if (path.startsWith("/api/receiving/") && options.method === "PUT") {
    const id = path.split("/").pop();
    const idx = localReceiving.findIndex(r => r.id === id);
    if (idx !== -1) {
      const oldRec = localReceiving[idx];
      const newStatus = body.status || oldRec.status;
      localReceiving[idx] = {
        ...oldRec,
        ...body,
        items: body.items || oldRec.items,
        status: newStatus,
        keeper_notes: body.keeper_notes !== undefined ? body.keeper_notes : oldRec.keeper_notes,
        completion_date: body.completion_date !== undefined ? body.completion_date : (newStatus === ReceivingStatus.ACCEPTED || newStatus === ReceivingStatus.VERIFIED ? (oldRec.completion_date || new Date().toISOString()) : oldRec.completion_date),
        audit_logs: body.audit_logs !== undefined ? body.audit_logs : (oldRec.audit_logs || [])
      };
      saveLocalReceiving(localReceiving);
      return localReceiving[idx] as any;
    }
  }
  if (path.startsWith("/api/receiving/") && options.method === "DELETE") {
    const id = path.split("/").pop();
    localReceiving = localReceiving.filter(r => r.id !== id);
    saveLocalReceiving(localReceiving);
    return { success: true, id } as any;
  }
  if (path.startsWith("/api/receiving")) return localReceiving as any;
  if (path === "/api/dispatch" && options.method === "POST") {
    const nowStr = new Date().toISOString();
    const dspNum = `DSP-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const bpbNum = body.bon_pengeluaran_number || `BPB-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const newDsp: OutboundDispatch = {
      id: `dsp-${Date.now()}`,
      dispatch_number: dspNum,
      tug8_number: bpbNum,
      request_reference: body.request_reference || "Direct WMS Order",
      vessel_name: body.vessel_name || "MV. KARTINI BARUNA",
      consignee: body.consignee || `Port Agent - ${body.vessel_name || "Baruna Vessel"}`,
      items: body.items || [],
      status: body.status || DispatchStatus.WAITING,
      bon_pengeluaran_number: bpbNum,
      surat_jalan_number: body.surat_jalan_number || `SJL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      manifest_number: body.manifest_number || `MNF-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      courier_name: body.courier_name || "Internal Cargo",
      tracking_number: body.tracking_number || "-",
      driver_pic: body.driver_pic || "-",
      warehouse_name: body.warehouse_name || "Gudang Merak",
      delivery_destination: body.delivery_destination || "Port Agent / Vessel Side",
      notes: body.notes || "",
      created_by: currentUsername || "Petugas Gudang",
      created_at: nowStr,
      updated_at: nowStr,
      work_order_ref: body.work_order_ref || "",
      account_code: body.account_code || "BPP",
      function_code: body.function_code || "ARMADA"
    };
    localDispatches = [newDsp, ...localDispatches];
    saveLocalDispatches(localDispatches);
    return newDsp as any;
  }
  if (path.startsWith("/api/dispatch/") && options.method === "PUT") {
    const id = path.split("/").pop();
    const idx = localDispatches.findIndex(d => d && d.id === id);
    if (idx !== -1) {
      localDispatches[idx] = {
        ...localDispatches[idx],
        ...body,
        updated_at: new Date().toISOString()
      };
      saveLocalDispatches(localDispatches);
      return localDispatches[idx] as any;
    }
  }
  if (path.startsWith("/api/dispatch/") && options.method === "DELETE") {
    const id = path.split("/").pop();
    localDispatches = localDispatches.filter(d => d && d.id !== id);
    saveLocalDispatches(localDispatches);
    return { success: true, id } as any;
  }
  if (path.startsWith("/api/dispatch")) return localDispatches as any;
  if (path.startsWith("/api/requests")) return [] as any;
  if (path.startsWith("/api/approvals")) return [] as any;
  if (path.startsWith("/api/ledger")) return localLedger as any;
  if (path.startsWith("/api/audit")) return [] as any;
  if (path.startsWith("/api/material-requests-tug6")) return localMaterialRequestsTUG6 as any;
  if (path.startsWith("/api/material-requests")) return localMaterialRequests as any;
  if (path === "/api/material-returns" && options.method === "POST") {
    const currentYear = new Date().getFullYear();
    const nextSeq = localMaterialReturns.length + 1;
    const newRet: MaterialReturn = {
      id: `ret-${Date.now()}`,
      return_number: `TUG10-${currentYear}-${String(nextSeq).padStart(6, "0")}`,
      return_date: body.return_date || new Date().toISOString().split("T")[0],
      vessel_name: body.vessel_name || "MV. KARTINI BARUNA",
      warehouse_name: body.warehouse_name || "Jakarta HQ Warehouse",
      spk_number: body.spk_number || "NP",
      work_order_number: body.work_order_number || "NP",
      return_reason: body.return_reason || "",
      notes: body.notes || "",
      status: body.status || "Draft",
      items: body.items || [],
      created_by: currentUsername || "Chief Engineer",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      account_code: body.account_code || "BPP",
      function_code: body.function_code || "ARMADA"
    };
    localMaterialReturns = [newRet, ...localMaterialReturns];
    return newRet as any;
  }
  if (path.startsWith("/api/material-returns/") && options.method === "PUT") {
    const id = path.split("/").pop();
    const idx = localMaterialReturns.findIndex(r => r.id === id);
    if (idx !== -1) {
      localMaterialReturns[idx] = {
        ...localMaterialReturns[idx],
        ...body,
        updated_at: new Date().toISOString()
      };
      return localMaterialReturns[idx] as any;
    }
  }
  if (path.startsWith("/api/material-returns/") && options.method === "DELETE") {
    const id = path.split("/").pop();
    localMaterialReturns = localMaterialReturns.filter(r => r.id !== id);
    return { success: true, id } as any;
  }
  if (path.startsWith("/api/material-returns")) return localMaterialReturns as any;
  if (path === "/api/dashboard/summary") {
    const totalParts = localSpareParts.length;
    const lowStockParts = localSpareParts.filter(p => p.current_stock <= p.reorder_point).length;
    const pendingMaterialRequests = localMaterialRequests.filter(m => m.status === "Submitted" || m.status === "Draft");
    return {
      totalParts,
      lowStockParts,
      pendingApprovalsCount: pendingMaterialRequests.length,
      activeDispatchesCount: localDispatches.length,
      totalReceivingCount: localReceiving.length,
      pendingMaterialRequests,
      lowStockAlerts: localSpareParts.filter(p => p.current_stock <= p.reorder_point).map(p => ({
        id: p.id,
        part_name: p.part_name,
        part_number: p.part_number,
        current_stock: p.current_stock,
        reorder_point: p.reorder_point,
        sku: p.sku
      })),
      recentActivities: []
    } as any;
  }
  if (path === "/api/demo/seed") {
    localSpareParts = [...demoSpareParts];
    localSPKs = [...demoSPKs];
    localMaterialRequests = [...demoMaterialRequests];
    localMaterialRequestsTUG6 = [...demoMaterialRequestsTUG6];
    localDispatches = [];
    saveLocalDispatches(localDispatches);
    localReceiving = [...demoReceiving];
    localMaterialReturns = [...demoMaterialReturns];
    return { success: true, counts: { parts: localSpareParts.length } } as any;
  }
  return [] as any;
}

// Column Whitelists to prevent PostgREST schema cache mismatch errors (PGRST204)
const VALID_MR_COLUMNS = new Set([
  "id", "request_number", "tug5_number", "tug6_number",
  "vessel_name", "warehouse_name", "request_date", "requester_name",
  "work_order_ref", "account_code", "function_code", "delivery_address",
  "status", "items", "remarks",
  "aldi_signed", "aldi_signed_at", "aldi_signature_url",
  "alfin_signed", "alfin_signed_at", "alfin_signature_url",
  "emir_signed", "emir_signed_at", "emir_signature_url",
  "sumbono_signed", "sumbono_signed_at", "sumbono_signature_url",
  "created_at", "updated_at"
]);

const VALID_DSP_COLUMNS = new Set([
  "id", "request_reference", "vessel_name", "consignee",
  "bon_pengeluaran_number", "surat_jalan_number", "manifest_number",
  "tug8_number", "warehouse_name", "delivery_destination",
  "courier_name", "tracking_number", "driver_pic", "status",
  "items", "notes", "created_by", "work_order_ref",
  "account_code", "function_code", "dispatch_date",
  "aldi_signed", "aldi_signed_at", "aldi_signature_url",
  "alfin_signed", "alfin_signed_at", "alfin_signature_url",
  "emir_signed", "emir_signed_at", "emir_signature_url",
  "sumbono_signed", "sumbono_signed_at", "sumbono_signature_url",
  "created_at", "updated_at"
]);

const VALID_RET_COLUMNS = new Set([
  "id", "return_number", "vessel_name", "warehouse_name",
  "return_date", "return_reason", "spk_number", "dispatch_reference",
  "created_by", "status", "items", "notes",
  "aldi_signed", "aldi_signed_at", "aldi_signature_url",
  "alfin_signed", "alfin_signed_at", "alfin_signature_url",
  "emir_signed", "emir_signed_at", "emir_signature_url",
  "sumbono_signed", "sumbono_signed_at", "sumbono_signature_url",
  "created_at", "updated_at"
]);

const VALID_REC_COLUMNS = new Set([
  "id", "purchase_order_num", "delivery_note_num", "spk_number",
  "spk_id", "vendor_id", "vendor_name", "received_date",
  "received_by", "status", "qc_notes", "keeper_notes",
  "items", "created_at", "updated_at"
]);

const VALID_PART_COLUMNS = new Set([
  "id", "sku", "part_number", "alternative_part_number",
  "part_name", "maker", "unit", "category",
  "current_stock", "reorder_point", "location_id",
  "remarks", "created_at", "updated_at"
]);

const VALID_SIG_COLUMNS = new Set([
  "id", "role_title", "user_name", "signature_url",
  "notes", "created_at", "updated_at"
]);

function sanitizeRecord(data: any, validCols: Set<string>): any {
  if (!data || typeof data !== "object") return data;
  const clean: any = {};
  for (const k of Object.keys(data)) {
    if (validCols.has(k)) {
      clean[k] = data[k];
    }
  }
  return clean;
}

async function fetcher<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? JSON.parse(options.body as string) : {};

  // If Supabase is configured with valid credentials, interact with Supabase directly
  if (isSupabaseConfigured) {
    try {
      const urlObj = new URL(url, "http://localhost");
      const path = urlObj.pathname;
      const now = new Date().toISOString();

      // --- 1. MATERIAL REQUESTS (TUG 5) ---
      if (path === "/api/material-requests" && method === "GET") {
        const { data, error } = await supabase.from("material_requests").select("*").order("created_at", { ascending: false });
        if (!error && data) {
          localMaterialRequests = data as any;
          return data as any;
        }
        return localMaterialRequests as any;
      }
      if (path === "/api/material-requests" && method === "POST") {
        const newId = body.id || `mr-${Date.now()}`;
        const reqNum = body.request_number || `MR-2026-${String(Math.floor(100000 + Math.random() * 900000))}`;
        const tug5Num = body.tug5_number || `TUG5-2026-${String(Math.floor(100 + Math.random() * 900))}`;
        const rec = {
          ...body,
          id: newId,
          request_number: reqNum,
          tug5_number: tug5Num,
          request_date: body.request_date ? String(body.request_date).split("T")[0] : now.split("T")[0],
          requester_name: body.requester_name || "Chief Engineer",
          vessel_name: body.vessel_name || "MV. KARTINI BARUNA",
          warehouse_name: body.warehouse_name || "Gudang Merak",
          status: body.status || "Submitted",
          items: body.items || [],
          created_at: now,
          updated_at: now
        };
        const cleanRec = sanitizeRecord(rec, VALID_MR_COLUMNS);
        const { data, error } = await supabase.from("material_requests").insert([cleanRec]).select().single();
        if (error) {
          console.error("Supabase MR insert error:", error);
          throw new Error(error.message);
        }
        localMaterialRequests = [data, ...localMaterialRequests.filter(r => r.id !== data.id)];
        return data as any;
      }
      if (path === "/api/material-requests/batch" && method === "POST") {
        const rows = (Array.isArray(body) ? body : [body]).map((b: any, idx: number) => {
          const rec = {
            ...b,
            id: b.id || `mr-${Date.now()}-${idx}`,
            request_number: b.request_number || `MR-2026-${String(Math.floor(100000 + Math.random() * 900000))}`,
            tug5_number: b.tug5_number || `TUG5-2026-${String(Math.floor(100 + Math.random() * 900))}`,
            request_date: b.request_date ? String(b.request_date).split("T")[0] : now.split("T")[0],
            requester_name: b.requester_name || "Chief Engineer",
            vessel_name: b.vessel_name || "MV. KARTINI BARUNA",
            warehouse_name: b.warehouse_name || "Gudang Merak",
            status: b.status || "Submitted",
            items: b.items || [],
            created_at: now,
            updated_at: now
          };
          return sanitizeRecord(rec, VALID_MR_COLUMNS);
        });
        const { data, error } = await supabase.from("material_requests").upsert(rows).select();
        if (error) {
          console.error("Supabase MR batch insert error:", error);
          throw new Error(error.message);
        }
        if (data) {
          localMaterialRequests = [...data, ...localMaterialRequests.filter(r => !data.some(d => d.id === r.id))];
        }
        return data as any;
      }
      if (path.startsWith("/api/material-requests/") && method === "PUT") {
        const id = path.split("/").pop();
        const payload = { ...body, updated_at: now };
        if (payload.request_date) {
          payload.request_date = String(payload.request_date).split("T")[0];
        }
        const cleanUpdate = sanitizeRecord(payload, VALID_MR_COLUMNS);
        const { data, error } = await supabase.from("material_requests").update(cleanUpdate).eq("id", id).select().single();
        if (error) {
          console.error("Supabase MR update error:", error);
          throw new Error(error.message);
        }
        localMaterialRequests = localMaterialRequests.map(r => r.id === id ? data : r);
        return data as any;
      }
      if (path.startsWith("/api/material-requests/") && method === "DELETE") {
        const id = path.split("/").pop();
        const { error } = await supabase.from("material_requests").delete().eq("id", id);
        if (error) {
          console.error("Supabase MR delete error:", error);
          throw new Error(error.message);
        }
        localMaterialRequests = localMaterialRequests.filter(r => r.id !== id);
        return { success: true, id } as any;
      }

      // --- 2. MATERIAL REQUESTS (TUG 6) ---
      if (path === "/api/material-requests-tug6" && method === "GET") {
        const { data, error } = await supabase.from("material_requests").select("*").order("created_at", { ascending: false });
        if (!error && data) {
          const tug6Only = data.filter((d: any) => d.tug6_number);
          localMaterialRequestsTUG6 = (tug6Only.length > 0 ? tug6Only : data) as any;
          return localMaterialRequestsTUG6 as any;
        }
        return localMaterialRequestsTUG6 as any;
      }
      if (path === "/api/material-requests-tug6" && method === "POST") {
        const newId = body.id || `mr6-${Date.now()}`;
        const reqNum = body.request_number || `MR-2026-${String(Math.floor(100000 + Math.random() * 900000))}`;
        const tug6Num = body.tug6_number || `TUG6-2026-${String(Math.floor(100 + Math.random() * 900))}`;
        const rec = {
          ...body,
          id: newId,
          request_number: reqNum,
          tug6_number: tug6Num,
          request_date: body.request_date ? String(body.request_date).split("T")[0] : now.split("T")[0],
          requester_name: body.requester_name || "Chief Engineer",
          vessel_name: body.vessel_name || "MV. KARTINI BARUNA",
          warehouse_name: body.warehouse_name || "Gudang Merak",
          status: body.status || "Submitted",
          items: body.items || [],
          created_at: now,
          updated_at: now
        };
        const cleanRec = sanitizeRecord(rec, VALID_MR_COLUMNS);
        const { data, error } = await supabase.from("material_requests").insert([cleanRec]).select().single();
        if (error) {
          console.error("Supabase TUG6 insert error:", error);
          throw new Error(error.message);
        }
        localMaterialRequestsTUG6 = [data, ...localMaterialRequestsTUG6.filter(r => r.id !== data.id)];
        return data as any;
      }
      if (path === "/api/material-requests-tug6/batch" && method === "POST") {
        const rows = (Array.isArray(body) ? body : [body]).map((b: any, idx: number) => {
          const rec = {
            ...b,
            id: b.id || `mr6-${Date.now()}-${idx}`,
            request_number: b.request_number || `MR-2026-${String(Math.floor(100000 + Math.random() * 900000))}`,
            tug6_number: b.tug6_number || `TUG6-2026-${String(Math.floor(100 + Math.random() * 900))}`,
            request_date: b.request_date ? String(b.request_date).split("T")[0] : now.split("T")[0],
            requester_name: b.requester_name || "Chief Engineer",
            vessel_name: b.vessel_name || "MV. KARTINI BARUNA",
            warehouse_name: b.warehouse_name || "Gudang Merak",
            status: b.status || "Submitted",
            items: b.items || [],
            created_at: now,
            updated_at: now
          };
          return sanitizeRecord(rec, VALID_MR_COLUMNS);
        });
        const { data, error } = await supabase.from("material_requests").upsert(rows).select();
        if (error) {
          console.error("Supabase TUG6 batch insert error:", error);
          throw new Error(error.message);
        }
        if (data) {
          localMaterialRequestsTUG6 = [...data, ...localMaterialRequestsTUG6.filter(r => !data.some(d => d.id === r.id))];
        }
        return data as any;
      }
      if (path.startsWith("/api/material-requests-tug6/") && method === "PUT") {
        const id = path.split("/").pop();
        const payload = { ...body, updated_at: now };
        if (payload.request_date) {
          payload.request_date = String(payload.request_date).split("T")[0];
        }
        const cleanUpdate = sanitizeRecord(payload, VALID_MR_COLUMNS);
        const { data, error } = await supabase.from("material_requests").update(cleanUpdate).eq("id", id).select().single();
        if (error) {
          console.error("Supabase TUG6 update error:", error);
          throw new Error(error.message);
        }
        localMaterialRequestsTUG6 = localMaterialRequestsTUG6.map(r => r.id === id ? data : r);
        return data as any;
      }
      if (path.startsWith("/api/material-requests-tug6/") && method === "DELETE") {
        const id = path.split("/").pop();
        const { error } = await supabase.from("material_requests").delete().eq("id", id);
        if (error) {
          console.error("Supabase TUG6 delete error:", error);
          throw new Error(error.message);
        }
        localMaterialRequestsTUG6 = localMaterialRequestsTUG6.filter(r => r.id !== id);
        return { success: true, id } as any;
      }

      // --- 3. MATERIAL RETURNS (TUG 10) ---
      if (path === "/api/material-returns" && method === "GET") {
        const { data, error } = await supabase.from("material_returns").select("*").order("created_at", { ascending: false });
        if (!error && data) {
          localMaterialReturns = data as any;
          return data as any;
        }
        return localMaterialReturns as any;
      }
      if (path === "/api/material-returns" && method === "POST") {
        const newId = body.id || `ret-${Date.now()}`;
        const retNum = body.return_number || `TUG10-2026-${String(Math.floor(100000 + Math.random() * 900000))}`;
        const rec = {
          ...body,
          id: newId,
          return_number: retNum,
          return_date: body.return_date ? String(body.return_date).split("T")[0] : now.split("T")[0],
          vessel_name: body.vessel_name || "MV. KARTINI BARUNA",
          warehouse_name: body.warehouse_name || "Gudang Merak",
          created_by: body.created_by || "Chief Engineer",
          status: body.status || "Draft",
          items: body.items || [],
          created_at: now,
          updated_at: now
        };
        const cleanRec = sanitizeRecord(rec, VALID_RET_COLUMNS);
        const { data, error } = await supabase.from("material_returns").insert([cleanRec]).select().single();
        if (error) {
          console.error("Supabase return insert error:", error);
          throw new Error(error.message);
        }
        localMaterialReturns = [data, ...localMaterialReturns.filter(r => r.id !== data.id)];
        return data as any;
      }
      if (path.startsWith("/api/material-returns/") && method === "PUT") {
        const id = path.split("/").pop();
        const payload = { ...body, updated_at: now };
        if (payload.return_date) {
          payload.return_date = String(payload.return_date).split("T")[0];
        }
        const cleanUpdate = sanitizeRecord(payload, VALID_RET_COLUMNS);
        const { data, error } = await supabase.from("material_returns").update(cleanUpdate).eq("id", id).select().single();
        if (error) {
          console.error("Supabase return update error:", error);
          throw new Error(error.message);
        }
        localMaterialReturns = localMaterialReturns.map(r => r.id === id ? data : r);
        return data as any;
      }
      if (path.startsWith("/api/material-returns/") && method === "DELETE") {
        const id = path.split("/").pop();
        const { error } = await supabase.from("material_returns").delete().eq("id", id);
        if (error) {
          console.error("Supabase return delete error:", error);
          throw new Error(error.message);
        }
        localMaterialReturns = localMaterialReturns.filter(r => r.id !== id);
        return { success: true, id } as any;
      }

      // --- 4. OUTBOUND DISPATCH (TUG 8) ---
      if (path === "/api/dispatch" && method === "GET") {
        const { data, error } = await supabase.from("outbound_dispatches").select("*").order("created_at", { ascending: false });
        if (!error && data) {
          const mapped = data.map((d: any) => ({
            ...d,
            dispatch_number: d.tug8_number || d.bon_pengeluaran_number || d.id
          }));
          localDispatches = mapped as any;
          saveLocalDispatches(mapped);
          return mapped as any;
        }
        return localDispatches as any;
      }
      if (path === "/api/dispatch" && method === "POST") {
        const dspNum = body.dispatch_number || `DSP-2026-${Math.floor(10000 + Math.random() * 90000)}`;
        const bpbNum = body.bon_pengeluaran_number || body.tug8_number || dspNum;
        const rec = {
          ...body,
          id: body.id || `dsp-${Date.now()}`,
          bon_pengeluaran_number: bpbNum,
          tug8_number: bpbNum,
          surat_jalan_number: body.surat_jalan_number || `SJL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          manifest_number: body.manifest_number || `MNF-2026-${Math.floor(10000 + Math.random() * 90000)}`,
          vessel_name: body.vessel_name || "MV. KARTINI BARUNA",
          consignee: body.consignee || "Port Agent",
          dispatch_date: body.dispatch_date ? String(body.dispatch_date).split("T")[0] : now.split("T")[0],
          status: body.status || "Draft",
          items: body.items || [],
          created_by: currentUsername || "Petugas Gudang",
          created_at: now,
          updated_at: now
        };
        const cleanRec = sanitizeRecord(rec, VALID_DSP_COLUMNS);
        const { data, error } = await supabase.from("outbound_dispatches").insert([cleanRec]).select().single();
        if (error) {
          console.error("Supabase dispatch insert error:", error);
          throw new Error(error.message);
        }
        const createdRecord = { ...data, dispatch_number: dspNum };
        localDispatches = [createdRecord, ...localDispatches.filter(d => d.id !== createdRecord.id)];
        saveLocalDispatches(localDispatches);
        return createdRecord as any;
      }
      if (path.startsWith("/api/dispatch/") && method === "PUT") {
        const id = path.split("/").pop();
        const payload = { ...body, updated_at: now };
        if (payload.dispatch_date) {
          payload.dispatch_date = String(payload.dispatch_date).split("T")[0];
        }
        const cleanUpdate = sanitizeRecord(payload, VALID_DSP_COLUMNS);
        const { data, error } = await supabase.from("outbound_dispatches").update(cleanUpdate).eq("id", id).select().single();
        if (error) {
          console.error("Supabase dispatch update error:", error);
          throw new Error(error.message);
        }
        const updatedRecord = { ...data, dispatch_number: data.tug8_number || data.bon_pengeluaran_number || data.id };
        localDispatches = localDispatches.map(d => d.id === id ? updatedRecord : d);
        saveLocalDispatches(localDispatches);
        return updatedRecord as any;
      }
      if (path.startsWith("/api/dispatch/") && method === "DELETE") {
        const id = path.split("/").pop();
        const { error } = await supabase.from("outbound_dispatches").delete().eq("id", id);
        if (error) {
          console.error("Supabase dispatch delete error:", error);
          throw new Error(error.message);
        }
        localDispatches = localDispatches.filter(d => d.id !== id);
        saveLocalDispatches(localDispatches);
        return { success: true, id } as any;
      }

      // --- 5. INBOUND RECEIVING ---
      if (path === "/api/receiving" && method === "GET") {
        const { data, error } = await supabase.from("inbound_receivings").select("*").order("created_at", { ascending: false });
        if (!error && data) {
          const mapped = data.map((r: any) => {
            const extractedPhoto = r.photo_evidence_url || (Array.isArray(r.items) ? r.items.find((i: any) => i && i.photo_url)?.photo_url : "") || "";
            return {
              ...r,
              photo_evidence_url: extractedPhoto,
              created_by: r.received_by || "Petugas Gudang"
            };
          });
          localReceiving = mapped as any;
          saveLocalReceiving(mapped);
          return mapped as any;
        }
        return localReceiving as any;
      }
      if (path === "/api/receiving" && method === "POST") {
        // Sanitize vendor_id to ensure foreign key constraint integrity
        let validVendorId = body.vendor_id || null;
        if (validVendorId && !["vnd-1", "vnd-2", "vnd-3", "vnd-4", "vnd-manual"].includes(validVendorId)) {
          validVendorId = null;
        }

        const photoUrl = body.photo_evidence_url || "";
        const rawItems = Array.isArray(body.items) ? body.items : [];
        const itemsWithPhoto = rawItems.map((itm: any, idx: number) => {
          if (!itm.photo_url && photoUrl) {
            return { ...itm, photo_url: photoUrl };
          }
          return itm;
        });

        const rec = {
          ...body,
          id: body.id || `rec-${Date.now()}`,
          purchase_order_num: body.purchase_order_num || `PO-2026-${Math.floor(10000 + Math.random() * 90000)}`,
          delivery_note_num: body.delivery_note_num || `DN-${Date.now().toString().slice(-5)}`,
          vendor_id: validVendorId,
          vendor_name: body.vendor_name || "Vendor Logistik BAG",
          received_by: body.received_by || body.created_by || currentUsername || "Petugas Gudang",
          status: body.status || "ACCEPTED",
          items: itemsWithPhoto,
          received_date: body.received_date ? String(body.received_date).split("T")[0] : now.split("T")[0],
          created_at: now,
          updated_at: now
        };
        const cleanRec = sanitizeRecord(rec, VALID_REC_COLUMNS);
        const { data, error } = await supabase.from("inbound_receivings").insert([cleanRec]).select().single();
        if (error) {
          console.error("Supabase receiving insert error:", error);
          throw new Error(error.message);
        }
        const extractedPhoto = photoUrl || (Array.isArray(data.items) ? data.items.find((i: any) => i && i.photo_url)?.photo_url : "") || "";
        const createdRecord = { ...data, created_by: data.received_by, photo_evidence_url: extractedPhoto };
        localReceiving = [createdRecord, ...localReceiving.filter(r => r.id !== createdRecord.id)];
        saveLocalReceiving(localReceiving);
        return createdRecord as any;
      }
      if (path.startsWith("/api/receiving/") && method === "PUT") {
        const id = path.split("/").pop();
        const payload = { ...body, updated_at: now };
        if (payload.received_date) {
          payload.received_date = String(payload.received_date).split("T")[0];
        }
        if (payload.vendor_id && !["vnd-1", "vnd-2", "vnd-3", "vnd-4", "vnd-manual"].includes(payload.vendor_id)) {
          payload.vendor_id = null;
        }

        const photoUrl = payload.photo_evidence_url || "";
        if (photoUrl && Array.isArray(payload.items)) {
          payload.items = payload.items.map((itm: any) => {
            if (!itm.photo_url) {
              return { ...itm, photo_url: photoUrl };
            }
            return itm;
          });
        }

        const cleanUpdate = sanitizeRecord(payload, VALID_REC_COLUMNS);
        const { data, error } = await supabase.from("inbound_receivings").update(cleanUpdate).eq("id", id).select().single();
        if (error) {
          console.error("Supabase receiving update error:", error);
          throw new Error(error.message);
        }
        const extractedPhoto = photoUrl || (Array.isArray(data.items) ? data.items.find((i: any) => i && i.photo_url)?.photo_url : "") || "";
        const updatedRecord = { ...data, created_by: data.received_by, photo_evidence_url: extractedPhoto };
        localReceiving = localReceiving.map(r => r.id === id ? updatedRecord : r);
        saveLocalReceiving(localReceiving);
        return updatedRecord as any;
      }
      if (path.startsWith("/api/receiving/") && method === "DELETE") {
        const id = path.split("/").pop();
        const { error } = await supabase.from("inbound_receivings").delete().eq("id", id);
        if (error) {
          console.error("Supabase receiving delete error:", error);
          throw new Error(error.message);
        }
        localReceiving = localReceiving.filter(r => r.id !== id);
        saveLocalReceiving(localReceiving);
        return { success: true, id } as any;
      }

      // --- 6. INVENTORY / SPARE PARTS ---
      if (path.startsWith("/api/inventory") && method === "GET") {
        const { data, error } = await supabase.from("spare_parts").select("*");
        if (!error && data) {
          localSpareParts = data as any;
          return data as any;
        }
        return localSpareParts as any;
      }
      if (path.startsWith("/api/inventory") && method === "POST") {
        const validLocId = body.location_id && ["loc-1", "loc-2", "loc-3", "loc-4", "loc-5"].includes(body.location_id)
          ? body.location_id
          : "loc-1";
        const newPart = {
          ...body,
          id: body.id || `part-${Date.now()}`,
          sku: body.sku || `SKU-${Date.now().toString().slice(-6)}`,
          part_number: body.part_number || `PN-${Date.now().toString().slice(-6)}`,
          part_name: body.part_name || "New Spare Part",
          maker: body.maker || body.brand || "OEM / Supplier",
          unit: body.unit || "PCS",
          category: body.category || "General Spares",
          location_id: validLocId,
          current_stock: Number(body.current_stock || 0),
          reorder_point: Number(body.reorder_point || 0),
          created_at: now,
          updated_at: now
        };
        const cleanPart = sanitizeRecord(newPart, VALID_PART_COLUMNS);
        const { data, error } = await supabase.from("spare_parts").insert([cleanPart]).select().single();
        if (error) {
          console.error("Supabase spare_parts insert error:", error);
          throw new Error(error.message);
        }
        localSpareParts = [data, ...localSpareParts.filter(p => p.id !== data.id)];
        return data as any;
      }
      if (path.startsWith("/api/inventory/") && method === "PUT") {
        const id = path.split("/").pop();
        const payload = { ...body, updated_at: now };
        if (payload.location_id && !["loc-1", "loc-2", "loc-3", "loc-4", "loc-5"].includes(payload.location_id)) {
          payload.location_id = "loc-1";
        }
        const cleanUpdate = sanitizeRecord(payload, VALID_PART_COLUMNS);
        const { data, error } = await supabase.from("spare_parts").update(cleanUpdate).eq("id", id).select().single();
        if (error) {
          console.error("Supabase spare_parts update error:", error);
          throw new Error(error.message);
        }
        localSpareParts = localSpareParts.map(p => p.id === id ? data : p);
        return data as any;
      }
      if (path.startsWith("/api/inventory/") && method === "DELETE") {
        const id = path.split("/").pop();
        const { error } = await supabase.from("spare_parts").delete().eq("id", id);
        if (error) {
          console.error("Supabase spare_parts delete error:", error);
          throw new Error(error.message);
        }
        localSpareParts = localSpareParts.filter(p => p.id !== id);
        return { success: true, message: "Deleted" } as any;
      }

      // --- 7. DIGITAL SIGNATURES ---
      if (path.startsWith("/api/signatures") && method === "GET") {
        const { data, error } = await supabase.from("digital_signatures").select("*");
        if (!error && data && data.length > 0) {
          saveLocalSignatures(data as any);
          return data as any;
        }
        return loadLocalSignatures() as any;
      }
      if (path === "/api/signatures" && method === "POST") {
        const newSig = {
          ...body,
          id: body.id || `sig-${Date.now()}`,
          created_at: now,
          updated_at: now
        };
        const cleanSig = sanitizeRecord(newSig, VALID_SIG_COLUMNS);
        const { data, error } = await supabase.from("digital_signatures").insert([cleanSig]).select().single();
        if (error) {
          console.error("Supabase signature insert error:", error);
          throw new Error(error.message);
        }
        return data as any;
      }
      if (path.startsWith("/api/signatures/") && method === "PUT") {
        const id = path.split("/").pop();
        const cleanUpdate = sanitizeRecord({ ...body, updated_at: now }, VALID_SIG_COLUMNS);
        const { data, error } = await supabase.from("digital_signatures").update(cleanUpdate).eq("id", id).select().single();
        if (error) {
          console.error("Supabase signature update error:", error);
          throw new Error(error.message);
        }
        return data as any;
      }
      if (path.startsWith("/api/signatures/") && method === "DELETE") {
        const id = path.split("/").pop();
        const { error } = await supabase.from("digital_signatures").delete().eq("id", id);
        if (error) {
          console.error("Supabase signature delete error:", error);
          throw new Error(error.message);
        }
        return { success: true, id } as any;
      }

      // --- 8. SPK WORK ORDERS ---
      if (path.startsWith("/api/spk") && method === "GET") {
        const { data, error } = await supabase.from("spk_work_orders").select("*");
        if (!error && data) {
          const mapped = data.map((row: any) => ({
            ...row,
            vessels: row.vessels && Array.isArray(row.vessels) ? row.vessels : [
              {
                vessel_name: row.vessel_name || "MV. KARTINI BARUNA",
                items: Array.isArray(row.items) ? row.items.map((i: any) => ({
                  spare_part_id: i.spare_part_id || i.id || "",
                  spare_part_name: i.spare_part_name || i.part_name || "Suku Cadang",
                  part_number: i.part_number || "-",
                  qty_to_pick: i.qty_to_pick || i.qty_requested || i.quantity || 1,
                  unit: i.unit || "PCS"
                })) : []
              }
            ]
          }));
          localSPKs = mapped as any;
          return mapped as any;
        }
        return localSPKs as any;
      }
      if (path === "/api/spk" && method === "POST") {
        const newId = body.id || `spk-${Date.now()}`;
        const newSPK = {
          id: newId,
          spk_number: body.spk_number || `SPK-2026-${Math.floor(10000 + Math.random() * 90000)}`,
          vessel_name: body.vessel_name || (body.vessels?.[0]?.vessel_name) || "MV. KARTINI BARUNA",
          description: body.description || "SPK Work Order Picking",
          assigned_to: body.assigned_to || currentUsername || "Tim Teknis",
          target_port: body.target_port || "Merak",
          date_created: body.date_created ? String(body.date_created).split("T")[0] : now.split("T")[0],
          status: body.status || "Open",
          items: body.items || (body.vessels?.[0]?.items) || []
        };
        const { data, error } = await supabase.from("spk_work_orders").insert([newSPK]).select().single();
        if (error) {
          console.error("Supabase SPK insert error:", error);
          throw new Error(error.message);
        }
        const createdRecord = {
          ...data,
          vessels: body.vessels || [
            {
              vessel_name: data.vessel_name,
              items: data.items || []
            }
          ]
        };
        localSPKs = [createdRecord, ...localSPKs.filter(s => s.id !== createdRecord.id)];
        return createdRecord as any;
      }
      if (path.startsWith("/api/spk/") && method === "PUT") {
        const id = path.split("/").pop();
        const updatePayload: any = {};
        if (body.status) updatePayload.status = body.status;
        if (body.target_port) updatePayload.target_port = body.target_port;
        if (body.description) updatePayload.description = body.description;
        if (body.assigned_to) updatePayload.assigned_to = body.assigned_to;
        if (body.items) updatePayload.items = body.items;
        if (body.vessel_name) updatePayload.vessel_name = body.vessel_name;
        const { data, error } = await supabase.from("spk_work_orders").update(updatePayload).eq("id", id).select().single();
        if (error) {
          console.error("Supabase SPK update error:", error);
          throw new Error(error.message);
        }
        localSPKs = localSPKs.map(s => s.id === id ? { ...s, ...data } : s);
        return data as any;
      }
      if (path.startsWith("/api/spk/") && method === "DELETE") {
        const id = path.split("/").pop();
        const { error } = await supabase.from("spk_work_orders").delete().eq("id", id);
        if (error) {
          console.error("Supabase SPK delete error:", error);
          throw new Error(error.message);
        }
        localSPKs = localSPKs.filter(s => s.id !== id);
        return { success: true } as any;
      }

      // --- 9. WAREHOUSE LOCATIONS & VENDORS ---
      if (path.startsWith("/api/warehouse/locations") && method === "GET") {
        const { data, error } = await supabase.from("warehouse_locations").select("*");
        if (!error && data) {
          localLocations = data as any;
          return data as any;
        }
        return localLocations as any;
      }
      if (path.startsWith("/api/vendors") && method === "GET") {
        const { data, error } = await supabase.from("vendors").select("*");
        if (!error && data) {
          localVendors = data as any;
          return data as any;
        }
        return localVendors as any;
      }

      // --- 10. USERS ---
      if (path.startsWith("/api/users") && method === "GET") {
        const { data, error } = await supabase.from("users").select("*");
        if (!error && data) {
          localUsers = data as any;
          return data as any;
        }
        return localUsers as any;
      }

      // --- 11. LEDGER ---
      if (path.startsWith("/api/ledger") && method === "GET") {
        const { data, error } = await supabase.from("movement_ledger_entries").select("*");
        if (!error && data) {
          localLedger = data as any;
          return data as any;
        }
        return localLedger as any;
      }
    } catch (supabaseErr: any) {
      console.error("Supabase API call error:", supabaseErr);
      throw supabaseErr;
    }
  }

  const headers = {
    "Content-Type": "application/json",
    "x-user-username": currentUsername,
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return (await response.json()) as T;
    }
    // If Vite returned HTML 404
    return getLocalFallbackData<T>(url, options);
  } catch (err) {
    console.warn(`API call to ${url} fallback to local dataset:`, err);
    return getLocalFallbackData<T>(url, options);
  }
}

export const api = {
  // Supabase Storage & Connectivity
  uploadSignature: uploadSignatureToStorage,
  isSupabaseConnected: () => isSupabaseConfigured,

  // Auth & Profile
  async login(username: string, password?: string): Promise<{ success: boolean; user: User }> {
    return fetcher<{ success: boolean; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  async getMe(): Promise<User> {
    return fetcher<User>("/api/auth/me");
  },

  async getUsers(): Promise<User[]> {
    return fetcher<User[]>("/api/users");
  },

  async createUser(data: Partial<User>): Promise<User> {
    return fetcher<User>("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return fetcher<User>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id: string): Promise<{ success: boolean; id: string }> {
    return fetcher<{ success: boolean; id: string }>(`/api/users/${id}`, {
      method: "DELETE",
    });
  },

  // Inventory / Spare parts
  async getInventory(filters?: { search?: string; category?: string; alerts?: string }): Promise<SparePart[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.alerts) params.append("alerts", filters.alerts);
    return fetcher<SparePart[]>(`/api/inventory?${params.toString()}`);
  },

  async createSparePart(data: Partial<SparePart>): Promise<SparePart> {
    return fetcher<SparePart>("/api/inventory", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateSparePart(id: string, data: Partial<SparePart>): Promise<SparePart> {
    return fetcher<SparePart>(`/api/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteSparePart(id: string): Promise<{ success: boolean; message: string }> {
    return fetcher<{ success: boolean; message: string }>(`/api/inventory/${id}`, {
      method: "DELETE",
    });
  },

  // Locations & Vendors
  async getLocations(): Promise<WarehouseLocation[]> {
    return fetcher<WarehouseLocation[]>("/api/warehouse/locations");
  },

  async createLocation(data: Partial<WarehouseLocation>): Promise<WarehouseLocation> {
    return fetcher<WarehouseLocation>("/api/warehouse/locations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateLocation(id: string, data: Partial<WarehouseLocation>): Promise<WarehouseLocation> {
    return fetcher<WarehouseLocation>(`/api/warehouse/locations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteLocation(id: string): Promise<{ success: boolean }> {
    return fetcher<{ success: boolean }>(`/api/warehouse/locations/${id}`, {
      method: "DELETE",
    });
  },

  // SPK (Work Order)
  async getSPKs(): Promise<SPKWorkOrder[]> {
    return fetcher<SPKWorkOrder[]>("/api/spk");
  },

  async createSPK(data: Partial<SPKWorkOrder>): Promise<SPKWorkOrder> {
    return fetcher<SPKWorkOrder>("/api/spk", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateSPK(id: string, data: Partial<SPKWorkOrder>): Promise<SPKWorkOrder> {
    return fetcher<SPKWorkOrder>(`/api/spk/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteSPK(id: string): Promise<{ success: boolean }> {
    return fetcher<{ success: boolean }>(`/api/spk/${id}`, {
      method: "DELETE",
    });
  },

  async getVendors(): Promise<Vendor[]> {
    return fetcher<Vendor[]>("/api/vendors");
  },

  async createVendor(data: Partial<Vendor>): Promise<Vendor> {
    return fetcher<Vendor>("/api/vendors", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Receiving (Inbound)
  async getReceiving(): Promise<InboundReceiving[]> {
    return fetcher<InboundReceiving[]>("/api/receiving");
  },

  async createReceiving(data: Partial<InboundReceiving>): Promise<InboundReceiving> {
    return fetcher<InboundReceiving>("/api/receiving", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateReceiving(id: string, data: any): Promise<InboundReceiving> {
    return fetcher<InboundReceiving>(`/api/receiving/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteReceiving(id: string): Promise<{ success: boolean }> {
    return fetcher<{ success: boolean }>(`/api/receiving/${id}`, {
      method: "DELETE"
    });
  },

  // Dispatch (Outbound)
  async getDispatch(): Promise<OutboundDispatch[]> {
    return fetcher<OutboundDispatch[]>("/api/dispatch");
  },

  async createDispatch(data: Partial<OutboundDispatch>): Promise<OutboundDispatch> {
    return fetcher<OutboundDispatch>("/api/dispatch", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateDispatch(id: string, data: Partial<OutboundDispatch>): Promise<OutboundDispatch> {
    return fetcher<OutboundDispatch>(`/api/dispatch/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteDispatch(id: string): Promise<{ success: boolean }> {
    return fetcher<{ success: boolean }>(`/api/dispatch/${id}`, {
      method: "DELETE"
    });
  },

  async logDispatchAction(id: string, action: "Printed" | "Downloaded" | "Edited" | "Created" | "Picked" | "Packed" | "Dispatched" | "Delivered"): Promise<{ success: boolean }> {
    return fetcher<{ success: boolean }>(`/api/dispatch/${id}/action-log`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  },

  // Vessel Requests
  async getRequests(): Promise<VesselRequest[]> {
    return fetcher<VesselRequest[]>("/api/requests");
  },

  async createRequest(data: Partial<VesselRequest>): Promise<VesselRequest> {
    return fetcher<VesselRequest>("/api/requests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateRequest(id: string, data: { status: string }): Promise<VesselRequest> {
    return fetcher<VesselRequest>(`/api/requests/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Approvals Workflow
  async getApprovals(): Promise<ApprovalTask[]> {
    return fetcher<ApprovalTask[]>("/api/approvals");
  },

  async submitApprovalDecision(id: string, decision: "Approved" | "Rejected", remarks?: string): Promise<ApprovalTask> {
    return fetcher<ApprovalTask>(`/api/approvals/${id}/decide`, {
      method: "POST",
      body: JSON.stringify({ decision, remarks }),
    });
  },

  // Ledger & Audits
  async getLedger(): Promise<MovementLedgerEntry[]> {
    return fetcher<MovementLedgerEntry[]>("/api/ledger");
  },

  async getAudit(): Promise<AuditLog[]> {
    return fetcher<AuditLog[]>("/api/audit");
  },

  // Dashboard Stats Summary Combined
  async getDashboardSummary(): Promise<{
    totalParts: number;
    lowStockParts: number;
    pendingApprovalsCount: number;
    activeDispatchesCount: number;
    totalReceivingCount: number;
    lowStockAlerts: Array<{
      id: string;
      part_name: string;
      part_number: string;
      current_stock: number;
      reorder_point: number;
      sku: string;
    }>;
    pendingMaterialRequests?: MaterialRequest[];
    recentActivities: AuditLog[];
  }> {
    return fetcher("/api/dashboard/summary");
  },

  async seedDemoData(): Promise<{ success: boolean; counts: any }> {
    return fetcher("/api/demo/seed", {
      method: "POST"
    });
  },

  // Material requests and TUG 5 integration
  async getMaterialRequests(): Promise<MaterialRequest[]> {
    return fetcher<MaterialRequest[]>("/api/material-requests");
  },

  async createMaterialRequest(data: Partial<MaterialRequest>): Promise<MaterialRequest> {
    return fetcher<MaterialRequest>("/api/material-requests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async createMaterialRequestBatch(data: Partial<MaterialRequest>[]): Promise<MaterialRequest[]> {
    return fetcher<MaterialRequest[]>("/api/material-requests/batch", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateMaterialRequest(id: string, data: Partial<MaterialRequest>): Promise<MaterialRequest> {
    return fetcher<MaterialRequest>(`/api/material-requests/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteMaterialRequest(id: string): Promise<{ success: boolean; id: string }> {
    return fetcher<{ success: boolean; id: string }>(`/api/material-requests/${id}`, {
      method: "DELETE",
    });
  },

  async logMaterialRequestAction(id: string, action: "Printed" | "Downloaded"): Promise<{ success: boolean }> {
    return fetcher<{ success: boolean }>(`/api/material-requests/${id}/action-log`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  },

  // Material requests TUG 6 integration
  async getMaterialRequestsTUG6(): Promise<MaterialRequest[]> {
    return fetcher<MaterialRequest[]>("/api/material-requests-tug6");
  },

  async createMaterialRequestTUG6(data: Partial<MaterialRequest>): Promise<MaterialRequest> {
    return fetcher<MaterialRequest>("/api/material-requests-tug6", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async createMaterialRequestTUG6Batch(data: Partial<MaterialRequest>[]): Promise<MaterialRequest[]> {
    return fetcher<MaterialRequest[]>("/api/material-requests-tug6/batch", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateMaterialRequestTUG6(id: string, data: Partial<MaterialRequest>): Promise<MaterialRequest> {
    return fetcher<MaterialRequest>(`/api/material-requests-tug6/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteMaterialRequestTUG6(id: string): Promise<{ success: boolean; id: string }> {
    return fetcher<{ success: boolean; id: string }>(`/api/material-requests-tug6/${id}`, {
      method: "DELETE",
    });
  },

  async logMaterialRequestTUG6Action(id: string, action: "Printed" | "Downloaded"): Promise<{ success: boolean }> {
    return fetcher<{ success: boolean }>(`/api/material-requests-tug6/${id}/action-log`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  },

  // Material returns (TUG 10) integration
  async getMaterialReturns(): Promise<MaterialReturn[]> {
    return fetcher<MaterialReturn[]>("/api/material-returns");
  },

  async createMaterialReturn(data: Partial<MaterialReturn>): Promise<MaterialReturn> {
    return fetcher<MaterialReturn>("/api/material-returns", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateMaterialReturn(id: string, data: Partial<MaterialReturn>): Promise<MaterialReturn> {
    return fetcher<MaterialReturn>(`/api/material-returns/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteMaterialReturn(id: string): Promise<{ success: boolean; id: string }> {
    return fetcher<{ success: boolean; id: string }>(`/api/material-returns/${id}`, {
      method: "DELETE",
    });
  },

  async logMaterialReturnAction(id: string, action: "Printed" | "Downloaded"): Promise<{ success: boolean }> {
    return fetcher<{ success: boolean }>(`/api/material-returns/${id}/action-log`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  },

  // Digital Signatures Management API
  async getSignatures(): Promise<DigitalSignature[]> {
    return fetcher<DigitalSignature[]>("/api/signatures");
  },

  async createSignature(data: Partial<DigitalSignature>): Promise<DigitalSignature> {
    return fetcher<DigitalSignature>("/api/signatures", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateSignature(id: string, data: Partial<DigitalSignature>): Promise<DigitalSignature> {
    return fetcher<DigitalSignature>(`/api/signatures/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteSignature(id: string): Promise<{ success: boolean; id: string }> {
    return fetcher<{ success: boolean; id: string }>(`/api/signatures/${id}`, {
      method: "DELETE",
    });
  },

  async resetDefaultSignatures(): Promise<DigitalSignature[]> {
    return fetcher<DigitalSignature[]>("/api/signatures/reset", {
      method: "POST",
    });
  }
};

