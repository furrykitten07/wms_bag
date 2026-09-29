/**
 * Utility to match and derive TUG 6 (Daftar Permintaan Barang Kritis)
 * from TUG 5 (Material Requests) based on sheet 'CRITICAL' in data/FIKRI.xlsx.
 */

import { MaterialRequest, MaterialRequestItem } from "../types.js";

export const CRITICAL_PARTS_SHEET_DATA = [
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

// Normalized exact lookup set: `${PART_NAME.trim().toUpperCase()}||${PART_NO.trim().toUpperCase()}`
const CRITICAL_EXACT_MAP = new Set(
  CRITICAL_PARTS_SHEET_DATA.map(item =>
    `${item.name.trim().toUpperCase()}||${item.part_no.trim().toUpperCase()}`
  )
);

/**
 * Checks if a given spare part item matches the CRITICAL sheet in FIKRI.xlsx.
 * Strictly performs exact matching based on the combination of PART_NAME + PART_NO.
 * Both fields must match sheet CRITICAL. No partial or fuzzy matching is performed.
 */
export function isItemCritical(item: Partial<MaterialRequestItem>): boolean {
  if (!item) return false;

  const nameUpper = (item.spare_part_name || "").trim().toUpperCase();
  const partNoUpper = (item.part_number || "").trim().toUpperCase();

  if (!nameUpper || !partNoUpper) return false;

  return CRITICAL_EXACT_MAP.has(`${nameUpper}||${partNoUpper}`);
}

/**
 * Derives TUG 6 records directly from TUG 5 material requests as the data source.
 * Filters all TUG 5 records by exact matching (PART_NAME + PART_NO) against sheet CRITICAL.
 * If both match, the record/item is included in TUG 6.
 * If either field does not match or is not found, it is excluded.
 * Preserves all other fields/data from TUG 5 without altering their values.
 */
export function deriveTUG6FromTUG5(tug5List: MaterialRequest[]): MaterialRequest[] {
  if (!Array.isArray(tug5List)) return [];

  const tug6List: MaterialRequest[] = [];
  let seq = 1;

  for (const mr5 of tug5List) {
    if (!mr5 || !Array.isArray(mr5.items)) continue;

    // Filter items to keep only items exactly matching sheet CRITICAL in FIKRI.xlsx
    const criticalItems: MaterialRequestItem[] = mr5.items
      .filter(isItemCritical)
      .map(it => ({ ...it, is_critical: true }));

    if (criticalItems.length > 0) {
      const tug5Num = mr5.tug5_number || `TUG5-2026-${String(seq).padStart(3, "0")}`;
      const tug6Num = mr5.tug6_number || tug5Num.replace("TUG5", "TUG6");
      const mr6Num = mr5.request_number.startsWith("MR6-")
        ? mr5.request_number
        : mr5.request_number.replace("MR-", "MR6-");

      // Preserve all other fields and values from TUG 5 without modification
      const tug6Entry: MaterialRequest = {
        ...mr5,
        id: mr5.id.startsWith("mr6-") ? mr5.id : `mr6-${mr5.id}`,
        request_number: mr6Num,
        tug5_number: tug5Num,
        tug6_number: tug6Num,
        tug_type: "TUG6",
        items: criticalItems
      };

      tug6List.push(tug6Entry);
      seq++;
    }
  }

  return tug6List;
}
