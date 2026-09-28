/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { 
  Ship, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Anchor, 
  Building2, 
  Layers, 
  Filter, 
  RefreshCw,
  X,
  Save,
  Check,
  Compass,
  FileText
} from "lucide-react";
import { Vessel, User, UserRole } from "../types.js";

interface VesselsManagementViewProps {
  vessels: Vessel[];
  currentUser: User | null;
  onAddVessel: (data: Partial<Vessel>) => Promise<any>;
  onUpdateVessel: (id: string, data: Partial<Vessel>) => Promise<any>;
  onDeleteVessel: (id: string) => Promise<any>;
  onResetVessels?: () => Promise<any>;
  onRefresh?: () => void;
}

export default function VesselsManagementView({
  vessels,
  currentUser,
  onAddVessel,
  onUpdateVessel,
  onDeleteVessel,
  onResetVessels,
  onRefresh
}: VesselsManagementViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVessel, setEditingVessel] = useState<Vessel | null>(null);
  const [deletingVessel, setDeletingVessel] = useState<Vessel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState("Bulk Carrier (Supramax)");
  const [formCapacity, setFormCapacity] = useState("");
  const [formYearBuilt, setFormYearBuilt] = useState<number | "">("");
  const [formFlag, setFormFlag] = useState("Indonesia");
  const [formCallSign, setFormCallSign] = useState("");
  const [formStatus, setFormStatus] = useState<string>("Active");
  const [formNotes, setFormNotes] = useState("");

  const showNotification = (type: "success" | "error", text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const openAddModal = () => {
    setEditingVessel(null);
    setFormName("");
    setFormCode("");
    setFormType("Bulk Carrier (Supramax)");
    setFormCapacity("50,000 DWT");
    setFormYearBuilt(new Date().getFullYear());
    setFormFlag("Indonesia");
    setFormCallSign("");
    setFormStatus("Active");
    setFormNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (v: Vessel) => {
    setEditingVessel(v);
    setFormName(v.name);
    setFormCode(v.code || "");
    setFormType(v.vessel_type || "Motor Vessel (MV)");
    setFormCapacity(v.capacity || "");
    setFormYearBuilt(v.year_built || "");
    setFormFlag(v.flag || "Indonesia");
    setFormCallSign(v.call_sign || "");
    setFormStatus(v.status || "Active");
    setFormNotes(v.notes || "");
    setIsModalOpen(true);
  };

  const handleAutoGenerateCode = (nameToUse?: string) => {
    const targetName = (nameToUse || formName).trim();
    if (!targetName) {
      setFormCode(`VSL-${Math.floor(100 + Math.random() * 900)}`);
      return;
    }
    const clean = targetName.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const prefix = clean.startsWith("MV") ? clean.slice(2, 6) : clean.slice(0, 4);
    setFormCode(`VSL-${prefix || "SHIP"}-${Math.floor(10 + Math.random() * 90)}`);
  };

  const handleSaveVessel = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      showNotification("error", "Nama kapal wajib diisi!");
      return;
    }

    // Force uppercase format for standard vessel names
    const finalUpperName = cleanName.startsWith("Gudang") ? cleanName : cleanName.toUpperCase();

    // Check duplicate name
    const existing = vessels.find(v => 
      v.name.toUpperCase() === finalUpperName.toUpperCase() && 
      (!editingVessel || v.id !== editingVessel.id)
    );
    if (existing) {
      showNotification("error", `Kapal dengan nama "${finalUpperName}" sudah terdaftar dalam sistem!`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<Vessel> = {
        name: finalUpperName,
        code: formCode.trim().toUpperCase() || `VSL-${finalUpperName.substring(0, 3)}-01`,
        vessel_type: formType,
        capacity: formCapacity.trim() || "-",
        year_built: formYearBuilt ? Number(formYearBuilt) : undefined,
        flag: formFlag.trim() || "Indonesia",
        call_sign: formCallSign.trim().toUpperCase() || undefined,
        status: formStatus,
        notes: formNotes.trim()
      };

      if (editingVessel) {
        await onUpdateVessel(editingVessel.id, payload);
        showNotification("success", `Data kapal ${finalUpperName} berhasil diperbarui!`);
      } else {
        await onAddVessel(payload);
        showNotification("success", `Kapal baru ${finalUpperName} berhasil ditambahkan ke database armada!`);
      }

      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      showNotification("error", err.message || "Gagal menyimpan data kapal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingVessel) return;
    setIsSubmitting(true);
    try {
      await onDeleteVessel(deletingVessel.id);
      showNotification("success", `Kapal ${deletingVessel.name} berhasil dihapus dari master database!`);
      setDeletingVessel(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      showNotification("error", err.message || "Gagal menghapus kapal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!window.confirm("Apakah Anda yakin ingin mengatur ulang data kapal ke armada default PT. BAG? Kapal baru yang Anda tambahkan mungkin akan tereset.")) {
      return;
    }
    setIsSubmitting(true);
    try {
      if (onResetVessels) {
        await onResetVessels();
        showNotification("success", "Daftar kapal berhasil direset ke standar armada PT. BAG!");
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      showNotification("error", err.message || "Gagal mereset kapal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = vessels.length;
    const active = vessels.filter(v => (v.status || "Active").toLowerCase() === "active").length;
    const maintenance = vessels.filter(v => {
      const s = (v.status || "").toLowerCase();
      return s === "maintenance" || s === "docking";
    }).length;
    const nonVessel = vessels.filter(v => v.name.toLowerCase().includes("gudang") || (v.code || "").includes("NON-VESSEL")).length;
    return { total, active, maintenance, nonVessel };
  }, [vessels]);

  // Unique types for filtering
  const availableTypes = useMemo(() => {
    const types = new Set(vessels.map(v => v.vessel_type).filter(Boolean));
    return Array.from(types);
  }, [vessels]);

  // Filtered vessels
  const filteredVessels = useMemo(() => {
    return vessels.filter(v => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        v.name.toLowerCase().includes(q) || 
        (v.code || "").toLowerCase().includes(q) || 
        (v.vessel_type || "").toLowerCase().includes(q) || 
        (v.notes || "").toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || (v.status || "Active").toUpperCase() === statusFilter.toUpperCase();
      const matchesType = typeFilter === "ALL" || v.vessel_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [vessels, searchQuery, statusFilter, typeFilter]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(8);

  // Reset to first page when search query or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredVessels.length / (itemsPerPage || 8)));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedVessels = useMemo(() => {
    if (itemsPerPage >= 9999) return filteredVessels;
    const start = (safeCurrentPage - 1) * itemsPerPage;
    return filteredVessels.slice(start, start + itemsPerPage);
  }, [filteredVessels, safeCurrentPage, itemsPerPage]);

  const startIdx = filteredVessels.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const endIdx = itemsPerPage >= 9999 ? filteredVessels.length : Math.min(safeCurrentPage * itemsPerPage, filteredVessels.length);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 h-full">
      
      {/* Top Banner / Breadcrumb Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 shadow-2xs shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
                <Ship className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200/50">
                Super Admin Master Data
              </span>
            </div>
            <h1 className="text-xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
              Database & Master Data Kapal (Fleet Management)
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Pusat kendali master data kapal PT. Pelayaran Bahtera Adhiguna. Semua modul (Penerimaan Inbound, Dispatch Outbound TUG 8, Permintaan Barang TUG 5/6, TUG 10, dan SPK) otomatis tersinkronisasi ke database ini.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="Segarkan data dari server"
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {onResetVessels && (
              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={isSubmitting}
                className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Armada Standar</span>
              </button>
            )}

            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kapal Baru</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {feedbackMsg && (
          <div className={`mt-4 p-3 rounded-lg border flex items-center gap-2.5 text-xs font-medium transition-all ${
            feedbackMsg.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs" 
              : "bg-red-50 text-red-800 border-red-200 shadow-2xs"
          }`}>
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}
      </div>

      {/* Main Body Container with Vertical Scrolling */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl w-full mx-auto">
        
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Kapal */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Total Master Armada
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-slate-900">{stats.total}</span>
                <span className="text-xs text-slate-500 font-medium">Unit Terdaftar</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Anchor className="w-5 h-5" />
            </div>
          </div>

          {/* Kapal Aktif */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Status Beroperasi (Active)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-emerald-600">{stats.active}</span>
                <span className="text-xs text-slate-500 font-medium">Kapal Siap Operasi</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Docking & Maintenance */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Docking / Maintenance
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-amber-600">{stats.maintenance}</span>
                <span className="text-xs text-slate-500 font-medium">Perbaikan / Siaga</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Compass className="w-5 h-5" />
            </div>
          </div>

          {/* Non-Vessel Buffer */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Gudang Cadangan (Buffer)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-indigo-600">{stats.nonVessel}</span>
                <span className="text-xs text-slate-500 font-medium">Alokasi Gudang</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama kapal (e.g. MV. ARIMBI BARUNA, KARTINI, MALAHAYATI), kode, tipe..."
              className="w-full bg-slate-50 border border-slate-250 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-250 text-xs font-semibold text-slate-700 py-1.5 px-2.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Active (Beroperasi)</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="DOCKING">Docking</option>
                <option value="STANDBY">Standby</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {/* Type Filter */}
            {availableTypes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Tipe:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-250 text-xs font-semibold text-slate-700 py-1.5 px-2.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer max-w-[160px] truncate"
                >
                  <option value="ALL">Semua Tipe</option>
                  {availableTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Vessels Master Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase tracking-wider font-bold">
                  <th className="p-3.5 pl-5 w-12 text-center">No</th>
                  <th className="p-3.5 w-32">Kode Kapal</th>
                  <th className="p-3.5">Nama Kapal (Vessel Name)</th>
                  <th className="p-3.5">Tipe Kapal</th>
                  <th className="p-3.5">Kapasitas (DWT)</th>
                  <th className="p-3.5">Bendera</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5">Catatan Operasional</th>
                  <th className="p-3.5 pr-5 text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredVessels.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-400">
                      <Ship className="w-10 h-10 text-slate-300 mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-slate-600">Tidak ada kapal yang sesuai dengan pencarian.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Coba gunakan kata kunci lain atau tambah kapal baru.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedVessels.map((vessel, index) => {
                    const isNonVessel = vessel.name.toLowerCase().includes("gudang") || (vessel.code || "").includes("NON-VESSEL");
                    const st = (vessel.status || "Active").toLowerCase();
                    const rowNumber = (safeCurrentPage - 1) * (itemsPerPage >= 9999 ? 0 : itemsPerPage) + index + 1;
                    
                    return (
                      <tr 
                        key={vessel.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="p-3.5 pl-5 text-center font-mono text-slate-400 text-[11px]">
                          {rowNumber}
                        </td>

                        <td className="p-3.5 font-mono text-[11px]">
                          <span className={`px-2 py-0.5 rounded font-bold border ${
                            isNonVessel 
                              ? "bg-slate-100 text-slate-600 border-slate-200" 
                              : "bg-blue-50 text-blue-700 border-blue-200/60"
                          }`}>
                            {vessel.code || `VSL-${index + 1}`}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            {isNonVessel ? (
                              <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                            ) : (
                              <Ship className="w-4 h-4 text-blue-600 shrink-0" />
                            )}
                            <span className="font-bold text-slate-900 tracking-tight text-xs uppercase font-mono">
                              {vessel.name}
                            </span>
                            {vessel.name === "MV. ARIMBI BARUNA" && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-700 font-mono font-bold uppercase">
                                NEW
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 text-slate-600 font-medium">
                          {vessel.vessel_type || "Motor Vessel (MV)"}
                        </td>

                        <td className="p-3.5 font-mono text-slate-700 text-xs">
                          {vessel.capacity || "-"}
                        </td>

                        <td className="p-3.5 text-slate-600 flex items-center gap-1.5">
                          <span>🇮🇩</span>
                          <span>{vessel.flag || "Indonesia"}</span>
                        </td>

                        <td className="p-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            st === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : st === "maintenance"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : st === "docking"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              st === "active" ? "bg-emerald-500 animate-pulse" : st === "maintenance" ? "bg-amber-500" : "bg-slate-400"
                            }`} />
                            {vessel.status || "Active"}
                          </span>
                        </td>

                        <td className="p-3.5 text-slate-500 text-xs max-w-xs truncate" title={vessel.notes || ""}>
                          {vessel.notes || "-"}
                        </td>

                        <td className="p-3.5 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(vessel)}
                              title="Edit Data Kapal"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingVessel(vessel)}
                              title="Hapus Kapal"
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Rich Pagination Controls */}
          <div className="bg-slate-50/90 border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-sans">
            {/* Left: Range and Info */}
            <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
              <span>
                Menampilkan <strong className="text-slate-900 font-bold">{startIdx} - {endIdx}</strong> dari total <strong className="text-slate-900 font-bold">{filteredVessels.length}</strong> kapal
              </span>
            </div>

            {/* Center / Right: Items per page and Page navigation */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Items Per Page Selector */}
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-slate-400">Tampilkan:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value={5}>5 baris</option>
                  <option value={8}>8 baris</option>
                  <option value={10}>10 baris</option>
                  <option value={15}>15 baris</option>
                  <option value={20}>20 baris</option>
                  <option value={9999}>Semua</option>
                </select>
              </div>

              {/* Page Buttons */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  {/* First & Prev */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    className="p-1 px-2 rounded border border-slate-250 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs font-mono font-bold"
                    title="Halaman Pertama"
                  >
                    «
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    className="p-1 px-2.5 rounded border border-slate-250 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs font-mono font-bold"
                    title="Halaman Sebelumnya"
                  >
                    ‹
                  </button>

                  {/* Page number buttons */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    if (
                      totalPages > 7 &&
                      pageNum !== 1 &&
                      pageNum !== totalPages &&
                      Math.abs(pageNum - safeCurrentPage) > 1
                    ) {
                      if (pageNum === 2 && safeCurrentPage > 3) return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                      if (pageNum === totalPages - 1 && safeCurrentPage < totalPages - 2) return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                      return null;
                    }

                    const isActive = pageNum === safeCurrentPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                          isActive
                            ? "bg-blue-600 text-white shadow-xs border border-blue-600"
                            : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-250"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {/* Next & Last */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="p-1 px-2.5 rounded border border-slate-250 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs font-mono font-bold"
                    title="Halaman Berikutnya"
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    className="p-1 px-2 rounded border border-slate-250 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs font-mono font-bold"
                    title="Halaman Terakhir"
                  >
                    »
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-blue-600/30 text-blue-400 rounded-lg border border-blue-500/30">
                  <Ship className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {editingVessel ? "Edit Master Data Kapal" : "Tambah Kapal Baru ke Armada"}
                  </h3>
                  <p className="text-[10.5px] text-slate-400">
                    {editingVessel ? `Perbarui informasi ${editingVessel.name}` : "Tambahkan kapal baru ke master database PT. BAG"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveVessel} className="p-6 space-y-4">
              {/* Nama Kapal */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase font-mono block mb-1">
                  Nama Kapal (Vessel Name) *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormName(val);
                    if (!formCode && !editingVessel) {
                      handleAutoGenerateCode(val);
                    }
                  }}
                  placeholder="Contoh: MV. ARIMBI BARUNA"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  * Otomatis dikonversi ke format <strong>HURUF KAPITAL (UPPERCASE)</strong> sesuai standar pelayaran.
                </span>
              </div>

              {/* Kode Kapal & Tipe Kapal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase font-mono block">
                      Kode Kapal
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAutoGenerateCode()}
                      className="text-[9.5px] font-mono text-blue-600 hover:text-blue-800 font-bold underline"
                    >
                      Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="VSL-ARM-02"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase font-mono block mb-1">
                    Tipe / Klasifikasi Kapal
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Bulk Carrier (Panamax)">Bulk Carrier (Panamax)</option>
                    <option value="Bulk Carrier (Supramax)">Bulk Carrier (Supramax)</option>
                    <option value="Bulk Carrier (Handymax)">Bulk Carrier (Handymax)</option>
                    <option value="Bulk Carrier (Handysize)">Bulk Carrier (Handysize)</option>
                    <option value="Tug & Barge Set">Tug & Barge Set (Tongkang)</option>
                    <option value="Motor Vessel (MV)">Motor Vessel (MV)</option>
                    <option value="Warehouse Buffer">Warehouse Buffer (Non-Kapal)</option>
                  </select>
                </div>
              </div>

              {/* Kapasitas DWT & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase font-mono block mb-1">
                    Kapasitas (DWT / Tonase)
                  </label>
                  <input
                    type="text"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    placeholder="Contoh: 56,000 DWT"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase font-mono block mb-1">
                    Status Operasional
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Active">Active (Beroperasi)</option>
                    <option value="Maintenance">Maintenance (Pemeliharaan)</option>
                    <option value="Docking">Docking (Galangan)</option>
                    <option value="Standby">Standby (Siaga)</option>
                    <option value="Inactive">Inactive (Tidak Aktif)</option>
                  </select>
                </div>
              </div>

              {/* Bendera & Call Sign */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase font-mono block mb-1">
                    Bendera Kebangsaan
                  </label>
                  <input
                    type="text"
                    value={formFlag}
                    onChange={(e) => setFormFlag(e.target.value)}
                    placeholder="Indonesia"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase font-mono block mb-1">
                    Call Sign (Tanda Panggilan)
                  </label>
                  <input
                    type="text"
                    value={formCallSign}
                    onChange={(e) => setFormCallSign(e.target.value.toUpperCase())}
                    placeholder="POBA"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Catatan Operasional */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase font-mono block mb-1">
                  Catatan Operasional / Rute Pelayaran
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Keterangan rute pelayaran, fungsi muatan batubara, atau histori armada..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Menyimpan..." : "Simpan Data Kapal"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingVessel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-base text-slate-900 font-display">
              Hapus Kapal {deletingVessel.name}?
            </h3>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus kapal <strong>{deletingVessel.name}</strong> dari master database? Kapal ini tidak akan muncul lagi di opsi penerimaan barang baru, pengeluaran barang (dispatch), atau SPK.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingVessel(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-sm shadow-red-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Menghapus..." : "Ya, Hapus Kapal"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
