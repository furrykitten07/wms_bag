/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Printer, X, Shield, Anchor, CheckCircle, FileDown, ChevronLeft, ChevronRight } from "lucide-react";
import { OutboundDispatch, SparePart, InboundReceiving, SPKWorkOrder, DigitalSignature } from "../types.js";
import { api } from "../api.js";

interface PrintDocumentProps {
  type: "bon" | "surat_jalan" | "manifest" | "stock_report" | "mutation_report" | "spk_report" | "tug5" | "tug6" | "tug10";
  data?: OutboundDispatch | InboundReceiving | any;
  inventoryList?: SparePart[];
  mutationList?: any[];
  stats?: any;
  timeFilter?: string;
  spkList?: SPKWorkOrder[];
  signatures?: DigitalSignature[];
  onClose: () => void;
}

const getSignatureForSlot = (roleOrTitle: string, name?: string, signaturesList?: DigitalSignature[], docData?: any) => {
  if (docData) {
    const rLower = roleOrTitle.toLowerCase().trim();
    if (rLower.includes("vp") || rLower.includes("sumbono")) {
      if (docData.sumbono_signed && docData.sumbono_signature_url) return docData.sumbono_signature_url;
    }
    if (rLower.includes("manager") || rLower.includes("emir")) {
      if (docData.emir_signed && docData.emir_signature_url) return docData.emir_signature_url;
    }
    if (rLower.includes("verifikator") || rLower.includes("petugas") || rLower.includes("alfin")) {
      if (docData.alfin_signed && docData.alfin_signature_url) return docData.alfin_signature_url;
    }
  }

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
};

export default function PrintDocument({
  type,
  data,
  inventoryList,
  mutationList,
  stats,
  timeFilter,
  spkList,
  signatures,
  onClose
}: PrintDocumentProps) {
  // Pagination & Print Mode State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Automatically switch to full list rendering when native browser print (Ctrl+P / print dialog) triggers
  React.useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const rawActiveList = useMemo(() => {
    if (type === "stock_report") return inventoryList || [];
    if (type === "mutation_report") return mutationList || [];
    return data?.items || [];
  }, [type, inventoryList, mutationList, data]);

  const totalItems = rawActiveList.length;
  const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) || 1 : 1;

  // If currently printing or pageSize is 0, render ALL items so all pages print on paper/PDF!
  const paginatedList = useMemo(() => {
    if (isPrinting || pageSize <= 0) return rawActiveList;
    const start = (currentPage - 1) * pageSize;
    return rawActiveList.slice(start, start + pageSize);
  }, [rawActiveList, currentPage, pageSize, isPrinting]);

  // Consolidate mutation items by Reference Number (so reference numbers are not repeated per row)
  const groupedMutationList = useMemo(() => {
    const list = isPrinting || pageSize <= 0 ? rawActiveList : paginatedList;

    if (!list || list.length === 0) {
      return [{
        reference_number: "(-)",
        transaction_date: new Date().toISOString(),
        transaction_type: "NIHIL",
        created_by: "(-)",
        remarks: "NIHIL / TIDAK ADA TRANSAKSI LOGISTIK PADA PERIODE TANGGAL INI (-)",
        total_in: 0,
        total_out: 0,
        items: [{
          id: "empty-row",
          spare_part_name: "(-)",
          part_number: "(-)",
          qty_in: 0,
          qty_out: 0,
          remarks: "NIHIL / TIDAK ADA TRANSAKSI MUTASI PADA PERIODE TANGGAL INI (-)"
        }]
      }];
    }

    const groups: {
      [ref: string]: {
        reference_number: string;
        transaction_date: string;
        transaction_type: string;
        created_by: string;
        remarks: string;
        total_in: number;
        total_out: number;
        items: any[];
      }
    } = {};

    list.forEach((item: any) => {
      const ref = item.reference_number || "(-)";
      if (!groups[ref]) {
        groups[ref] = {
          reference_number: ref,
          transaction_date: item.transaction_date || new Date().toISOString(),
          transaction_type: item.transaction_type || "(-)",
          created_by: item.created_by || "(-)",
          remarks: item.remarks || "(-)",
          total_in: 0,
          total_out: 0,
          items: []
        };
      }
      groups[ref].items.push(item);
      groups[ref].total_in += (item.qty_in || 0);
      groups[ref].total_out += (item.qty_out || 0);
    });

    return Object.values(groups);
  }, [rawActiveList, paginatedList, isPrinting, pageSize]);

  const printDoc = () => {
    // Render full list for printing
    setIsPrinting(true);
    
    const handleAfterPrint = () => {
      setIsPrinting(false);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
    window.addEventListener("afterprint", handleAfterPrint);

    setTimeout(() => {
      window.focus();
      window.print();
      setTimeout(() => setIsPrinting(false), 2000);
    }, 250);

    if (type === "bon" && data && data.id) {
      api.logDispatchAction(data.id, "Printed").catch(e => console.error(e));
    } else if (type === "tug5" && data && data.id) {
      api.logMaterialRequestAction(data.id, "Printed").catch(e => console.error(e));
    } else if (type === "tug6" && data && data.id) {
      api.logMaterialRequestTUG6Action(data.id, "Printed").catch(e => console.error(e));
    } else if (type === "tug10" && data && data.id) {
      api.logMaterialReturnAction(data.id, "Printed").catch(e => console.error(e));
    }
  };

  const downloadInteractiveHTML = () => {
    setIsPrinting(true);
    setTimeout(() => {
      const printableElement = document.getElementById("printable-area");
      if (!printableElement) {
        setIsPrinting(false);
        return;
      }

      const contentHtml = printableElement.innerHTML;
      const documentTitle = type === "tug5" ? "TUG 5 - Permintaan Barang" : type === "tug6" ? "TUG 6 - Permintaan Barang" : type === "tug10" ? "TUG 10 - Bon Pengembalian" : "WMS Dokumen";

      const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>${documentTitle}</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @page {
            size: A4 portrait;
            margin: 8mm 10mm;
        }
        body {
            background-color: #f8fafc;
            color: #1e293b;
            font-family: ui-sans-serif, system-ui, sans-serif;
            padding: 1.5rem 1rem;
        }
        table { width: 100% !important; border-collapse: collapse !important; }
        th, td { padding: 4px 6px !important; }
        @media print {
            .no-print { display: none !important; }
            body, html { padding: 0 !important; margin: 0 !important; background-color: white !important; height: auto !important; overflow: visible !important; }
            .print-card-wrapper { border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
            tr { page-break-inside: avoid !important; break-inside: avoid !important; }
            .no-print-break, .signature-container { page-break-inside: avoid !important; break-inside: avoid !important; display: block !important; }
        }
    </style>
</head>
<body>
    <div class="print-card-wrapper max-w-4xl mx-auto bg-white border border-slate-200 p-10 rounded-xl shadow-md">
        ${contentHtml}
    </div>
    
    <div class="no-print flex justify-center gap-4 mt-8 pb-12">
        <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-lg shadow-md transition-all cursor-pointer">
            🖨️ Cetak / Simpan PDF Sekarang
        </button>
        <button onclick="window.close()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-lg transition-all cursor-pointer">
            ❌ Tutup Halaman
        </button>
    </div>

    <script>
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                window.focus();
                window.print();
            }, 600);
        });
    </script>
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cleanNum = (data?.request_number || data?.bon_pengeluaran_number || data?.id || "doc").replace(/\//g, "_");
      link.download = `CETAK_${type.toUpperCase()}_${cleanNum}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsPrinting(false);
    }, 150);

    if (type === "bon" && data && data.id) {
      api.logDispatchAction(data.id, "Downloaded").catch(e => console.error(e));
    } else if (type === "tug5" && data && data.id) {
      api.logMaterialRequestAction(data.id, "Downloaded").catch(e => console.error(e));
    } else if (type === "tug10" && data && data.id) {
      api.logMaterialReturnAction(data.id, "Downloaded").catch(e => console.error(e));
    }
  };

  const downloadDoc = () => {
    const textContent = document.getElementById("printable-area")?.innerText || "";
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `TUG8_${data?.bon_pengeluaran_number || data?.id || "doc"}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (type === "bon" && data && data.id) {
      api.logDispatchAction(data.id, "Downloaded").catch(e => console.error(e));
    }
  };

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const safeFormatDate = (dateVal?: any, fallback: string = "-") => {
    if (!dateVal) return fallback;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("id-ID");
  };

  // Cast data as any inside template properties safely to access union attributes
  const docData = (data || {}) as any;

  // Stable price calculation for IDR matching layout
  const getPartIDRPrice = (partNumber: string = "") => {
    let hash = 0;
    const cleanNum = partNumber || "";
    for (let i = 0; i < cleanNum.length; i++) {
      hash = cleanNum.charCodeAt(i) + ((hash << 5) - hash);
    }
    const pricingOptions = [125000, 250000, 475000, 850000, 1200000, 2450000, 4200000, 7800000];
    const selectedPrice = pricingOptions[Math.abs(hash) % pricingOptions.length];
    return selectedPrice;
  };

  let grandTotalIDR = 0;
  if (type === "bon" && data?.items) {
    data.items.forEach((item: any) => {
      const price = item.unit_price !== undefined ? Number(item.unit_price) : 0;
      const qty = item.qty_dispatched || 0;
      grandTotalIDR += price * qty;
    });
  }

  // Unique document numbers based on randomized details if not explicitly available
  const docNum = (docData && Object.keys(docData).length > 0)
    ? (type === "bon" ? docData.bon_pengeluaran_number || "BPB-2026-00892"
      : type === "surat_jalan" ? docData.surat_jalan_number || "SJL-2026-0518"
        : type === "tug10" ? docData.return_number || "RET-2026-001"
          : docData.manifest_number || "MNF-2026-22119")
    : `DOC-WMS-2026-${Math.floor(Math.random() * 90000) + 10000}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto print:static print:inset-auto print:bg-transparent print:p-0 print:overflow-visible print-document-overlay">
      <div className="bg-white text-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] print:max-h-none print:h-auto print:overflow-visible print:border-none print:shadow-none print:w-full print:max-w-full flex flex-col my-auto border border-slate-200 overflow-hidden">

        {/* Header toolbar - hidden on physical print */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-3 border-b border-slate-800 no-print">
          <div className="flex items-center gap-2">
            <Anchor className="text-blue-400 w-5 h-5 shrink-0" />
            <div>
              <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-white">
                Pratinjau Dokumen Logistik — {
                  type === "bon" ? "Bon Pengeluaran Barang (TUG 8)"
                    : type === "surat_jalan" ? "Surat Jalan (Outbound)"
                      : type === "manifest" ? "Cargo Manifest"
                        : type === "stock_report" ? "Laporan Stok Suku Cadang"
                          : type === "mutation_report" ? "Laporan Mutasi Keluar Masuk Barang"
                            : type === "tug5" ? "Daftar Permintaan Barang-Barang (Material Umum)"
                              : type === "tug6" ? "Daftar Permintaan Barang-Barang (Sparepart)"
                                : "Bon Pengembalian Barang-Barang (TUG 10)"
                }
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                PT. Pelayaran Bahtera Adhiguna &bull; Total {totalItems} Record Barang
              </span>
            </div>
          </div>

          {/* Controls: Pagination + Print Actions */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Pagination Controls for Reports */}
            {(type === "mutation_report" || type === "stock_report") && totalItems > 0 && (
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono">
                <span className="text-slate-400 text-[11px]">Tampilkan:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-900 text-white border border-slate-700 rounded px-2 py-0.5 text-xs focus:outline-none cursor-pointer"
                >
                  <option value={10}>10 / Hal</option>
                  <option value={15}>15 / Hal</option>
                  <option value={25}>25 / Hal</option>
                  <option value={50}>50 / Hal</option>
                  <option value={0}>Semua ({totalItems} Cetak Utuh)</option>
                </select>

                {pageSize > 0 && totalPages > 1 && (
                  <div className="flex items-center gap-1.5 ml-2 border-l border-slate-700 pl-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      ← Prev
                    </button>
                    <span className="text-blue-300 font-bold text-[11px] px-1">
                      {currentPage}/{totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={downloadInteractiveHTML}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase px-3.5 py-1.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
              title="Download dokumen cetak interaktif PDF/HTML"
            >
              <FileDown className="w-4 h-4 text-white" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={printDoc}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase px-3.5 py-1.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Cetak Sekarang</span>
            </button>

            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors text-slate-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Form Content Area (Styled like crisp A4 sheet) */}
        <div className="p-3 sm:p-5 flex-1 overflow-y-auto print:p-0 print:overflow-visible print:h-auto print:max-h-none print-card bg-slate-100/50 print:bg-white" id="printable-area">
          <div className="max-w-4xl mx-auto bg-white border border-slate-300 shadow-xl rounded-xs p-4 sm:p-6 md:p-8 print:p-0 print:border-none print:shadow-none print:bg-white print:max-w-full print:w-full print:overflow-visible">
            <div className="flex-1">

              {/* Company Official Letterhead Header */}
              <div className="border-b-2 border-double border-slate-900 pb-3 mb-3.5 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <img src="/bag-logo.jpg" alt="BAG Logo" className="h-12 md:h-14 w-auto object-contain shrink-0" />
                  <div>
                    <h1 className="font-display font-bold text-base md:text-lg leading-tight uppercase tracking-tight text-slate-955">PT. PELAYARAN BAHTERA ADHIGUNA (BAG)</h1>
                    <p className="text-[9px] md:text-[10px] text-slate-500 font-mono leading-relaxed">
                      Maritime Logistics and Spares Warehouse<br />
                      Jl. Yos Sudarso No 193 Tanjung Sekong, Merak, Banten<br />
                      Phone: (021) 229-099-01
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-mono font-bold tracking-wider">WMS-SYSTEM</span>
                  <p className="text-[11px] font-mono mt-1 text-slate-700">Ref: <span className="font-bold text-slate-955">{(type === "tug5" || type === "tug6") ? (docData?.tug5_number || docData?.tug6_number || docData?.request_number || docNum) : docNum}</span></p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Date: {todayStr}</p>
                  {(type === "mutation_report" || type === "tug10" || type === "bon" || type === "tug5" || type === "tug6") && (
                    <div className="mt-1 flex justify-end">
                      <div className="text-xs font-black border border-slate-900 px-2 py-0.5 rounded inline-block bg-slate-50 text-slate-900 font-mono tracking-wider">
                        {type === "mutation_report" ? "TUG 11" : type === "tug10" ? "TUG 10" : type === "tug5" ? "TUG 5" : type === "tug6" ? "TUG 6" : "TUG 8"}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Title */}
              <div className="text-center mb-3.5">
                <h2 className="font-display font-bold text-base uppercase tracking-widest text-slate-900 underline underline-offset-4">
                  {type === "surat_jalan" && "SURAT JALAN / DELIVERY NOTE"}
                  {type === "manifest" && "VESSEL CARGO MANIFEST"}
                  {type === "stock_report" && "LAPORAN MONITORING STOK WAREHOUSE"}
                  {type === "mutation_report" && "DAFTAR MUTASI HARIAN"}
                  {type === "tug5" && "DAFTAR PERMINTAAN BARANG-BARANG (MATERIAL UMUM)"}
                  {type === "tug6" && "DAFTAR PERMINTAAN BARANG-BARANG (SPAREPART)"}
                  {type === "tug10" && "BON PENGEMBALIAN"}
                  {type === "bon" && "BON PENGELUARAN BARANG-BARANG / SPARE PART"}
                </h2>
                <p className="text-[10px] uppercase font-mono tracking-wider italic text-slate-500 mt-1">
                  {type === "surat_jalan" && "Goods Dispatch & Delivery Transit slip"}
                  {type === "manifest" && "Consignment Cargo Port declaration list"}
                  {type === "stock_report" && "Official inventory audit state snapshot"}
                  {type === "mutation_report" && `WAREHOUSE GOODS MOVEMENT & FLOW AUDIT LEDGER (${timeFilter || "Default filter"})`}
                  {type === "tug5" && "General Material Request Form (TUG 5)"}
                  {type === "tug6" && "Spare Parts Request Form (TUG 6)"}
                  {type === "tug10" && "Material / Spare Parts Return Form (TUG 10)"}
                  {type === "bon" && "Material / Spare Parts Issue Form (TUG 8)"}
                </p>
              </div>

              {/* Information Block: Warehouse/Vessel particulars */}
              {type === "mutation_report" ? (
                <div className="grid grid-cols-2 gap-6 border-2 border-slate-900 p-3 rounded text-xs mb-4 relative">
                  <div className="space-y-1 font-mono text-[11px] leading-normal z-10 font-bold uppercase">
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500 text-[9px]">Fasilitas Gudang:</span>
                      <span className="col-span-2 text-slate-900 font-extrabold">WAREHOUSE MERAK (WH-MERAK)</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500 text-[9px]">Periode Laporan:</span>
                      <span className="col-span-2 text-blue-900 font-extrabold">{timeFilter || "Semua Periode Transaksi"}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500 text-[9px]">Status Audit:</span>
                      <span className="col-span-2 text-emerald-800 font-black">AUDITED & VERIFIED LIVE LEDGER</span>
                    </div>
                  </div>
                  <div>
                    {/* Visual balance spacer */}
                  </div>
                </div>
              ) : type === "bon" ? (
                <div className="border border-slate-900 rounded-lg p-3 bg-white text-xs mb-6 font-mono leading-relaxed uppercase">
                  <div className="grid grid-cols-2 gap-4 text-[10px]">
                    <div className="space-y-1.5">
                      <div className="flex">
                        <span className="w-32 text-slate-500 shrink-0">DIKIRIM KEPADA :</span>
                        <strong className="text-slate-900 font-bold">{docData.vessel_name || "MV. KARTINI BARUNA"}</strong>
                      </div>
                      <div className="flex">
                        <span className="w-32 text-slate-500 shrink-0">GUDANG PENGIRIM :</span>
                        <strong className="text-slate-900">{docData.warehouse_name || "GUDANG MERAK CENTRAL"}</strong>
                      </div>
                      <div className="flex">
                        <span className="w-32 text-slate-500 shrink-0">MENURUT (REF) :</span>
                        <strong className="text-blue-900 font-mono font-bold">{docData.request_reference || docData.work_order_ref || "Daftar Permintaan / WO"}</strong>
                      </div>
                      <div className="flex">
                        <span className="w-32 text-slate-500 shrink-0">KODE AKUN :</span>
                        <strong className="text-slate-900">{docData.account_code || "BPP"}</strong>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-right">
                      <div className="flex justify-end">
                        <span className="text-slate-500 mr-2">TANGGAL PENGIRIMAN :</span>
                        <strong className="text-slate-900 font-mono">{safeFormatDate(docData.dispatch_date, todayStr)}</strong>
                      </div>
                      <div className="flex justify-end">
                        <span className="text-slate-500 mr-2">EKSPEDISI / DRIVER :</span>
                        <strong className="text-slate-900 font-sans">{docData.courier_name || docData.driver_pic || "INTERNAL CARGO TRANSIT"}</strong>
                      </div>
                      <div className="flex justify-end">
                        <span className="text-slate-500 mr-2">PERINTAH KERJA (WO) :</span>
                        <strong className="text-slate-900 font-mono">{docData.work_order_ref || "WO-MECH-99"}</strong>
                      </div>
                      <div className="flex justify-end">
                        <span className="text-slate-500 mr-2">FUNGSI :</span>
                        <strong className="text-slate-900">{docData.function_code || "ARMADA"}</strong>
                      </div>
                    </div>
                  </div>

                  {docData.notes && (
                    <div className="mt-3 p-1.5 bg-slate-50 border border-slate-300 font-sans text-[10px] text-slate-650 rounded italic lowercase">
                      <strong className="uppercase not-italic text-[9px] text-slate-800 font-bold font-mono mr-2">Catatan Pengiriman:</strong>
                      {docData.notes}
                    </div>
                  )}
                </div>
              ) : type === "tug10" ? (
                <div className="border border-slate-900 rounded-lg p-3 bg-white text-xs mb-6 font-mono leading-relaxed uppercase">
                  <div className="grid grid-cols-2 gap-4 text-[10px]">
                    <div className="space-y-1.5">
                      <div className="flex">
                        <span className="w-28 text-slate-500 shrink-0">NAMA GUDANG / KAPAL :</span>
                        <strong className="text-slate-900">{docData.warehouse_name || "GUDANG UTAMA"} / {docData.vessel_name || "-"}</strong>
                      </div>
                      <div className="flex">
                        <span className="w-28 text-slate-500 shrink-0">PEKERJAAN (WO REF) :</span>
                        <strong className="text-slate-900 font-bold">
                          {(!docData.work_order_ref || docData.work_order_ref === "NP")
                            ? "SPAREPART PEMELIHARAAN / SPAREPART DOCKING / RUNNING STORE / CONSUMABLE"
                            : docData.work_order_ref}
                        </strong>
                      </div>
                      <div className="flex">
                        <span className="w-28 text-slate-500 shrink-0">KODE AKUN :</span>
                        <strong className="text-slate-900">{docData.account_code || "BPP"}</strong>
                      </div>
                      <div className="flex">
                        <span className="w-28 text-slate-500 shrink-0">AKUN PEMBEBANAN :</span>
                        <strong className="text-slate-900">BYMHD</strong>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <div className="flex justify-end">
                        <span className="text-slate-500 mr-2">NO. P.P. / SPK REF :</span>
                        <strong className="text-indigo-800 font-mono">{docData.spk_number || "NP"}</strong>
                      </div>
                      <div className="flex justify-end">
                        <span className="text-slate-500 mr-2">DISPATCH REF (TUG 8) :</span>
                        <strong className="text-amber-800">{docData.dispatch_reference || "NP"}</strong>
                      </div>
                      <div className="flex justify-end">
                        <span className="text-slate-500 mr-2">FUNGSI :</span>
                        <strong className="text-slate-900">{docData.function_code || "ARMADA"}</strong>
                      </div>
                    </div>
                  </div>

                  {docData.return_reason && (
                    <div className="mt-3 p-1.5 bg-slate-50 border border-slate-300 font-sans text-[10px] text-slate-650 rounded italic lowercase">
                      <strong className="uppercase not-italic text-[9px] text-slate-800 font-bold font-mono mr-2">Alasan Pengembalian:</strong>
                      {docData.return_reason}
                    </div>
                  )}
                </div>
              ) : (type === "tug5" || type === "tug6") && data ? (
                <div className="border border-slate-900 rounded-lg p-3 bg-white text-xs mb-6 font-mono leading-relaxed uppercase">
                  <div className="grid grid-cols-2 gap-4 text-[10px]">
                    <div className="space-y-1.5">
                      <div className="flex">
                        <span className="w-32 text-slate-500 shrink-0">KAPAL PENERIMA :</span>
                        <strong className="text-slate-955 font-black text-sm">{docData.vessel_name || "MV. KARTINI BARUNA"}</strong>
                      </div>
                      <div className="flex">
                        <span className="w-32 text-slate-500 shrink-0">FASILITAS GUDANG :</span>
                        <strong className="text-slate-900">MERAK WAREHOUSE</strong>
                      </div>
                      <div className="flex">
                        <span className="w-32 text-slate-500 shrink-0">ALAMAT PENGIRIMAN :</span>
                        <strong className="text-slate-800">
                          {(docData.delivery_address || "Pelabuhan Merak, Cilegon, Banten")
                            .replace(/,\s*SPK\s+[^,]+/gi, "")
                            .replace(/,\s*SPK\s*.*$/gi, "")
                            .trim()}
                        </strong>
                      </div>
                      <div className="flex">
                        <span className="w-32 text-slate-500 shrink-0">PEKERJAAN (WO REF) :</span>
                        <strong className="text-blue-900 font-mono font-bold">{docData.work_order_ref || docData.spk_number || "Daftar Permintaan / WO"}</strong>
                      </div>
                      <div className="flex">
                        <span className="w-32 text-slate-500 shrink-0">KODE AKUN :</span>
                        <strong className="text-slate-900">{docData.account_code || "BPP"}</strong>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-right">
                      <div className="flex justify-end">
                        <span className="text-slate-500 mr-2">PEMOHON / REQUESTER :</span>
                        <strong className="text-indigo-800 font-mono font-bold">{docData.requester_name || docData.requested_by || "Chief Engineer"}</strong>
                      </div>
                      <div className="flex justify-end">
                        <span className="text-slate-500 mr-2">TANGGAL PENGAJUAN :</span>
                        <strong className="text-amber-800 font-bold">{safeFormatDate(docData.request_date, todayStr)}</strong>
                      </div>
                      <div className="flex justify-end">
                        <span className="text-slate-500 mr-2">NO. DOKUMEN TUG :</span>
                        <strong className="text-slate-900 font-mono font-bold">{docData.tug5_number || docData.tug6_number || docData.request_number}</strong>
                      </div>
                      <div className="flex justify-end">
                        <span className="text-slate-500 mr-2">FUNGSI :</span>
                        <strong className="text-slate-900">{docData.function_code || "ARMADA"}</strong>
                      </div>
                    </div>
                  </div>

                  {docData.remarks && (
                    <div className="mt-3 p-1.5 bg-slate-50 border border-slate-300 font-sans text-[10px] text-slate-650 rounded italic lowercase">
                      <strong className="uppercase not-italic text-[9px] text-slate-800 font-bold font-mono mr-2">Catatan Permintaan:</strong>
                      {docData.remarks}
                    </div>
                  )}
                </div>
              ) : type !== "stock_report" && type !== "spk_report" && data ? (
                <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-200 p-4 rounded text-xs mb-6">
                  <div className="space-y-1 font-medium">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sender Particulars</p>
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500">Facility Depot:</span>
                      <span className="col-span-2 text-slate-900 font-bold">Gudang Merak Central Warehouse</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500">Dispatch Coordinator:</span>
                      <span className="col-span-2 text-slate-900">{docData.created_by || "Budi Santoso"}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500">Request Ref:</span>
                      <span className="col-span-2 font-mono text-blue-600 font-semibold">{docData.request_reference || docData.purchase_order_num}</span>
                    </div>
                  </div>

                  <div className="space-y-1 font-medium">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Recipient Details</p>
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500">Target Vessel:</span>
                      <span className="col-span-2 text-slate-900 font-bold">{docData.vessel_name || "Pelabuhan Merak Depot Storage"}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500">Consignee Agent:</span>
                      <span className="col-span-2 text-slate-900">{docData.consignee || "Inbound Check-in verification slip"}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500">Courier / Method:</span>
                      <span className="col-span-2 text-slate-900">{docData.courier_name || "Internal Dispatch Courier"}</span>
                    </div>
                  </div>
                </div>
              ) : type === "spk_report" ? (
                <div className="border border-slate-900 rounded-lg p-4 bg-white text-xs mb-5 font-mono leading-relaxed uppercase">
                  <div className="grid grid-cols-12 border-b border-slate-900 pb-3 mb-3 items-center">
                    <div className="col-span-8 flex items-center gap-3">
                      <img src="/bag-logo.jpg" alt="BAG Logo" className="h-12 w-auto object-contain shrink-0" />
                      <div>
                        <span className="font-bold text-slate-900 block text-xs">PT PELAYARAN BAHTERA ADHIGUNA (MEMBER OF PLN INDONESIA POWER)</span>
                        <h2 className="text-sm font-black tracking-wide text-slate-900">LAPORAN REKAPITULASI DOKUMEN SPK & ALIRAN TUG LOGISTIK</h2>
                      </div>
                    </div>
                    <div className="col-span-4 text-right">
                      <div className="text-xs font-black border border-slate-900 px-3 py-1 rounded inline-block bg-slate-100">
                        REKAP SPK OFFICIAL
                      </div>
                      <div className="text-[10px] text-slate-600 font-bold mt-1">
                        No. SPK: <span className="text-blue-900 underline font-black">{docData.spk_number || "SPK-2026-0001"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] bg-slate-50 p-3 rounded border border-slate-300">
                    <div className="space-y-1">
                      <div className="flex justify-between border-b border-slate-200 pb-1">
                        <span className="text-slate-500">NOMOR PERINTAH KERJA (SPK):</span>
                        <strong className="text-blue-900 font-bold">{docData.spk_number || "SPK-2026-0001"}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1">
                        <span className="text-slate-500">PELABUHAN TUJUAN (DIKIRIM KE):</span>
                        <strong className="text-slate-900 font-bold">{docData.target_port || "Pelabuhan Tanjung Priok"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">KAPAL TARGET (DIKEMBALIKAN DARI):</span>
                        <strong className="text-slate-900 font-bold">{docData.vessel_name || docData.vessels?.[0]?.vessel_name || "MV. KARTINI BARUNA"}</strong>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between border-b border-slate-200 pb-1">
                        <span className="text-slate-500">DOKUMEN TUG 5 (PERMINTAAN):</span>
                        <strong className="text-indigo-800 font-bold">{docData.tug5_number || "TUG5-2026-001"}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1">
                        <span className="text-slate-500">DOKUMEN TUG 8 (OUTBOUND PENGIRIMAN):</span>
                        <strong className="text-emerald-800 font-bold">{docData.tug8_number || "TUG8-2026-001"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">DOKUMEN TUG 10 (RETURN PENGEMBALIAN):</span>
                        <strong className="text-amber-800 font-bold">{docData.tug10_number || "TUG10-2026-001"}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : type === "stock_report" ? (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded text-xs mb-6 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold font-display uppercase tracking-wider">Storage Facility</span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">Gudang Merak Central Warehouse (WH-MERAK)</h4>
                    <p className="text-slate-500">Encompassing Zone A (Heavy Mechanical), Zone B (Consumables) and Zone C (Electrical switchbox fittings)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600 font-semibold">Total Items Listed: {inventoryList?.length || 0}</p>
                    <p className="text-[10px] text-green-600 font-mono font-bold uppercase mt-1">Status: Active & Audited</p>
                  </div>
                </div>
              ) : null}

              {/* Main Itemized Table / Grouped Reference Sections */}
              {type === "mutation_report" ? (
                <div className="space-y-4 mb-6">
                  {(!groupedMutationList || groupedMutationList.length === 0) ? (
                    <div className="border border-slate-900 rounded overflow-hidden bg-white text-xs font-mono no-print-break shadow-xs">
                      {/* Reference Group Banner */}
                      <div className="bg-slate-100 border-b border-slate-900 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 font-bold uppercase text-[11px] text-slate-900">
                        <div className="flex items-center gap-3">
                          <span className="text-blue-900 font-mono font-black">
                            NO. REFERENSI DOKUMEN: (-)
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                            MUTASI LEDGER
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-700 font-bold space-x-3">
                          <span>TANGGAL: <strong>{todayStr}</strong></span>
                          <span>PETUGAS: <strong>(-)</strong></span>
                        </div>
                      </div>

                      {/* Subtable of items under this Reference Number */}
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-100 border-b border-slate-900 text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                          <tr>
                            <th className="px-3 py-2 border-r border-slate-300 text-center w-8">#</th>
                            <th className="px-4 py-2 border-r border-slate-300">NAMA SUKU CADANG / SPARE PART</th>
                            <th className="px-3 py-2 border-r border-slate-300 text-center">PART NUMBER</th>
                            <th className="px-3 py-2 border-r border-slate-300 text-center text-emerald-800">MASUK (IN)</th>
                            <th className="px-3 py-2 border-r border-slate-300 text-center text-rose-800">KELUAR (OUT)</th>
                            <th className="px-4 py-2 text-left">CATATAN & REMARKS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          <tr className="font-semibold text-slate-900 border-b border-slate-300">
                            <td className="px-3 py-2 border-r border-slate-300 text-center text-slate-400 font-mono text-[10px]">1</td>
                            <td className="px-4 py-2 border-r border-slate-300 font-sans font-black text-slate-400 text-center">(-)</td>
                            <td className="px-3 py-2 border-r border-slate-300 font-mono text-center text-slate-400 text-[11px]">(-)</td>
                            <td className="px-3 py-2 border-r border-slate-300 text-center font-mono font-bold text-slate-400">-</td>
                            <td className="px-3 py-2 border-r border-slate-300 text-center font-mono font-bold text-slate-400">-</td>
                            <td className="px-4 py-2 text-slate-500 font-sans font-normal italic text-[11px] text-center">NIHIL / TIDAK ADA TRANSAKSI MUTASI PADA PERIODE TANGGAL INI (-)</td>
                          </tr>
                        </tbody>
                        <tfoot className="bg-slate-100/90 border-t border-slate-900 font-bold text-[10px] text-slate-900 uppercase">
                          <tr>
                            <td colSpan={3} className="px-3 py-1.5 text-right border-r border-slate-300">SUBTOTAL REFERENSI (1 ITEM):</td>
                            <td className="px-3 py-1.5 text-center border-r border-slate-300 text-slate-500 font-black">-</td>
                            <td className="px-3 py-1.5 text-center border-r border-slate-300 text-slate-500 font-black">-</td>
                            <td className="px-4 py-1.5"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    groupedMutationList.map((group, groupIdx) => (
                      <div key={groupIdx} className="border border-slate-900 rounded overflow-hidden bg-white text-xs font-mono no-print-break shadow-xs">
                        {/* Reference Group Banner */}
                        <div className="bg-slate-100 border-b border-slate-900 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 font-bold uppercase text-[11px] text-slate-900">
                          <div className="flex items-center gap-3">
                            <span className="text-blue-900 font-mono font-black">
                              NO. REFERENSI DOKUMEN: {group.reference_number}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${group.total_in > 0 ? "bg-emerald-100 text-emerald-850 border border-emerald-300" : "bg-amber-100 text-amber-850 border border-amber-300"
                              }`}>
                              {group.total_in > 0 ? "INBOUND MASUK" : "OUTBOUND KELUAR"}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-700 font-bold space-x-3">
                            <span>TANGGAL: <strong>{safeFormatDate(group.transaction_date, todayStr)}</strong></span>
                            <span>PETUGAS: <strong>{group.created_by}</strong></span>
                          </div>
                        </div>

                        {/* Subtable of items under this Reference Number */}
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="bg-slate-100 border-b border-slate-900 text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                            <tr>
                              <th className="px-3 py-2 border-r border-slate-300 text-center w-8">#</th>
                              <th className="px-4 py-2 border-r border-slate-300">NAMA SUKU CADANG / SPARE PART</th>
                              <th className="px-3 py-2 border-r border-slate-300 text-center">PART NUMBER</th>
                              <th className="px-3 py-2 border-r border-slate-300 text-center text-emerald-800">MASUK (IN)</th>
                              <th className="px-3 py-2 border-r border-slate-300 text-center text-rose-800">KELUAR (OUT)</th>
                              <th className="px-4 py-2 text-left">CATATAN & REMARKS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-300">
                            {group.items.map((it: any, itIdx: number) => (
                              <tr key={itIdx} className="font-semibold text-slate-900 border-b border-slate-300">
                                <td className="px-3 py-2 border-r border-slate-300 text-center text-slate-400 font-mono text-[10px]">{itIdx + 1}</td>
                                <td className="px-4 py-2 border-r border-slate-300 font-sans font-black text-slate-900">{it.spare_part_name}</td>
                                <td className="px-3 py-2 border-r border-slate-300 font-mono text-center text-slate-750 text-[11px]">{it.part_number}</td>
                                <td className="px-3 py-2 border-r border-slate-300 text-center font-mono font-black text-emerald-700">{it.qty_in > 0 ? `+${it.qty_in}` : "-"}</td>
                                <td className="px-3 py-2 border-r border-slate-300 text-center font-mono font-black text-rose-700">{it.qty_out > 0 ? `-${it.qty_out}` : "-"}</td>
                                <td className="px-4 py-2 text-slate-650 font-sans font-normal italic text-[11px]">{it.remarks || "(-)"}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-100/90 border-t border-slate-900 font-bold text-[10px] text-slate-900 uppercase">
                            <tr>
                              <td colSpan={3} className="px-3 py-1.5 text-right border-r border-slate-300">SUBTOTAL REFERENSI ({group.items.length} ITEM):</td>
                              <td className="px-3 py-1.5 text-center border-r border-slate-300 text-emerald-800 font-black">{group.total_in > 0 ? `+${group.total_in}` : "-"}</td>
                              <td className="px-3 py-1.5 text-center border-r border-slate-300 text-rose-800 font-black">{group.total_out > 0 ? `-${group.total_out}` : "-"}</td>
                              <td className="px-4 py-1.5"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="border border-slate-300 rounded overflow-hidden mb-8">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2 border-r border-slate-300 text-center w-8">#</th>
                        {type === "stock_report" ? (
                          <>
                            <th className="px-4 py-2 border-r border-slate-300">SKU / PART CODE</th>
                            <th className="px-4 py-2 border-r border-slate-300">PART DESCRIPTION & CATEGORY</th>
                            <th className="px-4 py-2 border-r border-slate-300">COMPATIBLE VESSELS</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-right">MASTER STOCK</th>
                            <th className="px-4 py-2 text-right">RESERVED</th>
                          </>
                        ) : type === "spk_report" ? (
                          <>
                            <th className="px-4 py-2 border-r border-slate-300 text-left">NAMA SUKU CADANG / BARANG</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-center">PART NUMBER</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-center">STN</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-center">QTY SPK</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-center text-emerald-800">QTY DIKIRIM (TUG 8)</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-center text-amber-800">QTY KEMBALI (TUG 10)</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-center text-blue-900 font-bold">QTY TERPAKAI (NET)</th>
                            <th className="px-4 py-2 text-left">STATUS & LOKASI</th>
                          </>
                        ) : type === "tug10" ? (
                          <>
                            <th className="px-4 py-2 border-r border-slate-300">NAMA BARANG / SPARE PART (LENGKAP)</th>
                            <th className="px-4 py-2 border-r border-slate-300">NO. NORM. PAR / PART NUMBER</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-center">SATUAN</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-center">DISPATCHED (TUG 8)</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-center text-blue-800">QTY RETURNED (TUG 10)</th>
                            <th className="px-4 py-2">ALASAN & CATATAN</th>
                          </>
                        ) : (type === "tug5" || type === "tug6") ? (
                          <>
                            <th className="px-4 py-2 border-r border-slate-300">NAMA BARANG (DITULIS LENGKAP)</th>
                            <th className="px-3 py-2 border-r border-slate-300">NOMOR / PART NUMBER</th>
                            <th className="px-2 py-2 border-r border-slate-300 text-center">STN</th>
                            <th className="px-3 py-2 border-r border-slate-300 text-center text-blue-900 font-bold">BANYAKNYA (DIBERIKAN)</th>
                            <th className="px-3 py-2 border-r border-slate-300 text-center">NOMOR DO</th>
                            <th className="px-4 py-2">KETERANGAN</th>
                          </>
                        ) : type === "bon" ? (
                          <>
                            <th className="px-4 py-2 border-r border-slate-300">Nama Barang / Spare Part (Ditulis Lengkap)</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-center">Nomor Norm./Part</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-center">Stn.</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-center text-blue-800">Banyaknya</th>
                            <th className="px-4 py-2 border-r border-slate-300">Keterangan</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-right">Harga Stn. (Rp.)</th>
                            <th className="px-4 py-2 text-right">Jumlah (Rp.)</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-2 border-r border-slate-300">PART NUMBER / SKU</th>
                            <th className="px-4 py-2 border-r border-slate-300">GENUINE DESCRIPTION</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-center">QTY</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-center">UNIT</th>
                            <th className="px-4 py-2 border-r border-slate-300 text-right">UNIT PRICE (USD)</th>
                            <th className="px-4 py-2 text-right">TOTAL AMOUNT</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {type === "stock_report" ? (
                        (!inventoryList || inventoryList.length === 0) ? (
                          <tr className="hover:bg-slate-50">
                            <td className="px-3 py-2 border-r border-slate-300 font-mono text-[10px] text-slate-500 text-center">1</td>
                            <td className="px-4 py-2 border-r border-slate-300 font-mono text-[11px] text-slate-400">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-slate-500 italic">NIHIL / TIDAK ADA STOK SUKU CADANG (-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-[10px] text-slate-400 font-mono">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-right font-mono text-slate-400">(-)</td>
                            <td className="px-4 py-2 text-right font-mono text-slate-400">(-)</td>
                          </tr>
                        ) : (
                          inventoryList.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 border-r border-slate-300 font-mono text-[10px] text-slate-500 text-center">{idx + 1}</td>
                              <td className="px-4 py-2 border-r border-slate-300 font-mono text-[11px] font-bold text-slate-800">{item.part_number || "(-)"}<br /><span className="text-[9px] text-slate-400 font-normal">{item.sku || "(-)"}</span></td>
                              <td className="px-4 py-2 border-r border-slate-300">
                                <div className="font-semibold text-slate-900">{item.part_name || "(-)"}</div>
                                <div className="text-[9px] text-slate-500 font-mono">{item.category || "(-)"} | {item.maker || "(-)"}</div>
                              </td>
                              <td className="px-4 py-2 border-r border-slate-300 text-[10px] text-slate-600 font-mono leading-tight">{item.vessel_compatibility || "(-)"}</td>
                              <td className={`px-4 py-2 border-r border-slate-300 text-right font-mono font-bold ${item.current_stock <= item.reorder_point ? 'text-red-600' : 'text-slate-900'}`}>{item.current_stock}</td>
                              <td className="px-4 py-2 text-right font-mono text-slate-500">{item.reserved_stock}</td>
                            </tr>
                          ))
                        )
                      ) : type === "spk_report" ? (
                        (!paginatedList || paginatedList.length === 0) ? (
                          <tr className="hover:bg-slate-50 text-[11px] font-semibold text-slate-900 border-b border-slate-300">
                            <td className="px-3 py-2 border-r border-slate-300 font-mono text-[10px] text-slate-500 text-center">1</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-slate-400">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 font-mono text-[11px] text-center text-slate-400">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-center uppercase font-mono text-[11px] text-slate-400">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-center font-mono text-slate-400">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-center font-mono text-slate-400">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-center font-mono text-slate-400">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-center font-mono text-slate-400">(-)</td>
                            <td className="px-4 py-2 font-mono text-[10px] text-slate-500 italic">NIHIL / TIDAK ADA TRANSAKSI SPK PADA PERIODE TANGGAL INI (-)</td>
                          </tr>
                        ) : (
                          paginatedList.map((item: any, idx: number) => {
                            const itemNum = pageSize > 0 ? (currentPage - 1) * pageSize + idx + 1 : idx + 1;
                            const qtySpk = item.qty_to_pick || item.qty_spk || 1;
                            const qtyOutbound = item.qty_dispatched !== undefined ? item.qty_dispatched : (item.qty_tug8 !== undefined ? item.qty_tug8 : qtySpk);
                            const qtyReturned = item.qty_returned !== undefined ? item.qty_returned : (item.qty_tug10 !== undefined ? item.qty_tug10 : 0);
                            const qtyNet = Math.max(0, qtyOutbound - qtyReturned);

                            return (
                              <tr key={idx} className="hover:bg-slate-50 text-[11px] font-semibold text-slate-900 border-b border-slate-300">
                                <td className="px-3 py-2 border-r border-slate-300 font-mono text-[10px] text-slate-500 text-center">{itemNum}</td>
                                <td className="px-4 py-2 border-r border-slate-300 text-slate-900 font-black">
                                  {item.spare_part_name || item.part_name || "(-)"}
                                </td>
                                <td className="px-4 py-2 border-r border-slate-300 font-mono text-[11px] text-center text-slate-700">
                                  {item.part_number || "(-)"}
                                </td>
                                <td className="px-4 py-2 border-r border-slate-300 text-center uppercase font-mono text-[11px]">
                                  {item.unit || "(-)"}
                                </td>
                                <td className="px-4 py-2 border-r border-slate-300 text-center font-mono font-bold text-slate-700">
                                  {qtySpk}
                                </td>
                                <td className="px-4 py-2 border-r border-slate-300 text-center font-mono font-black text-emerald-800 bg-emerald-50/40">
                                  +{qtyOutbound}
                                </td>
                                <td className="px-4 py-2 border-r border-slate-300 text-center font-mono font-black text-amber-800 bg-amber-50/40">
                                  {qtyReturned > 0 ? `-${qtyReturned}` : "(-)"}
                                </td>
                                <td className="px-4 py-2 border-r border-slate-300 text-center font-mono font-black text-blue-900 bg-blue-50/50">
                                  {qtyNet}
                                </td>
                                <td className="px-4 py-2 font-mono text-[10px] text-slate-600">
                                  {item.remarks || item.notes || "(-)"}
                                </td>
                              </tr>
                            );
                          })
                        )
                      ) : type === "tug10" ? (
                        (!data?.items || data.items.length === 0) ? (
                          <tr className="font-semibold text-slate-900 border-b border-slate-300">
                            <td className="px-3 py-2 border-r border-slate-300 text-center font-mono text-slate-400">1</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-slate-400 font-mono text-center">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 font-mono text-[11px] text-slate-400 text-center">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-center uppercase font-mono text-[11px] text-slate-400">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-center font-mono text-slate-400">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-center font-mono text-slate-400">(-)</td>
                            <td className="px-4 py-2 text-slate-500 font-sans font-normal text-[11px] italic text-center">NIHIL / TIDAK ADA PENGEMBALIAN BARANG TUG 10 (-)</td>
                          </tr>
                        ) : (
                          data.items.map((item: any, idx: number) => (
                            <tr key={idx} className="font-semibold text-slate-900 border-b border-slate-300">
                              <td className="px-3 py-2.5 border-r border-slate-300 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="px-4 py-2.5 border-r border-slate-300 text-slate-900 font-sans font-black">{item.part_name || "(-)"}</td>
                              <td className="px-4 py-2.5 border-r border-slate-300 font-mono text-[11px] text-slate-700">{item.part_number || "(-)"}</td>
                              <td className="px-4 py-2.5 border-r border-slate-300 text-center uppercase font-mono text-[11px]">{item.unit || "(-)"}</td>
                              <td className="px-4 py-2.5 border-r border-slate-300 text-center font-mono text-slate-600">{item.qty_issued ? item.qty_issued : "(-)"}</td>
                              <td className="px-4 py-2.5 border-r border-slate-300 text-center font-mono text-emerald-800 font-black text-sm bg-emerald-50/40">{item.qty_returned}</td>
                              <td className="px-4 py-2.5 text-slate-650 font-sans font-normal text-[11px]">{item.notes || "(-)"}</td>
                            </tr>
                          ))
                        )
                      ) : (type === "tug5" || type === "tug6") ? (
                        (!data?.items || data.items.length === 0) ? (
                          <tr className="font-semibold text-slate-900 border-b border-slate-300">
                            <td className="px-2 py-2 border-r border-slate-300 text-center font-mono text-slate-400">1</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-slate-400">(-)</td>
                            <td className="px-3 py-2 border-r border-slate-300 font-mono text-[11px] text-slate-400">(-)</td>
                            <td className="px-2 py-2 border-r border-slate-300 text-center uppercase font-mono text-[11px] text-slate-400">(-)</td>
                            <td className="px-3 py-2 border-r border-slate-300 text-center font-mono text-slate-400">(-)</td>
                            <td className="px-3 py-2 border-r border-slate-300 text-center font-mono text-slate-400">(-)</td>
                            <td className="px-4 py-2 text-slate-500 font-sans font-normal italic text-[11px]">NIHIL (-)</td>
                          </tr>
                        ) : (
                          data.items.map((item: any, idx: number) => (
                            <tr key={idx} className="font-semibold text-slate-900 border-b border-slate-300">
                              <td className="px-2 py-2 border-r border-slate-300 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="px-4 py-2 border-r border-slate-300 text-slate-900 font-sans font-black">{item.spare_part_name || "(-)"}</td>
                              <td className="px-3 py-2 border-r border-slate-300 font-mono text-[11px] text-slate-750">{item.part_number || "(-)"}</td>
                              <td className="px-2 py-2 border-r border-slate-300 text-center uppercase font-mono text-[11px]">{item.unit || "(-)"}</td>
                              <td className="px-3 py-2 border-r border-slate-300 text-center font-mono text-blue-900 font-black text-xs">{item.requested_qty || "(-)"}</td>
                              <td className="px-3 py-2 border-r border-slate-300 text-center font-mono text-[10px] text-slate-700">
                              </td>
                              <td className="px-4 py-2 text-slate-650 font-sans font-normal italic text-[11px]">{item.notes || "(-)"}</td>
                            </tr>
                          ))
                        )
                      ) : type === "bon" ? (
                        (!data?.items || data.items.length === 0) ? (
                          <tr className="font-medium text-slate-900">
                            <td className="px-3 py-2 border-r border-slate-300 text-center font-mono text-slate-400">1</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-slate-400">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 font-mono text-[11px] text-slate-400 font-bold">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-center text-slate-400 uppercase font-mono">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-center text-slate-400 font-mono font-bold">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-slate-400 text-[10px] italic text-center">NIHIL / TIDAK ADA PENGELUARAN BARANG TUG 8 (-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-right font-mono text-slate-400">(-)</td>
                            <td className="px-4 py-2 text-right font-mono font-bold text-slate-400">(-)</td>
                          </tr>
                        ) : (
                          <>
                            {(data?.items || []).map((item: any, idx: number) => {
                              const price = item.unit_price !== undefined ? Number(item.unit_price) : 0;
                              const subtotal = price * (item.qty_dispatched || 0);

                              return (
                                <tr key={idx} className="font-semibold text-slate-900 border-b border-slate-205">
                                  <td className="px-3 py-2 border-r border-slate-300 font-mono text-center text-slate-400">{idx + 1}</td>
                                  <td className="px-4 py-2 border-r border-slate-300 text-slate-900 font-black">{item.spare_part_name || "(-)"}</td>
                                  <td className="px-4 py-2 border-r border-slate-300 font-mono text-[11px] text-center text-slate-700">{item.part_number || "(-)"}</td>
                                  <td className="px-4 py-2 border-r border-slate-300 text-center uppercase font-mono text-[11px]">{item.unit || "(-)"}</td>
                                  <td className="px-4 py-2 border-r border-slate-300 text-center text-blue-900 font-black text-sm bg-blue-50/50 font-mono">{item.qty_dispatched || "(-)"}</td>
                                  <td className="px-4 py-2 border-r border-slate-300 font-mono text-[11px] font-normal text-slate-550 italic">{item.notes || "(-)"}</td>
                                  <td className="px-4 py-2 border-r border-slate-300 text-right font-mono text-slate-600">Rp. {price.toLocaleString("id-ID")}</td>
                                  <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">Rp. {subtotal.toLocaleString("id-ID")}</td>
                                </tr>
                              );
                            })}

                            {/* Official TUG 8 footer row matching photograph */}
                            <tr className="bg-slate-50 text-[9px] uppercase font-bold font-mono border-t-2 border-slate-900">
                              <td className="px-2 py-2 border-r border-slate-300 font-semibold" colSpan={2}>
                                Nota No.: <span className="text-slate-900 font-bold">{docData.nota_no || docData.dispatch_number || "BPB-809"}</span>
                              </td>
                              <td className="px-2 py-2 border-r border-slate-300 font-semibold text-center">
                                Kode Akun: <span className="text-slate-900 font-bold">{docData.account_code || "BPP"}</span>
                              </td>
                              <td className="px-2 py-2 border-r border-slate-300 font-semibold text-center uppercase">
                                Perintah Kerja: <span className="text-slate-900 font-bold">{docData.work_order_ref || "WO-MECH-99"}</span>
                              </td>
                              <td className="px-2 py-2 border-r border-slate-300 font-semibold text-center uppercase" colSpan={2}>
                                Fungsi: <span className="text-slate-900 font-bold">{docData.function_code || "ARMADA"}</span>
                              </td>
                              <td className="px-2 py-2 text-right font-black text-rose-800 bg-rose-50 font-mono text-[10px]" colSpan={2}>
                                Jumlah: Rp. {grandTotalIDR.toLocaleString("id-ID")}
                              </td>
                            </tr>
                          </>
                        )
                      ) : (
                        (!data?.items || data.items.length === 0) ? (
                          <tr className="font-medium text-slate-900">
                            <td className="px-3 py-2 border-r border-slate-300 text-center font-mono text-slate-400">1</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-slate-400 font-mono text-[11px] font-bold">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 font-bold text-slate-400 italic">NIHIL (-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-center font-mono text-slate-400">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-center text-slate-400 font-mono">(-)</td>
                            <td className="px-4 py-2 border-r border-slate-300 text-right font-mono text-slate-400">(-)</td>
                            <td className="px-4 py-2 text-right font-mono font-bold text-slate-400">(-)</td>
                          </tr>
                        ) : (
                          (data?.items || []).map((item, idx) => {
                            const requested = item.qty_requested || (item as any).qty_ordered || 0;
                            const price = (item as any).unit_price || 120;
                            const subtotal = requested * price;

                            return (
                              <tr key={idx} className="font-medium text-slate-900">
                                <td className="px-3 py-2 border-r border-slate-300 text-center font-mono text-slate-400">{idx + 1}</td>
                                <td className="px-4 py-2 border-r border-slate-300 font-mono text-[11px] font-bold text-blue-800">
                                  {item.part_number || "(-)"}
                                </td>
                                <td className="px-4 py-2 border-r border-slate-300">
                                  <span className="font-bold">{item.spare_part_name || "(-)"}</span>
                                  {(item as any).reject_reason && (
                                    <p className="text-[10px] text-red-600 italic font-mono uppercase bg-red-50 p-1 mt-1">Rejected: {(item as any).reject_reason}</p>
                                  )}
                                </td>
                                <td className="px-4 py-2 border-r border-slate-300 text-center font-mono text-slate-800">{requested}</td>
                                <td className="px-4 py-2 border-r border-slate-300 text-center text-slate-500 uppercase font-mono">{(item as any).unit || "PCS"}</td>
                                <td className="px-4 py-2 border-r border-slate-300 text-right font-mono text-slate-600">${price.toLocaleString()}</td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">${subtotal.toLocaleString()}</td>
                              </tr>
                            );
                          })
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {(type === "tug5" || type === "tug6") && (
                <div className="mb-4 no-print-break">
                  <div className="grid grid-cols-3 gap-4 border border-slate-900 p-2.5 rounded text-[11px] font-mono bg-slate-50 uppercase font-bold text-slate-800">
                    <div>Perintah Kerja: <span className="text-rose-700 font-extrabold">{docData.work_order_ref || "TIADA"}</span></div>
                    <div className="text-center">Kode Akun: <span className="text-indigo-700 font-extrabold">{docData.account_code || "BPP"}</span></div>
                    <div className="text-right">Fungsi: <span className="text-emerald-700 font-extrabold">{docData.function_code || "ARMADA"}</span></div>
                  </div>
                </div>
              )}

              {type === "mutation_report" && (
                <div className="mb-4 no-print-break">
                  <div className="grid grid-cols-4 gap-3 border border-slate-900 p-2.5 rounded text-[11px] font-mono bg-slate-50 uppercase font-bold text-slate-800">
                    <div>Masuk (In): <span className="text-emerald-700 font-extrabold">+{stats?.totalIn || 0} Unit</span></div>
                    <div className="text-center">Keluar (Out): <span className="text-rose-700 font-extrabold">-{stats?.totalOut || 0} Unit</span></div>
                    <div className="text-center">Net Margin: <span className="text-indigo-700 font-extrabold">{(stats?.totalIn || 0) - (stats?.totalOut || 0) >= 0 ? "+" : ""}{(stats?.totalIn || 0) - (stats?.totalOut || 0)} Unit</span></div>
                    <div className="text-right">Total Transaksi: <span className="text-slate-900 font-extrabold">{mutationList?.length || 0} Record</span></div>
                  </div>
                </div>
              )}

              {/* Signature Sign-Off Areas - Characteristic of Maritime Operational Forms */}
              <div className="mt-8 text-xs no-print-break signature-container">
                <p className="italic text-slate-500 text-[10px] mb-8">
                  Disclaimer: PT. Pelayaran Bahtera Adhiguna assumes fully audited logistics carriage parameters upon signed counter-authority signature dispatch tags. Checked physically against corrosion, salt contamination, marine class markings and full vendor structural seal integrity.
                </p>

                {type === "tug10" ? (
                  <div className="grid grid-cols-4 gap-6 text-center uppercase tracking-wider text-[8px] font-bold text-slate-700">
                    <div className="flex flex-col justify-between h-24">
                      <span>Setuju (<span className="normal-case">Manager Logistik</span>) :</span>
                      <div className="border-t border-slate-400 pt-1 flex flex-col items-center relative">
                        {getSignatureForSlot("Manager Logistik", "Mohamat Emir Ferdian", signatures) && (
                          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center pointer-events-none h-12">
                            <img
                              src={getSignatureForSlot("Manager Logistik", "Mohamat Emir Ferdian", signatures)!}
                              alt="Tanda Tangan Manager Logistik"
                              className="max-h-12 max-w-[140px] object-contain mix-blend-multiply select-none"
                            />
                          </div>
                        )}
                        <span className="text-slate-955 font-black">Mohamat Emir Ferdian</span>
                        <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight italic mt-0.5 normal-case">Manager Logistik</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between h-24">
                      <span>Kepala Gudang :</span>
                      <div className="border-t border-slate-400 pt-1 flex flex-col items-center relative">
                        {getSignatureForSlot("Kepala Gudang", "Gudang Merak", signatures) && (
                          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center pointer-events-none h-12">
                            <img
                              src={getSignatureForSlot("Kepala Gudang", "Gudang Merak", signatures)!}
                              alt="Tanda Tangan Kepala Gudang"
                              className="max-h-12 max-w-[140px] object-contain mix-blend-multiply select-none"
                            />
                          </div>
                        )}
                        <span className="text-slate-955 font-black">&nbsp;</span>
                        <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight normal-case italic mt-0.5">Gudang Merak</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between h-24">
                      <span>MENGETAHUI :</span>
                      <div className="border-t border-slate-400 pt-1 flex flex-col items-center relative">
                        {getSignatureForSlot("VP RENDALHAR", "Sumbono", signatures) && (
                          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center pointer-events-none h-12">
                            <img
                              src={getSignatureForSlot("VP RENDALHAR", "Sumbono", signatures)!}
                              alt="Tanda Tangan VP RENDALHAR"
                              className="max-h-12 max-w-[140px] object-contain mix-blend-multiply select-none"
                            />
                          </div>
                        )}
                        <span className="text-slate-955 font-black">Sumbono</span>
                        <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight italic mt-0.5">VP RENDALHAR</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between h-24">
                      <span>Penerima / Pembuat :</span>
                      <div className="border-t border-slate-400 pt-1 flex flex-col items-center relative">
                        {getSignatureForSlot("Penerima", undefined, signatures) && (
                          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center pointer-events-none h-12">
                            <img
                              src={getSignatureForSlot("Penerima", undefined, signatures)!}
                              alt="Tanda Tangan Penerima"
                              className="max-h-12 max-w-[140px] object-contain mix-blend-multiply select-none"
                            />
                          </div>
                        )}
                        <span className="text-slate-955 font-black">&nbsp;</span>
                        <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight lowercase italic mt-0.5 font-sans">( ....................................... )</span>
                      </div>
                    </div>
                  </div>
                ) : (type === "tug5" || type === "tug6" || type === "mutation_report") ? (
                  <div className="grid grid-cols-4 gap-6 text-center uppercase tracking-wider text-[8px] font-bold text-slate-700">
                    <div className="flex flex-col justify-between h-20">
                      <span>MENGETAHUI :</span>
                      <div className="border-t border-slate-400 pt-1 flex flex-col items-center relative">
                        {getSignatureForSlot("VP RENDALHAR", "Sumbono", signatures, data) && (
                          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center pointer-events-none h-12">
                            <img
                              src={getSignatureForSlot("VP RENDALHAR", "Sumbono", signatures, data)!}
                              alt="Tanda Tangan VP RENDALHAR"
                              className="max-h-12 max-w-[140px] object-contain mix-blend-multiply select-none"
                            />
                          </div>
                        )}
                        <span className="text-slate-955 font-black">Sumbono</span>
                        <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight italic mt-0.5">VP RENDALHAR</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between h-20">
                      <span>Disetujui oleh :</span>
                      <div className="border-t border-slate-400 pt-1 flex flex-col items-center relative">
                        {getSignatureForSlot("Manager Logistik", "Mohamat Emir Ferdian", signatures, data) && (
                          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center pointer-events-none h-12">
                            <img
                              src={getSignatureForSlot("Manager Logistik", "Mohamat Emir Ferdian", signatures, data)!}
                              alt="Tanda Tangan Manager Logistik"
                              className="max-h-12 max-w-[140px] object-contain mix-blend-multiply select-none"
                            />
                          </div>
                        )}
                        <span className="text-slate-955 font-black">Mohamat Emir Ferdian</span>
                        <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight italic mt-0.5 normal-case">Manager Logistik</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between h-20">
                      <span>Kepala Gudang :</span>
                      <div className="border-t border-slate-400 pt-1 flex flex-col items-center relative">
                        {getSignatureForSlot("Kepala Gudang", "Gudang Merak", signatures, data) && (
                          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center pointer-events-none h-12">
                            <img
                              src={getSignatureForSlot("Kepala Gudang", "Gudang Merak", signatures, data)!}
                              alt="Tanda Tangan Kepala Gudang"
                              className="max-h-12 max-w-[140px] object-contain mix-blend-multiply select-none"
                            />
                          </div>
                        )}
                        <span className="text-slate-955 font-black">&nbsp;</span>
                        <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight normal-case italic mt-0.5">Gudang Merak</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between h-20">
                      <span>Petugas Gudang :</span>
                      <div className="border-t border-slate-400 pt-1 flex flex-col items-center relative">
                        {getSignatureForSlot("Petugas Gudang", "MAGHFUR MUHAMMAD ALFIN", signatures, data) && (
                          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center pointer-events-none h-12">
                            <img
                              src={getSignatureForSlot("Petugas Gudang", "MAGHFUR MUHAMMAD ALFIN", signatures, data)!}
                              alt="Tanda Tangan Petugas Gudang"
                              className="max-h-12 max-w-[140px] object-contain mix-blend-multiply select-none"
                            />
                          </div>
                        )}
                        <span className="text-slate-955 font-black">MAGHFUR MUHAMMAD ALFIN</span>
                        <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight normal-case italic mt-0.5 font-sans">Petugas Gudang</span>
                      </div>
                    </div>
                  </div>
                ) : type === "bon" ? (
                  <div className="grid grid-cols-4 gap-6 text-center uppercase tracking-wider text-[8px] font-bold text-slate-700">
                    <div className="flex flex-col justify-between h-24">
                      <span>Disetujui oleh :</span>
                      <div className="border-t border-slate-400 pt-1 flex flex-col items-center relative">
                        {getSignatureForSlot("Manager Logistik", "Mohamat Emir Ferdian", signatures) && (
                          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center pointer-events-none h-12">
                            <img
                              src={getSignatureForSlot("Manager Logistik", "Mohamat Emir Ferdian", signatures)!}
                              alt="Tanda Tangan Manager Logistik"
                              className="max-h-12 max-w-[140px] object-contain mix-blend-multiply select-none"
                            />
                          </div>
                        )}
                        <span className="text-slate-955 font-black">Mohamat Emir Ferdian</span>
                        <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight italic mt-0.5 normal-case">Manager Logistik</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between h-24">
                      <span>Kepala Gudang :</span>
                      <div className="border-t border-slate-400 pt-1 flex flex-col items-center relative">
                        {getSignatureForSlot("Kepala Gudang", "Gudang Merak", signatures) && (
                          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center pointer-events-none h-12">
                            <img
                              src={getSignatureForSlot("Kepala Gudang", "Gudang Merak", signatures)!}
                              alt="Tanda Tangan Kepala Gudang"
                              className="max-h-12 max-w-[140px] object-contain mix-blend-multiply select-none"
                            />
                          </div>
                        )}
                        <span className="text-slate-955 font-black">&nbsp;</span>
                        <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight normal-case italic mt-0.5">Gudang Merak</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between h-24">
                      <span>Pemeriksa :</span>
                      <div className="border-t border-slate-400 pt-1 flex flex-col items-center relative">
                        {getSignatureForSlot("Captain", "Capt. H. Wijaya", signatures) && (
                          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center pointer-events-none h-12">
                            <img
                              src={getSignatureForSlot("Captain", "Capt. H. Wijaya", signatures)!}
                              alt="Tanda Tangan Captain"
                              className="max-h-12 max-w-[140px] object-contain mix-blend-multiply select-none"
                            />
                          </div>
                        )}
                        <span className="text-slate-955 font-black">&nbsp;</span>
                        <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight normal-case italic mt-0.5">Captain</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between h-24">
                      <span>Penerima :</span>
                      <div className="border-t border-slate-400 pt-1 flex flex-col items-center relative">
                        {getSignatureForSlot("Authorized Carrier", docData.driver_pic || docData.courier_name, signatures) && (
                          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center pointer-events-none h-12">
                            <img
                              src={getSignatureForSlot("Authorized Carrier", docData.driver_pic || docData.courier_name, signatures)!}
                              alt="Tanda Tangan Carrier"
                              className="max-h-12 max-w-[140px] object-contain mix-blend-multiply select-none"
                            />
                          </div>
                        )}
                        <span className="text-slate-955 font-black">{docData.driver_pic || docData.courier_name || "......................................."}</span>
                        <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight normal-case italic mt-0.5">Authorized Carrier</span>
                      </div>
                    </div>
                  </div>
                ) : type === "spk_report" ? (
                  <div className="grid grid-cols-3 gap-6 text-center uppercase tracking-wider text-[9px] font-bold text-slate-800">
                    <div className="flex flex-col justify-between h-24">
                      <span>Dibuat Oleh (Staff Logistik Gudang):</span>
                      <div className="border-t border-slate-900 pt-1 flex flex-col items-center relative">
                        {getSignatureForSlot("Staff Admin Logistik", undefined, signatures) && (
                          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center pointer-events-none h-12">
                            <img
                              src={getSignatureForSlot("Staff Admin Logistik", undefined, signatures)!}
                              alt="Tanda Tangan Staff Admin"
                              className="max-h-12 max-w-[140px] object-contain mix-blend-multiply select-none"
                            />
                          </div>
                        )}
                        <span className="text-slate-900 font-black min-h-[14px]"></span>
                        <span className="text-slate-500 text-[8px] font-mono font-normal">Staff Admin Logistik WMS</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between h-24">
                      <span>Diperiksa & Diverifikasi Oleh:</span>
                      <div className="border-t border-slate-900 pt-1 flex flex-col items-center relative">
                        {getSignatureForSlot("Manager Logistik", "Mohamat Emir Ferdian", signatures) && (
                          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center pointer-events-none h-12">
                            <img
                              src={getSignatureForSlot("Manager Logistik", "Mohamat Emir Ferdian", signatures)!}
                              alt="Tanda Tangan Manager Logistik"
                              className="max-h-12 max-w-[140px] object-contain mix-blend-multiply select-none"
                            />
                          </div>
                        )}
                        <span className="text-slate-900 font-black">Mohamat Emir Ferdian</span>
                        <span className="text-slate-500 text-[8px] font-mono font-normal normal-case">Manager Logistik</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between h-24">
                      <span>Disetujui Oleh:</span>
                      <div className="border-t border-slate-900 pt-1 flex flex-col items-center relative">
                        {getSignatureForSlot("VP RENDALHAR", "Sumbono", signatures) && (
                          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center pointer-events-none h-12">
                            <img
                              src={getSignatureForSlot("VP RENDALHAR", "Sumbono", signatures)!}
                              alt="Tanda Tangan VP RENDALHAR"
                              className="max-h-12 max-w-[140px] object-contain mix-blend-multiply select-none"
                            />
                          </div>
                        )}
                        <span className="text-slate-900 font-black">Sumbono</span>
                        <span className="text-slate-500 text-[8px] font-mono font-normal">VP RENDALHAR</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-8 text-center uppercase tracking-wider text-[9px] font-bold text-slate-700">
                    <div className="flex flex-col justify-between h-24">
                      <span>Prepared & Issued By:</span>
                      <div className="border-t border-slate-400 pt-1 flex flex-col items-center">
                        <span className="text-slate-900 font-bold">{data?.created_by || "Budi Santoso"}</span>
                        <span className="text-slate-400 text-[8px] font-normal leading-tight font-mono">Warehouse Logistics Coordinator</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between h-24">
                      <span>Verified Inspection / Class Auditor:</span>
                      <div className="border-t border-slate-400 pt-1 flex flex-col items-center">
                        <span className="text-slate-900 font-bold">Capt. H. Wijaya</span>
                        <span className="text-slate-400 text-[8px] font-normal leading-tight font-mono">Superintendent Operations</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between h-24 items-center">
                      <span>Digital Sign-Off / Recipient:</span>
                      <div className="w-full border-t border-slate-400 pt-1 flex flex-col items-center min-h-[50px] justify-end">
                        {data?.signature_data_url ? (
                          <div className="bg-slate-50 p-1 border border-slate-205 rounded mb-1 max-w-[140px] max-h-[50px] flex items-center justify-center">
                            <img
                              src={data.signature_data_url}
                              alt="Digital Authorization Stamp"
                              className="max-h-[44px] max-w-[130px] select-none object-contain mix-blend-multiply"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-955 font-black tracking-widest text-[11px] mb-2">.......................................</span>
                        )}
                        <span className="text-slate-400 text-[8px] font-normal leading-tight font-mono">AUTHORIZED WMS SIGNATURE STAMP</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>



          </div>
        </div>

        {/* Bottom Pagination & Navigation Controls inside Preview Modal */}
        {(type === "mutation_report" || type === "stock_report") && pageSize > 0 && totalPages > 1 && (
          <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-600 no-print">
            <div>
              Halaman <strong className="text-slate-900">{currentPage}</strong> dari <strong>{totalPages}</strong> &bull; Menampilkan baris {(currentPage - 1) * pageSize + 1} hingga {Math.min(currentPage * pageSize, totalItems)} dari total <strong>{totalItems}</strong> record
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-300 rounded font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-300 rounded font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Action Panel Footer - hidden on print */}
        <div className="bg-slate-900 border-t border-slate-800 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
          <span className="text-[11px] text-slate-400 font-mono">
            Tekan <strong className="text-white">Cetak Dokumen</strong> untuk mengirim ke printer fisik atau simpan sebagai PDF A4.
          </span>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer"
            >
              Tutup Pratinjau
            </button>

            <button
              onClick={printDoc}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Cetak Dokumen (A4)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
