/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
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
  Users
} from "lucide-react";
import { MaintenanceConfig, MaintenanceLog, User } from "../types.js";
import { api } from "../api.js";

interface MaintenanceAdminViewProps {
  config: MaintenanceConfig;
  currentUser: User | null;
  onUpdateConfig: (newConfig: Partial<MaintenanceConfig>) => Promise<MaintenanceConfig>;
  onRefresh: () => Promise<void>;
}

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
      setLogs(history);
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
      const operator = currentUser?.name || "Fikri Haikal (Superadmin)";
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

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto font-sans p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400 font-bold mb-1">
            <span>Administration</span>
            <span>/</span>
            <span className="text-amber-600">Maintenance System</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase font-mono flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-amber-500" />
            <span>Pusat Kontrol Mode Maintenance</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Menu khusus <strong>Super Admin</strong> untuk mengaktifkan atau menonaktifkan mode pemeliharaan sistem. Saat aktif, seluruh pengguna selain Super Admin akan langsung dialihkan ke Halaman Maintenance dan tidak dapat masuk ke sistem.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadLogs}
            disabled={isLoadingLogs}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? "animate-spin text-blue-600" : "text-slate-400"}`} />
            <span>Refresh Log</span>
          </button>
        </div>
      </div>

      {/* Hero Control Card with Big Toggle Button */}
      <div className={`rounded-2xl p-6 sm:p-8 border shadow-sm transition-all relative overflow-hidden ${
        isMaintenance 
          ? "bg-gradient-to-br from-rose-950/90 via-slate-900 to-amber-950/80 border-rose-500/50 text-white" 
          : "bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 border-slate-800 text-white"
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 border ${
                isMaintenance 
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse" 
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${isMaintenance ? "bg-rose-500 animate-ping" : "bg-emerald-400"}`} />
                <span>{isMaintenance ? "MODE MAINTENANCE: AKTIF (TERKUNCI)" : "STATUS: SISTEM ONLINE / NORMAL"}</span>
              </span>

              <span className="text-slate-400 text-xs font-mono">
                Operator: <strong className="text-white">{config.updated_by || "Superadmin"}</strong>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase font-mono">
              {isMaintenance 
                ? "Sistem Sedang Ditutup untuk Pengguna Lain" 
                : "Sistem Terbuka Penuh untuk Semua Pengguna"}
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {isMaintenance 
                ? "Semua staf gudang, kepala gudang, perwira kapal, dan manajemen saat ini tidak dapat masuk ke sistem dan langsung dialihkan ke Halaman Maintenance. Hanya Super Admin yang memiliki akses."
                : "Aplikasi beroperasi normal. Seluruh pengguna dapat login, membuat TUG 5/TUG 6, memproses receiving, dan menerbitkan dispatch TUG 8."}
            </p>

            <div className="text-[11px] font-mono text-slate-400 pt-1">
              Terakhir diperbarui: <span className="text-amber-300 font-bold">{config.updated_at ? new Date(config.updated_at).toLocaleString("id-ID") : "-"}</span>
            </div>
          </div>

          {/* THE BIG BUTTON */}
          <div className="shrink-0 flex flex-col items-center sm:items-start lg:items-end gap-2">
            {isMaintenance ? (
              <button
                type="button"
                onClick={() => handleToggleClick(false)}
                disabled={isUpdating}
                className="px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-sm uppercase font-mono tracking-wider shadow-xl shadow-emerald-900/40 border border-emerald-400/40 flex items-center gap-3 transition-all cursor-pointer disabled:opacity-50"
              >
                <Unlock className="w-5 h-5 text-emerald-200" />
                <span>Buka Akses Sistem (Nonaktifkan Maintenance)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleClick(true)}
                disabled={isUpdating}
                className="px-6 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 active:scale-95 text-white font-black text-sm uppercase font-mono tracking-wider shadow-xl shadow-rose-950/50 border border-rose-400/40 flex items-center gap-3 transition-all cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-5 h-5 text-rose-200" />
                <span>Aktifkan Mode Maintenance Sekarang</span>
              </button>
            )}
            <span className="text-[10.5px] font-mono text-slate-400">
              {isMaintenance 
                ? "Klik untuk memulihkan akses bagi seluruh pengguna" 
                : "Klik untuk mengunci sistem bagi pengguna lain"}
            </span>
          </div>

        </div>
      </div>

      {/* Grid: Settings Form & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Form: Customization */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Info className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-mono">
              Konfigurasi Informasi Layar Maintenance
            </h3>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Atur pesan pemberitahuan dan perkiraan waktu selesai yang akan tampil di hadapan pengguna saat mereka membuka website WMS selama mode maintenance.
          </p>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase font-mono block mb-1.5">
                Pesan Pemeliharaan (Tampil di Layar Pengguna)
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tuliskan keterangan perbaikan/maintenance..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors leading-relaxed font-sans"
              />
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                Disarankan menjelaskan tujuan perawatan sistem dan kontak darurat yang dapat dihubungi.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase font-mono block mb-1.5">
                Perkiraan Selesai (Estimasi Waktu)
              </label>
              <div className="relative flex items-center">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={estimatedFinish}
                  onChange={(e) => setEstimatedFinish(e.target.value)}
                  placeholder="Contoh: Hari ini, Pukul 15:30 WIB"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono transition-colors"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="submit"
                disabled={isUpdating}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase font-mono tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Informasi Pesan</span>
              </button>

              {saveSuccess && (
                <span className="text-xs font-mono font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pesan berhasil disimpan!</span>
                </span>
              )}
            </div>
          </form>
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
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-center space-y-3 relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
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

              <div className="bg-slate-900/90 border border-amber-500/20 rounded-lg p-2.5 text-left text-[11px] text-slate-300 leading-relaxed font-sans">
                "{message || config.message}"
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
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

      {/* Audit Trail Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
              Riwayat Aktivasi &amp; Log Perubahan Maintenance ({logs.length})
            </h3>
          </div>
          <span className="text-[10.5px] font-mono text-slate-400">
            Tercatat di Supabase Audit Trail
          </span>
        </div>

        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-slate-100/80 text-[10px] font-mono font-bold text-slate-600 uppercase border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3 w-44">Waktu</th>
                <th className="p-3 w-40">Aksi</th>
                <th className="p-3 w-44">Operator</th>
                <th className="p-3">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 font-mono text-xs">
                    Belum ada riwayat aktivitas pemeliharaan yang tercatat.
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => {
                  let detailsText = log.details || "-";
                  try {
                    const parsed = JSON.parse(log.details || "{}");
                    if (parsed.message) detailsText = `Pesan: "${parsed.message}" • Estimasi: ${parsed.estimated_finish || "-"}`;
                  } catch (e) {
                    // ignore
                  }

                  const isActivation = log.action.includes("ACTIVATE") && !log.action.includes("DEACTIVATE");
                  const isDeactivation = log.action.includes("DEACTIVATE");

                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString("id-ID") : "-"}
                      </td>
                      <td className="p-3 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase ${
                          isActivation 
                            ? "bg-rose-100 text-rose-800 border border-rose-200" 
                            : isDeactivation 
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}>
                          {isActivation ? "🔴 AKTIFKAN" : isDeactivation ? "🟢 NONAKTIFKAN" : log.action}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900 font-mono text-[11px]">
                        {log.operator || "Superadmin"}
                      </td>
                      <td className="p-3 text-slate-600 text-[11px] max-w-md truncate" title={detailsText}>
                        {detailsText}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
