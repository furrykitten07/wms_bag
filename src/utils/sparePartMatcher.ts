/**
 * Advanced Spare Part Matcher for WMS Bahtera Adhiguna.
 * 
 * Provides robust, intelligent cross-document spare part matching between:
 * - Inbound Receiving (PO / SPK)
 * - Outbound Dispatch (TUG 8)
 * - Material Requests (TUG 5 / TUG 6)
 * - Master Catalog Spare Parts
 * 
 * Capabilities:
 * 1. Exact ID matching (ignores dummy IDs like temp-, item-, -, null).
 * 2. Distinct Part Number matching (ignores generic PNs like -, n/a, generic, 0).
 * 3. Exact normalized part name matching.
 * 4. Bilingual synonym normalization (e.g. Indonesian <-> English colors: Hitam <-> Black, etc.).
 * 5. Unit / specification token normalization (e.g. 4inch <-> 4 inch, shafts and, for scaling).
 * 6. Token containment & Jaccard similarity scoring.
 */

export const INVALID_PART_NUMBERS = [
  "",
  "-",
  "--",
  "---",
  "none",
  "null",
  "undefined",
  "n/a",
  "na",
  "pn-generic",
  "generic",
  "0"
];

export const isDummyId = (id: any): boolean => {
  if (!id) return true;
  const s = id.toString().trim().toLowerCase();
  return (
    !s ||
    s === "-" ||
    s === "undefined" ||
    s === "null" ||
    s.startsWith("temp-") ||
    s.startsWith("item-")
  );
};

export const cleanStr = (val: any): string =>
  (val || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

export const BILINGUAL_SYNONYMS: Record<string, string> = {
  black: "hitam",
  yellow: "kuning",
  white: "putih",
  red: "merah",
  blue: "biru",
  green: "hijau",
  grey: "abu-abu",
  gray: "abu-abu",
  orange: "oranye",
  brown: "coklat",
  gold: "emas",
  silver: "perak",
  purple: "ungu",
  shaftsand: "shafts and",
  fer: "for",
  scalling: "scaling",
  "4inch": "4 inch",
  "4in": "4 inch",
  "5inch": "5 inch",
  "6inch": "6 inch",
  "8inch": "8 inch"
};

export const normalizePartTokens = (str: string): string[] => {
  if (!str) return [];
  let s = str.toLowerCase();
  // Replace symbols with space
  s = s.replace(/[-_.,\/\\()\[\]"':;@+*]/g, " ");
  // Separate digits from standard measurement units
  s = s.replace(/(\d+)\s*(inch|in|mm|cm|m|kg|pcs|pack|set|botol|box|roll)/g, "$1 $2");

  const rawTokens = s.split(/\s+/).filter(Boolean);
  const normalized: string[] = [];

  for (const t of rawTokens) {
    if (BILINGUAL_SYNONYMS[t]) {
      const syn = BILINGUAL_SYNONYMS[t].split(/\s+/);
      normalized.push(...syn);
    } else {
      normalized.push(t);
    }
  }
  return normalized;
};

export const calculatePartNameSimilarity = (nameA: string, nameB: string): number => {
  const cleanA = cleanStr(nameA);
  const cleanB = cleanStr(nameB);
  if (!cleanA || !cleanB) return 0;
  if (cleanA === cleanB) return 1.0;

  const tokensA = normalizePartTokens(nameA);
  const tokensB = normalizePartTokens(nameB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let matches = 0;
  for (const t of setA) {
    if (setB.has(t)) matches++;
  }

  const shorterLen = Math.min(setA.size, setB.size);
  const longerLen = Math.max(setA.size, setB.size);

  // If shorter token set is completely contained in longer token set
  if (matches === shorterLen) {
    return 0.8 + (matches / longerLen) * 0.2; // 0.8 to 1.0
  }

  // Jaccard similarity across unique tokens
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? matches / union : 0;
};

export const matchSparePartItem = (a: any, b: any, threshold: number = 0.65): boolean => {
  if (!a || !b) return false;

  // 1. By exact ID
  const aId = (a.spare_part_id || a.id || "").toString().trim();
  const bId = (b.spare_part_id || b.id || "").toString().trim();
  if (!isDummyId(aId) && !isDummyId(bId)) {
    if (aId.toLowerCase() === bId.toLowerCase()) return true;
  }

  // 2. By Part Number (if non-dummy)
  const aPn = cleanStr(a.part_number);
  const bPn = cleanStr(b.part_number);
  if (aPn && bPn && !INVALID_PART_NUMBERS.includes(aPn) && !INVALID_PART_NUMBERS.includes(bPn)) {
    if (aPn === bPn) return true;
  }

  // 3. By Part Name
  const aName = a.spare_part_name || a.part_name || "";
  const bName = b.spare_part_name || b.part_name || "";
  if (!aName || !bName) return false;

  if (cleanStr(aName) === cleanStr(bName)) return true;

  // 4. By Token Similarity
  return calculatePartNameSimilarity(aName, bName) >= threshold;
};

