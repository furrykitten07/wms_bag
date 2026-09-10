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
  Info,
  Clock,
  History,
  Calendar,
  UserCheck,
  RefreshCw,
  BadgeCheck
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

  // Audit log & Resolve state
  const [detailTab, setDetailTab] = useState<"items" | "logs">("items");
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolveCompletionDate, setResolveCompletionDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [resolveNotes, setResolveNotes] = useState("Barang susulan/pengganti telah diterima secara fisik dan diperiksa LENGKAP & SESUAI oleh Penjaga Gudang.");
  const [resolveConfirmed, setResolveConfirmed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Resize canvas to match container & load existing signature
  useEffect(() => {
    if (activeReceiving && canvasRef.current && detailTab === "items") {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) {
        canvas.width = rect.width;
        canvas.height = Math.max(140, rect.height);
      } else {
        canvas.width = 600;
        canvas.height = 140;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const sigUrl = signatureDataUrl || activeReceiving.signature_data_url || (activeReceiving as any).signature_data_url;
      if (sigUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = sigUrl;
      }
    }
  }, [activeReceiving, detailTab]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.strokeStyle = "#1e3a8a"; // Dark navy blue signature ink
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);

    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);

    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      setSignatureDataUrl(dataUrl);
    }
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
    setDetailTab("items");
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

    if (updated[idx].item_matched === "Tidak Sesuai" || updated[idx].qty_rejected > 0) {
      updated[idx].qc_status = "Rejected";
      updated[idx].qty_matched_status = updated[idx].item_matched === "Tidak Sesuai" ? "Item Tidak Sesuai" : `QTY Kurang (-${diff})`;
      if (!updated[idx].reject_reason) {
        updated[idx].reject_reason = updated[idx].item_matched === "Tidak Sesuai" ? "Spesifikasi item tidak sesuai SPK" : "Selisih QTY fisik saat penerimaan gudang";
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

    const anyNotMatched = updated.some(u => u.item_matched === "Tidak Sesuai" || u.qty_rejected > 0);
    const allNotMatched = updated.every(u => u.item_matched === "Tidak Sesuai" || u.qty_received === 0);

    if (allNotMatched) {
      setOverallStatus(ReceivingStatus.FULL_REJECT);
    } else if (anyNotMatched) {
      setOverallStatus(ReceivingStatus.PARTIAL_REJECT);
    } else {
      setOverallStatus(ReceivingStatus.ACCEPTED);
    }
  };

  const handleCommitVerification = async () => {
    if (!activeReceiving) return;

    try {
      const existingLogs = activeReceiving.audit_logs || [];
      const statusChanged = activeReceiving.status !== overallStatus;
      
      const newLogEntry = {
        timestamp: new Date().toISOString(),
        username: role === UserRole.SUPER_ADMIN ? "Super Admin" : "Penjaga Gudang",
        action: overallStatus === ReceivingStatus.ACCEPTED 
          ? "Verifikasi Gudang Disimpan (Lengkap & Sesuai)" 
          : statusChanged 
          ? `Status Diubah Menjadi ${overallStatus}` 
          : "Pemeriksaan Gudang Diperbarui",
        notes: detailKeeperNotes || (overallStatus === ReceivingStatus.ACCEPTED ? "Fisik & QTY Terverifikasi Sesuai" : "Terdapat catatan fisik / ketidaksesuaian barang"),
        status_before: activeReceiving.status,
        status_after: overallStatus
      };

      const updatedLogs = [newLogEntry, ...existingLogs];

      await onVerifyReceiving(activeReceiving.id, {
        status: overallStatus,
        items: verificationItems,
        reject_reason: overallRejectReason || (overallStatus !== ReceivingStatus.ACCEPTED ? "Pemeriksaan fisik gudang mencatat ketidaksesuaian/selisih QTY" : ""),
        return_note_num: overallStatus !== ReceivingStatus.ACCEPTED ? returnNoteNum || `RET-${Date.now().toString().slice(-4)}` : "",
        signature_data_url: signatureDataUrl,
        keeper_notes: detailKeeperNotes,
        completion_date: overallStatus === ReceivingStatus.ACCEPTED ? (activeReceiving.completion_date || new Date().toISOString()) : undefined,
        audit_logs: updatedLogs
      } as any);

      setActiveReceiving(null);
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan verifikasi penerimaan gudang");
    }
  };

  const handleConfirmResolveToAccepted = async () => {
    if (!activeReceiving) return;
    if (!resolveConfirmed) {
      alert("Harap centang persetujuan verifikasi fisik barang sebelum melanjutkan.");
      return;
    }

    const updatedItems = verificationItems.map(itm => ({
      ...itm,
      qty_received: itm.qty_ordered,
      qty_rejected: 0,
      item_matched: "Sesuai" as const,
      qc_status: "Verified" as const,
      qty_matched_status: "QTY Sesuai",
      reject_reason: ""
    }));

    const resolveLogEntry = {
      timestamp: new Date().toISOString(),
      username: role === UserRole.SUPER_ADMIN ? "Super Admin" : "Penjaga Gudang",
      action: "Status Diubah Menjadi Sesuai / Lengkap",
      notes: resolveNotes || "Barang susulan diterima dan terverifikasi lengkap.",
      status_before: activeReceiving.status,
      status_after: ReceivingStatus.ACCEPTED
    };

    const updatedLogs = [resolveLogEntry, ...(activeReceiving.audit_logs || [])];

    try {
      const compDate = resolveCompletionDate ? new Date(resolveCompletionDate).toISOString() : new Date().toISOString();

      await onVerifyReceiving(activeReceiving.id, {
        status: ReceivingStatus.ACCEPTED,
        items: updatedItems,
        keeper_notes: detailKeeperNotes ? `${detailKeeperNotes}\n[UPDATE SESUAI]: ${resolveNotes}` : `[UPDATE SESUAI]: ${resolveNotes}`,
        completion_date: compDate,
        audit_logs: updatedLogs
      } as any);

      setActiveReceiving(null);
      setIsResolveModalOpen(false);
      alert("Berhasil memperbarui status penerimaan barang menjadi SESUAI & LENGKAP.");
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui status penerimaan barang.");
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
      
      let hasMismatch = false;
      let hasDiscrepancy = false;
      let allRejected = true;

      const itemsToSave = spkItemsCheck.map(item => {
        const qtyOrdered = Number(item.qty_spk) || 0;
        const qtyReceived = Number(item.qty_received) || 0;
        const qtyRejected = Math.max(0, qtyOrdered - qtyReceived);
        const isMatched = item.item_matched === "Sesuai";

        if (!isMatched) hasMismatch = true;
        if (qtyReceived < qtyOrdered || qtyReceived > qtyOrdered) hasDiscrepancy = true;
        if (isMatched && qtyReceived >= qtyOrdered) allRejected = false;

        let qtyStatus = "QTY Sesuai";
        if (qtyReceived < qtyOrdered) qtyStatus = `QTY Kurang (-${qtyOrdered - qtyReceived})`;
        else if (qtyReceived > qtyOrdered) qtyStatus = `QTY Lebih (+${qtyReceived - qtyOrdered})`;

        const itemQcStatus: "Verified" | "Rejected" = (!isMatched || qtyRejected > 0) ? "Rejected" : "Verified";
        const defaultNotes = !isMatched 
          ? "Item fisik tidak sesuai dengan spesifikasi SPK" 
          : qtyRejected > 0 
          ? `Terdapat selisih QTY fisik (-${qtyRejected})` 
          : "Pemeriksaan fisik barang oleh penjaga gudang sesuai";

        return {
          spare_part_id: item.spare_part_id,
          spare_part_name: item.spare_part_name,
          part_number: item.part_number,
          qty_ordered: qtyOrdered,
          qty_received: qtyReceived,
          qty_rejected: qtyRejected,
          qc_status: itemQcStatus,
          item_matched: item.item_matched,
          qty_matched_status: qtyStatus,
          keeper_notes: (item.keeper_notes || "").trim() || defaultNotes,
          reject_reason: !isMatched ? "Item fisik tidak sesuai SPK" : (qtyRejected > 0 ? `Selisih QTY (-${qtyRejected})` : undefined)
        };
      });

      let calculatedStatus: ReceivingStatus = ReceivingStatus.ACCEPTED;
      if (allRejected) {
        calculatedStatus = ReceivingStatus.FULL_REJECT;
      } else if (hasMismatch || hasDiscrepancy) {
        calculatedStatus = ReceivingStatus.PARTIAL_REJECT;
      }

      const defaultOverallNotes = calculatedStatus === ReceivingStatus.ACCEPTED
        ? "Verifikasi fisik & QTY penjaga gudang sesuai. Barang siap digunakan untuk TUG 5."
        : calculatedStatus === ReceivingStatus.PARTIAL_REJECT
        ? "Pemeriksaan fisik mencatat sebagian item tidak sesuai atau ada selisih QTY."
        : "Pemeriksaan fisik mencatat seluruh barang tidak sesuai / ditolak.";

      const initialLogs = [{
        timestamp: new Date().toISOString(),
        username: role === UserRole.SUPER_ADMIN ? "Super Admin" : "Penjaga Gudang",
        action: "Penerimaan Dicatat",
        notes: (keeperOverallNotes || "").trim() || defaultOverallNotes,
        status_before: "-",
        status_after: calculatedStatus
      }];

      await onAddReceiving({
        purchase_order_num: selectedSpkNumber,
        spk_number: selectedSpkNumber,
        spk_id: selectedSpk?.id,
        delivery_note_num: deliveryNoteNum || `DN-SPK-${Math.floor(1000 + Math.random() * 9000)}`,
        vendor_id: "vnd-spk",
        vendor_name: selectedSpk?.vessels?.[0]?.vessel_name ? `Kapal ${selectedSpk.vessels[0].vessel_name}` : (selectedSpk as any)?.vessel_name ? `Kapal ${(selectedSpk as any).vessel_name}` : "Vendor Logistik BAG",
        items: itemsToSave,
        status: calculatedStatus,
        keeper_notes: (keeperOverallNotes || "").trim() || defaultOverallNotes,
        received_date: new Date().toISOString(),
        completion_date: calculatedStatus === ReceivingStatus.ACCEPTED ? new Date().toISOString() : undefined,
        audit_logs: initialLogs
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
                        <span className={`text-[10px] font-mono font-bold block ${
                          item.status === ReceivingStatus.FULL_REJECT || item.items.some(i => i.item_matched === "Tidak Sesuai")
                            ? "text-rose-600 font-extrabold"
                            : hasDiscrepancy 
                            ? "text-amber-600 font-extrabold" 
                            : "text-emerald-600"
                        }`}>
                          Diterima: {totalUnitsReceived} / {totalUnitsOrdered} unit {
                            item.items.some(i => i.item_matched === "Tidak Sesuai")
                              ? "(Ada Barang Tidak Sesuai)"
                              : hasDiscrepancy 
                              ? "(Ada Selisih QTY)" 
                              : "(Lengkap)"
                          }
                        </span>
                        {item.keeper_notes && (
                          <div className="mt-1 text-[10px] font-medium text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-250 truncate max-w-[240px]" title={item.keeper_notes}>
                            <span className="font-bold text-slate-900 font-mono">Notes:</span> {item.keeper_notes}
                          </div>
                        )}
                        {item.signature_data_url && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[9.5px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <BadgeCheck className="w-3 h-3 text-emerald-600" />
                            <span>Paraf Gudang Ada</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500 truncate">
                        {new Date(item.received_date || item.created_at || Date.now()).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded text-[9.5px] uppercase font-black tracking-wider shadow-2xs inline-flex items-center gap-1.5 ${
                          item.status === ReceivingStatus.ACCEPTED || item.status === ReceivingStatus.VERIFIED
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : item.status === ReceivingStatus.PARTIAL_REJECT 
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : item.status === ReceivingStatus.FULL_REJECT
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : "bg-slate-100 text-slate-800 border border-slate-300"
                        }`}>
                          {item.status === ReceivingStatus.ACCEPTED || item.status === ReceivingStatus.VERIFIED ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Sesuai (Siap TUG 5)</span>
                            </>
                          ) : item.status === ReceivingStatus.PARTIAL_REJECT ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Ada Selisih / Partial</span>
                            </>
                          ) : item.status === ReceivingStatus.FULL_REJECT ? (
                            <>
                              <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>Tidak Sesuai / Ditolak</span>
                            </>
                          ) : (
                            <>
                              <Info className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                              <span>Menunggu Verifikasi</span>
                            </>
                          )}
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
            
            {/* Modal Header */}
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

            {/* Sub-Header & Navigation Tabs */}
            <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-4 font-sans text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailTab("items")}
                  className={`px-3 py-1.5 rounded-lg font-bold font-mono text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    detailTab === "items"
                      ? "bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Pemeriksaan Fisik &amp; Items</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab("logs")}
                  className={`px-3 py-1.5 rounded-lg font-bold font-mono text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    detailTab === "logs"
                      ? "bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Riwayat Log &amp; Audit ({activeReceiving.audit_logs?.length || 0})</span>
                </button>
              </div>

              {activeReceiving.completion_date && (
                <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <Clock className="w-3 h-3 text-emerald-600" />
                  <span>Lengkap pada: {new Date(activeReceiving.completion_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              )}
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] font-sans">
              
              {/* Common Details Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl text-xs leading-relaxed">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1 font-mono">Rincian SPK &amp; Pengiriman</p>
                  <p className="text-blue-700 font-black text-sm">No. SPK: {activeReceiving.spk_number || activeReceiving.purchase_order_num}</p>
                  <p className="text-slate-700 font-semibold mt-0.5">Surat Jalan (DN): {activeReceiving.delivery_note_num}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1 font-mono">Pemasok / Armada Kapal</p>
                  <p className="text-slate-900 font-extrabold text-sm">{activeReceiving.vendor_name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-block font-bold px-2 py-0.5 rounded text-[10px] font-mono border ${
                      overallStatus === ReceivingStatus.ACCEPTED || overallStatus === ReceivingStatus.VERIFIED
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : overallStatus === ReceivingStatus.PARTIAL_REJECT
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-rose-100 text-rose-800 border-rose-300"
                    }`}>
                      {overallStatus === ReceivingStatus.ACCEPTED || overallStatus === ReceivingStatus.VERIFIED
                        ? "✓ Terverifikasi Sesuai / Lengkap"
                        : overallStatus === ReceivingStatus.PARTIAL_REJECT
                        ? "⚠️ Ada Selisih / Partial Reject"
                        : "❌ Tidak Sesuai / Ditolak"}
                    </span>
                  </div>
                </div>
              </div>

              {/* RESOLVE BANNER BUTTON (If not currently ACCEPTED/VERIFIED) */}
              {overallStatus !== ReceivingStatus.ACCEPTED && overallStatus !== ReceivingStatus.VERIFIED && (
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 border border-amber-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-amber-600 shrink-0 animate-spin-slow" />
                      Apakah barang susulan/pengganti sudah tiba dan LENGKAP?
                    </h5>
                    <p className="text-[11px] text-amber-800 font-medium">
                      Anda dapat mengonfirmasi kelengkapan barang fisik untuk mengubah status penerimaan menjadi <strong>"Sesuai / Lengkap"</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResolveModalOpen(true);
                      setResolveCompletionDate(new Date().toISOString().slice(0, 16));
                      setResolveNotes("Barang susulan/pengganti telah diterima secara fisik dan diperiksa LENGKAP & SESUAI oleh Penjaga Gudang.");
                      setResolveConfirmed(false);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-mono rounded-lg shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Ubah Status Ke Sesuai</span>
                  </button>
                </div>
              )}

              {/* HIGHLIGHT ALERT BANNER UNTUK BARANG TIDAK SESUAI / SELISIH QTY */}
              {verificationItems.some(v => v.item_matched === "Tidak Sesuai" || v.qty_received < v.qty_ordered) && (
                <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-tight">
                    <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Rincian Barang Tidak Sesuai / Selisih QTY ({verificationItems.filter(v => v.item_matched === "Tidak Sesuai" || v.qty_received < v.qty_ordered).length} Item)</span>
                  </div>
                  <p className="text-[11px] text-rose-700 font-medium leading-relaxed">
                    Berikut adalah barang yang dicatat <strong>TIDAK SESUAI</strong> atau memiliki <strong>SELISIH QTY</strong> beserta catatan pemeriksaan fisik penjaga gudang:
                  </p>
                  <div className="space-y-2 pt-1">
                    {verificationItems
                      .filter(v => v.item_matched === "Tidak Sesuai" || v.qty_received < v.qty_ordered)
                      .map((mItem, mIdx) => (
                        <div key={mIdx} className="bg-white border border-rose-200 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 font-bold text-slate-900">
                              <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 border border-slate-200 font-extrabold">
                                Part No: {mItem.part_number}
                              </span>
                              <span className="truncate">{mItem.spare_part_name}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 font-sans">
                              <strong>SPK:</strong> {mItem.qty_ordered} {mItem.unit || "PCS"} | <strong>Fisik Datang:</strong> {mItem.qty_received} {mItem.unit || "PCS"}
                            </p>
                            {mItem.keeper_notes && (
                              <p className="text-[11px] text-slate-700 mt-1 italic bg-slate-50 p-1.5 rounded border border-slate-100 font-sans">
                                💬 <strong>Catatan Penjaga Gudang:</strong> "{mItem.keeper_notes}"
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5 font-mono">
                            {mItem.item_matched === "Tidak Sesuai" && (
                              <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-2xs">
                                ✕ Item Tidak Sesuai
                              </span>
                            )}
                            {mItem.qty_received < mItem.qty_ordered && (
                              <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-2xs">
                                ⚠️ QTY Kurang (-{mItem.qty_ordered - mItem.qty_received})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* TAB 1: PEMERIKSAAN FISIK & ITEMS */}
              {detailTab === "items" && (
                <>
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
                                <label className="text-[9px] pb-1 uppercase font-bold text-slate-500 font-mono">Kesesuaian Item</label>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const up = [...verificationItems];
                                      up[idx].item_matched = "Sesuai";
                                      if (up[idx].qty_rejected === 0) {
                                        up[idx].qc_status = "Verified";
                                        up[idx].reject_reason = "";
                                      }
                                      setVerificationItems(up);

                                      const anyNotMatched = up.some(u => u.item_matched === "Tidak Sesuai" || u.qty_rejected > 0);
                                      const allNotMatched = up.every(u => u.item_matched === "Tidak Sesuai" || u.qty_received === 0);
                                      if (allNotMatched) setOverallStatus(ReceivingStatus.FULL_REJECT);
                                      else if (anyNotMatched) setOverallStatus(ReceivingStatus.PARTIAL_REJECT);
                                      else setOverallStatus(ReceivingStatus.ACCEPTED);
                                    }}
                                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold cursor-pointer transition-all ${
                                      vItem.item_matched === "Sesuai"
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                  >
                                    ✓ Sesuai
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const up = [...verificationItems];
                                      up[idx].item_matched = "Tidak Sesuai";
                                      up[idx].qc_status = "Rejected";
                                      if (!up[idx].reject_reason) up[idx].reject_reason = "Spesifikasi fisik tidak sesuai SPK";
                                      setVerificationItems(up);

                                      const anyNotMatched = up.some(u => u.item_matched === "Tidak Sesuai" || u.qty_rejected > 0);
                                      const allNotMatched = up.every(u => u.item_matched === "Tidak Sesuai" || u.qty_received === 0);
                                      if (allNotMatched) setOverallStatus(ReceivingStatus.FULL_REJECT);
                                      else if (anyNotMatched) setOverallStatus(ReceivingStatus.PARTIAL_REJECT);
                                      else setOverallStatus(ReceivingStatus.ACCEPTED);
                                    }}
                                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold cursor-pointer transition-all ${
                                      vItem.item_matched === "Tidak Sesuai"
                                        ? "bg-rose-600 text-white shadow-xs"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                  >
                                    ✕ Tidak Sesuai
                                  </button>
                                </div>
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
                            <label className="text-[9px] uppercase font-bold text-slate-500 font-mono block mb-1">
                              Catatan Penjaga Gudang per Item
                            </label>
                            <input
                              type="text"
                              value={vItem.keeper_notes || ""}
                              onChange={(e) => {
                                const up = [...verificationItems];
                                up[idx].keeper_notes = e.target.value;
                                setVerificationItems(up);
                              }}
                              placeholder="Tulis catatan kondisi fisik barang..."
                              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:bg-white focus:border-blue-400"
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
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold font-display uppercase tracking-tight text-slate-800 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping shrink-0" />
                          Paraf Verifikasi Penjaga Gudang
                          {signatureDataUrl && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Paraf Tersimpan
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Goreskan paraf tanda tangan dengan mouse atau layar sentuh pada kotak canvas di bawah
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                        >
                          Hapus / Reset Paraf
                        </button>
                      </div>
                    </div>
                    
                    <div className="relative border-2 border-slate-300 hover:border-blue-400 rounded-xl bg-white overflow-hidden shadow-inner h-[140px] cursor-crosshair transition-colors">
                      <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-full block touch-none select-none"
                      />
                      {!signatureDataUrl && !isDrawing && (
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-40">
                          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                            ✍️ AREA PARAF PENJAGA GUDANG
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                            (Klik &amp; Tahan Mouse atau Usap Layar)
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[85%] border-b border-dashed border-slate-300 pointer-events-none text-center pb-0.5 select-none" />
                    </div>

                    {/* PRATINJAU BUKTI PARAF TERSIMPAN */}
                    {signatureDataUrl && (
                      <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs text-emerald-900 font-sans">
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            <strong>Bukti Paraf Sah:</strong> Tanda tangan fisik penjaga gudang telah tersimpan secara resmi sebagai bukti verifikasi.
                          </span>
                        </div>
                        <div className="shrink-0 bg-white p-1 rounded border border-emerald-200 shadow-2xs">
                          <img src={signatureDataUrl} alt="Bukti Paraf" className="h-8 max-w-[100px] object-contain" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notice Banner - No Approval Required */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Penerimaan Gudang Langsung Terverifikasi:</strong> Data penerimaan barang ini tersimpan secara otomatis dan dapat langsung digunakan pada pengajuan <strong>TUG 5 (Permintaan Barang)</strong> tanpa perlu menunggu approval manager.
                    </span>
                  </div>
                </>
              )}

              {/* TAB 2: RIWAYAT LOG AUDIT & AKTIVITAS */}
              {detailTab === "logs" && (
                <div className="space-y-4 font-sans">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                        <History className="w-4 h-4 text-blue-600" />
                        Riwayat Log Audit &amp; Aktivitas Penerimaan Barang
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Catatan kronologis pemeriksaan, perubahan status, dan pencatatan oleh penjaga gudang.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                      {(activeReceiving.audit_logs || []).length} Audit Log Recorded
                    </span>
                  </div>

                  {(!activeReceiving.audit_logs || activeReceiving.audit_logs.length === 0) ? (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 font-mono text-xs">
                      Belum ada riwayat audit log yang tercatat.
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {activeReceiving.audit_logs.map((log, lIdx) => (
                        <div key={lIdx} className="relative bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-2xs hover:bg-slate-50/50 transition-colors">
                          <div className="absolute -left-6 top-4 w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-white shadow-2xs" />
                          
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <span className="font-bold text-xs text-slate-900 flex items-center gap-2">
                              {log.action}
                              {log.status_after && (
                                <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded border ${
                                  log.status_after === ReceivingStatus.ACCEPTED || log.status_after === ReceivingStatus.VERIFIED
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : log.status_after === ReceivingStatus.PARTIAL_REJECT
                                    ? "bg-amber-100 text-amber-800 border-amber-300"
                                    : "bg-rose-100 text-rose-800 border-rose-300"
                                }`}>
                                  {log.status_after}
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {new Date(log.timestamp).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-200">
                              Petugas: {log.username}
                            </span>
                            {log.status_before && log.status_before !== "-" && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Status Sebelum: {log.status_before}
                              </span>
                            )}
                          </div>

                          {log.notes && (
                            <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-sans leading-relaxed">
                              "{log.notes}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="bg-slate-900 border-t border-slate-800 p-4 -mx-6 -mb-6 flex justify-end gap-3 font-mono">
                <button
                  type="button"
                  onClick={() => setActiveReceiving(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase cursor-pointer"
                >
                  Tutup
                </button>
                {detailTab === "items" && (
                  <button
                    type="button"
                    onClick={handleCommitVerification}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase cursor-pointer transition-colors shadow-xs"
                  >
                    Simpan Verifikasi Gudang
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL UNTUK UBAH STATUS MENJADI SESUAI / LENGKAP */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 font-sans animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-display font-extrabold text-xs uppercase tracking-wider">
                  Konfirmasi Status Sesuai &amp; Barang Lengkap
                </h3>
              </div>
              <button onClick={() => setIsResolveModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-900 leading-relaxed font-medium">
                Anda akan mengonfirmasi bahwa barang susulan/pengganti untuk SPK <strong>{activeReceiving?.spk_number || activeReceiving?.purchase_order_num}</strong> telah diterima dan fisik seluruh barang kini <strong>"SESUAI &amp; LENGKAP"</strong>.
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 font-mono uppercase mb-1">
                  Tanggal &amp; Waktu Barang Lengkap
                </label>
                <input
                  type="datetime-local"
                  value={resolveCompletionDate}
                  onChange={(e) => setResolveCompletionDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-xs font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 font-mono uppercase mb-1">
                  Catatan Konfirmasi Kelengkapan Barang
                </label>
                <textarea
                  rows={3}
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="Tuliskan alasan / rincian penerimaan susulan barang..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <label className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={resolveConfirmed}
                  onChange={(e) => setResolveConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-800 leading-tight">
                  Saya mengonfirmasi bahwa fisik dan QTY seluruh barang pada SPK ini telah diperiksa dan diterima LENGKAP &amp; SESUAI oleh Penjaga Gudang.
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 font-mono">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs uppercase cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!resolveConfirmed}
                  onClick={handleConfirmResolveToAccepted}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs uppercase shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi Status Sesuai</span>
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
