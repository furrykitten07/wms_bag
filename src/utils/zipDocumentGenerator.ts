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
  const sigGudang = getSignatureForSlot("Kepala Gudang", "MAGHFUR MUHAMMAD ALFIN", signatures, req);
  const sigPetugasGudang = getSignatureForSlot("Petugas Gudang", "Aldi Hidayat", signatures, req);

  const cleanAddress = (req.delivery_address || "Pelabuhan Merak, Cilegon, Banten")
    .replace(/,\s*SPK\s+[^,]+/gi, "")
    .replace(/,\s*SPK\s*.*$/gi, "")
    .trim();

  const nameColHeader = type === "tug5" ? "NAMA BARANG (DITULIS LENGKAP)" : "NAMA BARANG &amp; SPESIFIKASI / NOMOR KATALOG";
  const defaultNotes = req.spk_number || req.work_order_ref ? `Permintaan SPK ${req.spk_number || req.work_order_ref}` : "(-)";

  const itemsHtml = (!req.items || req.items.length === 0) ? `
    <tr style="border-bottom: 1px solid #cbd5e1; font-weight: 600;">
      <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #94a3b8;">1</td>
      <td style="padding: 8px 12px; border-right: 1px solid #cbd5e1; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 11px; color: #94a3b8;">(-)</td>
      <td style="padding: 8px 10px; border-right: 1px solid #cbd5e1; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #94a3b8;">(-)</td>
      <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #94a3b8;">(-)</td>
      <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: 'JetBrains Mono', monospace; color: #94a3b8; font-size: 11px;">(-)</td>
      <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #94a3b8;"></td>
      <td style="padding: 8px 12px; color: #64748b; font-family: 'Inter', sans-serif; font-style: italic; font-size: 10px;">NIHIL (-)</td>
    </tr>
  ` : req.items.map((item, idx) => `
    <tr style="border-bottom: 1px solid #cbd5e1; font-weight: 600;">
      <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #64748b;">${idx + 1}</td>
      <td style="padding: 8px 12px; border-right: 1px solid #cbd5e1; font-family: 'Inter', sans-serif; font-weight: 900; font-size: 11px; color: #0f172a;">${item.spare_part_name || "(-)"}</td>
      <td style="padding: 8px 10px; border-right: 1px solid #cbd5e1; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #334155;">${item.part_number || "-"}</td>
      <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; text-align: center; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #334155;">${item.unit || "(-)"}</td>
      <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: 'JetBrains Mono', monospace; color: #1e3a8a; font-weight: 900; font-size: 12px;">${item.requested_qty || "(-)"}</td>
      <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #334155;"></td>
      <td style="padding: 8px 12px; color: #475569; font-family: 'Inter', sans-serif; font-style: italic; font-size: 10px; font-weight: normal;">${item.notes || defaultNotes}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>${typeBadge} - ${docNum}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { 
            background-color: #ffffff; 
            color: #0f172a; 
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            padding: 0; 
            margin: 0; 
            -webkit-font-smoothing: antialiased;
        }
        .card { 
            width: 100%; 
            max-width: 794px; 
            margin: 0 auto; 
            background: #ffffff; 
            padding: 24px 28px; 
            box-sizing: border-box; 
        }
        .no-print-btn { display: flex; justify-content: center; gap: 1rem; margin-top: 2rem; }
        .btn { padding: 10px 20px; font-size: 12px; font-weight: bold; border-radius: 6px; border: none; cursor: pointer; text-transform: uppercase; }
        .btn-blue { background: #2563eb; color: white; }
    </style>
</head>
<body>
    <div class="card">
        <!-- Letterhead -->
        <div style="border-bottom: 2px double #0f172a; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <img src="/bag-logo.jpg" alt="BAG Logo" style="height: 52px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
                <div>
                    <h1 style="margin: 0; font-family: 'Space Grotesk', 'Inter', sans-serif; font-size: 16px; font-weight: 700; text-transform: uppercase; color: #020617; line-height: 1.2; letter-spacing: -0.02em;">PT. PELAYARAN BAHTERA ADHIGUNA (BAG)</h1>
                    <p style="margin: 3px 0 0 0; font-size: 9.5px; color: #64748b; font-family: 'JetBrains Mono', monospace; line-height: 1.45;">
                        Maritime Logistics and Spares Warehouse<br>
                        Jl. Yos Sudarso No 193 Tanjung Sekong, Merak, Banten<br>
                        Phone: (021) 229-099-01
                    </p>
                </div>
            </div>
            <div style="text-align: right;">
                <span style="background-color: #0f172a; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; display: inline-block;">WMS-SYSTEM</span>
                <p style="margin: 4px 0 0 0; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #334155;">Ref: <strong style="color: #020617; font-weight: 700;">${docNum}</strong></p>
                <p style="margin: 2px 0 0 0; font-family: 'Inter', sans-serif; font-size: 9px; color: #64748b;">Date: ${headerDate}</p>
                <div style="margin-top: 4px; display: flex; justify-content: flex-end;">
                    <div style="font-size: 11px; font-weight: 900; border: 1.5px solid #0f172a; padding: 2px 8px; border-radius: 4px; display: inline-block; background-color: #f8fafc; color: #0f172a; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em;">
                        ${typeBadge}
                    </div>
                </div>
            </div>
        </div>

        <!-- Document Title -->
        <div style="text-align: center; margin-bottom: 16px;">
            <h2 style="margin: 0; font-family: 'Space Grotesk', 'Inter', sans-serif; font-weight: 700; font-size: 15px; text-transform: uppercase; letter-spacing: 0.1em; color: #0f172a; text-decoration: underline; text-underline-offset: 4px;">${titleText}</h2>
            <p style="margin: 4px 0 0 0; font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; font-style: italic; color: #64748b;">${typeDesc}</p>
        </div>

        <!-- Particulars Table Box -->
        <div style="border: 1px solid #0f172a; border-radius: 8px; padding: 12px 14px; background-color: #ffffff; font-size: 10px; font-family: 'JetBrains Mono', monospace; line-height: 1.6; margin-bottom: 16px; text-transform: uppercase;">
            <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 14px;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; align-items: baseline;">
                        <span style="color: #64748b; width: 140px; flex-shrink: 0;">KAPAL PENERIMA :</span>
                        <strong style="color: #020617; font-family: 'Inter', sans-serif; font-weight: 900; font-size: 13px; letter-spacing: -0.01em;">${req.vessel_name || "MV. KARTINI BARUNA"}</strong>
                    </div>
                    <div style="display: flex; align-items: baseline;">
                        <span style="color: #64748b; width: 140px; flex-shrink: 0;">FASILITAS GUDANG :</span>
                        <strong style="color: #0f172a; font-weight: 700;">MERAK WAREHOUSE</strong>
                    </div>
                    <div style="display: flex; align-items: baseline;">
                        <span style="color: #64748b; width: 140px; flex-shrink: 0;">ALAMAT PENGIRIMAN :</span>
                        <strong style="color: #1e293b; font-weight: 700;">${cleanAddress}</strong>
                    </div>
                    <div style="display: flex; align-items: baseline;">
                        <span style="color: #64748b; width: 140px; flex-shrink: 0;">PEKERJAAN (WO REF) :</span>
                        <strong style="color: #1e3a8a; font-weight: 700;">${req.work_order_ref || req.spk_number || "Daftar Permintaan / WO"}</strong>
                    </div>
                    <div style="display: flex; align-items: baseline;">
                        <span style="color: #64748b; width: 140px; flex-shrink: 0;">KODE AKUN :</span>
                        <strong style="color: #0f172a; font-weight: 700;">${req.account_code || "BPP"}</strong>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px; text-align: right;">
                    <div style="display: flex; justify-content: flex-end; align-items: baseline;">
                        <span style="color: #64748b; margin-right: 8px;">PEMOHON / REQUESTER :</span>
                        <strong style="color: #3730a3; font-weight: 700;">${req.requester_name || req.requested_by || "CHIEF ENGINEER"}</strong>
                    </div>
                    <div style="display: flex; justify-content: flex-end; align-items: baseline;">
                        <span style="color: #64748b; margin-right: 8px;">TANGGAL PENGAJUAN :</span>
                        <strong style="color: #92400e; font-weight: 700;">${tanggalPengajuan}</strong>
                    </div>
                    <div style="display: flex; justify-content: flex-end; align-items: baseline;">
                        <span style="color: #64748b; margin-right: 8px;">NO. DOKUMEN TUG :</span>
                        <strong style="color: #0f172a; font-weight: 700;">${docNum}</strong>
                    </div>
                    <div style="display: flex; justify-content: flex-end; align-items: baseline;">
                        <span style="color: #64748b; margin-right: 8px;">FUNGSI :</span>
                        <strong style="color: #047857; font-weight: 700;">${req.function_code || "ARMADA"}</strong>
                    </div>
                </div>
            </div>
            ${req.remarks ? `
            <div style="margin-top: 10px; padding: 6px 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; font-family: 'Inter', sans-serif; font-size: 10px; color: #475569; font-style: italic; text-transform: lowercase;">
                <strong style="text-transform: uppercase; font-style: normal; color: #1e293b; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; margin-right: 8px;">Catatan Permintaan:</strong>${req.remarks}
            </div>` : ""}
        </div>

        <!-- Items Table -->
        <div style="border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; margin-top: 16px; margin-bottom: 16px;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead style="background-color: #f8fafc; border-bottom: 1px solid #cbd5e1; font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Inter', sans-serif;">
                    <tr>
                        <th style="padding: 8px 6px; border-right: 1px solid #cbd5e1; text-align: center; width: 32px;">#</th>
                        <th style="padding: 8px 12px; border-right: 1px solid #cbd5e1; text-align: left;">${nameColHeader}</th>
                        <th style="padding: 8px 10px; border-right: 1px solid #cbd5e1; text-align: left; width: 140px;">NOMOR / PART NUMBER</th>
                        <th style="padding: 8px 6px; border-right: 1px solid #cbd5e1; text-align: center; width: 48px;">STN</th>
                        <th style="padding: 8px 6px; border-right: 1px solid #cbd5e1; text-align: center; width: 90px; color: #1e3a8a; font-weight: 700;">BANYAKNYA (DIBERIKAN)</th>
                        <th style="padding: 8px 6px; border-right: 1px solid #cbd5e1; text-align: center; width: 75px;">NOMOR DO</th>
                        <th style="padding: 8px 12px; text-align: left; width: 160px;">KETERANGAN</th>
                    </tr>
                </thead>
                <tbody style="border-top: none;">
                    ${itemsHtml}
                </tbody>
            </table>
        </div>

        <!-- Perintah Kerja Box -->
        <div style="border: 1.5px solid #0f172a; border-radius: 6px; padding: 10px 14px; margin-top: 14px; margin-bottom: 16px; background-color: #f8fafc; font-size: 10.5px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; font-weight: 700; color: #1e293b; display: grid; grid-template-columns: 1.4fr 1fr 1fr; align-items: center;">
            <div>
                <span style="color: #0f172a; font-weight: 700; display: block; font-size: 9.5px; margin-bottom: 2px;">PERINTAH KERJA:</span>
                <span style="color: #b91c1c; font-weight: 900; font-size: 11px;">${req.work_order_ref || req.spk_number || "TIADA"}</span>
            </div>
            <div style="text-align: center;">
                <span style="color: #0f172a;">KODE AKUN:</span>
                <span style="color: #4338ca; font-weight: 800; margin-left: 6px;">${req.account_code || "BPP"}</span>
            </div>
            <div style="text-align: right;">
                <span style="color: #0f172a;">FUNGSI:</span>
                <span style="color: #047857; font-weight: 800; margin-left: 6px;">${req.function_code || "ARMADA"}</span>
            </div>
        </div>

        <!-- Disclaimer & Signatures -->
        <div style="margin-top: 16px;">
            <p style="font-style: italic; color: #64748b; font-size: 9px; font-family: 'Inter', sans-serif; line-height: 1.4; margin-top: 14px; margin-bottom: 16px;">
                Disclaimer: PT. Pelayaran Bahtera Adhiguna assumes fully audited logistics carriage parameters upon signed counter-authority signature dispatch tags. Checked physically against corrosion, salt contamination, marine class markings and full vendor structural seal integrity.
            </p>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; text-align: center; text-transform: uppercase; font-size: 8px; font-weight: 700; color: #334155; margin-top: 14px;">
                <div style="display: flex; flex-direction: column; justify-content: space-between; height: 80px;">
                    <span style="font-size: 8px; color: #334155; font-family: 'Inter', sans-serif;">MENGETAHUI :</span>
                    <div style="border-top: 1px solid #94a3b8; padding-top: 4px; position: relative;">
                        ${sigVP ? `<div style="position: absolute; bottom: 18px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigVP}" style="max-height: 48px; max-width: 130px; object-fit: contain;" /></div>` : ""}
                        <div style="font-weight: 900; color: #020617; font-size: 9.5px; font-family: 'Inter', sans-serif;">SUMBONO</div>
                        <div style="font-size: 7.5px; font-family: 'Inter', sans-serif; font-weight: normal; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">VP RENDALHAR</div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; justify-content: space-between; height: 80px;">
                    <span style="font-size: 8px; color: #334155; font-family: 'Inter', sans-serif;">DISETUJUI OLEH :</span>
                    <div style="border-top: 1px solid #94a3b8; padding-top: 4px; position: relative;">
                        ${sigManager ? `<div style="position: absolute; bottom: 18px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigManager}" style="max-height: 48px; max-width: 130px; object-fit: contain;" /></div>` : ""}
                        <div style="font-weight: 900; color: #020617; font-size: 9.5px; font-family: 'Inter', sans-serif;">MOHAMAT EMIR FERDIAN</div>
                        <div style="font-size: 7.5px; font-family: 'Inter', sans-serif; font-weight: normal; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">Manager Logistik</div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; justify-content: space-between; height: 80px;">
                    <span style="font-size: 8px; color: #334155; font-family: 'Inter', sans-serif;">KEPALA GUDANG :</span>
                    <div style="border-top: 1px solid #94a3b8; padding-top: 4px; position: relative;">
                        ${sigGudang ? `<div style="position: absolute; bottom: 18px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigGudang}" style="max-height: 48px; max-width: 130px; object-fit: contain;" /></div>` : ""}
                        <div style="font-weight: 900; color: #020617; font-size: 9.5px; font-family: 'Inter', sans-serif;">MAGHFUR MUHAMMAD ALFIN</div>
                        <div style="font-size: 7.5px; font-family: 'Inter', sans-serif; font-weight: normal; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">Kepala Gudang</div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; justify-content: space-between; height: 80px;">
                    <span style="font-size: 8px; color: #334155; font-family: 'Inter', sans-serif;">PETUGAS GUDANG :</span>
                    <div style="border-top: 1px solid #94a3b8; padding-top: 4px; position: relative;">
                        ${sigPetugasGudang ? `<div style="position: absolute; bottom: 18px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigPetugasGudang}" style="max-height: 48px; max-width: 130px; object-fit: contain;" /></div>` : ""}
                        <div style="font-weight: 900; color: #020617; font-size: 9.5px; font-family: 'Inter', sans-serif;">Aldi Hidayat</div>
                        <div style="font-size: 7.5px; font-family: 'Inter', sans-serif; font-weight: normal; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">Petugas Gudang</div>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <!-- Print Button Floating Footer for Interactive Manual Printing -->
    <div class="no-print-btn">
        <button onclick="window.print()" class="btn btn-blue">🖨️ Cetak / Simpan PDF Dokumen Ini</button>
    </div>
</body>
</html>`;
}

async function waitForImagesToLoad(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll("img"));
  const promises = images.map(img => {
    if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
    return new Promise<void>(resolve => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  });
  await Promise.all(promises);
}

/**
 * High-fidelity, intelligent paginated PDF generator for TUG 5 and TUG 6 documents.
 * Dynamically measures heights of rows and sections in the browser DOM to prevent any row
 * or text from being cut in half horizontally across pages.
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
  const sigGudang = getSignatureForSlot("Kepala Gudang", "MAGHFUR MUHAMMAD ALFIN", signatures, req);
  const sigPetugasGudang = getSignatureForSlot("Petugas Gudang", "Aldi Hidayat", signatures, req);

  const cleanAddress = (req.delivery_address || "Pelabuhan Merak, Cilegon, Banten")
    .replace(/,\s*SPK\s+[^,]+/gi, "")
    .replace(/,\s*SPK\s*.*$/gi, "")
    .trim();

  const nameColHeader = type === "tug5" ? "NAMA BARANG (DITULIS LENGKAP)" : "NAMA BARANG &amp; SPESIFIKASI / NOMOR KATALOG";
  const defaultNotes = req.spk_number || req.work_order_ref ? `Permintaan SPK ${req.spk_number || req.work_order_ref}` : "(-)";

  // Letterhead HTML for Page 1
  const letterheadHtml = `
    <div style="border-bottom: 2px double #0f172a; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <img src="/bag-logo.jpg" alt="BAG Logo" style="height: 50px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
        <div>
          <h1 style="margin: 0; font-family: 'Space Grotesk', 'Inter', sans-serif; font-size: 15.5px; font-weight: 700; text-transform: uppercase; color: #020617; line-height: 1.2; letter-spacing: -0.02em;">PT. PELAYARAN BAHTERA ADHIGUNA (BAG)</h1>
          <p style="margin: 2px 0 0 0; font-size: 9px; color: #64748b; font-family: 'JetBrains Mono', monospace; line-height: 1.4;">
            Maritime Logistics and Spares Warehouse<br>
            Jl. Yos Sudarso No 193 Tanjung Sekong, Merak, Banten<br>
            Phone: (021) 229-099-01
          </p>
        </div>
      </div>
      <div style="text-align: right;">
        <span style="background-color: #0f172a; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; display: inline-block;">WMS-SYSTEM</span>
        <p style="margin: 3px 0 0 0; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #334155;">Ref: <strong style="color: #020617; font-weight: 700;">${docNum}</strong></p>
        <p style="margin: 1px 0 0 0; font-family: 'Inter', sans-serif; font-size: 8.5px; color: #64748b;">Date: ${headerDate}</p>
        <div style="margin-top: 3px; display: flex; justify-content: flex-end;">
          <div style="font-size: 11px; font-weight: 900; border: 1.5px solid #0f172a; padding: 1px 8px; border-radius: 4px; display: inline-block; background-color: #f8fafc; color: #0f172a; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em;">
            ${typeBadge}
          </div>
        </div>
      </div>
    </div>
  `;

  // Title HTML for Page 1
  const titleHtml = `
    <div style="text-align: center; margin-bottom: 12px;">
      <h2 style="margin: 0; font-family: 'Space Grotesk', 'Inter', sans-serif; font-weight: 700; font-size: 14.5px; text-transform: uppercase; letter-spacing: 0.1em; color: #0f172a; text-decoration: underline; text-underline-offset: 4px;">${titleText}</h2>
      <p style="margin: 3px 0 0 0; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.08em; font-style: italic; color: #64748b;">${typeDesc}</p>
    </div>
  `;

  // Particulars Box HTML for Page 1
  const particularsHtml = `
    <div style="border: 1px solid #0f172a; border-radius: 7px; padding: 10px 13px; background-color: #ffffff; font-size: 9.5px; font-family: 'JetBrains Mono', monospace; line-height: 1.55; margin-bottom: 12px; text-transform: uppercase;">
      <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 12px;">
        <div style="display: flex; flex-direction: column; gap: 3.5px;">
          <div style="display: flex; align-items: baseline;">
            <span style="color: #64748b; width: 135px; flex-shrink: 0;">KAPAL PENERIMA :</span>
            <strong style="color: #020617; font-family: 'Inter', sans-serif; font-weight: 900; font-size: 12px; letter-spacing: -0.01em;">${req.vessel_name || "MV. KARTINI BARUNA"}</strong>
          </div>
          <div style="display: flex; align-items: baseline;">
            <span style="color: #64748b; width: 135px; flex-shrink: 0;">FASILITAS GUDANG :</span>
            <strong style="color: #0f172a; font-weight: 700;">MERAK WAREHOUSE</strong>
          </div>
          <div style="display: flex; align-items: baseline;">
            <span style="color: #64748b; width: 135px; flex-shrink: 0;">ALAMAT PENGIRIMAN :</span>
            <strong style="color: #1e293b; font-weight: 700;">${cleanAddress}</strong>
          </div>
          <div style="display: flex; align-items: baseline;">
            <span style="color: #64748b; width: 135px; flex-shrink: 0;">PEKERJAAN (WO REF) :</span>
            <strong style="color: #1e3a8a; font-weight: 700;">${req.work_order_ref || req.spk_number || "Daftar Permintaan / WO"}</strong>
          </div>
          <div style="display: flex; align-items: baseline;">
            <span style="color: #64748b; width: 135px; flex-shrink: 0;">KODE AKUN :</span>
            <strong style="color: #0f172a; font-weight: 700;">${req.account_code || "BPP"}</strong>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 3.5px; text-align: right;">
          <div style="display: flex; justify-content: flex-end; align-items: baseline;">
            <span style="color: #64748b; margin-right: 8px;">PEMOHON / REQUESTER :</span>
            <strong style="color: #3730a3; font-weight: 700;">${req.requester_name || req.requested_by || "CHIEF ENGINEER"}</strong>
          </div>
          <div style="display: flex; justify-content: flex-end; align-items: baseline;">
            <span style="color: #64748b; margin-right: 8px;">TANGGAL PENGAJUAN :</span>
            <strong style="color: #92400e; font-weight: 700;">${tanggalPengajuan}</strong>
          </div>
          <div style="display: flex; justify-content: flex-end; align-items: baseline;">
            <span style="color: #64748b; margin-right: 8px;">NO. DOKUMEN TUG :</span>
            <strong style="color: #0f172a; font-weight: 700;">${docNum}</strong>
          </div>
          <div style="display: flex; justify-content: flex-end; align-items: baseline;">
            <span style="color: #64748b; margin-right: 8px;">FUNGSI :</span>
            <strong style="color: #047857; font-weight: 700;">${req.function_code || "ARMADA"}</strong>
          </div>
        </div>
      </div>
      ${req.remarks ? `
      <div style="margin-top: 8px; padding: 5px 9px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 5px; font-family: 'Inter', sans-serif; font-size: 9.5px; color: #475569; font-style: italic; text-transform: lowercase;">
        <strong style="text-transform: uppercase; font-style: normal; color: #1e293b; font-family: 'JetBrains Mono', monospace; font-size: 8.5px; font-weight: 700; margin-right: 7px;">Catatan Permintaan:</strong>${req.remarks}
      </div>` : ""}
    </div>
  `;

  // Sleek Continuation Header for Page 2 and beyond
  const continuationHeaderHtml = `
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <img src="/bag-logo.jpg" alt="BAG Logo" style="height: 34px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
        <div>
          <h2 style="margin: 0; font-family: 'Space Grotesk', 'Inter', sans-serif; font-size: 12.5px; font-weight: 700; text-transform: uppercase; color: #020617; letter-spacing: -0.01em;">
            PT. PELAYARAN BAHTERA ADHIGUNA (BAG)
          </h2>
          <p style="margin: 2px 0 0 0; font-size: 8.5px; color: #64748b; font-family: 'JetBrains Mono', monospace; text-transform: uppercase;">
            ${titleText} (Lanjutan) &bull; Kapal: <strong style="color: #0f172a;">${req.vessel_name || "MV. KARTINI BARUNA"}</strong>
          </p>
        </div>
      </div>
      <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
        <span style="font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #334155;">Ref: <strong style="color: #0f172a;">${docNum}</strong></span>
        <span style="font-size: 10px; font-weight: 900; border: 1.5px solid #0f172a; padding: 1px 7px; border-radius: 4px; background-color: #f8fafc; color: #0f172a; font-family: 'JetBrains Mono', monospace;">
          ${typeBadge}
        </span>
      </div>
    </div>
  `;

  // Standard Table THEAD
  const theadHtml = `
    <thead style="background-color: #f8fafc; border-bottom: 1.5px solid #0f172a; font-size: 9.5px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Inter', sans-serif;">
      <tr>
        <th style="padding: 7px 6px; border-right: 1px solid #cbd5e1; text-align: center; width: 34px;">#</th>
        <th style="padding: 7px 12px; border-right: 1px solid #cbd5e1; text-align: left;">${nameColHeader}</th>
        <th style="padding: 7px 10px; border-right: 1px solid #cbd5e1; text-align: left; width: 140px;">NOMOR / PART NUMBER</th>
        <th style="padding: 7px 6px; border-right: 1px solid #cbd5e1; text-align: center; width: 48px;">STN</th>
        <th style="padding: 7px 6px; border-right: 1px solid #cbd5e1; text-align: center; width: 90px; color: #1e3a8a; font-weight: 700;">BANYAKNYA (DIBERIKAN)</th>
        <th style="padding: 7px 6px; border-right: 1px solid #cbd5e1; text-align: center; width: 75px;">NOMOR DO</th>
        <th style="padding: 7px 12px; text-align: left; width: 155px;">KETERANGAN</th>
      </tr>
    </thead>
  `;

  // Footer Block HTML (Perintah Kerja + Disclaimer + Signatures)
  const footerSignBlockHtml = `
    <div class="footer-sign-block" style="margin-top: 10px;">
      <!-- Perintah Kerja Box -->
      <div style="border: 1.5px solid #0f172a; border-radius: 6px; padding: 7px 14px; margin-bottom: 10px; background-color: #f8fafc; font-size: 10px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; font-weight: 700; color: #1e293b; display: grid; grid-template-columns: 1.4fr 1fr 1fr; align-items: center;">
        <div>
          <span style="color: #0f172a; font-weight: 700; display: block; font-size: 8.5px; margin-bottom: 2px;">PERINTAH KERJA:</span>
          <span style="color: #b91c1c; font-weight: 900; font-size: 10.5px;">${req.work_order_ref || req.spk_number || "TIADA"}</span>
        </div>
        <div style="text-align: center;">
          <span style="color: #0f172a;">KODE AKUN:</span>
          <span style="color: #4338ca; font-weight: 800; margin-left: 6px;">${req.account_code || "BPP"}</span>
        </div>
        <div style="text-align: right;">
          <span style="color: #0f172a;">FUNGSI:</span>
          <span style="color: #047857; font-weight: 800; margin-left: 6px;">${req.function_code || "ARMADA"}</span>
        </div>
      </div>

      <!-- Disclaimer -->
      <p style="font-style: italic; color: #64748b; font-size: 8.5px; font-family: 'Inter', sans-serif; line-height: 1.35; margin: 0 0 10px 0;">
        Disclaimer: PT. Pelayaran Bahtera Adhiguna assumes fully audited logistics carriage parameters upon signed counter-authority signature dispatch tags. Checked physically against corrosion, salt contamination, marine class markings and full vendor structural seal integrity.
      </p>

      <!-- 4 Signatures Grid -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; text-align: center; text-transform: uppercase; font-size: 8px; font-weight: 700; color: #334155;">
        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 75px;">
          <span style="font-size: 8px; color: #334155; font-family: 'Inter', sans-serif;">MENGETAHUI :</span>
          <div style="border-top: 1px solid #94a3b8; padding-top: 4px; position: relative;">
            ${sigVP ? `<div style="position: absolute; bottom: 16px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigVP}" style="max-height: 44px; max-width: 120px; object-fit: contain;" /></div>` : ""}
            <div style="font-weight: 900; color: #020617; font-size: 9.5px; font-family: 'Inter', sans-serif;">SUMBONO</div>
            <div style="font-size: 7.5px; font-family: 'Inter', sans-serif; font-weight: normal; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">VP RENDALHAR</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 75px;">
          <span style="font-size: 8px; color: #334155; font-family: 'Inter', sans-serif;">DISETUJUI OLEH :</span>
          <div style="border-top: 1px solid #94a3b8; padding-top: 4px; position: relative;">
            ${sigManager ? `<div style="position: absolute; bottom: 16px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigManager}" style="max-height: 44px; max-width: 120px; object-fit: contain;" /></div>` : ""}
            <div style="font-weight: 900; color: #020617; font-size: 9.5px; font-family: 'Inter', sans-serif;">MOHAMAT EMIR FERDIAN</div>
            <div style="font-size: 7.5px; font-family: 'Inter', sans-serif; font-weight: normal; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">Manager Logistik</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 75px;">
          <span style="font-size: 8px; color: #334155; font-family: 'Inter', sans-serif;">KEPALA GUDANG :</span>
          <div style="border-top: 1px solid #94a3b8; padding-top: 4px; position: relative;">
            ${sigGudang ? `<div style="position: absolute; bottom: 16px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigGudang}" style="max-height: 44px; max-width: 120px; object-fit: contain;" /></div>` : ""}
            <div style="font-weight: 900; color: #020617; font-size: 9.5px; font-family: 'Inter', sans-serif;">MAGHFUR MUHAMMAD ALFIN</div>
            <div style="font-size: 7.5px; font-family: 'Inter', sans-serif; font-weight: normal; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">Kepala Gudang</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 75px;">
          <span style="font-size: 8px; color: #334155; font-family: 'Inter', sans-serif;">PETUGAS GUDANG :</span>
          <div style="border-top: 1px solid #94a3b8; padding-top: 4px; position: relative;">
            ${sigPetugasGudang ? `<div style="position: absolute; bottom: 16px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigPetugasGudang}" style="max-height: 44px; max-width: 120px; object-fit: contain;" /></div>` : ""}
            <div style="font-weight: 900; color: #020617; font-size: 9.5px; font-family: 'Inter', sans-serif;">Aldi Hidayat</div>
            <div style="font-size: 7.5px; font-family: 'Inter', sans-serif; font-weight: normal; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">Petugas Gudang</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Staging offscreen container
  const staging = document.createElement("div");
  staging.style.position = "fixed";
  staging.style.left = "-9999px";
  staging.style.top = "0";
  staging.style.width = "794px";
  staging.style.backgroundColor = "#ffffff";
  staging.style.zIndex = "-9999";
  document.body.appendChild(staging);

  interface PageData {
    pageEl: HTMLElement;
    contentWrapper: HTMLElement;
    tbody: HTMLTableSectionElement;
    pageFooterSpan: HTMLElement;
  }

  const pages: PageData[] = [];

  function createPage(isPageOne: boolean, pageNum: number): PageData {
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
    pageEl.style.fontFamily = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    pageEl.style.color = "#0f172a";

    const contentWrapper = document.createElement("div");
    contentWrapper.style.width = "100%";
    contentWrapper.style.display = "flex";
    contentWrapper.style.flexDirection = "column";

    if (isPageOne) {
      contentWrapper.innerHTML = `
        ${letterheadHtml}
        ${titleHtml}
        ${particularsHtml}
        <div class="table-container" style="border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; margin-top: 6px;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            ${theadHtml}
            <tbody style="border-top: none;"></tbody>
          </table>
        </div>
      `;
    } else {
      contentWrapper.innerHTML = `
        ${continuationHeaderHtml}
        <div class="table-container" style="border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; margin-top: 4px;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            ${theadHtml}
            <tbody style="border-top: none;"></tbody>
          </table>
        </div>
      `;
    }

    const tbody = contentWrapper.querySelector("tbody") as HTMLTableSectionElement;

    const footerEl = document.createElement("div");
    footerEl.style.display = "flex";
    footerEl.style.justifyContent = "space-between";
    footerEl.style.alignItems = "center";
    footerEl.style.borderTop = "1px solid #e2e8f0";
    footerEl.style.paddingTop = "5px";
    footerEl.style.fontSize = "8.5px";
    footerEl.style.fontFamily = "'JetBrains Mono', monospace";
    footerEl.style.color = "#94a3b8";
    footerEl.style.textTransform = "uppercase";

    footerEl.innerHTML = `
      <span>PT. Pelayaran Bahtera Adhiguna &bull; WMS Logistics System</span>
      <span class="page-num-indicator">Halaman ${pageNum} dari 1 &bull; Ref: ${docNum}</span>
    `;

    const pageFooterSpan = footerEl.querySelector(".page-num-indicator") as HTMLElement;

    pageEl.appendChild(contentWrapper);
    pageEl.appendChild(footerEl);

    return { pageEl, contentWrapper, tbody, pageFooterSpan };
  }

  try {
    // Measure footer block height in the staging container
    const tempMeasure = document.createElement("div");
    tempMeasure.style.width = "738px"; // 794 - 56
    tempMeasure.innerHTML = footerSignBlockHtml;
    staging.appendChild(tempMeasure);
    const footerHeight = tempMeasure.offsetHeight || 195;
    staging.removeChild(tempMeasure);

    // Maximum content height inside the 1123px A4 page (padding 24+18=42, footer bar ~22, safety buffer 15)
    const MAX_CONTENT_HEIGHT = 1044;

    const items = (req.items && req.items.length > 0) ? req.items : [null];

    let currentPage = createPage(true, 1);
    staging.appendChild(currentPage.pageEl);
    pages.push(currentPage);

    for (let idx = 0; idx < items.length; idx++) {
      const itm = items[idx];
      const isLastItem = idx === items.length - 1;

      const rowEl = document.createElement("tr");
      rowEl.style.borderBottom = "1px solid #cbd5e1";
      rowEl.style.fontWeight = "600";

      if (!itm) {
        rowEl.innerHTML = `
          <td style="padding: 7px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #94a3b8;">1</td>
          <td style="padding: 7px 12px; border-right: 1px solid #cbd5e1; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 11px; color: #94a3b8;">(-)</td>
          <td style="padding: 7px 10px; border-right: 1px solid #cbd5e1; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #94a3b8;">(-)</td>
          <td style="padding: 7px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #94a3b8;">(-)</td>
          <td style="padding: 7px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: 'JetBrains Mono', monospace; color: #94a3b8; font-size: 11px;">(-)</td>
          <td style="padding: 7px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #94a3b8;"></td>
          <td style="padding: 7px 12px; color: #64748b; font-family: 'Inter', sans-serif; font-style: italic; font-size: 10px;">NIHIL (-)</td>
        `;
      } else {
        rowEl.innerHTML = `
          <td style="padding: 6px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #64748b;">${idx + 1}</td>
          <td style="padding: 6px 12px; border-right: 1px solid #cbd5e1; font-family: 'Inter', sans-serif; font-weight: 900; font-size: 11px; color: #0f172a; line-height: 1.3;">${itm.spare_part_name || "(-)"}</td>
          <td style="padding: 6px 10px; border-right: 1px solid #cbd5e1; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #334155;">${itm.part_number || "-"}</td>
          <td style="padding: 6px 6px; border-right: 1px solid #cbd5e1; text-align: center; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #334155;">${itm.unit || "(-)"}</td>
          <td style="padding: 6px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: 'JetBrains Mono', monospace; color: #1e3a8a; font-weight: 900; font-size: 12px;">${itm.requested_qty || "(-)"}</td>
          <td style="padding: 6px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #334155;"></td>
          <td style="padding: 6px 12px; color: #475569; font-family: 'Inter', sans-serif; font-style: italic; font-size: 10px; font-weight: normal; line-height: 1.3;">${itm.notes || defaultNotes}</td>
        `;
      }

      currentPage.tbody.appendChild(rowEl);

      // Check if adding this row causes an overflow
      if (isLastItem) {
        // If it's the last item, check if both row AND footer block can fit together
        if (currentPage.contentWrapper.offsetHeight + footerHeight > MAX_CONTENT_HEIGHT) {
          // If this page already has at least 1 row, let's see if this row alone fits
          if (currentPage.contentWrapper.offsetHeight > MAX_CONTENT_HEIGHT && currentPage.tbody.children.length > 1) {
            // Even the row alone doesn't fit on this page, move row to new page
            currentPage.tbody.removeChild(rowEl);
            currentPage = createPage(false, pages.length + 1);
            staging.appendChild(currentPage.pageEl);
            pages.push(currentPage);
            currentPage.tbody.appendChild(rowEl);
          }
          // The footer block will be placed on either current page or a new page below
        }
      } else {
        // Not the last item: check if current content height exceeds max allowable
        if (currentPage.contentWrapper.offsetHeight > MAX_CONTENT_HEIGHT) {
          if (currentPage.tbody.children.length > 1) {
            currentPage.tbody.removeChild(rowEl);
            currentPage = createPage(false, pages.length + 1);
            staging.appendChild(currentPage.pageEl);
            pages.push(currentPage);
            currentPage.tbody.appendChild(rowEl);
          }
        }
      }
    }

    // Now append the footer signatures block
    const footerContainer = document.createElement("div");
    footerContainer.innerHTML = footerSignBlockHtml;

    if (currentPage.contentWrapper.offsetHeight + footerHeight > MAX_CONTENT_HEIGHT) {
      // Create final page specifically for signatures
      currentPage = createPage(false, pages.length + 1);
      staging.appendChild(currentPage.pageEl);
      pages.push(currentPage);

      // Hide the empty table container on this final signatures page
      const tableWrapper = currentPage.contentWrapper.querySelector(".table-container") as HTMLElement;
      if (tableWrapper) tableWrapper.style.display = "none";
    }

    currentPage.contentWrapper.appendChild(footerContainer);

    // Update total pages indicator on all pages
    const totalPages = pages.length;
    pages.forEach((p, pIdx) => {
      p.pageFooterSpan.innerHTML = `Halaman ${pIdx + 1} dari ${totalPages} &bull; Ref: ${docNum}`;
    });

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

    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      if (pIdx > 0) {
        pdf.addPage();
      }

      const pageEl = pages[pIdx].pageEl;
      const canvas = await html2canvas(pageEl, {
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
