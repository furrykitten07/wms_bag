/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  Wrench, 
  ShieldAlert, 
  Power, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  Save, 
  Eye, 
  History, 
  Info,
  Lock,
  Unlock,
  RefreshCw,
  Server,
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  UserCheck,
  Check,
  Copy,
  X,
  Sparkles
} from "lucide-react";
import { MaintenanceConfig, MaintenanceLog, User } from "../types.js";
import { api } from "../api.js";

interface MaintenanceAdminViewProps {
  config: MaintenanceConfig;
  currentUser: User | null;
  onUpdateConfig: (newConfig: Partial<MaintenanceConfig>) => Promise<MaintenanceConfig>;
  onRefresh: () => Promise<void>;
}

const QUICK_MESSAGE_TEMPLATES = [
  "Sistem sedang dalam perbaikan rutin server dan sinkronisasi basis data.",
  "Sedang dilakukan pembaruan modul Outbound Dispatch (TUG 8) dan Daily Report (TUG 11).",
  "Peningkatan performa infrastruktur server WMS dan verifikasi integritas data.",
  "Sinkronisasi inventaris stok suku cadang armada kapal & stock opname berkala."
];

const ESTIMATE_TEMPLATES = [
  "Segera kembali online",
  "Perkiraan 30 menit",
  "Perkiraan 1 jam (Pukul 21:00 WIB)",
  "We’ll be back soon! Our website is currently undergoing scheduled maintenance."
];

export default function MaintenanceAdminView({
  config,
  currentUser,
  onUpdateConfig,
  onRefresh
}: MaintenanceAdminViewProps) {
  const [message, setMessage] = useState(config.message || "");
  const [estimatedFinish, setEstimatedFinish] = useState(config.estimated_finish || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<boolean | null>(null);

  // Pagination & Filtering state for logs
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<"ALL" | "ACTIVATE" | "DEACTIVATE" | "CONFIG">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [selectedLogDetail, setSelectedLogDetail] = useState<MaintenanceLog | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Sync state if config prop updates
  useEffect(() => {
    setMessage(config.message || "");
    setEstimatedFinish(config.estimated_finish || "");
  }, [config]);

  // Load audit logs on mount
  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const history = await api.getMaintenanceLogs();
      setLogs(history || []);
    } catch (e) {
      console.warn("Could not load maintenance logs:", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleToggleClick = (targetStatus: boolean) => {
    setPendingAction(targetStatus);
    setShowConfirmModal(true);
  };

  const confirmToggle = async () => {
    if (pendingAction === null) return;
    setIsUpdating(true);
    setShowConfirmModal(false);
    try {
      await onUpdateConfig({
        is_maintenance: pendingAction,
        message: message.trim() || config.message,
        estimated_finish: estimatedFinish.trim() || config.estimated_finish
      });
      await loadLogs();
      await onRefresh();
    } catch (err: any) {
      alert("Gagal mengubah status maintenance: " + (err.message || "Error"));
    } finally {
      setIsUpdating(false);
      setPendingAction(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setSaveSuccess(false);
    try {
      await onUpdateConfig({
        message: message.trim(),
        estimated_finish: estimatedFinish.trim()
      });
      setSaveSuccess(true);
      await loadLogs();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Gagal menyimpan pesan: " + (err.message || "Error"));
    } finally {
      setIsUpdating(false);
    }
  };

  const isMaintenance = Boolean(config.is_maintenance);

  // Helper to parse log details safely
  const parseLogDetails = (detailsRaw?: string) => {
    if (!detailsRaw) return { message: "-", estimated_finish: "-", raw: {} };
    try {
      const parsed = JSON.parse(detailsRaw);
      return {
        message: parsed.message || "-",
        estimated_finish: parsed.estimated_finish || "-",
        is_maintenance: parsed.is_maintenance,
        updated_by: parsed.updated_by,
        raw: parsed
      };
    } catch (e) {
      return { message: detailsRaw, estimated_finish: "-", raw: {} };
    }
  };

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const details = parseLogDetails(log.details);
      const query = searchQuery.toLowerCase().trim();

      // Search matching
      const matchesSearch = !query || 
        (log.operator && log.operator.toLowerCase().includes(query)) ||
        (log.action && log.action.toLowerCase().includes(query)) ||
        (details.message && details.message.toLowerCase().includes(query)) ||
        (details.estimated_finish && details.estimated_finish.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Action filter matching
      const act = (log.action || "").toUpperCase();
      if (actionFilter === "ACTIVATE") {
        return act.includes("ACTIVATE") && !act.includes("DEACTIVATE");
      }
      if (actionFilter === "DEACTIVATE") {
        return act.includes("DEACTIVATE");
      }
      if (actionFilter === "CONFIG") {
        return act.includes("UPDATE") || (!act.includes("ACTIVATE") && !act.includes("DEACTIVATE"));
      }

      return true;
    });
  }, [logs, searchQuery, actionFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  
  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, actionFilter, itemsPerPage]);

  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredLogs.length);
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-slate-50 font-sans">
      
      {/* Top Fixed Breadcrumb Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto w-full">
          <div>
            <div className="flex items-center gap-2 text-[10.5px] font-mono uppercase text-slate-400 font-bold mb-0.5">
              <span>Administration</span>
              <span>/</span>
              <span className="text-amber-600">Maintenance System</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase font-mono flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-500" />
              <span>Pusat Kontrol Mode Maintenance</span>
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Menu khusus <strong>Super Admin</strong> untuk mengontrol mode pemeliharaan sistem secara terpusat.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono shadow-2xs">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500">Status Server:</span>
              <span className={`font-bold ${isMaintenance ? "text-rose-600" : "text-emerald-600"}`}>
                {isMaintenance ? "Maintenance Locked" : "Online 100%"}
              </span>
            </div>

            <button
              type="button"
              onClick={loadLogs}
              disabled={isLoadingLogs}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              title="Muat ulang histori log pemeliharaan"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? "animate-spin text-blue-600" : "text-slate-500"}`} />
              <span>Refresh Log</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Body Container with Vertical Scrolling */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">

        {/* Hero Control Card with Big Toggle Button */}
        <div className={`rounded-2xl p-5 sm:p-6 border shadow-sm transition-all relative overflow-hidden shrink-0 ${
          isMaintenance 
            ? "bg-gradient-to-br from-rose-950 via-slate-900 to-amber-950 border-rose-500/50 text-white shadow-rose-950/20" 
            : "bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 border-slate-800 text-white shadow-slate-950/20"
        }`}>
          {/* Background glow decorative accent */}
          <div className={`absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isMaintenance ? "bg-rose-500" : "bg-emerald-500"
          }`} />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black uppercase tracking-wider flex items-center gap-2 border shadow-xs ${
                  isMaintenance 
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse" 
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isMaintenance ? "bg-rose-500 animate-ping" : "bg-emerald-400"}`} />
                  <span>{isMaintenance ? "MODE MAINTENANCE: AKTIF (TERKUNCI)" : "STATUS: SISTEM ONLINE / NORMAL"}</span>
                </span>

                <span className="text-slate-400 text-xs font-mono flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  Operator: <strong className="text-white">{config.updated_by || "Superadmin"}</strong>
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black tracking-tight uppercase font-mono text-white">
                {isMaintenance 
                  ? "Sistem Sedang Ditutup untuk Pengguna Lain" 
                  : "Sistem Terbuka Penuh untuk Semua Pengguna"}
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {isMaintenance 
                  ? "Semua staf gudang, kepala gudang, perwira kapal, dan user non-admin saat ini tidak dapat masuk ke sistem dan dialihkan ke Halaman Maintenance. Hanya akun Super Admin yang dapat mengakses WMS."
                  : "Aplikasi beroperasi normal. Seluruh pengguna dapat login, mengelola dokumen TUG, memproses receiving, dan menerbitkan dispatch."}
              </p>

              <div className="text-[11px] font-mono text-slate-400 pt-0.5 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Terakhir diperbarui:</span>
                <span className="text-amber-300 font-bold">
                  {config.updated_at ? new Date(config.updated_at).toLocaleString("id-ID") : "-"}
                </span>
              </div>
            </div>

            {/* THE BIG ACTION BUTTON */}
            <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
              {isMaintenance ? (
                <button
                  type="button"
                  onClick={() => handleToggleClick(false)}
                  disabled={isUpdating}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 text-white font-black text-xs uppercase font-mono tracking-wider shadow-lg shadow-emerald-900/50 border border-emerald-400/40 flex items-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4 text-emerald-200" />
                  <span>Buka Akses Sistem (Nonaktifkan Maintenance)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleClick(true)}
                  disabled={isUpdating}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 active:scale-95 text-white font-black text-xs uppercase font-mono tracking-wider shadow-lg shadow-rose-950/60 border border-rose-400/40 flex items-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4 text-rose-200" />
                  <span>Aktifkan Mode Maintenance Sekarang</span>
                </button>
              )}
              <span className="text-[10px] font-mono text-slate-400">
                {isMaintenance 
                  ? "Klik untuk memulihkan akses login seluruh user" 
                  : "Klik untuk mengunci sistem bagi user non-admin"}
              </span>
            </div>

          </div>
        </div>

        {/* Grid: Settings Form & Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Form: Customization */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-mono">
                  Konfigurasi Informasi Layar Maintenance
                </h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Atur pesan pemberitahuan dan perkiraan waktu selesai yang akan tampil di hadapan pengguna saat mereka mengakses aplikasi selama mode pemeliharaan aktif.
              </p>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase font-mono block">
                      Pesan Pemeliharaan (Tampil di Layar Pengguna)
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Template cepat:</span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {QUICK_MESSAGE_TEMPLATES.map((tmpl, tIdx) => (
                      <button
                        key={tIdx}
                        type="button"
                        onClick={() => setMessage(tmpl)}
                        className="text-[10px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-2 py-1 rounded-md border border-slate-200 transition-colors text-left font-sans cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                        <span className="truncate max-w-[200px]">{tmpl}</span>
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tuliskan keterangan perbaikan/maintenance..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors leading-relaxed font-sans shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                    Disarankan menjelaskan bagian sistem yang sedang diperbaiki agar user memahami kendala.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase font-mono block">
                      Perkiraan Selesai (Estimasi Waktu)
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Pilihan:</span>
                  </div>

                  {/* Quick Estimate Buttons */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {ESTIMATE_TEMPLATES.map((est, eIdx) => (
                      <button
                        key={eIdx}
                        type="button"
                        onClick={() => setEstimatedFinish(est)}
                        className="text-[10px] bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 transition-colors font-mono cursor-pointer"
                      >
                        {est}
                      </button>
                    ))}
                  </div>

                  <div className="relative flex items-center">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={estimatedFinish}
                      onChange={(e) => setEstimatedFinish(e.target.value)}
                      placeholder="Contoh: Hari ini, Pukul 15:30 WIB atau Segera kembali online"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase font-mono tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Informasi Pesan</span>
                  </button>

                  {saveSuccess && (
                    <span className="text-xs font-mono font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Pesan berhasil disimpan &amp; disinkronkan!</span>
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-2xs p-5 sm:p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 font-mono">
                    Live Preview: Tampilan User
                  </h3>
                </div>
                <span className="text-[10px] font-mono bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">
                  Layar Saat Maintenance
                </span>
              </div>

              {/* Mock Screen Content */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 text-center space-y-3 relative overflow-hidden">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                  <Wrench className="w-6 h-6 animate-pulse" />
                </div>

                <div>
                  <span className="text-[9px] font-mono uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full inline-block mb-1">
                    Mode Pemeliharaan
                  </span>
                  <h4 className="text-sm font-black uppercase font-mono text-white">
                    Sistem Sedang Ditutup Sementara
                  </h4>
                </div>

                <div className="bg-slate-900/90 border border-amber-500/20 rounded-lg p-3 text-left text-[11px] text-slate-200 leading-relaxed font-sans whitespace-pre-line shadow-xs">
                  "{message || config.message || "Sistem sedang dalam pemeliharaan berkala..."}"
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
                  <span>Estimasi: <strong className="text-amber-300">{estimatedFinish || "Segera"}</strong></span>
                  <span>PIC: <strong className="text-slate-200">{config.updated_by || "Superadmin"}</strong></span>
                </div>
              </div>
            </div>

            <p className="text-[10.5px] text-slate-400 font-mono mt-3 text-center">
              *Preview ini adalah tampilan aktual yang dilihat pengunjung atau user saat mode maintenance aktif.
            </p>
          </div>

        </div>

        {/* Audit Trail & Maintenance Logs Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          
          {/* Header Bar */}
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                    Riwayat Aktivasi &amp; Log Perubahan Maintenance
                  </h3>
                  <span className="bg-slate-200 text-slate-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                    Total: {logs.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Audit trail lengkap aktivitas maintenance yang tersinkronisasi di basis data Supabase
                </p>
              </div>
            </div>

            {/* Quick Stats on right */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">Tersaring:</span>
              <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
                {filteredLogs.length} Log
              </span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="p-3.5 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Action Filter Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-mono text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filter:
              </span>
              <button
                type="button"
                onClick={() => setActionFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-colors ${
                  actionFilter === "ALL" 
                    ? "bg-slate-900 text-white shadow-2xs" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setActionFilter("ACTIVATE")}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                  actionFilter === "ACTIVATE" 
                    ? "bg-rose-700 text-white shadow-2xs" 
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Aktivasi</span>
              </button>
              <button
                type="button"
                onClick={() => setActionFilter("DEACTIVATE")}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                  actionFilter === "DEACTIVATE" 
                    ? "bg-emerald-700 text-white shadow-2xs" 
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Deaktivasi</span>
              </button>
              <button
                type="button"
                onClick={() => setActionFilter("CONFIG")}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                  actionFilter === "CONFIG" 
                    ? "bg-blue-700 text-white shadow-2xs" 
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Update Pesan</span>
              </button>
            </div>

            {/* Search Box & Per Page Selector */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center min-w-[200px] sm:min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari operator, pesan..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono transition-colors shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs font-mono text-slate-500 shrink-0">
                <span className="hidden md:inline">Tampil:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none cursor-pointer"
                >
                  <option value={5}>5 / hal</option>
                  <option value={10}>10 / hal</option>
                  <option value={20}>20 / hal</option>
                  <option value={50}>50 / hal</option>
                </select>
              </div>
            </div>

          </div>

          {/* Clean Responsive Table with Horizontal Scroll */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-slate-100 text-[10px] font-mono font-bold text-slate-700 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3.5 w-12 text-center">No</th>
                  <th className="p-3.5 w-44 whitespace-nowrap">Waktu Kejadian</th>
                  <th className="p-3.5 w-40 whitespace-nowrap">Aksi Sistem</th>
                  <th className="p-3.5 w-48 whitespace-nowrap">Operator PIC</th>
                  <th className="p-3.5 min-w-[280px]">Rincian Perubahan &amp; Catatan</th>
                  <th className="p-3.5 w-20 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500 font-mono text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                      Memuat riwayat log pemeliharaan...
                    </td>
                  </tr>
                ) : currentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 font-mono text-xs">
                      <FileText className="w-6 h-6 mx-auto text-slate-300 mb-2" />
                      {searchQuery || actionFilter !== "ALL" 
                        ? "Tidak ada log yang sesuai dengan filter pencarian." 
                        : "Belum ada riwayat aktivitas pemeliharaan yang tercatat."}
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log, idx) => {
                    const details = parseLogDetails(log.details);
                    const isActivation = (log.action || "").includes("ACTIVATE") && !(log.action || "").includes("DEACTIVATE");
                    const isDeactivation = (log.action || "").includes("DEACTIVATE");

                    const logNumber = startIndex + idx + 1;
                    const dateObj = log.timestamp ? new Date(log.timestamp) : null;
                    const formattedDate = dateObj ? dateObj.toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    }) : "-";

                    return (
                      <tr 
                        key={log.id || idx} 
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                        onClick={() => setSelectedLogDetail(log)}
                      >
                        {/* No */}
                        <td className="p-3.5 text-center font-mono text-slate-400 font-bold">
                          {logNumber}
                        </td>

                        {/* Waktu */}
                        <td className="p-3.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-bold">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="p-3.5 whitespace-nowrap">
                          {isActivation ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black font-mono uppercase bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
                              <Lock className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>🔴 MODE AKTIF</span>
                            </span>
                          ) : isDeactivation ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black font-mono uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                              <Unlock className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>🟢 MODE NORMAL</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black font-mono uppercase bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
                              <Save className="w-3 h-3 text-blue-600 shrink-0" />
                              <span>🔵 UPDATE INFO</span>
                            </span>
                          )}
                        </td>

                        {/* Operator */}
                        <td className="p-3.5 font-mono text-[11px] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <strong className="text-slate-900">{log.operator || "Superadmin"}</strong>
                          </div>
                        </td>

                        {/* Rincian Perubahan */}
                        <td className="p-3.5 text-slate-700 text-[11px]">
                          <div className="space-y-1">
                            {details.message && details.message !== "-" && (
                              <div className="bg-slate-50 border border-slate-200/80 rounded-md p-1.5 text-[11px] text-slate-700 line-clamp-2 max-w-xl font-sans" title={details.message}>
                                "{details.message}"
                              </div>
                            )}
                            {details.estimated_finish && details.estimated_finish !== "-" && (
                              <div className="flex items-center gap-1 text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded w-fit">
                                <Clock className="w-2.5 h-2.5 text-amber-600" />
                                <span>Estimasi: {details.estimated_finish}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Action View */}
                        <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedLogDetail(log)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Lihat rincian lengkap log audit ini"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Modern Pagination Footer */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            
            <div className="text-slate-500 text-[11px]">
              {filteredLogs.length > 0 ? (
                <span>
                  Menampilkan <strong className="text-slate-900">{startIndex + 1}</strong> &ndash; <strong className="text-slate-900">{endIndex}</strong> dari <strong className="text-slate-900">{filteredLogs.length}</strong> total riwayat
                </span>
              ) : (
                <span>0 riwayat ditemukan</span>
              )}
            </div>

            {/* Page Navigation Buttons */}
            <div className="flex items-center gap-1 self-center sm:self-auto">
              {/* First Page */}
              <button
                type="button"
                disabled={activePage <= 1}
                onClick={() => setCurrentPage(1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600"
                title="Halaman Pertama"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              {/* Prev Page */}
              <button
                type="button"
                disabled={activePage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 flex items-center gap-1 font-bold text-xs"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {/* Page number buttons */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    return page === 1 || page === totalPages || Math.abs(page - activePage) <= 1;
                  })
                  .map((page, pIdx, arr) => {
                    const prevPage = arr[pIdx - 1];
                    const hasGap = prevPage && page - prevPage > 1;

                    return (
                      <React.Fragment key={page}>
                        {hasGap && <span className="text-slate-400 px-1">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            page === activePage 
                              ? "bg-blue-600 text-white shadow-xs" 
                              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              {/* Next Page */}
              <button
                type="button"
                disabled={activePage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 flex items-center gap-1 font-bold text-xs"
                title="Halaman Selanjutnya"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Last Page */}
              <button
                type="button"
                disabled={activePage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600"
                title="Halaman Terakhir"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* MODAL: DETAIL LOG AUDIT TRAIL */}
      {selectedLogDetail && (() => {
        const details = parseLogDetails(selectedLogDetail.details);
        const isActivation = (selectedLogDetail.action || "").includes("ACTIVATE") && !(selectedLogDetail.action || "").includes("DEACTIVATE");
        const isDeactivation = (selectedLogDetail.action || "").includes("DEACTIVATE");

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-800 overflow-hidden">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isActivation ? "bg-rose-100 text-rose-600" : isDeactivation ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                  }`}>
                    {isActivation ? <Lock className="w-5 h-5" /> : isDeactivation ? <Unlock className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-mono uppercase">
                      Rincian Log Audit Maintenance
                    </h3>
                    <p className="text-[10.5px] font-mono text-slate-400">
                      ID: {selectedLogDetail.id || "N/A"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedLogDetail(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs font-sans">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Waktu Log:</span>
                    <strong className="text-slate-800">
                      {selectedLogDetail.timestamp ? new Date(selectedLogDetail.timestamp).toLocaleString("id-ID") : "-"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Operator Eksekutor:</span>
                    <strong className="text-slate-900">
                      {selectedLogDetail.operator || "Superadmin"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Aksi:</span>
                    <strong className={isActivation ? "text-rose-600" : isDeactivation ? "text-emerald-600" : "text-blue-600"}>
                      {selectedLogDetail.action}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Status Maintenance:</span>
                    <strong className="text-slate-800">
                      {details.is_maintenance ? "🔴 Aktif (Terkunci)" : "🟢 Nonaktif (Normal)"}
                    </strong>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold text-slate-500 uppercase block mb-1">
                    Pesan Pemeliharaan (Layar Pengguna):
                  </label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 whitespace-pre-line leading-relaxed text-xs">
                    {details.message || "-"}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold text-slate-500 uppercase block mb-1">
                    Estimasi Waktu Selesai:
                  </label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-mono text-xs">
                    {details.estimated_finish || "-"}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono font-bold text-slate-500 uppercase">
                      Raw Data Payload (JSON):
                    </label>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(JSON.stringify(details.raw, null, 2))}
                      className="text-[10px] font-mono text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId ? "Tersalin!" : "Salin JSON"}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl text-[10.5px] font-mono overflow-x-auto max-h-36 border border-slate-800">
                    {JSON.stringify(details.raw, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedLogDetail(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase font-mono rounded-xl cursor-pointer transition-colors"
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-800">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                pendingAction ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
              }`}>
                {pendingAction ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-mono uppercase">
                  {pendingAction ? "Konfirmasi Mode Maintenance" : "Buka Kembali Akses Sistem"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tindakan ini berpengaruh terhadap seluruh pengguna sistem WMS.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              {pendingAction ? (
                <span>
                  ⚠️ <strong>Apakah Anda yakin ingin MENGAKTIFKAN Mode Maintenance?</strong>
                  <br /><br />
                  Saat diaktifkan, <strong>seluruh staf, kepala gudang, perwira kapal, dan user lain akan langsung diarahkan ke layar pemeliharaan</strong> dan tidak dapat login atau mengakses sistem hingga Anda menonaktifkannya kembali.
                </span>
              ) : (
                <span>
                  ✓ <strong>Apakah Anda yakin ingin MEMBUKA KEMBALI akses sistem?</strong>
                  <br /><br />
                  Mode maintenance akan dinonaktifkan dan seluruh pengguna dapat kembali login serta mengakses sistem secara normal.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingAction(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase font-mono cursor-pointer transition-colors"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={confirmToggle}
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs uppercase font-mono tracking-wider shadow-sm cursor-pointer transition-all ${
                  pendingAction 
                    ? "bg-rose-600 hover:bg-rose-500" 
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                {pendingAction ? "Ya, Aktifkan Maintenance" : "Ya, Buka Akses Sistem"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
