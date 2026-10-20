/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  AlertOctagon, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Bell, 
  ShieldAlert, 
  Wrench,
  Ban
} from "lucide-react";
import { MaintenanceConfig } from "../types.js";

interface ScheduledMaintenanceModalProps {
  config: MaintenanceConfig;
  onOpenAdmin?: () => void;
  isSuperAdmin?: boolean;
}

export function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr) return "Tanggal Belum Ditentukan";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export default function ScheduledMaintenanceModal({
  config,
  onOpenAdmin,
  isSuperAdmin = false
}: ScheduledMaintenanceModalProps) {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // If feature is turned off or system is already in full maintenance mode, don't show floating modal
  if (!config.schedule_notice_enabled || config.is_maintenance) {
    return null;
  }

  const formattedDate = formatIndonesianDate(config.schedule_date);
  const startTime = config.schedule_start_time || "22:00";
  const endTime = config.schedule_end_time || "23:59";
  const message = config.schedule_message || "Dimohon dengan sangat agar TIDAK ADA TRANSAKSI (Inbound, Dispatch, Permintaan Barang, Approval) pada jam tersebut untuk mencegah inkonsistensi data.";

  // Minimized pill state: small glowing floating pill at bottom-right
  if (isMinimized) {
    return (
      <aside 
        aria-label="Pemberitahuan Jadwal Pemeliharaan Minimized"
        className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-rose-700 via-red-600 to-rose-800 text-white font-mono text-xs font-black shadow-xl shadow-rose-950/50 border-2 border-rose-400 hover:border-white transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Klik untuk membuka pengumuman jadwal maintenance"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>
          <AlertTriangle className="w-4 h-4 text-amber-200 group-hover:rotate-12 transition-transform" />
          <span className="tracking-wide">JADWAL MAINTENANCE: {startTime}-{endTime} WIB</span>
          <ChevronUp className="w-4 h-4 text-rose-200 ml-1" />
        </button>
      </aside>
    );
  }

  // Expanded modal card at bottom-right
  return (
    <aside 
      aria-label="Pemberitahuan Jadwal Pemeliharaan"
      className="fixed bottom-5 right-5 z-50 w-96 max-w-[calc(100vw-2.5rem)] animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="bg-gradient-to-b from-slate-900 via-rose-950/95 to-slate-950 text-white rounded-2xl border-2 border-rose-500 shadow-2xl shadow-rose-950/80 overflow-hidden ring-1 ring-rose-400/40 backdrop-blur-md">
        
        {/* Top Header Bar with Red Pulse Beacon */}
        <div className="bg-rose-600/90 px-4 py-2.5 border-b border-rose-400/30 flex items-center justify-between text-white">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <AlertOctagon className="w-4 h-4 text-white shrink-0 animate-pulse" />
            <span className="font-mono text-xs font-black uppercase tracking-wider truncate">
              Pemberitahuan Maintenance
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-rose-700 rounded-lg text-rose-100 hover:text-white transition-colors cursor-pointer"
              title="Kecilkan pengumuman"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-rose-700 rounded-lg text-rose-100 hover:text-white transition-colors cursor-pointer"
              title="Tutup sementara (bisa dibuka kembali di pojok kanan)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 space-y-3.5 text-xs font-sans">
          
          {/* Highlight Headline */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-amber-300 font-mono text-[11px] font-bold uppercase tracking-wider">
              <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>Jadwal Pemeliharaan Terencana</span>
            </div>
            <h4 className="text-sm font-black text-white leading-snug font-mono">
              Sistem WMS Akan Menjalani Maintenance
            </h4>
          </div>

          {/* Date, Month, Year & Time Box */}
          <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-3 space-y-2">
            
            {/* Tanggal, Bulan, Tahun */}
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                  Tanggal Pelaksanaan
                </span>
                <span className="text-xs font-bold text-slate-100 font-mono block">
                  {formattedDate}
                </span>
                {config.schedule_date && (
                  <span className="text-[10px] text-rose-300 font-mono">
                    (Format: {config.schedule_date})
                  </span>
                )}
              </div>
            </div>

            {/* Jam Ditentukan */}
            <div className="flex items-start gap-2.5 pt-1.5 border-t border-slate-800">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                  Rentang Jam Maintenance
                </span>
                <span className="text-xs font-black text-amber-300 font-mono">
                  Pukul {startTime} s/d {endTime} WIB
                </span>
              </div>
            </div>

          </div>

          {/* Prominent Red Highlighted Transaction Warning */}
          <div className="bg-gradient-to-r from-red-600/30 via-rose-600/30 to-red-600/20 border-2 border-red-500/70 rounded-xl p-3 shadow-inner">
            <div className="flex items-center gap-2 mb-1.5 text-red-300">
              <Ban className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
              <strong className="text-xs font-mono font-black uppercase text-red-200 tracking-wide">
                MOHON TIDAK ADA TRANSAKSI
              </strong>
            </div>
            <p className="text-[11.5px] text-rose-100 leading-relaxed font-medium">
              {message}
            </p>
          </div>

          {/* Superadmin Quick Access Action */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
            <span>PIC: <strong>{config.updated_by || "Superadmin"}</strong></span>
            {isSuperAdmin && onOpenAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="text-amber-300 hover:text-amber-200 underline font-bold cursor-pointer"
              >
                Ubah di Pusat Kontrol &rarr;
              </button>
            )}
          </div>

        </div>

      </div>
    </aside>
  );
}
