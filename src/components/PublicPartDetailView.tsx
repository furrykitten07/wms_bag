/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import QRCode from "react-qr-code";
import { 
  Boxes, 
  Barcode, 
  QrCode, 
  MapPin, 
  Ship, 
  Layers, 
  Building2, 
  ShieldCheck, 
  ArrowLeft, 
  Share2, 
  Copy, 
  Check, 
  Printer, 
  Search, 
  AlertTriangle, 
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  CheckCircle2,
  Lock
} from "lucide-react";
import { SparePart, WarehouseLocation } from "../types.js";
import { BarcodeGraphic } from "./SparePartCatalogView.js";

interface PublicPartDetailViewProps {
  code: string;
  parts: SparePart[];
  locations?: WarehouseLocation[];
  loading?: boolean;
  onBackToApp?: () => void;
  onGoToLogin?: () => void;
}

export default function PublicPartDetailView({
  code,
  parts,
  locations = [],
  onBackToApp,
  onGoToLogin
}: PublicPartDetailViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  // Read custom metadata if saved in localStorage
  const customMeta = useMemo(() => {
    try {
      const saved = localStorage.getItem("spare_part_catalog_custom_meta");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }, []);

  // Read barcode cache if saved
  const barcodeCache = useMemo(() => {
    try {
      const saved = localStorage.getItem("wms_part_barcode_cache");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }, []);

  // Search/resolve current active part by code
  const currentCode = searchQuery.trim() || code;

  const matchedPart = useMemo(() => {
    if (!parts || parts.length === 0) return null;
    const clean = currentCode.trim().toLowerCase();

    // 1. Match by exact barcode
    let found = parts.find(p => p.barcode && p.barcode.trim().toLowerCase() === clean);
    if (found) return found;

    // 2. Match by barcode in cache
    for (const [partId, cachedBc] of Object.entries(barcodeCache)) {
      if (typeof cachedBc === "string" && cachedBc.trim().toLowerCase() === clean) {
        found = parts.find(p => p.id === partId);
        if (found) return found;
      }
    }

    // 3. Match by remarks [BC:...]
    found = parts.find(p => p.remarks && p.remarks.toLowerCase().includes(`[bc:${clean}]`));
    if (found) return found;

    // 4. Match by ID
    found = parts.find(p => p.id.trim().toLowerCase() === clean);
    if (found) return found;

    // 5. Match by SKU
    found = parts.find(p => p.sku && p.sku.trim().toLowerCase() === clean);
    if (found) return found;

    // 6. Match by Part Number
    found = parts.find(p => p.part_number && p.part_number.trim().toLowerCase() === clean);
    if (found) return found;

    // 7. Match by Part Name (fuzzy or includes)
    found = parts.find(p => p.part_name && p.part_name.trim().toLowerCase() === clean);
    if (found) return found;

    return null;
  }, [parts, currentCode, barcodeCache]);

  // Resolve barcode for display
  const displayBarcode = useMemo(() => {
    if (!matchedPart) return currentCode;
    if (matchedPart.barcode && matchedPart.barcode.trim()) return matchedPart.barcode.trim();
    if (barcodeCache[matchedPart.id]) return barcodeCache[matchedPart.id];
    if (matchedPart.remarks && matchedPart.remarks.includes("[BC:")) {
      const m = matchedPart.remarks.match(/\[BC:([^\]]+)\]/);
      if (m) return m[1].trim();
    }
    return `BC-${matchedPart.id.replace(/\D/g, "").slice(0, 8) || "88001001"}`;
  }, [matchedPart, barcodeCache, currentCode]);

  // Resolve hierarchy
  const hierarchy = useMemo(() => {
    if (!matchedPart) return ["Suku Cadang", "Umum"];
    const meta = customMeta[matchedPart.id];
    if (meta && meta.hierarchy && Array.isArray(meta.hierarchy)) {
      return meta.hierarchy;
    }
    return [
      matchedPart.category || "General Spares",
      matchedPart.maker || matchedPart.brand || "Master System",
      "Engine Parts"
    ];
  }, [matchedPart, customMeta]);

  // Resolve location detail
  const locationDetail = useMemo(() => {
    if (!matchedPart || !matchedPart.location_id) return "Depot Utama (Gudang Jakarta HQ)";
    const matchedLoc = locations.find(l => l.id === matchedPart.location_id || l.code === matchedPart.location_id);
    if (matchedLoc) {
      return `${matchedLoc.warehouse} - ${matchedLoc.zone} (${matchedLoc.rack}, ${matchedLoc.shelf})`;
    }
    return `Lokasi Rak: ${matchedPart.location_id}`;
  }, [matchedPart, locations]);

  // Current public URL for sharing / QR
  const publicShareUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/?part=${encodeURIComponent(displayBarcode)}`;
    }
    return `/?part=${encodeURIComponent(displayBarcode)}`;
  }, [displayBarcode]);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(publicShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Header Navigation Bar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white uppercase">
                PT. BARUNA ADI GUNA
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3" /> WMS Verified
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Sistem Pelacakan Informasi Suku Cadang Digital (Mobile QR &amp; Barcode Scanner)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onGoToLogin && (
            <button
              onClick={onGoToLogin}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" /> Masuk WMS
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Quick Search / Scan Another Barcode Bar */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3 shadow-lg no-print">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const inputVal = (document.getElementById("public-barcode-input") as HTMLInputElement)?.value;
              if (inputVal) {
                setSearchQuery(inputVal.trim());
                const url = new URL(window.location.href);
                url.searchParams.set("part", inputVal.trim());
                window.history.pushState({}, "", url.toString());
              }
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="public-barcode-input"
                type="text"
                placeholder="Scan atau ketik kode Barcode / SKU / No Part lain..."
                defaultValue={currentCode}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase rounded-xl transition-all cursor-pointer shrink-0"
            >
              Cari Part
            </button>
          </form>
        </div>

        {/* Content Card Area */}
        {loading && !matchedPart ? (
          <div className="bg-slate-850 border border-slate-750 rounded-2xl p-12 text-center space-y-4 shadow-xl">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Menghubungkan ke Database Suku Cadang WMS...</h2>
            <p className="text-xs text-slate-400">Sedang mengambil data spesifikasi dan stok fisik terbaru...</p>
          </div>
        ) : !matchedPart ? (
          /* Part Not Found Card */
          <div className="bg-slate-850 border border-slate-750 rounded-2xl p-8 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Suku Cadang Tidak Ditemukan</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Kode barcode atau nomor part <span className="text-rose-400 font-mono font-bold">"{currentCode}"</span> belum terdaftar di sistem master data WMS PT. Baruna Adi Guna.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => {
                  setSearchQuery("");
                  if (onBackToApp) onBackToApp();
                }}
                className="px-4 py-2 bg-slate-750 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
            </div>
          </div>
        ) : (
          /* Part Found: Rich Public Information View */
          <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden print:border-none print:shadow-none">
            
            {/* Top Verification Header Strip */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-blue-200 block font-bold">
                  WMS SPAREPART IDENTIFIER &bull; PT. BARUNA ADI GUNA
                </span>
                <h1 className="text-lg sm:text-xl font-black tracking-tight mt-0.5">
                  {matchedPart.part_name}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-white font-mono text-xs font-extrabold border border-white/20">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  STATUS: RESMI TERDAFTAR
                </span>
              </div>
            </div>

            {/* Main Details Body */}
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Hierarchy Tree Breadcrumbs */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <Layers className="w-3.5 h-3.5 text-blue-600 mr-1" />
                {hierarchy.map((node, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
                    <span className={i === hierarchy.length - 1 ? "text-blue-700 font-black bg-blue-50 px-2 py-0.5 rounded border border-blue-200" : ""}>
                      {node}
                    </span>
                  </React.Fragment>
                ))}
              </div>

              {/* Codes Grid: Part No, SKU, Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Nomor Part (Part Number)</span>
                  <strong className="text-xs sm:text-sm text-slate-900 font-black block mt-0.5 break-all">
                    {matchedPart.part_number || "-"}
                  </strong>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">SKU Code</span>
                  <strong className="text-xs sm:text-sm text-slate-900 font-black block mt-0.5">
                    {matchedPart.sku}
                  </strong>
                </div>

                <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-blue-600 block flex items-center gap-1">
                    <Barcode className="w-3 h-3" /> Nomor Barcode Unik
                  </span>
                  <strong className="text-xs sm:text-sm text-blue-900 font-black block mt-0.5 tracking-wider">
                    {displayBarcode}
                  </strong>
                </div>
              </div>

              {/* Live Stock & QR Banner Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center border border-slate-200 rounded-2xl p-5 bg-gradient-to-br from-slate-50 via-white to-slate-50">
                
                {/* Stock Highlight Box */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                      Ketersediaan Fisik Gudang (Live Master Stock)
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                        matchedPart.current_stock > 0 ? "text-emerald-700" : "text-rose-600"
                      }`}>
                        {matchedPart.current_stock}
                      </span>
                      <span className="text-base sm:text-lg font-bold text-slate-700 font-mono uppercase">
                        {matchedPart.unit || "PCS"}
                      </span>
                      <span className={`ml-2 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        matchedPart.current_stock > 0 
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}>
                        {matchedPart.current_stock > 0 ? "✓ Tersedia di Gudang" : "⚠️ Stok Habis"}
                      </span>
                    </div>
                  </div>

                  {/* Visual Barcode Graphic */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block">
                      Barcode Garis Fisik (1D Code):
                    </span>
                    <BarcodeGraphic code={displayBarcode} width={220} height={38} />
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <div className="p-2 bg-white rounded-lg">
                    <QRCode
                      value={publicShareUrl}
                      size={120}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox={`0 0 256 256`}
                    />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-600 uppercase tracking-widest mt-2 text-center">
                    TOKEN #{displayBarcode}
                  </span>
                  <span className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">
                    Scan via Kamera HP
                  </span>
                </div>

              </div>

              {/* Technical Specifications & Warehouse Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                {/* Location Card */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" /> Lokasi Rak Penyimpanan
                  </span>
                  <p className="font-bold text-slate-800 text-xs sm:text-sm">
                    {locationDetail}
                  </p>
                </div>

                {/* Manufacturer Card */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Pabrikan / Pembuat
                  </span>
                  <p className="font-bold text-slate-800 text-xs sm:text-sm">
                    {matchedPart.maker || matchedPart.brand || "Vendor Maritim BAg"}
                  </p>
                </div>

                {/* Vessel Compatibility Card */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                    <Ship className="w-3.5 h-3.5 text-blue-600" /> Kesesuaian Armada Kapal
                  </span>
                  <p className="font-semibold text-slate-800 text-xs sm:text-sm">
                    {matchedPart.vessel_compatibility || "Semua Armada Baruna (Universal)"}
                  </p>
                </div>

                {/* Weight & Reorder Limit */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-500" /> Bobot &amp; Batas Minimum
                  </span>
                  <p className="font-semibold text-slate-800 text-xs sm:text-sm">
                    {(matchedPart as any).weight_kg || 1.0} Kg &bull; Limit Reorder: {matchedPart.reorder_point || 5} {matchedPart.unit || "PCS"}
                  </p>
                </div>

              </div>

              {/* Description & Technical Notes */}
              {matchedPart.description && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Keterangan &amp; Deskripsi Suku Cadang:
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {matchedPart.description}
                  </p>
                </div>
              )}

              {/* Technical Specifications */}
              {matchedPart.specification && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Spesifikasi Teknis:
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-mono">
                    {matchedPart.specification}
                  </p>
                </div>
              )}

              {/* Action Toolbar on Bottom */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Tautan Disalin!" : "Salin Tautan"}
                  </button>

                  <button
                    onClick={handlePrint}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak Lembar Info
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {onBackToApp && (
                    <button
                      onClick={onBackToApp}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Buka Aplikasi Utama
                    </button>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-xs text-slate-500 border-t border-slate-800 no-print">
        <p>&copy; 2026 PT. Baruna Adi Guna &bull; Warehouse Management System (WMS). All rights reserved.</p>
      </footer>

    </div>
  );
}
