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
  BadgeCheck,
  Plus,
  UploadCloud,
  ImageIcon,
  Sparkles,
  Maximize2,
  Building2,
  Tag,
  Download
} from "lucide-react";
import { InboundReceiving, ReceivingStatus, SparePart, UserRole, SPKWorkOrder, WarehouseLocation } from "../types.js";
import { demoSPKs } from "../demoSeedData.js";
import { api } from "../api.js";

interface ReceivingViewProps {
  receivingList: InboundReceiving[];
  parts: SparePart[];
  spkList?: SPKWorkOrder[];
  locations?: WarehouseLocation[];
  role: UserRole;
  onAddReceiving: (rec: Partial<InboundReceiving>) => Promise<any>;
  onAddPart?: (partData: Partial<SparePart>) => Promise<any>;
  onVerifyReceiving: (id: string, update: { status: ReceivingStatus; items: any[]; reject_reason?: string; return_note_num?: string; signature_data_url?: string; keeper_notes?: string }) => Promise<any>;
  onPreviewDocument: (rec: InboundReceiving) => void;
  onDeleteReceiving?: (id: string) => Promise<any>;
}

export default function ReceivingView({
  receivingList,
  parts,
  spkList,
  locations = [],
  role,
  onAddReceiving,
  onAddPart,
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

  // Sync newly typed part to Catalog Sparepart (localStorage and storage events)
  const syncNewPartToCatalog = (part: {
    id: string;
    part_name: string;
    part_number: string;
    sku?: string;
    unit?: string;
    category?: string;
    location_id?: string;
    description?: string;
  }) => {
    try {
      const saved = localStorage.getItem("spare_part_catalog_data");
      let currentCatalog: any[] = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) currentCatalog = parsed;
        } catch (e) {
          currentCatalog = [];
        }
      }
      
      const key = (part.part_number || part.id).trim().toLowerCase();
      const nameKey = (part.part_name || "").trim().toLowerCase();
      const exists = currentCatalog.some(item => 
        (item.part_number && item.part_number.trim().toLowerCase() === key) ||
        (item.part_name && item.part_name.trim().toLowerCase() === nameKey)
      );

      if (!exists) {
        const newCatItem = {
          id: `SP-CAT-${Date.now().toString().slice(-5)}`,
          part_name: part.part_name,
          part_number: part.part_number,
          sku: part.sku || `SKU-${part.part_number}`,
          description: part.description || `${part.part_name} — Suku cadang terdaftar dari Penerimaan Barang Manual.`,
          unit: part.unit || "PCS",
          hierarchy: [part.category || "General Spares", "Depot Gudang", "Manual Inbound"],
          specification: `Lokasi Rak: ${part.location_id || 'loc-1'}, Terdaftar via Non-SPK`,
          manufacturer: "Vendor Maritim / Supplier",
          vessel_compatibility: "Semua Armada Kapal",
          weight_kg: 1.0
        };

        const updated = [newCatItem, ...currentCatalog];
        localStorage.setItem("spare_part_catalog_data", JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("catalog_updated", { detail: newCatItem }));
      }
    } catch (err) {
      console.error("Failed to sync new part to catalog:", err);
    }
  };

  // Manual Non-SPK Multi-Item & Photo Receiving state
  const [manualPoNum, setManualPoNum] = useState("");
  const [manualDnNum, setManualDnNum] = useState("");
  const [manualVendorName, setManualVendorName] = useState("Vendor Non-SPK / Manual");
  const [manualPhotoUrl, setManualPhotoUrl] = useState("");
  const [manualOverallNotes, setManualOverallNotes] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);

  interface ManualItemRow {
    tempId: string;
    spare_part_id: string;
    spare_part_name: string;
    part_number: string;
    unit: string;
    category: string;
    qty: number;
    location_id: string;
    keeper_notes: string;
    photo_url?: string;
    isNewPart: boolean;
  }

  const createInitialManualItem = (): ManualItemRow => ({
    tempId: `item-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    spare_part_id: "",
    spare_part_name: "",
    part_number: "",
    unit: "PCS",
    category: "General Spares",
    qty: 1,
    location_id: locations[0]?.id || "loc-1",
    keeper_notes: "",
    photo_url: "",
    isNewPart: false
  });

  const [manualItems, setManualItems] = useState<ManualItemRow[]>([createInitialManualItem()]);
  const [activeItemSearchIdx, setActiveItemSearchIdx] = useState<number | null>(null);

  const handleAddManualItemRow = () => {
    setManualItems(prev => [...prev, createInitialManualItem()]);
  };

  const handleRemoveManualItemRow = (index: number) => {
    if (manualItems.length <= 1) return;
    setManualItems(prev => prev.filter((_, i) => i !== index));
    if (activeItemSearchIdx === index) setActiveItemSearchIdx(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetItemIdx?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            const maxDim = 1200;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", 0.78));
            } else {
              resolve(event.target?.result as string);
            }
          };
          img.onerror = () => resolve(event.target?.result as string);
          img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (targetItemIdx !== undefined) {
        setManualItems(prev => {
          const up = [...prev];
          up[targetItemIdx].photo_url = base64;
          return up;
        });
      } else {
        setManualPhotoUrl(base64);
      }
    } catch (err) {
      console.error("Gagal membaca file gambar:", err);
      alert("Gagal membaca file gambar.");
    }
  };

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
    if (!manualPoNum.trim()) {
      alert("Nomor PO / Referensi Dokumen wajib diisi!");
      return;
    }

    if (manualItems.length === 0) {
      alert("Tambahkan minimal 1 item barang.");
      return;
    }

    for (let i = 0; i < manualItems.length; i++) {
      const itm = manualItems[i];
      if (!itm.spare_part_name.trim()) {
        alert(`Nama item pada baris #${i + 1} tidak boleh kosong!`);
        return;
      }
      if (!itm.qty || itm.qty <= 0) {
        alert(`Jumlah QTY pada baris #${i + 1} harus lebih dari 0!`);
        return;
      }
    }

    setIsSavingManual(true);
    try {
      const preparedItems = [];
      const newItemsCreated: string[] = [];

      for (let i = 0; i < manualItems.length; i++) {
        const itm = manualItems[i];
        let finalPartId = itm.spare_part_id;
        const finalPartName = itm.spare_part_name.trim();
        const finalPartNum = itm.part_number.trim() || `PN-${Date.now().toString().slice(-5)}${i + 1}`;
        const finalUnit = itm.unit || "PCS";
        const finalCat = itm.category || "General Spares";
        const finalLoc = itm.location_id || locations[0]?.id || "loc-1";

        // Check if item already exists in parts by ID, part_number, or exact part_name
        let existingPart = parts.find(p => p.id === finalPartId);
        if (!existingPart && finalPartNum && finalPartNum !== "-") {
          existingPart = parts.find(p => p.part_number?.toLowerCase() === finalPartNum.toLowerCase());
        }
        if (!existingPart) {
          existingPart = parts.find(p => p.part_name?.toLowerCase() === finalPartName.toLowerCase());
        }

        if (existingPart) {
          finalPartId = existingPart.id;
        } else {
          // If not in database, create new sparepart in Master and Catalog!
          const newPartId = `sp-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`;
          finalPartId = newPartId;
          const newPartPayload: Partial<SparePart> = {
            id: newPartId,
            part_name: finalPartName,
            part_number: finalPartNum,
            sku: `SKU-${finalPartNum.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || Date.now().toString().slice(-4)}`,
            unit: finalUnit,
            category: finalCat,
            vendor_id: "vnd-1",
            brand: "Generic",
            maker: manualVendorName || "OEM / Supplier",
            minimum_stock: 2,
            maximum_stock: 100,
            reorder_point: 5,
            current_stock: 0,
            reserved_stock: 0,
            location_id: finalLoc,
            description: `Suku cadang baru dari penerimaan manual PO ${manualPoNum}`
          };

          // 1. Create in Sparepart Master Database
          if (onAddPart) {
            try {
              await onAddPart(newPartPayload);
            } catch (pErr) {
              console.warn("onAddPart error, trying fallback api.createSparePart:", pErr);
              await api.createSparePart(newPartPayload);
            }
          } else {
            await api.createSparePart(newPartPayload);
          }

          // 2. Sync to Catalog Sparepart (localStorage and events)
          syncNewPartToCatalog({
            id: newPartId,
            part_name: finalPartName,
            part_number: finalPartNum,
            sku: newPartPayload.sku,
            unit: finalUnit,
            category: finalCat,
            location_id: finalLoc,
            description: newPartPayload.description
          });

          newItemsCreated.push(finalPartName);
        }

        preparedItems.push({
          spare_part_id: finalPartId,
          spare_part_name: finalPartName,
          part_number: finalPartNum,
          unit: finalUnit,
          qty_ordered: Number(itm.qty),
          qty_received: Number(itm.qty),
          qty_rejected: 0,
          qc_status: "Verified" as const,
          item_matched: "Sesuai" as const,
          qty_matched_status: "QTY Sesuai",
          keeper_notes: itm.keeper_notes ? `[Input Manual] ${itm.keeper_notes}` : "Input manual penyerahan penerimaan gudang",
          photo_url: itm.photo_url || ""
        });
      }

      // Create Receiving Inbound record
      const initialLogs = [{
        timestamp: new Date().toISOString(),
        username: role === UserRole.SUPER_ADMIN ? "Super Admin" : "Penjaga Gudang",
        action: "Penerimaan Manual Dicatat (Non-SPK)",
        notes: manualOverallNotes || `Input penerimaan manual ${preparedItems.length} item. Fisik barang langsung terverifikasi lengkap di stok gudang.`,
        status_before: "-",
        status_after: ReceivingStatus.ACCEPTED
      }];

      const overallPhotoEvidence = manualPhotoUrl || preparedItems.find(i => i.photo_url)?.photo_url || "";

      await onAddReceiving({
        purchase_order_num: manualPoNum.trim(),
        delivery_note_num: manualDnNum.trim() || `DN-MANUAL-${Math.floor(1000 + Math.random() * 9000)}`,
        vendor_id: "vnd-manual",
        vendor_name: manualVendorName.trim() || "Vendor Non-SPK / Manual",
        items: preparedItems,
        status: ReceivingStatus.ACCEPTED,
        photo_evidence_url: overallPhotoEvidence,
        keeper_notes: manualOverallNotes || "Penerimaan barang fisik manual gudang terverifikasi langsung.",
        received_date: new Date().toISOString(),
        completion_date: new Date().toISOString(),
        audit_logs: initialLogs
      });

      setIsNewRecOpen(false);
      setManualPoNum("");
      setManualDnNum("");
      setManualVendorName("Vendor Non-SPK / Manual");
      setManualPhotoUrl("");
      setManualOverallNotes("");
      setManualItems([createInitialManualItem()]);

      const newMsg = newItemsCreated.length > 0 
        ? `\n\n✨ ${newItemsCreated.length} item baru telah otomatis didaftarkan ke Sparepart Master & Catalog Sparepart:\n• ${newItemsCreated.join("\n• ")}`
        : "";
      alert(`✅ Berhasil menyimpan penerimaan manual (${preparedItems.length} item)!${newMsg}`);
    } catch (e: any) {
      alert(e.message || "Gagal menyimpan penerimaan barang manual");
    } finally {
      setIsSavingManual(false);
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
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 border-l border-slate-200">
      
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

        <div className="flex-1 overflow-auto pb-16">
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
                  <th className="p-3.5 text-center">Bukti Foto Fisik</th>
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
                      
                      {/* DEDICATED PHOTO EVIDENCE COLUMN */}
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const itemPhoto = item.photo_evidence_url || item.items?.find((i: any) => i.photo_url)?.photo_url;
                          if (itemPhoto) {
                            return (
                              <div 
                                className="inline-flex flex-col items-center gap-1 group cursor-pointer"
                                onClick={() => setPreviewPhotoModal(itemPhoto)}
                                title="Klik untuk memperbesar / melihat foto bukti fisik"
                              >
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-blue-400 group-hover:border-blue-600 shadow-xs transition-all bg-slate-100 flex items-center justify-center">
                                  <img 
                                    src={itemPhoto} 
                                    alt="Bukti Fisik" 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                                  />
                                  <div className="absolute inset-0 bg-blue-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Maximize2 className="w-3.5 h-3.5 text-white" />
                                  </div>
                                </div>
                                <span className="text-[9.5px] font-mono font-bold text-blue-700 hover:text-blue-900 flex items-center gap-0.5">
                                  <Camera className="w-3 h-3 text-blue-600" /> Lihat Foto
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div className="inline-flex flex-col items-center gap-1 text-slate-400">
                              <div className="w-9 h-9 rounded-lg border border-dashed border-slate-250 bg-slate-50 flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-slate-300" />
                              </div>
                              <span className="text-[9px] font-mono text-slate-400">Tanpa Foto</span>
                            </div>
                          );
                        })()}
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold block text-slate-900">{itemsCount} jenis barang</span>
                        {item.items && item.items.length > 0 && (
                          <div className="text-[10px] text-slate-600 font-sans max-w-[220px] truncate" title={item.items.map(i => `${i.spare_part_name} (${i.qty_received || i.qty_ordered} ${i.unit || 'PCS'})`).join(', ')}>
                            {item.items.map(i => `${i.spare_part_name} (${i.qty_received || i.qty_ordered})`).join(' • ')}
                          </div>
                        )}
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
                  {/* PROMINENT PHOTO EVIDENCE PREVIEW */}
                  {(() => {
                    const photoToDisplay = activeReceiving.photo_evidence_url || verificationItems.find(v => v.photo_url)?.photo_url;
                    if (!photoToDisplay) return null;
                    return (
                      <div className="bg-gradient-to-r from-blue-50/90 via-slate-50 to-indigo-50/70 border-2 border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border-2 border-blue-400 shrink-0 cursor-pointer relative group shadow-xs hover:border-blue-600 transition-all"
                            onClick={() => setPreviewPhotoModal(photoToDisplay)}
                            title="Klik untuk memperbesar foto bukti fisik"
                          >
                            <img 
                              src={photoToDisplay} 
                              alt="Foto Bukti Fisik Penerimaan" 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                            />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Maximize2 className="w-4 h-4 text-white drop-shadow" />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-600 text-white text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Camera className="w-3 h-3" /> Bukti Foto Terlampir
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 mt-1 font-display uppercase tracking-tight">
                              Foto Bukti Fisik Barang Datang / Surat Jalan
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Pemeriksaan fisik gudang — Klik gambar untuk melihat ukuran penuh.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => setPreviewPhotoModal(photoToDisplay)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-mono font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Lihat Foto Penuh</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <ClipboardCheck className="w-4 h-4 text-blue-600" />
                      Daftar Barang SPK &amp; Pengecekan Fisik Gudang
                    </h4>

                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                      {verificationItems.map((vItem, idx) => (
                        <div key={idx} className="p-4 bg-white hover:bg-slate-50/70 space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {vItem.photo_url && (
                                <div 
                                  className="w-12 h-12 rounded-lg overflow-hidden border-2 border-blue-300 hover:border-blue-500 shrink-0 cursor-pointer relative group shadow-2xs"
                                  onClick={() => setPreviewPhotoModal(vItem.photo_url || null)}
                                  title="Klik untuk memperbesar foto item ini"
                                >
                                  <img src={vItem.photo_url} alt={vItem.spare_part_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                  <div className="absolute inset-0 bg-blue-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Maximize2 className="w-3.5 h-3.5 text-white" />
                                  </div>
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold border border-slate-200">
                                  Part No: {vItem.part_number}
                                </span>
                                <p className="font-bold text-sm text-slate-900 mt-1">{vItem.spare_part_name}</p>
                                <p className="text-[11px] font-bold text-blue-700 mt-0.5">
                                  QTY Dipesan (SPK): {vItem.qty_ordered} {vItem.unit || "PCS"}
                                </p>
                              </div>
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

                  {/* PRATINJAU FOTO BUKTI FISIK GUDANG JIKA ADA */}
                  {activeReceiving.photo_evidence_url && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold font-display uppercase tracking-tight text-slate-800 flex items-center gap-2">
                          <Camera className="w-4 h-4 text-blue-600" />
                          Foto Bukti Fisik Penerimaan Barang
                        </h4>
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoModal(activeReceiving.photo_evidence_url || null)}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-200 cursor-pointer flex items-center gap-1"
                        >
                          <Maximize2 className="w-3 h-3" />
                          Lihat Ukuran Penuh
                        </button>
                      </div>
                      <div 
                        className="rounded-lg overflow-hidden border border-slate-200 bg-white max-h-60 flex items-center justify-center cursor-pointer group"
                        onClick={() => setPreviewPhotoModal(activeReceiving.photo_evidence_url || null)}
                      >
                        <img 
                          src={activeReceiving.photo_evidence_url} 
                          alt="Foto Bukti Penerimaan" 
                          className="max-h-60 w-auto object-contain group-hover:scale-105 transition-transform" 
                        />
                      </div>
                    </div>
                  )}

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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className={`bg-white text-slate-800 rounded-xl shadow-2xl w-full ${
            receivingSourceMode === "manual" ? "max-w-4xl" : "max-w-2xl"
          } max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 transition-all duration-150`}>
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800 shrink-0">
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

            <div className="p-6 space-y-5 font-sans text-xs flex-1 overflow-y-auto">
              
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
                /* Multi-Item Manual / Non-SPK Receiving Form */
                <div className="space-y-5">
                  
                  {/* Header Meta: PO, Surat Jalan, Vendor */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                      <span className="font-mono text-[10px] font-extrabold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                        Informasi Referensi &amp; Dokumen Penerimaan Manual
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setManualPoNum(`PO-${new Date().getFullYear()}-M${Math.floor(1000 + Math.random() * 9000)}`);
                          if (!manualDnNum) setManualDnNum(`DN-MANUAL-${Math.floor(1000 + Math.random() * 9000)}`);
                        }}
                        className="text-[10px] font-mono font-bold text-blue-600 hover:text-blue-700 cursor-pointer bg-white px-2 py-0.5 rounded border border-blue-200 shadow-2xs"
                      >
                        ⚡ Buat No. PO Otomatis
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-1">
                          Nomor Referensi PO / Dokumen *
                        </label>
                        <input
                          type="text"
                          required
                          value={manualPoNum}
                          onChange={(e) => setManualPoNum(e.target.value)}
                          placeholder="PO-2026-M8841"
                          className="w-full bg-white border border-slate-300 p-2 text-xs font-mono font-bold text-slate-900 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-1">
                          Nomor Surat Jalan (DN)
                        </label>
                        <input
                          type="text"
                          value={manualDnNum}
                          onChange={(e) => setManualDnNum(e.target.value)}
                          placeholder="DN-VND-442"
                          className="w-full bg-white border border-slate-300 p-2 text-xs font-mono text-slate-900 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-1">
                          Nama Vendor / Asal Pengirim
                        </label>
                        <input
                          type="text"
                          value={manualVendorName}
                          onChange={(e) => setManualVendorName(e.target.value)}
                          placeholder="PT. Bahtera Logistik / Vendor Bebas"
                          className="w-full bg-white border border-slate-300 p-2 text-xs text-slate-900 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Attachment Foto / Gambar Bukti Fisik Barang (Opsional) */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-blue-600" />
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 font-display uppercase tracking-wide">
                            Lampiran Foto / Bukti Fisik Barang Datang (Opsional)
                          </h4>
                          <p className="text-[10px] text-slate-500">
                            Unggah foto fisik barang, dokumen surat jalan, atau kondisi kemasan barang datang.
                          </p>
                        </div>
                      </div>

                      {manualPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setManualPhotoUrl("")}
                          className="text-[10px] font-mono font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200 cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      )}
                    </div>

                    {manualPhotoUrl ? (
                      <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                        <div 
                          className="w-20 h-16 rounded overflow-hidden bg-slate-100 border border-slate-300 shrink-0 cursor-pointer relative group"
                          onClick={() => setPreviewPhotoModal(manualPhotoUrl)}
                        >
                          <img src={manualPhotoUrl} alt="Bukti Fisik" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Maximize2 className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Foto Bukti Terlampir
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Foto telah siap disimpan bersama data penerimaan barang masuk ini.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoModal(manualPhotoUrl)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-bold rounded cursor-pointer"
                        >
                          Perbesar
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50/30 transition-all rounded-xl p-3 flex flex-col sm:flex-row items-center justify-center gap-2.5 cursor-pointer text-center">
                        <UploadCloud className="w-5 h-5 text-blue-600 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-blue-700">Pilih Foto dari Galeri / Kamera</span>
                          <span className="text-[10px] text-slate-500 ml-1">(JPG, PNG, WebP)</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e)}
                        />
                      </label>
                    )}
                  </div>

                  {/* Multi-Item Interactive Input Section */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 uppercase font-mono tracking-wider flex items-center gap-2">
                          <Boxes className="w-4 h-4 text-blue-600" />
                          Daftar Item Suku Cadang Masuk (Multi-Item Input)
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Bisa ketik nama item baru langsung (otomatis disinkronkan ke Master &amp; Catalog) atau cari dari suku cadang terdaftar.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddManualItemRow}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-mono font-bold uppercase cursor-pointer flex items-center gap-1.5 shadow-2xs transition-colors self-start sm:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Tambah Item Barang</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {manualItems.map((item, idx) => {
                        const matchedParts = parts.filter(p => {
                          const q = (item.spare_part_name || "").toLowerCase().trim();
                          if (!q) return false;
                          return p.part_name.toLowerCase().includes(q) || (p.part_number && p.part_number.toLowerCase().includes(q));
                        }).slice(0, 6);

                        return (
                          <div 
                            key={item.tempId} 
                            className="bg-white border-2 border-slate-200 hover:border-slate-300 rounded-xl p-4 space-y-3 shadow-xs relative transition-all"
                          >
                            {/* Row Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-slate-900 text-white font-mono text-[10px] font-black px-2 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                                <span className="font-bold text-xs text-slate-800">
                                  Item Barang Masuk
                                </span>
                                {item.isNewPart && (
                                  <span className="bg-indigo-100 text-indigo-900 border border-indigo-250 text-[10px] font-mono font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-indigo-600" />
                                    ✨ Item Baru (Otomatis Dibuat ke Master &amp; Catalog)
                                  </span>
                                )}
                              </div>

                              {manualItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveManualItemRow(idx)}
                                  className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Hapus baris item ini"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Hapus Baris</span>
                                </button>
                              )}
                            </div>

                            {/* Main Item Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                              
                              {/* Item Name (Searchable / Custom typeable) */}
                              <div className="md:col-span-5 relative">
                                <label className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-1">
                                  Pilih / Ketik Nama Item Sparepart *
                                </label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    required
                                    value={item.spare_part_name}
                                    onFocus={() => setActiveItemSearchIdx(idx)}
                                    onChange={(e) => {
                                      const text = e.target.value;
                                      setManualItems(prev => {
                                        const up = [...prev];
                                        up[idx].spare_part_name = text;
                                        
                                        const matched = parts.find(p => 
                                          p.part_name.toLowerCase() === text.trim().toLowerCase() ||
                                          (p.part_number && p.part_number.toLowerCase() === text.trim().toLowerCase())
                                        );

                                        if (matched) {
                                          up[idx].spare_part_id = matched.id;
                                          up[idx].part_number = matched.part_number;
                                          up[idx].unit = matched.unit || "PCS";
                                          up[idx].category = matched.category || "General Spares";
                                          up[idx].location_id = matched.location_id || locations[0]?.id || "loc-1";
                                          up[idx].isNewPart = false;
                                        } else {
                                          up[idx].spare_part_id = "";
                                          up[idx].isNewPart = text.trim().length > 0;
                                        }
                                        return up;
                                      });
                                    }}
                                    placeholder="Ketik nama item baru atau cari dari master..."
                                    className="w-full bg-slate-50 border border-slate-300 p-2 text-xs font-bold text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                                  />
                                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                                </div>

                                {/* Autocomplete Dropdown List */}
                                {activeItemSearchIdx === idx && matchedParts.length > 0 && (
                                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                                    <div className="p-1.5 bg-slate-100 text-[9px] font-mono font-bold text-slate-600 uppercase">
                                      Pilih Dari Suku Cadang Terdaftar:
                                    </div>
                                    {matchedParts.map(p => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                          setManualItems(prev => {
                                            const up = [...prev];
                                            up[idx].spare_part_id = p.id;
                                            up[idx].spare_part_name = p.part_name;
                                            up[idx].part_number = p.part_number;
                                            up[idx].unit = p.unit || "PCS";
                                            up[idx].category = p.category || "General Spares";
                                            up[idx].location_id = p.location_id || locations[0]?.id || "loc-1";
                                            up[idx].isNewPart = false;
                                            return up;
                                          });
                                          setActiveItemSearchIdx(null);
                                        }}
                                        className="w-full text-left p-2.5 hover:bg-blue-50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                                      >
                                        <div>
                                          <p className="font-bold text-slate-900">{p.part_name}</p>
                                          <span className="font-mono text-[10px] text-slate-500 font-semibold">
                                            PN: {p.part_number} | Kategori: {p.category}
                                          </span>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="font-mono text-[10px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                            Stok: {p.current_stock} {p.unit}
                                          </span>
                                        </div>
                                      </button>
                                    ))}
                                    <div 
                                      className="p-2 text-center bg-slate-50 text-[10px] font-mono text-blue-700 font-bold hover:bg-slate-100 cursor-pointer"
                                      onClick={() => setActiveItemSearchIdx(null)}
                                    >
                                      ✓ Gunakan sebagai item baru: "{item.spare_part_name}"
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Part Number */}
                              <div className="md:col-span-3">
                                <label className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-1">
                                  Part Number (Nomor Suku Cadang)
                                </label>
                                <input
                                  type="text"
                                  value={item.part_number}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setManualItems(prev => {
                                      const up = [...prev];
                                      up[idx].part_number = val;
                                      return up;
                                    });
                                  }}
                                  placeholder="Contoh: 746673-51108"
                                  className="w-full bg-slate-50 border border-slate-300 p-2 text-xs font-mono font-bold text-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                              </div>

                              {/* Unit / Satuan */}
                              <div className="md:col-span-2">
                                <label className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-1">
                                  Satuan (Unit)
                                </label>
                                <select
                                  value={item.unit}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setManualItems(prev => {
                                      const up = [...prev];
                                      up[idx].unit = val;
                                      return up;
                                    });
                                  }}
                                  className="w-full bg-slate-50 border border-slate-300 p-2 text-xs font-bold text-slate-900 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                                >
                                  {["PCS", "SET", "UNIT", "KG", "LTR", "METER", "BOX", "ROLL", "LOT", "PACK"].map(u => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                              </div>

                              {/* QTY Received */}
                              <div className="md:col-span-2">
                                <label className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-1">
                                  Jumlah QTY Datang *
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  required
                                  value={item.qty}
                                  onChange={(e) => {
                                    const val = Math.max(1, Number(e.target.value) || 1);
                                    setManualItems(prev => {
                                      const up = [...prev];
                                      up[idx].qty = val;
                                      return up;
                                    });
                                  }}
                                  className="w-full bg-slate-50 border border-slate-300 p-2 text-xs text-center font-mono font-black text-blue-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                              </div>

                            </div>

                            {/* Secondary Fields: Category, Location, Notes, Item Photo */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 border-t border-slate-100">
                              
                              {/* Kategori */}
                              <div className="md:col-span-3">
                                <label className="text-[9px] uppercase font-bold text-slate-500 font-mono block mb-1">
                                  Kategori Suku Cadang
                                </label>
                                <select
                                  value={item.category}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setManualItems(prev => {
                                      const up = [...prev];
                                      up[idx].category = val;
                                      return up;
                                    });
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 p-1.5 text-[11px] font-medium text-slate-700 rounded-md outline-none cursor-pointer"
                                >
                                  {["General Spares", "Propulsion System", "Main Engine", "Auxiliary Engine", "Deck Machinery", "Electrical & Automation", "Safety & Navigation", "Consumables"].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Lokasi Rak Gudang */}
                              <div className="md:col-span-3">
                                <label className="text-[9px] uppercase font-bold text-slate-500 font-mono block mb-1">
                                  Lokasi Rak Penyimpanan
                                </label>
                                <select
                                  value={item.location_id}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setManualItems(prev => {
                                      const up = [...prev];
                                      up[idx].location_id = val;
                                      return up;
                                    });
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 p-1.5 text-[11px] font-mono text-slate-700 rounded-md outline-none cursor-pointer"
                                >
                                  {locations.length > 0 ? (
                                    locations.map(l => (
                                      <option key={l.id} value={l.id}>{l.code || `${l.warehouse} - ${l.zone}`} ({l.id})</option>
                                    ))
                                  ) : (
                                    <>
                                      <option value="loc-1">Rak Gudang Utama (loc-1)</option>
                                      <option value="loc-2">Rak Mesin / Engine (loc-2)</option>
                                      <option value="loc-3">Rak Deck &amp; Navigasi (loc-3)</option>
                                    </>
                                  )}
                                </select>
                              </div>

                              {/* Item Keeper Notes */}
                              <div className="md:col-span-4">
                                <label className="text-[9px] uppercase font-bold text-slate-500 font-mono block mb-1">
                                  Catatan Fisik Item (Opsional)
                                </label>
                                <input
                                  type="text"
                                  value={item.keeper_notes}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setManualItems(prev => {
                                      const up = [...prev];
                                      up[idx].keeper_notes = val;
                                      return up;
                                    });
                                  }}
                                  placeholder="Contoh: Kondisi segel baru, kemasan utuh..."
                                  className="w-full bg-slate-50 border border-slate-200 p-1.5 text-[11px] text-slate-800 rounded-md outline-none"
                                />
                              </div>

                              {/* Optional Item Photo */}
                              <div className="md:col-span-2 flex flex-col justify-end">
                                {item.photo_url ? (
                                  <div className="flex items-center gap-1.5">
                                    <div 
                                      className="w-8 h-8 rounded border border-slate-300 overflow-hidden cursor-pointer"
                                      onClick={() => setPreviewPhotoModal(item.photo_url || null)}
                                    >
                                      <img src={item.photo_url} alt="Item" className="w-full h-full object-cover" />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setManualItems(prev => {
                                          const up = [...prev];
                                          up[idx].photo_url = "";
                                          return up;
                                        });
                                      }}
                                      className="text-rose-600 text-[10px] hover:underline cursor-pointer"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                ) : (
                                  <label className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-mono font-bold cursor-pointer justify-center transition-colors">
                                    <Camera className="w-3 h-3 text-slate-500" />
                                    <span>+ Foto Item</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handlePhotoUpload(e, idx)}
                                    />
                                  </label>
                                )}
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary Bar */}
                    <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-bold text-blue-900">
                          Total Rincian: <span className="font-black font-mono text-blue-700">{manualItems.length} Jenis Barang</span> | Total QTY: <span className="font-black font-mono text-blue-700">{manualItems.reduce((acc, i) => acc + (Number(i.qty) || 0), 0)} Unit</span>
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-blue-700">
                        {manualItems.filter(i => i.isNewPart).length > 0 ? (
                          <span className="font-extrabold text-indigo-700">
                            ✨ {manualItems.filter(i => i.isNewPart).length} item baru akan didaftarkan ke Master &amp; Catalog
                          </span>
                        ) : (
                          <span>Semua item terverifikasi</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Overall Keeper Notes */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-1">
                      Catatan Penjaga Gudang (Keseluruhan)
                    </label>
                    <textarea
                      rows={2}
                      value={manualOverallNotes}
                      onChange={(e) => setManualOverallNotes(e.target.value)}
                      placeholder="Tuliskan catatan pemeriksaan fisik penerimaan manual non-SPK..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Informational Banner */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-[11px] flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Verifikasi Langsung Penjaga Gudang (Tanpa Approval):</strong> Semua barang penerimaan manual ini langsung masuk ke <strong>Stok Fisik Gudang</strong> dan disinkronkan ke <strong>Sparepart Master &amp; Catalog Sparepart</strong> sehingga siap digunakan untuk <strong>TUG 5</strong>.
                    </span>
                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer Actions (Sticky Bottom) */}
            <div className="bg-slate-900 border-t border-slate-800 p-4 px-6 flex justify-end gap-3 font-mono shrink-0">
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi &amp; Simpan Penerimaan Gudang</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateInboundPo}
                  disabled={isSavingManual}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingManual ? "Menyimpan &amp; Sinkronisasi..." : "Simpan Penerimaan Manual"}</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* FULL SCREEN PHOTO LIGHTBOX MODAL */}
      {previewPhotoModal && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-[70] p-4 cursor-pointer"
          onClick={() => setPreviewPhotoModal(null)}
        >
          <div 
            className="bg-slate-900 rounded-2xl max-w-4xl max-h-[92vh] overflow-hidden border border-slate-700 shadow-2xl flex flex-col items-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header Bar */}
            <div className="w-full bg-slate-850 px-5 py-3 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-slate-200">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>Foto Bukti Fisik Penerimaan Barang Masuk</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewPhotoModal}
                  download={`bukti-penerimaan-${Date.now()}.jpg`}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 text-xs font-mono font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Unduh file foto ini ke komputer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Foto</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPhotoModal(null)}
                  className="bg-slate-800 hover:bg-rose-900/80 hover:text-rose-200 text-slate-400 p-1.5 rounded-lg border border-slate-700 cursor-pointer transition-colors"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Photo Image Display */}
            <div className="p-4 flex items-center justify-center bg-slate-950/50 max-h-[75vh] overflow-auto">
              <img 
                src={previewPhotoModal} 
                alt="Foto Bukti Penerimaan Barang" 
                className="max-h-[72vh] max-w-full w-auto object-contain rounded-lg shadow-md border border-slate-800"
              />
            </div>

            {/* Bottom Footer Info */}
            <div className="w-full bg-slate-900 px-5 py-2.5 border-t border-slate-800 text-center text-slate-400 font-mono text-[11px] flex items-center justify-between">
              <span>Dokumen Bukti Fisik Penerimaan Gudang Logistik PT. BAG</span>
              <span className="text-slate-500">Klik area luar atau tombol silang untuk menutup</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
