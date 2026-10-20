/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { 
  TrendingUp, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  History,
  FileSpreadsheet,
  AlertCircle,
  Calendar,
  ChevronDown,
  Boxes,
  Download,
  RefreshCw,
  Ship,
  Package,
  CheckCircle2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { 
  MovementLedgerEntry, 
  SparePart, 
  InboundReceiving, 
  OutboundDispatch, 
  MaterialReturn, 
  TransactionType 
} from "../types.js";

interface LedgerViewProps {
  movements: MovementLedgerEntry[];
  parts: SparePart[];
  receivingList?: InboundReceiving[];
  dispatchList?: OutboundDispatch[];
  materialReturns?: MaterialReturn[];
}

export default function LedgerView({ 
  movements, 
  parts, 
  receivingList = [], 
  dispatchList = [], 
  materialReturns = [] 
}: LedgerViewProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "in" | "out">("all");
  const [datePreset, setDatePreset] = useState<string>("ALL"); // "ALL" | "YYYY-MM" | "CUSTOM"
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  // 1. Build a unified, comprehensive array of movements from all transactions (Inbound, Outbound, Returns, Adjustments)
  const allUnifiedMovements = useMemo(() => {
    const list: MovementLedgerEntry[] = [];
    const seenKeys = new Set<string>();

    // A. Explicit / Stored Ledger Movements
    (movements || []).forEach((m, idx) => {
      if (!m) return;
      const key = `${m.transaction_type}_${m.reference_number}_${m.spare_part_id || m.part_number || idx}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        list.push({ ...m });
      }
    });

    // B. Inbound Receiving Transactions (Barang Masuk / Inbound)
    (receivingList || []).forEach((rec) => {
      if (!rec || !Array.isArray(rec.items)) return;
      const recDate = (rec.received_date || (rec as any).completion_date || rec.created_at || new Date().toISOString()).trim();
      const recVessel = rec.vessel_name || (rec.items[0] && (rec.items[0] as any).vessel_name) || "";
      const refCode = rec.purchase_order_num || rec.delivery_note_num || rec.spk_number || `PO-${rec.id}`;

      rec.items.forEach((item, itemIdx) => {
        if (!item) return;
        const qty = Number(item.qty_received ?? item.qty_ordered ?? 1);
        if (qty <= 0) return;

        const partId = item.spare_part_id || `part-${item.part_number || itemIdx}`;
        const key = `INBOUND_${refCode}_${partId}_${itemIdx}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const matchedPart = parts.find(p => p.id === partId || (p.part_number && p.part_number === item.part_number));
          
          list.push({
            id: `rec-mvt-${rec.id}-${itemIdx}`,
            transaction_type: TransactionType.RECEIVING,
            spare_part_id: matchedPart?.id || partId,
            spare_part_name: item.spare_part_name || matchedPart?.part_name || "Suku Cadang",
            part_number: item.part_number || matchedPart?.part_number || "-",
            vessel_name: (item as any).vessel_name || recVessel || "Gudang Utama",
            qty_in: qty,
            qty_out: 0,
            before_stock: 0,
            after_stock: matchedPart?.current_stock !== undefined ? matchedPart.current_stock : qty,
            reference_number: refCode,
            remarks: `Inbound PO | Vendor: ${rec.vendor_name || '-'} | DN: ${rec.delivery_note_num || '-'}${recVessel ? ` | Kapal: ${recVessel}` : ''} | Status: ${rec.status || 'ACCEPTED'}`,
            transaction_date: recDate,
            created_by: rec.received_by || rec.created_by || "Petugas Gudang"
          });
        }
      });
    });

    // C. Outbound Dispatch Transactions (Barang Keluar / Outbound TUG 8)
    (dispatchList || []).forEach((dsp) => {
      if (!dsp || !Array.isArray(dsp.items)) return;
      const dspDate = (dsp.dispatch_date || dsp.created_at || new Date().toISOString()).trim();
      const refCode = dsp.tug8_number || dsp.bon_pengeluaran_number || dsp.dispatch_number || dsp.surat_jalan_number || `TUG8-${dsp.id}`;

      dsp.items.forEach((item, itemIdx) => {
        if (!item) return;
        const qty = Number(item.qty_dispatched ?? (item as any).qty ?? item.qty_requested ?? 1);
        if (qty <= 0) return;

        const partId = item.spare_part_id || `part-${item.part_number || itemIdx}`;
        const key = `OUTBOUND_${refCode}_${partId}_${itemIdx}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const matchedPart = parts.find(p => p.id === partId || (p.part_number && p.part_number === item.part_number));
          
          list.push({
            id: `dsp-mvt-${dsp.id}-${itemIdx}`,
            transaction_type: TransactionType.DISPATCH,
            spare_part_id: matchedPart?.id || partId,
            spare_part_name: item.spare_part_name || (item as any).part_name || matchedPart?.part_name || "Suku Cadang",
            part_number: item.part_number || matchedPart?.part_number || "-",
            vessel_name: dsp.vessel_name || "-",
            qty_in: 0,
            qty_out: qty,
            before_stock: qty,
            after_stock: matchedPart?.current_stock !== undefined ? matchedPart.current_stock : 0,
            reference_number: refCode,
            remarks: `Outbound TUG 8 | Kapal: ${dsp.vessel_name || '-'} | Tujuan: ${dsp.delivery_destination || dsp.destination_port || 'Pelabuhan'} | Status: ${dsp.status || 'Completed'}`,
            transaction_date: dspDate,
            created_by: dsp.created_by || "Staff Gudang"
          });
        }
      });
    });

    // D. Material Returns Transactions (TUG 10 / Pengembalian Barang)
    (materialReturns || []).forEach((ret) => {
      if (!ret || !Array.isArray(ret.items)) return;
      const retDate = (ret.return_date || ret.created_at || new Date().toISOString()).trim();
      const refCode = ret.return_number || `TUG10-${ret.id}`;

      ret.items.forEach((item, itemIdx) => {
        if (!item) return;
        const qty = Number(item.qty_returned || 1);
        if (qty <= 0) return;

        const partId = item.spare_part_id || `part-${item.part_number || itemIdx}`;
        const key = `RETURN_${refCode}_${partId}_${itemIdx}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const matchedPart = parts.find(p => p.id === partId || (p.part_number && p.part_number === item.part_number));
          
          list.push({
            id: `ret-mvt-${ret.id}-${itemIdx}`,
            transaction_type: TransactionType.STOCK_ADJUSTMENT,
            spare_part_id: matchedPart?.id || partId,
            spare_part_name: item.spare_part_name || matchedPart?.part_name || "Suku Cadang Retur",
            part_number: item.part_number || matchedPart?.part_number || "-",
            vessel_name: ret.vessel_name || "-",
            qty_in: qty,
            qty_out: 0,
            before_stock: 0,
            after_stock: matchedPart?.current_stock !== undefined ? matchedPart.current_stock : qty,
            reference_number: refCode,
            remarks: `Pengembalian TUG 10 | Kapal: ${ret.vessel_name || '-'} | Alasan: ${item.return_reason || ret.remarks || 'Sisa Pekerjaan'}`,
            transaction_date: retDate,
            created_by: ret.created_by || "Chief Engineer"
          });
        }
      });
    });

    // Sort descending by transaction_date (most recent first)
    return list.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [movements, parts, receivingList, dispatchList, materialReturns]);

  // Extract all available months dynamically from movements list
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, number>();
    allUnifiedMovements.forEach(m => {
      if (!m) return;
      const d = (m.transaction_date || "").trim();
      if (d.length >= 7) {
        const ym = d.substring(0, 7); // "YYYY-MM"
        if (/^\d{4}-\d{2}/.test(ym)) {
          monthMap.set(ym, (monthMap.get(ym) || 0) + 1);
        }
      }
    });
    return Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allUnifiedMovements]);

  const formatMonthName = (ym: string) => {
    try {
      const [year, month] = ym.split("-");
      const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      const mIdx = parseInt(month, 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        return `${monthNames[mIdx]} ${year}`;
      }
      return ym;
    } catch {
      return ym;
    }
  };

  // Filtered movements based on search, type, and date range
  const filteredMovements = useMemo(() => {
    return allUnifiedMovements.filter((m) => {
      // 1. Date Filter
      const txDate = (m.transaction_date || "").trim().split("T")[0];
      if (datePreset !== "ALL" && datePreset !== "CUSTOM") {
        if (!txDate.startsWith(datePreset)) return false;
      }
      if (startDate && txDate && txDate < startDate) return false;
      if (endDate && txDate && txDate > endDate) return false;

      // 2. Type Filter
      const qtyVal = m.qty_in > 0 ? m.qty_in : -m.qty_out;
      const matchesType = 
        typeFilter === "all" || 
        (typeFilter === "in" && qtyVal > 0) ||
        (typeFilter === "out" && qtyVal < 0);
      if (!matchesType) return false;

      // 3. Search Filter
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const prt = parts.find((p) => p.id === m.spare_part_id);
      const prtName = (prt ? prt.part_name : m.spare_part_name || "").toLowerCase();
      const prtNum = (prt ? prt.part_number : m.part_number || "").toLowerCase();
      const refNum = (m.reference_number || "").toLowerCase();
      const creator = (m.created_by || "").toLowerCase();
      const remarks = (m.remarks || "").toLowerCase();
      const vessel = (m.vessel_name || "").toLowerCase();

      return (
        prtName.includes(q) ||
        prtNum.includes(q) ||
        refNum.includes(q) ||
        creator.includes(q) ||
        remarks.includes(q) ||
        vessel.includes(q)
      );
    });
  }, [allUnifiedMovements, parts, search, typeFilter, datePreset, startDate, endDate]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, datePreset, startDate, endDate]);

  // Overall Statistics for KPI Cards
  const stats = useMemo(() => {
    let inCount = 0;
    let outCount = 0;
    let inQty = 0;
    let outQty = 0;

    filteredMovements.forEach((m) => {
      if (m.qty_in > 0) {
        inCount++;
        inQty += m.qty_in;
      }
      if (m.qty_out > 0) {
        outCount++;
        outQty += m.qty_out;
      }
    });

    return {
      totalTransactions: filteredMovements.length,
      inCount,
      outCount,
      inQty,
      outQty,
      netDelta: inQty - outQty
    };
  }, [filteredMovements]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / itemsPerPage));
  const paginatedMovements = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMovements.slice(start, start + itemsPerPage);
  }, [filteredMovements, currentPage, itemsPerPage]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredMovements.length === 0) {
      alert("Tidak ada data pergerakan stok untuk diexport.");
      return;
    }

    const headers = [
      "No",
      "Tanggal & Waktu",
      "No. Dokumen / Referensi",
      "Arah Pergerakan",
      "Nama Suku Cadang",
      "Part Number",
      "Kapal / Armada",
      "Qty Masuk (Inbound)",
      "Qty Keluar (Outbound)",
      "Saldo Akhir",
      "Petugas / Operator",
      "Keterangan & Detail"
    ];

    const rows = filteredMovements.map((m, idx) => {
      const correlatedPart = parts.find(p => p.id === m.spare_part_id);
      const isPositive = m.qty_in > 0;
      const partName = correlatedPart ? correlatedPart.part_name : (m.spare_part_name || "-");
      const partNumber = correlatedPart ? correlatedPart.part_number : (m.part_number || "-");

      return [
        idx + 1,
        `"${new Date(m.transaction_date).toLocaleString("id-ID")}"`,
        `"${m.reference_number || '-'}"`,
        isPositive ? "INBOUND (+)" : "OUTBOUND (-)",
        `"${partName.replace(/"/g, '""')}"`,
        `"${partNumber.replace(/"/g, '""')}"`,
        `"${(m.vessel_name || '-').replace(/"/g, '""')}"`,
        m.qty_in || 0,
        m.qty_out || 0,
        m.after_stock !== undefined ? m.after_stock : "-",
        `"${(m.created_by || '-').replace(/"/g, '""')}"`,
        `"${(m.remarks || '-').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Stock_Ledger_Trail_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 gap-5 overflow-y-auto font-sans bg-slate-50 min-h-0 selection:bg-blue-100">
      
      {/* Module Title Header */}
      <div className="shrink-0 no-print flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-[10.5px] font-mono uppercase text-slate-400 font-bold mb-0.5">
            <span>Inventory System</span>
            <span>/</span>
            <span className="text-blue-600 font-bold">Audit Trail</span>
          </div>
          <h1 className="text-lg sm:text-xl font-black font-mono tracking-tight text-slate-900 uppercase flex items-center gap-2.5">
            <History className="w-5 h-5 text-blue-600" />
            <span>Dynamic Stock Ledger Trail</span>
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5 max-w-2xl">
            Catatan log audit kriptografis berkelanjutan dari seluruh pergerakan penerimaan fisik barang (Inbound PO), pengeluaran kapal (Outbound TUG 8), serta retur gudang (TUG 10).
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            title="Download audit trail ke file CSV / Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 shrink-0 no-print">
        {/* Total Transaksi */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block truncate">
              Total Transaksi
            </span>
            <span className="text-base font-black text-slate-900 font-mono">
              {stats.totalTransactions.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-mono block">
              Pergerakan tercatat
            </span>
          </div>
        </div>

        {/* Total Inbound */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase text-emerald-700 font-bold block truncate">
              Inbound (Barang Masuk)
            </span>
            <span className="text-base font-black text-emerald-700 font-mono">
              +{stats.inQty.toLocaleString()} <span className="text-xs font-normal text-emerald-600">Unit</span>
            </span>
            <span className="text-[10px] text-emerald-600 font-mono block truncate">
              {stats.inCount}x Penerimaan PO
            </span>
          </div>
        </div>

        {/* Total Outbound */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase text-rose-700 font-bold block truncate">
              Outbound (Barang Keluar)
            </span>
            <span className="text-base font-black text-rose-700 font-mono">
              -{stats.outQty.toLocaleString()} <span className="text-xs font-normal text-rose-600">Unit</span>
            </span>
            <span className="text-[10px] text-rose-600 font-mono block truncate">
              {stats.outCount}x Dispatch TUG 8
            </span>
          </div>
        </div>

        {/* Net Movement */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase text-blue-700 font-bold block truncate">
              Net Perputaran Stok
            </span>
            <span className={`text-base font-black font-mono ${stats.netDelta >= 0 ? "text-blue-700" : "text-amber-700"}`}>
              {stats.netDelta >= 0 ? `+${stats.netDelta.toLocaleString()}` : stats.netDelta.toLocaleString()} <span className="text-xs font-normal text-slate-500">Unit</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono block truncate">
              Selisih Inbound vs Outbound
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Period Selection Bar */}
      <section className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-2xs flex flex-col gap-3.5 shrink-0 no-print">
        
        {/* Row 1: Search & Movement Type Pills */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama suku cadang, part number, No. PO, No. TUG 8, kapal, atau petugas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl text-xs pl-10 pr-4 py-2.5 w-full focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-sans shadow-2xs transition-colors"
            />
          </div>

          {/* Filtering dropdowns / pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-center font-mono text-xs">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 font-bold rounded-lg uppercase transition-all cursor-pointer ${
                typeFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All Movements ({allUnifiedMovements.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("in")}
              className={`px-3 py-1.5 font-bold rounded-lg uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                typeFilter === "in" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-emerald-700"
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>Inbound (+)</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("out")}
              className={`px-3 py-1.5 font-bold rounded-lg uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                typeFilter === "out" ? "bg-white text-rose-700 shadow-xs" : "text-slate-500 hover:text-rose-700"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              <span>Outbound (-)</span>
            </button>
          </div>

        </div>

        {/* Row 2: Periode Bulan & Tahun + Custom Date Picker (Matches Image 2 exactly) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1 text-[10px] font-extrabold font-mono">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" /> PERIODE BULAN & TAHUN:
              </span>

              <div className="relative flex items-center">
                <select
                  value={datePreset}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDatePreset(val);
                    if (val !== "CUSTOM") {
                      setStartDate("");
                      setEndDate("");
                    }
                  }}
                  className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold font-sans rounded-lg pl-3 pr-8 py-1.5 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer appearance-none"
                  title="Pilih Bulan & Tahun Periode Pergerakan Stok"
                >
                  <option value="ALL">Semua Periode ({allUnifiedMovements.length} Data)</option>
                  {availableMonths.map(([ym, count]) => (
                    <option key={ym} value={ym}>
                      {formatMonthName(ym)} ({count} Data)
                    </option>
                  ))}
                  {datePreset === "CUSTOM" && (
                    <option value="CUSTOM">Rentang Tanggal Kustom</option>
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1.5 ml-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("CUSTOM");
                }}
                className="bg-white border border-slate-200 rounded px-2 py-1 text-[11px] font-mono font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                title="Tanggal Pergerakan Stok Dari"
              />
              <span className="text-[11px] font-mono text-slate-400 font-bold">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("CUSTOM");
                }}
                className="bg-white border border-slate-200 rounded px-2 py-1 text-[11px] font-mono font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                title="Tanggal Pergerakan Stok Sampai"
              />
            </div>

            {(datePreset !== "ALL" || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setDatePreset("ALL");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-[10.5px] font-mono font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
                title="Reset Filter Tanggal"
              >
                ✕ Reset
              </button>
            )}
          </div>

          {/* Real-time counter pill */}
          <div className="text-[10.5px] text-slate-500 font-mono tracking-wider font-extrabold uppercase flex items-center gap-2">
            <Boxes className="w-3.5 h-3.5 text-blue-600" />
            <span>Menampilkan <strong className="text-slate-900 font-black">{filteredMovements.length}</strong> dari {allUnifiedMovements.length} Transaksi Stok</span>
          </div>
        </div>

      </section>

      {/* Ledger Audit Table Container */}
      <section className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col overflow-hidden min-h-[400px]">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2 text-slate-800">
            <History className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-black uppercase font-mono tracking-wider">
              Immutability check logs (Auditable transactions)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
            <span>Tampilkan:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value={10}>10 baris</option>
              <option value={25}>25 baris</option>
              <option value={50}>50 baris</option>
              <option value={100}>100 baris</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredMovements.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                <Boxes className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold font-mono text-slate-700 uppercase">
                Tidak ada riwayat pergerakan stok
              </h3>
              <p className="text-xs text-slate-400 font-sans max-w-md mx-auto leading-relaxed">
                {search || datePreset !== "ALL" || startDate || endDate
                  ? "Tidak ditemukan data transaksi yang sesuai dengan filter pencarian dan periode tanggal yang dipilih."
                  : "Belum ada transaksi penerimaan (inbound) atau pengeluaran (outbound) yang terdaftar di sistem."}
              </p>
              {(search || datePreset !== "ALL" || startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setDatePreset("ALL");
                    setStartDate("");
                    setEndDate("");
                    setTypeFilter("all");
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono font-bold cursor-pointer"
                >
                  Reset Semua Filter
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100/75 border-b border-slate-200 text-[10.5px] font-mono font-extrabold uppercase text-slate-500 tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                <tr>
                  <th className="px-4 py-3">Waktu (WIB)</th>
                  <th className="px-4 py-3">Suku Cadang & Item</th>
                  <th className="px-3 py-3 text-center">Arah</th>
                  <th className="px-4 py-3 text-right">Delta Qty</th>
                  <th className="px-4 py-3 text-right">Saldo Stok</th>
                  <th className="px-4 py-3">No. Referensi</th>
                  <th className="px-4 py-3">Armada / Kapal</th>
                  <th className="px-4 py-3">Petugas</th>
                  <th className="px-5 py-3">Keterangan / Rincian Transaksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {paginatedMovements.map((move) => {
                  const correlatedPart = parts.find(p => p.id === move.spare_part_id || (p.part_number && p.part_number === move.part_number));
                  const qtyVal = move.qty_in > 0 ? move.qty_in : -move.qty_out;
                  const isPositive = qtyVal > 0;
                  const partName = correlatedPart ? correlatedPart.part_name : (move.spare_part_name || "Suku Cadang");
                  const partNum = correlatedPart ? correlatedPart.part_number : (move.part_number || "-");
                  const partSku = correlatedPart ? correlatedPart.sku : "-";
                  const partUnit = correlatedPart ? correlatedPart.unit : "PCS";

                  return (
                    <tr key={move.id} className="hover:bg-slate-50/90 transition-colors">
                      
                      {/* Timestamp */}
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        <div className="font-bold text-slate-800">
                          {new Date(move.transaction_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(move.transaction_date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                        </div>
                      </td>

                      {/* Spare Name & Details */}
                      <td className="px-4 py-3 min-w-[200px] max-w-xs">
                        <div className="font-bold text-slate-900 leading-snug">
                          {partName}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-[9.5px] bg-slate-100 text-slate-600 px-1.5 py-0.5 font-mono rounded font-medium border border-slate-200">
                            PN: {partNum}
                          </span>
                          {partSku !== "-" && (
                            <span className="text-[9.5px] bg-blue-50 text-blue-700 px-1.5 py-0.5 font-mono rounded font-medium border border-blue-200/50">
                              {partSku}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Direction Icon Badge */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black font-mono uppercase inline-flex items-center gap-1 border shadow-2xs ${
                          isPositive 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300" 
                            : "bg-rose-50 text-rose-700 border-rose-300"
                        }`}>
                          {isPositive ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600 shrink-0" />
                              INBOUND (+)
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-rose-600 shrink-0" />
                              OUTBOUND (-)
                            </>
                          )}
                        </span>
                      </td>

                      {/* Quantity Delta */}
                      <td className={`px-4 py-3 text-right font-mono font-black text-xs whitespace-nowrap ${
                        isPositive ? "text-emerald-700" : "text-rose-600"
                      }`}>
                        {isPositive ? `+${move.qty_in}` : `-${move.qty_out}`} {partUnit}
                      </td>

                      {/* Running Balance */}
                      <td className="px-4 py-3 text-right font-mono text-slate-800 font-bold whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
                          {move.after_stock !== undefined ? move.after_stock : (correlatedPart?.current_stock || 0)} {partUnit}
                        </span>
                      </td>

                      {/* Reference Code with Copy button */}
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span 
                            className="text-blue-700 font-bold hover:underline cursor-pointer"
                            onClick={() => copyToClipboard(move.reference_number)}
                            title="Klik untuk salin No. Referensi"
                          >
                            {move.reference_number || "-"}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(move.reference_number)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            title="Salin No. Referensi"
                          >
                            {copiedCode === move.reference_number ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Vessel / Kapal */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                          <Ship className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-bold truncate max-w-[140px]">
                            {move.vessel_name || "Gudang Utama Merak"}
                          </span>
                        </div>
                      </td>

                      {/* Operator */}
                      <td className="px-4 py-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                        {move.created_by || "Petugas Gudang"}
                      </td>

                      {/* Remarks */}
                      <td className="px-5 py-3 text-slate-600 text-[11.5px] leading-relaxed max-w-sm">
                        <span className="line-clamp-2" title={move.remarks}>
                          {move.remarks || "—"}
                        </span>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {filteredMovements.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-600">
            <div>
              Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredMovements.length)} dari {filteredMovements.length} transaksi
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer font-bold flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              <span className="px-3 py-1 font-bold text-slate-900">
                Halaman {currentPage} dari {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer font-bold flex items-center gap-1"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
