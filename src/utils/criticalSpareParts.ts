/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CriticalSparePart, MaterialRequest, MaterialRequestItem } from "../types.js";

/**
 * 26 Default Critical Spare Parts extracted from data/FIKRI.xlsx sheet "CRITICAL"
 */
export const DEFAULT_CRITICAL_SPAREPARTS: Omit<CriticalSparePart, "id" | "created_at">[] = [
  { part_name: "CYLINDER LINER", part_no: "1", category: "Engine Component", equipment: "Main Engine", criticality_level: "CRITICAL", notes: "Komponen kritis ruang bakar silinder mesin" },
  { part_name: "MAIN & THRUST BEARING SHELL", part_no: "1", category: "Bearing", equipment: "Main Engine", criticality_level: "CRITICAL", notes: "Bearing utama & thrust shaft" },
  { part_name: "ORING CYL. LOWER", part_no: "12", category: "Gasket & Seal", equipment: "Cylinder System", criticality_level: "CRITICAL", notes: "Seal O-ring bawah silinder liner" },
  { part_name: "PISTON RING", part_no: "84", category: "Piston & Ring", equipment: "Main Engine", criticality_level: "CRITICAL", notes: "Ring piston kompresi & oli" },
  { part_name: "CONNECTING ROD", part_no: "E245200090A", category: "Engine Component", equipment: "Main Engine", criticality_level: "CRITICAL", notes: "Batang piston penghubung crankshaft" },
  { part_name: "CYLINDER LINER", part_no: "00047-001", category: "Engine Component", equipment: "Main Engine", criticality_level: "CRITICAL", notes: "Liner silinder mesin utama" },
  { part_name: "CONNECTING ROD BEARING (COMPLETE)", part_no: "127", category: "Bearing", equipment: "Main Engine", criticality_level: "CRITICAL", notes: "Metal jalan con-rod komplit" },
  { part_name: "CYLINDER COVER COMPLETE", part_no: "92", category: "Engine Component", equipment: "Cylinder Head", criticality_level: "CRITICAL", notes: "Cylinder head cover assy" },
  { part_name: "CYLINDER LINER", part_no: "46", category: "Engine Component", equipment: "Main Engine", criticality_level: "CRITICAL", notes: "Liner silinder" },
  { part_name: "GASKET", part_no: "Z565002700ZZ", category: "Gasket & Seal", equipment: "Exhaust / Piping", criticality_level: "CRITICAL", notes: "Gasket metal tahan panas" },
  { part_name: "MAIN BEARING SHELL", part_no: "E200750010", category: "Bearing", equipment: "Crankshaft", criticality_level: "CRITICAL", notes: "Metal duduk main bearing" },
  { part_name: "PISTON RING", part_no: "106", category: "Piston & Ring", equipment: "Main Engine", criticality_level: "CRITICAL", notes: "Ring piston" },
  { part_name: "PISTON RING 1", part_no: "E205150240B", category: "Piston & Ring", equipment: "Main Engine", criticality_level: "CRITICAL", notes: "Ring kompresi 1 (top ring)" },
  { part_name: "PISTON RING 2", part_no: "E205150200A", category: "Piston & Ring", equipment: "Main Engine", criticality_level: "CRITICAL", notes: "Ring kompresi 2" },
  { part_name: "PISTON RING 3", part_no: "E205150170A", category: "Piston & Ring", equipment: "Main Engine", criticality_level: "CRITICAL", notes: "Ring kompresi 3 / oil scraper" },
  { part_name: "PISTON RING ASSEMBLY 902", part_no: "902", category: "Piston & Ring", equipment: "Main Engine", criticality_level: "CRITICAL", notes: "Piston ring set lengkap" },
  { part_name: "PISTON ROD COMPLETE", part_no: "155", category: "Engine Component", equipment: "Piston Assembly", criticality_level: "CRITICAL", notes: "Batang piston komplit" },
  { part_name: "FUEL INJECTION PUMP ASSY", part_no: "746623-51403", category: "Fuel System", equipment: "Fuel Injection", criticality_level: "CRITICAL", notes: "Bosch pump / fuel injection pump assy" },
  { part_name: "METAL,MAIN BEARING", part_no: "146673-02352", category: "Bearing", equipment: "Crankshaft", criticality_level: "CRITICAL", notes: "Metal duduk crankshaft" },
  { part_name: "Packing P.21", part_no: "24316-000210", category: "Gasket & Seal", equipment: "Piping & Valves", criticality_level: "CRITICAL", notes: "Packing seal P.21" },
  { part_name: "Packing P.24", part_no: "24316-000240", category: "Gasket & Seal", equipment: "Piping & Valves", criticality_level: "CRITICAL", notes: "Packing seal P.24" },
  { part_name: "Packing P.28", part_no: "24311-020280", category: "Gasket & Seal", equipment: "Piping & Valves", criticality_level: "CRITICAL", notes: "Packing seal P.28" },
  { part_name: "Packing p.35", part_no: "24316-000350", category: "Gasket & Seal", equipment: "Piping & Valves", criticality_level: "CRITICAL", notes: "Packing seal P.35" },
  { part_name: "Packing P.9.0", part_no: "24311-000090", category: "Gasket & Seal", equipment: "Piping & Valves", criticality_level: "CRITICAL", notes: "Packing seal P.9.0" },
  { part_name: "PISTON CROWN", part_no: "-", category: "Piston & Ring", equipment: "Main Engine", criticality_level: "CRITICAL", notes: "Kepala piston ruang bakar" },
  { part_name: "O-RING", part_no: "9", category: "Gasket & Seal", equipment: "General Piping", criticality_level: "CRITICAL", notes: "O-ring seal pelindung kebocoran" },
];

const STORAGE_KEY = "wms_critical_spareparts";

/**
 * Load critical spare parts from localStorage or initialize with default FIKRI.xlsx data
 */
export function loadCriticalSpareParts(): CriticalSparePart[] {
  if (typeof window === "undefined") {
    return DEFAULT_CRITICAL_SPAREPARTS.map((p, idx) => ({
      ...p,
      id: `crit-default-${idx + 1}`,
      created_at: new Date().toISOString()
    }));
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: CriticalSparePart) => ({ ...p, criticality_level: "CRITICAL" }));
      }
    }
  } catch (err) {
    console.error("Failed to load critical spare parts from localStorage:", err);
  }

  // Initialize with default 26 items
  const initialParts: CriticalSparePart[] = DEFAULT_CRITICAL_SPAREPARTS.map((p, idx) => ({
    ...p,
    id: `crit-${Date.now()}-${idx + 1}`,
    created_at: new Date().toISOString(),
    created_by: "Super Admin (FIKRI.xlsx)"
  }));

  saveCriticalSpareParts(initialParts);
  return initialParts;
}

/**
 * Save critical spare parts to localStorage
 */
export function saveCriticalSpareParts(parts: CriticalSparePart[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parts));
  } catch (err) {
    console.error("Failed to save critical spare parts to localStorage:", err);
  }
}

/**
 * Reset critical spare parts to default 26 items from FIKRI.xlsx
 */
export function resetCriticalSparePartsToDefault(): CriticalSparePart[] {
  const defaultList: CriticalSparePart[] = DEFAULT_CRITICAL_SPAREPARTS.map((p, idx) => ({
    ...p,
    id: `crit-${Date.now()}-${idx + 1}`,
    created_at: new Date().toISOString(),
    created_by: "Super Admin (FIKRI.xlsx)"
  }));
  saveCriticalSpareParts(defaultList);
  return defaultList;
}

/**
 * Check if a spare part item matches EXACTLY with the Critical Spare Parts master database.
 * 
 * STRICT RULE (USER DIRECTIVE):
 * - Data harus sama persis seperti yang di menu "CRITICAL SPARE PARTS TUG 6"
 * - Data harus identik sesuai dengan Nama Suku Cadang DAN Part Number secara bersamaan
 * - JANGAN mencocokkan hanya berdasarkan salah satu field (nama saja atau part number saja)
 * - Keduanya (part_name DAN part_number) HARUS SAMA-SAMA COCOK / IDENTIK
 */
export function checkIsCriticalPart(
  item: { spare_part_name?: string; part_number?: string },
  criticalParts: CriticalSparePart[]
): { isCritical: boolean; matchedCritical?: CriticalSparePart; matchReason?: string } {
  if (!item || !criticalParts || criticalParts.length === 0) {
    return { isCritical: false };
  }

  const rawItemName = String(item.spare_part_name || "").trim().toUpperCase();
  const rawItemPn = String(item.part_number || "").trim().toUpperCase();

  const cleanItemName = rawItemName.replace(/\s+/g, " ");
  const alphaItemName = rawItemName.replace(/[^A-Z0-9]/g, "");

  const cleanItemPn = rawItemPn.replace(/[^A-Z0-9]/g, "");
  const hasItemPn = cleanItemPn !== "" && cleanItemPn !== "-";

  for (const crit of criticalParts) {
    const rawCritName = String(crit.part_name || "").trim().toUpperCase();
    const rawCritPn = String(crit.part_no || "").trim().toUpperCase();

    const cleanCritName = rawCritName.replace(/\s+/g, " ");
    const alphaCritName = rawCritName.replace(/[^A-Z0-9]/g, "");

    const cleanCritPn = rawCritPn.replace(/[^A-Z0-9]/g, "");
    const hasCritPn = cleanCritPn !== "" && cleanCritPn !== "-";

    // 1. MUST IDENTICALLY MATCH PART NAME
    const isNameIdentical = 
      cleanItemName === cleanCritName || 
      (alphaItemName.length > 0 && alphaItemName === alphaCritName);

    if (!isNameIdentical) {
      continue; // Nama berbeda -> BUKAN CRITICAL
    }

    // 2. MUST IDENTICALLY MATCH PART NUMBER (KEDUANYA HARUS COCOK)
    if (hasCritPn) {
      // Master memiliki part number spesifik (misal: "1", "12", "00047-001", "E245200090A", dsb)
      // Item juga harus memiliki part number dan wajib sama persis
      if (!hasItemPn) {
        continue; // Master punya PN tapi item tidak punya PN -> BUKAN CRITICAL
      }
      if (cleanItemPn !== cleanCritPn) {
        continue; // Part number berbeda -> BUKAN CRITICAL
      }
    } else {
      // Master TIDAK memiliki part number (part_no "-" atau kosong, misal PISTON CROWN di master)
      // Item incoming juga HARUS TIDAK memiliki part number ("-" atau kosong).
      // Jika item incoming memiliki part number spesifik (misal: PN-407142), maka TIDAK IDENTIK -> BUKAN CRITICAL!
      if (hasItemPn) {
        continue; // Item punya PN spesifik sedangkan master "-", jadi tidak identik
      }
    }

    // KEDUANYA (NAMA DAN PART NUMBER) IDENTIK DENGAN MASTER CRITICAL!
    return {
      isCritical: true,
      matchedCritical: crit,
      matchReason: `Identik Master: ${crit.part_name} | P/N: ${crit.part_no || "-"}`
    };
  }

  return { isCritical: false };
}

export interface SPKCriticalComparisonItem {
  id: string;
  part_name: string;
  part_number: string;
  unit: string;
  critical_info?: Partial<CriticalSparePart>;
  match_reason: string;
  is_critical?: boolean;
  // TUG 5 Info
  tug5_qty: number;
  tug5_request_numbers: string[];
  tug5_status?: string;
  // TUG 6 Info
  tug6_qty: number;
  tug6_request_numbers: string[];
  tug6_status?: string;
  // Fulfillment Status
  fulfillment_status: "FULFILLED" | "PARTIAL" | "UNFULFILLED" | "TUG6_ONLY";
  vessel_name?: string;
  spk_number: string;
}

/**
 * Correlates all items between TUG 5 (Requested) and TUG 6 (Issued) for a specific SPK number,
 * classifying items as CRITICAL or REGULER and prioritizing critical items.
 */
export function matchCriticalPartsForSPK(
  spkNumber: string,
  tug5Requests: MaterialRequest[] = [],
  tug6Requests: MaterialRequest[] = [],
  criticalParts: CriticalSparePart[] = []
): SPKCriticalComparisonItem[] {
  if (!spkNumber) return [];

  const cleanTargetSPK = spkNumber.trim().toLowerCase();

  // Find all TUG 5 matching this SPK
  const matchedTUG5 = tug5Requests.filter(r => {
    const rSPK = (r.spk_number || r.work_order_ref || "").trim().toLowerCase();
    const rRemarks = (r.remarks || "").toLowerCase();
    return rSPK === cleanTargetSPK || (cleanTargetSPK.length >= 6 && (rSPK.includes(cleanTargetSPK) || rRemarks.includes(cleanTargetSPK)));
  });

  // Find all TUG 6 matching this SPK
  const matchedTUG6 = tug6Requests.filter(r => {
    const rSPK = (r.spk_number || r.work_order_ref || "").trim().toLowerCase();
    const rRemarks = (r.remarks || "").toLowerCase();
    return rSPK === cleanTargetSPK || (cleanTargetSPK.length >= 6 && (rSPK.includes(cleanTargetSPK) || rRemarks.includes(cleanTargetSPK)));
  });

  // Map of all items: key = critical ID or normalized PN / Name
  const itemsMap = new Map<string, SPKCriticalComparisonItem>();

  // 1. Process TUG 5 Items
  matchedTUG5.forEach(tug5 => {
    (tug5.items || []).forEach(item => {
      const { isCritical, matchedCritical, matchReason } = checkIsCriticalPart(item, criticalParts);
      const cleanPN = (item.part_number || "-").trim();
      const cleanName = (item.spare_part_name || "").trim();
      
      const key = isCritical && matchedCritical
        ? `crit-${matchedCritical.id || `${matchedCritical.part_name}-${matchedCritical.part_no}`}`
        : `reg-${(item.spare_part_id || `${cleanName}-${cleanPN}`).toLowerCase()}`;

      const existing = itemsMap.get(key);
      const reqQty = Number(item.requested_qty) || 0;

      if (existing) {
        existing.tug5_qty += reqQty;
        if (tug5.request_number && !existing.tug5_request_numbers.includes(tug5.request_number)) {
          existing.tug5_request_numbers.push(tug5.request_number);
        }
      } else {
        itemsMap.set(key, {
          id: `item-${key}`,
          part_name: (isCritical && matchedCritical?.part_name) ? matchedCritical.part_name : (item.spare_part_name || "Suku Cadang"),
          part_number: (isCritical && matchedCritical?.part_no && matchedCritical.part_no !== "-") ? matchedCritical.part_no : cleanPN,
          unit: item.unit || matchedCritical?.unit || "PCS",
          critical_info: matchedCritical || {
            id: `crit-reg-${key}`,
            part_name: (item.spare_part_name || "Suku Cadang"),
            part_no: cleanPN,
            category: "Reguler",
            equipment: "-",
            criticality_level: "NORMAL",
            notes: "Suku Cadang Reguler"
          },
          match_reason: matchReason || (isCritical ? "Critical Match" : "Reguler"),
          is_critical: isCritical,
          tug5_qty: reqQty,
          tug5_request_numbers: tug5.request_number ? [tug5.request_number] : [],
          tug5_status: tug5.status,
          tug6_qty: 0,
          tug6_request_numbers: [],
          fulfillment_status: "UNFULFILLED",
          vessel_name: tug5.vessel_name,
          spk_number: spkNumber
        });
      }
    });
  });

  // 2. Process TUG 6 Items
  matchedTUG6.forEach(tug6 => {
    (tug6.items || []).forEach(item => {
      const { isCritical, matchedCritical, matchReason } = checkIsCriticalPart(item, criticalParts);
      const cleanPN = (item.part_number || "-").trim();
      const cleanName = (item.spare_part_name || "").trim();

      const key = isCritical && matchedCritical
        ? `crit-${matchedCritical.id || `${matchedCritical.part_name}-${matchedCritical.part_no}`}`
        : `reg-${(item.spare_part_id || `${cleanName}-${cleanPN}`).toLowerCase()}`;

      const existing = itemsMap.get(key);
      const issuedQty = Number(item.approved_qty ?? item.requested_qty) || 0;

      if (existing) {
        existing.tug6_qty += issuedQty;
        if (tug6.request_number && !existing.tug6_request_numbers.includes(tug6.request_number)) {
          existing.tug6_request_numbers.push(tug6.request_number);
        }
        if (tug6.status) {
          existing.tug6_status = tug6.status;
        }
      } else {
        itemsMap.set(key, {
          id: `item-${key}`,
          part_name: (isCritical && matchedCritical?.part_name) ? matchedCritical.part_name : (item.spare_part_name || "Suku Cadang"),
          part_number: (isCritical && matchedCritical?.part_no && matchedCritical.part_no !== "-") ? matchedCritical.part_no : cleanPN,
          unit: item.unit || matchedCritical?.unit || "PCS",
          critical_info: matchedCritical || {
            id: `crit-reg-${key}`,
            part_name: (item.spare_part_name || "Suku Cadang"),
            part_no: cleanPN,
            category: "Reguler",
            equipment: "-",
            criticality_level: "NORMAL",
            notes: "Suku Cadang Reguler"
          },
          match_reason: matchReason || (isCritical ? "Critical Match" : "Reguler"),
          is_critical: isCritical,
          tug5_qty: 0,
          tug5_request_numbers: [],
          tug6_qty: issuedQty,
          tug6_request_numbers: tug6.request_number ? [tug6.request_number] : [],
          tug6_status: tug6.status,
          fulfillment_status: "TUG6_ONLY",
          vessel_name: tug6.vessel_name,
          spk_number: spkNumber
        });
      }
    });
  });

  // 3. Calculate Fulfillment Status
  const result: SPKCriticalComparisonItem[] = [];
  itemsMap.forEach(item => {
    if (item.tug5_qty > 0 && item.tug6_qty >= item.tug5_qty) {
      item.fulfillment_status = "FULFILLED";
    } else if (item.tug5_qty > 0 && item.tug6_qty > 0) {
      item.fulfillment_status = "PARTIAL";
    } else if (item.tug5_qty > 0 && item.tug6_qty === 0) {
      item.fulfillment_status = "UNFULFILLED";
    } else {
      item.fulfillment_status = "TUG6_ONLY";
    }
    result.push(item);
  });

  // Sort by priority: CRITICAL items first at top, then UNFULFILLED, PARTIAL, TUG6_ONLY, FULFILLED
  const order = { UNFULFILLED: 0, PARTIAL: 1, TUG6_ONLY: 2, FULFILLED: 3 };
  result.sort((a, b) => {
    if (a.is_critical && !b.is_critical) return -1;
    if (!a.is_critical && b.is_critical) return 1;
    return order[a.fulfillment_status] - order[b.fulfillment_status];
  });

  return result;
}
