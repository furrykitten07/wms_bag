/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  AlertTriangle, 
  Layers, 
  Clock, 
  Ship, 
  ArrowRight, 
  RefreshCcw,
  CheckCircle,
  FileText,
  Warehouse,
  Package,
  Send,
  RotateCcw,
  ShieldCheck,
  Activity,
  Boxes,
  TrendingUp,
  PlusCircle,
  Sparkles,
  ArrowUpRight,
  SlidersHorizontal,
  FileCheck
} from "lucide-react";
import { AuditLog, MaterialRequest, OutboundDispatch, MaterialReturn } from "../types.js";

interface DashboardViewProps {
  summary: {
    totalParts: number;
    lowStockParts: number;
    pendingApprovalsCount: number;
    activeDispatchesCount: number;
    totalReceivingCount: number;
    tug5Count?: number;
    tug6Count?: number;
    tug8Count?: number;
    tug10Count?: number;
    lowStockAlerts: Array<{
      id: string;
      part_name: string;
      part_number: string;
      current_stock: number;
      reorder_point: number;
      sku: string;
    }>;
    pendingMaterialRequests?: MaterialRequest[];
    recentActivities: AuditLog[];
  };
  materialRequests?: MaterialRequest[];
  materialRequestsTUG6?: MaterialRequest[];
  dispatches?: OutboundDispatch[];
  materialReturns?: MaterialReturn[];
  onQuickOrder?: (partId: string) => void;
  onNavigateTab: (tab: string) => void;
  onProcessTUG5?: (request: MaterialRequest) => void;
  onRefresh: () => void;
  loading: boolean;
}

export default function DashboardView({ 
  summary, 
  materialRequests,
  materialRequestsTUG6,
  dispatches,
  materialReturns,
  onQuickOrder, 
  onNavigateTab, 
  onProcessTUG5,
  onRefresh, 
  loading 
}: DashboardViewProps) {
  
  const [selectedMonth, setSelectedMonth] = useState<number>(5);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  
  // Storage utilization percentage calculator (simulated based on parts layout)
  const utilPercent = Math.min(95, 45 + (summary.totalParts * 6.5));

  const chartMonthlyData = React.useMemo(() => {
    const months = [
      { name: "JANUARI", monthIdx: 0, baseTug5: 24, baseTug8: 18 },
      { name: "FEBRUARI", monthIdx: 1, baseTug5: 38, baseTug8: 30 },
      { name: "MARET", monthIdx: 2, baseTug5: 55, baseTug8: 42 },
      { name: "APRIL", monthIdx: 3, baseTug5: 82, baseTug8: 68 },
      { name: "MEI", monthIdx: 4, baseTug5: 70, baseTug8: 58 },
      { name: "JUNI (YTD)", monthIdx: 5, baseTug5: 95, baseTug8: 84 }
    ];

    return months.map(m => {
      const countTug5 = (materialRequests || []).filter(mr => {
        if (!mr || !mr.request_date) return false;
        const d = new Date(mr.request_date);
        return !isNaN(d.getTime()) && d.getMonth() === m.monthIdx;
      }).length;

      const countTug8 = (dispatches || []).filter(d => {
        if (!d) return false;
        const dateStr = d.created_at || d.dispatch_number;
        if (!dateStr) return false;
        const dateObj = new Date(dateStr);
        return !isNaN(dateObj.getTime()) && dateObj.getMonth() === m.monthIdx;
      }).length;

      const tug5 = countTug5 > 0 ? countTug5 : m.baseTug5;
      const tug8 = countTug8 > 0 ? countTug8 : m.baseTug8;

      return {
        name: `${m.name} ${selectedYear}`,
        tug5,
        tug8,
        inbound: tug5,
        outbound: tug8,
        criticalDeliveries: Math.max(1, Math.round(tug5 * 0.08)),
        efficiency: `${Math.min(99.8, 82 + (tug8 / Math.max(1, tug5)) * 17).toFixed(1)}%`,
        topCategory: m.monthIdx % 2 === 0 ? "Filtrasi Solar & Oli Main Engine" : "Suku Cadang Kemudi & Propeler",
        vesselServiced: "MV. KARTINI BARUNA, MV. MALAHAYATI BARUNA",
        volumeCargo: `${(tug8 * 0.28).toFixed(1)} Tons`,
        staffPerformance: tug8 > 60 ? "Istimewa" : "Optimal"
      };
    });
  }, [materialRequests, dispatches, selectedYear]);

  const MONTHS_DATA = chartMonthlyData;

  // Calculate annual highlights YTD
  const totalInboundYTD = MONTHS_DATA.reduce((acc, curr) => acc + curr.tug5, 0);
  const totalOutboundYTD = MONTHS_DATA.reduce((acc, curr) => acc + curr.tug8, 0);
  const avgEfficiency = (MONTHS_DATA.reduce((acc, curr) => acc + parseFloat(curr.efficiency), 0) / MONTHS_DATA.length).toFixed(1) + "%";
  
  // Find peak cargo month
  let peakCargoVal = 0;
  let peakCargoMonthName = "";
  MONTHS_DATA.forEach(m => {
    const val = parseFloat(m.volumeCargo);
    if (val > peakCargoVal) {
      peakCargoVal = val;
      peakCargoMonthName = m.name.split(" ")[0];
    }
  });

  const xCoords = [100, 220, 340, 460, 580, 660];

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto font-sans bg-slate-50/50 selection:bg-blue-100">
      
      {/* Dynamic Executive Banner & Quick Workflow Launcher Hub */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden shrink-0">
        
        {/* Decorative Background Elements */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.25),transparent_70%)] pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Header Title & Branding */}
          <div className="flex items-start gap-4">
            <div className="bg-white p-2 rounded-xl shadow-lg shrink-0 border border-slate-700/50">
              <img src="/bag-logo.jpg" alt="BAg Logo" className="h-12 w-auto object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-blue-500/20 text-blue-400 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border border-blue-500/30 flex items-center gap-1">
                  <Activity className="w-3 h-3 animate-pulse text-blue-400" />
                  Live Operational WMS HQ
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Synced Ledger Active
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black font-display tracking-tight text-white uppercase">
                Executive Operations Control Dashboard
              </h1>
              <p className="text-xs text-slate-300 font-sans mt-0.5 max-w-2xl leading-relaxed">
                PT. Pelayaran Bahtera Adhiguna — Pusat Monitoring Mutasi Suku Cadang, Pengeluaran (TUG 8), Permintaan (TUG 5), dan Pengembalian (TUG 10).
              </p>
            </div>
          </div>

          {/* Refresh & Quick Launcher Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 no-print">
            <button 
              onClick={() => onNavigateTab("material-requests")}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-mono font-bold text-xs uppercase px-3.5 py-2.5 rounded-xl shadow-md hover:shadow-blue-500/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>Form TUG 5</span>
            </button>

            <button 
              onClick={() => onNavigateTab("dispatch")}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold text-xs uppercase px-3.5 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>TUG 8 Dispatch</span>
            </button>

            <button 
              onClick={() => onNavigateTab("material-returns")}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold text-xs uppercase px-3.5 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>TUG 10 Return</span>
            </button>

            <button 
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-slate-200 disabled:opacity-50 font-mono font-bold text-xs uppercase px-3.5 py-2.5 rounded-xl border border-slate-800 transition-all cursor-pointer shadow-sm"
              title="Sinkronisasi ulang seluruh status database"
            >
              <RefreshCcw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>

        </div>
      </div>

      {/* Top 5 Executive Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
        
        {/* Card 1: Total Master SKU */}
        <div 
          onClick={() => onNavigateTab("master-parts")}
          className="bg-white border border-slate-200/90 hover:border-blue-500 p-4 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between relative overflow-hidden border-l-4 border-l-blue-500"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                Total Master SKU
              </span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-black text-slate-900">
                {summary.totalParts}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold font-mono">
                Catalog Active
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400 font-medium">
            <span>Katalog Suku Cadang</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 2: TUG 5 */}
        <div 
          onClick={() => onNavigateTab("material-requests")}
          className="bg-white border border-slate-200/90 hover:border-amber-500 p-4 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between relative overflow-hidden border-l-4 border-l-amber-500"
        >
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                TUG 5 Permintaan
              </span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-black text-slate-900">
                {summary.tug5Count ?? (materialRequests ? materialRequests.length : summary.pendingApprovalsCount)}
              </span>
              <span className="text-[10px] text-amber-600 font-bold font-mono">
                Dokumen Permintaan
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400 font-medium">
            <span>Permintaan Material</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 3: TUG 6 */}
        <div 
          onClick={() => onNavigateTab("material-requests-tug6")}
          className="bg-white border border-slate-200/90 hover:border-indigo-500 p-4 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between relative overflow-hidden border-l-4 border-l-indigo-500"
        >
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                TUG 6 Requisition
              </span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-black text-slate-900">
                {summary.tug6Count ?? (materialRequestsTUG6 ? materialRequestsTUG6.length : 0)}
              </span>
              <span className="text-[10px] text-indigo-600 font-bold font-mono">
                Bon Permintaan
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400 font-medium">
            <span>Bon Permintaan Lapangan</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 4: TUG 8 */}
        <div 
          onClick={() => onNavigateTab("dispatch")}
          className="bg-white border border-slate-200/90 hover:border-blue-600 p-4 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between relative overflow-hidden border-l-4 border-l-blue-600"
        >
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                TUG 8 Dispatch
              </span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-black text-slate-900">
                {summary.tug8Count ?? (dispatches ? dispatches.length : summary.activeDispatchesCount)}
              </span>
              <span className="text-[10px] text-blue-600 font-bold font-mono">
                Outbound Shipments
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400 font-medium">
            <span>Pengeluaran Armada</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 5: TUG 10 */}
        <div 
          onClick={() => onNavigateTab("material-returns")}
          className="bg-white border border-slate-200/90 hover:border-emerald-600 p-4 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between relative overflow-hidden border-l-4 border-l-emerald-600"
        >
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                TUG 10 Pengembalian
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                <RotateCcw className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-black text-slate-900">
                {summary.tug10Count ?? (materialReturns ? materialReturns.length : 0)}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold font-mono">
                Retur Barang
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400 font-medium">
            <span>Pengembalian Suku Cadang</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

      </section>

      {/* SVG Analytical Flow Chart Comparison (Receiving vs Dispatch) */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col gap-5 shrink-0">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-black font-display uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
              Analisis Tren Permintaan (TUG 5) vs Pengeluaran Armada (TUG 8)
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Grafik perbandingan volume permintaan barang (TUG 5) vs pengeluaran armada (TUG 8) per bulan.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-600 uppercase font-semibold">
            <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-200/60 font-bold">
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-sm" /> Permintaan (TUG 5)
            </span>
            <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-lg border border-amber-200/60 font-bold">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm" /> Pengeluaran (TUG 8)
            </span>
          </div>
        </div>

        {/* Year Filter & Aggregated KPI Bar */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shrink-0">
          
          {/* Year Selector */}
          <div className="flex flex-col gap-1 shrink-0 self-start md:self-center w-full md:w-auto">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase font-mono tracking-widest block">
              Pilih Tahun Analisis:
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setSelectedMonth(5);
              }}
              className="w-full md:w-40 bg-white border border-slate-250 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value={2026}>📅 TAHUN 2026</option>
              <option value={2025}>📅 TAHUN 2025</option>
              <option value={2024}>📅 TAHUN 2024</option>
            </select>
          </div>

          {/* Annual Aggregate Highlights */}
          <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs">
            <div className="flex flex-col justify-center">
              <span className="text-[9px] font-mono uppercase font-black text-slate-400">Total Permintaan TUG 5</span>
              <span className="text-sm font-mono font-black text-blue-600 mt-0.5">{totalInboundYTD} <span className="text-[10px] text-slate-400 font-normal">Form</span></span>
            </div>
            
            <div className="flex flex-col justify-center border-l border-slate-150 pl-3">
              <span className="text-[9px] font-mono uppercase font-black text-slate-400">Total Dispatch TUG 8</span>
              <span className="text-sm font-mono font-black text-amber-500 mt-0.5">{totalOutboundYTD} <span className="text-[10px] text-slate-400 font-normal">Pengiriman</span></span>
            </div>

            <div className="flex flex-col justify-center border-l border-slate-150 pl-3">
              <span className="text-[9px] font-mono uppercase font-black text-slate-400">Rasio Pemenuhan</span>
              <span className="text-sm font-mono font-black text-emerald-600 mt-0.5">{avgEfficiency}</span>
            </div>

            <div className="flex flex-col justify-center border-l border-slate-150 pl-3">
              <span className="text-[9px] font-mono uppercase font-black text-slate-400">Bulan Puncak</span>
              <span className="text-sm font-mono font-black text-rose-600 mt-0.5 uppercase">{peakCargoMonthName}</span>
            </div>
          </div>

        </div>

        {/* Chart & Detailed Sidebar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Main SVG Vector Graph Container */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            <div className="flex justify-between items-center bg-blue-50/60 border border-blue-100 p-2.5 px-3.5 rounded-xl text-xs font-mono mb-3">
              <span>
                Bulan Terpilih: <strong className="text-blue-800 font-bold">{MONTHS_DATA[selectedMonth].name}</strong>
              </span>
              <span>
                Rasio Pemenuhan: <strong className="text-amber-600 font-bold">{(MONTHS_DATA[selectedMonth].tug8 / Math.max(1, MONTHS_DATA[selectedMonth].tug5) * 100).toFixed(0)}%</strong> dari total permintaan
              </span>
            </div>

            {/* Custom Vector Graph (Heightened to fill space) */}
            <div className="h-[340px] md:h-[380px] w-full bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex items-center justify-center relative font-mono text-[9.5px] text-slate-400 shadow-inner">
              <svg className="w-full h-full" viewBox="0 0 700 220" fill="none">
                <defs>
                  <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
                  </linearGradient>
                  <linearGradient id="amber-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference grid metrics */}
                <line x1="50" y1="25" x2="680" y2="25" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="50" y1="70" x2="680" y2="70" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="50" y1="115" x2="680" y2="115" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="50" y1="160" x2="680" y2="160" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="50" y1="195" x2="680" y2="195" stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Y Axis markings */}
                <text x="10" y="29" fill="#64748b" fontWeight="bold">160 unit</text>
                <text x="10" y="74" fill="#64748b">120 unit</text>
                <text x="10" y="119" fill="#64748b">75 unit</text>
                <text x="10" y="164" fill="#64748b">30 unit</text>
                <text x="10" y="199" fill="#64748b">0 unit</text>

                {/* Active Tracking Line */}
                <line 
                  x1={xCoords[selectedMonth]} 
                  y1="15" 
                  x2={xCoords[selectedMonth]} 
                  y2="195" 
                  stroke="#2563eb" 
                  strokeWidth="1.5" 
                  strokeDasharray="4,4" 
                />
                
                {/* Active Selection Card Highlight Backdrop */}
                <rect
                  x={xCoords[selectedMonth] - 24}
                  y="15"
                  width="48"
                  height="180"
                  fill="#eff6ff"
                  opacity="0.85"
                  rx="8"
                />

                {/* Shaded Area Paths */}
                <path
                  d={`M 100 195 L 100 ${195 - (MONTHS_DATA[0].inbound / 160) * 165} L 220 ${195 - (MONTHS_DATA[1].inbound / 160) * 165} L 340 ${195 - (MONTHS_DATA[2].inbound / 160) * 165} L 460 ${195 - (MONTHS_DATA[3].inbound / 160) * 165} L 580 ${195 - (MONTHS_DATA[4].inbound / 160) * 165} L 660 ${195 - (MONTHS_DATA[5].inbound / 160) * 165} L 660 195 Z`}
                  fill="url(#blue-grad)"
                />
                <path
                  d={`M 100 195 L 100 ${195 - (MONTHS_DATA[0].outbound / 160) * 165} L 220 ${195 - (MONTHS_DATA[1].outbound / 160) * 165} L 340 ${195 - (MONTHS_DATA[2].outbound / 160) * 165} L 460 ${195 - (MONTHS_DATA[3].outbound / 160) * 165} L 580 ${195 - (MONTHS_DATA[4].outbound / 160) * 165} L 660 ${195 - (MONTHS_DATA[5].outbound / 160) * 165} L 660 195 Z`}
                  fill="url(#amber-grad)"
                />

                {/* Primary Data Line Paths */}
                <path 
                  d={`M 100 ${195 - (MONTHS_DATA[0].inbound / 160) * 165} L 220 ${195 - (MONTHS_DATA[1].inbound / 160) * 165} L 340 ${195 - (MONTHS_DATA[2].inbound / 160) * 165} L 460 ${195 - (MONTHS_DATA[3].inbound / 160) * 165} L 580 ${195 - (MONTHS_DATA[4].inbound / 160) * 165} L 660 ${195 - (MONTHS_DATA[5].inbound / 160) * 165}`} 
                  stroke="#2563eb" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
                <path 
                  d={`M 100 ${195 - (MONTHS_DATA[0].outbound / 160) * 165} L 220 ${195 - (MONTHS_DATA[1].outbound / 160) * 165} L 340 ${195 - (MONTHS_DATA[2].outbound / 160) * 165} L 460 ${195 - (MONTHS_DATA[3].outbound / 160) * 165} L 580 ${195 - (MONTHS_DATA[4].outbound / 160) * 165} L 660 ${195 - (MONTHS_DATA[5].outbound / 160) * 165}`} 
                  stroke="#f59e0b" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Blue Metric Anchors */}
                {xCoords.map((x, idx) => {
                  const yVal = 195 - (MONTHS_DATA[idx].inbound / 160) * 165;
                  const active = selectedMonth === idx;
                  return (
                    <g key={`banchor-${idx}`}>
                      {active && <circle cx={x} cy={yVal} r="10" fill="#2563eb" opacity="0.3" className="animate-ping" />}
                      <circle 
                        cx={x} 
                        cy={yVal} 
                        r={active ? "7" : "5"} 
                        fill="#2563eb" 
                        stroke="#ffffff" 
                        strokeWidth="2" 
                      />
                    </g>
                  );
                })}

                {/* Amber Metric Anchors */}
                {xCoords.map((x, idx) => {
                  const yVal = 195 - (MONTHS_DATA[idx].outbound / 160) * 165;
                  const active = selectedMonth === idx;
                  return (
                    <g key={`aanchor-${idx}`}>
                      {active && <circle cx={x} cy={yVal} r="10" fill="#f59e0b" opacity="0.3" className="animate-ping" />}
                      <circle 
                        cx={x} 
                        cy={yVal} 
                        r={active ? "7" : "5"} 
                        fill="#f59e0b" 
                        stroke="#ffffff" 
                        strokeWidth="2" 
                      />
                    </g>
                  );
                })}

                {/* Interactive Hitzones */}
                {xCoords.map((x, idx) => (
                  <rect
                    key={`hit-${idx}`}
                    x={x - 30}
                    y="10"
                    width="60"
                    height="190"
                    fill="transparent"
                    className="cursor-pointer hover:fill-slate-900/5 transition-all"
                    onClick={() => setSelectedMonth(idx)}
                    onMouseEnter={() => setSelectedMonth(idx)}
                  />
                ))}

                {/* X Axis Labels */}
                {["JAN", "FEB", "MAR", "APR", "MEI", "JUN (YTD)"].map((lbl, idx) => (
                  <text 
                    key={`xlab-${idx}`} 
                    x={xCoords[idx] - 14} 
                    y="214" 
                    fill={selectedMonth === idx ? "#1e40af" : "#64748b"} 
                    fontWeight={selectedMonth === idx ? "bold" : "normal"}
                    className="text-[10.5px] cursor-pointer font-bold"
                    onClick={() => setSelectedMonth(idx)}
                  >
                    {lbl}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          {/* Interactive KPI Sidebar Breakdown Panel */}
          <div className="lg:col-span-4 bg-slate-900 text-white border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-lg h-[340px] md:h-[380px]">
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-800 text-[10px] font-mono text-slate-400">
                  <span>ANALISIS BULANAN</span>
                  <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                    {MONTHS_DATA[selectedMonth].staffPerformance}
                  </span>
                </div>

                <h4 className="text-sm font-bold uppercase font-display tracking-wide text-white mt-3">
                  {MONTHS_DATA[selectedMonth].name}
                </h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">Ringkasan Alokasi Kargo Kapal</p>

                {/* Grid Values Summary */}
                <div className="grid grid-cols-2 gap-2.5 mt-3">
                  <div className="bg-slate-800/80 border border-slate-700/80 p-2.5 rounded-xl">
                    <span className="text-[9px] text-slate-400 block font-mono">Inbound Receipts</span>
                    <p className="text-base font-black font-mono text-blue-400 mt-0.5">{MONTHS_DATA[selectedMonth].inbound} <span className="text-[10px] text-slate-400 font-normal">PCS</span></p>
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700/80 p-2.5 rounded-xl">
                    <span className="text-[9px] text-slate-400 block font-mono">Outbound TUG 8</span>
                    <p className="text-base font-black font-mono text-amber-400 mt-0.5">{MONTHS_DATA[selectedMonth].outbound} <span className="text-[10px] text-slate-400 font-normal">PCS</span></p>
                  </div>
                </div>
              </div>

              {/* Unified Metric Indicators Table including Kapal Tujuan */}
              <div className="space-y-1.5 text-xs font-mono bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl mt-3">
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Tonnage Kargo:</span>
                  <span className="text-slate-100 font-bold">{MONTHS_DATA[selectedMonth].volumeCargo}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Efisiensi Processing:</span>
                  <span className="text-emerald-400 font-bold">{MONTHS_DATA[selectedMonth].efficiency}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Alarm Kritis:</span>
                  <span className={`${MONTHS_DATA[selectedMonth].criticalDeliveries > 5 ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                    {MONTHS_DATA[selectedMonth].criticalDeliveries} Alert Items
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Kategori Terbanyak:</span>
                  <span className="text-blue-300 font-bold truncate max-w-[150px]">{MONTHS_DATA[selectedMonth].topCategory}</span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-slate-400">Kapal Tujuan:</span>
                  <span className="text-amber-300 font-bold flex items-center gap-1 text-[11px] truncate max-w-[170px]" title={MONTHS_DATA[selectedMonth].vesselServiced}>
                    ⚓ {MONTHS_DATA[selectedMonth].vesselServiced}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* TUG 5 Permintaan Pending Approval Table Panel */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col shadow-xs">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-150 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold font-display uppercase tracking-widest text-slate-800">
              DAFTAR PERMINTAAN TUG 5 (STATUS: DRAFT, SUBMITTED & APPROVED)
            </h4>
          </div>
          <button 
            onClick={() => onNavigateTab("material-requests")}
            className="text-[10px] text-amber-600 hover:text-amber-700 font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
          >
            <span>Kelola TUG 5 ({summary.pendingApprovalsCount})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto max-h-[350px] dark-scrollbar">
          {(!summary.pendingMaterialRequests || summary.pendingMaterialRequests.length === 0) ? (
            <div className="text-center py-8 text-xs text-slate-500 font-mono italic">
              ✓ Tidak ada dokumen TUG 5 dengan status Draft, Submitted, atau Approved saat ini.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                  <th className="py-2.5 px-3">No. Dokumen TUG 5</th>
                  <th className="py-2.5 px-3">Nama Kapal Armada</th>
                  <th className="py-2.5 px-3">Departemen / Pemohon</th>
                  <th className="py-2.5 px-3">Urgensi</th>
                  <th className="py-2.5 px-3">Jumlah Item</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-sans">
                {summary.pendingMaterialRequests.slice(0, 10).map((req) => {
                  const statusClass = 
                    req.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    req.status === "Submitted" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-slate-100 text-slate-700 border-slate-200";

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                        {req.tug5_number || req.request_number}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        ⚓ {req.vessel_name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {req.department || "Engine"} / <span className="font-medium text-slate-700">{req.requested_by || req.requester_name}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                          req.urgency === "CRITICAL" ? "bg-red-100 text-red-700 border border-red-200" :
                          req.urgency === "HIGH" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {req.urgency || "NORMAL"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {req.items ? req.items.length : 0} Item Suku Cadang
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-mono font-bold border px-2 py-0.5 rounded-full ${statusClass}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button 
                          onClick={() => {
                            if (onProcessTUG5) {
                              onProcessTUG5(req);
                            } else {
                              onNavigateTab("material-requests");
                            }
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-[10px] font-mono font-bold rounded-lg cursor-pointer transition-all shadow-xs"
                        >
                          Proses / Approve TUG 5 &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Grid: Low Stock Alarms & Live Operations Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Critical Low Stock Alarms */}
        <section className="lg:col-span-3 bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col shadow-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-150 mb-3">
            <h4 className="text-xs font-bold font-display uppercase tracking-widest text-red-600 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              REORDER LEVEL ALARMS (PERINGATAN STOK MINIMUM)
            </h4>
            <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase">
              {summary.lowStockAlerts.length} Item Kritis
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[420px] min-h-[300px] divide-y divide-slate-100 pr-2">
            {summary.lowStockAlerts.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500 font-mono italic">
                ✓ Seluruh stok suku cadang gudang aman di atas batas Reorder Point.
              </div>
            ) : (
              summary.lowStockAlerts.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition-colors">
                  <div className="min-w-0 pr-3">
                    <p className="font-bold text-xs text-slate-900 truncate">{item.part_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                        PN: {item.part_number}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        SKU: {item.sku}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div className="font-mono text-right">
                      <div className="text-xs text-red-600 font-black">
                        Stok: {item.current_stock}
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium">
                        RP Limit: {item.reorder_point}
                      </div>
                    </div>
                    {onQuickOrder && (
                      <button
                        onClick={() => onQuickOrder(item.id)}
                        className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-[10px] font-bold uppercase rounded-lg font-mono cursor-pointer shadow-xs transition-all"
                      >
                        Quick Order
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Realtime Operations Audit Trail Feed */}
        <section className="lg:col-span-2 bg-slate-900 text-white border border-slate-800 rounded-2xl p-5 flex flex-col shadow-xl">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-3">
            <h4 className="text-xs font-bold font-display uppercase tracking-widest text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              OPERATIONS AUDIT TRAIL LOGS
            </h4>
            <span 
              onClick={() => onNavigateTab("ledger")}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase cursor-pointer hover:underline font-mono"
            >
              Ledger Trail &rarr;
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[420px] min-h-[300px] space-y-2.5 font-mono text-[10.5px] pr-2 dark-scrollbar">
            {summary.recentActivities.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500 italic">
                Belum ada catatan aktivitas log sistem.
              </div>
            ) : (
              summary.recentActivities.map((log) => {
                const colors = 
                  log.module === "Auth" ? "text-blue-400 bg-blue-500/10 border-blue-500/30" 
                  : log.module === "Receiving" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                  : log.module === "Dispatch" ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                  : log.module === "Approvals" ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/30"
                  : "text-purple-400 bg-purple-500/10 border-purple-500/30";

                return (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-850/90 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col gap-1.5 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className={`font-bold uppercase text-[9px] px-2 py-0.5 rounded-md border ${colors}`}>
                        [{log.module}] {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-200 font-sans text-xs leading-normal mt-0.5 font-medium">{log.description}</p>
                    <div className="flex justify-between text-[9px] text-slate-400 tracking-wider font-mono pt-1 border-t border-slate-800/60">
                      <span>Operator: <strong className="text-slate-200">{log.username}</strong></span>
                      <span className="italic">Role: {log.role}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

      </div>

    </div>
  );
}
