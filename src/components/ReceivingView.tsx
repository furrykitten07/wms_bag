/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  AlertOctagon, 
  X, 
  ShieldAlert, 
  Eye, 
  Camera, 
  Truck,
  ArrowDownLeft,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  ClipboardCheck,
  Check,
  AlertTriangle,
  Boxes,
  FileCheck,
  ListFilter,
  Info
} from "lucide-react";
import { InboundReceiving, ReceivingStatus, SparePart, UserRole, SPKWorkOrder } from "../types.js";
import { demoSPKs } from "../demoSeedData.js";

interface ReceivingViewProps {
  receivingList: InboundReceiving[];
  parts: SparePart[];
  spkList?: SPKWorkOrder[];
  role: UserRole;
  onAddReceiving: (rec: Partial<InboundReceiving>) => Promise<any>;
  onVerifyReceiving: (id: string, update: { status: ReceivingStatus; items: any[]; reject_reason?: string; return_note_num?: string; signature_data_url?: string; keeper_notes?: string }) => Promise<any>;
  onPreviewDocument: (rec: InboundReceiving) => void;
  onDeleteReceiving?: (id: string) => Promise<any>;
}

export default function ReceivingView({
  receivingList,
  parts,
  spkList,
  role,
  onAddReceiving,
  onVerifyReceiving,
  onPreviewDocument,
  onDeleteReceiving
}: ReceivingViewProps) {
  const [search, setSearch] = useState("");
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  
  // Inbound Pagination states
  const [recPage, setRecPage] = useState(1);
  const [recPerPage, setRecPerPage] = useState<number>(10);

  // Selected receiving IDs state for Bulk Delete Checklist
  const [selectedRecIds, setSelectedRecIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  useEffect(() => {
    setRecPage(1);
    setSelectedRecIds([]);
  }, [search]);

  const [activeReceiving, setActiveReceiving] = useState<InboundReceiving | null>(null);
  const [isNewRecOpen, setIsNewRecOpen] = useState(false);
  const [receivingSourceMode, setReceivingSourceMode] = useState<"spk" | "manual">("spk");

  // SPK List fallback
  const availableSpks = (spkList && spkList.length > 0) ? spkList : demoSPKs;
  const [selectedSpkNumber, setSelectedSpkNumber] = useState<string>("");
  const [deliveryNoteNum, setDeliveryNoteNum] = useState<string>("");
  const [spkItemsCheck, setSpkItemsCheck] = useState<Array<{
    spare_part_id: string;
    spare_part_name: string;
    part_number: string;
    unit: string;
    qty_spk: number;
    qty_received: number;
    item_matched: "Sesuai" | "Tidak Sesuai";
    keeper_notes: string;
  }>>([]);
  const [keeperOverallNotes, setKeeperOverallNotes] = useState<string>("");

  // Auto populate SPK items when SPK selection changes
  useEffect(() => {
    if (selectedSpkNumber) {
      const spk = availableSpks.find(s => s && s.spk_number === selectedSpkNumber);
      if (spk) {
        const extracted: any[] = [];
        if (Array.isArray(spk.vessels)) {
          spk.vessels.forEach(v => {
            (v?.items || []).forEach(itm => {
              extracted.push({
                spare_part_id: itm.spare_part_id || `spk-item-${Math.random().toString(36).substring(7)}`,
                spare_part_name: itm.spare_part_name || "Sparepart",
                part_number: itm.part_number || "-",
                unit: itm.unit || "PCS",
                qty_spk: itm.qty_to_pick || 1,
                qty_received: itm.qty_to_pick || 1,
                item_matched: "Sesuai",
                keeper_notes: ""
              });
            });
          });
        } else if ((spk as any).items && Array.isArray((spk as any).items)) {
          (spk as any).items.forEach((itm: any) => {
            extracted.push({
              spare_part_id: itm.spare_part_id || `spk-item-${Math.random().toString(36).substring(7)}`,
              spare_part_name: itm.spare_part_name || itm.part_name || "Sparepart",
              part_number: itm.part_number || "-",
              unit: itm.unit || "PCS",
              qty_spk: itm.qty_to_pick || itm.qty_requested || 1,
              qty_received: itm.qty_to_pick || itm.qty_requested || 1,
              item_matched: "Sesuai",
              keeper_notes: ""
            });
          });
        }
        setSpkItemsCheck(extracted);
      }
    } else {
      setSpkItemsCheck([]);
    }
  }, [selectedSpkNumber]);

  // Verification state in detail modal
  const [verificationItems, setVerificationItems] = useState<any[]>([]);
  const [overallStatus, setOverallStatus] = useState<ReceivingStatus>(ReceivingStatus.ACCEPTED);
  const [overallRejectReason, setOverallRejectReason] = useState("");
  const [returnNoteNum, setReturnNoteNum] = useState("");
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [detailKeeperNotes, setDetailKeeperNotes] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.strokeStyle = "#1e3a8a"; // Dark navy blue signature ink
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();

    setSignatureDataUrl(canvas.toDataURL());
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl("");
  };

  // Manual PO creation state
  const [newPoForm, setNewPoForm] = useState({
    purchase_order_num: "",
    delivery_note_num: "",
    vendor_id: "vnd-1",
    selectedPartId: parts[0]?.id || "",
    qty_ordered: 5
  });

  const handleOpenVerifyModal = (rec: InboundReceiving) => {
    setActiveReceiving(rec);
    setVerificationItems(
      rec.items.map(itm => ({
        ...itm,
        qty_received: itm.qty_received || itm.qty_ordered,
        qty_rejected: itm.qty_rejected || 0,
        qc_status: itm.qc_status || "Verified",
        reject_reason: itm.reject_reason || "",
        item_matched: itm.item_matched || "Sesuai",
        keeper_notes: itm.keeper_notes || ""
      }))
    );
    setOverallStatus(rec.status === ReceivingStatus.PENDING ? ReceivingStatus.ACCEPTED : rec.status);
    setOverallRejectReason(rec.reject_reason || "");
    setReturnNoteNum(rec.return_note_num || "");
    setPhotoUploaded(!!rec.photo_evidence_url);
    setSignatureDataUrl((rec as any).signature_data_url || "");
    setDetailKeeperNotes(rec.keeper_notes || "");
  };

  const handleItemQtyChange = (idx: number, qtyReceived: number) => {
    const updated = [...verificationItems];
    const ordered = updated[idx].qty_ordered;
    const diff = ordered - qtyReceived;
    
    updated[idx].qty_received = Math.max(0, qtyReceived);
    updated[idx].qty_rejected = Math.max(0, diff);

    if (updated[idx].qty_rejected > 0) {
      updated[idx].qc_status = "Rejected";
      updated[idx].qty_matched_status = `QTY Kurang (-${diff})`;
      if (!updated[idx].reject_reason) {
        updated[idx].reject_reason = "Selisih QTY fisik saat penerimaan gudang";
      }
    } else if (qtyReceived > ordered) {
      updated[idx].qc_status = "Verified";
      updated[idx].qty_matched_status = `QTY Lebih (+${qtyReceived - ordered})`;
      updated[idx].reject_reason = "";
    } else {
      updated[idx].qc_status = "Verified";
      updated[idx].qty_matched_status = "QTY Sesuai";
      updated[idx].reject_reason = "";
    }
    setVerificationItems(updated);

    const anyRejected = updated.some(u => u.qty_rejected > 0);
    if (anyRejected) {
      setOverallStatus(ReceivingStatus.PARTIAL_REJECT);
    } else {
      setOverallStatus(ReceivingStatus.ACCEPTED);
    }
  };

  const handleCommitVerification = async () => {
    if (!activeReceiving) return;

    try {
      await onVerifyReceiving(activeReceiving.id, {
        status: overallStatus,
        items: verificationItems,
        reject_reason: overallRejectReason || (overallStatus !== ReceivingStatus.ACCEPTED ? "Pemeriksaan fisik gudang mencatat selisih QTY" : ""),
        return_note_num: overallStatus !== ReceivingStatus.ACCEPTED ? returnNoteNum || `RET-${Date.now().toString().slice(-4)}` : "",
        signature_data_url: signatureDataUrl,
        keeper_notes: detailKeeperNotes
      });
      setActiveReceiving(null);
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan verifikasi penerimaan gudang");
    }
  };

  // Submit SPK-based Receiving Verification (Tanpa Approval)
  const handleCreateInboundFromSpk = async () => {
    if (!selectedSpkNumber) {
      alert("Pilih nomor SPK terlebih dahulu.");
      return;
    }

    if (spkItemsCheck.length === 0) {
      alert("Tidak ada barang dalam SPK yang dipilih.");
      return;
    }

    try {
      const selectedSpk = availableSpks.find(s => s.spk_number === selectedSpkNumber);
      const itemsToSave = spkItemsCheck.map(item => {
        const qtyOrdered = Number(item.qty_spk) || 0;
        const qtyReceived = Number(item.qty_received) || 0;
        const qtyRejected = Math.max(0, qtyOrdered - qtyReceived);
        
        let qtyStatus = "QTY Sesuai";
        if (qtyReceived < qtyOrdered) qtyStatus = `QTY Kurang (-${qtyOrdered - qtyReceived})`;
        else if (qtyReceived > qtyOrdered) qtyStatus = `QTY Lebih (+${qtyReceived - qtyOrdered})`;

        return {
          spare_part_id: item.spare_part_id,
          spare_part_name: item.spare_part_name,
          part_number: item.part_number,
          qty_ordered: qtyOrdered,
          qty_received: qtyReceived,
          qty_rejected: qtyRejected,
          qc_status: "Verified" as const,
          item_matched: item.item_matched,
          qty_matched_status: qtyStatus,
          keeper_notes: item.keeper_notes || "Pemeriksaan fisik barang oleh penjaga gudang selesai"
        };
      });

      await onAddReceiving({
        purchase_order_num: selectedSpkNumber,
        spk_number: selectedSpkNumber,
        spk_id: selectedSpk?.id,
        delivery_note_num: deliveryNoteNum || `DN-SPK-${Math.floor(1000 + Math.random() * 9000)}`,
        vendor_id: "vnd-spk",
        vendor_name: selectedSpk?.vessels?.[0]?.vessel_name ? `Kapal ${selectedSpk.vessels[0].vessel_name}` : (selectedSpk as any)?.vessel_name ? `Kapal ${(selectedSpk as any).vessel_name}` : "Vendor Logistik BAG",
        items: itemsToSave,
        status: ReceivingStatus.ACCEPTED, // Direct ACCEPTED without approval
        keeper_notes: keeperOverallNotes || "Verifikasi fisik & QTY penjaga gudang selesai (Tanpa Approval). Barang siap masuk TUG 5.",
        received_date: new Date().toISOString()
      });

      setIsNewRecOpen(false);
      setSelectedSpkNumber("");
      setDeliveryNoteNum("");
      setSpkItemsCheck([]);
      setKeeperOverallNotes("");
    } catch(e: any) {
      alert(e.message || "Gagal menyimpan penerimaan barang SPK");
    }
  };

  const handleCreateInboundPo = async () => {
    if (!newPoForm.purchase_order_num) {
      alert("Nomor PO wajib diisi");
      return;
    }

    try {
      const part = parts.find(p => p.id === newPoForm.selectedPartId) || parts[0];
      await onAddReceiving({
        purchase_order_num: newPoForm.purchase_order_num,
        delivery_note_num: newPoForm.delivery_note_num || `DN-${Math.floor(1000 + Math.random() * 9000)}`,
        vendor_id: part.vendor_id,
        items: [{
          spare_part_id: part.id,
          spare_part_name: part.part_name,
          part_number: part.part_number,
          qty_ordered: Number(newPoForm.qty_ordered),
          qty_received: Number(newPoForm.qty_ordered),
          qty_rejected: 0,
          qc_status: "Verified",
          item_matched: "Sesuai",
          qty_matched_status: "QTY Sesuai",
          keeper_notes: "Input manual penyerahan penerimaan gudang"
        }],
        status: ReceivingStatus.ACCEPTED
      });
      setIsNewRecOpen(false);
      setNewPoForm({
        purchase_order_num: "",
        delivery_note_num: "",
        vendor_id: "vnd-1",
        selectedPartId: parts[0]?.id || "",
        qty_ordered: 5
      });
    } catch(e: any) {
      alert(e.message || "Gagal menyimpan PO manual");
    }
  };

  const filtered = (receivingList || []).filter(r => {
    if (!r) return false;
    const poNum = r.purchase_order_num || "";
    const spkNum = r.spk_number || "";
    const dnNum = r.delivery_note_num || "";
    const vName = r.vendor_name || "";
    return poNum.toLowerCase().includes(search.toLowerCase()) || 
           spkNum.toLowerCase().includes(search.toLowerCase()) ||
           dnNum.toLowerCase().includes(search.toLowerCase()) || 
           vName.toLowerCase().includes(search.toLowerCase());
  });

  const recTotalPages = Math.ceil(filtered.length / recPerPage);
  const paginatedRec = filtered.slice((recPage - 1) * recPerPage, recPage * recPerPage);

  const isAllPageSelected = paginatedRec.length > 0 && paginatedRec.every(r => selectedRecIds.includes(r.id));
  const isSomePageSelected = paginatedRec.some(r => selectedRecIds.includes(r.id));

  const handleSelectAllPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedRec.map(r => r.id);
      const combined = Array.from(new Set([...selectedRecIds, ...pageIds]));
      setSelectedRecIds(combined);
    } else {
      const pageIds = new Set(paginatedRec.map(r => r.id));
      setSelectedRecIds(selectedRecIds.filter(id => !pageIds.has(id)));
    }
  };

  const handleToggleSelectRow = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedRecIds(prev => [...prev, id]);
    } else {
      setSelectedRecIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRecIds.length === 0 || !onDeleteReceiving) return;
    const confirmMsg = `Apakah Anda yakin ingin menghapus ${selectedRecIds.length} data Penerimaan Barang yang dichecklist?`;
    if (!confirm(confirmMsg)) return;

    setIsBulkDeleting(true);
    const totalToDelete = selectedRecIds.length;
    try {
      for (const id of selectedRecIds) {
        await onDeleteReceiving(id);
      }
      setSelectedRecIds([]);
      alert(`Berhasil menghapus ${totalToDelete} data Penerimaan Barang.`);
    } catch (err: any) {
      console.error("Bulk delete error:", err);
      alert("Terjadi kesalahan saat menghapus data Penerimaan Barang.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 border-l border-slate-200">
      
      {/* Module Title Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div>
          <h1 className="text-base font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-2.5">
            <ArrowDownLeft className="w-5 h-5 text-blue-600" />
            Receiving (Inbound) — Penerimaan Barang Gudang
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans font-medium">
            Pengecekan fisik barang datang berdasarkan list SPK (Kesesuaian Item, QTY, Catatan Penjaga Gudang — Langsung Terverifikasi Tanpa Approval)
          </p>
        </div>

        {/* Penerimaan Goods Trigger */}
        {role !== UserRole.VESSEL_CREW && (
          <button
            onClick={() => {
              setReceivingSourceMode("spk");
              setIsNewRecOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase font-extrabold px-5 py-3 rounded-lg shadow-md hover:shadow-blue-500/20 transition-all cursor-pointer"
          >
            <ClipboardCheck className="w-4.5 h-4.5 text-blue-200" />
            Terima Barang Datang (List SPK)
          </button>
        )}
      </div>

      {/* Advanced Search & Filter Bar */}
      <section className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row gap-3 items-center shrink-0 shadow-xs no-print">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Cari No. SPK, No. PO, Surat Jalan, atau nama vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-250 text-slate-800 p-2.5 pl-9 text-xs rounded-lg outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-450 font-sans font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
        </div>
        <div className="ml-auto text-[10px] text-slate-500 font-mono tracking-wider font-extrabold uppercase flex items-center gap-2">
          <Boxes className="w-4 h-4 text-blue-600" />
          <span>{filtered.length} Total Data Penerimaan Logistik</span>
        </div>
      </section>

      {/* Main Receiving Orders Data Grid */}
      <section className="flex-1 flex flex-col min-h-0 bg-white">
        
        {/* Bulk Delete Action Bar */}
        {selectedRecIds.length > 0 && onDeleteReceiving && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between shadow-xs sticky top-0 z-20">
            <div className="flex items-center gap-2 font-mono text-xs text-rose-900 font-extrabold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Terpilih <span className="bg-rose-200 text-rose-950 px-2 py-0.5 rounded font-black">{selectedRecIds.length}</span> Data Penerimaan</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setSelectedRecIds([])}
                className="px-3 py-1 bg-white border border-rose-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
              >
                Batal Pilih
              </button>
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={handleBulkDelete}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 text-white text-[11px] font-mono font-black uppercase rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBulkDeleting ? "Menghapus..." : `Hapus (${selectedRecIds.length}) Terpilih`}</span>
              </button>
            </div>
          </div>
        )}

        <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-slate-700">
            <Truck className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase font-mono tracking-widest">
              Daftar Log Audit Penerimaan Barang Datang Gudang
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs italic font-mono uppercase">
              Belum ada rekor penerimaan barang yang terdaftar.
            </div>
          ) : (
             <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-[10px] font-mono font-extrabold text-slate-600 uppercase border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="p-3.5 w-10 text-center bg-slate-50">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer accent-indigo-600"
                      checked={isAllPageSelected}
                      ref={input => {
                        if (input) input.indeterminate = !isAllPageSelected && isSomePageSelected;
                      }}
                      onChange={handleSelectAllPage}
                      title="Pilih Semua di Halaman Ini"
                    />
                  </th>
                  <th className="p-3.5 w-10 text-center bg-slate-50">NO</th>
                  <th className="p-3.5">No. SPK / Ref Pekerjaan</th>
                  <th className="p-3.5">No. Surat Jalan (DN)</th>
                  <th className="p-3.5">Vendor / Asal Kapal</th>
                  <th className="p-3.5">Jumlah Item &amp; QTY Datang</th>
                  <th className="p-3.5">Tanggal Penerimaan</th>
                  <th className="p-3.5 text-center">Status Verifikasi</th>
                  <th className="p-3.5 text-right no-print">Aksi &amp; Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {paginatedRec.map((item, idx) => {
                  const itemsCount = item.items.length;
                  const totalUnitsReceived = item.items.reduce((sum, i) => sum + (i.qty_received || i.qty_ordered || 0), 0);
                  const totalUnitsOrdered = item.items.reduce((sum, i) => sum + (i.qty_ordered || 0), 0);
                  const hasDiscrepancy = item.items.some(i => (i.qty_received || 0) < (i.qty_ordered || 0));
                  const isSelected = selectedRecIds.includes(item.id);

                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors font-semibold ${
                        isSelected ? "bg-rose-50/60" : "hover:bg-blue-50/40"
                      }`}
                    >
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer accent-indigo-600"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectRow(item.id, e)}
                        />
                      </td>
                      <td className="p-3.5 text-center text-slate-500 font-mono font-bold">{(recPage - 1) * recPerPage + idx + 1}</td>
                      <td className="p-3.5 font-mono text-blue-700 font-extrabold">
                        {item.spk_number || item.purchase_order_num}
                        {item.spk_number && (
                          <span className="block text-[9px] text-emerald-700 font-mono font-bold">
                            Ref SPK Terhubung
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">{item.delivery_note_num}</td>
                      <td className="p-3.5 truncate max-w-[160px] font-bold text-slate-900">{item.vendor_name}</td>
                      <td className="p-3.5">
                        <span className="font-bold block text-slate-900">{itemsCount} jenis barang</span>
                        <span className={`text-[10px] font-mono font-bold ${hasDiscrepancy ? "text-amber-600" : "text-emerald-600"}`}>
                          Diterima: {totalUnitsReceived} / {totalUnitsOrdered} unit {hasDiscrepancy ? "(Ada Selisih)" : "(Lengkap)"}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-500 truncate">
                        {new Date(item.received_date || item.created_at || Date.now()).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded text-[9px] uppercase font-black tracking-wider shadow-2xs inline-flex items-center gap-1 ${
                          item.status === ReceivingStatus.ACCEPTED 
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : item.status === ReceivingStatus.PARTIAL_REJECT 
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-rose-100 text-rose-800 border border-rose-300"
                        }`}>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Terverifikasi Gudang (Siap TUG 5)
                        </span>
                      </td>
                      <td className="p-3.5 text-right no-print relative">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenVerifyModal(item)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Lihat Detail Audit</span>
                          </button>

                          {onDeleteReceiving && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Apakah Anda yakin ingin menghapus data Penerimaan Barang [${item.spk_number || item.purchase_order_num}]?`)) {
                                  await onDeleteReceiving(item.id);
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                              title="Hapus Data Penerimaan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modern Sticky Pagination Bar for Receiving */}
        <div className="bg-white border-t border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans text-xs shrink-0 shadow-md sticky bottom-0 z-20 no-print">
          {/* Left: Record Range Summary & Per Page Selector */}
          <div className="flex items-center gap-4 text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 uppercase font-bold">Baris per halaman:</span>
              <select
                value={recPerPage}
                onChange={(e) => {
                  setRecPerPage(Number(e.target.value));
                  setRecPage(1);
                }}
                className="bg-slate-50 border border-slate-250 text-slate-800 text-xs font-bold font-mono rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] font-mono text-slate-600 font-bold">
              Menampilkan <span className="text-slate-900 font-black">{filtered.length > 0 ? (recPage - 1) * recPerPage + 1 : 0}</span> - <span className="text-slate-900 font-black">{Math.min(recPage * recPerPage, filtered.length)}</span> dari <span className="text-slate-900 font-black">{filtered.length}</span> data Penerimaan
            </span>
          </div>

          {/* Right: Page Number Buttons */}
          <div className="flex items-center gap-1 font-mono">
            <button
              disabled={recPage === 1}
              onClick={() => setRecPage(1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              disabled={recPage === 1}
              onClick={() => setRecPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 px-2.5 text-xs font-bold"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden md:inline">Sebelumnya</span>
            </button>

            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: recTotalPages || 1 }, (_, i) => i + 1)
                .filter(p => p === 1 || p === recTotalPages || Math.abs(p - recPage) <= 1)
                .map((p, i, arr) => {
                  const prev = arr[i - 1];
                  const showEllipsis = prev && p - prev > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-slate-400 font-bold">...</span>}
                      <button
                        onClick={() => setRecPage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          recPage === p
                            ? "bg-slate-900 text-white shadow-xs font-black"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              disabled={recPage >= recTotalPages || recTotalPages <= 1}
              onClick={() => setRecPage(p => Math.min(recTotalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 px-2.5 text-xs font-bold"
              title="Halaman Selanjutnya"
            >
              <span className="hidden md:inline">Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              disabled={recPage >= recTotalPages || recTotalPages <= 1}
              onClick={() => setRecPage(recTotalPages)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* DETAIL MODAL: QA VERIFICATION & KEEPER AUDIT CHECKLIST */}
      {activeReceiving && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white text-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col border border-slate-200">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-display font-extrabold text-xs uppercase tracking-widest">
                  Detail Pemeriksaan Penerimaan Gudang: {activeReceiving.spk_number || activeReceiving.purchase_order_num}
                </h3>
              </div>
              <button onClick={() => setActiveReceiving(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh] font-sans">
              
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-lg text-xs leading-relaxed">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">Rincian SPK &amp; Pengiriman</p>
                  <p className="text-blue-700 font-black text-sm">No. SPK: {activeReceiving.spk_number || activeReceiving.purchase_order_num}</p>
                  <p className="text-slate-700 font-semibold mt-0.5">Surat Jalan (DN): {activeReceiving.delivery_note_num}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">Pemasok / Armada Kapal</p>
                  <p className="text-slate-900 font-extrabold text-sm">{activeReceiving.vendor_name}</p>
                  <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] font-mono border border-emerald-200">
                    ✓ Terverifikasi Gudang (Siap Dipakai TUG 5)
                  </span>
                </div>
              </div>

              {/* Items Verification check boxes */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4 text-blue-600" />
                  Daftar Barang SPK &amp; Pengecekan Fisik Gudang
                </h4>

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                  {verificationItems.map((vItem, idx) => (
                    <div key={idx} className="p-4 bg-white hover:bg-slate-50/70 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold border border-slate-200">
                            Part No: {vItem.part_number}
                          </span>
                          <p className="font-bold text-sm text-slate-900 mt-1">{vItem.spare_part_name}</p>
                          <p className="text-[11px] font-bold text-blue-700 mt-0.5">
                            QTY Dipesan (SPK): {vItem.qty_ordered} {vItem.unit || "PCS"}
                          </p>
                        </div>

                        {/* QC controls */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex flex-col">
                            <label className="text-[9px] pb-1 uppercase font-bold text-slate-500 text-right font-mono">Status Kesesuaian</label>
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase text-center ${vItem.item_matched === "Tidak Sesuai" ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"}`}>
                              {vItem.item_matched || "Sesuai"}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <label className="text-[9px] pb-1 uppercase font-bold text-slate-500 text-right font-mono">QTY Diterima</label>
                            <input 
                              type="number" 
                              value={vItem.qty_received}
                              onChange={(e) => handleItemQtyChange(idx, Number(e.target.value))}
                              className="bg-slate-50 border border-slate-300 p-1.5 w-20 text-center font-mono font-bold text-xs text-slate-900 rounded-lg focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex flex-col text-right">
                            <span className="text-[9px] uppercase font-mono font-bold text-slate-400">Pengecekan QTY</span>
                            <span className={`font-mono text-xs font-extrabold px-2 py-1 rounded mt-0.5 ${
                              vItem.qty_received === vItem.qty_ordered 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : vItem.qty_received < vItem.qty_ordered 
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-blue-50 text-blue-800 border border-blue-200"
                            }`}>
                              {vItem.qty_received === vItem.qty_ordered 
                                ? "✓ QTY Sesuai" 
                                : vItem.qty_received < vItem.qty_ordered 
                                ? `⚠️ Kurang (-${vItem.qty_ordered - vItem.qty_received})`
                                : `ℹ️ Lebih (+${vItem.qty_received - vItem.qty_ordered})`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Notes row */}
                      <div>
                        <input
                          type="text"
                          value={vItem.keeper_notes || ""}
                          onChange={(e) => {
                            const up = [...verificationItems];
                            up[idx].keeper_notes = e.target.value;
                            setVerificationItems(up);
                          }}
                          placeholder="Catatan penjaga gudang per item (opsional)..."
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Keeper Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan Umum Penjaga Gudang:
                </label>
                <textarea
                  rows={2}
                  value={detailKeeperNotes}
                  onChange={(e) => setDetailKeeperNotes(e.target.value)}
                  placeholder="Tuliskan catatan kondisi fisik kemasan/pengiriman dari penjaga gudang..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* INTERACTIVE DIGITAL SIGNATURE PAD */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold font-display uppercase tracking-tight text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                      Paraf Verifikasi Penjaga Gudang
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Goreskan paraf tanda tangan pemeriksaan fisik penerimaan barang
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    Hapus Paraf
                  </button>
                </div>
                
                <div className="relative border border-slate-300 rounded-lg bg-white overflow-hidden shadow-inner h-[110px] cursor-crosshair">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={110}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-full block"
                  />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[85%] border-b border-dashed border-slate-300 pointer-events-none text-center pb-0.5 select-none">
                    <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">
                      Area Paraf Penjaga Gudang
                    </span>
                  </div>
                </div>
              </div>

              {/* Notice Banner - No Approval Required */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Penerimaan Gudang Langsung Terverifikasi:</strong> Data penerimaan barang ini tersimpan secara otomatis dan dapat langsung digunakan pada pengajuan <strong>TUG 5 (Permintaan Barang)</strong> tanpa perlu menunggu approval manager.
                </span>
              </div>

              {/* Modal Actions */}
              <div className="bg-slate-900 border-t border-slate-100 p-4 -mx-6 -mb-6 flex justify-end gap-3 font-mono">
                <button
                  type="button"
                  onClick={() => setActiveReceiving(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCommitVerification}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase cursor-pointer transition-colors"
                >
                  Simpan Verifikasi Gudang
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* NEW SPK-BASED INBOUND GOODS RECEIVING MODAL */}
      {isNewRecOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white text-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-400" />
                <h3 className="font-display font-extrabold text-xs uppercase tracking-widest">
                  Form Penerimaan Barang Datang (Pengecekan Fisik Gudang)
                </h3>
              </div>
              <button 
                onClick={() => setIsNewRecOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 font-sans text-xs">
              
              {/* Mode Toggle Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setReceivingSourceMode("spk")}
                  className={`flex-1 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    receivingSourceMode === "spk" 
                      ? "bg-white text-blue-700 shadow-sm border border-slate-250 font-extrabold" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Penerimaan Berdasarkan List SPK</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReceivingSourceMode("manual")}
                  className={`flex-1 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    receivingSourceMode === "manual" 
                      ? "bg-white text-blue-700 shadow-sm border border-slate-250 font-extrabold" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Boxes className="w-4 h-4 text-slate-500" />
                  <span>Input Manual / Non-SPK</span>
                </button>
              </div>

              {receivingSourceMode === "spk" ? (
                /* SPK-Based Inbound Receiving Form */
                <div className="space-y-4">
                  
                  {/* SPK Selector */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-1.5">
                      Pilih Nomor SPK / Perintah Kerja Datang *
                    </label>
                    <select
                      value={selectedSpkNumber}
                      onChange={(e) => setSelectedSpkNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 font-mono font-extrabold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                      <option value="">-- Pilih Nomor SPK Terdaftar --</option>
                      {(availableSpks || []).map(spk => {
                        if (!spk) return null;
                        const vesselName = spk.vessels?.[0]?.vessel_name || (spk as any).vessel_name || 'Kapal';
                        const spkNum = spk.spk_number || spk.id || 'SPK';
                        const statusText = spk.status || 'Aktif';
                        return (
                          <option key={spk.id || spkNum} value={spkNum}>
                            {spkNum} — {vesselName} ({statusText})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Delivery Note Input */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-1.5">
                      Nomor Surat Jalan / Airbill (DN)
                    </label>
                    <input
                      type="text"
                      value={deliveryNoteNum}
                      onChange={(e) => setDeliveryNoteNum(e.target.value)}
                      placeholder="DN-2026-0901A"
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 text-xs font-mono text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* SPK Loaded Items Verification Section */}
                  {selectedSpkNumber && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
                          <ClipboardCheck className="w-4 h-4 text-blue-600" />
                          Pengecekan Fisik Item Datang dari SPK
                        </h4>
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          Total: {spkItemsCheck.length} Item
                        </span>
                      </div>

                      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden max-h-[300px] overflow-y-auto bg-white">
                        {spkItemsCheck.map((item, idx) => {
                          const qtyOrd = Number(item.qty_spk) || 0;
                          const qtyRec = Number(item.qty_received) || 0;
                          
                          return (
                            <div key={idx} className="p-3.5 space-y-2 hover:bg-slate-50">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <span className="font-mono text-[11px] text-slate-500 font-bold">
                                    Part No: {item.part_number}
                                  </span>
                                  <p className="font-bold text-xs text-slate-900 mt-0.5">{item.spare_part_name}</p>
                                  <span className="text-[10px] font-bold text-blue-700 font-mono">
                                    QTY SPK: {item.qty_spk} {item.unit}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {/* Item Match Radio */}
                                  <div className="flex flex-col">
                                    <label className="text-[9px] uppercase font-bold text-slate-500 font-mono block mb-1">Kesesuaian Item</label>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const up = [...spkItemsCheck];
                                          up[idx].item_matched = "Sesuai";
                                          setSpkItemsCheck(up);
                                        }}
                                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                          item.item_matched === "Sesuai" 
                                            ? "bg-emerald-600 text-white shadow-xs" 
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                      >
                                        ✓ Sesuai
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const up = [...spkItemsCheck];
                                          up[idx].item_matched = "Tidak Sesuai";
                                          setSpkItemsCheck(up);
                                        }}
                                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                          item.item_matched === "Tidak Sesuai" 
                                            ? "bg-rose-600 text-white shadow-xs" 
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                      >
                                        ✕ Tidak Sesuai
                                      </button>
                                    </div>
                                  </div>

                                  {/* Received QTY Input */}
                                  <div className="flex flex-col">
                                    <label className="text-[9px] uppercase font-bold text-slate-500 font-mono block mb-1">QTY Datang</label>
                                    <input
                                      type="number"
                                      value={item.qty_received}
                                      onChange={(e) => {
                                        const up = [...spkItemsCheck];
                                        up[idx].qty_received = Number(e.target.value);
                                        setSpkItemsCheck(up);
                                      }}
                                      className="w-16 bg-slate-50 border border-slate-300 p-1.5 text-center font-mono font-bold text-xs text-slate-900 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                  </div>

                                  {/* QTY Match Badge */}
                                  <div className="flex flex-col">
                                    <label className="text-[9px] uppercase font-bold text-slate-500 font-mono block mb-1">Status QTY</label>
                                    <span className={`px-2 py-1 rounded text-[9.5px] font-black font-mono inline-block text-center ${
                                      qtyRec === qtyOrd 
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-250"
                                        : qtyRec < qtyOrd 
                                        ? "bg-amber-100 text-amber-800 border border-amber-250"
                                        : "bg-blue-100 text-blue-800 border border-blue-250"
                                    }`}>
                                      {qtyRec === qtyOrd 
                                        ? "✓ QTY Sesuai" 
                                        : qtyRec < qtyOrd 
                                        ? `⚠️ QTY Kurang (-${qtyOrd - qtyRec})`
                                        : `ℹ️ QTY Lebih (+${qtyRec - qtyOrd})`}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Item Keeper Notes */}
                              <div>
                                <input
                                  type="text"
                                  value={item.keeper_notes}
                                  onChange={(e) => {
                                    const up = [...spkItemsCheck];
                                    up[idx].keeper_notes = e.target.value;
                                    setSpkItemsCheck(up);
                                  }}
                                  placeholder="Catatan penjaga gudang per item (misal: kemasan rapat, kondisi fisik utuh)..."
                                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-[11px] px-2.5 py-1 rounded-md focus:bg-white outline-none"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Overall Keeper Notes */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-1">
                      Catatan Penjaga Gudang (Keseluruhan)
                    </label>
                    <textarea
                      rows={2}
                      value={keeperOverallNotes}
                      onChange={(e) => setKeeperOverallNotes(e.target.value)}
                      placeholder="Tuliskan catatan pemeriksaan fisik penerimaan barang dari penjaga gudang..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Informational Banner: No Approval Needed */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-[11px] flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Verifikasi Langsung Penjaga Gudang (Tanpa Approval):</strong> Setelah dikonfirmasi, data barang penerimaan ini langsung terverifikasi di stok gudang dan siap dipakai untuk <strong>TUG 5</strong>.
                    </span>
                  </div>

                </div>
              ) : (
                /* Manual PO Form */
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-1">
                      Nomor Referensi PO / Dokumen *
                    </label>
                    <input
                      type="text"
                      required
                      value={newPoForm.purchase_order_num}
                      onChange={(e) => setNewPoForm({ ...newPoForm, purchase_order_num: e.target.value })}
                      placeholder="PO-2026-X9921"
                      className="w-full bg-slate-50 border border-slate-300 p-2 text-xs font-mono font-bold text-slate-800 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-1">
                      Nomor Surat Jalan (DN)
                    </label>
                    <input
                      type="text"
                      value={newPoForm.delivery_note_num}
                      onChange={(e) => setNewPoForm({ ...newPoForm, delivery_note_num: e.target.value })}
                      placeholder="DN-VND-442"
                      className="w-full bg-slate-50 border border-slate-300 p-2 text-xs font-mono rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-1">
                      Pilih Item Sparepart
                    </label>
                    <select
                      value={newPoForm.selectedPartId}
                      onChange={(e) => setNewPoForm({ ...newPoForm, selectedPartId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 p-2 text-xs text-slate-900 font-bold rounded-lg cursor-pointer"
                    >
                      {parts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.part_name} ({p.part_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-1">
                      Jumlah QTY Datang
                    </label>
                    <input
                      type="number"
                      value={newPoForm.qty_ordered}
                      onChange={(e) => setNewPoForm({ ...newPoForm, qty_ordered: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 p-2 text-xs text-slate-900 font-mono rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="bg-slate-900 border-t border-slate-200 p-4 -mx-6 -mb-6 flex justify-end gap-3 font-mono">
                <button
                  type="button"
                  onClick={() => setIsNewRecOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase cursor-pointer"
                >
                  Batal
                </button>

                {receivingSourceMode === "spk" ? (
                  <button
                    type="button"
                    onClick={handleCreateInboundFromSpk}
                    disabled={!selectedSpkNumber}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Konfirmasi &amp; Simpan Penerimaan Gudang</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreateInboundPo}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
                  >
                    Simpan Penerimaan Manual
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
