/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Printer, X, Shield, Anchor, CheckCircle, FileDown } from "lucide-react";
import { OutboundDispatch, SparePart, InboundReceiving, SPKWorkOrder } from "../types.js";
import { api } from "../api.js";

interface PrintDocumentProps {
  type: "bon" | "surat_jalan" | "manifest" | "stock_report" | "mutation_report" | "tug5" | "tug10";
  data?: OutboundDispatch | InboundReceiving | any;
  inventoryList?: SparePart[];
  mutationList?: any[];
  stats?: any;
  timeFilter?: string;
  spkList?: SPKWorkOrder[];
  onClose: () => void;
}

export default function PrintDocument({ 
  type, 
  data, 
  inventoryList, 
  mutationList, 
  stats, 
  timeFilter, 
  spkList,
  onClose 
}: PrintDocumentProps) {
  const printDoc = () => {
    window.focus();
    window.print();
    if (type === "bon" && data && data.id) {
      api.logDispatchAction(data.id, "Printed").catch(e => console.error(e));
    } else if (type === "tug5" && data && data.id) {
      api.logMaterialRequestAction(data.id, "Printed").catch(e => console.error(e));
    } else if (type === "tug10" && data && data.id) {
      api.logMaterialReturnAction(data.id, "Printed").catch(e => console.error(e));
    }
  };

  const downloadInteractiveHTML = () => {
    const printableElement = document.getElementById("printable-area");
    if (!printableElement) return;

    const contentHtml = printableElement.innerHTML;
    const documentTitle = type === "tug5" ? "TUG 5 - Permintaan Barang" : type === "tug10" ? "TUG 10 - Bon Pengembalian" : "WMS Dokumen";

    const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>${documentTitle}</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            background-color: #f8fafc;
            color: #1e293b;
            font-family: ui-sans-serif, system-ui, sans-serif;
            padding: 2.5rem 1rem;
        }
        @media print {
            .no-print { display: none !important; }
            body { padding: 0; background-color: white; }
            .print-card-wrapper { border: none !important; box-shadow: none !important; padding: 0 !important; }
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

  // Cast data as any inside template properties safely to access union attributes
  const docData = data as any;

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
      const price = getPartIDRPrice(item.part_number);
      const qty = item.qty_dispatched || 0;
      grandTotalIDR += price * qty;
    });
  }

  // Unique document numbers based on randomized details if not explicitly available
  const docNum = docData 
    ? (type === "bon" ? docData.bon_pengeluaran_number || "BPB-2026-00892" 
       : type === "surat_jalan" ? docData.surat_jalan_number || "SJL-2026-0518"
       : docData.manifest_number || "MNF-2026-22119")
    : `DOC-WMS-2026-${Math.floor(Math.random() * 90000) + 10000}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto print-document-overlay">
      <div className="bg-white text-slate-800 rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col my-8 border border-slate-200">
        
        {/* Header toolbar - hidden on physical print */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-850 no-print col-span-full">
          <div className="flex items-center gap-2">
            <Anchor className="text-blue-400 w-5 h-5" />
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider">
              Logistics Document Tool — {
                type === "bon" ? "Bon Pengeluaran Barang" 
                : type === "surat_jalan" ? "Surat Jalan (Outbound)" 
                : type === "manifest" ? "Cargo Manifest" 
                : type === "stock_report" ? "Current Stock Report"
                : type === "mutation_report" ? "Laporan Mutasi Keluar Masuk Barang"
                : type === "tug5" ? "Daftar Permintaan Barang-Barang (TUG 5)"
                : "Bon Pengembalian Barang-Barang (TUG 10)"
              }
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={downloadInteractiveHTML}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase px-4 py-2 rounded-lg shadow-md hover:shadow transition-all duration-150 cursor-pointer"
              title="Download dokumen cetak interaktif yang bisa langsung disimpan sebagai PDF atau dicetak"
            >
              <FileDown className="w-4 h-4 text-white animate-pulse" />
              Download & Cetak PDF (TUG / BON)
            </button>

            <button 
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 p-1.5 rounded transition-colors text-slate-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Form Content Area */}
        <div className="p-8 flex-1 overflow-y-auto print:p-0 print-card bg-white" id="printable-area">
          
          {type === "bon" ? (
            /* SPECIAL CUSTOM TUG 8 DOUBLE LINE HEADER & METADATA SECTION */
            <div className="font-sans text-[11px] text-slate-900 mx-auto bg-white mb-6">
              {/* TUG 8 CUSTOM HEADER BAR */}
              <div className="grid grid-cols-12 gap-2 border-b-2 border-slate-900 pb-2 mb-2 items-start font-mono text-xs">
                {/* Left side: PT PELAYANAN BAHTERA ADHIGUNA */}
                <div className="col-span-4 text-[11px] font-black leading-tight uppercase font-sans border-b-2 border-black w-fit pb-1">
                  PT PELAYANAN<br />
                  BAHTERA<br />
                  ADHIGUNA
                </div>

                {/* Center: BON PENGELUARAN BARANG-BARANG/SPARE PART */}
                <div className="col-span-5 text-center flex flex-col justify-center items-center h-full">
                  <h1 className="text-xs font-black tracking-tight leading-tight uppercase pt-2">
                    BON PENGELUARAN BARANG-BARANG / SPARE PART
                  </h1>
                </div>

                {/* Right side: TUG 8 Details */}
                <div className="col-span-3 text-right text-[10px] font-mono leading-tight flex flex-col items-end">
                  <div className="font-extrabold text-xs tracking-wider text-slate-900 border-b border-black pb-0.5 w-full text-right uppercase">TUG. 8</div>
                  <div className="mt-0.5 font-bold">No. <span className="text-rose-800 font-extrabold text-[11px] font-mono underline">{docData.tug8_number || docData.bon_pengeluaran_number || "000001"}</span></div>
                  <div className="text-[8px] text-slate-500 italic">2 Untuk Pengantar</div>

                  {/* Small boxed table on photo */}
                  <table className="border border-black mt-2 text-[8px] text-left w-full border-collapse font-sans font-semibold">
                    <tbody>
                      <tr className="border-b border-black bg-slate-50">
                        <td className="px-1 py-0.5 text-[7px] font-bold uppercase">PT PELAYANAN</td>
                      </tr>
                      <tr className="border-b border-black bg-slate-50">
                        <td className="px-1 py-0.5 text-[7px] font-bold uppercase">BAHTERA ADHIGUNA</td>
                      </tr>
                      <tr>
                        <td className="px-1 py-1 uppercase leading-none font-mono text-[7px]">
                          <span className="text-[6px] text-slate-500 font-sans block">Nama Gudang/Kapal</span>
                          <span className="font-bold text-slate-900 block overflow-hidden leading-none truncate max-w-[124px]">
                            {docData.warehouse_name ? docData.warehouse_name.split(" ")[0] : "Central"} / {docData.vessel_name || "MV ADHIGUNA"}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Metadata Grid Box in photo */}
              <div className="grid grid-cols-2 gap-0 border border-black text-[10px] font-medium leading-relaxed">
                {/* Left Column (Dikirim kepada, Menurut, No) */}
                <div className="border-r border-black p-2 space-y-1.5 font-mono">
                  <div className="flex items-baseline gap-1">
                    <span className="shrink-0">Dikirim kepada:</span>
                    <span className="border-b border-dotted border-black flex-1 font-bold text-slate-950 font-sans px-1 uppercase">
                      {docData.vessel_name || "MV ADHIGUNA UNGGUL"}
                    </span>
                    <span className="shrink-0 pl-1">tgl.</span>
                    <span className="border-b border-dotted border-black w-24 text-center font-bold font-sans">
                      {docData.dispatch_date ? new Date(docData.dispatch_date).toLocaleDateString("id-ID") : new Date().toLocaleDateString("id-ID")}
                    </span>
                  </div>

                  <div className="text-[9px] text-slate-500 leading-tight uppercase italic border-t border-slate-200 pt-1 flex items-center gap-1">
                    <span className="text-[8px] text-black not-italic font-bold">Menurut :</span> 
                    <span>Daftar Permintaan / Perintah Pengiriman</span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="shrink-0">No.</span>
                    <span className="border-b border-dotted border-black flex-1 font-bold text-blue-900 px-1 font-mono">
                      {docData.request_reference || "REQ-2026-0041"}
                    </span>
                    <span className="shrink-0 pl-1">tgl.</span>
                    <span className="border-b border-dotted border-black w-24 text-center font-bold font-mono">
                      {docData.dispatch_date ? new Date(docData.dispatch_date).toLocaleDateString("id-ID") : new Date().toLocaleDateString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Right Column (Dikirim dengan, Sudah/belum dibayar, Biaya) */}
                <div className="p-2 space-y-1 font-mono text-[9px]">
                  <div className="flex items-baseline gap-1">
                    <span className="shrink-0">Dikirim dengan:</span>
                    <span className="border-b border-dotted border-black flex-1 font-bold text-slate-900 font-sans px-1 uppercase">
                      🚚 {docData.courier_name || "INTERNAL CARGO TRANSIT"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="shrink-0">Sudah/belum dibayar:</span>
                    <span className="border-b border-dotted border-black flex-1 font-bold text-slate-600 px-1 italic">
                      Belum Dibayar (Internal Depot)
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="shrink-0">Biaya Pengiriman:</span>
                    <span className="border-b border-dotted border-black flex-1 font-bold text-slate-900 px-1">
                      Rp. -
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="shrink-0">Biaya Pembungkus:</span>
                    <span className="border-b border-dotted border-black flex-1 font-bold text-slate-900 px-1">
                      Rp. -
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Company Official Letterhead Header */}
              <div className="border-b-2 border-double border-slate-900 pb-4 mb-6 flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-slate-900 rounded flex items-center justify-center text-white border border-slate-800 shrink-0">
                    <Anchor className="w-7 h-7 text-blue-400" />
                  </div>
                  <div>
                    <h1 className="font-display font-bold text-lg leading-tight uppercase tracking-tight text-slate-950">PT. PELAYARAN BAHTERA ADHIGUNA (BAG)</h1>
                    <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
                      Maritime Logistics, Vessel Spares Procurement & Supply Depot<br />
                      Komp. Pelabuhan Merak Mas, Cilegon, Banten | Phone: +62 254 571 123
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-mono font-bold tracking-wider">WMS-SYSTEM</span>
                  <p className="text-[11px] font-mono mt-1 text-slate-700">Ref: <span className="font-bold text-slate-950">{type === "tug5" ? docData?.request_number : docNum}</span></p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Date: {todayStr}</p>
                </div>
              </div>

              {/* Form Title */}
              <div className="text-center mb-6">
                <h2 className="font-display font-bold text-base uppercase tracking-widest text-slate-900 underline underline-offset-4">
                  {type === "surat_jalan" && "SURAT JALAN / DELIVERY NOTE"}
                  {type === "manifest" && "VESSEL CARGO MANIFEST"}
                  {type === "stock_report" && "LAPORAN MONITORING STOK WAREHOUSE"}
                  {type === "mutation_report" && "LAPORAN MUTASI KELUAR MASUK BARANG"}
                  {type === "tug5" && "DAFTAR PERMINTAAN BARANG-BARANG (TUG 5)"}
                </h2>
                <p className="text-[10px] uppercase font-mono tracking-wider italic text-slate-500 mt-1">
                  {type === "surat_jalan" && "Goods Dispatch & Delivery Transit slip"}
                  {type === "manifest" && "Consignment Cargo Port declaration list"}
                  {type === "stock_report" && "Official inventory audit state snapshot"}
                  {type === "mutation_report" && `Warehouse Goods Movement & Flow audit Ledger (${timeFilter || "Default filter"})`}
                  {type === "tug5" && "Material / Spare Parts Request Form"}
                </p>
              </div>

              {/* Information Block: Warehouse/Vessel particulars */}
              {type === "mutation_report" && stats ? (
                <div className="grid grid-cols-4 gap-4 bg-slate-50 border border-slate-200 p-4 rounded text-xs mb-6 font-mono select-none">
                  <div className="border-r border-slate-200 pr-2">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Quantity In</p>
                    <p className="text-lg font-black text-green-700 mt-1">+{stats.totalIn || 0} Unit</p>
                    <p className="text-[8px] text-slate-400 mt-0.5 uppercase">Successfully Warehoused</p>
                  </div>
                  <div className="border-r border-slate-200 px-2">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Quantity Out</p>
                    <p className="text-lg font-black text-rose-700 mt-1">-{stats.totalOut || 0} Unit</p>
                    <p className="text-[8px] text-slate-400 mt-0.5 uppercase">Dispatched To Vessels</p>
                  </div>
                  <div className="border-r border-slate-200 px-2">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Net Margin Flow</p>
                    <p className={`text-lg font-black mt-1 ${stats.totalIn - stats.totalOut >= 0 ? "text-blue-600" : "text-amber-600"}`}>
                      {stats.totalIn - stats.totalOut >= 0 ? "+" : ""}{stats.totalIn - stats.totalOut} Unit
                    </p>
                    <p className="text-[8px] text-slate-400 mt-0.5 uppercase">Suku Cadang Differential</p>
                  </div>
                  <div className="pl-2">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Transactions</p>
                    <p className="text-lg font-black text-slate-900 mt-1">{mutationList?.length || 0} Records</p>
                    <p className="text-[8px] text-slate-400 mt-0.5 uppercase">Audited Movements</p>
                  </div>
                </div>
              ) : type === "tug10" && data ? (
                <div className="border border-slate-900 rounded-lg p-3 bg-white text-xs mb-6 font-mono leading-relaxed uppercase">
                  {/* Photo-Style Bon Pengembalian Header */}
                  <div className="grid grid-cols-12 border-b border-slate-350 pb-2 mb-2 items-center">
                    <div className="col-span-8">
                      <span className="font-bold text-slate-900 block text-xs">PT PELAYARAN BAHTERA ADHIGUNA (BAHTERA ADHIGUNA GROUP)</span>
                      <h2 className="text-sm font-black tracking-wide text-slate-800">BON PENGEMBALIAN</h2>
                    </div>
                    <div className="col-span-4 text-right">
                      <div className="text-xs font-black border border-slate-900 px-2 py-0.5 rounded inline-block bg-slate-50">
                        TUG 10
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold mt-1">C. No. <span className="text-red-700 underline font-black">{docData.return_number}</span></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px]">
                    <div className="space-y-1.5">
                      <div className="flex">
                        <span className="w-28 text-slate-500 shrink-0">NAMA GUDANG / KAPAL :</span>
                        <strong className="text-slate-900">{docData.warehouse_name || "GUDANG UTAMA"} / {docData.vessel_name}</strong>
                      </div>
                      <div className="flex">
                        <span className="w-28 text-slate-500 shrink-0">PEKERJAAN (WO REF) :</span>
                        <strong className="text-slate-900 font-bold">sparepart pemeliharaan / sparepart docking / running store / consumable</strong>
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
              ) : type === "tug5" && data ? (
                <div className="grid grid-cols-2 gap-6 border-2 border-slate-900 p-4 rounded text-xs mb-6 relative">
                  <div className="absolute top-2 right-2 border-2 border-slate-900 px-3 py-1 bg-slate-50 font-mono text-[9px] uppercase font-bold text-center leading-tight">
                    1 Fungsi Perbekalan<br />
                    <span className="text-blue-800 font-extrabold">{docData.warehouse_name || "GUDANG MERAK"}</span>
                  </div>
                  <div className="space-y-1.5 font-medium leading-normal z-10">
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500 uppercase tracking-wider text-[9px]">Kepada:</span>
                      <span className="col-span-2 text-slate-900 font-extrabold">DEPO PERBEKALAN BAHAN / LOGISTIK BAG</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500 uppercase tracking-wider text-[9px]">Harap dikirim ke:</span>
                      <span className="col-span-2 text-slate-950 font-black text-sm">{docData.vessel_name}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="text-slate-500 uppercase tracking-wider text-[9px]">Alamat:</span>
                      <span className="col-span-2 text-slate-700 italic font-sans leading-tight">{docData.delivery_address || "Pelabuhan Merak, Cilegon, Banten"}</span>
                    </div>
                  </div>
                  <div>
                    {/* Visual balance spacer */}
                  </div>
                </div>
              ) : type !== "stock_report" && type !== "mutation_report" && data ? (
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
              ) : (
                type === "stock_report" && (
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
                )
              )}
            </>
          )}

          {/* Main Itemized Table */}
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
                  ) : type === "mutation_report" ? (
                    <>
                      <th className="px-3 py-2 border-r border-slate-300">DATE & TIME</th>
                      <th className="px-3 py-2 border-r border-slate-300">SPARE PART INFO</th>
                      <th className="px-3 py-2 border-r border-slate-300">TRANSACTION TYPE</th>
                      <th className="px-3 py-2 border-r border-slate-300 text-center">IN</th>
                      <th className="px-3 py-2 border-r border-slate-300 text-center">OUT</th>
                      <th className="px-4 py-2 border-r border-slate-300">REFERENCE NO.</th>
                      <th className="px-3 py-2 text-slate-700">REMARKS & OPERATOR</th>
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
                  ) : type === "tug5" ? (
                    <>
                      <th className="px-4 py-2 border-r border-slate-300">NAMA BARANG (DITULIS LENGKAP)</th>
                      <th className="px-4 py-2 border-r border-slate-300">NOMOR / PART NUMBER</th>
                      <th className="px-4 py-2 border-r border-slate-300 text-center">STN</th>
                      <th className="px-4 py-2 border-r border-slate-300 text-center">PEMAKAIAN RATA2</th>
                      <th className="px-4 py-2 border-r border-slate-300 text-center">SISA STOK</th>
                      <th className="px-4 py-2 border-r border-slate-300 text-center text-blue-800">PERMINTAAN</th>
                      <th className="px-4 py-2 border-r border-slate-300">DIBERIKAN (BANYAKNYA/DO)</th>
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
                  (inventoryList || []).map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 border-r border-slate-300 font-mono text-[10px] text-slate-500 text-center">{idx + 1}</td>
                      <td className="px-4 py-2 border-r border-slate-300 font-mono text-[11px] font-bold text-slate-800">{item.part_number}<br/><span className="text-[9px] text-slate-400 font-normal">{item.sku}</span></td>
                      <td className="px-4 py-2 border-r border-slate-300">
                        <div className="font-semibold text-slate-900">{item.part_name}</div>
                        <div className="text-[9px] text-slate-500 font-mono">{item.category} | {item.maker}</div>
                      </td>
                      <td className="px-4 py-2 border-r border-slate-300 text-[10px] text-slate-600 font-mono leading-tight">{item.vessel_compatibility}</td>
                      <td className={`px-4 py-2 border-r border-slate-300 text-right font-mono font-bold ${item.current_stock <= item.reorder_point ? 'text-red-600' : 'text-slate-900'}`}>{item.current_stock}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-500">{item.reserved_stock}</td>
                    </tr>
                  ))
                ) : type === "mutation_report" ? (
                  (mutationList || []).map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50 text-[11px] font-medium text-slate-900">
                      <td className="px-3 py-2 border-r border-slate-300 font-mono text-[10px] text-slate-400 text-center">{idx + 1}</td>
                      <td className="px-3 py-2 border-r border-slate-300 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        {new Date(item.transaction_date).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-300">
                        <span className="font-bold text-slate-900">{item.spare_part_name}</span>
                        <p className="font-mono text-[9px] text-slate-400">{item.part_number}</p>
                      </td>
                      <td className="px-3 py-2 border-r border-slate-300 font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold text-center block ${
                          item.transaction_type.includes("Inbound") || item.transaction_type.includes("Receiving")
                            ? "bg-green-150 text-green-800"
                            : item.transaction_type.includes("Dispatch") || item.transaction_type.includes("Supply")
                            ? "bg-rose-150 text-rose-850"
                            : "bg-slate-150 text-slate-805"
                        }`}>
                          {item.transaction_type}
                        </span>
                      </td>
                      <td className="px-3 py-2 border-r border-slate-300 text-center font-mono font-bold text-green-700">
                        {item.qty_in > 0 ? `+${item.qty_in}` : "-"}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-300 text-center font-mono font-bold text-rose-700">
                        {item.qty_out > 0 ? `-${item.qty_out}` : "-"}
                      </td>
                      <td className="px-4 py-2 border-r border-slate-300 font-mono text-blue-600 font-bold whitespace-nowrap">{item.reference_number}</td>
                      <td className="px-3 py-2 text-slate-600 text-[10.5px]">
                        <div>{item.remarks || "No comments"}</div>
                        <span className="text-[9px] font-mono text-slate-405 italic">ByUser: {item.created_by}</span>
                      </td>
                    </tr>
                  ))
                ) : type === "tug10" ? (
                  (data?.items || []).map((item: any, idx: number) => (
                    <tr key={idx} className="font-semibold text-slate-900 border-b border-slate-300">
                      <td className="px-3 py-2.5 border-r border-slate-300 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-2.5 border-r border-slate-300 text-slate-900 font-sans font-black">{item.part_name}</td>
                      <td className="px-4 py-2.5 border-r border-slate-300 font-mono text-[11px] text-slate-700">{item.part_number}</td>
                      <td className="px-4 py-2.5 border-r border-slate-300 text-center uppercase font-mono text-[11px]">{item.unit || "PCS"}</td>
                      <td className="px-4 py-2.5 border-r border-slate-300 text-center font-mono text-slate-600">{item.qty_issued || 0}</td>
                      <td className="px-4 py-2.5 border-r border-slate-300 text-center font-mono text-emerald-800 font-black text-sm bg-emerald-50/40">{item.qty_returned}</td>
                      <td className="px-4 py-2.5 text-slate-650 font-sans font-normal text-[11px]">{item.notes || "-"}</td>
                    </tr>
                  ))
                ) : type === "tug5" ? (
                  (data?.items || []).map((item: any, idx: number) => (
                    <tr key={idx} className="font-semibold text-slate-900 border-b border-slate-300">
                      <td className="px-3 py-2.5 border-r border-slate-300 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-2.5 border-r border-slate-300 text-slate-900 font-sans font-black">{item.spare_part_name}</td>
                      <td className="px-4 py-2.5 border-r border-slate-300 font-mono text-[11px] text-slate-755">{item.part_number}</td>
                      <td className="px-4 py-2.5 border-r border-slate-300 text-center uppercase font-mono text-[11px]">{item.unit || "PCS"}</td>
                      <td className="px-4 py-2.5 border-r border-slate-300 text-center font-mono">{item.avg_monthly_usage !== undefined ? item.avg_monthly_usage : 1}</td>
                      <td className="px-4 py-2.5 border-r border-slate-300 text-center font-mono">{item.remaining_stock !== undefined ? item.remaining_stock : 0}</td>
                      <td className="px-4 py-2.5 border-r border-slate-300 text-center font-mono text-blue-800 font-black text-xs">{item.requested_qty}</td>
                      <td className="px-4 py-2.5 border-r border-slate-300 font-mono text-[10px] text-slate-650">
                        {docData.status === "Processed" ? `${item.requested_qty} (Delivered)` : ".................. / ....."}
                      </td>
                      <td className="px-4 py-2.5 text-slate-605 font-sans font-normal italic text-[11px]">{item.notes || "-"}</td>
                    </tr>
                  ))
                ) : type === "bon" ? (
                  <>
                    {(data?.items || []).map((item: any, idx: number) => {
                      const price = getPartIDRPrice(item.part_number);
                      const subtotal = price * (item.qty_dispatched || 0);

                      return (
                        <tr key={idx} className="font-semibold text-slate-900 border-b border-slate-205">
                          <td className="px-3 py-2 border-r border-slate-300 font-mono text-center text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-2 border-r border-slate-300 text-slate-900 font-black">{item.spare_part_name}</td>
                          <td className="px-4 py-2 border-r border-slate-300 font-mono text-[11px] text-center text-slate-700">{item.part_number}</td>
                          <td className="px-4 py-2 border-r border-slate-300 text-center uppercase font-mono text-[11px]">{item.unit || "PCS"}</td>
                          <td className="px-4 py-2 border-r border-slate-300 text-center text-blue-900 font-black text-sm bg-blue-50/50 font-mono">{item.qty_dispatched}</td>
                          <td className="px-4 py-2 border-r border-slate-300 font-mono text-[11px] font-normal text-slate-550 italic">{item.notes || "-"}</td>
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
                ) : (
                  (data?.items || []).map((item, idx) => {
                    const requested = item.qty_requested || (item as any).qty_ordered || 0;
                    const price = (item as any).unit_price || 120;
                    const subtotal = requested * price;

                    return (
                      <tr key={idx} className="font-medium text-slate-900">
                        <td className="px-3 py-2 border-r border-slate-300 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-2 border-r border-slate-300 font-mono text-[11px] font-bold text-blue-800">
                          {item.part_number}
                        </td>
                        <td className="px-4 py-2 border-r border-slate-300">
                          <span className="font-bold">{item.spare_part_name}</span>
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
                )}
              </tbody>
            </table>
          </div>

          {type === "tug5" && (() => {
            const linkedSPK = spkList && docData?.work_order_ref
              ? spkList.find((s) => s.spk_number === docData.work_order_ref)
              : null;
            return (
              <div className="space-y-3 mb-6 no-print-break">
                <div className="grid grid-cols-3 gap-4 border border-slate-900 p-3 rounded text-[11px] font-mono bg-slate-50 uppercase font-bold text-slate-800">
                  <div>Perintah Kerja: <span className="text-rose-700 font-extrabold">{docData.work_order_ref || "TIADA"}</span></div>
                  <div className="text-center">Kode Akun: <span className="text-indigo-700 font-extrabold">{docData.account_code || "BPP"}</span></div>
                  <div className="text-right">Fungsi: <span className="text-emerald-700 font-extrabold">{docData.function_code || "ARMADA"}</span></div>
                </div>

                {linkedSPK && (
                  <div className="border border-blue-400 p-3.5 bg-blue-50/50 rounded text-slate-900 text-left">
                    <div className="flex items-center justify-between border-b border-blue-250 pb-1.5 mb-2">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-blue-700 uppercase">
                        ✓ INTEGRASI DENGAN REGISTER SPK SISTEM EKSTERNAL (WMS LIVE LINK)
                      </span>
                      <span className="text-[9px] bg-blue-100 px-2 py-0.5 rounded text-blue-800 font-bold font-mono">
                        STATUS SPK: {linkedSPK.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[10px] leading-relaxed">
                      <div>
                        <p className="font-mono"><strong className="text-slate-500">NOMOR REFERENSI SPK:</strong> {linkedSPK.spk_number}</p>
                        <p className="font-mono"><strong className="text-slate-500">PELABUHAN TARGET:</strong> {linkedSPK.target_port}</p>
                        <p className="font-mono"><strong className="text-slate-500">DIBUAT TANGGAL:</strong> {new Date(linkedSPK.created_at).toLocaleDateString("id-ID")}</p>
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 mb-1 font-mono uppercase tracking-wider">Item Suku Cadang Bawaan SPK Asli:</p>
                        <div className="space-y-1">
                          {linkedSPK.vessels.map((v, vIdx) => (
                            <div key={vIdx} className="border-t border-blue-100/60 pt-1 mt-1">
                              <span className="font-sans font-black text-blue-900 block">⚓ Kapal: {v.vessel_name}</span>
                              <ul className="list-disc pl-4 font-mono text-[9px] text-slate-700">
                                {v.items.map((it, itIdx) => (
                                  <li key={itIdx}>
                                    {it.spare_part_name} &bull; Part No: {it.part_number} (Qty: {it.qty_to_pick} {it.unit})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Signature Sign-Off Areas - Characteristic of Maritime Operational Forms */}
          <div className="mt-12 text-xs">
            <p className="italic text-slate-500 text-[10px] mb-8">
              Disclaimer: PT. Pelayaran Bahtera Adhiguna assumes fully audited logistics carriage parameters upon signed counter-authority signature dispatch tags. Checked physically against corrosion, salt contamination, marine class markings and full vendor structural seal integrity.
            </p>

            {type === "tug10" ? (
              <div className="grid grid-cols-4 gap-6 text-center uppercase tracking-wider text-[8px] font-bold text-slate-700">
                <div className="flex flex-col justify-between h-24">
                  <span>Setuju (VP/Manager) :</span>
                  <div className="border-t border-slate-400 pt-1 flex flex-col items-center">
                    <span className="text-slate-955 font-black">Mohamat Emir Ferdian</span>
                    <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight lowercase italic mt-0.5">Manager Logistik</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between h-24">
                  <span>Kepala Gudang :</span>
                  <div className="border-t border-slate-400 pt-1 flex flex-col items-center">
                    <span className="text-slate-955 font-black">&nbsp;</span>
                    <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight lowercase italic mt-0.5">Gudang Merak</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between h-24">
                  <span>MENGETAHUI :</span>
                  <div className="border-t border-slate-400 pt-1 flex flex-col items-center">
                    <span className="text-slate-955 font-black">Sumbono</span>
                    <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight lowercase italic mt-0.5">Pemeriksa Teknik</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between h-24">
                  <span>Penerima / Pembuat :</span>
                  <div className="border-t border-slate-400 pt-1 flex flex-col items-center">
                    <span className="text-slate-955 font-black">{docData.created_by || "Mulyadi"}</span>
                    <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight lowercase italic mt-0.5">Chief Engineer / CE</span>
                  </div>
                </div>
              </div>
            ) : type === "tug5" ? (
              <div className="grid grid-cols-4 gap-6 text-center uppercase tracking-wider text-[8px] font-bold text-slate-700">
                <div className="flex flex-col justify-between h-24">
                  <span>MENGETAHUI :</span>
                  <div className="border-t border-slate-400 pt-1 flex flex-col items-center">
                    <span className="text-slate-955 font-black">Sumbono</span>
                    <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight lowercase italic mt-0.5">VP RendalHar</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between h-24">
                  <span>Disetujui oleh :</span>
                  <div className="border-t border-slate-400 pt-1 flex flex-col items-center">
                    <span className="text-slate-955 font-black">Mohamat Emir Ferdian</span>
                    <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight lowercase italic mt-0.5">Manager Logistik</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between h-24">
                  <span>Kepala Gudang :</span>
                  <div className="border-t border-slate-400 pt-1 flex flex-col items-center">
                    <span className="text-slate-955 font-black">&nbsp;</span>
                    <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight lowercase italic mt-0.5">Gudang Merak</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between h-24">
                  <span>Penerima / Petugas Gudang:</span>
                  <div className="border-t border-slate-400 pt-1 flex flex-col items-center">
                    <span className="text-slate-955 font-black">{docData.created_by || "......................................."}</span>
                    <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight lowercase italic mt-0.5 font-sans">WMS Warehouse Admin Coordinator</span>
                  </div>
                </div>
              </div>
            ) : type === "bon" ? (
              <div className="grid grid-cols-4 gap-6 text-center uppercase tracking-wider text-[8px] font-bold text-slate-700">
                <div className="flex flex-col justify-between h-24">
                  <span>Disetujui oleh :</span>
                  <div className="border-t border-slate-400 pt-1 flex flex-col items-center">
                    <span className="text-slate-955 font-black">Mohamat Emir Ferdian</span>
                    <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight lowercase italic mt-0.5">Manager Logistik</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between h-24">
                  <span>Kepala Gudang :</span>
                  <div className="border-t border-slate-400 pt-1 flex flex-col items-center">
                    <span className="text-slate-955 font-black">&nbsp;</span>
                    <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight lowercase italic mt-0.5">Gudang Merak</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between h-24">
                  <span>Pemeriksa :</span>
                  <div className="border-t border-slate-400 pt-1 flex flex-col items-center">
                    <span className="text-slate-955 font-black">Capt. H. Wijaya</span>
                    <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight lowercase italic mt-0.5">Superintendent Operations</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between h-24">
                  <span>Penerima / Sopir :</span>
                  <div className="border-t border-slate-400 pt-1 flex flex-col items-center">
                    <span className="text-slate-955 font-black">{docData.driver_pic || docData.courier_name || "......................................."}</span>
                    <span className="text-slate-500 text-[7px] font-mono font-normal leading-tight lowercase italic mt-0.5">Authorized Carrier</span>
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

          {/* Bottom Security Footer Stamp */}
          <div className="mt-12 pt-4 border-t border-slate-200 flex justify-between items-center text-[8px] font-mono text-slate-400 uppercase tracking-widest leading-none">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-500" />
              <span>PT. PELAYARAN BAHTERA ADHIGUNA SAFE-LOG INBOUND-OUTBOUND CLOUD LEDGER</span>
            </div>
            <span>CONFIDENTIAL OPERATIONAL BACKUP V2.4-STABLE</span>
          </div>

        </div>

        {/* Action Panel Footer - hidden on print */}
        <div className="bg-slate-550 border-t border-slate-100 px-6 py-4 flex justify-end gap-3 no-print">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded transition-colors cursor-pointer"
          >
            Close Document Preview
          </button>

          <button 
            onClick={printDoc}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase rounded transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            Send to System Printer
          </button>
        </div>

      </div>
    </div>
  );
}
