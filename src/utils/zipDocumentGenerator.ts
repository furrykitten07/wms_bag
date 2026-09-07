/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from "jszip";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { MaterialRequest, DigitalSignature } from "../types.js";

import { sanitizeSignatureUrl, createSVGSignatureDataUrl } from "./signatureUtils.js";

function getSignatureForSlot(roleOrTitle: string, name?: string, signaturesList?: DigitalSignature[]): string | null {
  const rLower = roleOrTitle.toLowerCase().trim();
  
  // USER DIRECTIVE: Kepala Gudang, Pemeriksa, and Penerima signatures MUST BE LEFT EMPTY / BLANK FOR TUG 8 AND ALL DOCUMENTS
  if (
    rLower.includes("kepala gudang") || 
    rLower.includes("kepala_gudang") ||
    rLower.includes("pemeriksa") ||
    rLower.includes("penerima") ||
    rLower.includes("carrier") ||
    rLower.includes("captain")
  ) {
    return null;
  }
  let sigs = signaturesList;
  if (!sigs || sigs.length === 0) {
    try {
      const saved = localStorage.getItem("wms_digital_signatures");
      if (saved) sigs = JSON.parse(saved);
    } catch (e) {}
  }

  const nLower = (name || "").toLowerCase().trim();

  if (nLower && !nLower.includes("...") && nLower !== "(-)") {
    const matchName = (sigs || []).find(s => s.user_name.toLowerCase().trim() === nLower);
    if (matchName) return sanitizeSignatureUrl(matchName.signature_url, name || matchName.user_name);
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

export function generateSingleTUGHTML(
  req: MaterialRequest,
  type: "tug5" | "tug6",
  signatures: DigitalSignature[]
): string {
  const docNum = req.tug5_number || req.tug6_number || req.tug_number || req.request_number || "TUG-DOC";
  const titleText = type === "tug5" 
    ? "DAFTAR PERMINTAAN BARANG-BARANG (MATERIAL UMUM)"
    : "DAFTAR PERMINTAAN BARANG-BARANG (SPAREPART)";
  const typeBadge = type === "tug5" ? "TUG 5" : "TUG 6";
  const typeDesc = type === "tug5" ? "GENERAL MATERIAL REQUEST FORM (TUG 5)" : "SPARE PARTS REQUEST FORM (TUG 6)";
  
  const todayStr = req.request_date || new Date(req.created_at || Date.now()).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  const sigManager = getSignatureForSlot("Manager Logistik", "Mohamat Emir Ferdian", signatures);
  const sigVP = getSignatureForSlot("VP RENDALHAR", "Sumbono", signatures);
  const sigGudang = getSignatureForSlot("Kepala Gudang", "Gudang Merak", signatures);
  const sigPetugasGudang = getSignatureForSlot("Petugas Gudang", "MAGHFUR MUHAMMAD ALFIN", signatures);

  const cleanAddress = (req.delivery_address || "Pelabuhan Merak, Cilegon, Banten")
    .replace(/,\s*SPK\s+[^,]+/gi, "")
    .replace(/,\s*SPK\s*.*$/gi, "")
    .trim();

  const nameColHeader = type === "tug5" ? "NAMA BARANG (DITULIS LENGKAP)" : "NAMA BARANG &amp; SPESIFIKASI / NOMOR KATALOG";
  const defaultNotes = req.spk_number || req.work_order_ref ? `Permintaan SPK ${req.spk_number || req.work_order_ref}` : "(-)";

  const itemsHtml = (!req.items || req.items.length === 0) ? `
    <tr style="border-bottom: 1px solid #cbd5e1;">
      <td style="padding: 8px; text-align: center; font-family: monospace; color: #94a3b8;">1</td>
      <td style="padding: 8px; color: #94a3b8;">(-)</td>
      <td style="padding: 8px; font-family: monospace; color: #94a3b8;">(-)</td>
      <td style="padding: 8px; text-align: center; font-family: monospace; color: #94a3b8;">(-)</td>
      <td style="padding: 8px; text-align: center; font-family: monospace; color: #94a3b8;">(-)</td>
      <td style="padding: 8px; text-align: center; font-family: monospace; color: #94a3b8;">(-)</td>
      <td style="padding: 8px; color: #64748b; font-style: italic;">NIHIL (-)</td>
    </tr>
  ` : req.items.map((item, idx) => `
    <tr style="border-bottom: 1px solid #cbd5e1; font-weight: 600; color: #0f172a;">
      <td style="padding: 8px 6px; text-align: center; font-family: monospace; color: #475569; font-size: 11px;">${idx + 1}</td>
      <td style="padding: 8px 10px; font-weight: 800; color: #0f172a; font-size: 11px;">${item.spare_part_name || "(-)"}</td>
      <td style="padding: 8px 10px; font-family: monospace; font-size: 11px; color: #334155;">${item.part_number || "(-)"}</td>
      <td style="padding: 8px 6px; text-align: center; text-transform: uppercase; font-family: monospace; font-size: 11px;">${item.unit || "(-)"}</td>
      <td style="padding: 8px 6px; text-align: center; font-family: monospace; color: #1e3a8a; font-weight: 900; font-size: 12px;">${item.requested_qty || "(-)"}</td>
      <td style="padding: 8px 6px; text-align: center; font-family: monospace; font-size: 10px; color: #334155;"></td>
      <td style="padding: 8px 10px; color: #475569; font-style: italic; font-size: 10.5px; font-weight: normal;">${item.notes || defaultNotes}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>${typeBadge} - ${docNum}</title>
    <style>
        * { box-sizing: border-box; }
        body { background-color: #ffffff; color: #1e293b; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 0; margin: 0; }
        .card { width: 100%; max-width: 794px; margin: 0 auto; background: white; padding: 20px; box-sizing: border-box; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .items-start { align-items: flex-start; }
        .items-center { align-items: center; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-mono { font-family: monospace; }
        .font-bold { font-weight: bold; }
        .font-black { font-weight: 900; }
        .uppercase { text-transform: uppercase; }
        .table-custom { width: 100%; border-collapse: collapse; margin-top: 14px; border: 1px solid #cbd5e1; }
        .table-custom th, .table-custom td { border: 1px solid #cbd5e1; font-size: 10.5px; }
        .table-custom th { background-color: #f8fafc; color: #1e293b; font-weight: bold; padding: 8px 6px; text-transform: uppercase; }
        .no-print-btn { display: flex; justify-content: center; gap: 1rem; margin-top: 2rem; }
        .btn { padding: 10px 20px; font-size: 12px; font-weight: bold; border-radius: 6px; border: none; cursor: pointer; text-transform: uppercase; }
        .btn-blue { background: #2563eb; color: white; }
    </style>
</head>
<body>
    <div class="card">
        <!-- Letterhead -->
        <div style="border-bottom: 3px double #0f172a; padding-bottom: 10px; margin-bottom: 14px;" class="flex justify-between items-start">
            <div class="flex items-center" style="gap: 12px;">
                <img src="/bag-logo.jpg" alt="BAG Logo" style="height: 48px; width: auto;" onerror="this.style.display='none'" />
                <div>
                    <h1 style="margin: 0; font-size: 15px; font-weight: bold; text-transform: uppercase; color: #0f172a;">PT. PELAYARAN BAHTERA ADHIGUNA (BAG)</h1>
                    <p style="margin: 2px 0 0 0; font-size: 8.5px; color: #64748b; font-family: monospace; line-height: 1.3;">
                        Maritime Logistics and Spares Warehouse<br>
                        Jl. Yos Sudarso No 193 Tanjung Sekong, Merak, Banten | Phone: (021) 229-099-01
                    </p>
                </div>
            </div>
            <div class="text-right">
                <span style="background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-family: monospace; font-weight: bold; border: 1px solid #cbd5e1;">WMS-SYSTEM</span>
                <p style="margin: 4px 0 0 0; font-size: 11px; font-family: monospace; color: #334155;">Ref: <strong style="color: #0f172a;">${docNum}</strong></p>
                <p style="margin: 2px 0 0 0; font-size: 9px; color: #64748b;">Date: ${todayStr}</p>
                <div style="margin-top: 4px;">
                    <span style="font-size: 11px; font-weight: 900; border: 1.5px solid #0f172a; padding: 2px 8px; border-radius: 4px; background: #ffffff; font-family: monospace; color: #0f172a;">${typeBadge}</span>
                </div>
            </div>
        </div>

        <!-- Document Title -->
        <div class="text-center" style="margin-bottom: 14px;">
            <h2 style="margin: 0; font-size: 14.5px; text-transform: uppercase; text-decoration: underline; color: #0f172a; font-weight: 800; letter-spacing: 0.2px;">${titleText}</h2>
            <p style="margin: 3px 0 0 0; font-size: 9.5px; text-transform: uppercase; font-family: monospace; color: #64748b; font-style: italic; letter-spacing: 0.5px;">${typeDesc}</p>
        </div>

        <!-- Particulars Table Box -->
        <div style="border: 1px solid #475569; border-radius: 8px; padding: 12px 14px; background: white; font-size: 10.5px; font-family: monospace; margin-bottom: 14px; text-transform: uppercase;">
            <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 14px;">
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <div><span style="color: #64748b; width: 140px; display: inline-block;">KAPAL PENERIMA :</span><strong style="color: #0f172a; font-size: 11.5px;">${req.vessel_name || "MV. KARTINI BARUNA"}</strong></div>
                    <div><span style="color: #64748b; width: 140px; display: inline-block;">FASILITAS GUDANG :</span><strong style="color: #0f172a;">MERAK WAREHOUSE</strong></div>
                    <div><span style="color: #64748b; width: 140px; display: inline-block;">ALAMAT PENGIRIMAN :</span><strong style="color: #1e293b;">${cleanAddress}</strong></div>
                    <div><span style="color: #64748b; width: 140px; display: inline-block;">PEKERJAAN (WO REF) :</span><strong style="color: #1e3a8a;">${req.work_order_ref || req.spk_number || "Daftar Permintaan / WO"}</strong></div>
                    <div><span style="color: #64748b; width: 140px; display: inline-block;">KODE AKUN :</span><strong style="color: #0f172a;">${req.account_code || "BPP"}</strong></div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px; text-align: right;">
                    <div><span style="color: #64748b; margin-right: 8px;">PEMOHON / REQUESTER :</span><strong style="color: #3730a3;">${req.requester_name || req.requested_by || "Chief Engineer"}</strong></div>
                    <div><span style="color: #64748b; margin-right: 8px;">TANGGAL PENGAJUAN :</span><strong style="color: #92400e;">${todayStr}</strong></div>
                    <div><span style="color: #64748b; margin-right: 8px;">NO. DOKUMEN TUG :</span><strong style="color: #0f172a;">${docNum}</strong></div>
                    <div><span style="color: #64748b; margin-right: 8px;">FUNGSI :</span><strong style="color: #047857;">${req.function_code || "ARMADA"}</strong></div>
                </div>
            </div>
            ${req.remarks ? `<div style="margin-top: 8px; padding: 6px 10px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 10px; font-style: italic; border-radius: 4px; text-transform: none;"><strong style="text-transform: uppercase; font-style: normal; color: #0f172a; margin-right: 6px;">CATATAN PERMINTAAN:</strong>${req.remarks}</div>` : ""}
        </div>

        <!-- Items Table -->
        <table class="table-custom">
            <thead>
                <tr>
                    <th style="width: 32px; text-align: center;">#</th>
                    <th style="text-align: left;">${nameColHeader}</th>
                    <th style="width: 140px; text-align: left;">NOMOR / PART NUMBER</th>
                    <th style="width: 48px; text-align: center;">STN</th>
                    <th style="width: 85px; text-align: center; color: #1e40af;">BANYAKNYA (DIBERIKAN)</th>
                    <th style="width: 75px; text-align: center;">NOMOR DO</th>
                    <th style="width: 150px; text-align: left;">KETERANGAN</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <!-- Perintah Kerja Box -->
        <div style="border: 1.5px solid #334155; border-radius: 6px; padding: 8px 14px; margin-top: 12px; background: #ffffff; font-size: 10.5px; font-family: monospace; display: flex; justify-content: space-between; align-items: center; text-transform: uppercase;">
            <div><span style="color: #0f172a; font-weight: bold;">PERINTAH KERJA:</span> <strong style="color: #b91c1c; margin-left: 6px;">${req.work_order_ref || req.spk_number || "(-)"}</strong></div>
            <div><span style="color: #0f172a; font-weight: bold;">KODE AKUN:</span> <strong style="color: #1e3a8a; margin-left: 6px;">${req.account_code || "BPP"}</strong></div>
            <div><span style="color: #0f172a; font-weight: bold;">FUNGSI:</span> <strong style="color: #047857; margin-left: 6px;">${req.function_code || "ARMADA"}</strong></div>
        </div>

        <!-- Disclaimer & Signatures -->
        <div class="signature-box" style="margin-top: 16px;">
            <p style="font-style: italic; color: #64748b; font-size: 8.5px; margin-bottom: 16px; font-family: monospace; line-height: 1.3;">
                Disclaimer: PT. Pelayaran Bahtera Adhiguna assumes fully audited logistics carriage parameters upon signed counter-authority signature dispatch tags. Checked physically against corrosion, salt contamination, marine class markings and full vendor structural seal integrity.
            </p>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; text-align: center; text-transform: uppercase; font-size: 9px; font-weight: bold; color: #334155; margin-top: 14px;">
                <div style="display: flex; flex-direction: column; justify-content: space-between; height: 88px;">
                    <span style="font-size: 8.5px; color: #334155; font-family: monospace;">MENGETAHUI :</span>
                    <div style="border-top: 1.5px solid #64748b; padding-top: 4px; position: relative;">
                        ${sigVP ? `<div style="position: absolute; bottom: 20px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigVP}" style="max-height: 44px; max-width: 130px; object-fit: contain;" /></div>` : ""}
                        <div style="font-weight: 900; color: #0f172a; font-size: 9.5px;">Sumbono</div>
                        <div style="font-size: 7.5px; font-family: monospace; font-weight: normal; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">VP RENDALHAR</div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; justify-content: space-between; height: 88px;">
                    <span style="font-size: 8.5px; color: #334155; font-family: monospace;">DISETUJUI OLEH :</span>
                    <div style="border-top: 1.5px solid #64748b; padding-top: 4px; position: relative;">
                        ${sigManager ? `<div style="position: absolute; bottom: 20px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigManager}" style="max-height: 44px; max-width: 130px; object-fit: contain;" /></div>` : ""}
                        <div style="font-weight: 900; color: #0f172a; font-size: 9.5px;">Mohamat Emir Ferdian</div>
                        <div style="font-size: 7.5px; font-family: monospace; font-weight: normal; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">Manager Logistik</div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; justify-content: space-between; height: 88px;">
                    <span style="font-size: 8.5px; color: #334155; font-family: monospace;">KEPALA GUDANG :</span>
                    <div style="border-top: 1.5px solid #64748b; padding-top: 4px; position: relative;">
                        ${sigGudang ? `<div style="position: absolute; bottom: 20px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigGudang}" style="max-height: 44px; max-width: 130px; object-fit: contain;" /></div>` : ""}
                        <div style="font-weight: 900; color: #0f172a; font-size: 9.5px;">&nbsp;</div>
                        <div style="font-size: 7.5px; font-family: monospace; font-weight: normal; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">Gudang Merak</div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; justify-content: space-between; height: 88px;">
                    <span style="font-size: 8.5px; color: #334155; font-family: monospace;">PETUGAS GUDANG :</span>
                    <div style="border-top: 1.5px solid #64748b; padding-top: 4px; position: relative;">
                        ${sigPetugasGudang ? `<div style="position: absolute; bottom: 20px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigPetugasGudang}" style="max-height: 44px; max-width: 130px; object-fit: contain;" /></div>` : ""}
                        <div style="font-weight: 900; color: #0f172a; font-size: 9.5px;">MAGHFUR MUHAMMAD ALFIN</div>
                        <div style="font-size: 7.5px; font-family: monospace; font-weight: normal; font-style: italic; color: #64748b; text-transform: none; margin-top: 1px;">Petugas Gudang</div>
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
    if (img.complete) return Promise.resolve();
    return new Promise<void>(resolve => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  });
  await Promise.all(promises);
}

export async function convertHtmlToPdfArrayBuffer(htmlString: string): Promise<ArrayBuffer> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.backgroundColor = "#ffffff";
  container.style.boxSizing = "border-box";
  container.innerHTML = htmlString;
  
  const noPrintBtns = container.querySelectorAll(".no-print-btn");
  noPrintBtns.forEach(btn => btn.remove());

  document.body.appendChild(container);

  try {
    await waitForImagesToLoad(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    let heightLeft = imgHeight - pdfHeight;

    while (heightLeft > 2) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
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

    const rawNum = req.tug5_number || req.tug6_number || req.tug_number || req.request_number || `REQ-${idx+1}`;
    const cleanNum = rawNum.replace(/[/\\?%*:|"<>]/g, "_").trim();
    const fileName = `${type.toUpperCase()}_REQ_${cleanNum}.pdf`;

    const htmlContent = generateSingleTUGHTML(req, type, signatures);
    const pdfBuffer = await convertHtmlToPdfArrayBuffer(htmlContent);
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
