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
  TrendingDown,
  Warehouse
} from "lucide-react";
import { AuditLog, UserRole } from "../types.js";

interface DashboardViewProps {
  summary: {
    totalParts: number;
    lowStockParts: number;
    pendingApprovalsCount: number;
    activeDispatchesCount: number;
    totalReceivingCount: number;
    lowStockAlerts: Array<{
      id: string;
      part_name: string;
      part_number: string;
      current_stock: number;
      reorder_point: number;
      sku: string;
    }>;
    recentActivities: AuditLog[];
  };
  onQuickOrder?: (partId: string) => void;
  onNavigateTab: (tab: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export default function DashboardView({ 
  summary, 
  onQuickOrder, 
  onNavigateTab, 
  onRefresh, 
  loading 
}: DashboardViewProps) {
  
  const [selectedMonth, setSelectedMonth] = useState<number>(5);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  
  // Storage utilization percentage calculator (simulated based on parts layout)
  const utilPercent = Math.min(95, 45 + (summary.totalParts * 6.5));

  const YEAR_DATA_MAP: Record<number, Array<{
    name: string;
    inbound: number;
    outbound: number;
    criticalDeliveries: number;
    efficiency: string;
    topCategory: string;
    vesselServiced: string;
    volumeCargo: string;
    staffPerformance: string;
  }>> = {
    2026: [
      {
        name: "JANUARI 2026",
        inbound: 45,
        outbound: 25,
        criticalDeliveries: 2,
        efficiency: "94.5%",
        topCategory: "Filtrasi Solar & Oli",
        vesselServiced: "KMP Bahtera 01, Citra Mulia 2",
        volumeCargo: "12.4 Tons",
        staffPerformance: "Optimal"
      },
      {
        name: "FEBRUARI 2026",
        inbound: 75,
        outbound: 50,
        criticalDeliveries: 4,
        efficiency: "96.2%",
        topCategory: "Injektor Bahan Bakar Mesin",
        vesselServiced: "Dharma Kartika, SPB Mahakam",
        volumeCargo: "18.9 Tons",
        staffPerformance: "Baik"
      },
      {
        name: "MARET 2026",
        inbound: 120,
        outbound: 65,
        criticalDeliveries: 5,
        efficiency: "95.8%",
        topCategory: "Karet Seal & Gasket Hidrolik",
        vesselServiced: "Bahtera Adhiguna 12, Citra 08",
        volumeCargo: "24.1 Tons",
        staffPerformance: "Optimal"
      },
      {
        name: "APRIL 2026",
        inbound: 150,
        outbound: 110,
        criticalDeliveries: 8,
        efficiency: "98.1%",
        topCategory: "Bilah Mekanis Turbin Propeler",
        vesselServiced: "KRI Banda Aceh, Meratus Spirit",
        volumeCargo: "35.6 Tons",
        staffPerformance: "Puncak"
      },
      {
        name: "MEI 2026",
        inbound: 135,
        outbound: 95,
        criticalDeliveries: 3,
        efficiency: "97.4%",
        topCategory: "Zinc Anode Proteksi Korosi",
        vesselServiced: "KMP Legundi, Marina Express",
        volumeCargo: "29.2 Tons",
        staffPerformance: "Baik"
      },
      {
        name: "JUNI 2026 (YTD)",
        inbound: 160,
        outbound: 145,
        criticalDeliveries: 11,
        efficiency: "99.2%",
        topCategory: "Suku Cadang Kemudi Makropuls",
        vesselServiced: "KRI Nanggala, KMP Port Link V",
        volumeCargo: "42.8 Tons",
        staffPerformance: "Istimewa"
      }
    ],
    2025: [
      {
        name: "JANUARI 2025",
        inbound: 38,
        outbound: 22,
        criticalDeliveries: 1,
        efficiency: "92.1%",
        topCategory: "Fluida Hidrolik & Pelumas",
        vesselServiced: "Citra Mulia 2, Dharma Kartika",
        volumeCargo: "10.1 Tons",
        staffPerformance: "Baik"
      },
      {
        name: "FEBRUARI 2025",
        inbound: 65,
        outbound: 45,
        criticalDeliveries: 3,
        efficiency: "94.8%",
        topCategory: "Suku Cadang Generator Listrik",
        vesselServiced: "SPB Mahakam, Bahtera 12",
        volumeCargo: "15.4 Tons",
        staffPerformance: "Optimal"
      },
      {
        name: "MARET 2025",
        inbound: 110,
        outbound: 80,
        criticalDeliveries: 2,
        efficiency: "96.4%",
        topCategory: "Paking Gasket & Karet Valve",
        vesselServiced: "KMP Bahtera 01, KMP Legundi",
        volumeCargo: "21.6 Tons",
        staffPerformance: "Optimal"
      },
      {
        name: "APRIL 2025",
        inbound: 130,
        outbound: 95,
        criticalDeliveries: 6,
        efficiency: "97.0%",
        topCategory: "Suku Cadang Turbin Utama",
        vesselServiced: "Citra 08, Meratus Spirit",
        volumeCargo: "30.2 Tons",
        staffPerformance: "Puncak"
      },
      {
        name: "MEI 2025",
        inbound: 125,
        outbound: 110,
        criticalDeliveries: 4,
        efficiency: "95.5%",
        topCategory: "Sistem Kemudi Kompresor",
        vesselServiced: "KMP Port Link V, Marina Express",
        volumeCargo: "27.8 Tons",
        staffPerformance: "Optimal"
      },
      {
        name: "JUNI 2025",
        inbound: 140,
        outbound: 130,
        criticalDeliveries: 9,
        efficiency: "98.3%",
        topCategory: "Pompa Air Laut Pendingin",
        vesselServiced: "KRI Banda Aceh, KRI Nanggala",
        volumeCargo: "38.1 Tons",
        staffPerformance: "Istimewa"
      }
    ],
    2024: [
      {
        name: "JANUARI 2024",
        inbound: 30,
        outbound: 18,
        criticalDeliveries: 0,
        efficiency: "90.4%",
        topCategory: "Filter Oli Mesin Genset",
        vesselServiced: "Bahtera 12, Citra Mulia 2",
        volumeCargo: "8.5 Tons",
        staffPerformance: "Standard"
      },
      {
        name: "FEBRUARI 2024",
        inbound: 50,
        outbound: 35,
        criticalDeliveries: 2,
        efficiency: "91.8%",
        topCategory: "Suku Cadang Pompa Solar",
        vesselServiced: "SPB Mahakam, Citro Express",
        volumeCargo: "12.8 Tons",
        staffPerformance: "Baik"
      },
      {
        name: "MARET 2024",
        inbound: 95,
        outbound: 60,
        criticalDeliveries: 4,
        efficiency: "93.9%",
        topCategory: "Kabel Terminal & Listrik",
        vesselServiced: "Citra 08, KMP Bahtera 01",
        volumeCargo: "19.3 Tons",
        staffPerformance: "Optimal"
      },
      {
        name: "APRIL 2024",
        inbound: 115,
        outbound: 85,
        criticalDeliveries: 5,
        efficiency: "95.2%",
        topCategory: "Bilah Turbin & Seal Ring",
        vesselServiced: "KMP Legundi, Meratus Spirit",
        volumeCargo: "25.0 Tons",
        staffPerformance: "Optimal"
      },
      {
        name: "MEI 2024",
        inbound: 105,
        outbound: 90,
        criticalDeliveries: 2,
        efficiency: "94.1%",
        topCategory: "Zinc Anode Anti Karat",
        vesselServiced: "Marina Express, Citra Mulia 2",
        volumeCargo: "23.4 Tons",
        staffPerformance: "Baik"
      },
      {
        name: "JUNI 2024",
        inbound: 125,
        outbound: 115,
        criticalDeliveries: 7,
        efficiency: "97.1%",
        topCategory: "Kompresor Udara Kemudi",
        vesselServiced: "KRI Banda Aceh, Dharma Kartika",
        volumeCargo: "32.9 Tons",
        staffPerformance: "Puncak"
      }
    ]
  };

  const MONTHS_DATA = YEAR_DATA_MAP[selectedYear] || YEAR_DATA_MAP[2026];

  // Calculate annual highlights YTD
  const totalInboundYTD = MONTHS_DATA.reduce((acc, curr) => acc + curr.inbound, 0);
  const totalOutboundYTD = MONTHS_DATA.reduce((acc, curr) => acc + curr.outbound, 0);
  const avgEfficiency = (MONTHS_DATA.reduce((acc, curr) => acc + parseFloat(curr.efficiency), 0) / MONTHS_DATA.length).toFixed(1) + "%";
  
  // Find peak cargo month
  let peakCargoVal = 0;
  let peakCargoMonthName = "";
  MONTHS_DATA.forEach(m => {
    const val = parseFloat(m.volumeCargo);
    if (val > peakCargoVal) {
      peakCargoVal = val;
      peakCargoMonthName = m.name.split(" ")[0]; // just month name e.g. "JUNI"
    }
  });

  const xCoords = [100, 220, 340, 460, 580, 660];

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto font-sans selection:bg-blue-100">
      
      {/* Title block with refresh action */}
      <div className="flex items-center justify-between shrink-0 no-print">
        <div>
          <h1 className="text-xl font-bold font-display tracking-tight text-slate-900 uppercase">
            Maritime Operations Hub Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono uppercase tracking-wider">
            Consolidated stock levels, vessel requests approval flow, and audit trail ledger
          </p>
        </div>
        <button 
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold uppercase text-[10px] px-3 py-2 rounded transition-colors self-center shadow-xs cursor-pointer font-mono"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Realtime States</span>
        </button>
      </div>

      {/* Top Professional ERP Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        
        <div 
          onClick={() => onNavigateTab("master-parts")}
          className="bg-white border border-slate-200 p-4 rounded-md shadow-xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Total SKU Managed
            </p>
            <Layers className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-mono font-bold tracking-tight text-slate-800">
              {summary.totalParts}
            </span>
            <span className="text-xs text-green-600 mb-1 font-medium font-mono leading-none">
              In Storage
            </span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab("master-parts")}
          className={`bg-white border border-slate-200 p-4 rounded-md shadow-xs hover:border-red-400 transition-all cursor-pointer group border-l-4 ${
            summary.lowStockParts > 0 ? "border-l-red-500" : "border-l-slate-350"
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Critical Low Stock
            </p>
            <AlertTriangle className={`w-4 h-4 ${summary.lowStockParts > 0 ? "text-red-500" : "text-slate-400"}`} />
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-2xl font-mono font-bold tracking-tight ${summary.lowStockParts > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {summary.lowStockParts}
            </span>
            <span className="text-xs text-slate-400 mb-1 font-mono leading-none">
              Requires Inbound PO
            </span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab("material-requests")}
          className="bg-white border border-slate-200 p-4 rounded-md shadow-xs hover:border-amber-400 transition-all cursor-pointer group border-l-4 border-l-amber-400"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Pending Requisitions
            </p>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-mono font-bold tracking-tight text-slate-800">
              {summary.pendingApprovalsCount}
            </span>
            <span className="text-[10px] text-zinc-400 mb-1 truncate max-w-[130px] font-mono leading-none">
              Vessel Requisitions
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-md shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Depot Utilization
            </p>
            <Warehouse className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-mono font-bold tracking-tight text-slate-800">
              {utilPercent.toFixed(1)}%
            </span>
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden max-w-[80px]">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${utilPercent > 80 ? 'bg-amber-500' : 'bg-blue-600'}`}
                style={{ width: `${utilPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

      </section>

      {/* SVG Analytical Flow Chart Comparison (Receiving vs Dispatch) */}
      <section className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-col gap-4 shrink-0 transition-all">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              Cargo Flow Activity Analysis
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              Inbound receipts (PO check receipts) vs outbound dispatched vessel supplies &bull; Click/hover points for full rincian detil
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10.5px] font-mono text-slate-600 uppercase font-semibold">
            <span className="flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              <span className="w-2.5 h-1.5 bg-blue-600 rounded"></span> Inbound Receipts
            </span>
            <span className="flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
              <span className="w-2.5 h-1.5 bg-amber-500 rounded"></span> Outbound Dispatched
            </span>
          </div>
        </div>

        {/* Modern Interactive Year Filter & Compact Summary Highlights */}
        <div className="bg-slate-50/80 border border-slate-150 rounded-lg p-3.5 flex flex-col md:flex-row gap-4 justify-between items-center shrink-0">
          
          {/* Year selector dropdown */}
          <div className="flex flex-col gap-1.5 shrink-0 self-start md:self-center w-full md:w-auto">
            <label className="text-[9px] uppercase font-bold text-slate-450 font-mono tracking-widest block">
              PILIH TAHUN ANALISIS:
            </label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setSelectedMonth(5); // Reset to latest month on change
                }}
                className="w-full md:w-36 bg-white border border-slate-200/80 hover:border-slate-350 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-700 shadow-sm hover:shadow transition-all duration-150 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none pr-8"
              >
                <option value={2026}>📅 TAHUN 2026</option>
                <option value={2025}>📅 TAHUN 2025</option>
                <option value={2024}>📅 TAHUN 2024</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Compact Year aggregates */}
          <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-slate-150 p-2.5 rounded-lg shadow-2xs">
            <div className="flex flex-col justify-center">
              <span className="text-[8px] font-mono uppercase font-black text-slate-400">Inbound YTD ({selectedYear})</span>
              <span className="text-[13px] font-mono font-black text-blue-600 mt-0.5">{totalInboundYTD} <span className="text-[9px] text-slate-400 font-normal">PCS</span></span>
            </div>
            
            <div className="flex flex-col justify-center border-l border-slate-150 pl-3">
              <span className="text-[8px] font-mono uppercase font-black text-slate-400">Outbound YTD ({selectedYear})</span>
              <span className="text-[13px] font-mono font-black text-amber-500 mt-0.5">{totalOutboundYTD} <span className="text-[9px] text-slate-400 font-normal">PCS</span></span>
            </div>

            <div className="flex flex-col justify-center border-l border-slate-150 pl-3">
              <span className="text-[8px] font-mono uppercase font-black text-slate-400">Rasio Efisiensi</span>
              <span className="text-[13px] font-mono font-black text-emerald-600 mt-0.5">{avgEfficiency}</span>
            </div>

            <div className="flex flex-col justify-center border-l border-slate-150 pl-3">
              <span className="text-[8px] font-mono uppercase font-black text-slate-400">Bulan Puncak</span>
              <span className="text-[13px] font-mono font-black text-rose-600 mt-0.5 uppercase">{peakCargoMonthName}</span>
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Main Chart (Left Side) */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            <div className="flex justify-between items-center bg-slate-100 p-2 px-3 rounded text-[10px] font-mono mb-2">
              <span>
                Bulan Terpilih: <strong className="text-blue-700 font-bold">{MONTHS_DATA[selectedMonth].name}</strong>
              </span>
              <span>
                Rasio Penyaluran: <strong className="text-amber-600">{(MONTHS_DATA[selectedMonth].outbound / MONTHS_DATA[selectedMonth].inbound * 100).toFixed(0)}%</strong> dari total masuk
              </span>
            </div>

            {/* Robust custom vector interactive graph container */}
            <div className="h-44 w-full bg-slate-50 border border-slate-105 rounded p-2 flex items-center justify-center relative font-mono text-[9px] text-slate-400">
              <svg className="w-full h-full" viewBox="0 0 700 150" fill="none">
                <defs>
                  <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
                  </linearGradient>
                  <linearGradient id="amber-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference grid metrics */}
                <line x1="50" y1="20" x2="680" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="50" y1="60" x2="680" y2="60" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="50" y1="100" x2="680" y2="100" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="50" y1="130" x2="680" y2="130" stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Y Axis markings */}
                <text x="12" y="24" fill="#64748b" fontWeight="bold">160 unt</text>
                <text x="12" y="64" fill="#64748b">100 unt</text>
                <text x="12" y="104" fill="#64748b">50 unt</text>
                <text x="12" y="134" fill="#64748b">0 unt</text>

                {/* High tech tracking guide line at active state */}
                <line 
                  x1={xCoords[selectedMonth]} 
                  y1="15" 
                  x2={xCoords[selectedMonth]} 
                  y2="130" 
                  stroke="#3b82f6" 
                  strokeWidth="1.2" 
                  strokeDasharray="4,4" 
                />
                
                {/* Subtle backlit slice focus card backdrop */}
                <rect
                  x={xCoords[selectedMonth] - 22}
                  y="15"
                  width="44"
                  height="115"
                  fill="#eff6ff"
                  opacity="0.6"
                  rx="4"
                />

                {/* Shaded Area Paths */}
                <path
                  d={`M 100 130 L 100 ${130 - (MONTHS_DATA[0].inbound / 160) * 110} L 220 ${130 - (MONTHS_DATA[1].inbound / 160) * 110} L 340 ${130 - (MONTHS_DATA[2].inbound / 160) * 110} L 460 ${130 - (MONTHS_DATA[3].inbound / 160) * 110} L 580 ${130 - (MONTHS_DATA[4].inbound / 160) * 110} L 660 ${130 - (MONTHS_DATA[5].inbound / 160) * 110} L 660 130 Z`}
                  fill="url(#blue-grad)"
                />
                <path
                  d={`M 100 130 L 100 ${130 - (MONTHS_DATA[0].outbound / 160) * 110} L 220 ${130 - (MONTHS_DATA[1].outbound / 160) * 110} L 340 ${130 - (MONTHS_DATA[2].outbound / 160) * 110} L 460 ${130 - (MONTHS_DATA[3].outbound / 160) * 110} L 580 ${130 - (MONTHS_DATA[4].outbound / 160) * 110} L 660 ${130 - (MONTHS_DATA[5].outbound / 160) * 110} L 660 130 Z`}
                  fill="url(#amber-grad)"
                />

                {/* Primary Data Line Paths */}
                <path 
                  d={`M 100 ${130 - (MONTHS_DATA[0].inbound / 160) * 110} L 220 ${130 - (MONTHS_DATA[1].inbound / 160) * 110} L 340 ${130 - (MONTHS_DATA[2].inbound / 160) * 110} L 460 ${130 - (MONTHS_DATA[3].inbound / 160) * 110} L 580 ${130 - (MONTHS_DATA[4].inbound / 160) * 110} L 660 ${130 - (MONTHS_DATA[5].inbound / 160) * 110}`} 
                  stroke="#2563eb" 
                  strokeWidth="2.8" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
                <path 
                  d={`M 100 ${130 - (MONTHS_DATA[0].outbound / 160) * 110} L 220 ${130 - (MONTHS_DATA[1].outbound / 160) * 110} L 340 ${130 - (MONTHS_DATA[2].outbound / 160) * 110} L 460 ${130 - (MONTHS_DATA[3].outbound / 160) * 110} L 580 ${130 - (MONTHS_DATA[4].outbound / 160) * 110} L 660 ${130 - (MONTHS_DATA[5].outbound / 160) * 110}`} 
                  stroke="#f59e0b" 
                  strokeWidth="2.8" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Blue Metric Anchors */}
                {xCoords.map((x, idx) => {
                  const yVal = 130 - (MONTHS_DATA[idx].inbound / 160) * 110;
                  const active = selectedMonth === idx;
                  return (
                    <g key={`banchor-${idx}`} className="transition-all">
                      {active && <circle cx={x} cy={yVal} r="8" fill="#2563eb" opacity="0.35" className="animate-ping" />}
                      <circle 
                        cx={x} 
                        cy={yVal} 
                        r={active ? "6.5" : "4.5"} 
                        fill="#2563eb" 
                        stroke="#ffffff" 
                        strokeWidth="1.5" 
                      />
                    </g>
                  );
                })}

                {/* Amber Metric Anchors */}
                {xCoords.map((x, idx) => {
                  const yVal = 130 - (MONTHS_DATA[idx].outbound / 160) * 110;
                  const active = selectedMonth === idx;
                  return (
                    <g key={`aanchor-${idx}`} className="transition-all">
                      {active && <circle cx={x} cy={yVal} r="8" fill="#f59e0b" opacity="0.35" className="animate-ping" />}
                      <circle 
                        cx={x} 
                        cy={yVal} 
                        r={active ? "6.5" : "4.5"} 
                        fill="#f59e0b" 
                        stroke="#ffffff" 
                        strokeWidth="1.5" 
                      />
                    </g>
                  );
                })}

                {/* Interactive Click/Hover Hitzones columns */}
                {xCoords.map((x, idx) => (
                  <rect
                    key={`hit-${idx}`}
                    x={x - 25}
                    y="10"
                    width="50"
                    height="120"
                    fill="transparent"
                    className="cursor-pointer hover:fill-slate-900/5 rounded transition-all"
                    onClick={() => setSelectedMonth(idx)}
                    onMouseEnter={() => setSelectedMonth(idx)}
                  />
                ))}

                {/* X Axis labels */}
                {["JAN", "FEB", "MAR", "APR", "MAY", "JUN (YTD)"].map((lbl, idx) => (
                  <text 
                    key={`xlab-${idx}`} 
                    x={xCoords[idx] - 10} 
                    y="144" 
                    fill={selectedMonth === idx ? "#1e40af" : "#475569"} 
                    fontWeight={selectedMonth === idx ? "bold" : "normal"}
                    className="text-[9.5px] cursor-pointer"
                    onClick={() => setSelectedMonth(idx)}
                  >
                    {lbl}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          {/* Interactive KPI Sidebar Breakdown */}
          <div className="lg:col-span-4 bg-slate-900 text-white border border-slate-800 rounded p-4 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80 mb-3 text-[9px] font-mono text-zinc-400">
                <span>KPI ANALYSIS DEPOT</span>
                <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  {MONTHS_DATA[selectedMonth].staffPerformance} Performance
                </span>
              </div>

              <h4 className="text-xs font-bold uppercase font-sans tracking-wide text-white">
                {MONTHS_DATA[selectedMonth].name}
              </h4>
              <p className="text-[10px] text-zinc-400 font-mono leading-tight mt-0.5">Analisis Detil & Efisiensi Alokasi Kargo</p>

              {/* Grid values summary */}
              <div className="grid grid-cols-2 gap-2 mt-3.5">
                <div className="bg-slate-850 border border-slate-800 p-2 rounded">
                  <span className="text-[8.5px] text-zinc-400 block font-mono">Inbound Recs</span>
                  <p className="text-sm font-bold font-mono text-blue-450 mt-0.5">{MONTHS_DATA[selectedMonth].inbound} <span className="text-[9px] text-zinc-400 font-normal">PCS</span></p>
                </div>
                <div className="bg-slate-850 border border-slate-800 p-2 rounded">
                  <span className="text-[8.5px] text-zinc-400 block font-mono">Outbound Jets</span>
                  <p className="text-sm font-bold font-mono text-amber-400 mt-0.5">{MONTHS_DATA[selectedMonth].outbound} <span className="text-[9px] text-zinc-400 font-normal">PCS</span></p>
                </div>
              </div>

              {/* Metric indicators table */}
              <div className="mt-4 space-y-2 text-[10.5px] font-mono">
                <div className="flex justify-between border-b border-slate-800/50 pb-1">
                  <span className="text-zinc-400">Tonnage Kargo:</span>
                  <span className="text-zinc-200 font-bold">{MONTHS_DATA[selectedMonth].volumeCargo}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/50 pb-1">
                  <span className="text-zinc-400">Efisiensi Dispatch:</span>
                  <span className="text-emerald-400 font-bold">{MONTHS_DATA[selectedMonth].efficiency}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/50 pb-1">
                  <span className="text-zinc-400">Sinyal Alarm Kritis:</span>
                  <span className={`${MONTHS_DATA[selectedMonth].criticalDeliveries > 5 ? 'text-rose-400' : 'text-zinc-200'} font-bold`}>
                    {MONTHS_DATA[selectedMonth].criticalDeliveries} Alerts
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 pt-1.5">
                  <span className="text-zinc-400 text-[9px]">Sektor Terbanyak:</span>
                  <span className="text-blue-300 font-semibold truncate text-[10px]">{MONTHS_DATA[selectedMonth].topCategory}</span>
                </div>
              </div>
            </div>

            {/* Vessel listings */}
            <div className="pt-2.5 border-t border-slate-800/80 mt-4 font-mono">
              <span className="text-[8.5px] uppercase font-bold text-zinc-400 block mb-1">
                Kargo Kapal Tujuan:
              </span>
              <div className="text-[9.5px] text-zinc-305 leading-normal bg-slate-950 p-2 rounded border border-slate-800 truncate">
                ⚓ {MONTHS_DATA[selectedMonth].vesselServiced}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Main Grid: Left side Low Stock Warnings, Right Side Custom Live Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Critical Low Stock Alarms list */}
        <section className="lg:col-span-3 bg-white border border-slate-200 rounded-md p-4 flex flex-col shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-150 mb-3">
            <h4 className="text-xs font-bold font-display uppercase tracking-widest text-red-650 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-650 animate-pulse"></span>
              REORDER LEVEL ALARMS
            </h4>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold uppercase">
              {summary.lowStockAlerts.length} Critical Parts
            </span>
          </div>

          <div className="flex-1 overflow-auto max-h-64 divide-y divide-slate-100">
            {summary.lowStockAlerts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono italic">
                ✓ All spare part stock thresholds satisfy minimum safety stock levels
              </div>
            ) : (
              summary.lowStockAlerts.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded">
                  <div className="min-w-0 pr-3">
                    <p className="font-bold text-xs text-slate-900 truncate">{item.part_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-medium">
                        {item.part_number}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        SKU: {item.sku}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-4">
                    <div className="font-mono text-right">
                      <div className="text-xs text-red-600 font-bold">
                        Stock: {item.current_stock}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        RP Limit: {item.reorder_point}
                      </div>
                    </div>
                    {onQuickOrder && (
                      <button
                        onClick={() => onQuickOrder(item.id)}
                        className="py-1 px-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold uppercase rounded font-mono cursor-pointer"
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

        {/* Audit Trail Logging traces */}
        <section className="lg:col-span-2 bg-slate-900 text-white border border-slate-800 rounded-md p-4 flex flex-col shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h4 className="text-xs font-bold font-display uppercase tracking-widest text-slate-300">
              Operations Audit Trail
            </h4>
            <span 
              onClick={() => onNavigateTab("ledger")}
              className="text-[9px] text-blue-400 font-bold uppercase cursor-pointer hover:underline"
            >
              Verify Ledger Trail
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-64 space-y-3 font-mono text-[10.5px]">
            {summary.recentActivities.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 italic">
                No system activity log logged.
              </div>
            ) : (
              summary.recentActivities.map((log) => {
                const colors = 
                  log.module === "Auth" ? "text-blue-400" 
                  : log.module === "Receiving" ? "text-green-400"
                  : log.module === "Dispatch" ? "text-orange-400"
                  : log.module === "Approvals" ? "text-amber-400"
                  : "text-purple-400";

                return (
                  <div key={log.id} className="pb-1.5 border-b border-slate-800/60 flex flex-col gap-0.5">
                    <div className="flex justify-between items-center">
                      <span className={`font-bold uppercase ${colors}`}>
                        [{log.module}] {log.action}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-300 font-sans leading-tight mt-0.5">{log.description}</p>
                    <div className="flex justify-between text-[8.5px] text-slate-500 tracking-wider">
                      <span>Operator: {log.username}</span>
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
