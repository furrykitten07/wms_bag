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

export const CRITICAL_NAME_KEYWORDS = [
  "CYLINDER LINER",
  "MAIN & THRUST BEARING SHELL",
  "ORING CYL. LOWER",
  "O-RING CYL. LOWER",
  "PISTON RING",
  "CONNECTING ROD",
  "CYLINDER COVER",
  "GASKET",
  "MAIN BEARING",
  "PISTON ROD",
  "FUEL INJECTION PUMP",
  "METAL,MAIN BEARING",
  "PACKING P.",
  "PISTON CROWN"
];

export const CRITICAL_PART_NUMBERS = [
  "E245200090A", "00047-001", "Z565002700ZZ", "E200750010",
  "E205150240B", "E205150200A", "E205150170A", "746623-51403",
  "146673-02352", "24316-000210", "24316-000240", "24311-020280",
  "24316-000350", "24311-000090"
];

/**
 * Checks if a given spare part item matches the CRITICAL sheet in FIKRI.xlsx
 */
export function isItemCritical(item: Partial<MaterialRequestItem>): boolean {
  if (!item) return false;
  if ((item as any).is_critical === true) return true;

  const nameUpper = (item.spare_part_name || "").toUpperCase().trim();
  const partNoUpper = (item.part_number || "").toUpperCase().trim();

  // Check exact/partial name matches
  for (const kw of CRITICAL_NAME_KEYWORDS) {
    if (nameUpper.includes(kw)) return true;
  }

  // Check part number matches
  if (partNoUpper && partNoUpper !== "-" && partNoUpper !== "1") {
    for (const pno of CRITICAL_PART_NUMBERS) {
      if (partNoUpper.includes(pno) || pno.includes(partNoUpper)) return true;
    }
  }

  return false;
}

/**
 * Derives TUG 6 records directly from TUG 5 material requests.
 * Only TUG 5 requests containing items from sheet CRITICAL are included in TUG 6.
 */
export function deriveTUG6FromTUG5(tug5List: MaterialRequest[]): MaterialRequest[] {
  if (!Array.isArray(tug5List)) return [];

  const tug6List: MaterialRequest[] = [];
  let seq = 1;

  for (const mr5 of tug5List) {
    if (!mr5 || !Array.isArray(mr5.items)) continue;

    // Filter items to keep only critical items matching sheet CRITICAL in FIKRI.xlsx
    const criticalItems: MaterialRequestItem[] = mr5.items
      .filter(isItemCritical)
      .map(it => ({ ...it, is_critical: true }));

    if (criticalItems.length > 0) {
      const tug5Num = mr5.tug5_number || `TUG5-2026-${String(seq).padStart(3, "0")}`;
      const tug6Num = tug5Num.replace("TUG5", "TUG6");
      const mr6Num = mr5.request_number.replace("MR-", "MR6-");

      const tug6Entry: MaterialRequest = {
        ...mr5,
        id: mr5.id.startsWith("mr6-") ? mr5.id : `mr6-${mr5.id}`,
        request_number: mr6Num,
        tug5_number: tug5Num,
        tug6_number: tug6Num,
        remarks: mr5.remarks ? `${mr5.remarks} (Material Kritis TUG 6)` : `Permintaan Material Kritis TUG 6 untuk ${mr5.vessel_name}`,
        items: criticalItems
      };

      tug6List.push(tug6Entry);
      seq++;
    }
  }

  return tug6List;
}
