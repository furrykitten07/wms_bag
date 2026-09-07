/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  X, 
  Calendar, 
  Archive, 
  Printer, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Download,
  Loader2
} from "lucide-react";
import { MaterialRequest, DigitalSignature } from "../types.js";
import { downloadTUGZipArchive } from "../utils/zipDocumentGenerator.js";

interface BatchPrintZipModalProps {
  isOpen: boolean;
  type: "tug5" | "tug6";
  requests: MaterialRequest[];
  signatures: DigitalSignature[];
  onClose: () => void;
  onBatchPrintBrowse?: (filteredRequests: MaterialRequest[]) => void;
}

export default function BatchPrintZipModal({
  isOpen,
  type,
  requests,
  signatures,
  onClose,
  onBatchPrintBrowse
}: BatchPrintZipModalProps) {
  const [startDate, setStartDate] = useState<string>("2026-07-01");
  const [endDate, setEndDate] = useState<string>("2026-07-31");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState<string>("");

  if (!isOpen) return null;

  const startMs = startDate ? new Date(`${startDate}T00:00:00Z`).getTime() : 0;
  const endMs = endDate ? new Date(`${endDate}T23:59:59Z`).getTime() : Infinity;

  const filteredRequests = requests.filter(r => {
    const rawDate = r.request_date || r.created_at;
    if (!rawDate) return true;
    const itemTime = new Date(rawDate).getTime();
    return itemTime >= startMs && itemTime <= endMs;
  });

  const handleExportZip = async () => {
    if (filteredRequests.length === 0) {
      alert("Tidak ada dokumen yang ditemukan pada rentang waktu yang dipilih.");
      return;
    }

    setIsExporting(true);
    setExportMessage(null);
    setProgressStatus("Menyiapkan dokumen...");

    try {
      const res = await downloadTUGZipArchive(
        requests, 
        type, 
        startDate, 
        endDate, 
        signatures,
        (current, total) => setProgressStatus(`Membuat PDF ${current} dari ${total}...`)
      );
      setExportMessage(`Berhasil membuat file ${res.filename} berisi ${res.count} dokumen PDF (1 file PDF per No. Request)!`);
    } catch (err: any) {
      alert(err.message || "Gagal membuat file ZIP archive PDF");
    } finally {
      setIsExporting(false);
      setProgressStatus("");
    }
  };

  const badgeTitle = type === "tug5" ? "TUG 5 (Material Umum)" : "TUG 6 (Sparepart)";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 border border-blue-200 rounded-lg text-blue-700">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Export ZIP PDF / Cetak Batch Dokumen {badgeTitle}
              </h2>
              <p className="text-[11px] text-slate-500">
                Pilih rentang waktu untuk mengunduh arsip ZIP berisi file PDF (1 file per No. Request)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Date Range Controls */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Tanggal Selesai
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Range Summary Card */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-blue-950 block">
                  Total Dokumen Ditemukan:
                </span>
                <span className="text-xs text-blue-800">
                  <strong className="text-sm text-blue-900 font-black">{filteredRequests.length}</strong> Dokumen PDF per No. Request (Periode {startDate || "Awal"} s/d {endDate || "Akhir"})
                </span>
              </div>
            </div>
          </div>

          {exportMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportMessage}</span>
            </div>
          )}

          {/* Info note */}
          <div className="p-3 bg-slate-100 rounded-lg text-[11px] text-slate-600 leading-relaxed border border-slate-200">
            💡 <strong>Format output ZIP:</strong> Di dalam file ZIP akan berisi file <strong>PDF</strong> resmi masing-masing per No. Request (misal: <code>TUG5_REQ-2026-001.pdf</code>). Setiap file PDF terformat A4 presisi lengkap dengan kop surat resmi, rincian barang, dan tanda tangan digital.
          </div>

        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>

          <div className="flex items-center gap-2">
            {onBatchPrintBrowse && filteredRequests.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onBatchPrintBrowse(filteredRequests);
                  onClose();
                }}
                className="px-3.5 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Browser ({filteredRequests.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportZip}
              disabled={isExporting || filteredRequests.length === 0}
              className="px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-xs flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{progressStatus || "Mengeksport PDF ZIP..."}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Archive ZIP PDF ({filteredRequests.length} File)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
