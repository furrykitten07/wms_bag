/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from "jszip";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { MaterialRequest, DigitalSignature } from "../types.js";
import { sanitizeSignatureUrl, createSVGSignatureDataUrl } from "./signatureUtils.js";

function getSignatureForSlot(
  roleOrTitle: string, 
  name?: string, 
  signaturesList?: DigitalSignature[],
  docData?: any
): string | null {
  const rLower = roleOrTitle.toLowerCase().trim();
  const nLower = (name || "").toLowerCase().trim();
  
  if (docData) {
    if (rLower.includes("vp") || rLower.includes("sumbono")) {
      if (docData.sumbono_signed) {
        return sanitizeSignatureUrl(docData.sumbono_signature_url, "Sumbono");
      }
    }
    if (rLower.includes("manager") || rLower.includes("emir")) {
      if (docData.emir_signed) {
        return sanitizeSignatureUrl(docData.emir_signature_url, "Mohamat Emir Ferdian");
      }
    }
    if (rLower.includes("kepala gudang") || rLower.includes("kepala_gudang") || nLower.includes("alfin")) {
      if (docData.alfin_signed || docData.kepala_gudang_signed) {
        return sanitizeSignatureUrl(docData.alfin_signature_url || docData.kepala_gudang_signature_url, "MAGHFUR MUHAMMAD ALFIN");
      }
    }
    if (rLower.includes("petugas gudang") || rLower.includes("petugas_gudang") || nLower.includes("aldi")) {
      if (docData.aldi_signed || docData.petugas_gudang_signed) {
        return sanitizeSignatureUrl(docData.aldi_signature_url || docData.petugas_gudang_signature_url, "Aldi Hidayat");
      }
    }
  }

  let sigs = signaturesList;
  if (!sigs || sigs.length === 0) {
    try {
      const saved = localStorage.getItem("wms_digital_signatures");
      if (saved) sigs = JSON.parse(saved);
    } catch (e) {}
  }

  if (nLower && !nLower.includes("...") && nLower !== "(-)") {
    const matchName = (sigs || []).find(s => s.user_name.toLowerCase().trim() === nLower);
    if (matchName) return sanitizeSignatureUrl(matchName.signature_url, name || matchName.user_name);
  }

  if (rLower.includes("kepala gudang") || rLower.includes("kepala_gudang")) {
    const matchKG = (sigs || []).find(s => s.role_title.toLowerCase().includes("kepala gudang") || s.user_name.toLowerCase().includes("alfin"));
    if (matchKG) return sanitizeSignatureUrl(matchKG.signature_url, "MAGHFUR MUHAMMAD ALFIN");
    return createSVGSignatureDataUrl("MAGHFUR MUHAMMAD ALFIN");
  }

  if (rLower.includes("petugas gudang") || rLower.includes("petugas_gudang")) {
    const matchPG = (sigs || []).find(s => s.role_title.toLowerCase().includes("petugas gudang") || s.user_name.toLowerCase().includes("aldi"));
    if (matchPG) return sanitizeSignatureUrl(matchPG.signature_url, "Aldi Hidayat");
    return createSVGSignatureDataUrl("Aldi Hidayat");
  }

  const matchRole = (sigs || []).find(s => {
    const sRole = s.role_title.toLowerCase().trim();
    return sRole === rLower || sRole.includes(rLower) || rLower.includes(sRole);
  });
  if (matchRole) return sanitizeSignatureUrl(matchRole.signature_url, name || matchRole.user_name);

  if (name && name !== "(-)" && !name.includes("...")) {
    return createSVGSignatureDataUrl(name);
  }

  return null;
}

function formatHeaderDate(dateVal?: string): string {
  const d = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(d.getTime())) return dateVal || "-";
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function safeFormatDate(dateVal?: string, fallback: string = "-"): string {
  if (!dateVal) return fallback;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString("id-ID");
}

export function getCleanTUGFilename(req: MaterialRequest, type: "tug5" | "tug6", idx: number): string {
  const typeUpper = type.toUpperCase();
  let docNum = (
    (type === "tug5" ? req.tug5_number : req.tug6_number) ||
    req.tug_number ||
    req.request_number ||
    ""
  ).trim();

  // Strip any accidental TUG5_REQ_ or TUG6_REQ_ or REQ_ prefixes
  docNum = docNum.replace(/^(TUG[56])_REQ_/i, "$1-").replace(/^[A-Z0-9]+_REQ_/i, "");

  // If docNum is empty or doesn't have year/number, build TUG5-(tahun)-(nomor)
  if (!docNum || docNum === "-") {
    const d = new Date(req.request_date || req.created_at || Date.now());
    const year = isNaN(d.getFullYear()) ? 2026 : d.getFullYear();
    const seq = String(idx + 1).padStart(3, "0");
    return `${typeUpper}-${year}-${seq}.pdf`;
  }

  // Check if it already matches TUG5-YYYY-XXX or TUG6-YYYY-XXX
  const matchTUG = docNum.match(/^TUG[56]-(\d{4})-(.+)$/i);
  if (matchTUG) {
    const year = matchTUG[1];
    const num = matchTUG[2].replace(/[/\\?%*:|"<>]/g, "_").trim();
    return `${typeUpper}-${year}-${num}.pdf`;
  }

  // If it's something like MR-2026-000302 or REQ-2026-085
  const matchOther = docNum.match(/(?:[A-Z]+-)?(\d{4})[-_](\d+)/i);
  if (matchOther) {
    const year = matchOther[1];
    const seq = parseInt(matchOther[2], 10);
    const num = isNaN(seq) ? matchOther[2] : String(seq).padStart(3, "0");
    return `${typeUpper}-${year}-${num}.pdf`;
  }

  // Fallback: clean the characters and ensure type prefix
  const clean = docNum.replace(/[/\\?%*:|"<>]/g, "_").replace(/^_+|_+$/g, "");
  if (clean.toUpperCase().startsWith(`${typeUpper}-`)) {
    return `${clean}.pdf`;
  }
  return `${typeUpper}-${clean}.pdf`;
}

function resolveCleanDocNum(req: MaterialRequest, type: "tug5" | "tug6"): string {
  const rawDocNum = (
    (type === "tug5" ? req.tug5_number : req.tug6_number) ||
    req.tug_number ||
    req.request_number ||
    ""
  ).trim();

  let docNum = rawDocNum.replace(/^(TUG[56])_REQ_/i, "$1-").replace(/^[A-Z0-9]+_REQ_/i, "");
  if (!docNum || docNum === "-") {
    const d = new Date(req.request_date || req.created_at || Date.now());
    const year = isNaN(d.getFullYear()) ? 2026 : d.getFullYear();
    return `${type.toUpperCase()}-${year}-001`;
  }
  if (!docNum.toUpperCase().startsWith(`${type.toUpperCase()}-`)) {
    const matchOther = docNum.match(/(?:[A-Z]+-)?(\d{4})[-_](\d+)/i);
    if (matchOther) {
      const year = matchOther[1];
      const seq = parseInt(matchOther[2], 10);
      const num = isNaN(seq) ? matchOther[2] : String(seq).padStart(3, "0");
      return `${type.toUpperCase()}-${year}-${num}`;
    }
    return `${type.toUpperCase()}-${docNum}`;
  }
  return docNum;
}

export function generateSingleTUGHTML(
  req: MaterialRequest,
  type: "tug5" | "tug6",
  signatures: DigitalSignature[]
): string {
  const docNum = resolveCleanDocNum(req, type);
  const titleText = type === "tug5" 
    ? "DAFTAR PERMINTAAN BARANG-BARANG (MATERIAL UMUM)"
    : "DAFTAR PERMINTAAN BARANG-BARANG (SPAREPART)";
  const typeBadge = type === "tug5" ? "TUG 5" : "TUG 6";
  const typeDesc = type === "tug5" ? "GENERAL MATERIAL REQUEST FORM (TUG 5)" : "SPARE PARTS REQUEST FORM (TUG 6)";
  
  const headerDate = formatHeaderDate(req.request_date || req.created_at);
  const tanggalPengajuan = safeFormatDate(req.request_date, headerDate);

  const sigVP = getSignatureForSlot("VP RENDALHAR", "Sumbono", signatures, req);
  const sigManager = getSignatureForSlot("Manager Logistik", "Mohamat Emir Ferdian", signatures, req);
  const sigGudang = null;
  const sigPetugasGudang = getSignatureForSlot("Petugas Gudang", "MAGHFUR MUHAMMAD ALFIN", signatures, req) || getSignatureForSlot("Petugas Gudang", "Aldi Hidayat", signatures, req) || createSVGSignatureDataUrl("MAGHFUR MUHAMMAD ALFIN");

  const cleanAddress = (req.delivery_address || "Pelabuhan Merak, Cilegon, Banten")
    .replace(/,\s*SPK\s+[^,]+/gi, "")
    .replace(/,\s*SPK\s*.*$/gi, "")
    .trim();

  const nameColHeader = type === "tug5" ? "NAMA BARANG (DITULIS LENGKAP)" : "NAMA BARANG &amp; SPESIFIKASI / NOMOR KATALOG";
  const defaultNotes = req.spk_number || req.work_order_ref ? `Permintaan SPK ${req.spk_number || req.work_order_ref}` : "(-)";

  // Material items: standard 8 rows to give the table an authoritative, stately presence
  const rawItems = req.items || [];
  const standardRows = Math.max(rawItems.length, 8);

  let rowsHtml = "";
  for (let idx = 0; idx < standardRows; idx++) {
    const item = rawItems[idx];
    const isLast = idx === standardRows - 1;
    const borderStyle = isLast ? "" : "border-bottom: 1px solid #cbd5e1;";

    if (item) {
      rowsHtml += `
        <tr style="${borderStyle} background-color: #ffffff; height: 38px;">
          <td style="width: 34px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #475569; font-size: 11px;">${idx + 1}</td>
          <td style="width: 216px; padding: 7px 10px; border-right: 1px solid #cbd5e1; font-weight: bold; color: #0f172a; line-height: 1.3; font-size: 11px; word-break: break-word;">${item.spare_part_name || "(-)"}</td>
          <td style="width: 120px; padding: 7px 8px; border-right: 1px solid #cbd5e1; font-weight: 600; color: #1e293b; font-size: 10.5px; word-break: break-word;">${item.part_number || "-"}</td>
          <td style="width: 42px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; text-transform: uppercase; font-weight: 600; color: #1e293b; font-size: 10.5px;">${item.unit || "(-)"}</td>
          <td style="width: 80px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; color: #1e40af; font-weight: 800; font-size: 12px; background-color: #eff6ff;">${item.requested_qty || "(-)"}</td>
          <td style="width: 58px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; color: #334155; font-size: 10.5px;"></td>
          <td style="width: 188px; padding: 7px 8px; color: #334155; font-style: italic; font-size: 9.5px; line-height: 1.3; word-break: break-word; overflow-wrap: anywhere;">${item.notes || defaultNotes}</td>
        </tr>
      `;
    } else {
      // Clean blank row for standard form structure
      rowsHtml += `
        <tr style="${borderStyle} background-color: #ffffff; height: 38px;">
          <td style="width: 34px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; color: #cbd5e1; font-size: 10px;">${idx + 1}</td>
          <td style="width: 216px; padding: 7px 10px; border-right: 1px solid #cbd5e1; color: #cbd5e1; font-size: 10px;">-</td>
          <td style="width: 120px; padding: 7px 8px; border-right: 1px solid #cbd5e1; color: #cbd5e1; font-size: 10px;">-</td>
          <td style="width: 42px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; color: #cbd5e1; font-size: 10px;">-</td>
          <td style="width: 80px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; color: #cbd5e1; background-color: #f8fafc; font-size: 10px;">-</td>
          <td style="width: 58px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; color: #cbd5e1; font-size: 10px;"></td>
          <td style="width: 188px; padding: 7px 8px; color: #cbd5e1; font-size: 10px;"></td>
        </tr>
      `;
    }
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>${typeBadge} - ${docNum}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        html, body {
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            color: #0f172a;
            font-family: Consolas, 'Courier New', monospace;
            -webkit-font-smoothing: antialiased;
        }
        .page {
            width: 794px;
            height: 1123px;
            max-height: 1123px;
            margin: 0 auto;
            background: #ffffff;
            padding: 24px 28px 18px 28px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            overflow: hidden;
        }
        .table-fixed {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-family: Consolas, 'Courier New', monospace;
        }
        .no-print-btn { display: flex; justify-content: center; gap: 1rem; margin: 24px 0; }
        .btn { padding: 10px 24px; font-size: 12px; font-weight: bold; border-radius: 6px; border: none; cursor: pointer; text-transform: uppercase; font-family: Consolas, 'Courier New', monospace; }
        .btn-blue { background: #2563eb; color: white; }
        @media print {
            body { background: transparent; }
            .page { page-break-after: always; page-break-inside: avoid; margin: 0; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="page">
        <!-- TOP SECTION: HEADER + TITLE + PARTICULARS -->
        <div style="width: 100%; display: flex; flex-direction: column;">
            <!-- Letterhead -->
            <div style="border-bottom: 2.5px double #0f172a; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="/bag-logo.jpg" alt="BAG Logo" style="height: 50px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
                    <div>
                        <h1 style="margin: 0; font-size: 15.5px; font-weight: 800; text-transform: uppercase; color: #0f172a; font-family: Consolas, 'Courier New', monospace; line-height: 1.25; letter-spacing: 0.3px;">PT. PELAYARAN BAHTERA ADHIGUNA (BAG)</h1>
                        <p style="margin: 2px 0 0 0; font-size: 9px; color: #475569; font-family: Consolas, 'Courier New', monospace; line-height: 1.35;">
                            Maritime Logistics and Spares Warehouse<br>
                            Jl. Yos Sudarso No 193 Tanjung Sekong, Merak, Banten | Phone: (021) 229-099-01
                        </p>
                    </div>
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                    <span style="background-color: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-family: Consolas, 'Courier New', monospace; font-weight: bold; border: 1px solid #cbd5e1; display: inline-block;">WMS-SYSTEM</span>
                    <div style="margin-top: 2px; font-size: 11px; font-family: Consolas, 'Courier New', monospace; color: #334155;">Ref: <strong style="color: #0f172a;">${docNum}</strong></div>
                    <div style="font-size: 9.5px; font-family: Consolas, 'Courier New', monospace; color: #64748b;">Date: ${headerDate}</div>
                    <div style="margin-top: 3px;">
                        <span style="font-size: 11.5px; font-weight: 900; border: 2px solid #0f172a; padding: 2px 10px; border-radius: 4px; background: #ffffff; font-family: Consolas, 'Courier New', monospace; color: #0f172a; display: inline-block;">${typeBadge}</span>
                    </div>
                </div>
            </div>

            <!-- Document Title -->
            <div style="text-align: center; margin-bottom: 10px;">
                <h2 style="margin: 0; font-size: 15px; text-transform: uppercase; text-decoration: underline; text-underline-offset: 4px; color: #0f172a; font-weight: 800; font-family: Consolas, 'Courier New', monospace; letter-spacing: 0.5px;">${titleText}</h2>
                <p style="margin: 3px 0 0 0; font-size: 9.5px; text-transform: uppercase; font-family: Consolas, 'Courier New', monospace; color: #64748b; font-style: italic;">${typeDesc}</p>
            </div>

            <!-- Particulars Table Box -->
            <div style="border: 1px solid #475569; border-radius: 6px; padding: 9px 14px; background: #ffffff; font-size: 10.5px; font-family: Consolas, 'Courier New', monospace; margin-bottom: 12px; text-transform: uppercase; line-height: 1.55;">
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                    <div style="display: flex; flex-direction: column; gap: 4px; flex: 1.25;">
                        <div><span style="color: #475569; width: 145px; display: inline-block;">KAPAL PENERIMA :</span><strong style="color: #0f172a; font-size: 12px; font-weight: 800;">${req.vessel_name || "MV. KARTINI BARUNA"}</strong></div>
                        <div><span style="color: #475569; width: 145px; display: inline-block;">FASILITAS GUDANG :</span><strong style="color: #0f172a;">MERAK WAREHOUSE</strong></div>
                        <div><span style="color: #475569; width: 145px; display: inline-block;">ALAMAT PENGIRIMAN :</span><strong style="color: #1e293b;">${cleanAddress}</strong></div>
                        <div><span style="color: #475569; width: 145px; display: inline-block;">PEKERJAAN (WO REF) :</span><strong style="color: #1e3a8a;">${req.work_order_ref || req.spk_number || "Daftar Permintaan / WO"}</strong></div>
                        <div><span style="color: #475569; width: 145px; display: inline-block;">KODE AKUN :</span><strong style="color: #0f172a;">${req.account_code || "BPP"}</strong></div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; text-align: right; flex: 0.85;">
                        <div><span style="color: #475569; margin-right: 8px;">PEMOHON / REQUESTER :</span><strong style="color: #3730a3;">${req.requester_name || req.requested_by || "CHIEF ENGINEER"}</strong></div>
                        <div><span style="color: #475569; margin-right: 8px;">TANGGAL PENGAJUAN :</span><strong style="color: #92400e;">${tanggalPengajuan}</strong></div>
                        <div><span style="color: #475569; margin-right: 8px;">NO. DOKUMEN TUG :</span><strong style="color: #0f172a;">${docNum}</strong></div>
                        <div><span style="color: #475569; margin-right: 8px;">FUNGSI :</span><strong style="color: #047857;">${req.function_code || "ARMADA"}</strong></div>
                    </div>
                </div>
                ${req.remarks ? `<div style="margin-top: 6px; padding: 4px 8px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 9.5px; font-style: italic; border-radius: 4px; font-family: Consolas, 'Courier New', monospace;"><strong style="text-transform: uppercase; font-style: normal; color: #0f172a; margin-right: 6px;">CATATAN PERMINTAAN :</strong>${req.remarks}</div>` : ""}
            </div>
        </div>

        <!-- CENTER SECTION: MATERIAL ITEMS TABLE (MAIN AREA) -->
        <div style="width: 100%; border: 1.5px solid #64748b; border-radius: 4px; overflow: hidden; background: #ffffff; margin-bottom: 10px;">
            <table class="table-fixed">
                <thead>
                    <tr style="background-color: #f1f5f9; border-bottom: 1.5px solid #475569; font-size: 10px; font-weight: bold; color: #0f172a; text-transform: uppercase;">
                        <th style="width: 34px; padding: 9px 4px; border-right: 1px solid #cbd5e1; text-align: center;">#</th>
                        <th style="width: 216px; padding: 9px 10px; border-right: 1px solid #cbd5e1; text-align: left;">${nameColHeader}</th>
                        <th style="width: 120px; padding: 9px 8px; border-right: 1px solid #cbd5e1; text-align: left;">NOMOR / PART NUMBER</th>
                        <th style="width: 42px; padding: 9px 4px; border-right: 1px solid #cbd5e1; text-align: center;">STN</th>
                        <th style="width: 80px; padding: 9px 4px; border-right: 1px solid #cbd5e1; text-align: center; color: #1e40af; background-color: #eff6ff; line-height: 1.2;">BANYAKNYA (DIBERIKAN)</th>
                        <th style="width: 58px; padding: 9px 4px; border-right: 1px solid #cbd5e1; text-align: center;">NOMOR DO</th>
                        <th style="width: 188px; padding: 9px 8px; text-align: left;">KETERANGAN</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>

        <!-- BOTTOM SECTION: WORK ORDER + DISCLAIMER + SIGNATURES + FOOTER BAR -->
        <div style="width: 100%; display: flex; flex-direction: column;">
            <!-- Perintah Kerja Box -->
            <div style="border: 1.5px solid #1e3a8a; border-radius: 6px; padding: 8px 16px; margin-bottom: 10px; background: #ffffff; font-size: 10.5px; font-family: Consolas, 'Courier New', monospace; display: flex; justify-content: space-between; align-items: center; text-transform: uppercase;">
                <div><span style="color: #0f172a; font-weight: bold;">PERINTAH KERJA:</span> <strong style="color: #b91c1c; margin-left: 6px; font-weight: 900; font-size: 11px;">${req.work_order_ref || req.spk_number || "TIADA"}</strong></div>
                <div><span style="color: #0f172a; font-weight: bold;">KODE AKUN:</span> <strong style="color: #1e3a8a; margin-left: 6px; font-weight: 900;">${req.account_code || "BPP"}</strong></div>
                <div><span style="color: #0f172a; font-weight: bold;">FUNGSI:</span> <strong style="color: #047857; margin-left: 6px; font-weight: 900;">${req.function_code || "ARMADA"}</strong></div>
            </div>

            <!-- Disclaimer -->
            <p style="font-style: italic; color: #64748b; font-size: 8.5px; margin: 0 0 10px 0; font-family: Consolas, 'Courier New', monospace; line-height: 1.35;">
                Disclaimer: PT. Pelayaran Bahtera Adhiguna assumes fully audited logistics carriage parameters upon signed counter-authority signature dispatch tags. Checked physically against corrosion, salt contamination, marine class markings and full vendor structural seal integrity.
            </p>

            <!-- 4 Signatures Grid -->
            <div style="display: flex; width: 100%; justify-content: space-between; gap: 12px; text-align: center; margin-bottom: 12px;">
                <div style="flex: 1; width: 25%; display: flex; flex-direction: column; justify-content: space-between; height: 118px; box-sizing: border-box;">
                    <span style="font-size: 9.5px; color: #1e293b; font-family: Consolas, 'Courier New', monospace; font-weight: bold;">MENGETAHUI :</span>
                    <div style="height: 60px; display: flex; align-items: flex-end; justify-content: center;">
                        ${sigVP ? `<img src="${sigVP}" style="max-height: 56px; max-width: 125px; object-fit: contain;" />` : `<div style="height: 56px;"></div>`}
                    </div>
                    <div style="border-top: 1.5px solid #475569; padding-top: 4px; width: 100%;">
                        <div style="font-weight: 900; color: #020617; font-size: 11px; font-family: Consolas, 'Courier New', monospace;">SUMBONO</div>
                        <div style="font-size: 8.5px; font-family: Consolas, 'Courier New', monospace; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">VP RENDALHAR</div>
                    </div>
                </div>

                <div style="flex: 1; width: 25%; display: flex; flex-direction: column; justify-content: space-between; height: 118px; box-sizing: border-box;">
                    <span style="font-size: 9.5px; color: #1e293b; font-family: Consolas, 'Courier New', monospace; font-weight: bold;">DISETUJUI OLEH :</span>
                    <div style="height: 60px; display: flex; align-items: flex-end; justify-content: center;">
                        ${sigManager ? `<img src="${sigManager}" style="max-height: 56px; max-width: 125px; object-fit: contain;" />` : `<div style="height: 56px;"></div>`}
                    </div>
                    <div style="border-top: 1.5px solid #475569; padding-top: 4px; width: 100%;">
                        <div style="font-weight: 900; color: #020617; font-size: 11px; font-family: Consolas, 'Courier New', monospace;">MOHAMAT EMIR FERDIAN</div>
                        <div style="font-size: 8.5px; font-family: Consolas, 'Courier New', monospace; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">Manager Logistik</div>
                    </div>
                </div>

                <div style="flex: 1; width: 25%; display: flex; flex-direction: column; justify-content: space-between; height: 118px; box-sizing: border-box;">
                    <span style="font-size: 9.5px; color: #1e293b; font-family: Consolas, 'Courier New', monospace; font-weight: bold;">KEPALA GUDANG :</span>
                    <div style="height: 60px; display: flex; align-items: flex-end; justify-content: center;">
                        ${sigGudang ? `<img src="${sigGudang}" style="max-height: 56px; max-width: 125px; object-fit: contain;" />` : `<div style="height: 56px;"></div>`}
                    </div>
                    <div style="border-top: 1.5px solid #475569; padding-top: 4px; width: 100%;">
                        <div style="font-weight: 900; color: #020617; font-size: 11px; font-family: Consolas, 'Courier New', monospace;">&nbsp;</div>
                        <div style="font-size: 8.5px; font-family: Consolas, 'Courier New', monospace; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">Gudang Merak</div>
                    </div>
                </div>

                <div style="flex: 1; width: 25%; display: flex; flex-direction: column; justify-content: space-between; height: 118px; box-sizing: border-box;">
                    <span style="font-size: 9.5px; color: #1e293b; font-family: Consolas, 'Courier New', monospace; font-weight: bold;">PETUGAS GUDANG :</span>
                    <div style="height: 60px; display: flex; align-items: flex-end; justify-content: center;">
                        ${sigPetugasGudang ? `<img src="${sigPetugasGudang}" style="max-height: 56px; max-width: 125px; object-fit: contain;" />` : `<div style="height: 56px;"></div>`}
                    </div>
                    <div style="border-top: 1.5px solid #475569; padding-top: 4px; width: 100%;">
                        <div style="font-weight: 900; color: #020617; font-size: 11px; font-family: Consolas, 'Courier New', monospace;">MAGHFUR MUHAMMAD ALFIN</div>
                        <div style="font-size: 8.5px; font-family: Consolas, 'Courier New', monospace; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">Petugas Gudang</div>
                    </div>
                </div>
            </div>

            <!-- Page Footer Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 5px; font-size: 8.5px; font-family: Consolas, 'Courier New', monospace; color: #94a3b8; text-transform: uppercase;">
                <span>PT. Pelayaran Bahtera Adhiguna &bull; WMS Logistics System</span>
                <span>Halaman 1 dari 1 &bull; Ref: ${docNum}</span>
            </div>
        </div>
    </div>

    <!-- Print Button Floating Footer for Interactive Manual Printing -->
    <div class="no-print no-print-btn">
        <button onclick="window.print()" class="btn btn-blue">🖨️ Cetak / Simpan PDF Dokumen Ini</button>
    </div>
</body>
</html>`;
}

/**
 * High-fidelity, balanced A4 PDF generator for TUG 5 and TUG 6 documents.
 * Employs optimal vertical space distribution with commanding table sizing,
 * preventing bottom whitespace voids while ensuring single-page completeness.
 */
export async function generateTUGPDFArrayBuffer(
  req: MaterialRequest,
  type: "tug5" | "tug6",
  signatures: DigitalSignature[]
): Promise<ArrayBuffer> {
  const docNum = resolveCleanDocNum(req, type);
  const titleText = type === "tug5" 
    ? "DAFTAR PERMINTAAN BARANG-BARANG (MATERIAL UMUM)"
    : "DAFTAR PERMINTAAN BARANG-BARANG (SPAREPART)";
  const typeBadge = type === "tug5" ? "TUG 5" : "TUG 6";
  const typeDesc = type === "tug5" ? "GENERAL MATERIAL REQUEST FORM (TUG 5)" : "SPARE PARTS REQUEST FORM (TUG 6)";
  
  const headerDate = formatHeaderDate(req.request_date || req.created_at);
  const tanggalPengajuan = safeFormatDate(req.request_date, headerDate);

  const sigVP = getSignatureForSlot("VP RENDALHAR", "Sumbono", signatures, req);
  const sigManager = getSignatureForSlot("Manager Logistik", "Mohamat Emir Ferdian", signatures, req);
  const sigGudang = null;
  const sigPetugasGudang = getSignatureForSlot("Petugas Gudang", "MAGHFUR MUHAMMAD ALFIN", signatures, req) || getSignatureForSlot("Petugas Gudang", "Aldi Hidayat", signatures, req) || createSVGSignatureDataUrl("MAGHFUR MUHAMMAD ALFIN");

  const cleanAddress = (req.delivery_address || "Pelabuhan Merak, Cilegon, Banten")
    .replace(/,\s*SPK\s+[^,]+/gi, "")
    .replace(/,\s*SPK\s*.*$/gi, "")
    .trim();

  const nameColHeader = type === "tug5" ? "NAMA BARANG (DITULIS LENGKAP)" : "NAMA BARANG &amp; SPESIFIKASI / NOMOR KATALOG";
  const defaultNotes = req.spk_number || req.work_order_ref ? `Permintaan SPK ${req.spk_number || req.work_order_ref}` : "(-)";

  // Offscreen staging container at exact A4 width (794px)
  const staging = document.createElement("div");
  staging.style.position = "fixed";
  staging.style.left = "-9999px";
  staging.style.top = "0";
  staging.style.width = "794px";
  staging.style.backgroundColor = "#ffffff";
  staging.style.zIndex = "-9999";
  document.body.appendChild(staging);

  try {
    const rawItems = req.items || [];
    const itemsPerPage = 10;
    const isSinglePage = rawItems.length <= itemsPerPage;
    const totalPages = isSinglePage ? 1 : Math.ceil(rawItems.length / itemsPerPage);

    const pagesEl: HTMLElement[] = [];

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const isPageOne = pageIdx === 0;
      const isLastPage = pageIdx === totalPages - 1;
      const pageNum = pageIdx + 1;

      const pageEl = document.createElement("div");
      pageEl.className = "a4-pdf-page";
      pageEl.style.width = "794px";
      pageEl.style.height = "1123px";
      pageEl.style.maxHeight = "1123px";
      pageEl.style.backgroundColor = "#ffffff";
      pageEl.style.boxSizing = "border-box";
      pageEl.style.padding = "24px 28px 18px 28px";
      pageEl.style.display = "flex";
      pageEl.style.flexDirection = "column";
      pageEl.style.justifyContent = "space-between";
      pageEl.style.position = "relative";
      pageEl.style.overflow = "hidden";
      pageEl.style.fontFamily = "Consolas, 'Courier New', monospace";
      pageEl.style.color = "#0f172a";

      // 1. TOP SECTION
      const topSection = document.createElement("div");
      topSection.style.width = "100%";
      topSection.style.display = "flex";
      topSection.style.flexDirection = "column";

      if (isPageOne) {
        topSection.innerHTML = `
          <!-- Letterhead -->
          <div style="border-bottom: 2.5px double #0f172a; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start; box-sizing: border-box;">
              <div style="display: flex; align-items: center; gap: 12px;">
                  <img src="/bag-logo.jpg" alt="BAG Logo" style="height: 50px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
                  <div>
                      <h1 style="margin: 0; font-size: 15.5px; font-weight: 800; text-transform: uppercase; color: #0f172a; font-family: Consolas, 'Courier New', monospace; line-height: 1.25; letter-spacing: 0.3px;">PT. PELAYARAN BAHTERA ADHIGUNA (BAG)</h1>
                      <p style="margin: 2px 0 0 0; font-size: 9px; color: #475569; font-family: Consolas, 'Courier New', monospace; line-height: 1.35;">
                          Maritime Logistics and Spares Warehouse<br>
                          Jl. Yos Sudarso No 193 Tanjung Sekong, Merak, Banten | Phone: (021) 229-099-01
                      </p>
                  </div>
              </div>
              <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                  <span style="background-color: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-family: Consolas, 'Courier New', monospace; font-weight: bold; border: 1px solid #cbd5e1; display: inline-block;">WMS-SYSTEM</span>
                  <div style="margin-top: 2px; font-size: 11px; font-family: Consolas, 'Courier New', monospace; color: #334155;">Ref: <strong style="color: #0f172a;">${docNum}</strong></div>
                  <div style="font-size: 9.5px; font-family: Consolas, 'Courier New', monospace; color: #64748b;">Date: ${headerDate}</div>
                  <div style="margin-top: 3px;">
                      <span style="font-size: 11.5px; font-weight: 900; border: 2px solid #0f172a; padding: 2px 10px; border-radius: 4px; background: #ffffff; font-family: Consolas, 'Courier New', monospace; color: #0f172a; display: inline-block;">${typeBadge}</span>
                  </div>
              </div>
          </div>

          <!-- Document Title -->
          <div style="text-align: center; margin-bottom: 10px; box-sizing: border-box;">
              <h2 style="margin: 0; font-size: 15px; text-transform: uppercase; text-decoration: underline; text-underline-offset: 4px; color: #0f172a; font-weight: 800; font-family: Consolas, 'Courier New', monospace; letter-spacing: 0.5px;">${titleText}</h2>
              <p style="margin: 3px 0 0 0; font-size: 9.5px; text-transform: uppercase; font-family: Consolas, 'Courier New', monospace; color: #64748b; font-style: italic;">${typeDesc}</p>
          </div>

          <!-- Particulars Table Box -->
          <div style="border: 1px solid #475569; border-radius: 6px; padding: 9px 14px; background: #ffffff; font-size: 10.5px; font-family: Consolas, 'Courier New', monospace; margin-bottom: 12px; text-transform: uppercase; line-height: 1.55; box-sizing: border-box;">
              <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <div style="display: flex; flex-direction: column; gap: 4px; flex: 1.25;">
                      <div><span style="color: #475569; width: 145px; display: inline-block;">KAPAL PENERIMA :</span><strong style="color: #0f172a; font-size: 12px; font-weight: 800;">${req.vessel_name || "MV. KARTINI BARUNA"}</strong></div>
                      <div><span style="color: #475569; width: 145px; display: inline-block;">FASILITAS GUDANG :</span><strong style="color: #0f172a;">MERAK WAREHOUSE</strong></div>
                      <div><span style="color: #475569; width: 145px; display: inline-block;">ALAMAT PENGIRIMAN :</span><strong style="color: #1e293b;">${cleanAddress}</strong></div>
                      <div><span style="color: #475569; width: 145px; display: inline-block;">PEKERJAAN (WO REF) :</span><strong style="color: #1e3a8a;">${req.work_order_ref || req.spk_number || "Daftar Permintaan / WO"}</strong></div>
                      <div><span style="color: #475569; width: 145px; display: inline-block;">KODE AKUN :</span><strong style="color: #0f172a;">${req.account_code || "BPP"}</strong></div>
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 4px; text-align: right; flex: 0.85;">
                      <div><span style="color: #475569; margin-right: 8px;">PEMOHON / REQUESTER :</span><strong style="color: #3730a3;">${req.requester_name || req.requested_by || "CHIEF ENGINEER"}</strong></div>
                      <div><span style="color: #475569; margin-right: 8px;">TANGGAL PENGAJUAN :</span><strong style="color: #92400e;">${tanggalPengajuan}</strong></div>
                      <div><span style="color: #475569; margin-right: 8px;">NO. DOKUMEN TUG :</span><strong style="color: #0f172a;">${docNum}</strong></div>
                      <div><span style="color: #475569; margin-right: 8px;">FUNGSI :</span><strong style="color: #047857;">${req.function_code || "ARMADA"}</strong></div>
                  </div>
              </div>
              ${req.remarks ? `<div style="margin-top: 6px; padding: 4px 8px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 9.5px; font-style: italic; border-radius: 4px; font-family: Consolas, 'Courier New', monospace; box-sizing: border-box;"><strong style="text-transform: uppercase; font-style: normal; color: #0f172a; margin-right: 6px;">CATATAN PERMINTAAN :</strong>${req.remarks}</div>` : ""}
          </div>
        `;
      } else {
        topSection.innerHTML = `
          <!-- Continuation Header -->
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
              <div style="display: flex; align-items: center; gap: 10px;">
                  <img src="/bag-logo.jpg" alt="BAG Logo" style="height: 36px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
                  <div>
                      <h2 style="margin: 0; font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; font-family: Consolas, 'Courier New', monospace;">PT. PELAYARAN BAHTERA ADHIGUNA (BAG)</h2>
                      <p style="margin: 2px 0 0 0; font-size: 9px; color: #475569; font-family: Consolas, 'Courier New', monospace;">
                          ${titleText} (Lanjutan) &bull; Kapal: <strong style="color: #0f172a;">${req.vessel_name || "MV. KARTINI BARUNA"}</strong>
                      </p>
                  </div>
              </div>
              <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 11px; font-family: Consolas, 'Courier New', monospace; color: #334155;">Ref: <strong style="color: #0f172a;">${docNum}</strong></span>
                  <span style="font-size: 10.5px; font-weight: 900; border: 1.5px solid #0f172a; padding: 2px 8px; border-radius: 4px; background: #ffffff; color: #0f172a; font-family: Consolas, 'Courier New', monospace;">${typeBadge}</span>
              </div>
          </div>
        `;
      }

      // 2. CENTER SECTION: MATERIAL TABLE
      const pageItems = rawItems.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
      const minRows = isSinglePage ? 8 : (isLastPage ? Math.max(pageItems.length, 6) : itemsPerPage);
      const rowCount = Math.max(pageItems.length, minRows);

      let rowsHtml = "";
      for (let rIdx = 0; rIdx < rowCount; rIdx++) {
        const item = pageItems[rIdx];
        const globalIdx = pageIdx * itemsPerPage + rIdx + 1;
        const isLastRow = rIdx === rowCount - 1;
        const borderStyle = isLastRow ? "" : "border-bottom: 1px solid #cbd5e1;";

        if (item) {
          rowsHtml += `
            <tr style="${borderStyle} background-color: #ffffff; height: 38px;">
              <td style="width: 34px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #475569; font-size: 11px;">${globalIdx}</td>
              <td style="width: 216px; padding: 7px 10px; border-right: 1px solid #cbd5e1; font-weight: bold; color: #0f172a; line-height: 1.3; font-size: 11px; word-break: break-word;">${item.spare_part_name || "(-)"}</td>
              <td style="width: 120px; padding: 7px 8px; border-right: 1px solid #cbd5e1; font-weight: 600; color: #1e293b; font-size: 10.5px; word-break: break-word;">${item.part_number || "-"}</td>
              <td style="width: 42px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; text-transform: uppercase; font-weight: 600; color: #1e293b; font-size: 10.5px;">${item.unit || "(-)"}</td>
              <td style="width: 80px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; color: #1e40af; font-weight: 800; font-size: 12px; background-color: #eff6ff;">${item.requested_qty || "(-)"}</td>
              <td style="width: 58px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; color: #334155; font-size: 10.5px;"></td>
              <td style="width: 188px; padding: 7px 8px; color: #334155; font-style: italic; font-size: 9.5px; line-height: 1.3; word-break: break-word; overflow-wrap: anywhere;">${item.notes || defaultNotes}</td>
            </tr>
          `;
        } else {
          rowsHtml += `
            <tr style="${borderStyle} background-color: #ffffff; height: 38px;">
              <td style="width: 34px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; color: #cbd5e1; font-size: 10px;">${globalIdx}</td>
              <td style="width: 216px; padding: 7px 10px; border-right: 1px solid #cbd5e1; color: #cbd5e1; font-size: 10px;">-</td>
              <td style="width: 120px; padding: 7px 8px; border-right: 1px solid #cbd5e1; color: #cbd5e1; font-size: 10px;">-</td>
              <td style="width: 42px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; color: #cbd5e1; font-size: 10px;">-</td>
              <td style="width: 80px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; color: #cbd5e1; background-color: #f8fafc; font-size: 10px;">-</td>
              <td style="width: 58px; padding: 7px 4px; border-right: 1px solid #cbd5e1; text-align: center; color: #cbd5e1; font-size: 10px;"></td>
              <td style="width: 188px; padding: 7px 8px; color: #cbd5e1; font-size: 10px;"></td>
            </tr>
          `;
        }
      }

      const centerSection = document.createElement("div");
      centerSection.style.width = "100%";
      centerSection.style.border = "1.5px solid #64748b";
      centerSection.style.borderRadius = "4px";
      centerSection.style.overflow = "hidden";
      centerSection.style.backgroundColor = "#ffffff";
      centerSection.style.marginBottom = "10px";
      centerSection.style.boxSizing = "border-box";

      centerSection.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-family: Consolas, 'Courier New', monospace; box-sizing: border-box;">
            <thead>
                <tr style="background-color: #f1f5f9; border-bottom: 1.5px solid #475569; font-size: 10px; font-weight: bold; color: #0f172a; text-transform: uppercase;">
                    <th style="width: 34px; padding: 9px 4px; border-right: 1px solid #cbd5e1; text-align: center;">#</th>
                    <th style="width: 216px; padding: 9px 10px; border-right: 1px solid #cbd5e1; text-align: left;">${nameColHeader}</th>
                    <th style="width: 120px; padding: 9px 8px; border-right: 1px solid #cbd5e1; text-align: left;">NOMOR / PART NUMBER</th>
                    <th style="width: 42px; padding: 9px 4px; border-right: 1px solid #cbd5e1; text-align: center;">STN</th>
                    <th style="width: 80px; padding: 9px 4px; border-right: 1px solid #cbd5e1; text-align: center; color: #1e40af; background-color: #eff6ff; line-height: 1.2;">BANYAKNYA (DIBERIKAN)</th>
                    <th style="width: 58px; padding: 9px 4px; border-right: 1px solid #cbd5e1; text-align: center;">NOMOR DO</th>
                    <th style="width: 188px; padding: 9px 8px; text-align: left;">KETERANGAN</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
      `;

      // 3. BOTTOM SECTION
      const bottomSection = document.createElement("div");
      bottomSection.style.width = "100%";
      bottomSection.style.display = "flex";
      bottomSection.style.flexDirection = "column";
      bottomSection.style.boxSizing = "border-box";

      if (isLastPage) {
        bottomSection.innerHTML = `
          <!-- Perintah Kerja Box -->
          <div style="border: 1.5px solid #1e3a8a; border-radius: 6px; padding: 8px 16px; margin-bottom: 10px; background: #ffffff; font-size: 10.5px; font-family: Consolas, 'Courier New', monospace; display: flex; justify-content: space-between; align-items: center; text-transform: uppercase; box-sizing: border-box;">
              <div><span style="color: #0f172a; font-weight: bold;">PERINTAH KERJA:</span> <strong style="color: #b91c1c; margin-left: 6px; font-weight: 900; font-size: 11px;">${req.work_order_ref || req.spk_number || "TIADA"}</strong></div>
              <div><span style="color: #0f172a; font-weight: bold;">KODE AKUN:</span> <strong style="color: #1e3a8a; margin-left: 6px; font-weight: 900;">${req.account_code || "BPP"}</strong></div>
              <div><span style="color: #0f172a; font-weight: bold;">FUNGSI:</span> <strong style="color: #047857; margin-left: 6px; font-weight: 900;">${req.function_code || "ARMADA"}</strong></div>
          </div>

          <!-- Disclaimer -->
          <p style="font-style: italic; color: #64748b; font-size: 8.5px; margin: 0 0 10px 0; font-family: Consolas, 'Courier New', monospace; line-height: 1.35; box-sizing: border-box;">
              Disclaimer: PT. Pelayaran Bahtera Adhiguna assumes fully audited logistics carriage parameters upon signed counter-authority signature dispatch tags. Checked physically against corrosion, salt contamination, marine class markings and full vendor structural seal integrity.
          </p>

          <!-- 4 Signatures Grid -->
          <div style="display: flex; width: 100%; justify-content: space-between; gap: 12px; text-align: center; margin-bottom: 12px; box-sizing: border-box;">
              <div style="flex: 1; width: 25%; display: flex; flex-direction: column; justify-content: space-between; height: 118px; box-sizing: border-box;">
                  <span style="font-size: 9.5px; color: #1e293b; font-family: Consolas, 'Courier New', monospace; font-weight: bold;">MENGETAHUI :</span>
                  <div style="height: 60px; display: flex; align-items: flex-end; justify-content: center;">
                      ${sigVP ? `<img src="${sigVP}" style="max-height: 56px; max-width: 125px; object-fit: contain;" />` : `<div style="height: 56px;"></div>`}
                  </div>
                  <div style="border-top: 1.5px solid #475569; padding-top: 4px; width: 100%;">
                      <div style="font-weight: 900; color: #020617; font-size: 11px; font-family: Consolas, 'Courier New', monospace;">SUMBONO</div>
                      <div style="font-size: 8.5px; font-family: Consolas, 'Courier New', monospace; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">VP RENDALHAR</div>
                  </div>
              </div>

              <div style="flex: 1; width: 25%; display: flex; flex-direction: column; justify-content: space-between; height: 118px; box-sizing: border-box;">
                  <span style="font-size: 9.5px; color: #1e293b; font-family: Consolas, 'Courier New', monospace; font-weight: bold;">DISETUJUI OLEH :</span>
                  <div style="height: 60px; display: flex; align-items: flex-end; justify-content: center;">
                      ${sigManager ? `<img src="${sigManager}" style="max-height: 56px; max-width: 125px; object-fit: contain;" />` : `<div style="height: 56px;"></div>`}
                  </div>
                  <div style="border-top: 1.5px solid #475569; padding-top: 4px; width: 100%;">
                      <div style="font-weight: 900; color: #020617; font-size: 11px; font-family: Consolas, 'Courier New', monospace;">MOHAMAT EMIR FERDIAN</div>
                      <div style="font-size: 8.5px; font-family: Consolas, 'Courier New', monospace; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">Manager Logistik</div>
                  </div>
              </div>

              <div style="flex: 1; width: 25%; display: flex; flex-direction: column; justify-content: space-between; height: 118px; box-sizing: border-box;">
                  <span style="font-size: 9.5px; color: #1e293b; font-family: Consolas, 'Courier New', monospace; font-weight: bold;">KEPALA GUDANG :</span>
                  <div style="height: 60px; display: flex; align-items: flex-end; justify-content: center;">
                      ${sigGudang ? `<img src="${sigGudang}" style="max-height: 56px; max-width: 125px; object-fit: contain;" />` : `<div style="height: 56px;"></div>`}
                  </div>
                  <div style="border-top: 1.5px solid #475569; padding-top: 4px; width: 100%;">
                      <div style="font-weight: 900; color: #020617; font-size: 11px; font-family: Consolas, 'Courier New', monospace;">&nbsp;</div>
                      <div style="font-size: 8.5px; font-family: Consolas, 'Courier New', monospace; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">Gudang Merak</div>
                  </div>
              </div>

              <div style="flex: 1; width: 25%; display: flex; flex-direction: column; justify-content: space-between; height: 118px; box-sizing: border-box;">
                  <span style="font-size: 9.5px; color: #1e293b; font-family: Consolas, 'Courier New', monospace; font-weight: bold;">PETUGAS GUDANG :</span>
                  <div style="height: 60px; display: flex; align-items: flex-end; justify-content: center;">
                      ${sigPetugasGudang ? `<img src="${sigPetugasGudang}" style="max-height: 56px; max-width: 125px; object-fit: contain;" />` : `<div style="height: 56px;"></div>`}
                  </div>
                  <div style="border-top: 1.5px solid #475569; padding-top: 4px; width: 100%;">
                      <div style="font-weight: 900; color: #020617; font-size: 11px; font-family: Consolas, 'Courier New', monospace;">MAGHFUR MUHAMMAD ALFIN</div>
                      <div style="font-size: 8.5px; font-family: Consolas, 'Courier New', monospace; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">Petugas Gudang</div>
                  </div>
              </div>
          </div>

          <!-- Page Footer Bar -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 5px; font-size: 8.5px; font-family: Consolas, 'Courier New', monospace; color: #94a3b8; text-transform: uppercase; box-sizing: border-box;">
              <span>PT. Pelayaran Bahtera Adhiguna &bull; WMS Logistics System</span>
              <span>Halaman ${pageNum} dari ${totalPages} &bull; Ref: ${docNum}</span>
          </div>
        `;
      } else {
        bottomSection.innerHTML = `
          <!-- Page Footer Bar -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 5px; font-size: 8.5px; font-family: Consolas, 'Courier New', monospace; color: #94a3b8; text-transform: uppercase; box-sizing: border-box;">
              <span>PT. Pelayaran Bahtera Adhiguna &bull; WMS Logistics System</span>
              <span>Halaman ${pageNum} dari ${totalPages} &bull; Ref: ${docNum}</span>
          </div>
        `;
      }

      pageEl.appendChild(topSection);
      pageEl.appendChild(centerSection);
      pageEl.appendChild(bottomSection);

      staging.appendChild(pageEl);
      pagesEl.push(pageEl);
    }

    // Ensure all images and fonts are loaded before generating canvases
    await Promise.all([
      waitForImagesToLoad(staging),
      (document as any).fonts ? (document as any).fonts.ready : Promise.resolve()
    ]);

    // Build the jsPDF document
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm

    for (let pIdx = 0; pIdx < pagesEl.length; pIdx++) {
      if (pIdx > 0) {
        pdf.addPage();
      }

      const pEl = pagesEl[pIdx];
      const canvas = await html2canvas(pEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    }

    return pdf.output("arraybuffer");
  } finally {
    if (document.body.contains(staging)) {
      document.body.removeChild(staging);
    }
  }
}

export async function convertHtmlToPdfArrayBuffer(htmlString: string): Promise<ArrayBuffer> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.backgroundColor = "#ffffff";
  container.style.boxSizing = "border-box";
  container.style.padding = "24px 28px";
  container.style.zIndex = "-9999";
  container.style.color = "#0f172a";
  container.innerHTML = htmlString;
  
  const noPrintBtns = container.querySelectorAll(".no-print-btn");
  noPrintBtns.forEach(btn => btn.remove());

  document.body.appendChild(container);

  try {
    await Promise.all([
      waitForImagesToLoad(container),
      (document as any).fonts ? (document as any).fonts.ready : Promise.resolve()
    ]);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794
    } as any);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.98);

    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    let heightLeft = imgHeight - pdfHeight;

    while (heightLeft > 2) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;
    }

    return pdf.output("arraybuffer");
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export async function downloadTUGZipArchive(
  requests: MaterialRequest[],
  type: "tug5" | "tug6",
  startDate: string,
  endDate: string,
  signatures: DigitalSignature[],
  onProgress?: (current: number, total: number) => void
): Promise<{ count: number; filename: string }> {
  const start = startDate ? new Date(`${startDate}T00:00:00Z`).getTime() : 0;
  const end = endDate ? new Date(`${endDate}T23:59:59Z`).getTime() : Infinity;

  const filtered = requests.filter(r => {
    const rawDate = r.request_date || r.created_at;
    if (!rawDate) return true;
    const itemTime = new Date(rawDate).getTime();
    return itemTime >= start && itemTime <= end;
  });

  if (filtered.length === 0) {
    throw new Error("Tidak ada dokumen yang ditemukan pada rentang waktu yang dipilih");
  }

  const zip = new JSZip();
  const folderName = `${type.toUpperCase()}_Dokumen_PDF_Batch`;
  const folder = zip.folder(folderName) || zip;

  for (let idx = 0; idx < filtered.length; idx++) {
    const req = filtered[idx];
    if (onProgress) {
      onProgress(idx + 1, filtered.length);
    }

    const fileName = getCleanTUGFilename(req, type, idx);
    // Use the intelligent paginated PDF generator so multi-page documents never slice rows in half
    const pdfBuffer = await generateTUGPDFArrayBuffer(req, type, signatures);
    folder.file(fileName, pdfBuffer);
  }

  const content = await zip.generateAsync({ type: "blob" });
  const startLabel = startDate || "Awal";
  const endLabel = endDate || "Akhir";
  const zipFileName = `${type.toUpperCase()}_PDF_BATCH_${startLabel}_sd_${endLabel}.zip`;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(content);
  link.download = zipFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { count: filtered.length, filename: zipFileName };
}
