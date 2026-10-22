/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  X, 
  History, 
  Package, 
  ArrowDownLeft, 
  ArrowUpRight, 
  FileText, 
  Building2, 
  User, 
  Calendar, 
  Copy, 
  Check, 
  Clock, 
  SlidersHorizontal,
  CheckCircle2,
  Tag,
  Warehouse
} from "lucide-react";
import { SparePart, InboundReceiving, MovementLedgerEntry, WarehouseLocation } from "../types.js";

interface SparePartLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  part: SparePart | null;
  receivingList?: InboundReceiving[];
  ledger?: MovementLedgerEntry[];
  locations?: WarehouseLocation[];
}

interface LogEvent {
  id: string;
  timestamp: string;
  type: "INBOUND" | "DISPATCH" | "MANUAL_CREATION" | "ADJUSTMENT" | "RETURN" | "UPDATE";
  title: string;
  source: string;
  referenceNumber?: string;
  poNumber?: string;
  spkNumber?: string;
  vendorName?: string;
  vesselName?: string;
  qtyChange?: number;
  qtyAfter?: number;
  unit: string;
  operator: string;
  remarks?: string;
}

function formatDateTimeID(isoString?: string): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) + " WIB";
  } catch {
    return isoString;
  }
}

export default function SparePartLogModal({
  isOpen,
  onClose,
  part,
  receivingList = [],
  ledger = [],
  locations = []
}: SparePartLogModalProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !part) return null;

  const handleCopy = (text: string) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // 1. Resolve Location Name
  const locId = part.location_id;
  const matchedLoc = locations.find(l => l.id === locId || l.code === locId);
  const locationDisplay = matchedLoc 
    ? `${matchedLoc.warehouse} - ${matchedLoc.zone} (${matchedLoc.rack})`
    : (part.location_name || part.location_id || "WAREHOUSE MERAK");

  // 2. Extract Matching Receiving Records (Inbound History)
  const partPnClean = (part.part_number || "").trim().toLowerCase();
  const partBarcodeClean = (part.barcode || "").trim().toLowerCase();
  const partNameClean = (part.part_name || "").trim().toLowerCase();

  const matchingReceiving = receivingList.filter(rec => {
    if (!rec || !Array.isArray(rec.items)) return false;
    return rec.items.some(itm => {
      if (!itm) return false;
      const itmId = String(itm.spare_part_id || "").trim();
      const itmPn = String(itm.part_number || "").trim().toLowerCase();
      const itmBc = String((itm as any).barcode || "").trim().toLowerCase();
      const itmName = String(itm.spare_part_name || itm.part_name || "").trim().toLowerCase();

      // Check ID match
      if (itmId && itmId === part.id) return true;
      // Check distinct part number match
      if (partPnClean && partPnClean !== "-" && partPnClean !== "pn-generic" && itmPn === partPnClean) return true;
      // Check barcode match
      if (partBarcodeClean && itmBc && itmBc === partBarcodeClean) return true;
      // Check exact part name match
      if (partNameClean && itmName && itmName === partNameClean) return true;
      return false;
    });
  });

  // Extract any PO or SPK numbers mentioned in description / remarks if not directly found
  const descRemarks = `${part.description || ""} ${part.remarks || ""}`;
  let parsedPO = "";
  let parsedSPK = "";

  const poMatch = descRemarks.match(/(?:PO[\s:-]+|\[PO:\s*|Inbound PO\s*)([A-Z0-9\-_/]+)/i);
  if (poMatch && poMatch[1]) parsedPO = poMatch[1].trim();

  const spkMatch = descRemarks.match(/(?:SPK[\s:-]+|\[SPK:\s*)([A-Z0-9\-_/.]+)/i);
  if (spkMatch && spkMatch[1]) parsedSPK = spkMatch[1].trim();

  // Primary Inbound Receiving info (if item originated from Receiving)
  const primaryRec = matchingReceiving[0];
  const isFromReceiving = Boolean(primaryRec || parsedPO || parsedSPK || descRemarks.toLowerCase().includes("inbound"));

  const primaryPO = primaryRec?.purchase_order_num || parsedPO || "-";
  const primarySPK = primaryRec?.spk_number || primaryRec?.spk_id || parsedSPK || "-";
  const primaryVendor = primaryRec?.vendor_name || part.maker || "-";
  const primaryDate = primaryRec?.received_date || part.created_at;
  const primaryReceiver = primaryRec?.received_by || primaryRec?.created_by || part.created_by || "Petugas Penerima Gudang";

  // Find exact item quantity received in primary receiving
  let initialReceivedQty: number | string = "-";
  if (primaryRec && Array.isArray(primaryRec.items)) {
    const matchedItm = primaryRec.items.find(itm => 
      itm.spare_part_id === part.id || 
      (partPnClean && partPnClean !== "-" && (itm.part_number || "").toLowerCase() === partPnClean) ||
      ((itm.spare_part_name || itm.part_name || "").toLowerCase() === partNameClean)
    );
    if (matchedItm) {
      initialReceivedQty = Number(matchedItm.qty_received ?? matchedItm.qty_ordered ?? 0);
    }
  }

  // 3. Extract Ledger / Mutation History
  const matchingLedger = ledger.filter(entry => {
    if (!entry) return false;
    if (entry.spare_part_id === part.id) return true;
    const entryPn = (entry.part_number || "").trim().toLowerCase();
    if (partPnClean && partPnClean !== "-" && entryPn === partPnClean) return true;
    const entryName = (entry.spare_part_name || "").trim().toLowerCase();
    if (partNameClean && entryName === partNameClean) return true;
    return false;
  });

  // 4. Build Chronological Log Events List
  const allEvents: LogEvent[] = [];

  // A. Inbound Receiving events
  matchingReceiving.forEach(rec => {
    const itm = rec.items.find(i => 
      i.spare_part_id === part.id || 
      (partPnClean && partPnClean !== "-" && (i.part_number || "").toLowerCase() === partPnClean) ||
      ((i.spare_part_name || i.part_name || "").toLowerCase() === partNameClean)
    );
    const qty = itm ? Number(itm.qty_received ?? itm.qty_ordered ?? 0) : 0;

    allEvents.push({
      id: `rec-${rec.id}`,
      timestamp: rec.received_date || rec.created_at || part.created_at,
      type: "INBOUND",
      title: "Penerimaan Barang (Inbound Receiving)",
      source: "RECEIVING (INBOUND)",
      poNumber: rec.purchase_order_num || "-",
      spkNumber: rec.spk_number || "-",
      referenceNumber: rec.delivery_note_num ? `DN: ${rec.delivery_note_num}` : undefined,
      vendorName: rec.vendor_name || "-",
      vesselName: rec.vessel_name || undefined,
      qtyChange: qty,
      unit: part.unit || "PCS",
      operator: rec.received_by || rec.created_by || "Petugas Gudang",
      remarks: rec.keeper_notes || rec.reject_reason || "Penerimaan barang dan verifikasi fisik gudang"
    });
  });

  // B. Ledger entries (if not duplicated with receiving)
  matchingLedger.forEach(entry => {
    // Avoid exact duplicate if receiving event already covers it
    const isDup = allEvents.some(e => 
      e.referenceNumber === entry.reference_number || 
      (entry.transaction_type === "Inbound Receiving" && e.poNumber && entry.reference_number.includes(e.poNumber))
    );
    if (!isDup) {
      const isIncoming = entry.qty_in > 0;
      allEvents.push({
        id: `ledg-${entry.id}`,
        timestamp: entry.transaction_date || part.created_at,
        type: isIncoming ? "INBOUND" : "DISPATCH",
        title: entry.transaction_type || (isIncoming ? "Penerimaan Masuk" : "Pengeluaran Barang"),
        source: isIncoming ? "INBOUND" : "OUTBOUND",
        referenceNumber: entry.reference_number,
        vesselName: entry.vessel_name,
        qtyChange: isIncoming ? entry.qty_in : -entry.qty_out,
        qtyAfter: entry.after_stock,
        unit: part.unit || "PCS",
        operator: entry.created_by || "Operator WMS",
        remarks: entry.remarks || "-"
      });
    }
  });

  // C. Base Creation Event (Initial System Registration)
  const hasCreation = allEvents.some(e => e.type === "MANUAL_CREATION");
  if (!hasCreation) {
    if (isFromReceiving) {
      if (allEvents.length === 0) {
        allEvents.push({
          id: `init-${part.id}`,
          timestamp: primaryDate,
          type: "INBOUND",
          title: "Inisialisasi via Penerimaan Inbound",
          source: "RECEIVING (INBOUND)",
          poNumber: primaryPO,
          spkNumber: primarySPK,
          vendorName: primaryVendor,
          qtyChange: typeof initialReceivedQty === "number" ? initialReceivedQty : Number(part.current_stock || 0),
          qtyAfter: Number(part.current_stock || 0),
          unit: part.unit || "PCS",
          operator: primaryReceiver,
          remarks: descRemarks || "Suku cadang otomatis tercatat dari data Inbound PO"
        });
      }
    } else {
      allEvents.push({
        id: `manual-init-${part.id}`,
        timestamp: part.created_at || new Date().toISOString(),
        type: "MANUAL_CREATION",
        title: "Registrasi Manual Suku Cadang",
        source: "SPARE PART MASTER",
        qtyChange: Number(part.current_stock || 0),
        qtyAfter: Number(part.current_stock || 0),
        unit: part.unit || "PCS",
        operator: part.created_by || "System Administrator",
        remarks: part.description || "Item suku cadang didaftarkan secara manual melalui modul SPARE PART MASTER"
      });
    }
  }

  // Sort events chronologically (Newest first)
  allEvents.sort((a, b) => {
    const tA = new Date(a.timestamp).getTime() || 0;
    const tB = new Date(b.timestamp).getTime() || 0;
    return tB - tA;
  });

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-log-title"
    >
      <div 
        className="w-full max-w-3xl bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimalist Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="modal-log-title" className="font-display font-black text-xs uppercase tracking-wider text-slate-200">
                  Riwayat &amp; Jejak Log Suku Cadang
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  ID: {part.id}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                {part.part_name} &bull; PN: <strong className="text-white font-mono">{part.part_number || "-"}</strong>
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          
          {/* Top Origin Status Banner */}
          <div className="border border-slate-200 rounded-xl bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Asal Usul Item:
                </span>
                {isFromReceiving ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold font-mono uppercase bg-slate-900 text-white">
                    <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                    RECEIVING (INBOUND)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold font-mono uppercase bg-slate-200 text-slate-800 border border-slate-300">
                    <Package className="w-3 h-3 text-slate-600" />
                    REGISTRASI MANUAL (SPARE PART MASTER)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Terdaftar: <strong>{formatDateTimeID(part.created_at)}</strong></span>
              </div>
            </div>

            {/* Key Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Nomor PO */}
              <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
                  <span>Nomor PO</span>
                  {primaryPO !== "-" && (
                    <button
                      type="button"
                      onClick={() => handleCopy(primaryPO)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Salin No PO"
                    >
                      {copiedText === primaryPO ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
                <div className="font-mono text-xs font-bold text-slate-900 mt-1 truncate" title={primaryPO}>
                  {primaryPO}
                </div>
              </div>

              {/* Nomor SPK */}
              <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
                  <span>Nomor SPK</span>
                  {primarySPK !== "-" && (
                    <button
                      type="button"
                      onClick={() => handleCopy(primarySPK)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Salin No SPK"
                    >
                      {copiedText === primarySPK ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
                <div className="font-mono text-xs font-bold text-slate-900 mt-1 truncate" title={primarySPK}>
                  {primarySPK}
                </div>
              </div>

              {/* Pemasok / Maker */}
              <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Pemasok / Maker
                </div>
                <div className="font-sans text-xs font-bold text-slate-800 mt-1 truncate" title={primaryVendor}>
                  {primaryVendor}
                </div>
              </div>

              {/* Stok Saat Ini */}
              <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Stok Gudang
                </div>
                <div className="font-mono text-xs font-black text-slate-900 mt-1">
                  {part.current_stock} {part.unit || "PCS"}
                </div>
              </div>
            </div>

            {/* Additional details row */}
            <div className="text-[11px] text-slate-600 space-y-1 font-sans pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-700 font-mono">Lokasi Penyimpanan:</span>
                <span className="text-slate-900">{locationDisplay}</span>
              </div>
              {part.description && (
                <div className="flex items-start gap-1.5 pt-0.5">
                  <span className="font-bold text-slate-700 font-mono shrink-0">Keterangan:</span>
                  <span className="text-slate-700">{part.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Activity Timeline Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <h4 className="font-bold font-mono text-xs uppercase tracking-wider text-slate-800">
                  Jejak Riwayat Aktivitas &amp; Log Perubahan ({allEvents.length})
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Kronologis (Terbaru &rarr; Terdahulu)
              </span>
            </div>

            {allEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl font-mono text-xs">
                Belum ada riwayat aktivitas tercatat untuk suku cadang ini.
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200 pl-2">
                {allEvents.map((event, idx) => {
                  const isIncoming = event.type === "INBOUND" || (event.qtyChange && event.qtyChange > 0);
                  const isOutgoing = event.type === "DISPATCH" || (event.qtyChange && event.qtyChange < 0);
                  const isManual = event.type === "MANUAL_CREATION";

                  return (
                    <div key={event.id || idx} className="relative flex items-start gap-3 pl-6 group">
                      {/* Timeline dot */}
                      <div className={`absolute left-2.5 top-2.5 -translate-x-1/2 w-3 h-3 rounded-full border-2 bg-white ${
                        isIncoming ? "border-slate-800 ring-2 ring-slate-100" :
                        isOutgoing ? "border-slate-500 ring-2 ring-slate-100" :
                        "border-slate-400 ring-2 ring-slate-100"
                      }`} />

                      {/* Card Content */}
                      <div className="flex-1 bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-350 transition-colors shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 font-sans">
                              {event.title}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                              {event.source}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {formatDateTimeID(event.timestamp)}
                          </span>
                        </div>

                        {/* Details content */}
                        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px] font-mono">
                          {/* PO / SPK Info */}
                          {(event.poNumber || event.spkNumber) && (
                            <div className="col-span-1 sm:col-span-2 flex items-center gap-3 flex-wrap text-slate-700">
                              {event.poNumber && event.poNumber !== "-" && (
                                <span>No. PO: <strong className="text-slate-900">{event.poNumber}</strong></span>
                              )}
                              {event.spkNumber && event.spkNumber !== "-" && (
                                <span>No. SPK: <strong className="text-slate-900">{event.spkNumber}</strong></span>
                              )}
                            </div>
                          )}

                          {/* Reference Number */}
                          {event.referenceNumber && (
                            <div className="text-slate-600">
                              Ref: <strong className="text-slate-800">{event.referenceNumber}</strong>
                            </div>
                          )}

                          {/* Quantity Change */}
                          {typeof event.qtyChange === "number" && (
                            <div className="text-slate-700">
                              Perubahan QTY:{" "}
                              <strong className={`font-bold ${event.qtyChange > 0 ? "text-emerald-700" : event.qtyChange < 0 ? "text-rose-700" : "text-slate-800"}`}>
                                {event.qtyChange > 0 ? `+${event.qtyChange}` : event.qtyChange} {event.unit}
                              </strong>
                            </div>
                          )}

                          {/* Vendor or Vessel */}
                          {event.vendorName && event.vendorName !== "-" && (
                            <div className="text-slate-600 truncate font-sans">
                              Vendor: <span className="text-slate-800 font-medium">{event.vendorName}</span>
                            </div>
                          )}
                          {event.vesselName && event.vesselName !== "-" && (
                            <div className="text-slate-600 truncate font-sans">
                              Armada: <span className="text-slate-800 font-medium">{event.vesselName}</span>
                            </div>
                          )}

                          {/* Operator */}
                          <div className="text-slate-500 font-sans">
                            Operator: <span className="text-slate-700 font-medium">{event.operator}</span>
                          </div>
                        </div>

                        {/* Remarks */}
                        {event.remarks && event.remarks !== "-" && (
                          <div className="mt-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-500 italic font-sans">
                            "{event.remarks}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Minimalist Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            Total {allEvents.length} log riwayat terdeteksi
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
