/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  MovementLedgerEntry, 
  SparePart,
  TransactionType
} from "../types.js";
import { 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Printer, 
  RefreshCw, 
  Clock, 
  Layers, 
  Info,
  CheckCircle,
  Hash
} from "lucide-react";

interface ReportsViewProps {
  movements: MovementLedgerEntry[];
  parts: SparePart[];
  onPrintReport: (filteredMovements: MovementLedgerEntry[], stats: any, timeFilter: string) => void;
}

export default function ReportsView({ movements, parts, onPrintReport }: ReportsViewProps) {
  // Filters State
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "custom">("month");
  const [dateFrom, setDateFrom] = useState<string>(() => {
    // Default to 30 days ago
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  
  const [typeFilter, setTypeFilter] = useState<"all" | "in" | "out">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Get list of unique categories for filtration
  const categories = useMemo(() => {
    const list = parts.map(p => p.category);
    return ["all", ...Array.from(new Set(list))];
  }, [parts]);

  // Main filter calculation
  const filteredData = useMemo(() => {
    return movements.filter(m => {
      // 1. Time Filters
      const txDate = new Date(m.transaction_date);
      txDate.setHours(0, 0, 0, 0);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (timeFilter === "week") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        oneWeekAgo.setHours(0, 0, 0, 0);
        if (txDate < oneWeekAgo || txDate > now) return false;
      } else if (timeFilter === "month") {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(now.getDate() - 30);
        oneMonthAgo.setHours(0, 0, 0, 0);
        if (txDate < oneMonthAgo || txDate > now) return false;
      } else if (timeFilter === "custom") {
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          if (txDate < from) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (txDate > to) return false;
        }
      }

      // 2. Type Filter (Inbound vs Outbound)
      const qtyVal = m.qty_in > 0 ? m.qty_in : -m.qty_out;
      if (typeFilter === "in" && qtyVal <= 0) return false;
      if (typeFilter === "out" && qtyVal >= 0) return false;

      // 3. Category Filter
      if (categoryFilter !== "all") {
        const partInfo = parts.find(p => p.id === m.spare_part_id);
        if (!partInfo || partInfo.category !== categoryFilter) return false;
      }

      // 4. Search Filter (by part name, code, PO, or operator)
      if (searchQuery.trim() !== "") {
        const cleanQuery = searchQuery.toLowerCase();
        const matchesName = m.spare_part_name.toLowerCase().includes(cleanQuery);
        const matchesNum = m.part_number.toLowerCase().includes(cleanQuery);
        const matchesRef = m.reference_number.toLowerCase().includes(cleanQuery);
        const matchesUser = m.created_by.toLowerCase().includes(cleanQuery);
        const matchesRemarks = m.remarks ? m.remarks.toLowerCase().includes(cleanQuery) : false;

        if (!matchesName && !matchesNum && !matchesRef && !matchesUser && !matchesRemarks) {
          return false;
        }
      }

      return true;
    });
  }, [movements, parts, timeFilter, dateFrom, dateTo, typeFilter, categoryFilter, searchQuery]);

  // Aggregate stats based on filtered data
  const stats = useMemo(() => {
    let totalInQty = 0;
    let totalOutQty = 0;
    let totalInTransactions = 0;
    let totalOutTransactions = 0;

    filteredData.forEach(m => {
      if (m.qty_in > 0) {
        totalInQty += m.qty_in;
        totalInTransactions++;
      }
      if (m.qty_out > 0) {
        totalOutQty += m.qty_out;
        totalOutTransactions++;
      }
    });

    const netImpact = totalInQty - totalOutQty;

    // Find the most active item in the period
    const itemActivityMap: { [key: string]: { name: string; num: string; count: number } } = {};
    filteredData.forEach(m => {
      const current = itemActivityMap[m.spare_part_id] || { name: m.spare_part_name, num: m.part_number, count: 0 };
      current.count += (m.qty_in + m.qty_out);
      itemActivityMap[m.spare_part_id] = current;
    });

    let mostActiveItem = "Tidak ada mutasi";
    let maxActivity = 0;
    Object.keys(itemActivityMap).forEach(key => {
      if (itemActivityMap[key].count > maxActivity) {
        maxActivity = itemActivityMap[key].count;
        mostActiveItem = `${itemActivityMap[key].name} (${itemActivityMap[key].num})`;
      }
    });

    return {
      totalInQty,
      totalOutQty,
      totalInTransactions,
      totalOutTransactions,
      netImpact,
      mostActiveItem,
      totalCount: filteredData.length
    };
  }, [filteredData]);

  // Generate Date Trend data for gorgeous SVG-based Visual Dashboard
  const chartData = useMemo(() => {
    const datesMap: { [key: string]: { dateLabel: string; dateObj: Date; inQty: number; outQty: number } } = {};

    // Populate with last 10 days by default if filter is week, or group by days
    filteredData.forEach(m => {
      // YYYY-MM-DD
      const dateStr = m.transaction_date.split("T")[0];
      if (!datesMap[dateStr]) {
        const dObj = new Date(m.transaction_date);
        datesMap[dateStr] = {
          dateLabel: dObj.toLocaleDateString("id-ID", { month: "short", day: "numeric" }),
          dateObj: dObj,
          inQty: 0,
          outQty: 0
        };
      }
      datesMap[dateStr].inQty += m.qty_in;
      datesMap[dateStr].outQty += m.qty_out;
    });

    // Sort chronologically
    return Object.values(datesMap).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()).slice(-14); // limiting to last 14 active days for visual neatness
  }, [filteredData]);

  // Max value to scale our relative SVG chart neatly
  const maxChartVal = useMemo(() => {
    let max = 15;
    chartData.forEach(d => {
      if (d.inQty > max) max = d.inQty;
      if (d.outQty > max) max = d.outQty;
    });
    return Math.ceil(max * 1.15); // Add padding space on top
  }, [chartData]);

  // Direct CSV Export utility
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert("Tidak ada data laporan untuk diekspor.");
      return;
    }

    const headers = [
      "Tanggal",
      "Kategori",
      "Nama Suku Cadang",
      "Nomor Part",
      "Jumlah Masuk (In)",
      "Jumlah Keluar (Out)",
      "Nomor Referensi (PO/Vessel Request)",
      "Petugas Staff",
      "Remarks"
    ];

    const rows = filteredData.map(m => {
      const partInfo = parts.find(p => p.id === m.spare_part_id);
      return [
        new Date(m.transaction_date).toLocaleDateString("id-ID"),
        partInfo?.category || "Unknown",
        m.spare_part_name,
        m.part_number,
        m.qty_in || 0,
        m.qty_out || 0,
        m.reference_number,
        m.created_by,
        m.remarks || ""
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Mutasi_WMS_${timeFilter}_${typeFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTriggerPrint = () => {
    const textTimeFilter = timeFilter === "week" ? "7 Hari Terakhir" : timeFilter === "month" ? "30 Hari Terakhir" : `${dateFrom} s/d ${dateTo}`;
    onPrintReport(filteredData, {
      totalIn: stats.totalInQty,
      totalOut: stats.totalOutQty,
      netImpact: stats.netImpact,
      totalCount: stats.totalCount
    }, textTimeFilter);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 font-sans text-slate-800 p-6 space-y-6">
      
      {/* Header Titling */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-blue-600 bg-blue-105 px-2.5 py-0.5 rounded font-mono uppercase tracking-widest">
              Laporan & Analitik
            </span>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2.5 py-0.5 rounded font-mono">
              PT. PELAYARAN BAHTERA ADHIGUNA
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-display">
            Laporan Mutasi Barang Keluar Masuk Suku Cadang
          </h2>
          <p className="text-xs text-slate-500">
            Analisis rekrutmen logistik komparatif, volume pergudangan inbound QC, pengeluaran logistik kapal, dan audit jejak mutasi.
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2.5 shrink-0 no-print">
          <button 
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors rounded shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV (Excel)</span>
          </button>
          
          <button 
            type="button"
            onClick={handleTriggerPrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors rounded shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROL PANEL BAR - Minimal & Slick */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col gap-4 no-print select-none">
        <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs border-b border-slate-100 pb-3 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-blue-500" />
          <span>Panel Pemetaan Filter Mutasi</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* 1. Time Presets / Pickers */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
              Rentang Waktu Laporan
            </span>
            <div className="grid grid-cols-3 bg-slate-100 p-0.5 rounded border border-slate-200 text-xs text-center font-bold">
              <button 
                type="button"
                onClick={() => setTimeFilter("week")}
                className={`py-1.5 rounded cursor-pointer transition-all ${timeFilter === "week" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Minggu Ini
              </button>
              <button 
                type="button"
                onClick={() => setTimeFilter("month")}
                className={`py-1.5 rounded cursor-pointer transition-all ${timeFilter === "month" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Bulan Ini
              </button>
              <button 
                type="button"
                onClick={() => setTimeFilter("custom")}
                className={`py-1.5 rounded cursor-pointer transition-all ${timeFilter === "custom" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Kustom
              </button>
            </div>
          </div>

          {/* 2. Custom Date Pickers (Conditional relative to Custom active preset) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
              Parameter Tanggal {timeFilter !== "custom" && "(Non-Aktif)"}
            </span>
            <div className={`flex items-center gap-2 text-xs transition-opacity ${timeFilter !== "custom" ? "opacity-40 pointer-events-none" : ""}`}>
              <input 
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded px-2 py-1.5 text-xs focus:outline-none"
              />
              <span className="text-slate-400 font-bold font-mono">s/d</span>
              <input 
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded px-2 py-1.5 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* 3. Mutation Type */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
              Arah Aliran Logistik (Aliran)
            </span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Mutasi (Masuk & Keluar)</option>
              <option value="in">Barang Masuk Saja (Inbound / PO)</option>
              <option value="out">Barang Keluar Saja (Outbound / Supply)</option>
            </select>
          </div>

          {/* 4. Categorized Filters */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
              Filtrasi Kategori Suku Cadang
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none cursor-pointer capitalize"
            >
              <option value="all">Semua Kategori</option>
              {categories.filter(c => c !== "all").map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Global Text Search in panel */}
        <div className="relative pt-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input 
            type="text"
            placeholder="Cari laporan berdasarkan: Nama Part, SKU, Nomor Part, Referensi Dokumen PO / Surat Jalan, atau Staff Gudang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-blue-500 rounded-lg px-4 pl-10 py-2.5 text-xs focus:outline-none transition-all placeholder-slate-400"
          />
        </div>
      </div>

      {/* METRICS STATS SUMMARY CARDS (BENTO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Inbound volume */}
        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-xs space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Total Inbound Suku Cadang (Masuk)
            </span>
            <span className="p-1 px-1.5 bg-green-50 text-green-700 text-[9px] font-mono font-bold uppercase rounded flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              IN
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              +{stats.totalInQty}
            </span>
            <span className="text-xs text-slate-500 font-medium">SET/PCS</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Dari <strong className="text-slate-700">{stats.totalInTransactions} transaksi</strong> verifikasi QC Inbound gudang.
          </p>
        </div>

        {/* Card 2: Total Outbound volume */}
        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-xs space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Total Outbound Suku Cadang (Keluar)
            </span>
            <span className="p-1 px-1.5 bg-orange-50 text-orange-700 text-[9px] font-mono font-bold uppercase rounded flex items-center gap-0.5">
              <ArrowDownLeft className="w-3 h-3" />
              OUT
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              -{stats.totalOutQty}
            </span>
            <span className="text-xs text-slate-500 font-medium">SET/PCS</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Dari <strong className="text-slate-700">{stats.totalOutTransactions} transaksi</strong> pengeluaran bon logistik kapal.
          </p>
        </div>

        {/* Card 3: Net impact */}
        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-xs space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Dampak Bersih Stok (Net Impact)
            </span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold font-mono tracking-tight ${stats.netImpact >= 0 ? "text-green-600" : "text-amber-600"}`}>
              {stats.netImpact >= 0 ? `+${stats.netImpact}` : stats.netImpact}
            </span>
            <span className="text-xs text-slate-500 font-medium">SET/PCS</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Selisih barang masuk & keluar di storage BAG.
          </p>
        </div>

        {/* Card 4: Most active spare parts */}
        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-xs space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Suku Cadang Paling Aktif (Mutasi)
            </span>
            <Layers className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block truncate" title={stats.mostActiveItem}>
              {stats.mostActiveItem}
            </span>
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              Dipicu oleh fluktuasi logistik dalam filter aktif.
            </p>
          </div>
        </div>

      </div>

      {/* COMPREHENSIVE TREND GRAPHICS (CUSTOM SVG DESIGNS) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 mb-1">
            <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
            Grafik Visual: Tren Mutasi Barang Masuk vs Keluar Harian
          </h3>
          <p className="text-[11px] text-slate-400 leading-none">
            Diagram batang berpasangan mewakili intensitas volume barang masuk harian (hijau) disandingkan dengan volume keluar (amber).
          </p>
        </div>

        {chartData.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400">
            <Info className="w-6 h-6 text-slate-300 mb-2" />
            <p className="text-xs font-medium">Tidak ada data untuk rentang waktu yang dipilih dalam pembuatan tren grafik.</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            
            {/* The SVG Layout */}
            <div className="relative w-full overflow-x-auto select-none no-scrollbar">
              <svg 
                className="w-full min-w-[700px] h-48"
                viewBox="0 0 800 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Horizontal Guide Lines */}
                <line x1="40" y1="20" x2="780" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="40" y1="60" x2="780" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="40" y1="100" x2="780" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="140" x2="780" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="40" y1="170" x2="780" y2="170" stroke="#e2e8f0" strokeWidth="1" />

                {/* Y-Axis scale label */}
                <text x="35" y="25" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">{maxChartVal} Qty</text>
                <text x="35" y="105" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">0 Qty</text>
                <text x="35" y="175" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">Bottom</text>

                {/* Render Dual Bars */}
                {chartData.map((d, index) => {
                  const spacing = 740 / chartData.length;
                  const x = 50 + index * spacing;
                  
                  // Inbound calculation height
                  const inHeight = Math.max(2, (d.inQty / maxChartVal) * 130);
                  const inY = 170 - inHeight;

                  // Outbound calculation height (side by side)
                  const outHeight = Math.max(2, (d.outQty / maxChartVal) * 130);
                  const outY = 170 - outHeight;

                  return (
                    <g key={index} className="group cursor-pointer">
                      
                      {/* Hover Backdrop Box */}
                      <rect 
                        x={x - 10} 
                        y="10" 
                        width={spacing - 4} 
                        height="180" 
                        rx="4" 
                        className="fill-slate-500/0 hover:fill-slate-500/5 transition-colors" 
                      />

                      {/* Green Bar (Inbound) */}
                      <rect 
                        x={x} 
                        y={inY} 
                        width="10" 
                        height={inHeight} 
                        rx="2"
                        className="fill-emerald-500 brightness-100 hover:brightness-105 transition-all"
                      />

                      {/* Amber Bar (Outbound) */}
                      <rect 
                        x={x + 13} 
                        y={outY} 
                        width="10" 
                        height={outHeight} 
                        rx="2"
                        className="fill-amber-500 brightness-100 hover:brightness-105 transition-all"
                      />

                      {/* Day Label */}
                      <text 
                        x={x + 11} 
                        y="190" 
                        fill="#64748b" 
                        fontSize="9" 
                        fontWeight="bold" 
                        textAnchor="middle" 
                        fontFamily="monospace"
                      >
                        {d.dateLabel}
                      </text>

                      {/* Tooltip detail overlay displayed on hover (Tailwind control) */}
                      <title>{`Tanggal: ${d.dateLabel}\n- Masuk: +${d.inQty} PCS\n- Keluar: -${d.outQty} PCS`}</title>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend Indicators */}
            <div className="flex items-center justify-center gap-6 text-[10px] font-bold font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-600">Barang Masuk (Inbound / QC)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span className="text-slate-600">Barang Keluar (Outbound / Supply)</span>
              </span>
            </div>

          </div>
        )}

      </div>

      {/* DETAILED TRANSACTIONAL LEDGER WORK SHEET */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden flex-1 flex flex-col no-print-bg">
        
        {/* Table Title and Summary Count Banner */}
        <div className="px-5 py-4 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center text-blue-600">
              <Hash className="w-4 h-4" />
            </span>
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Rekapitulasi Mutasi Logistik Terpilih
              </h4>
              <p className="text-[11px] text-slate-500">
                Menemukan <strong className="text-slate-700">{filteredData.length} baris mutasi</strong> sesuai konfigurasi filter.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Periode: </span>
            <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-800 font-bold">
              {timeFilter === "week" ? "7 Hari Terakhir" : timeFilter === "month" ? "30 Hari Terakhir" : `${dateFrom} s/d ${dateTo}`}
            </span>
          </div>
        </div>

        {/* The Worksheet Table */}
        <div className="overflow-x-auto flex-1">
          {filteredData.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <Info className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-semibold">Tidak ditemukan entri mutasi barang keluar masuk.</p>
              <p className="text-[10px] text-slate-400">Harap sesuaikan rentang waktu, tipe filter atau kata kunci mesin pencarian Anda.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
              <thead className="bg-slate-100 border-b border-slate-250 text-[10px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                <tr>
                  <th className="px-4 py-3 text-center">TANGGAL</th>
                  <th className="px-4 py-3">NAMA SUKU CADANG</th>
                  <th className="px-4 py-3">KATEGORI</th>
                  <th className="px-4 py-3 text-center">ALIRAN MUTASI</th>
                  <th className="px-4 py-3">REF. DOKUMEN</th>
                  <th className="px-4 py-3">STAFF LOGISTIK</th>
                  <th className="px-4 py-3">KETERANGAN OPERATOR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredData.map((m) => {
                  const partInfo = parts.find(p => p.id === m.spare_part_id);
                  const isPositive = m.qty_in > 0;
                  const qtyChange = isPositive ? m.qty_in : m.qty_out;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* Readable Date Format */}
                      <td className="px-4 py-3 text-center font-mono text-[11px] text-slate-500">
                        {new Date(m.transaction_date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })} {new Date(m.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Part Information */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{m.spare_part_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">PN: {m.part_number}</div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 uppercase text-[10px] font-bold">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          {partInfo?.category || "Marine Component"}
                        </span>
                      </td>

                      {/* Mutable qty */}
                      <td className="px-4 py-3 text-center font-bold">
                        {isPositive ? (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[11px] font-mono">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            +{qtyChange} PCS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-105 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-mono">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            -{qtyChange} PCS
                          </span>
                        )}
                      </td>

                      {/* Reference code */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-blue-600 hover:underline select-all text-xs font-bold leading-none">
                          {m.reference_number}
                        </span>
                      </td>

                      {/* Logistic Officer */}
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-650">
                        {m.created_by}
                      </td>

                      {/* Remaks */}
                      <td className="px-4 py-3 italic text-slate-400 max-w-[200px] truncate" title={m.remarks}>
                        {m.remarks || "-"}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Printable Footer Section only displayed during physical or PDF prints */}
        <div className="hidden print:block border-t border-slate-400 pt-8 px-6 mt-8">
          <div className="grid grid-cols-3 text-center uppercase tracking-wider text-[9px] font-bold text-slate-700">
            <div className="flex flex-col justify-between h-20">
              <span>Dibuat Oleh (Staff Gudang):</span>
              <span className="border-t border-slate-300 pt-1">........................................</span>
            </div>
            <div className="flex flex-col justify-between h-20">
              <span>Diperiksa Oleh (Asisten Gudang):</span>
              <span className="border-t border-slate-300 pt-1">........................................</span>
            </div>
            <div className="flex flex-col justify-between h-20">
              <span>Disetujui Oleh (Superintendent):</span>
              <span className="border-t border-slate-300 pt-1">Capt. H. Wijaya</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
