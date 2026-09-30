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

interface CachedImageData {
  dataUrl: string;
  width: number;
  height: number;
}

const pdfImageCache = new Map<string, CachedImageData | null>();

async function loadImageForPdf(src: string | null | undefined): Promise<CachedImageData | null> {
  if (!src) return null;
  if (pdfImageCache.has(src)) {
    return pdfImageCache.get(src) || null;
  }

  return new Promise<CachedImageData | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width || 240;
        const h = img.naturalHeight || img.height || 80;
        const canvas = document.createElement("canvas");
        canvas.width = w * 2;
        canvas.height = h * 2;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          pdfImageCache.set(src, null);
          resolve(null);
          return;
        }
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0, w, h);
        const result: CachedImageData = {
          dataUrl: canvas.toDataURL("image/png"),
          width: w,
          height: h,
        };
        pdfImageCache.set(src, result);
        resolve(result);
      } catch {
        pdfImageCache.set(src, null);
        resolve(null);
      }
    };
    img.onerror = () => {
      pdfImageCache.set(src, null);
      resolve(null);
    };
    img.src = src;
  });
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

  const rawItems = req.items || [];
  let rowsHtml = "";

  if (rawItems.length === 0) {
    rowsHtml = `
      <tr style="background-color: #ffffff;">
        <td style="width: 32px; padding: 7px 5px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-size: 10px;">1</td>
        <td style="width: 195px; padding: 7px 10px; border-right: 1px solid #cbd5e1; color: #94a3b8; font-size: 10px;">(-)</td>
        <td style="width: 120px; padding: 7px 8px; border-right: 1px solid #cbd5e1; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-size: 10px;">(-)</td>
        <td style="width: 44px; padding: 7px 5px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-size: 10px;">(-)</td>
        <td style="width: 88px; padding: 7px 5px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-size: 10px;">(-)</td>
        <td style="width: 58px; padding: 7px 5px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-size: 10px;">(-)</td>
        <td style="padding: 7px 10px; color: #64748b; font-style: italic; font-size: 10px;">NIHIL (-)</td>
      </tr>
    `;
  } else {
    for (let idx = 0; idx < rawItems.length; idx++) {
      const item = rawItems[idx];
      const isLast = idx === rawItems.length - 1;
      const borderStyle = isLast ? "" : "border-bottom: 1px solid #cbd5e1;";

      rowsHtml += `
        <tr style="${borderStyle} background-color: #ffffff;">
          <td style="width: 32px; padding: 7px 5px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; font-weight: 600; font-size: 10px;">${idx + 1}</td>
          <td style="width: 195px; padding: 7px 10px; border-right: 1px solid #cbd5e1; font-weight: 800; color: #0f172a; line-height: 1.3; font-size: 10.5px; word-break: break-word;">${item.spare_part_name || "(-)"}</td>
          <td style="width: 120px; padding: 7px 8px; border-right: 1px solid #cbd5e1; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 600; color: #334155; font-size: 10px; word-break: break-word;">${item.part_number || "-"}</td>
          <td style="width: 44px; padding: 7px 5px; border-right: 1px solid #cbd5e1; text-align: center; text-transform: uppercase; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 600; color: #0f172a; font-size: 10px;">${item.unit || "(-)"}</td>
          <td style="width: 88px; padding: 7px 5px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #1e3a8a; font-weight: 800; font-size: 11px;">${item.requested_qty || "(-)"}</td>
          <td style="width: 58px; padding: 7px 5px; border-right: 1px solid #cbd5e1; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #334155; font-size: 10px;"></td>
          <td style="padding: 7px 10px; color: #334155; font-style: italic; font-size: 10px; line-height: 1.3; word-break: break-word;">${item.notes || defaultNotes}</td>
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
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <img src="/bag-logo.jpg" alt="BAG Logo" style="height: 48px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
                <div>
                    <h1 style="margin: 0; font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0f172a; line-height: 1.25;">PT. PELAYARAN BAHTERA ADHIGUNA (BAG)</h1>
                    <p style="margin: 2px 0 0 0; font-size: 9px; color: #64748b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; line-height: 1.4;">
                        Maritime Logistics and Spares Warehouse<br>
                        Jl. Yos Sudarso No 193 Tanjung Sekong, Merak, Banten<br>
                        Phone: (021) 229-099-01
                    </p>
                </div>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                <span style="color: #94a3b8; font-size: 9.5px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 600; letter-spacing: 0.06em;">WMS-SYSTEM</span>
                <div style="margin-top: 3px; font-size: 10.5px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #334155;">Ref: <strong style="color: #0f172a; font-weight: 800;">${docNum}</strong></div>
                <div style="margin-top: 2px; font-size: 8.5px; color: #475569;">Date: ${headerDate}</div>
                <div style="margin-top: 4px;">
                    <div style="height: 22px; padding: 0 10px; border: 1.2px solid #0f172a; border-radius: 4px; background: #f8fafc; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="font-size: 10.5px; font-weight: 800; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #0f172a; line-height: 1; letter-spacing: 0.05em;">${typeBadge}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Document Title -->
        <div style="text-align: center; margin-bottom: 12px;">
            <h2 style="margin: 0; font-size: 14.5px; text-transform: uppercase; text-decoration: underline; text-underline-offset: 4px; color: #0f172a; font-weight: 800; letter-spacing: 0.06em;">${titleText}</h2>
            <p style="margin: 4px 0 0 0; font-size: 9.5px; text-transform: uppercase; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #64748b; font-style: italic; letter-spacing: 0.05em;">${typeDesc}</p>
        </div>

        <!-- Particulars Table Box -->
        <div style="border: 1px solid #0f172a; border-radius: 7px; padding: 10px 14px; background: #ffffff; font-size: 9.5px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; margin-bottom: 16px; text-transform: uppercase; line-height: 1.55;">
            <div style="display: flex; justify-content: space-between; gap: 12px;">
                <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
                    <div style="display: flex; align-items: baseline;"><span style="color: #64748b; width: 130px; flex-shrink: 0;">KAPAL PENERIMA :</span><strong style="color: #0f172a; font-size: 12px; font-weight: 900;">${req.vessel_name || "MV. KARTINI BARUNA"}</strong></div>
                    <div style="display: flex; align-items: baseline;"><span style="color: #64748b; width: 130px; flex-shrink: 0;">FASILITAS GUDANG :</span><strong style="color: #0f172a; font-weight: 700;">MERAK WAREHOUSE</strong></div>
                    <div style="display: flex; align-items: baseline;"><span style="color: #64748b; width: 130px; flex-shrink: 0;">ALAMAT PENGIRIMAN :</span><strong style="color: #1e293b; font-weight: 700;">${cleanAddress}</strong></div>
                    <div style="display: flex; align-items: baseline;"><span style="color: #64748b; width: 130px; flex-shrink: 0;">PEKERJAAN (WO REF) :</span><strong style="color: #1e3a8a; font-weight: 700;">${req.work_order_ref || req.spk_number || "Daftar Permintaan / WO"}</strong></div>
                    <div style="display: flex; align-items: baseline;"><span style="color: #64748b; width: 130px; flex-shrink: 0;">KODE AKUN :</span><strong style="color: #0f172a; font-weight: 700;">${req.account_code || "BPP"}</strong></div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px; text-align: right; flex: 1.1;">
                    <div style="white-space: nowrap;"><span style="color: #64748b; margin-right: 6px;">PEMOHON / REQUESTER :</span><strong style="color: #3730a3; font-weight: 700;">${req.requester_name || req.requested_by || "CHIEF ENGINEER"}</strong></div>
                    <div style="white-space: nowrap;"><span style="color: #64748b; margin-right: 6px;">TANGGAL PENGAJUAN :</span><strong style="color: #92400e; font-weight: 700;">${tanggalPengajuan}</strong></div>
                    <div style="white-space: nowrap;"><span style="color: #64748b; margin-right: 6px;">NO. DOKUMEN TUG :</span><strong style="color: #0f172a; font-weight: 700;">${docNum}</strong></div>
                    <div style="white-space: nowrap;"><span style="color: #64748b; margin-right: 6px;">FUNGSI :</span><strong style="color: #0f172a; font-weight: 700;">${req.function_code || "ARMADA"}</strong></div>
                </div>
            </div>
            ${req.remarks ? `
              <div style="margin-top: 8px; padding: 5px 10px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 9.5px; font-style: italic; border-radius: 4px; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; text-transform: lowercase; color: #334155; display: flex; align-items: center;">
                <strong style="text-transform: uppercase; font-style: normal; font-size: 8.5px; color: #1e293b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; margin-right: 6px; flex-shrink: 0;">CATATAN PERMINTAAN:</strong><span>${req.remarks}</span>
              </div>
            ` : ""}
        </div>

        <!-- Material Items Table -->
        <div style="width: 100%; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; background: #ffffff; margin-bottom: 18px;">
            <table class="table-fixed">
                <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #cbd5e1; font-size: 9.5px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.04em;">
                        <th style="width: 32px; padding: 7px 5px; border-right: 1px solid #cbd5e1; text-align: center;">#</th>
                        <th style="width: 195px; padding: 7px 10px; border-right: 1px solid #cbd5e1; text-align: left;">NAMA BARANG (DITULIS LENGKAP)</th>
                        <th style="width: 120px; padding: 7px 8px; border-right: 1px solid #cbd5e1; text-align: left;">NOMOR / PART NUMBER</th>
                        <th style="width: 44px; padding: 7px 5px; border-right: 1px solid #cbd5e1; text-align: center;">STN</th>
                        <th style="width: 88px; padding: 7px 5px; border-right: 1px solid #cbd5e1; text-align: center; color: #1e3a8a; font-weight: 800; line-height: 1.2;">BANYAKNYA (DIBERIKAN)</th>
                        <th style="width: 58px; padding: 7px 5px; border-right: 1px solid #cbd5e1; text-align: center;">NOMOR DO</th>
                        <th style="padding: 7px 10px; text-align: left;">KETERANGAN</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>

        <!-- Perintah Kerja Box -->
        <div style="border: 1px solid #0f172a; border-radius: 6px; padding: 8px 14px; margin-bottom: 16px; background: #f8fafc; font-size: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-items: center; text-transform: uppercase; font-weight: 700; color: #1e293b;">
            <div>PERINTAH KERJA: <span style="color: #be123c; font-weight: 800;">${req.work_order_ref || req.spk_number || "TIADA"}</span></div>
            <div style="text-align: center;">KODE AKUN: <span style="color: #4338ca; font-weight: 800;">${req.account_code || "BPP"}</span></div>
            <div style="text-align: right;">FUNGSI: <span style="color: #047857; font-weight: 800;">${req.function_code || "ARMADA"}</span></div>
        </div>

        <!-- Disclaimer -->
        <p style="font-style: italic; color: #64748b; font-size: 9.5px; margin: 2px 0 20px 0; line-height: 1.4;">
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
 * Pure Vector A4 PDF generator for TUG 5 and TUG 6 documents using native jsPDF drawing.
 * Eliminates html2canvas baseline-shift bugs, keeps file sizes compact (~30KB per PDF),
 * centers badges and cells with mathematical precision, and scales table rows dynamically
 * according to the exact number of items.
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
  const typeDesc = type === "tug5"
    ? "GENERAL MATERIAL REQUEST FORM (TUG 5)"
    : "SPARE PARTS REQUEST FORM (TUG 6)";

  const headerDate = formatHeaderDate(req.request_date || req.created_at);
  const tanggalPengajuan = safeFormatDate(req.request_date, headerDate);

  const sigVPUrl = getSignatureForSlot("VP RENDALHAR", "Sumbono", signatures, req);
  const sigManagerUrl = getSignatureForSlot("Manager Logistik", "Mohamat Emir Ferdian", signatures, req);
  const sigGudangUrl = getSignatureForSlot("Kepala Gudang", "MAGHFUR MUHAMMAD ALFIN", signatures, req);
  const sigPetugasUrl = getSignatureForSlot("Petugas Gudang", "Aldi Hidayat", signatures, req);

  const [logoImg, sigVPImg, sigMgrImg, sigGdgImg, sigPtgImg] = await Promise.all([
    loadImageForPdf("/bag-logo.jpg"),
    loadImageForPdf(sigVPUrl),
    loadImageForPdf(sigManagerUrl),
    loadImageForPdf(sigGudangUrl),
    loadImageForPdf(sigPetugasUrl),
  ]);

  const cleanAddress = (req.delivery_address || "Pelabuhan Merak, Cilegon, Banten")
    .replace(/,\s*SPK\s+[^,]+/gi, "")
    .replace(/,\s*SPK\s*.*$/gi, "")
    .trim();

  const defaultNotes = req.spk_number || req.work_order_ref
    ? `Permintaan SPK ${req.spk_number || req.work_order_ref}`
    : "(-)";

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const marginX = 12;
  const rightX = 198;
  const contentW = rightX - marginX; // 186mm

  // Helper to draw the Page 1 Header + Title + Particulars Box and return currentY
  const drawPageOneTop = (): number => {
    let logoW = 0;
    if (logoImg) {
      const targetH = 12.5;
      logoW = Math.min(22, (logoImg.width / logoImg.height) * targetH);
      pdf.addImage(logoImg.dataUrl, "PNG", marginX, 12.5, logoW, targetH, undefined, "FAST");
    }

    const textLeftX = logoImg ? marginX + logoW + 3.5 : marginX;

    // Company Name & Address
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text("PT. PELAYARAN BAHTERA ADHIGUNA (BAG)", textLeftX, 16);

    pdf.setFont("courier", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("Maritime Logistics and Spares Warehouse", textLeftX, 19.8);
    pdf.text("Jl. Yos Sudarso No 193 Tanjung Sekong, Merak, Banten", textLeftX, 23);
    pdf.text("Phone: (021) 229-099-01", textLeftX, 26.2);

    // Top Right Meta & Badge
    pdf.setFont("courier", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text("WMS-SYSTEM", rightX, 14.5, { align: "right" });

    // Ref: TUG5-2026-XXX
    pdf.setFont("courier", "bold");
    pdf.setFontSize(8.5);
    const refValWidth = pdf.getTextWidth(docNum);
    pdf.setTextColor(15, 23, 42);
    pdf.text(docNum, rightX, 18.3, { align: "right" });
    pdf.setFont("courier", "normal");
    pdf.setTextColor(71, 85, 105);
    pdf.text("Ref: ", rightX - refValWidth, 18.3, { align: "right" });

    // Date
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Date: ${headerDate}`, rightX, 21.6, { align: "right" });

    // TUG 5 / TUG 6 Badge Box (mathematically centered text inside rounded box)
    const badgeW = 16.5;
    const badgeH = 5.6;
    const badgeX = rightX - badgeW;
    const badgeY = 23.2;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.35);
    pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.2, 1.2, "FD");

    pdf.setFont("courier", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(typeBadge, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.15, {
      align: "center",
      baseline: "middle",
    });

    // Letterhead Divider Line
    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.6);
    pdf.line(marginX, 31.2, rightX, 31.2);

    // Document Title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(titleText, 105, 37.2, { align: "center" });

    const titleW = pdf.getTextWidth(titleText);
    pdf.setLineWidth(0.45);
    pdf.line(105 - titleW / 2, 38.2, 105 + titleW / 2, 38.2);

    pdf.setFont("courier", "italic");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(typeDesc, 105, 41.8, { align: "center" });

    // Particulars Box
    const boxTop = 45.2;
    const leftLabelX = marginX + 3.5;
    const leftValX = marginX + 38.5;
    const rightColEdge = rightX - 3.5;

    // Calculate remarks height if present
    let remarksBoxH = 0;
    let remarksLines: string[] = [];
    const remarksPrefix = "CATATAN PERMINTAAN: ";
    if (req.remarks && req.remarks.trim()) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(7.5);
      const fullRemarksText = `${remarksPrefix}${req.remarks.trim().toLowerCase()}`;
      remarksLines = pdf.splitTextToSize(fullRemarksText, contentW - 12);
      remarksBoxH = Math.max(6.2, remarksLines.length * 3.4 + 2.8);
    }

    const boxH = 25.5 + (remarksBoxH > 0 ? remarksBoxH + 2.8 : 0);
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(marginX, boxTop, contentW, boxH, 2, 2, "FD");

    // Left column particulars
    const rowY = [boxTop + 5.2, boxTop + 9.4, boxTop + 13.6, boxTop + 17.8, boxTop + 22.0];

    pdf.setFont("courier", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("KAPAL PENERIMA :", leftLabelX, rowY[0]);
    pdf.text("FASILITAS GUDANG :", leftLabelX, rowY[1]);
    pdf.text("ALAMAT PENGIRIMAN :", leftLabelX, rowY[2]);
    pdf.text("PEKERJAAN (WO REF) :", leftLabelX, rowY[3]);
    pdf.text("KODE AKUN :", leftLabelX, rowY[4]);

    // Left column values
    pdf.setFont("courier", "bold");
    pdf.setFontSize(9.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text((req.vessel_name || "MV. KARTINI BARUNA").toUpperCase(), leftValX, rowY[0]);

    pdf.setFontSize(7.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text("MERAK WAREHOUSE", leftValX, rowY[1]);

    pdf.setTextColor(30, 41, 59);
    pdf.text(cleanAddress.toUpperCase(), leftValX, rowY[2]);

    pdf.setTextColor(30, 58, 138);
    pdf.text((req.work_order_ref || req.spk_number || "DAFTAR PERMINTAAN / WO").toUpperCase(), leftValX, rowY[3]);

    pdf.setTextColor(15, 23, 42);
    pdf.text((req.account_code || "BPP").toUpperCase(), leftValX, rowY[4]);

    // Right column helper (draws label + colored bold value right-aligned without wrapping)
    const drawRightPair = (y: number, label: string, val: string, r: number, g: number, b: number) => {
      pdf.setFont("courier", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(r, g, b);
      const valUp = val.toUpperCase();
      const valW = pdf.getTextWidth(valUp);
      pdf.text(valUp, rightColEdge, y, { align: "right" });

      pdf.setFont("courier", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text(`${label} `, rightColEdge - valW, y, { align: "right" });
    };

    drawRightPair(rowY[0], "PEMOHON / REQUESTER :", req.requester_name || req.requested_by || "CHIEF ENGINEER", 55, 48, 163);
    drawRightPair(rowY[1], "TANGGAL PENGAJUAN :", tanggalPengajuan, 146, 64, 14);
    drawRightPair(rowY[2], "NO. DOKUMEN TUG :", docNum, 15, 23, 42);
    drawRightPair(rowY[3], "FUNGSI :", req.function_code || "ARMADA", 15, 23, 42);

    // Remarks inner box
    if (remarksBoxH > 0) {
      const remY = boxTop + 24.8;
      const remX = marginX + 3.5;
      const remW = contentW - 7;
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.25);
      pdf.roundedRect(remX, remY, remW, remarksBoxH, 1.2, 1.2, "FD");

      // Draw prefix bold and rest italic
      const textStartY = remY + (remarksBoxH - (remarksLines.length - 1) * 3.4) / 2 + 0.9;
      pdf.setFont("courier", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(30, 41, 59);
      pdf.text("CATATAN PERMINTAAN:", remX + 2.5, textStartY);
      const prefixW = pdf.getTextWidth("CATATAN PERMINTAAN: ");

      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(7.5);
      pdf.setTextColor(51, 65, 85);
      const cleanRem = req.remarks!.trim().toLowerCase();
      const remBodyLines = pdf.splitTextToSize(cleanRem, remW - prefixW - 5);
      remBodyLines.forEach((line: string, lIdx: number) => {
        pdf.text(line, remX + 2.5 + (lIdx === 0 ? prefixW : 0), textStartY + lIdx * 3.4);
      });
    }

    return boxTop + boxH + 5;
  };

  // Helper to draw Continuation Header on page 2+
  const drawContinuationTop = (): number => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text("PT. PELAYARAN BAHTERA ADHIGUNA (BAG)", marginX, 15);

    pdf.setFont("courier", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`${titleText} (Lanjutan)  •  Kapal: ${(req.vessel_name || "MV. KARTINI BARUNA").toUpperCase()}`, marginX, 19);

    // Right Ref + Badge
    const badgeW = 15;
    const badgeH = 5;
    const badgeX = rightX - badgeW;
    const badgeY = 13.5;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, "FD");
    pdf.setFont("courier", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(15, 23, 42);
    pdf.text(typeBadge, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.15, {
      align: "center",
      baseline: "middle",
    });

    pdf.setFont("courier", "bold");
    pdf.setFontSize(8);
    pdf.text(`Ref: ${docNum}`, badgeX - 3, 17, { align: "right" });

    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.5);
    pdf.line(marginX, 21.5, rightX, 21.5);

    return 26;
  };

  // Column definitions for Items Table (total = 186mm)
  const colWidths = [8, 52, 34, 13, 23, 14, 42];
  const colX: number[] = [];
  let accX = marginX;
  for (const w of colWidths) {
    colX.push(accX);
    accX += w;
  }

  const drawTableHeader = (startY: number): number => {
    const headerH = 8.5;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.25);
    pdf.rect(marginX, startY, contentW, headerH, "FD");

    // Vertical column dividers
    for (let c = 1; c < colWidths.length; c++) {
      pdf.line(colX[c], startY, colX[c], startY + headerH);
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.setTextColor(51, 65, 85);

    // Col 0: #
    pdf.text("#", colX[0] + colWidths[0] / 2, startY + headerH / 2 + 0.2, { align: "center", baseline: "middle" });

    // Col 1: NAMA BARANG (DITULIS LENGKAP)
    pdf.text("NAMA BARANG (DITULIS", colX[1] + 2.2, startY + 3.3);
    pdf.text("LENGKAP)", colX[1] + 2.2, startY + 6.3);

    // Col 2: NOMOR / PART NUMBER
    pdf.text("NOMOR / PART", colX[2] + 2.2, startY + 3.3);
    pdf.text("NUMBER", colX[2] + 2.2, startY + 6.3);

    // Col 3: STN
    pdf.text("STN", colX[3] + colWidths[3] / 2, startY + headerH / 2 + 0.2, { align: "center", baseline: "middle" });

    // Col 4: BANYAKNYA (DIBERIKAN)
    pdf.setTextColor(30, 58, 138);
    pdf.text("BANYAKNYA", colX[4] + colWidths[4] / 2, startY + 3.3, { align: "center" });
    pdf.text("(DIBERIKAN)", colX[4] + colWidths[4] / 2, startY + 6.3, { align: "center" });

    // Col 5: NOMOR DO
    pdf.setTextColor(51, 65, 85);
    pdf.text("NOMOR", colX[5] + colWidths[5] / 2, startY + 3.3, { align: "center" });
    pdf.text("DO", colX[5] + colWidths[5] / 2, startY + 6.3, { align: "center" });

    // Col 6: KETERANGAN
    pdf.text("KETERANGAN", colX[6] + 2.5, startY + headerH / 2 + 0.2, { baseline: "middle" });

    return startY + headerH;
  };

  let currentY = drawPageOneTop();
  currentY = drawTableHeader(currentY);

  const rawItems = req.items || [];
  const itemsToRender = rawItems.length > 0
    ? rawItems
    : [{
        spare_part_name: "(-)",
        part_number: "(-)",
        unit: "(-)",
        requested_qty: 0,
        notes: "NIHIL (-)",
        __isNihil: true,
      } as any];

  for (let idx = 0; idx < itemsToRender.length; idx++) {
    const item = itemsToRender[idx];
    const isNihil = Boolean((item as any).__isNihil);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.8);
    const nameLines: string[] = pdf.splitTextToSize(String(item.spare_part_name || "(-)"), colWidths[1] - 4.4);

    pdf.setFont("courier", "bold");
    pdf.setFontSize(7.2);
    const partNoLines: string[] = pdf.splitTextToSize(String(item.part_number || "-"), colWidths[2] - 4.4);

    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(7.2);
    const noteStr = String(item.notes || defaultNotes);
    const noteLines: string[] = pdf.splitTextToSize(noteStr, colWidths[6] - 4.5);

    const maxLines = Math.max(nameLines.length, partNoLines.length, noteLines.length, 1);
    const rowH = Math.max(7.2, maxLines * 3.4 + 3.2);

    // Check page break (leave room at bottom)
    const maxPageY = 278;
    if (currentY + rowH > maxPageY) {
      pdf.addPage();
      currentY = drawContinuationTop();
      currentY = drawTableHeader(currentY);
    }

    // Draw row background & border
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.25);
    pdf.rect(marginX, currentY, contentW, rowH, "FD");

    for (let c = 1; c < colWidths.length; c++) {
      pdf.line(colX[c], currentY, colX[c], currentY + rowH);
    }

    const midY = currentY + rowH / 2 + 0.25;

    // Col 0: #
    pdf.setFont("courier", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text(String(idx + 1), colX[0] + colWidths[0] / 2, midY, { align: "center", baseline: "middle" });

    // Col 1: Nama Barang
    pdf.setFont("helvetica", isNihil ? "normal" : "bold");
    pdf.setFontSize(7.8);
    pdf.setTextColor(isNihil ? 148 : 15, isNihil ? 163 : 23, isNihil ? 184 : 42);
    const nameStartY = currentY + (rowH - (nameLines.length - 1) * 3.4) / 2 + 0.9;
    nameLines.forEach((ln: string, lIdx: number) => {
      pdf.text(ln, colX[1] + 2.2, nameStartY + lIdx * 3.4);
    });

    // Col 2: Nomor / Part Number
    pdf.setFont("courier", "bold");
    pdf.setFontSize(7.2);
    pdf.setTextColor(isNihil ? 148 : 51, isNihil ? 163 : 65, isNihil ? 184 : 85);
    const partStartY = currentY + (rowH - (partNoLines.length - 1) * 3.4) / 2 + 0.9;
    partNoLines.forEach((ln: string, lIdx: number) => {
      pdf.text(ln, colX[2] + 2.2, partStartY + lIdx * 3.4);
    });

    // Col 3: STN
    pdf.setFont("courier", "bold");
    pdf.setFontSize(7.2);
    pdf.setTextColor(isNihil ? 148 : 15, isNihil ? 163 : 23, isNihil ? 184 : 42);
    pdf.text(String(item.unit || "(-)").toUpperCase(), colX[3] + colWidths[3] / 2, midY, { align: "center", baseline: "middle" });

    // Col 4: Banyaknya (Diberikan)
    pdf.setFont("courier", "bold");
    pdf.setFontSize(8.2);
    if (isNihil) {
      pdf.setTextColor(148, 163, 184);
      pdf.text("(-)", colX[4] + colWidths[4] / 2, midY, { align: "center", baseline: "middle" });
    } else {
      pdf.setTextColor(30, 58, 138);
      pdf.text(String(item.requested_qty || "(-)"), colX[4] + colWidths[4] / 2, midY, { align: "center", baseline: "middle" });
    }

    // Col 5: Nomor DO (blank or (-))
    if (isNihil) {
      pdf.setFont("courier", "normal");
      pdf.setFontSize(7.2);
      pdf.setTextColor(148, 163, 184);
      pdf.text("(-)", colX[5] + colWidths[5] / 2, midY, { align: "center", baseline: "middle" });
    }

    // Col 6: Keterangan
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(7.2);
    pdf.setTextColor(51, 65, 85);
    const noteStartY = currentY + (rowH - (noteLines.length - 1) * 3.4) / 2 + 0.9;
    noteLines.forEach((ln: string, lIdx: number) => {
      pdf.text(ln, colX[6] + 2.2, noteStartY + lIdx * 3.4);
    });

    currentY += rowH;
  }

  // BOTTOM SECTION: Perintah Kerja Box + Disclaimer + 4 Signatures
  const bottomNeededH = 52;
  if (currentY + 6 + bottomNeededH > 286) {
    pdf.addPage();
    currentY = drawContinuationTop();
  } else {
    currentY += 6;
  }

  // Perintah Kerja Box
  const pkBoxH = 8.5;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(15, 23, 42);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(marginX, currentY, contentW, pkBoxH, 1.5, 1.5, "FD");

  const pkMidY = currentY + pkBoxH / 2 + 0.2;

  // Left: PERINTAH KERJA: <wo>
  pdf.setFont("courier", "bold");
  pdf.setFontSize(7.8);
  pdf.setTextColor(30, 41, 59);
  const pkLabel = "PERINTAH KERJA: ";
  pdf.text(pkLabel, marginX + 3.5, pkMidY, { baseline: "middle" });
  const pkLabelW = pdf.getTextWidth(pkLabel);
  pdf.setTextColor(190, 18, 60);
  pdf.text((req.work_order_ref || req.spk_number || "TIADA").toUpperCase(), marginX + 3.5 + pkLabelW, pkMidY, { baseline: "middle" });

  // Center: KODE AKUN: BPP
  const kaLabel = "KODE AKUN: ";
  const kaVal = (req.account_code || "BPP").toUpperCase();
  pdf.setTextColor(30, 41, 59);
  const kaLabelW = pdf.getTextWidth(kaLabel);
  const kaValW = pdf.getTextWidth(kaVal);
  const kaStartX = 105 - (kaLabelW + kaValW) / 2;
  pdf.text(kaLabel, kaStartX, pkMidY, { baseline: "middle" });
  pdf.setTextColor(67, 56, 202);
  pdf.text(kaVal, kaStartX + kaLabelW, pkMidY, { baseline: "middle" });

  // Right: FUNGSI: ARMADA
  const fnVal = (req.function_code || "ARMADA").toUpperCase();
  pdf.setTextColor(4, 120, 87);
  const fnValW = pdf.getTextWidth(fnVal);
  pdf.text(fnVal, rightX - 3.5, pkMidY, { align: "right", baseline: "middle" });
  pdf.setTextColor(30, 41, 59);
  pdf.text("FUNGSI: ", rightX - 3.5 - fnValW, pkMidY, { align: "right", baseline: "middle" });

  currentY += pkBoxH + 5.5;

  // Disclaimer
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(7.2);
  pdf.setTextColor(100, 116, 139);
  const disclaimerText =
    "Disclaimer: PT. Pelayaran Bahtera Adhiguna assumes fully audited logistics carriage parameters upon signed counter-authority signature dispatch tags. Checked physically against corrosion, salt contamination, marine class markings and full vendor structural seal integrity.";
  const discLines = pdf.splitTextToSize(disclaimerText, contentW);
  discLines.forEach((ln: string, idx: number) => {
    pdf.text(ln, marginX, currentY + idx * 3.4);
  });

  currentY += discLines.length * 3.4 + 6.5;

  // 4 Signatures Grid (Strictly aligned horizontal lines and labels)
  const sigCols = [
    { label: "MENGETAHUI :", img: sigVPImg, name: "SUMBONO", role: "VP RENDALHAR" },
    { label: "DISETUJUI OLEH :", img: sigMgrImg, name: "MOHAMAT EMIR FERDIAN", role: "Manager Logistik" },
    { label: "KEPALA GUDANG :", img: sigGdgImg, name: "MAGHFUR MUHAMMAD ALFIN", role: "Kepala Gudang" },
    { label: "PETUGAS GUDANG :", img: sigPtgImg, name: "ALDI HIDAYAT", role: "Petugas Gudang" },
  ];

  const sigGap = 6;
  const sigColW = (contentW - sigGap * 3) / 4; // 42mm per column
  const sigLabelY = currentY;
  const sigLineY = currentY + 18.5;
  const sigNameY = sigLineY + 3.8;
  const sigRoleY = sigNameY + 3.0;

  sigCols.forEach((col, cIdx) => {
    const colLeft = marginX + cIdx * (sigColW + sigGap);
    const colCenter = colLeft + sigColW / 2;

    // 1. Top Label
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.setTextColor(51, 65, 85);
    pdf.text(col.label, colCenter, sigLabelY, { align: "center" });

    // 2. Signature Image (aspect-ratio preserved, sitting cleanly above sigLineY)
    if (col.img) {
      const maxW = 33;
      const maxH = 13.5;
      const scale = Math.min(maxW / col.img.width, maxH / col.img.height);
      const drawW = col.img.width * scale;
      const drawH = col.img.height * scale;
      const drawX = colCenter - drawW / 2;
      const drawY = sigLineY - drawH - 1.0;
      pdf.addImage(col.img.dataUrl, "PNG", drawX, drawY, drawW, drawH, undefined, "FAST");
    }

    // 3. Horizontal Line (locked at exact same sigLineY across all 4 columns)
    pdf.setDrawColor(51, 65, 85);
    pdf.setLineWidth(0.4);
    pdf.line(colLeft, sigLineY, colLeft + sigColW, sigLineY);

    // 4. Signer Name
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.2);
    pdf.setTextColor(15, 23, 42);
    pdf.text(col.name, colCenter, sigNameY, { align: "center" });

    // 5. Signer Role
    pdf.setFont("courier", "italic");
    pdf.setFontSize(6.2);
    pdf.setTextColor(100, 116, 139);
    pdf.text(col.role, colCenter, sigRoleY, { align: "center" });
  });

  return pdf.output("arraybuffer");
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
