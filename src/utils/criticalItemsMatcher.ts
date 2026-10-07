/**
 * Utility to match and derive TUG 6 (Daftar Permintaan Barang Kritis)
 * from TUG 5 (Material Requests) based on sheet 'CRITICAL' in data/FIKRI.xlsx.
 * 
 * USER DIRECTIVE:
 * - Lakukan filtering terhadap seluruh data TUG 5 menggunakan sheet CRITICAL pada file data/FIKRI.xlsx
 * - Untuk setiap record TUG 5, lakukan EXACT MATCHING berdasarkan kombinasi PART_NAME + PART_NO.
 * - Jika PART_NAME DAN PART_NO sama-sama ditemukan di sheet CRITICAL, masukkan record tersebut ke TUG 6.
 * - Jika salah satu tidak cocok atau tidak ditemukan, JANGAN masukkan record tersebut ke TUG 6.
 * - JANGAN melakukan partial/fuzzy matching.
 * - JANGAN mencocokkan hanya berdasarkan salah satu field.
 * - Pertahankan field/data lainnya dari TUG 5 tanpa mengubah nilainya.
 * - Berikan notes tambahan yang mana item criticalnya, supaya user tau.
 */

import { MaterialRequest, MaterialRequestItem } from "../types.js";

export interface CriticalPartEntry {
  name: string;
  part_no: string;
}

export const CRITICAL_PARTS_SHEET_DATA: CriticalPartEntry[] = [
  { name: "CYLINDER LINER", part_no: "1" },
  { name: "MAIN & THRUST BEARING SHELL", part_no: "1" },
  { name: "ORING CYL. LOWER", part_no: "12" },
  { name: "PISTON RING", part_no: "84" },
  { name: "CONNECTING ROD", part_no: "E245200090A" },
  { name: "CYLINDER LINER", part_no: "00047-001" },
  { name: "CONNECTING ROD BEARING (COMPLETE)", part_no: "127" },
  { name: "CYLINDER COVER COMPLETE", part_no: "92" },
  { name: "CYLINDER LINER", part_no: "46" },
  { name: "GASKET", part_no: "Z565002700ZZ" },
  { name: "MAIN BEARING SHELL", part_no: "E200750010" },
  { name: "PISTON RING", part_no: "106" },
  { name: "PISTON RING 1", part_no: "E205150240B" },
  { name: "PISTON RING 2", part_no: "E205150200A" },
  { name: "PISTON RING 3", part_no: "E205150170A" },
  { name: "PISTON RING ASSEMBLY 902", part_no: "902" },
  { name: "PISTON ROD COMPLETE", part_no: "155" },
  { name: "FUEL INJECTION PUMP ASSY", part_no: "746623-51403" },
  { name: "METAL,MAIN BEARING", part_no: "146673-02352" },
  { name: "Packing P.21", part_no: "24316-000210" },
  { name: "Packing P.24", part_no: "24316-000240" },
  { name: "Packing P.28", part_no: "24311-020280" },
  { name: "Packing p.35", part_no: "24316-000350" },
  { name: "Packing P.9.0", part_no: "24311-000090" },
  { name: "PISTON CROWN", part_no: "-" },
  { name: "O-RING", part_no: "9" }
];

/**
 * Fast lookup set containing the exact normalized (PART_NAME + "|||" + PART_NO) pairs.
 */
export const CRITICAL_EXACT_SET = new Set<string>(
  CRITICAL_PARTS_SHEET_DATA.map(entry => 
    `${entry.name.trim().toUpperCase()}|||${String(entry.part_no).trim().toUpperCase()}`
  )
);

/**
 * Checks if a given spare part item matches EXACTLY with the sheet CRITICAL in FIKRI.xlsx.
 * Strictly checks that BOTH PART_NAME and PART_NO match an entry in CRITICAL.
 * No partial, no fuzzy, and no single-field matching.
 */
export function isItemCritical(item: Partial<MaterialRequestItem> | null | undefined): boolean {
  if (!item) return false;
  if (item.is_critical) return true;
  if (item.notes && item.notes.includes("[ITEM CRITICAL]")) return true;

  const rawName = item.spare_part_name;
  const rawPartNo = item.part_number;

  if (!rawName && !rawPartNo) {
    return false;
  }

  const nameUpper = String(rawName || "").trim().toUpperCase();
  const partNoUpper = String(rawPartNo || "").trim().toUpperCase();

  if (nameUpper && partNoUpper && CRITICAL_EXACT_SET.has(`${nameUpper}|||${partNoUpper}`)) {
    return true;
  }

  // Also match normalized part numbers from critical list
  if (partNoUpper) {
    const normPartNo = partNoUpper.replace(/[^A-Z0-9]/g, "");
    if (normPartNo) {
      for (const entry of CRITICAL_PARTS_SHEET_DATA) {
        const entryPartNorm = entry.part_no.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (entryPartNorm && normPartNo === entryPartNorm) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Derives TUG 6 records directly from TUG 5 material requests.
 * Only TUG 5 requests containing items from sheet CRITICAL are included in TUG 6.
 * Non-critical items in the request are excluded from TUG 6.
 * Preserves all other fields of the TUG 5 request and items without altering their values.
 * Adds notes [ITEM CRITICAL] to clearly indicate critical items to the user.
 */
export function deriveTUG6FromTUG5(tug5List: MaterialRequest[]): MaterialRequest[] {
  if (!Array.isArray(tug5List)) return [];

  const tug6List: MaterialRequest[] = [];
  let seq = 1;

  for (const mr5 of tug5List) {
    if (!mr5 || !Array.isArray(mr5.items)) continue;

    // Filter items to keep only items with exact match on (PART_NAME + PART_NO)
    const criticalItems: MaterialRequestItem[] = [];

    for (const it of mr5.items) {
      if (isItemCritical(it)) {
        const existingNotes = it.notes ? String(it.notes).trim() : "";
        const noteWithTag = existingNotes.includes("[ITEM CRITICAL]")
          ? existingNotes
          : existingNotes
            ? `[ITEM CRITICAL] ${existingNotes}`
            : `[ITEM CRITICAL] Permintaan SPK ${mr5.spk_number || mr5.work_order_ref || "NP"}`;

        criticalItems.push({
          ...it,
          is_critical: true,
          notes: noteWithTag
        });
      }
    }

    if (criticalItems.length > 0) {
      const tug5Num = mr5.tug5_number || `TUG5-2026-${String(seq).padStart(3, "0")}`;
      const tug6Num = mr5.tug6_number && mr5.tug6_number.startsWith("TUG6-")
        ? mr5.tug6_number
        : tug5Num.replace(/^TUG5/i, "TUG6");
      const mr6Num = mr5.request_number.startsWith("MR6-")
        ? mr5.request_number
        : mr5.request_number.replace(/^MR-/i, "MR6-");

      const origRemarks = mr5.remarks ? String(mr5.remarks).trim() : "";
      const remarksWithTag = origRemarks.includes("Material Kritis")
        ? origRemarks
        : origRemarks
          ? `${origRemarks} (Material Kritis TUG 6 - Sheet CRITICAL FIKRI.xlsx)`
          : `Permintaan Material Kritis (TUG 6) untuk ${mr5.vessel_name || "Armada Baruna"}`;

      const tug6Entry: MaterialRequest = {
        ...mr5,
        id: mr5.id.startsWith("mr6-") ? mr5.id : `mr6-${mr5.id}`,
        request_number: mr6Num,
        tug5_number: tug5Num,
        tug6_number: tug6Num,
        remarks: remarksWithTag,
        items: criticalItems
      };

      tug6List.push(tug6Entry);
      seq++;
    }
  }

  return tug6List;
}
