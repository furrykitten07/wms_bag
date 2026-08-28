/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  BarChart2, 
  Layers, 
  BookOpen,
  MapPin, 
  Users, 
  TrendingUp, 
  Download, 
  FolderCheck, 
  Briefcase, 
  Truck, 
  FileText, 
  Bell, 
  UsersRound,
  ShieldCheck,
  FileSignature
} from "lucide-react";
import { UserRole, User } from "../types.js";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User;
  counts: {
    pendingApprovals: number;
    lowStock: number;
    activeDispatches: number;
  };
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  currentUser, 
  counts
}: SidebarProps) {
  return (
    <nav className="w-72 bg-slate-100 border-r border-slate-200 flex flex-col shrink-0 text-slate-750 font-sans selection:bg-blue-100 select-none">
      
      {/* Operations Navigation Blocks */}
      <div className="p-4 flex flex-col gap-1 overflow-y-auto flex-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-2 tracking-widest font-display">
          Operations
        </div>

        <button
          onClick={() => setCurrentTab("dashboard")}
          className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold tracking-tight transition-all duration-150 ${
            currentTab === "dashboard" 
              ? "bg-white text-blue-600 border border-slate-200 shadow-xs font-bold" 
              : "text-slate-650 hover:bg-slate-200/70 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BarChart2 className={`w-4 h-4 ${currentTab === "dashboard" ? "text-blue-500" : "text-slate-400"} shrink-0`} />
            <span>HQ Dashboard</span>
          </div>
        </button>

        <button
          onClick={() => setCurrentTab("master-parts")}
          className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold tracking-tight transition-all duration-150 ${
            currentTab === "master-parts" 
              ? "bg-white text-blue-600 border border-slate-200 shadow-xs font-bold" 
              : "text-slate-650 hover:bg-slate-200/70 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Layers className={`w-4 h-4 ${currentTab === "master-parts" ? "text-blue-500" : "text-slate-400"} shrink-0`} />
            <span>Spare Part Master</span>
          </div>
          {counts.lowStock > 0 && (
            <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] font-black leading-none font-mono">
              {counts.lowStock}
            </span>
          )}
        </button>

        <button
          onClick={() => setCurrentTab("sparepart-catalog")}
          className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold tracking-tight transition-all duration-150 ${
            currentTab === "sparepart-catalog" 
              ? "bg-white text-blue-600 border border-slate-200 shadow-xs font-bold" 
              : "text-slate-650 hover:bg-slate-200/70 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className={`w-4 h-4 ${currentTab === "sparepart-catalog" ? "text-blue-500" : "text-slate-400"} shrink-0`} />
            <span>Catalog Sparepart</span>
          </div>
          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-black leading-none font-mono">
            NEW
          </span>
        </button>

        <button
          onClick={() => setCurrentTab("ledger")}
          className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold tracking-tight transition-all duration-150 ${
            currentTab === "ledger" 
              ? "bg-white text-blue-600 border border-slate-200 shadow-xs font-bold" 
              : "text-slate-650 hover:bg-slate-200/70 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <TrendingUp className={`w-4 h-4 ${currentTab === "ledger" ? "text-blue-500" : "text-slate-400"} shrink-0`} />
            <span>Stock Ledger Trail</span>
          </div>
        </button>

        {/* LOGISTICS FLOW SECTION */}
        <div className="text-[10px] font-bold text-slate-400 uppercase px-2 mt-4 mb-2 tracking-widest font-display">
          Logistics Flow
        </div>

        <button
          onClick={() => setCurrentTab("material-requests")}
          className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold tracking-tight transition-all duration-150 ${
            currentTab === "material-requests" 
              ? "bg-white text-blue-600 border border-slate-200 shadow-xs font-bold" 
              : "text-slate-650 hover:bg-slate-200/70 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileText className={`w-4 h-4 ${currentTab === "material-requests" ? "text-blue-500" : "text-slate-400"} shrink-0`} />
            <span className="truncate">Permintaan Barang</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase shrink-0 tracking-wider ${
            currentTab === "material-requests" 
              ? "bg-blue-100 text-blue-800 border border-blue-200/40" 
              : "bg-slate-200 text-slate-500"
          }`}>
            TUG 5
          </span>
        </button>

        <button
          onClick={() => setCurrentTab("material-requests-tug6")}
          className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold tracking-tight transition-all duration-150 ${
            currentTab === "material-requests-tug6" 
              ? "bg-white text-indigo-600 border border-slate-200 shadow-xs font-bold" 
              : "text-slate-650 hover:bg-slate-200/70 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileText className={`w-4 h-4 ${currentTab === "material-requests-tug6" ? "text-indigo-500" : "text-slate-400"} shrink-0`} />
            <span className="truncate">Permintaan Barang</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase shrink-0 tracking-wider ${
            currentTab === "material-requests-tug6" 
              ? "bg-indigo-100 text-indigo-800 border border-indigo-200/40" 
              : "bg-slate-200 text-slate-500"
          }`}>
            TUG 6
          </span>
        </button>

        <button
          onClick={() => setCurrentTab("receiving")}
          className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold tracking-tight transition-all duration-150 ${
            currentTab === "receiving" 
              ? "bg-white text-blue-600 border border-slate-200 shadow-xs font-bold" 
              : "text-slate-650 hover:bg-slate-200/70 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Briefcase className={`w-4 h-4 ${currentTab === "receiving" ? "text-blue-500" : "text-slate-400"} shrink-0`} />
            <span>Receiving (Inbound)</span>
          </div>
        </button>

        <button
          onClick={() => setCurrentTab("dispatch")}
          className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold tracking-tight transition-all duration-150 ${
            currentTab === "dispatch" 
              ? "bg-white text-blue-600 border border-slate-200 shadow-xs font-bold" 
              : "text-slate-650 hover:bg-slate-200/70 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Truck className={`w-4 h-4 ${currentTab === "dispatch" ? "text-blue-500" : "text-slate-400"} shrink-0`} />
            <span>Dispatch (Outbound)</span>
          </div>
          {counts.activeDispatches > 0 && (
            <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px] font-black leading-none font-mono">
              {counts.activeDispatches}
            </span>
          )}
        </button>

        <button
          onClick={() => setCurrentTab("material-returns")}
          className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold tracking-tight transition-all duration-150 ${
            currentTab === "material-returns" 
              ? "bg-white text-blue-600 border border-slate-200 shadow-xs font-bold" 
              : "text-slate-650 hover:bg-slate-200/70 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileText className={`w-4 h-4 ${currentTab === "material-returns" ? "text-blue-500" : "text-slate-400"} shrink-0`} />
            <span className="truncate">Pengembalian Barang</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase shrink-0 tracking-wider ${
            currentTab === "material-returns" 
              ? "bg-blue-100 text-blue-800 border border-blue-200/40" 
              : "bg-slate-200 text-slate-500"
          }`}>
            TUG 10
          </span>
        </button>

        {/* REQUISITION & DOCUMENTS */}
        <div className="text-[10px] font-bold text-slate-400 uppercase px-2 mt-4 mb-2 tracking-widest font-display">
          Documents & Requisitions
        </div>

        <button
          onClick={() => setCurrentTab("spk-orders")}
          className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold tracking-tight transition-all duration-150 ${
            currentTab === "spk-orders" 
              ? "bg-white text-blue-600 border border-slate-200 shadow-xs font-bold" 
              : "text-slate-650 hover:bg-slate-200/70 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileText className={`w-4 h-4 ${currentTab === "spk-orders" ? "text-blue-500" : "text-slate-400"} shrink-0`} />
            <span>SPK (Work Order)</span>
          </div>
        </button>

        <button
          onClick={() => setCurrentTab("reports")}
          className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold tracking-tight transition-all duration-150 ${
            currentTab === "reports" 
              ? "bg-white text-blue-600 border border-slate-200 shadow-xs font-bold" 
              : "text-slate-650 hover:bg-slate-200/70 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Download className={`w-4 h-4 ${currentTab === "reports" ? "text-blue-500" : "text-slate-400"} shrink-0`} />
            <span>Laporan Keluar Masuk</span>
          </div>
        </button>

        {/* ADMINISTRATION (SUPER ADMIN ONLY) */}
        {currentUser.role === UserRole.SUPER_ADMIN && (
          <>
            <div className="text-[10px] font-bold text-slate-400 uppercase px-2 mt-4 mb-2 tracking-widest font-display">
              Administration
            </div>

            <button
              onClick={() => setCurrentTab("users-management")}
              className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold tracking-tight transition-all duration-150 ${
                currentTab === "users-management" 
                  ? "bg-white text-blue-600 border border-slate-200 shadow-xs font-bold" 
                  : "text-slate-650 hover:bg-slate-200/70 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <UsersRound className={`w-4 h-4 ${currentTab === "users-management" ? "text-blue-500" : "text-slate-400"} shrink-0`} />
                <span>Database User & Role</span>
              </div>
            </button>

            <button
              onClick={() => setCurrentTab("signature-management")}
              className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold tracking-tight transition-all duration-150 ${
                currentTab === "signature-management" 
                  ? "bg-white text-blue-600 border border-slate-200 shadow-xs font-bold" 
                  : "text-slate-650 hover:bg-slate-200/70 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileSignature className={`w-4 h-4 ${currentTab === "signature-management" ? "text-blue-500" : "text-slate-400"} shrink-0`} />
                <span>Tanda Tangan Digital</span>
              </div>
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
