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

async function waitForImagesToLoad(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    images.map(img => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );
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

  const defaultNotes = req.spk_number || req.work_order_ref ? `Permintaan SPK ${req.spk_number || req.work_order_ref}` : "(-)";

  // Tabel barang mengikuti jumlah barang yang ada (tanpa baris kosong tambahan)
  const rawItems = req.items || [];
  let rowsHtml = "";

  if (rawItems.length === 0) {
    rowsHtml = `
      <tr style="background-color: #ffffff;">
        <td style="width: 34px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-size: 11px;">1</td>
        <td style="width: 210px; padding: 10px 12px; border-right: 1px solid #cbd5e1; color: #94a3b8; font-size: 11px;">(-)</td>
        <td style="width: 125px; padding: 10px 10px; border-right: 1px solid #cbd5e1; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-size: 11px;">(-)</td>
        <td style="width: 48px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-size: 11px;">(-)</td>
        <td style="width: 100px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-size: 11px;">(-)</td>
        <td style="width: 65px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-size: 11px;">(-)</td>
        <td style="padding: 10px 12px; color: #64748b; font-style: italic; font-size: 11px;">NIHIL (-)</td>
      </tr>
    `;
  } else {
    for (let idx = 0; idx < rawItems.length; idx++) {
      const item = rawItems[idx];
      const isLast = idx === rawItems.length - 1;
      const borderStyle = isLast ? "" : "border-bottom: 1px solid #cbd5e1;";

      rowsHtml += `
        <tr style="${borderStyle} background-color: #ffffff;">
          <td style="width: 34px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-weight: 600; font-size: 11px;">${idx + 1}</td>
          <td style="width: 210px; padding: 10px 12px; border-right: 1px solid #cbd5e1; font-weight: 800; color: #0f172a; line-height: 1.35; font-size: 11.5px; word-break: break-word;">${item.spare_part_name || "(-)"}</td>
          <td style="width: 125px; padding: 10px 10px; border-right: 1px solid #cbd5e1; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 600; color: #334155; font-size: 11px; word-break: break-word;">${item.part_number || "-"}</td>
          <td style="width: 48px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; text-transform: uppercase; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 600; color: #0f172a; font-size: 11px;">${item.unit || "(-)"}</td>
          <td style="width: 100px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #1e3a8a; font-weight: 800; font-size: 12px;">${item.requested_qty || "(-)"}</td>
          <td style="width: 65px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #334155; font-size: 10.5px;"></td>
          <td style="padding: 10px 12px; color: #334155; font-style: italic; font-size: 11px; line-height: 1.35; word-break: break-word;">${item.notes || defaultNotes}</td>
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
            font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            -webkit-font-smoothing: antialiased;
        }
        .page {
            width: 794px;
            min-height: 1123px;
            margin: 0 auto;
            background: #ffffff;
            padding: 28px 32px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            position: relative;
        }
        .table-fixed {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .no-print-btn { display: flex; justify-content: center; gap: 1rem; margin: 24px 0; }
        .btn { padding: 10px 24px; font-size: 12px; font-weight: bold; border-radius: 6px; border: none; cursor: pointer; text-transform: uppercase; }
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
        <!-- Letterhead -->
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <img src="/bag-logo.jpg" alt="BAG Logo" style="height: 52px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
                <div>
                    <h1 style="margin: 0; font-size: 16.5px; font-weight: 800; text-transform: uppercase; color: #0f172a; line-height: 1.25; letter-spacing: -0.2px;">PT. PELAYARAN BAHTERA ADHIGUNA (BAG)</h1>
                    <p style="margin: 3px 0 0 0; font-size: 9.5px; color: #64748b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; line-height: 1.45;">
                        Maritime Logistics and Spares Warehouse<br>
                        Jl. Yos Sudarso No 193 Tanjung Sekong, Merak, Banten<br>
                        Phone: (021) 229-099-01
                    </p>
                </div>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                <span style="color: #94a3b8; font-size: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 600; letter-spacing: 0.06em;">WMS-SYSTEM</span>
                <div style="margin-top: 4px; font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #334155;">Ref: <strong style="color: #0f172a; font-weight: 800;">${docNum}</strong></div>
                <div style="margin-top: 2px; font-size: 9px; color: #475569;">Date: ${headerDate}</div>
                <div style="margin-top: 5px;">
                    <span style="font-size: 11.5px; font-weight: 800; border: 1px solid #0f172a; padding: 2px 10px; border-radius: 4px; background: #f8fafc; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #0f172a; display: inline-block; letter-spacing: 0.05em;">${typeBadge}</span>
                </div>
            </div>
        </div>

        <!-- Document Title -->
        <div style="text-align: center; margin-bottom: 14px;">
            <h2 style="margin: 0; font-size: 15.5px; text-transform: uppercase; text-decoration: underline; text-underline-offset: 4px; color: #0f172a; font-weight: 800; letter-spacing: 0.08em;">${titleText}</h2>
            <p style="margin: 5px 0 0 0; font-size: 10px; text-transform: uppercase; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #64748b; font-style: italic; letter-spacing: 0.06em;">${typeDesc}</p>
        </div>

        <!-- Particulars Table Box -->
        <div style="border: 1px solid #0f172a; border-radius: 8px; padding: 12px 14px; background: #ffffff; font-size: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; margin-bottom: 20px; text-transform: uppercase; line-height: 1.6;">
            <div style="display: flex; justify-content: space-between; gap: 16px;">
                <div style="display: flex; flex-direction: column; gap: 5px; flex: 1.15;">
                    <div style="display: flex; align-items: baseline;"><span style="color: #64748b; width: 135px; flex-shrink: 0;">KAPAL PENERIMA :</span><strong style="color: #0f172a; font-size: 13.5px; font-weight: 900;">${req.vessel_name || "MV. KARTINI BARUNA"}</strong></div>
                    <div style="display: flex; align-items: baseline;"><span style="color: #64748b; width: 135px; flex-shrink: 0;">FASILITAS GUDANG :</span><strong style="color: #0f172a; font-weight: 700;">MERAK WAREHOUSE</strong></div>
                    <div style="display: flex; align-items: baseline;"><span style="color: #64748b; width: 135px; flex-shrink: 0;">ALAMAT PENGIRIMAN :</span><strong style="color: #1e293b; font-weight: 700;">${cleanAddress}</strong></div>
                    <div style="display: flex; align-items: baseline;"><span style="color: #64748b; width: 135px; flex-shrink: 0;">PEKERJAAN (WO REF) :</span><strong style="color: #1e3a8a; font-weight: 700;">${req.work_order_ref || req.spk_number || "Daftar Permintaan / WO"}</strong></div>
                    <div style="display: flex; align-items: baseline;"><span style="color: #64748b; width: 135px; flex-shrink: 0;">KODE AKUN :</span><strong style="color: #0f172a; font-weight: 700;">${req.account_code || "BPP"}</strong></div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px; text-align: right; flex: 0.95;">
                    <div><span style="color: #64748b; margin-right: 8px;">PEMOHON / REQUESTER :</span><strong style="color: #3730a3; font-weight: 700;">${req.requester_name || req.requested_by || "CHIEF ENGINEER"}</strong></div>
                    <div><span style="color: #64748b; margin-right: 8px;">TANGGAL PENGAJUAN :</span><strong style="color: #92400e; font-weight: 700;">${tanggalPengajuan}</strong></div>
                    <div><span style="color: #64748b; margin-right: 8px;">NO. DOKUMEN TUG :</span><strong style="color: #0f172a; font-weight: 700;">${docNum}</strong></div>
                    <div><span style="color: #64748b; margin-right: 8px;">FUNGSI :</span><strong style="color: #0f172a; font-weight: 700;">${req.function_code || "ARMADA"}</strong></div>
                </div>
            </div>
            ${req.remarks ? `
              <div style="margin-top: 10px; padding: 6px 10px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 10px; font-style: italic; border-radius: 4px; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; text-transform: lowercase; color: #334155;">
                <strong style="text-transform: uppercase; font-style: normal; font-size: 9px; color: #1e293b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; margin-right: 8px;">CATATAN PERMINTAAN:</strong>${req.remarks}
              </div>
            ` : ""}
        </div>

        <!-- Material Items Table (Mengikuti jumlah barang yang ada) -->
        <div style="width: 100%; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; background: #ffffff; margin-bottom: 24px;">
            <table class="table-fixed">
                <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #cbd5e1; font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.05em;">
                        <th style="width: 34px; padding: 9px 6px; border-right: 1px solid #cbd5e1; text-align: center;">#</th>
                        <th style="width: 210px; padding: 9px 12px; border-right: 1px solid #cbd5e1; text-align: left;">NAMA BARANG (DITULIS LENGKAP)</th>
                        <th style="width: 125px; padding: 9px 10px; border-right: 1px solid #cbd5e1; text-align: left;">NOMOR / PART NUMBER</th>
                        <th style="width: 48px; padding: 9px 6px; border-right: 1px solid #cbd5e1; text-align: center;">STN</th>
                        <th style="width: 100px; padding: 9px 6px; border-right: 1px solid #cbd5e1; text-align: center; color: #1e3a8a; font-weight: 800; line-height: 1.25;">BANYAKNYA (DIBERIKAN)</th>
                        <th style="width: 65px; padding: 9px 6px; border-right: 1px solid #cbd5e1; text-align: center;">NOMOR DO</th>
                        <th style="padding: 9px 12px; text-align: left;">KETERANGAN</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>

        <!-- Perintah Kerja Box -->
        <div style="border: 1px solid #0f172a; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; background: #f8fafc; font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; text-transform: uppercase; font-weight: 700; color: #1e293b;">
            <div>PERINTAH KERJA: <span style="color: #be123c; font-weight: 800;">${req.work_order_ref || req.spk_number || "TIADA"}</span></div>
            <div style="text-align: center;">KODE AKUN: <span style="color: #4338ca; font-weight: 800;">${req.account_code || "BPP"}</span></div>
            <div style="text-align: right;">FUNGSI: <span style="color: #047857; font-weight: 800;">${req.function_code || "ARMADA"}</span></div>
        </div>

        <!-- Disclaimer -->
        <p style="font-style: italic; color: #64748b; font-size: 10px; margin: 4px 0 24px 0; line-height: 1.45;">
            Disclaimer: PT. Pelayaran Bahtera Adhiguna assumes fully audited logistics carriage parameters upon signed counter-authority signature dispatch tags. Checked physically against corrosion, salt contamination, marine class markings and full vendor structural seal integrity.
        </p>

        <!-- 4 Signatures Grid -->
        <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; width: 100%; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; font-size: 8px; font-weight: 700; color: #334155;">
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                <div style="height: 24px; display: flex; align-items: flex-start; justify-content: center; width: 100%;">MENGETAHUI :</div>
                <div style="height: 56px; width: 100%; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px;">
                    ${sigVP ? `<img src="${sigVP}" style="max-height: 48px; max-width: 130px; object-fit: contain;" />` : ``}
                </div>
                <div style="width: 100%; border-top: 1.5px solid #334155; padding-top: 5px; display: flex; flex-direction: column; align-items: center;">
                    <span style="font-size: 8.5px; line-height: 1.2; font-weight: 900; color: #0f172a; white-space: nowrap;">SUMBONO</span>
                    <span style="font-size: 7.5px; line-height: 1.2; margin-top: 2px; color: #64748b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 400; font-style: italic; white-space: nowrap;">VP RENDALHAR</span>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                <div style="height: 24px; display: flex; align-items: flex-start; justify-content: center; width: 100%;">DISETUJUI OLEH :</div>
                <div style="height: 56px; width: 100%; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px;">
                    ${sigManager ? `<img src="${sigManager}" style="max-height: 48px; max-width: 130px; object-fit: contain;" />` : ``}
                </div>
                <div style="width: 100%; border-top: 1.5px solid #334155; padding-top: 5px; display: flex; flex-direction: column; align-items: center;">
                    <span style="font-size: 8.5px; line-height: 1.2; font-weight: 900; color: #0f172a; white-space: nowrap;">MOHAMAT EMIR FERDIAN</span>
                    <span style="font-size: 7.5px; line-height: 1.2; margin-top: 2px; color: #64748b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 400; font-style: italic; text-transform: none; white-space: nowrap;">Manager Logistik</span>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                <div style="height: 24px; display: flex; align-items: flex-start; justify-content: center; width: 100%;">KEPALA GUDANG :</div>
                <div style="height: 56px; width: 100%; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px;">
                    ${sigGudang ? `<img src="${sigGudang}" style="max-height: 48px; max-width: 130px; object-fit: contain;" />` : ``}
                </div>
                <div style="width: 100%; border-top: 1.5px solid #334155; padding-top: 5px; display: flex; flex-direction: column; align-items: center;">
                    <span style="font-size: 8.5px; line-height: 1.2; font-weight: 900; color: #0f172a; white-space: nowrap;">MAGHFUR MUHAMMAD ALFIN</span>
                    <span style="font-size: 7.5px; line-height: 1.2; margin-top: 2px; color: #64748b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 400; font-style: italic; text-transform: none; white-space: nowrap;">Kepala Gudang</span>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                <div style="height: 24px; display: flex; align-items: flex-start; justify-content: center; width: 100%;">PETUGAS GUDANG :</div>
                <div style="height: 56px; width: 100%; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px;">
                    ${sigPetugasGudang ? `<img src="${sigPetugasGudang}" style="max-height: 48px; max-width: 130px; object-fit: contain;" />` : ``}
                </div>
                <div style="width: 100%; border-top: 1.5px solid #334155; padding-top: 5px; display: flex; flex-direction: column; align-items: center;">
                    <span style="font-size: 8.5px; line-height: 1.2; font-weight: 900; color: #0f172a; white-space: nowrap;">ALDI HIDAYAT</span>
                    <span style="font-size: 7.5px; line-height: 1.2; margin-top: 2px; color: #64748b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 400; font-style: italic; text-transform: none; white-space: nowrap;">Petugas Gudang</span>
                </div>
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
 * High-fidelity A4 PDF generator for TUG 5 and TUG 6 documents.
 * Matches the PrintDocument A4 layout with dynamic item table rows
 * (following the exact number of items without blank filler rows).
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
    const itemsPerPage = 12;
    const isSinglePage = rawItems.length <= itemsPerPage;
    const totalPages = isSinglePage ? 1 : Math.ceil(rawItems.length / itemsPerPage);

    const pagesEl: HTMLElement[] = [];

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const isPageOne = pageIdx === 0;
      const isLastPage = pageIdx === totalPages - 1;

      const pageEl = document.createElement("div");
      pageEl.className = "a4-pdf-page";
      pageEl.style.width = "794px";
      pageEl.style.height = "1123px";
      pageEl.style.maxHeight = "1123px";
      pageEl.style.backgroundColor = "#ffffff";
      pageEl.style.boxSizing = "border-box";
      pageEl.style.padding = "28px 32px";
      pageEl.style.display = "flex";
      pageEl.style.flexDirection = "column";
      pageEl.style.justifyContent = "flex-start";
      pageEl.style.position = "relative";
      pageEl.style.overflow = "hidden";
      pageEl.style.fontFamily = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      pageEl.style.color = "#0f172a";

      // 1. TOP SECTION
      const topSection = document.createElement("div");
      topSection.style.width = "100%";
      topSection.style.display = "flex";
      topSection.style.flexDirection = "column";

      if (isPageOne) {
        topSection.innerHTML = `
          <!-- Letterhead -->
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; box-sizing: border-box;">
              <div style="display: flex; align-items: center; gap: 12px;">
                  <img src="/bag-logo.jpg" alt="BAG Logo" style="height: 52px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
                  <div>
                      <h1 style="margin: 0; font-size: 16.5px; font-weight: 800; text-transform: uppercase; color: #0f172a; line-height: 1.25; letter-spacing: -0.2px;">PT. PELAYARAN BAHTERA ADHIGUNA (BAG)</h1>
                      <p style="margin: 3px 0 0 0; font-size: 9.5px; color: #64748b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; line-height: 1.45;">
                          Maritime Logistics and Spares Warehouse<br>
                          Jl. Yos Sudarso No 193 Tanjung Sekong, Merak, Banten<br>
                          Phone: (021) 229-099-01
                      </p>
                  </div>
              </div>
              <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                  <span style="color: #94a3b8; font-size: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 600; letter-spacing: 0.06em;">WMS-SYSTEM</span>
                  <div style="margin-top: 4px; font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #334155;">Ref: <strong style="color: #0f172a; font-weight: 800;">${docNum}</strong></div>
                  <div style="margin-top: 2px; font-size: 9px; color: #475569;">Date: ${headerDate}</div>
                  <div style="margin-top: 5px;">
                      <span style="font-size: 11.5px; font-weight: 800; border: 1px solid #0f172a; padding: 2px 10px; border-radius: 4px; background: #f8fafc; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #0f172a; display: inline-block; letter-spacing: 0.05em;">${typeBadge}</span>
                  </div>
              </div>
          </div>

          <!-- Document Title -->
          <div style="text-align: center; margin-bottom: 14px; box-sizing: border-box;">
              <h2 style="margin: 0; font-size: 15.5px; text-transform: uppercase; text-decoration: underline; text-underline-offset: 4px; color: #0f172a; font-weight: 800; letter-spacing: 0.08em;">${titleText}</h2>
              <p style="margin: 5px 0 0 0; font-size: 10px; text-transform: uppercase; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #64748b; font-style: italic; letter-spacing: 0.06em;">${typeDesc}</p>
          </div>

          <!-- Particulars Table Box -->
          <div style="border: 1px solid #0f172a; border-radius: 8px; padding: 12px 14px; background: #ffffff; font-size: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; margin-bottom: 20px; text-transform: uppercase; line-height: 1.6; box-sizing: border-box;">
              <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <div style="display: flex; flex-direction: column; gap: 5px; flex: 1.15;">
                      <div style="display: flex; align-items: baseline;"><span style="color: #64748b; width: 135px; flex-shrink: 0;">KAPAL PENERIMA :</span><strong style="color: #0f172a; font-size: 13.5px; font-weight: 900;">${req.vessel_name || "MV. KARTINI BARUNA"}</strong></div>
                      <div style="display: flex; align-items: baseline;"><span style="color: #64748b; width: 135px; flex-shrink: 0;">FASILITAS GUDANG :</span><strong style="color: #0f172a; font-weight: 700;">MERAK WAREHOUSE</strong></div>
                      <div style="display: flex; align-items: baseline;"><span style="color: #64748b; width: 135px; flex-shrink: 0;">ALAMAT PENGIRIMAN :</span><strong style="color: #1e293b; font-weight: 700;">${cleanAddress}</strong></div>
                      <div style="display: flex; align-items: baseline;"><span style="color: #64748b; width: 135px; flex-shrink: 0;">PEKERJAAN (WO REF) :</span><strong style="color: #1e3a8a; font-weight: 700;">${req.work_order_ref || req.spk_number || "Daftar Permintaan / WO"}</strong></div>
                      <div style="display: flex; align-items: baseline;"><span style="color: #64748b; width: 135px; flex-shrink: 0;">KODE AKUN :</span><strong style="color: #0f172a; font-weight: 700;">${req.account_code || "BPP"}</strong></div>
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 5px; text-align: right; flex: 0.95;">
                      <div><span style="color: #64748b; margin-right: 8px;">PEMOHON / REQUESTER :</span><strong style="color: #3730a3; font-weight: 700;">${req.requester_name || req.requested_by || "CHIEF ENGINEER"}</strong></div>
                      <div><span style="color: #64748b; margin-right: 8px;">TANGGAL PENGAJUAN :</span><strong style="color: #92400e; font-weight: 700;">${tanggalPengajuan}</strong></div>
                      <div><span style="color: #64748b; margin-right: 8px;">NO. DOKUMEN TUG :</span><strong style="color: #0f172a; font-weight: 700;">${docNum}</strong></div>
                      <div><span style="color: #64748b; margin-right: 8px;">FUNGSI :</span><strong style="color: #0f172a; font-weight: 700;">${req.function_code || "ARMADA"}</strong></div>
                  </div>
              </div>
              ${req.remarks ? `
                <div style="margin-top: 10px; padding: 6px 10px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 10px; font-style: italic; border-radius: 4px; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; text-transform: lowercase; color: #334155; box-sizing: border-box;">
                  <strong style="text-transform: uppercase; font-style: normal; font-size: 9px; color: #1e293b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; margin-right: 8px;">CATATAN PERMINTAAN:</strong>${req.remarks}
                </div>
              ` : ""}
          </div>
        `;
      } else {
        topSection.innerHTML = `
          <!-- Continuation Header -->
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
              <div style="display: flex; align-items: center; gap: 10px;">
                  <img src="/bag-logo.jpg" alt="BAG Logo" style="height: 36px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
                  <div>
                      <h2 style="margin: 0; font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a;">PT. PELAYARAN BAHTERA ADHIGUNA (BAG)</h2>
                      <p style="margin: 2px 0 0 0; font-size: 9px; color: #475569; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
                          ${titleText} (Lanjutan) &bull; Kapal: <strong style="color: #0f172a;">${req.vessel_name || "MV. KARTINI BARUNA"}</strong>
                      </p>
                  </div>
              </div>
              <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #334155;">Ref: <strong style="color: #0f172a;">${docNum}</strong></span>
                  <span style="font-size: 10.5px; font-weight: 800; border: 1px solid #0f172a; padding: 2px 8px; border-radius: 4px; background: #f8fafc; color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${typeBadge}</span>
              </div>
          </div>
        `;
      }

      // 2. CENTER SECTION: MATERIAL TABLE (Mengikuti jumlah barang yang ada, tanpa baris kosong tambahan)
      const pageItems = rawItems.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);

      let rowsHtml = "";
      if (pageItems.length === 0) {
        rowsHtml = `
          <tr style="background-color: #ffffff;">
            <td style="width: 34px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-size: 11px;">1</td>
            <td style="width: 210px; padding: 10px 12px; border-right: 1px solid #cbd5e1; color: #94a3b8; font-size: 11px;">(-)</td>
            <td style="width: 125px; padding: 10px 10px; border-right: 1px solid #cbd5e1; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-size: 11px;">(-)</td>
            <td style="width: 48px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-size: 11px;">(-)</td>
            <td style="width: 100px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-size: 11px;">(-)</td>
            <td style="width: 65px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-size: 11px;">(-)</td>
            <td style="padding: 10px 12px; color: #64748b; font-style: italic; font-size: 11px;">NIHIL (-)</td>
          </tr>
        `;
      } else {
        for (let rIdx = 0; rIdx < pageItems.length; rIdx++) {
          const item = pageItems[rIdx];
          const globalIdx = pageIdx * itemsPerPage + rIdx + 1;
          const isLastRow = rIdx === pageItems.length - 1;
          const borderStyle = isLastRow ? "" : "border-bottom: 1px solid #cbd5e1;";

          rowsHtml += `
            <tr style="${borderStyle} background-color: #ffffff;">
              <td style="width: 34px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-weight: 600; font-size: 11px;">${globalIdx}</td>
              <td style="width: 210px; padding: 10px 12px; border-right: 1px solid #cbd5e1; font-weight: 800; color: #0f172a; line-height: 1.35; font-size: 11.5px; word-break: break-word;">${item.spare_part_name || "(-)"}</td>
              <td style="width: 125px; padding: 10px 10px; border-right: 1px solid #cbd5e1; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 600; color: #334155; font-size: 11px; word-break: break-word;">${item.part_number || "-"}</td>
              <td style="width: 48px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; text-transform: uppercase; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 600; color: #0f172a; font-size: 11px;">${item.unit || "(-)"}</td>
              <td style="width: 100px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #1e3a8a; font-weight: 800; font-size: 12px;">${item.requested_qty || "(-)"}</td>
              <td style="width: 65px; padding: 10px 6px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #334155; font-size: 10.5px;"></td>
              <td style="padding: 10px 12px; color: #334155; font-style: italic; font-size: 11px; line-height: 1.35; word-break: break-word;">${item.notes || defaultNotes}</td>
            </tr>
          `;
        }
      }

      const centerSection = document.createElement("div");
      centerSection.style.width = "100%";
      centerSection.style.border = "1px solid #cbd5e1";
      centerSection.style.borderRadius = "4px";
      centerSection.style.overflow = "hidden";
      centerSection.style.backgroundColor = "#ffffff";
      centerSection.style.marginBottom = "24px";
      centerSection.style.boxSizing = "border-box";

      centerSection.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; box-sizing: border-box;">
            <thead>
                <tr style="background-color: #f8fafc; border-bottom: 1px solid #cbd5e1; font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.05em;">
                    <th style="width: 34px; padding: 9px 6px; border-right: 1px solid #cbd5e1; text-align: center;">#</th>
                    <th style="width: 210px; padding: 9px 12px; border-right: 1px solid #cbd5e1; text-align: left;">NAMA BARANG (DITULIS LENGKAP)</th>
                    <th style="width: 125px; padding: 9px 10px; border-right: 1px solid #cbd5e1; text-align: left;">NOMOR / PART NUMBER</th>
                    <th style="width: 48px; padding: 9px 6px; border-right: 1px solid #cbd5e1; text-align: center;">STN</th>
                    <th style="width: 100px; padding: 9px 6px; border-right: 1px solid #cbd5e1; text-align: center; color: #1e3a8a; font-weight: 800; line-height: 1.25;">BANYAKNYA (DIBERIKAN)</th>
                    <th style="width: 65px; padding: 9px 6px; border-right: 1px solid #cbd5e1; text-align: center;">NOMOR DO</th>
                    <th style="padding: 9px 12px; text-align: left;">KETERANGAN</th>
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
          <div style="border: 1px solid #0f172a; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; background: #f8fafc; font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; text-transform: uppercase; font-weight: 700; color: #1e293b; box-sizing: border-box;">
              <div>PERINTAH KERJA: <span style="color: #be123c; font-weight: 800;">${req.work_order_ref || req.spk_number || "TIADA"}</span></div>
              <div style="text-align: center;">KODE AKUN: <span style="color: #4338ca; font-weight: 800;">${req.account_code || "BPP"}</span></div>
              <div style="text-align: right;">FUNGSI: <span style="color: #047857; font-weight: 800;">${req.function_code || "ARMADA"}</span></div>
          </div>

          <!-- Disclaimer -->
          <p style="font-style: italic; color: #64748b; font-size: 10px; margin: 4px 0 24px 0; line-height: 1.45; box-sizing: border-box;">
              Disclaimer: PT. Pelayaran Bahtera Adhiguna assumes fully audited logistics carriage parameters upon signed counter-authority signature dispatch tags. Checked physically against corrosion, salt contamination, marine class markings and full vendor structural seal integrity.
          </p>

          <!-- 4 Signatures Grid -->
          <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; width: 100%; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; font-size: 8px; font-weight: 700; color: #334155; box-sizing: border-box;">
              <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                  <div style="height: 24px; display: flex; align-items: flex-start; justify-content: center; width: 100%;">MENGETAHUI :</div>
                  <div style="height: 56px; width: 100%; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px;">
                      ${sigVP ? `<img src="${sigVP}" style="max-height: 48px; max-width: 130px; object-fit: contain;" />` : ``}
                  </div>
                  <div style="width: 100%; border-top: 1.5px solid #334155; padding-top: 5px; display: flex; flex-direction: column; align-items: center;">
                      <span style="font-size: 8.5px; line-height: 1.2; font-weight: 900; color: #0f172a; white-space: nowrap;">SUMBONO</span>
                      <span style="font-size: 7.5px; line-height: 1.2; margin-top: 2px; color: #64748b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 400; font-style: italic; white-space: nowrap;">VP RENDALHAR</span>
                  </div>
              </div>

              <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                  <div style="height: 24px; display: flex; align-items: flex-start; justify-content: center; width: 100%;">DISETUJUI OLEH :</div>
                  <div style="height: 56px; width: 100%; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px;">
                      ${sigManager ? `<img src="${sigManager}" style="max-height: 48px; max-width: 130px; object-fit: contain;" />` : ``}
                  </div>
                  <div style="width: 100%; border-top: 1.5px solid #334155; padding-top: 5px; display: flex; flex-direction: column; align-items: center;">
                      <span style="font-size: 8.5px; line-height: 1.2; font-weight: 900; color: #0f172a; white-space: nowrap;">MOHAMAT EMIR FERDIAN</span>
                      <span style="font-size: 7.5px; line-height: 1.2; margin-top: 2px; color: #64748b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 400; font-style: italic; text-transform: none; white-space: nowrap;">Manager Logistik</span>
                  </div>
              </div>

              <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                  <div style="height: 24px; display: flex; align-items: flex-start; justify-content: center; width: 100%;">KEPALA GUDANG :</div>
                  <div style="height: 56px; width: 100%; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px;">
                      ${sigGudang ? `<img src="${sigGudang}" style="max-height: 48px; max-width: 130px; object-fit: contain;" />` : ``}
                  </div>
                  <div style="width: 100%; border-top: 1.5px solid #334155; padding-top: 5px; display: flex; flex-direction: column; align-items: center;">
                      <span style="font-size: 8.5px; line-height: 1.2; font-weight: 900; color: #0f172a; white-space: nowrap;">MAGHFUR MUHAMMAD ALFIN</span>
                      <span style="font-size: 7.5px; line-height: 1.2; margin-top: 2px; color: #64748b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 400; font-style: italic; text-transform: none; white-space: nowrap;">Kepala Gudang</span>
                  </div>
              </div>

              <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                  <div style="height: 24px; display: flex; align-items: flex-start; justify-content: center; width: 100%;">PETUGAS GUDANG :</div>
                  <div style="height: 56px; width: 100%; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px;">
                      ${sigPetugasGudang ? `<img src="${sigPetugasGudang}" style="max-height: 48px; max-width: 130px; object-fit: contain;" />` : ``}
                  </div>
                  <div style="width: 100%; border-top: 1.5px solid #334155; padding-top: 5px; display: flex; flex-direction: column; align-items: center;">
                      <span style="font-size: 8.5px; line-height: 1.2; font-weight: 900; color: #0f172a; white-space: nowrap;">ALDI HIDAYAT</span>
                      <span style="font-size: 7.5px; line-height: 1.2; margin-top: 2px; color: #64748b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 400; font-style: italic; text-transform: none; white-space: nowrap;">Petugas Gudang</span>
                  </div>
              </div>
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

export function createEmptyTUGReportRequest(
  type: "tug5" | "tug6",
  startDate?: string,
  endDate?: string
): MaterialRequest {
  const yearStr = (startDate || endDate || new Date().toISOString()).slice(0, 4) || "2026";
  const periodLabel = startDate || endDate ? `${startDate || "Awal"} s/d ${endDate || "Akhir"}` : "Semua Periode";
  const docCode = `${type.toUpperCase()}-${yearStr}-NIHIL`;
  return {
    id: `nihil-${type}-${startDate || "awal"}-${endDate || "akhir"}`,
    request_number: docCode,
    tug5_number: type === "tug5" ? docCode : undefined,
    tug6_number: type === "tug6" ? docCode : undefined,
    vessel_name: "(-)",
    requester_name: "(-)",
    requested_by: "(-)",
    request_date: endDate || startDate || new Date().toISOString().slice(0, 10),
    delivery_address: "Pelabuhan Merak, Cilegon, Banten",
    work_order_ref: "(-)",
    spk_number: "(-)",
    account_code: "BPP",
    function_code: "ARMADA",
    status: "Approved" as any,
    remarks: `LAPORAN NIHIL / TIDAK ADA DATA PERMINTAAN BARANG ${type.toUpperCase()} PADA PERIODE ${periodLabel.toUpperCase()} (-)`,
    items: [],
  } as any;
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

  // Jika data 0 pada periode tersebut, tetap buat 1 dokumen PDF laporan kosong (Nihil) untuk keperluan report
  const listToExport = filtered.length > 0
    ? filtered
    : [createEmptyTUGReportRequest(type, startDate, endDate)];

  const zip = new JSZip();
  const folderName = `${type.toUpperCase()}_Dokumen_PDF_Batch`;
  const folder = zip.folder(folderName) || zip;

  for (let idx = 0; idx < listToExport.length; idx++) {
    const req = listToExport[idx];
    if (onProgress) {
      onProgress(idx + 1, listToExport.length);
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

  return { count: listToExport.length, filename: zipFileName };
}
