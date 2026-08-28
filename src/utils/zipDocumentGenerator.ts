/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from "jszip";
import { MaterialRequest, DigitalSignature } from "../types.js";

function getSignatureForSlot(roleOrTitle: string, name?: string, signaturesList?: DigitalSignature[]): string | null {
  let sigs = signaturesList;
  if (!sigs || sigs.length === 0) {
    try {
      const saved = localStorage.getItem("wms_digital_signatures");
      if (saved) sigs = JSON.parse(saved);
    } catch (e) {}
  }
  if (!sigs || sigs.length === 0) return null;

  const rLower = roleOrTitle.toLowerCase().trim();
  const nLower = (name || "").toLowerCase().trim();

  if (nLower && !nLower.includes("...") && nLower !== "(-)") {
    const matchName = sigs.find(s => s.user_name.toLowerCase().trim() === nLower);
    if (matchName) return matchName.signature_url;
  }

  const matchRole = sigs.find(s => {
    const sRole = s.role_title.toLowerCase().trim();
    return sRole === rLower || sRole.includes(rLower) || rLower.includes(sRole);
  });
  if (matchRole) return matchRole.signature_url;

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
  const typeDesc = type === "tug5" ? "General Material Request Form (TUG 5)" : "Spare Parts Request Form (TUG 6)";
  
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
      <td style="padding: 8px; text-align: center; font-family: monospace; color: #64748b;">${idx + 1}</td>
      <td style="padding: 8px; font-weight: 900; color: #0f172a;">${item.spare_part_name || "(-)"}</td>
      <td style="padding: 8px; font-family: monospace; font-size: 11px; color: #334155;">${item.part_number || "(-)"}</td>
      <td style="padding: 8px; text-align: center; text-transform: uppercase; font-family: monospace; font-size: 11px;">${item.unit || "(-)"}</td>
      <td style="padding: 8px; text-align: center; font-family: monospace; color: #1e3a8a; font-weight: 900; font-size: 12px;">${item.requested_qty || "(-)"}</td>
      <td style="padding: 8px; text-align: center; font-family: monospace; font-size: 10px; color: #334155;"></td>
      <td style="padding: 8px; color: #475569; font-style: italic; font-size: 11px; font-weight: normal;">${item.notes || "(-)"}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>${typeBadge} - ${docNum}</title>
    <style>
        @page { size: A4 portrait; margin: 8mm 10mm; }
        body { background-color: #f8fafc; color: #1e293b; font-family: ui-sans-serif, system-ui, sans-serif; padding: 1.5rem 1rem; margin: 0; }
        .card { max-width: 900px; margin: 0 auto; background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 2rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
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
        .table-custom { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        .table-custom th, .table-custom td { border: 1px solid #cbd5e1; font-size: 11px; }
        .table-custom th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; padding: 8px; }
        .no-print-btn { display: flex; justify-content: center; gap: 1rem; margin-top: 2rem; }
        .btn { padding: 10px 20px; font-size: 12px; font-weight: bold; border-radius: 6px; border: none; cursor: pointer; text-transform: uppercase; }
        .btn-blue { background: #2563eb; color: white; }
        @media print {
            .no-print-btn { display: none !important; }
            body { padding: 0; background: white; }
            .card { border: none; box-shadow: none; padding: 0; max-width: 100%; }
            tr { page-break-inside: avoid; }
            .signature-box { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="card">
        <!-- Letterhead -->
        <div style="border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 14px;" class="flex justify-between items-start">
            <div class="flex items-center" style="gap: 12px;">
                <img src="/bag-logo.jpg" alt="BAG Logo" style="height: 50px; width: auto;" onerror="this.style.display='none'" />
                <div>
                    <h1 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase; color: #0f172a;">PT. PELAYARAN BAHTERA ADHIGUNA (BAG)</h1>
                    <p style="margin: 2px 0 0 0; font-size: 9px; color: #64748b; font-family: monospace;">
                        Maritime Logistics and Spares Warehouse<br>
                        Jl. Yos Sudarso No 193 Tanjung Sekong, Merak, Banten | Phone: (021) 229-099-01
                    </p>
                </div>
            </div>
            <div class="text-right">
                <span style="background: #0f172a; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-family: monospace; font-weight: bold;">WMS-SYSTEM</span>
                <p style="margin: 4px 0 0 0; font-size: 11px; font-family: monospace; color: #334155;">Ref: <strong style="color: #0f172a;">${docNum}</strong></p>
                <p style="margin: 2px 0 0 0; font-size: 9px; color: #64748b;">Date: ${todayStr}</p>
                <div style="margin-top: 4px;">
                    <span style="font-size: 11px; font-weight: 900; border: 1px solid #0f172a; padding: 2px 8px; border-radius: 4px; background: #f8fafc; font-family: monospace;">${typeBadge}</span>
                </div>
            </div>
        </div>

        <!-- Document Title -->
        <div class="text-center" style="margin-bottom: 14px;">
            <h2 style="margin: 0; font-size: 15px; text-transform: uppercase; text-decoration: underline; color: #0f172a; font-weight: bold;">${titleText}</h2>
            <p style="margin: 4px 0 0 0; font-size: 10px; text-transform: uppercase; font-family: monospace; color: #64748b; font-style: italic;">${typeDesc}</p>
        </div>

        <!-- Particulars Table -->
        <div style="border: 1px solid #0f172a; border-radius: 8px; padding: 12px; background: white; font-size: 11px; font-family: monospace; margin-bottom: 16px; text-transform: uppercase;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <div><span style="color: #64748b; width: 130px; display: inline-block;">KAPAL PENERIMA :</span><strong style="color: #0f172a; font-size: 13px;">${req.vessel_name || "MV. KARTINI BARUNA"}</strong></div>
                    <div><span style="color: #64748b; width: 130px; display: inline-block;">FASILITAS GUDANG :</span><strong style="color: #0f172a;">MERAK WAREHOUSE</strong></div>
                    <div><span style="color: #64748b; width: 130px; display: inline-block;">ALAMAT PENGIRIMAN :</span><strong style="color: #1e293b;">${cleanAddress}</strong></div>
                    <div><span style="color: #64748b; width: 130px; display: inline-block;">PEKERJAAN (WO REF) :</span><strong style="color: #1e3a8a;">${req.work_order_ref || req.spk_number || "Daftar Permintaan / WO"}</strong></div>
                    <div><span style="color: #64748b; width: 130px; display: inline-block;">KODE AKUN :</span><strong style="color: #0f172a;">${req.account_code || "BPP"}</strong></div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px; text-align: right;">
                    <div><span style="color: #64748b; margin-right: 8px;">PEMOHON / REQUESTER :</span><strong style="color: #3730a3;">${req.requester_name || req.requested_by || "Chief Engineer"}</strong></div>
                    <div><span style="color: #64748b; margin-right: 8px;">TANGGAL PENGAJUAN :</span><strong style="color: #92400e;">${todayStr}</strong></div>
                    <div><span style="color: #64748b; margin-right: 8px;">NO. DOKUMEN TUG :</span><strong style="color: #0f172a;">${docNum}</strong></div>
                    <div><span style="color: #64748b; margin-right: 8px;">FUNGSI :</span><strong style="color: #0f172a;">${req.function_code || "ARMADA"}</strong></div>
                </div>
            </div>
            ${req.remarks ? `<div style="margin-top: 8px; padding: 6px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 10px; font-style: italic; border-radius: 4px; text-transform: none;"><strong style="text-transform: uppercase; font-style: normal; color: #0f172a; margin-right: 6px;">Catatan Tambahan:</strong>${req.remarks}</div>` : ""}
        </div>

        <!-- Items Table -->
        <table class="table-custom">
            <thead>
                <tr>
                    <th style="width: 35px; text-align: center;">NO</th>
                    <th style="text-align: left;">NAMA BARANG &amp; SPESIFIKASI / NOMOR KATALOG</th>
                    <th style="width: 130px; text-align: center;">PART NUMBER</th>
                    <th style="width: 60px; text-align: center;">SATUAN</th>
                    <th style="width: 80px; text-align: center;">BANYAKNYA</th>
                    <th style="width: 90px; text-align: center;">PARAF PETUGAS</th>
                    <th style="width: 140px; text-align: left;">KETERANGAN</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <!-- Disclaimer & Signatures -->
        <div class="signature-box" style="margin-top: 24px;">
            <p style="font-style: italic; color: #64748b; font-size: 9px; margin-bottom: 24px;">
                Disclaimer: PT. Pelayaran Bahtera Adhiguna assumes fully audited logistics carriage parameters upon signed counter-authority signature dispatch tags. Checked physically against corrosion, salt contamination, marine class markings and full vendor structural seal integrity.
            </p>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; text-align: center; text-transform: uppercase; font-size: 9px; font-weight: bold; color: #334155;">
                <div style="display: flex; flex-direction: column; justify-content: space-between; height: 90px;">
                    <span>MENGETAHUI :</span>
                    <div style="border-top: 1px solid #94a3b8; padding-top: 4px; position: relative;">
                        ${sigVP ? `<div style="position: absolute; bottom: 18px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigVP}" style="max-height: 45px; max-width: 130px; object-fit: contain; mix-blend-mode: multiply;" /></div>` : ""}
                        <div style="font-weight: 900; color: #0f172a;">Sumbono</div>
                        <div style="font-size: 8px; font-family: monospace; font-weight: normal; font-style: italic; color: #64748b;">VP RENDALHAR</div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; justify-content: space-between; height: 90px;">
                    <span>Disetujui oleh :</span>
                    <div style="border-top: 1px solid #94a3b8; padding-top: 4px; position: relative;">
                        ${sigManager ? `<div style="position: absolute; bottom: 18px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigManager}" style="max-height: 45px; max-width: 130px; object-fit: contain; mix-blend-mode: multiply;" /></div>` : ""}
                        <div style="font-weight: 900; color: #0f172a;">Mohamat Emir Ferdian</div>
                        <div style="font-size: 8px; font-family: monospace; font-weight: normal; font-style: italic; color: #64748b; text-transform: none;">Manager Logistik</div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; justify-content: space-between; height: 90px;">
                    <span>Kepala Gudang :</span>
                    <div style="border-top: 1px solid #94a3b8; padding-top: 4px; position: relative;">
                        ${sigGudang ? `<div style="position: absolute; bottom: 18px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigGudang}" style="max-height: 45px; max-width: 130px; object-fit: contain; mix-blend-mode: multiply;" /></div>` : ""}
                        <div style="font-weight: 900; color: #0f172a;">&nbsp;</div>
                        <div style="font-size: 8px; font-family: monospace; font-weight: normal; font-style: italic; color: #64748b; text-transform: none;">Gudang Merak</div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; justify-content: space-between; height: 90px;">
                    <span>Petugas Gudang :</span>
                    <div style="border-top: 1px solid #94a3b8; padding-top: 4px; position: relative;">
                        ${sigPetugasGudang ? `<div style="position: absolute; bottom: 18px; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none;"><img src="${sigPetugasGudang}" style="max-height: 45px; max-width: 130px; object-fit: contain; mix-blend-mode: multiply;" /></div>` : ""}
                        <div style="font-weight: 900; color: #0f172a;">MAGHFUR MUHAMMAD ALFIN</div>
                        <div style="font-size: 8px; font-family: monospace; font-weight: normal; font-style: italic; color: #64748b; text-transform: none;">Petugas Gudang</div>
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

export async function downloadTUGZipArchive(
  requests: MaterialRequest[],
  type: "tug5" | "tug6",
  startDate: string,
  endDate: string,
  signatures: DigitalSignature[]
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
  const folderName = `${type.toUpperCase()}_Dokumen_Batch`;
  const folder = zip.folder(folderName) || zip;

  filtered.forEach((req, idx) => {
    const rawNum = req.tug5_number || req.tug6_number || req.tug_number || req.request_number || `REQ-${idx+1}`;
    const cleanNum = rawNum.replace(/[/\\?%*:|"<>]/g, "_").trim();
    const fileName = `${type.toUpperCase()}_REQ_${cleanNum}.html`;

    const htmlContent = generateSingleTUGHTML(req, type, signatures);
    folder.file(fileName, htmlContent);
  });

  const content = await zip.generateAsync({ type: "blob" });
  const startLabel = startDate || "Awal";
  const endLabel = endDate || "Akhir";
  const zipFileName = `${type.toUpperCase()}_BATCH_${startLabel}_sd_${endLabel}.zip`;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(content);
  link.download = zipFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { count: filtered.length, filename: zipFileName };
}
