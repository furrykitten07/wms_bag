/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  FileText, 
  Search, 
  MapPin, 
  Eye, 
  Box, 
  CheckSquare, 
  Truck, 
  UserCheck, 
  Calendar, 
  ArrowRightCircle, 
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Anchor,
  X,
  Printer,
  FileDown,
  Warehouse,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
  SlidersHorizontal,
  FolderArchive,
  ChevronDown,
  Trash2,
  ShieldCheck,
  CheckCircle
} from "lucide-react";
import { OutboundDispatch, DispatchStatus, UserRole, SparePart, MaterialRequest, SPKWorkOrder, MaterialReturn, InboundReceiving, ReceivingStatus } from "../types.js";

interface DispatchViewProps {
  dispatchList: OutboundDispatch[];
  parts: SparePart[];
  role: UserRole;
  onUpdateDispatch: (id: string, update: Partial<OutboundDispatch>) => Promise<any>;
  onCreateDispatch: (data: Partial<OutboundDispatch>) => Promise<any>;
  onPreviewDocument: (type: "bon" | "surat_jalan" | "manifest", data: OutboundDispatch) => void;
  requests?: MaterialRequest[];
  requestsTUG6?: MaterialRequest[];
  onPreviewTUG5?: (req: MaterialRequest) => void;
  onPreviewTUG6?: (req: MaterialRequest) => void;
  spkList?: SPKWorkOrder[];
  onUpdateSPK?: (id: string, spkData: Partial<SPKWorkOrder>) => Promise<any>;
  materialReturns?: MaterialReturn[];
  onUpdateReturn?: (id: string, update: Partial<MaterialReturn>) => Promise<any>;
  onDeleteDispatch?: (id: string) => Promise<any>;
  receivingList?: InboundReceiving[];
}

export default function DispatchView({
  dispatchList,
  parts,
  role,
  onUpdateDispatch,
  onCreateDispatch,
  onPreviewDocument,
  requests = [],
  requestsTUG6 = [],
  onPreviewTUG5,
  onPreviewTUG6,
  spkList = [],
  onUpdateSPK,
  materialReturns = [],
  onUpdateReturn,
  onDeleteDispatch,
  receivingList = []
}: DispatchViewProps) {
  const [activeTab, setActiveTab] = useState<"queue" | "archive">("queue");
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [vesselFilter, setVesselFilter] = useState("All");

  const isAlfinRole = role === UserRole.WAREHOUSE_STAFF || role === UserRole.SUPER_ADMIN;
  const isEmirRole = role === UserRole.LOGISTICS_MANAGER || role === UserRole.SUPER_ADMIN;
  const isSumbonoRole = role === UserRole.VP_RENDALHAR || role === UserRole.SUPER_ADMIN;

  // Date/Time Filter states for Outbound Dispatch (TUG 8)
  const [timePreset, setTimePreset] = useState<"all" | "week" | "month" | "july2026" | "custom">("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Outbound Pagination states
  const [dspPage, setDspPage] = useState(1);
  const [dspPerPage, setDspPerPage] = useState<number>(10);

  // Selected dispatch IDs state for Bulk Delete Checklist
  const [selectedDspIds, setSelectedDspIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  React.useEffect(() => {
    setDspPage(1);
    setSelectedDspIds([]);
  }, [search, statusFilter, vesselFilter, activeTab, timePreset, selectedMonth, dateFrom, dateTo]);

  const [selectedDispatch, setSelectedDispatch] = useState<OutboundDispatch | null>(null);

  // Editable parameters during transit updates
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [driverPic, setDriverPic] = useState("");
  const [warehouseName, setWarehouseName] = useState("Gudang Merak");
  const [deliveryDestination, setDeliveryDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [dispatchStatusFlg, setDispatchStatusFlg] = useState<DispatchStatus | string>(DispatchStatus.DRAFT);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // States for Create Dispatch Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [dispatchSource, setDispatchSource] = useState<"tug5" | "tug10">("tug5");
  const [selectedTug5Id, setSelectedTug5Id] = useState("");
  const [selectedTug10Id, setSelectedTug10Id] = useState("");
  const [targetVesselName, setTargetVesselName] = useState("");
  const [cName, setCName] = useState("Internal Cargo");
  const [tNumber, setTNumber] = useState("");
  const [dPic, setDPic] = useState("");
  const [notesText, setNotesText] = useState("");
  const [wName, setWName] = useState("GUDANG UTAMA");
  const [dDest, setDDest] = useState("Port Agent / Vessel Side");

  const [dispatchItems, setDispatchItems] = useState<any[]>([]);

  // Helper to calculate multi-shipment status and history for an SPK / TUG 5
  const getMultiShipmentHistoryForSPK = (spkRef?: string, tug5Ref?: string) => {
    if (!spkRef && !tug5Ref) {
      return { count: 0, dispatches: [] as OutboundDispatch[], totalRequested: 0, totalDispatched: 0, isAllComplete: false, hasPartial: false };
    }

    const matches = (dispatchList || []).filter(d => 
      Boolean(d) && (
        (spkRef && (d.work_order_ref === spkRef || d.spk_number === spkRef)) ||
        (tug5Ref && d.request_reference === tug5Ref)
      )
    );

    matches.sort((a, b) => new Date(a.dispatch_date || a.created_at || 0).getTime() - new Date(b.dispatch_date || b.created_at || 0).getTime());

    let totalRequested = 0;
    let totalDispatched = 0;

    matches.forEach(d => {
      if (!d || !d.items) return;
      d.items.forEach(i => {
        if (!i) return;
        totalRequested += (i.qty_requested || i.requested_qty || 0);
        totalDispatched += (i.qty_dispatched || 0);
      });
    });

    const hasPartial = matches.some(d => Boolean(d) && (d.is_partial || d.status === "DISPATCHED_PARTIAL"));
    const isAllComplete = matches.length > 0 && !hasPartial;

    return {
      count: matches.length,
      dispatches: matches,
      totalRequested,
      totalDispatched,
      isAllComplete,
      hasPartial
    };
  };

  React.useEffect(() => {
    if (dispatchSource === "tug5" && selectedTug5Id && requests) {
      const selectedMR = requests.find(r => Boolean(r) && r.id === selectedTug5Id);
      if (selectedMR) {
        setWName(selectedMR.warehouse_name || "GUDANG UTAMA");
        setDDest(selectedMR.delivery_address || "Port Agent / Vessel Side");
        setNotesText(selectedMR.remarks || "");

        // Cross reference with Inbound Receiving data to check actual received QTY vs SPK QTY
        const matchedInbound = (receivingList || []).find(r => 
          Boolean(r) && (
            (r.spk_number && selectedMR.work_order_ref && r.spk_number === selectedMR.work_order_ref) ||
            (r.spk_id && selectedMR.work_order_ref && r.spk_id === selectedMR.work_order_ref) ||
            (r.spk_number && selectedMR.request_number && r.spk_number === selectedMR.request_number)
          )
        );

        // Find existing dispatches for this SPK / TUG 5 reference
        const prevDispatches = (dispatchList || []).filter(d => 
          Boolean(d) && (
            (selectedMR.work_order_ref && (d.work_order_ref === selectedMR.work_order_ref || d.spk_number === selectedMR.work_order_ref)) ||
            (d.request_reference === selectedMR.request_number)
          )
        );

        const items = (selectedMR.items || []).map(itm => {
          if (!itm) return null;
          const totalReq = itm.requested_qty || 1;

          // Look up Inbound Receiving item matching this spare part
          const inboundItem = matchedInbound ? (matchedInbound.items || []).find(i => 
            Boolean(i) && (i.spare_part_id === itm.spare_part_id || i.part_number === itm.part_number)
          ) : null;

          // Physical QTY received in Warehouse during Inbound Receiving
          const maxInboundQty = inboundItem ? (inboundItem.qty_received ?? totalReq) : totalReq;
          const inboundNotes = inboundItem?.keeper_notes || inboundItem?.reject_reason || "";

          // Calculate previously dispatched quantity across earlier batches
          const previouslyDispatched = prevDispatches.reduce((sum, d) => {
            if (!d || !d.items) return sum;
            const found = d.items.find(di => Boolean(di) && (di.spare_part_id === itm.spare_part_id || di.part_number === itm.part_number));
            return sum + (found?.qty_dispatched || 0);
          }, 0);

          // Default initial dispatch quantity for this phase capped by maxInboundQty received in warehouse
          const availableInboundToDispatch = Math.max(0, maxInboundQty - previouslyDispatched);
          const remainingToDispatch = Math.max(0, Math.min(totalReq - previouslyDispatched, availableInboundToDispatch));

          return {
            spare_part_id: itm.spare_part_id,
            spare_part_name: itm.spare_part_name,
            part_number: itm.part_number,
            qty_requested: totalReq,
            qty_approved: totalReq,
            qty_inbound_received: maxInboundQty,
            inbound_notes: inboundNotes,
            previously_dispatched: previouslyDispatched,
            qty_dispatched: remainingToDispatch,
            qty_remaining: 0,
            unit: itm.unit || "PCS",
            unit_price: (itm as any).unit_price !== undefined ? Number((itm as any).unit_price) : 0,
            notes: itm.notes || ""
          };
        }).filter(Boolean);
        setDispatchItems(items);
      }
    } else if (!selectedTug5Id && dispatchSource === "tug5") {
      setDispatchItems([]);
    }
  }, [selectedTug5Id, dispatchSource, requests, dispatchList, receivingList]);

  React.useEffect(() => {
    if (dispatchSource === "tug10" && selectedTug10Id && materialReturns) {
      const selectedReturn = materialReturns.find(r => Boolean(r) && r.id === selectedTug10Id);
      if (selectedReturn) {
        setWName(selectedReturn.warehouse_name || "GUDANG PENURUNAN");
        setDDest("Target Vessel Side");
        setNotesText(`[TRANSFER ANTAR KAPAL] Penurunan barang dari kapal ${selectedReturn.vessel_name} via TUG 10 [${selectedReturn.return_number}]. ` + (selectedReturn.notes || ""));
        
        const items = (selectedReturn.items || []).map(itm => {
          if (!itm) return null;
          return {
            spare_part_id: itm.spare_part_id,
            spare_part_name: itm.part_name,
            part_number: itm.part_number,
            qty_requested: itm.qty_returned,
            qty_approved: itm.qty_returned,
            qty_dispatched: itm.qty_returned,
            qty_remaining: 0,
            unit: itm.unit || "PCS",
            unit_price: (itm as any).unit_price !== undefined ? Number((itm as any).unit_price) : 0,
            notes: `[TRANSFER DARI KAPAL ${selectedReturn.vessel_name.toUpperCase()}] ` + (itm.notes || "")
          };
        }).filter(Boolean);
        setDispatchItems(items);
      }
    } else if (!selectedTug10Id && dispatchSource === "tug10") {
      setDispatchItems([]);
    }
  }, [selectedTug10Id, dispatchSource, materialReturns]);

  const handleCreateDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (dispatchSource === "tug5") {
        if (!selectedTug5Id) {
          alert("Silakan pilih dokumen Permintaan Barang (TUG 5) terlebih dahulu.");
          setIsLoading(false);
          return;
        }
        const selectedMR = requests.find(r => Boolean(r) && r.id === selectedTug5Id);
        if (!selectedMR) {
          alert("Dokumen TUG 5 tidak ditemukan.");
          setIsLoading(false);
          return;
        }

        const prevDispatches = (dispatchList || []).filter(d => 
          Boolean(d) && (
            (selectedMR.work_order_ref && (d.work_order_ref === selectedMR.work_order_ref || d.spk_number === selectedMR.work_order_ref)) ||
            (d.request_reference === selectedMR.request_number)
          )
        );

        const currentPhase = prevDispatches.length + 1;

        const matchedInbound = (receivingList || []).find(r => 
          Boolean(r) && (
            (r.spk_number && selectedMR.work_order_ref && r.spk_number === selectedMR.work_order_ref) ||
            (r.spk_id && selectedMR.work_order_ref && r.spk_id === selectedMR.work_order_ref) ||
            (r.spk_number && selectedMR.request_number && r.spk_number === selectedMR.request_number)
          )
        );

        const isInboundPartial = matchedInbound ? (
          matchedInbound.status === ReceivingStatus.PARTIAL_REJECT || 
          matchedInbound.status === ReceivingStatus.FULL_REJECT || 
          (matchedInbound.status as string) === "PARTIAL_REJECT" || 
          (matchedInbound.status as string) === "FULL_REJECT" || 
          matchedInbound.items.some(i => {
            const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
            const st = i.status || i.qc_status;
            return i.qty_received < targetQty || st === "PARTIAL" || st === "REJECTED" || st === "Rejected";
          })
        ) : false;

        const inboundIncompleteList = matchedInbound ? matchedInbound.items
          .filter(i => {
            const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
            const st = i.status || i.qc_status;
            return i.qty_received < targetQty || st === "REJECTED" || st === "Rejected" || st === "PARTIAL" || Boolean(i.keeper_notes);
          })
          .map(i => {
            const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
            const name = i.part_name || i.spare_part_name || i.part_number;
            return `[INBOUND PARSIAL] ${name}: SPK ${targetQty} → Diterima Inbound ${i.qty_received} (Kurang ${targetQty - i.qty_received}${i.keeper_notes ? ` - ${i.keeper_notes}` : ""})`;
          }) : [];

        // Check if any item remains unfulfilled after this phase
        const isPartialDispatch = dispatchItems.some(i => {
          const prev = i.previously_dispatched || 0;
          const current = i.qty_dispatched || 0;
          const req = i.qty_requested || 0;
          return (prev + current) < req;
        });

        const isPartial = isPartialDispatch || isInboundPartial;

        // Summary of incomplete items
        const incItems = dispatchItems
          .filter(i => {
            const prev = i.previously_dispatched || 0;
            const current = i.qty_dispatched || 0;
            const req = i.qty_requested || 0;
            return (prev + current) < req;
          })
          .map(i => {
            const prev = i.previously_dispatched || 0;
            const current = i.qty_dispatched || 0;
            const req = i.qty_requested || 0;
            const sisa = req - (prev + current);
            return `[OUTBOUND TAHAP ${currentPhase}] ${i.spare_part_name}: SPK ${req} ${i.unit} → Terkirim Kumulatif (${prev + current}), Sisa ${sisa} ${i.unit}`;
          });

        const allIncompletes = Array.from(new Set([...inboundIncompleteList, ...incItems]));
        const incompleteSummary = allIncompletes.join(" | ");

        const phaseNotes = isPartial 
          ? `[PENGIRIMAN PARSIAL TAHAP ${currentPhase}] ` + notesText 
          : (currentPhase > 1 ? `[PENGIRIMAN SUSULAN LENGKAP TAHAP ${currentPhase}] ` : "") + notesText;

        const payload: Partial<OutboundDispatch> = {
          request_reference: selectedMR.request_number,
          vessel_name: selectedMR.vessel_name,
          warehouse_name: wName,
          delivery_destination: dDest,
          notes: phaseNotes,
          courier_name: cName,
          tracking_number: tNumber,
          driver_pic: dPic,
          work_order_ref: selectedMR.work_order_ref || "",
          account_code: selectedMR.account_code || "BPP",
          function_code: selectedMR.function_code || "ARMADA",
          items: dispatchItems,
          is_partial: isPartial,
          shipment_phase: currentPhase,
          incomplete_items_summary: incompleteSummary,
          status: isPartial ? "DISPATCHED_PARTIAL" : DispatchStatus.DISPATCHED,
          dispatch_logs: [
            {
              timestamp: new Date().toISOString(),
              action: `PENGIRIMAN TAHAP ${currentPhase}`,
              user: role || "Petugas Gudang",
              notes: isPartial 
                ? `Outbound Dispatch Tahap ${currentPhase} (Parsial). Terdapat barang yang belum lengkap dikirim.`
                : `Outbound Dispatch Tahap ${currentPhase} (Lengkap & Terverifikasi).`,
              phase: currentPhase,
              dispatched_items_summary: dispatchItems.map(i => `${i.spare_part_name} (${i.qty_dispatched} ${i.unit})`).join(", ")
            }
          ]
        };

        const createdDisp = await onCreateDispatch(payload);

        // Automatically update the corresponding SPK status
        if (selectedMR.work_order_ref && spkList && onUpdateSPK) {
          const matchedSPK = spkList.find(s => s.spk_number === selectedMR.work_order_ref);
          if (matchedSPK) {
            const newSpkStatus = isPartial ? "Incomplete" : "Dispatched";
            await onUpdateSPK(matchedSPK.id, { status: newSpkStatus });
          }
        }

        setIsCreateModalOpen(false);
        // Reset state values
        setSelectedTug5Id("");
        setDispatchItems([]);
        setCName("Internal Cargo");
        setTNumber("");
        setDPic("");
        setNotesText("");
        setWName("GUDANG UTAMA");
        setDDest("Port Agent / Vessel Side");

        let successMsg = `Pengiriman Tahap ${currentPhase} (TUG 8) berhasil diterbitkan!`;
        if (selectedMR.work_order_ref) {
          successMsg += isPartial 
            ? `\n\n⚠️ Pengiriman ini dikategorikan PARSIAL (Tahap ${currentPhase}). SPK ${selectedMR.work_order_ref} berstatus INCOMPLETE untuk menunggu pengiriman susulan Tahap ${currentPhase + 1}.`
            : `\n\n✓ Seluruh kargo telah lengkap 100% terkirim! Status SPK ${selectedMR.work_order_ref} di-update menjadi DISPATCHED.`;
        }
        alert(successMsg);
      } else {
        // dispatchSource === "tug10"
        if (!selectedTug10Id) {
          alert("Silakan pilih dokumen Bon Pengembalian (TUG 10) terlebih dahulu.");
          setIsLoading(false);
          return;
        }
        const selectedReturn = materialReturns.find(r => r.id === selectedTug10Id);
        if (!selectedReturn) {
          alert("Dokumen TUG 10 tidak ditemukan.");
          setIsLoading(false);
          return;
        }

        const vTarget = targetVesselName.trim() || `Kapal Penerima (ex-${selectedReturn.vessel_name})`;

        const payload: Partial<OutboundDispatch> = {
          request_reference: selectedReturn.return_number,
          vessel_name: vTarget,
          warehouse_name: wName || selectedReturn.warehouse_name || "GUDANG PENURUNAN",
          delivery_destination: dDest || "Target Vessel Side",
          notes: notesText,
          courier_name: cName || "Internal Cargo",
          tracking_number: tNumber || "-",
          driver_pic: dPic || "-",
          work_order_ref: selectedReturn.work_order_number || selectedReturn.spk_number || "",
          account_code: selectedReturn.account_code || "BPP",
          function_code: selectedReturn.function_code || "ARMADA",
          items: dispatchItems
        };

        const createdDisp = await onCreateDispatch(payload);

        // Update the TUG 10 return document status to Completed
        if (onUpdateReturn) {
          const dispNum = createdDisp?.dispatch_number || "DSP-V2V";
          await onUpdateReturn(selectedReturn.id, {
            status: "Completed",
            dispatch_reference: dispNum,
            notes: (selectedReturn.notes || "") + `\n[SINKRONISASI] Ditransfer ke kapal ${vTarget} dengan TUG 8: ${dispNum}`
          });
        }

        setIsCreateModalOpen(false);
        // Reset state values
        setSelectedTug10Id("");
        setDispatchItems([]);
        setTargetVesselName("");
        setDispatchSource("tug5");
        setCName("Internal Cargo");
        setTNumber("");
        setDPic("");
        setNotesText("");
        setWName("GUDANG UTAMA");
        setDDest("Port Agent / Vessel Side");

        alert(`Transfer Antar Kapal Berhasil!\n\nDokumen Pengiriman TUG 8 telah terbit untuk kapal ${vTarget} dan terhubung dengan penurunan barang kapal ${selectedReturn.vessel_name} (TUG 10: ${selectedReturn.return_number}).\nStatus dokumen TUG 10 otomatis diubah menjadi COMPLETED.`);
      }
    } catch (err: any) {
      alert("Gagal membuat pengiriman: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Parse location coordinates realistically for any spare part
  const getShelfCoordinates = (p: SparePart) => {
    const zones = ["Zone A (Heavy Mechanical)", "Zone B (Consumables)", "Zone C (Pipes & Fittings)", "Zone D (Auxiliary Spares)"];
    const textHash = p.sku || p.part_number || "A";
    const zoneIdx = Math.abs(textHash.charCodeAt(0) % zones.length);
    const rackNum = String(Math.abs((textHash.charCodeAt(1) || 1) % 5) + 1).padStart(2, "0");
    const lvlNum = String(Math.abs((textHash.charCodeAt(2) || 2) % 4) + 1).padStart(2, "0");
    const binNum = String(Math.abs((textHash.charCodeAt(3) || 3) % 20) + 1).padStart(2, "0");
    
    return {
      zone: zones[zoneIdx],
      rack: rackNum,
      level: lvlNum,
      bin: binNum,
      locationCode: `${zones[zoneIdx].split(" ")[1].substring(0, 1)}-R${rackNum}-L${lvlNum}-B${binNum}`
    };
  };

  const handleOpenUpdateModal = (dsp: OutboundDispatch) => {
    setSelectedDispatch(dsp);
    setCourierName(dsp.courier_name || "");
    setTrackingNumber(dsp.tracking_number || "");
    setDriverPic(dsp.driver_pic || "");
    setWarehouseName(dsp.warehouse_name || "Gudang Merak");
    setDeliveryDestination(dsp.delivery_destination || "");
    setNotes(dsp.notes || "");
    setDispatchStatusFlg(dsp.status);
    setErrorMessage(null);
  };

  const handleCommitDispatchUpdate = async () => {
    if (!selectedDispatch) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await onUpdateDispatch(selectedDispatch.id, {
        status: dispatchStatusFlg,
        courier_name: courierName,
        tracking_number: trackingNumber,
        driver_pic: driverPic,
        warehouse_name: warehouseName,
        delivery_destination: deliveryDestination,
        notes: notes
      });
      setSelectedDispatch(null);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memperbarui status pengiriman.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to match item dates against current timePreset / date filters
  const isDateInFilter = (dateStr?: string) => {
    if (!dateStr) return true;
    if (timePreset === "all") return true;
    const currentYYYYMM = new Date().toISOString().substring(0, 7);
    if (timePreset === "july2026" || selectedMonth === "2026-07") {
      return dateStr.startsWith("2026-07") || dateStr.startsWith(currentYYYYMM);
    }
    if (timePreset === "week") {
      const now = new Date().getTime();
      const dTime = new Date(dateStr).getTime();
      return isNaN(dTime) || (now - dTime) <= 7 * 24 * 60 * 60 * 1000;
    }
    if (timePreset === "month" && selectedMonth !== "ALL") {
      return dateStr.startsWith(selectedMonth) || dateStr.startsWith(currentYYYYMM);
    }
    if (timePreset === "custom") {
      if (dateFrom && dateStr < dateFrom) return false;
      if (dateTo && dateStr > dateTo) return false;
      return true;
    }
    return true;
  };

  // Filtered TUG 5 requests
  const filteredTug5List = React.useMemo(() => {
    return (requests || []).filter(r => {
      if (!r) return false;
      const vName = r.vessel_name || "";
      const reqNum = r.request_number || "";
      const tug5Num = r.tug5_number || "";
      const woRef = r.work_order_ref || "";
      const dateVal = r.request_date || (r.created_at ? r.created_at.split("T")[0] : "");
      const matchesSearch = search === "" || 
        reqNum.toLowerCase().includes(search.toLowerCase()) || 
        tug5Num.toLowerCase().includes(search.toLowerCase()) ||
        vName.toLowerCase().includes(search.toLowerCase()) ||
        woRef.toLowerCase().includes(search.toLowerCase());
      const matchesVessel = vesselFilter === "All" || vName === vesselFilter;
      return matchesSearch && matchesVessel && isDateInFilter(dateVal);
    });
  }, [requests, search, vesselFilter, timePreset, selectedMonth, dateFrom, dateTo]);

  // Filtered TUG 6 requests
  const filteredTug6List = React.useMemo(() => {
    const rawList = (requestsTUG6 && requestsTUG6.length > 0) ? requestsTUG6 : (requests || []).filter(r => r && (r as any).tug_type === "TUG6");
    return rawList.filter(r => {
      if (!r) return false;
      const vName = r.vessel_name || "";
      const reqNum = r.request_number || "";
      const tug6Num = r.tug6_number || "";
      const tug5Num = r.tug5_number || "";
      const woRef = r.work_order_ref || "";
      const dateVal = r.request_date || (r.created_at ? r.created_at.split("T")[0] : "");
      const matchesSearch = search === "" || 
        reqNum.toLowerCase().includes(search.toLowerCase()) || 
        tug6Num.toLowerCase().includes(search.toLowerCase()) ||
        tug5Num.toLowerCase().includes(search.toLowerCase()) ||
        vName.toLowerCase().includes(search.toLowerCase()) ||
        woRef.toLowerCase().includes(search.toLowerCase());
      const matchesVessel = vesselFilter === "All" || vName === vesselFilter;
      return matchesSearch && matchesVessel && isDateInFilter(dateVal);
    });
  }, [requestsTUG6, requests, search, vesselFilter, timePreset, selectedMonth, dateFrom, dateTo]);

  // Extract unique lists of vessels for filters
  const uniqueVessels = Array.from(new Set((dispatchList || []).filter(d => d && d.vessel_name).map(d => d.vessel_name))).filter(Boolean);

  // Filtering dispatches
  const filtered = (dispatchList || []).filter(d => {
    if (!d) return false;
    const vName = d.vessel_name || "";
    const dispNum = d.dispatch_number || "";
    const tug8Num = d.tug8_number || "";
    const reqRef = d.request_reference || "";

    const isQueue = activeTab === "queue" ? d.status !== DispatchStatus.DELIVERED && d.status !== DispatchStatus.COMPLETED && d.status !== "Completed" as any : d.status === DispatchStatus.DELIVERED || d.status === DispatchStatus.COMPLETED || d.status === "Completed" as any;
    
    const matchesSearch = 
      vName.toLowerCase().includes(search.toLowerCase()) || 
      dispNum.toLowerCase().includes(search.toLowerCase()) || 
      tug8Num.toLowerCase().includes(search.toLowerCase()) || 
      reqRef.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || d.status === statusFilter;
    const matchesVessel = vesselFilter === "All" || vName === vesselFilter;

    // Time filter evaluation
    const dDate = (d as any).dispatch_date || (d.created_at ? d.created_at.split("T")[0] : "") || d.created_at || "";
    const matchesTime = isDateInFilter(dDate);

    return isQueue && matchesSearch && matchesStatus && matchesVessel && matchesTime;
  });

  const handlePrintFilteredTUG5 = () => {
    let filterLabel = "Semua TUG 5";
    if (timePreset === "july2026" || selectedMonth === "2026-07") filterLabel = "Periode Juli 2026";
    else if (timePreset === "week") filterLabel = "7 Hari Terakhir";
    else if (timePreset === "month" && selectedMonth !== "ALL") filterLabel = `Bulan ${selectedMonth}`;
    else if (timePreset === "custom") filterLabel = `Kustom (${dateFrom || "Awal"} s/d ${dateTo || "Akhir"})`;

    if (filteredTug5List.length === 0) {
      const emptyDoc: MaterialRequest = {
        id: `tug5-empty-${Date.now()}`,
        request_number: "MR-2026-NIHIL",
        tug5_number: "TUG5-2026-NIHIL",
        vessel_name: "-",
        request_date: dateFrom || new Date().toISOString().split("T")[0],
        requester_name: "-",
        warehouse_name: "Gudang Merak",
        delivery_address: "Pelabuhan Merak, Cilegon, Banten",
        work_order_ref: "WO-REF",
        account_code: "BPP",
        function_code: "ARMADA",
        remarks: `Dokumen Rekapitulasi TUG 5 (${filterLabel} - NIHIL)`,
        status: "Approved",
        items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (onPreviewTUG5) onPreviewTUG5(emptyDoc);
      else onPreviewDocument("tug5" as any, emptyDoc as any);
    } else if (filteredTug5List.length === 1) {
      if (onPreviewTUG5) onPreviewTUG5(filteredTug5List[0]);
      else onPreviewDocument("tug5" as any, filteredTug5List[0] as any);
    } else {
      const combinedItems: any[] = [];
      filteredTug5List.forEach(req => {
        if (req.items) {
          req.items.forEach(itm => {
            combinedItems.push({
              ...itm,
              notes: `${itm.notes || ""} (${req.tug5_number || req.request_number} - ${req.vessel_name})`
            });
          });
        }
      });

      const vessels = Array.from(new Set(filteredTug5List.map(r => r.vessel_name).filter(Boolean)));
      const combinedDoc: MaterialRequest = {
        ...filteredTug5List[0],
        request_number: `REKAP-TUG5-${filteredTug5List.length}-FORM`,
        tug5_number: `TUG5-REKAP-${filteredTug5List.length}`,
        vessel_name: vessels.length > 0 ? (vessels.length > 3 ? `${vessels.slice(0, 3).join(", ")} (+${vessels.length - 3} Kapal)` : vessels.join(" / ")) : "-",
        items: combinedItems,
        remarks: `Dokumen Rekapitulasi TUG 5 (${filterLabel}) • Total ${filteredTug5List.length} Form TUG 5`
      };
      if (onPreviewTUG5) onPreviewTUG5(combinedDoc);
      else onPreviewDocument("tug5" as any, combinedDoc as any);
    }
  };

  const handlePrintFilteredTUG6 = () => {
    let filterLabel = "Semua TUG 6";
    if (timePreset === "july2026" || selectedMonth === "2026-07") filterLabel = "Periode Juli 2026";
    else if (timePreset === "week") filterLabel = "7 Hari Terakhir";
    else if (timePreset === "month" && selectedMonth !== "ALL") filterLabel = `Bulan ${selectedMonth}`;
    else if (timePreset === "custom") filterLabel = `Kustom (${dateFrom || "Awal"} s/d ${dateTo || "Akhir"})`;

    if (filteredTug6List.length === 0) {
      const emptyDoc: MaterialRequest = {
        id: `tug6-empty-${Date.now()}`,
        request_number: "MR6-2026-NIHIL",
        tug6_number: "TUG6-2026-NIHIL",
        tug5_number: "TUG6-2026-NIHIL",
        vessel_name: "-",
        request_date: dateFrom || new Date().toISOString().split("T")[0],
        requester_name: "-",
        warehouse_name: "Gudang Merak",
        delivery_address: "Pelabuhan Merak, Cilegon, Banten",
        work_order_ref: "WO-REF",
        account_code: "BPP",
        function_code: "ARMADA",
        remarks: `Dokumen Rekapitulasi TUG 6 (${filterLabel} - NIHIL)`,
        status: "Approved",
        items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (onPreviewTUG6) onPreviewTUG6(emptyDoc);
      else onPreviewDocument("tug6" as any, emptyDoc as any);
    } else if (filteredTug6List.length === 1) {
      if (onPreviewTUG6) onPreviewTUG6(filteredTug6List[0]);
      else onPreviewDocument("tug6" as any, filteredTug6List[0] as any);
    } else {
      const combinedItems: any[] = [];
      filteredTug6List.forEach(req => {
        if (req.items) {
          req.items.forEach(itm => {
            combinedItems.push({
              ...itm,
              notes: `${itm.notes || ""} (${req.tug6_number || req.tug5_number || req.request_number} - ${req.vessel_name})`
            });
          });
        }
      });

      const vessels = Array.from(new Set(filteredTug6List.map(r => r.vessel_name).filter(Boolean)));
      const combinedDoc: MaterialRequest = {
        ...filteredTug6List[0],
        request_number: `REKAP-TUG6-${filteredTug6List.length}-FORM`,
        tug6_number: `TUG6-REKAP-${filteredTug6List.length}`,
        tug5_number: `TUG6-REKAP-${filteredTug6List.length}`,
        vessel_name: vessels.length > 0 ? (vessels.length > 3 ? `${vessels.slice(0, 3).join(", ")} (+${vessels.length - 3} Kapal)` : vessels.join(" / ")) : "-",
        items: combinedItems,
        remarks: `Dokumen Rekapitulasi TUG 6 (${filterLabel}) • Total ${filteredTug6List.length} Form TUG 6`
      };
      if (onPreviewTUG6) onPreviewTUG6(combinedDoc);
      else onPreviewDocument("tug6" as any, combinedDoc as any);
    }
  };

  const handlePrintFilteredTUG8 = () => {
    if (filtered.length === 0) {
      const periodLabel = (timePreset === "july2026" || selectedMonth === "2026-07") ? "Juli 2026" : selectedMonth !== "ALL" ? `Bulan ${selectedMonth}` : "Periode Terpilih";
      const emptyDoc: OutboundDispatch = {
        id: `empty-tug8-${Date.now()}`,
        dispatch_number: (timePreset === "july2026" || selectedMonth === "2026-07") ? "TUG8-2026-JULI" : "TUG8-2026-NIHIL",
        tug8_number: (timePreset === "july2026" || selectedMonth === "2026-07") ? "BPB-2026-JULI" : "BPB-2026-NIHIL",
        request_reference: "MANUAL",
        vessel_name: "-",
        warehouse_name: "GUDANG MERAK CENTRAL",
        delivery_destination: "Port Agent / Vessel Side",
        courier_name: "INTERNAL CARGO TRANSIT",
        tracking_number: "-",
        driver_pic: "-",
        work_order_ref: "WO-MECH-99",
        account_code: "BPP",
        function_code: "ARMADA",
        status: DispatchStatus.COMPLETED,
        notes: `Dokumen Rekapitulasi TUG 8 (${periodLabel} - NIHIL)`,
        items: [],
        created_by: "Staff Dispatch",
        created_at: (timePreset === "july2026" || selectedMonth === "2026-07") ? "2026-07-31" : new Date().toISOString()
      };
      onPreviewDocument("bon", emptyDoc);
    } else if (filtered.length === 1) {
      onPreviewDocument("bon", filtered[0]);
    } else {
      const combinedItems: any[] = [];
      filtered.forEach(dsp => {
        if (dsp.items) {
          dsp.items.forEach(itm => {
            combinedItems.push({
              ...itm,
              notes: `${itm.notes || ""} (${dsp.dispatch_number || dsp.tug8_number || "TUG8"} - ${dsp.vessel_name})`
            });
          });
        }
      });
      const vessels = Array.from(new Set(filtered.filter(d => d && d.vessel_name).map(d => d.vessel_name))).filter(Boolean);
      const combinedDoc: OutboundDispatch = {
        ...filtered[0],
        dispatch_number: `REKAP-TUG8-${filtered.length}-ITEMS`,
        tug8_number: `BPB-REKAP-${filtered.length}`,
        vessel_name: vessels.length > 0 ? (vessels.length > 3 ? `${vessels.slice(0, 3).join(", ")} (+${vessels.length - 3} Kapal)` : vessels.join(" / ")) : "-",
        items: combinedItems,
        notes: `Rekapitulasi gabungan ${filtered.length} dokumen TUG 8`
      };
      onPreviewDocument("bon", combinedDoc);
    }
  };

  const dspTotalPages = Math.ceil(filtered.length / dspPerPage) || 1;
  const paginatedDsp = filtered.slice((dspPage - 1) * dspPerPage, dspPage * dspPerPage);

  const isAllPageSelected = paginatedDsp.length > 0 && paginatedDsp.every(d => selectedDspIds.includes(d.id));
  const isSomePageSelected = paginatedDsp.some(d => selectedDspIds.includes(d.id));

  const handleSelectAllPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedDsp.map(r => r.id);
      const combined = Array.from(new Set([...selectedDspIds, ...pageIds]));
      setSelectedDspIds(combined);
    } else {
      const pageIds = new Set(paginatedDsp.map(r => r.id));
      setSelectedDspIds(selectedDspIds.filter(id => !pageIds.has(id)));
    }
  };

  const handleToggleSelectRow = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedDspIds(prev => [...prev, id]);
    } else {
      setSelectedDspIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDspIds.length === 0 || !onDeleteDispatch) return;
    const confirmMsg = `Apakah Anda yakin ingin menghapus ${selectedDspIds.length} dokumen TUG 8 yang dichecklist?`;
    if (!confirm(confirmMsg)) return;

    setIsBulkDeleting(true);
    const totalToDelete = selectedDspIds.length;
    try {
      for (const id of selectedDspIds) {
        await onDeleteDispatch(id);
      }
      setSelectedDspIds([]);
      alert(`Berhasil menghapus ${totalToDelete} dokumen TUG 8.`);
    } catch (err: any) {
      console.error("Bulk delete error:", err);
      alert("Terjadi kesalahan saat menghapus dokumen TUG 8.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const safeDispatchList = (dispatchList || []).filter(Boolean);

  const statsActiveCount = safeDispatchList.filter(d => d.status !== DispatchStatus.DELIVERED && d.status !== DispatchStatus.COMPLETED && d.status !== "Completed" as any).length;
  const statsDraftCount = safeDispatchList.filter(d => d.status === DispatchStatus.DRAFT).length;
  const statsTransitCount = safeDispatchList.filter(d => d.status === DispatchStatus.DISPATCHED).length;
  const statsArchiveCount = safeDispatchList.filter(d => d.status === DispatchStatus.DELIVERED || d.status === DispatchStatus.COMPLETED || d.status === "Completed" as any).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 border-l border-slate-200">
      
      {/* Upper Brand / Title Area */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-xs no-print">
        <div>
          <h1 className="text-base font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-blue-600" /> Dispatch & Outbound Logistics (TUG 8)
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans font-medium">
            Manage Picking, Packaging, Stock Allocations, and view archived Bon Pengeluaran issue slips
          </p>
        </div>

        {/* Operational Flow Stats & Action Button */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200 shadow-xs rounded px-2.5 py-1 text-center select-none font-mono">
              <span className="text-[9px] text-slate-450 block uppercase font-black">Drafts</span>
              <span className="text-xs font-black text-slate-700">{statsDraftCount}</span>
            </div>
            <div className="bg-white border border-slate-200 shadow-xs rounded px-2.5 py-1 text-center select-none font-mono">
              <span className="text-[9px] text-blue-500 block uppercase font-black">In Progress</span>
              <span className="text-xs font-black text-blue-600">{statsActiveCount}</span>
            </div>
            <div className="bg-white border border-slate-200 shadow-xs rounded px-2.5 py-1 text-center select-none font-mono">
              <span className="text-[9px] text-orange-500 block uppercase font-black">On Transit</span>
              <span className="text-xs font-black text-orange-600">{statsTransitCount}</span>
            </div>
            <div className="bg-white border border-slate-200 shadow-xs rounded px-2.5 py-1 text-center select-none font-mono">
              <span className="text-[9px] text-green-500 block uppercase font-black">Delivered</span>
              <span className="text-xs font-black text-green-600">{statsArchiveCount}</span>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase font-extrabold px-5 py-3 rounded-lg shadow-md hover:shadow-blue-500/20 transition-all cursor-pointer font-sans"
          >
            <Truck className="w-4 h-4" /> Tambah Dispatch (TUG 8)
          </button>
        </div>
      </div>

      {/* Navigation Subtabs (Active Queue vs Document Archive) */}
      <div className="flex gap-4 border-b border-slate-200 bg-white px-6 shrink-0 no-print">
        <button
          onClick={() => { setActiveTab("queue"); setDspPage(1); }}
          className={`py-3.5 text-xs uppercase font-mono font-bold border-b-2 tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "queue" 
              ? "border-blue-600 text-blue-700" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Active Dispatch Queue ({statsActiveCount})
        </button>
        <button
          onClick={() => { setActiveTab("archive"); setDspPage(1); }}
          className={`py-3.5 text-xs uppercase font-mono font-bold border-b-2 tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "archive" 
              ? "border-blue-600 text-blue-700" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FolderArchive className="w-4 h-4" />
          TUG 8 Document Archive ({statsArchiveCount})
        </button>
      </div>

      {/* Searching & Analytical Filters */}
      <section className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-xs no-print">
        
        {/* Keyword */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Cari kapal, nomor TUG 8, nomor dispatch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-250 text-slate-800 p-2.5 pl-9 text-xs rounded-lg outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-450 font-sans font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] font-bold">
          
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-slate-600">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg p-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">Semua Status</option>
              {activeTab === "queue" ? (
                <>
                  <option value={DispatchStatus.DRAFT}>Draft</option>
                  <option value={DispatchStatus.PICKING}>Picking</option>
                  <option value={DispatchStatus.PACKED}>Packed</option>
                  <option value={DispatchStatus.READY_TO_DISPATCH}>Ready To Dispatch</option>
                  <option value={DispatchStatus.DISPATCHED}>Dispatched</option>
                </>
              ) : (
                <>
                  <option value={DispatchStatus.DELIVERED}>Delivered</option>
                  <option value={DispatchStatus.COMPLETED}>Completed</option>
                </>
              )}
            </select>
          </div>

          {/* Vessel Filter */}
          <div className="flex items-center gap-1.5 text-slate-600">
            <Anchor className="w-3.5 h-3.5 text-slate-400" />
            <span>Vessel:</span>
            <select
              value={vesselFilter}
              onChange={(e) => setVesselFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg p-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">Semua Kapal</option>
              {uniqueVessels.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Time Presets */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs text-center">
            <button
              type="button"
              onClick={() => { setTimePreset("all"); setSelectedMonth("ALL"); }}
              className={`px-2.5 py-1 rounded cursor-pointer transition-all text-[10px] ${timePreset === "all" ? "bg-white text-blue-700 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"}`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => { setTimePreset("week"); setSelectedMonth("ALL"); }}
              className={`px-2.5 py-1 rounded cursor-pointer transition-all text-[10px] ${timePreset === "week" ? "bg-white text-blue-700 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"}`}
            >
              Minggu Ini
            </button>
            <button
              type="button"
              onClick={() => { setTimePreset("month"); }}
              className={`px-2.5 py-1 rounded cursor-pointer transition-all text-[10px] ${timePreset === "month" ? "bg-white text-blue-700 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"}`}
            >
              Bulan
            </button>
            <button
              type="button"
              onClick={() => { setTimePreset("july2026"); setSelectedMonth("2026-07"); }}
              className={`px-2.5 py-1 rounded cursor-pointer transition-all text-[10px] ${timePreset === "july2026" ? "bg-rose-600 text-white font-black shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              title="Pilih Periode Juli 2026"
            >
              Juli 2026
            </button>
            <button
              type="button"
              onClick={() => { setTimePreset("custom"); setSelectedMonth("ALL"); }}
              className={`px-2.5 py-1 rounded cursor-pointer transition-all text-[10px] ${timePreset === "custom" ? "bg-white text-blue-700 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"}`}
            >
              Kustom
            </button>
          </div>

          {/* Month Selector */}
          {timePreset === "month" && (
            <select
              value={selectedMonth}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedMonth(val);
                if (val === "2026-07") setTimePreset("july2026");
              }}
              className="bg-slate-50 border border-slate-250 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">-- Semua Bulan 2026 --</option>
              <option value="2026-07">Juli 2026</option>
              <option value="2026-06">Juni 2026</option>
              <option value="2026-05">Mei 2026</option>
              <option value="2026-04">April 2026</option>
              <option value="2026-03">Maret 2026</option>
              <option value="2026-02">Februari 2026</option>
              <option value="2026-01">Januari 2026</option>
            </select>
          )}

          {/* Custom Date Inputs */}
          {timePreset === "custom" && (
            <div className="flex items-center gap-1 font-mono text-xs">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-slate-50 border border-slate-250 rounded px-2 py-1 text-xs font-bold text-slate-800"
              />
              <span className="text-slate-400 font-bold">s/d</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-slate-50 border border-slate-250 rounded px-2 py-1 text-xs font-bold text-slate-800"
              />
            </div>
          )}

          {/* Print Buttons Area */}
          <div className="flex items-center gap-1.5 ml-1 shrink-0">
            {/* Cetak TUG 5 Button */}
            <button
              type="button"
              onClick={handlePrintFilteredTUG5}
              className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-mono font-bold text-xs uppercase px-3 py-1.5 rounded-lg shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
              title="Cetak Dokumen TUG 5 Sesuai Rentang Waktu / Filter"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span>Cetak TUG 5 ({filteredTug5List.length})</span>
            </button>

            {/* Cetak TUG 6 Button */}
            <button
              type="button"
              onClick={handlePrintFilteredTUG6}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-mono font-bold text-xs uppercase px-3 py-1.5 rounded-lg shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
              title="Cetak Dokumen TUG 6 Sesuai Rentang Waktu / Filter"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span>Cetak TUG 6 ({filteredTug6List.length})</span>
            </button>

            {/* Cetak TUG 8 Button */}
            <button
              type="button"
              onClick={handlePrintFilteredTUG8}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-mono font-bold text-xs uppercase px-3 py-1.5 rounded-lg shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
              title="Cetak Dokumen TUG 8 Sesuai Rentang Waktu / Filter"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span>Cetak TUG 8 ({filtered.length})</span>
            </button>
          </div>

        </div>
      </section>

      {/* Main Table Segment */}
      <section className="flex-1 flex flex-col min-h-0 bg-white">
        
        {/* Bulk Delete Action Bar */}
        {selectedDspIds.length > 0 && onDeleteDispatch && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between shadow-xs sticky top-0 z-20">
            <div className="flex items-center gap-2 font-mono text-xs text-rose-900 font-extrabold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Terpilih <span className="bg-rose-200 text-rose-950 px-2 py-0.5 rounded font-black">{selectedDspIds.length}</span> Dokumen TUG 8</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setSelectedDspIds([])}
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
                <span>{isBulkDeleting ? "Menghapus..." : `Hapus (${selectedDspIds.length}) Terpilih`}</span>
              </button>
            </div>
          </div>
        )}

        <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-slate-700">
            <Box className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold uppercase font-mono tracking-widest text-slate-705">
              {activeTab === "queue" ? "Antrean Pengiriman Aktif (Inbound-to-Outbound)" : "Dokumen TUG 8 Terbit & Kearsipan (Completed Delivery)"}
            </span>
          </div>
          <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-mono font-bold text-slate-600">
            Total Enrols: {filtered.length}
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 italic font-mono uppercase">
                {activeTab === "queue" 
                  ? "Tidak ada antrean pengiriman aktif yang cocok dengan kriteria." 
                  : "Belum ada dokumen TUG 8 yang dikeluarkan/diselesaikan."}
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse min-w-[900px]">
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
                  <th className="p-3.5">Detail</th>
                  <th className="p-3.5">No. TUG 8 (Spare Part Note)</th>
                  <th className="p-3.5">No. Dispatch/Carrier</th>
                  <th className="p-3.5">Fisik Suku Cadang</th>
                  <th className="p-3.5">Alokasi Driver / PIC</th>
                  <th className="p-3.5 text-center">Metode Kurir</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right no-print">Dokumen TUG 8 / Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedDsp.map((item, idx) => {
                  const itemsCount = item.items.length;
                  const partsSummary = item.items.map(i => `${i.qty_dispatched || i.qty_requested}x ${i.part_number}`).join(", ");
                  const isSelected = selectedDspIds.includes(item.id);

                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors font-semibold ${
                        isSelected ? "bg-rose-50/60" : "hover:bg-blue-50/30"
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
                      {/* NO */}
                      <td className="p-3.5 text-center text-slate-500 font-mono font-bold">{(dspPage - 1) * dspPerPage + idx + 1}</td>
                      
                      {/* Shipping particulars */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900 text-xs">
                          {item.vessel_name}
                        </div>
                        <div className="text-[10px] text-slate-450 mt-1 flex flex-col gap-0.5">
                          <span className="font-mono text-[9px] uppercase">Ref TUG 5: <span className="font-bold text-blue-800">{item.request_reference}</span></span>
                          {item.work_order_ref && <span className="font-mono text-[9px] uppercase">WO: <span className="font-bold text-rose-700">{item.work_order_ref}</span></span>}
                          {(() => {
                            const multiHist = getMultiShipmentHistoryForSPK(item.work_order_ref || item.spk_number, item.request_reference);
                            if (multiHist.count > 1) {
                              return (
                                <span className="bg-purple-100 text-purple-900 border border-purple-300 px-1.5 py-0.5 rounded text-[8.5px] font-black w-fit mt-0.5 flex items-center gap-1">
                                  📦 Shipment Multi-Tahap ({item.shipment_phase || 1} dari {multiHist.count})
                                </span>
                              );
                            }
                            return null;
                          })()}
                          <span className="font-sans italic">Dest: {item.delivery_destination || "Sesuai alamat TUG 5"}</span>
                        </div>
                      </td>

                      {/* TUG 8 Number */}
                      <td className="p-3.5">
                        <span className="font-mono text-xs font-black text-rose-800 bg-rose-50 border border-rose-100 rounded px-2 py-0.5 block w-fit">
                          {item.tug8_number || item.bon_pengeluaran_number || "AWAITING"}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono mt-1 block">Tgl. Terbit: {item.dispatch_date ? new Date(item.dispatch_date).toLocaleDateString("id-ID") : "-"}</span>
                      </td>

                      {/* Dispatch No */}
                      <td className="p-3.5 font-mono text-xs">
                        <span className="font-bold text-slate-700 block">{item.dispatch_number || "DSP-PENDING"}</span>
                        <span className="text-[10px] text-slate-400 font-normal">SJL: {item.surat_jalan_number || "Awaiting"}</span>
                      </td>

                      {/* Spare parts count & summary */}
                      <td className="p-3.5 max-w-xs">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <Box className="w-3 h-3 text-slate-400" />
                          {itemsCount} Item Suku Cadang
                        </div>
                        <p className="text-[10px] text-slate-450 mt-1 font-mono tracking-tight leading-snug truncate animate-none" title={partsSummary}>
                          {partsSummary}
                        </p>
                      </td>

                      {/* Driver PIC */}
                      <td className="p-3.5 font-sans">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          {item.driver_pic || <span className="text-slate-400 font-normal italic">Belum dialokasi</span>}
                        </div>
                        <span className="font-mono text-[9px] text-slate-400 mt-0.5 block uppercase">Asal: {item.warehouse_name || "Gudang Utama"}</span>
                      </td>

                      {/* Transporter */}
                      <td className="p-3.5 text-center font-mono">
                        <span className="font-bold text-slate-800 text-[11px] block">{item.courier_name || "Self Pick-Up"}</span>
                        <span className="text-[9px] text-slate-400 font-normal">{item.tracking_number || "Tanpa resi"}</span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        {(() => {
                          const isPartialDisp = item.is_partial || item.status === "DISPATCHED_PARTIAL";
                          const phaseLabel = item.shipment_phase ? ` (Tahap ${item.shipment_phase})` : "";
                          
                          if (isPartialDisp) {
                            return (
                              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded text-[9.5px] font-black uppercase tracking-wider shadow-2xs inline-flex items-center gap-1" title={item.incomplete_items_summary}>
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                ⚠️ Dispatched Parsial{phaseLabel}
                              </span>
                            );
                          }

                          if (item.status === DispatchStatus.DISPATCHED || item.status === DispatchStatus.COMPLETED || item.status === DispatchStatus.DELIVERED) {
                            return (
                              <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded text-[9.5px] font-black uppercase tracking-wider shadow-2xs inline-flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                                ✓ Dispatched Lengkap{phaseLabel}
                              </span>
                            );
                          }

                          return (
                            <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider shadow-2xs inline-block border ${
                              item.status === DispatchStatus.DRAFT ? "bg-slate-100 text-slate-700 border-slate-200"
                              : item.status === DispatchStatus.PICKING ? "bg-amber-100 text-amber-800 border-amber-250 font-black"
                              : item.status === DispatchStatus.PACKED ? "bg-indigo-100 text-indigo-800 border-indigo-250"
                              : item.status === DispatchStatus.READY_TO_DISPATCH || item.status === "Ready To Dispatch" as any ? "bg-blue-100 text-blue-800 border-blue-250 animate-pulse"
                              : "bg-emerald-100 text-emerald-800 border-emerald-250"
                            }`}>
                              {item.status}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right no-print relative">
                        <div className="flex items-center justify-end">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionId(activeActionId === item.id ? null : item.id);
                              }}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white hover:bg-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all duration-200 cursor-pointer border border-slate-850"
                            >
                              <span>Actions</span>
                              <ChevronDown className="w-3 h-3" />
                            </button>

                            {activeActionId === item.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionId(null);
                                  }}
                                />
                                <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-250 rounded-lg shadow-xl z-50 overflow-hidden text-left py-1.5 text-slate-700 animate-in fade-in duration-100 ring-1 ring-black/5">
                                  {role !== UserRole.VESSEL_CREW ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveActionId(null);
                                        handleOpenUpdateModal(item);
                                      }}
                                      className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                    >
                                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                                      <span>Update Status</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveActionId(null);
                                        handleOpenUpdateModal(item);
                                      }}
              className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-slate-550" />
                                      <span>Lihat Detail</span>
                                    </button>
                                  )}

                                  {/* Quick Level 1 Signature Button (Alfin / Verifikator) */}
                                  {isAlfinRole && !item.alfin_signed && (
                                    <>
                                      <div className="border-t border-slate-100 my-1"></div>
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          const now = new Date().toISOString();
                                          if (onUpdateDispatch) {
                                            await onUpdateDispatch(item.id, {
                                              alfin_signed: true,
                                              alfin_signed_at: now,
                                              alfin_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=MaghfurAlfin"
                                            });
                                          }
                                        }}
                                        className="w-full px-4 py-2 text-xs font-bold hover:bg-emerald-50 text-emerald-700 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>✓ TTD Level 1 (Alfin)</span>
                                      </button>
                                    </>
                                  )}

                                  {/* Quick Level 2 Signature Button (Emir / Manager Logistik) */}
                                  {isEmirRole && !item.emir_signed && (
                                    <>
                                      <div className="border-t border-slate-100 my-1"></div>
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          const now = new Date().toISOString();
                                          if (onUpdateDispatch) {
                                            await onUpdateDispatch(item.id, {
                                              emir_signed: true,
                                              emir_signed_at: now,
                                              emir_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=EmirFerdian"
                                            });
                                          }
                                        }}
                                        className="w-full px-4 py-2 text-xs font-bold hover:bg-amber-50 text-amber-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5 text-amber-600" />
                                        <span>✓ TTD Level 2 (Emir)</span>
                                      </button>
                                    </>
                                  )}

                                  {/* Quick Level 3 Signature Button (Sumbono / VP Rendalhar) */}
                                  {isSumbonoRole && !item.sumbono_signed && (
                                    <>
                                      <div className="border-t border-slate-100 my-1"></div>
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          const now = new Date().toISOString();
                                          if (onUpdateDispatch) {
                                            await onUpdateDispatch(item.id, {
                                              sumbono_signed: true,
                                              sumbono_signed_at: now,
                                              sumbono_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=Sumbono",
                                              status: DispatchStatus.DELIVERED
                                            });
                                          }
                                        }}
                                        className="w-full px-4 py-2 text-xs font-bold hover:bg-indigo-50 text-indigo-700 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>✓ Sahkan & TTD (Sumbono)</span>
                                      </button>
                                    </>
                                  )}

                                  <div className="border-t border-slate-100 my-1"></div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveActionId(null);
                                      onPreviewDocument("bon", item);
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-rose-700 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Cetak TUG 8 Note</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveActionId(null);
                                      onPreviewDocument("surat_jalan", item);
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-emerald-700 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Cetak Surat Jalan</span>
                                  </button>

                                  {onDeleteDispatch && (
                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setActiveActionId(null);
                                        if (confirm(`Apakah Anda yakin ingin menghapus data Pengeluaran Barang TUG 8 [${item.tug8_number || item.bon_pengeluaran_number || item.id}]?`)) {
                                          await onDeleteDispatch(item.id);
                                        }
                                      }}
                                      className="w-full px-4 py-2 text-xs font-semibold hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer transition-colors text-left border-t border-slate-100"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      <span>Hapus Data TUG 8</span>
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modern Sticky Pagination Bar for Dispatch TUG 8 */}
        <div className="bg-white border-t border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans text-xs shrink-0 shadow-md sticky bottom-0 z-20 no-print">
          {/* Left: Record Range Summary & Per Page Selector */}
          <div className="flex items-center gap-4 text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 uppercase font-bold">Baris per halaman:</span>
              <select
                value={dspPerPage}
                onChange={(e) => {
                  setDspPerPage(Number(e.target.value));
                  setDspPage(1);
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
              Menampilkan <span className="text-slate-900 font-black">{filtered.length > 0 ? (dspPage - 1) * dspPerPage + 1 : 0}</span> - <span className="text-slate-900 font-black">{Math.min(dspPage * dspPerPage, filtered.length)}</span> dari <span className="text-slate-900 font-black">{filtered.length}</span> data TUG 8
            </span>
          </div>

          {/* Right: Page Number Buttons */}
          <div className="flex items-center gap-1 font-mono">
            <button
              disabled={dspPage === 1}
              onClick={() => setDspPage(1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              disabled={dspPage === 1}
              onClick={() => setDspPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 px-2.5 text-xs font-bold"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden md:inline">Sebelumnya</span>
            </button>

            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: dspTotalPages || 1 }, (_, i) => i + 1)
                .filter(p => p === 1 || p === dspTotalPages || Math.abs(p - dspPage) <= 1)
                .map((p, i, arr) => {
                  const prev = arr[i - 1];
                  const showEllipsis = prev && p - prev > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-slate-400 font-bold">...</span>}
                      <button
                        onClick={() => setDspPage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          dspPage === p
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
              disabled={dspPage >= dspTotalPages || dspTotalPages <= 1}
              onClick={() => setDspPage(p => Math.min(dspTotalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 px-2.5 text-xs font-bold"
              title="Halaman Selanjutnya"
            >
              <span className="hidden md:inline">Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              disabled={dspPage >= dspTotalPages || dspTotalPages <= 1}
              onClick={() => setDspPage(dspTotalPages)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* CORE CONTROLLER & PICKING COMPONENT MODAL */}
      {selectedDispatch && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white text-slate-850 rounded-lg shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 flex flex-col my-8">
            
            {/* Modal Title bar */}
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-400" />
                <h3 className="font-display font-black text-xs uppercase tracking-widest">
                  Outbound Logistics Dispatch Control Center (Ref: {selectedDispatch.dispatch_number})
                </h3>
              </div>
              <button onClick={() => setSelectedDispatch(null)} className="text-slate-400 hover:text-white cursor-pointer p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Modal Body (Split Side-by-Side: Form and Pick Verification Layout) */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto max-h-[75vh]">
              
              {/* Left Side: Header parameters and routing states (5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                <h4 className="text-xs uppercase font-mono font-bold tracking-widest text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-1">
                  <ClipboardList className="w-4 h-4 text-slate-400" /> 1. Parameter Formulir
                </h4>

                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-[11px] p-3 rounded flex items-start gap-2 select-none font-sans">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Gagal Menyimpan:</span> {errorMessage}
                    </div>
                  </div>
                )}

                {/* General Card Information Info Box */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-md space-y-1.5 select-none text-slate-600">
                  <div className="flex justify-between border-b border-slate-150 pb-1.5 mb-1.5">
                    <span className="font-mono text-[9px] font-bold text-slate-400">Kapal Tujuan (Vessel)</span>
                    <span className="font-bold text-slate-900">⚓ {selectedDispatch.vessel_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>No. TUG 8:</span>
                    <span className="font-mono font-bold text-rose-800">{selectedDispatch.tug8_number || "AWAITING"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Material Request Ref:</span>
                    <span className="font-mono font-bold text-blue-700">{selectedDispatch.request_reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coordinated By:</span>
                    <span>{selectedDispatch.created_by}</span>
                  </div>
                </div>

                {/* Partial Dispatch Status Warning Box */}
                {(selectedDispatch.is_partial || selectedDispatch.incomplete_items_summary) && (
                  <div className="bg-amber-50 border-2 border-amber-300 p-3.5 rounded-lg space-y-2 text-xs text-amber-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>⚠️ DISPATCH PARSIAL - BARANG BELUM LENGKAP</span>
                      </div>
                      {selectedDispatch.shipment_phase && (
                        <span className="bg-amber-200 text-amber-950 font-mono text-[10px] font-black px-2 py-0.5 rounded">
                          Tahap ke-{selectedDispatch.shipment_phase}
                        </span>
                      )}
                    </div>
                    {selectedDispatch.incomplete_items_summary && (
                      <div className="bg-white/90 p-2.5 rounded border border-amber-200 text-[11px] font-mono text-amber-950 leading-relaxed">
                        <span className="font-bold block text-[9.5px] text-amber-700 uppercase">Catatan & Summary Barang Belum Lengkap:</span>
                        {selectedDispatch.incomplete_items_summary}
                      </div>
                    )}
                  </div>
                )}

                {/* 3-Level Approval Stepper */}
                <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-black font-display uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Approval TUG 8 & TTD Digital
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {/* LEVEL 1: ALFIN */}
                    <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${selectedDispatch.alfin_signed ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100' : 'bg-slate-800/80 border-slate-700 text-slate-300'}`}>
                      <div>
                        <div className="font-bold">L1: Maghfur Alfin (Verifikator)</div>
                        <div className="text-[9.5px] text-slate-400 font-mono">
                          {selectedDispatch.alfin_signed ? `✓ Signed: ${selectedDispatch.alfin_signed_at ? new Date(selectedDispatch.alfin_signed_at).toLocaleDateString("id-ID") : "Terverifikasi"}` : "⏳ Pending Approval"}
                        </div>
                      </div>
                      {!selectedDispatch.alfin_signed && isAlfinRole && (
                        <button
                          type="button"
                          onClick={async () => {
                            const now = new Date().toISOString();
                            if (onUpdateDispatch) {
                              await onUpdateDispatch(selectedDispatch.id, {
                                alfin_signed: true,
                                alfin_signed_at: now,
                                alfin_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=MaghfurAlfin"
                              });
                            }
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase rounded cursor-pointer"
                        >
                          TTD Alfin
                        </button>
                      )}
                    </div>

                    {/* LEVEL 2: EMIR */}
                    <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${selectedDispatch.emir_signed ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100' : 'bg-slate-800/80 border-slate-700 text-slate-300'}`}>
                      <div>
                        <div className="font-bold">L2: Mohamat Emir (Manager)</div>
                        <div className="text-[9.5px] text-slate-400 font-mono">
                          {selectedDispatch.emir_signed ? `✓ Signed: ${selectedDispatch.emir_signed_at ? new Date(selectedDispatch.emir_signed_at).toLocaleDateString("id-ID") : "Terverifikasi"}` : "⏳ Pending Approval"}
                        </div>
                      </div>
                      {!selectedDispatch.emir_signed && isEmirRole && (
                        <button
                          type="button"
                          onClick={async () => {
                            const now = new Date().toISOString();
                            if (onUpdateDispatch) {
                              await onUpdateDispatch(selectedDispatch.id, {
                                emir_signed: true,
                                emir_signed_at: now,
                                emir_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=EmirFerdian"
                              });
                            }
                          }}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] uppercase rounded cursor-pointer"
                        >
                          TTD Emir
                        </button>
                      )}
                    </div>

                    {/* LEVEL 3: SUMBONO */}
                    <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${selectedDispatch.sumbono_signed ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100' : 'bg-slate-800/80 border-slate-700 text-slate-300'}`}>
                      <div>
                        <div className="font-bold">L3: Sumbono (VP Rendalhar)</div>
                        <div className="text-[9.5px] text-slate-400 font-mono">
                          {selectedDispatch.sumbono_signed ? `✓ Signed: ${selectedDispatch.sumbono_signed_at ? new Date(selectedDispatch.sumbono_signed_at).toLocaleDateString("id-ID") : "Disahkan"}` : "⏳ Pending Approval"}
                        </div>
                      </div>
                      {!selectedDispatch.sumbono_signed && isSumbonoRole && (
                        <button
                          type="button"
                          onClick={async () => {
                            const now = new Date().toISOString();
                            if (onUpdateDispatch) {
                              await onUpdateDispatch(selectedDispatch.id, {
                                sumbono_signed: true,
                                sumbono_signed_at: now,
                                sumbono_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=Sumbono",
                                status: DispatchStatus.DELIVERED
                              });
                            }
                          }}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase rounded cursor-pointer"
                        >
                          TTD Sumbono
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {role === UserRole.VESSEL_CREW ? (
                  // Read-Only view for crew
                  <div className="space-y-3 font-medium text-slate-805">
                    <div className="bg-slate-50 p-3 rounded space-y-2">
                      <p className="font-bold font-mono text-[9px] uppercase text-slate-400">Status & Driver Logs</p>
                      <div><strong>Current Status:</strong> {selectedDispatch.status}</div>
                      <div><strong>Transporter:</strong> {selectedDispatch.courier_name || "Internal Dispatch"}</div>
                      <div><strong>Driver / PIC Allocated:</strong> {selectedDispatch.driver_pic || "N/A"}</div>
                      <div><strong>Cargo Tracker No:</strong> {selectedDispatch.tracking_number || "None"}</div>
                      <div><strong>Depot Dispatching Warehouse:</strong> {selectedDispatch.warehouse_name || "Gudang Utama"}</div>
                      <div><strong>Notes/Remarks:</strong> {selectedDispatch.notes || "-"}</div>
                    </div>
                  </div>
                ) : (
                  // Full inputs for coordinators
                  <div className="space-y-3">
                    
                    {/* Status Select */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                        Outbound State Transitions
                      </label>
                      <select
                        value={dispatchStatusFlg}
                        disabled={isLoading}
                        onChange={(e) => setDispatchStatusFlg(e.target.value as DispatchStatus)}
                        className="w-full bg-slate-50 border border-slate-250 p-2.5 rounded text-xs font-bold font-mono tracking-tight text-slate-800 cursor-pointer"
                      >
                        <option value={DispatchStatus.DRAFT}>Draft (Surat Perintah Keluar Baru)</option>
                        <option value={DispatchStatus.PICKING}>Picking (Pengambilan Suku Cadang dari Rak)</option>
                        <option value={DispatchStatus.PACKED}>Packed (Pengemasan & Seal Logistik Cargo)</option>
                        <option value={DispatchStatus.READY_TO_DISPATCH}>Ready To Dispatch (Kesiapan Muat Transporter)</option>
                        <option value={DispatchStatus.DISPATCHED}>Dispatched (Kargo Berangkat - Potong Stok Gudang)</option>
                        <option value={DispatchStatus.DELIVERED}>Delivered (Telah Diterima Onboard & TTD)</option>
                        <option value={DispatchStatus.COMPLETED}>Completed (Tutup Kasus Pengeluaran)</option>
                      </select>
                      {dispatchStatusFlg === DispatchStatus.DISPATCHED && (
                        <p className="text-[9.5px] text-amber-600 font-mono font-bold mt-1 leading-relaxed border-l-2 border-amber-500 pl-2 italic">
                          ⚠️ Status DISPATCHED secara resmi memotong Stok Fisik suku cadang pada WMS dan mencatat histori Kartu Stok (Ledger / Mutasi). Sisa kuota akan dicadangkan.
                        </p>
                      )}
                    </div>

                    {/* Warehouse Name input */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                        Asal Depot / Gudang WMS
                      </label>
                      <select
                        value={warehouseName}
                        disabled={isLoading}
                        onChange={(e) => setWarehouseName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 p-2 text-xs rounded font-semibold text-slate-800"
                      >
                        <option value="Gudang Merak">Gudang Merak</option>
                        <option value="Tanjung Priok Supply Depot">Tanjung Priok Supply Depot</option>
                        <option value="Surabaya Surabaya Transit Hub">Surabaya Transit Hub</option>
                        <option value="Batam Free Trade Storehouse">Batam Free Trade Storehouse</option>
                      </select>
                    </div>

                    {/* Delivery Destination */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                        Alamat / Dermaga Tujuan (Delivery Destination)
                      </label>
                      <input
                        type="text"
                        value={deliveryDestination}
                        disabled={isLoading}
                        onChange={(e) => setDeliveryDestination(e.target.value)}
                        placeholder="e.g. Dermaga 115 Terminal Tanjung Priok"
                        className="w-full bg-slate-50 border border-slate-250 p-2 text-xs rounded font-semibold text-slate-800"
                      />
                    </div>

                    {/* Courier Name */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                        Kurir Logistik / Transporter
                      </label>
                      <input
                        type="text"
                        value={courierName}
                        disabled={isLoading}
                        onChange={(e) => setCourierName(e.target.value)}
                        placeholder="e.g. PT Pelayaran Bahtera Adhiguna Launch, DHL, JNE"
                        className="w-full bg-slate-50 border border-slate-250 p-2 text-xs rounded font-semibold text-slate-800"
                      />
                    </div>

                    {/* Tracking Number */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                        Nomor Seri Resi Transit (Tracking No.)
                      </label>
                      <input
                        type="text"
                        value={trackingNumber}
                        disabled={isLoading}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. BPB-TRACE-59114"
                        className="w-full bg-slate-50 border border-slate-250 p-2 text-xs rounded font-mono font-bold text-slate-800"
                      />
                    </div>

                    {/* Driver PIC */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                        Driver / Kurir PIC (Penerima Tugas)
                      </label>
                      <input
                        type="text"
                        value={driverPic}
                        disabled={isLoading}
                        onChange={(e) => setDriverPic(e.target.value)}
                        placeholder="e.g. Bambang Triyono (Driver Mobil Box)"
                        className="w-full bg-slate-50 border border-slate-250 p-2 text-xs rounded font-semibold text-slate-800"
                      />
                    </div>

                    {/* Notes / Special remarks */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                        Catatan Operasional / Surat Pengantar
                      </label>
                      <textarea
                        value={notes}
                        disabled={isLoading}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Keterangan tambatan kapal atau instruksi penyimpanan spesifik suku cadang..."
                        className="w-full bg-slate-50 border border-slate-250 p-2 text-xs rounded font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                  </div>
                )}
              </div>

              {/* Right Side: Interactive WMS Picking Sheet with real coordinates & stock checking (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
                  <h4 className="text-xs uppercase font-mono font-bold tracking-widest text-slate-800 flex items-center gap-1">
                    <CheckSquare className="w-4 h-4 text-orange-500" /> 2. Lembar Picking Suku Cadang (WMS Helper)
                  </h4>
                  <span className="text-[9.5px] text-slate-400 font-mono uppercase bg-slate-100 px-2 py-0.5 rounded font-bold">Automatic Allocation</span>
                </div>

                <p className="text-[11px] text-slate-500 leading-normal">
                  Karyawan Gudang (Warehouse Operator) menggunakan informasi layout koordinat di bawah untuk mengumpulkan suku cadang sedia ada di rak fisik:
                </p>

                {/* Grid Item Cards of Suku Cadang */}
                <div className="space-y-3">
                  {selectedDispatch.items.map((itm, idx) => {
                    // Match parts state
                    const actualPart = parts.find(p => p.id === itm.spare_part_id);
                    const coords = actualPart ? getShelfCoordinates(actualPart) : {
                      zone: "Zone A (General)",
                      rack: "01",
                      level: "01",
                      bin: "02",
                      locationCode: "A-R01-L01-B02"
                    };

                    const currentStock = actualPart ? actualPart.current_stock : 0;
                    const stockIsLow = currentStock < itm.qty_dispatched;

                    return (
                      <div 
                        key={itm.spare_part_id || idx} 
                        className={`border rounded-lg p-4 font-sans relative transition-all shadow-2xs hover:shadow-xs bg-white ${
                          stockIsLow ? "border-red-200 bg-red-50/20" : "border-slate-200"
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-2.5">
                          
                          {/* Part Details */}
                          <div>
                            <span className="font-mono text-[9px] uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">ITEM #{idx+1}</span>
                            <h5 className="font-extrabold text-slate-900 text-sm mt-1">{itm.spare_part_name}</h5>
                            <p className="font-mono text-[10.5px] text-slate-450 mt-0.5">Part No: {itm.part_number} | Satuan: {itm.unit || "PCS"}</p>
                            
                            {/* Material Layout Coordinate */}
                            <div className="mt-3 bg-blue-50/50 border border-blue-100 rounded-md p-2.5 flex items-center gap-4 text-xs font-mono select-none">
                              <div>
                                <span className="text-[8.5px] text-slate-400 block uppercase font-bold">Lokasi Rak Mekanik</span>
                                <span className="font-bold text-blue-800 text-[11px] flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  {coords.locationCode}
                                </span>
                              </div>
                              <div className="border-l border-blue-200 pl-3 leading-normal text-[10px] text-slate-500">
                                <div>Zona: {coords.zone}</div>
                                <div>Rack: {coords.rack} · Level: {coords.level} · Bin: {coords.bin}</div>
                              </div>
                            </div>
                          </div>

                          {/* Inventory Volumes */}
                          <div className="text-right flex md:flex-col justify-between items-center md:items-end gap-3 self-stretch shrink-0 md:border-l border-slate-150 md:pl-4 min-w-[120px]">
                            
                            {/* Stock Available */}
                            <div className="font-mono text-xs">
                              <span className="text-[8.5px] text-slate-400 block uppercase font-bold tracking-wider leading-none">Stok Fisik Gudang</span>
                              <span className={`text-base font-black ${stockIsLow ? "text-red-650" : "text-slate-905"}`}>{currentStock}</span>
                              <span className="text-[9px] text-slate-405 font-medium ml-1">tersedia</span>
                            </div>

                            {/* Picking quantity */}
                            <div className="font-mono text-xs bg-slate-50 p-1.5 border border-slate-200 rounded text-center min-w-[100px]">
                              <span className="text-[8px] text-slate-400 block uppercase font-bold leading-none mb-1">Jumlah Di-Cetak</span>
                              <span className="text-sm font-black text-rose-700">{itm.qty_dispatched}</span>
                              <span className="font-sans text-[8px] text-slate-500 block uppercase font-normal mt-0.5">Approved: {itm.qty_requested}</span>
                            </div>

                            {/* Unit Price Editable Input */}
                            <div className="font-mono text-xs bg-slate-50 p-1.5 border border-slate-200 rounded text-center min-w-[110px]">
                              <span className="text-[8px] text-slate-400 block uppercase font-bold leading-none mb-1">Harga Stn (IDR)</span>
                              <div className="relative">
                                <span className="absolute left-1.5 top-0.5 text-[9px] text-slate-400 font-bold">Rp</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={itm.unit_price !== undefined ? itm.unit_price : 0}
                                  onChange={async (e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    const updatedItems = selectedDispatch.items.map((item, i) => i === idx ? { ...item, unit_price: val } : item);
                                    setSelectedDispatch({ ...selectedDispatch, items: updatedItems });
                                    await onUpdateDispatch(selectedDispatch.id, { items: updatedItems });
                                  }}
                                  className="w-full bg-white border border-slate-250 rounded px-1 pl-5 py-0.5 text-xs font-bold text-slate-800 text-right focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* Negative stock warnings */}
                        {stockIsLow && (
                          <div className="mt-3 bg-red-100 border border-red-200 text-red-800 text-[10px] p-2.5 rounded font-mono font-bold uppercase tracking-wide flex items-center gap-1.5 animate-bounce select-none">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>STOK TIDAK MENCUKUPI! SYSTEM GUDANG AKAN MEMBLOKIR TRANSAKSI OUTBOUND INI.</span>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

                {/* Timeline History of transition */}
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <h5 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-3">
                    <History className="w-4 h-4 text-violet-500" /> Catatan Histori Logistik Kargo (Live Tracker)
                  </h5>

                  <div className="relative border-l border-slate-200 ml-3 pl-5 space-y-4 font-sans text-[11px] leading-relaxed select-none">
                    
                    {/* Step Delivered */}
                    {selectedDispatch.status === DispatchStatus.DELIVERED && (
                      <div className="relative">
                        <span className="absolute -left-[25px] top-0.5 bg-green-500 text-white rounded-full p-0.5 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs uppercase">Cargo Delivered</strong>
                          <p className="text-slate-505">Spares successfully loaded and confirmed signed off onboard target vessel by ship officers.</p>
                          <span className="text-[9.5px] text-slate-400 font-mono bg-slate-50 px-1 py-0.5 rounded">Action: Completed Signoff</span>
                        </div>
                      </div>
                    )}

                    {/* Step Dispatched */}
                    {["Dispatched", "Delivered", "Completed"].includes(selectedDispatch.status) && (
                      <div className="relative">
                        <span className="absolute -left-[25px] top-0.5 bg-orange-500 text-white rounded-full p-0.5 flex items-center justify-center">
                          <Truck className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs uppercase">Released (Dispatched)</strong>
                          <p className="text-slate-505">Transporter loaded with the sealed consignments and officially cleared depot gate. Warehouse physical stock deducted.</p>
                          <span className="text-[9.5px] text-slate-400 font-mono bg-slate-50 px-1 py-0.5 rounded">Carrier: {selectedDispatch.courier_name} (Resi: {selectedDispatch.tracking_number || "Tanpa Resi"})</span>
                        </div>
                      </div>
                    )}

                    {/* Step Picking / Packed */}
                    {["Picking", "Packed", "Ready To Dispatch", "Dispatched", "Delivered", "Completed"].includes(selectedDispatch.status) && (
                      <div className="relative">
                        <span className="absolute -left-[25px] top-0.5 bg-blue-500 text-white rounded-full p-0.5 flex items-center justify-center">
                          <Box className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs uppercase">Prepared (Picked & Packed)</strong>
                          <p className="text-slate-505">Items localized on designated WMS coordinates and carefully packaged in sealed shipping crates.</p>
                          <span className="text-[9.5px] text-slate-400 font-mono bg-slate-50 px-1 py-0.5">Assigned Warehouse: {selectedDispatch.warehouse_name || "Headquarters"}</span>
                        </div>
                      </div>
                    )}

                    {/* Step Created Draft */}
                    <div className="relative">
                      <span className="absolute -left-[25px] top-0.5 bg-slate-700 text-white rounded-full p-0.5 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <strong className="text-slate-900 block font-bold text-xs uppercase">Outbound Transaction Initiated (Draft)</strong>
                        <p className="text-slate-505">Automatically generated in Draft upon Material Request (TUG 5) approval. Connected to requirements seamlessly.</p>
                        <span className="text-[9.5px] text-slate-400 font-mono bg-slate-50 px-1 py-0.5">Initiator: {selectedDispatch.created_by}</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* PANEL LOG MULTI-PENGIRIMAN SPK (TUG 8 LEDGER) */}
                {(() => {
                  const multiHist = getMultiShipmentHistoryForSPK(selectedDispatch.work_order_ref || selectedDispatch.spk_number, selectedDispatch.request_reference);
                  if (multiHist.count === 0) return null;

                  const percentComplete = multiHist.totalRequested > 0 ? Math.min(100, Math.round((multiHist.totalDispatched / multiHist.totalRequested) * 100)) : 100;

                  return (
                    <div className="mt-6 bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-3.5 shadow-md">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-2.5 gap-2">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-orange-400 shrink-0" />
                          <h4 className="text-xs font-black font-display uppercase tracking-wider text-slate-100">
                            RIWAYAT LOG MULTI-PENGIRIMAN SPK (TUG 8 MULTI-DISPATCH LEDGER)
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            Total {multiHist.count}x Pengiriman
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${multiHist.isAllComplete ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                            {multiHist.isAllComplete ? '✓ SPK 100% TERKIRIM LENGKAP' : '⚠️ SPK MASIH PARSIAL'}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar Multi-Pengiriman */}
                      <div className="space-y-1 bg-slate-800/80 p-3 rounded-lg border border-slate-700/80 font-mono text-[11px]">
                        <div className="flex justify-between items-center text-[10px] text-slate-300">
                          <span>Progres Pengiriman Kumulatif SPK:</span>
                          <span className="font-bold text-amber-300">{multiHist.totalDispatched} dari {multiHist.totalRequested} Item ({percentComplete}%)</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${percentComplete === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${percentComplete}%` }}></div>
                        </div>
                      </div>

                      {/* List Dispatches in Timeline */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-blue-400" />
                          DAFTAR PHASES & LOG SURAT JALAN / TUG 8 UNTUK SPK #{selectedDispatch.work_order_ref || selectedDispatch.request_reference}:
                        </h5>

                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {multiHist.dispatches.map((dsp, idx) => {
                            const phaseNum = dsp.shipment_phase || (idx + 1);
                            const isThisCurrent = dsp.id === selectedDispatch.id;

                            return (
                              <div 
                                key={dsp.id} 
                                className={`p-3 rounded-lg border text-[11px] font-sans transition-all ${
                                  isThisCurrent 
                                    ? "bg-slate-800 border-blue-500 ring-1 ring-blue-500/40" 
                                    : "bg-slate-800/50 border-slate-700"
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-700 pb-1.5 mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-blue-600 text-white font-mono font-extrabold px-2 py-0.5 rounded text-[10px]">
                                      TAHAP {phaseNum}
                                    </span>
                                    <span className="font-mono font-bold text-rose-400 text-[11px]">
                                      {dsp.tug8_number || dsp.dispatch_number || "TUG 8"}
                                    </span>
                                    {isThisCurrent && (
                                      <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.2 rounded font-bold border border-emerald-500/30">
                                        Dokumen Ini
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                                    <span>📅 {dsp.dispatch_date ? new Date(dsp.dispatch_date).toLocaleDateString("id-ID") : "-"}</span>
                                    <span>&bull; Driver: <strong className="text-slate-200">{dsp.driver_pic || dsp.courier_name || "Internal"}</strong></span>
                                  </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10.5px]">
                                  <div className="text-slate-300">
                                    <span className="text-slate-400">Barang Dikirim: </span>
                                    <strong className="text-white">
                                      {dsp.items.map(i => `${i.qty_dispatched || i.qty_requested} ${i.unit || 'PCS'} ${i.spare_part_name}`).join(", ")}
                                    </strong>
                                  </div>
                                  <div>
                                    {dsp.is_partial || dsp.status === "DISPATCHED_PARTIAL" ? (
                                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[9.5px] font-bold">
                                        ⚠️ Pengiriman Parsial
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[9.5px] font-bold">
                                        ✓ Pengiriman Lengkap
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>

            </div>

            {/* Modal Bottom toolbar (Action buttons) */}
            <div className="bg-slate-900 border-t border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 no-print font-mono">
              
              {/* Left side printer bypass */}
              <div className="flex gap-2.5 items-center w-full sm:w-auto">
                <button
                  onClick={() => {
                    onPreviewDocument("bon", selectedDispatch);
                    setSelectedDispatch(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-rose-700 hover:bg-rose-600 font-mono font-bold text-[10.5px] uppercase rounded-md text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4 text-rose-300" /> Preview & Cetak TUG 8
                </button>
                <button
                  onClick={() => {
                    onPreviewDocument("surat_jalan", selectedDispatch);
                    setSelectedDispatch(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 font-mono font-bold text-[10.5px] uppercase rounded-md text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4 text-emerald-400" /> Preview Surat Jalan
                </button>
              </div>

              {/* Right side Commit buttons */}
              <div className="flex justify-end gap-3 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setSelectedDispatch(null)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-751 text-slate-300 font-bold uppercase rounded-md text-xs cursor-pointer transition-colors text-center"
                >
                  Close Detail Panel
                </button>
                
                {role !== UserRole.VESSEL_CREW && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleCommitDispatchUpdate}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold uppercase rounded-md text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? "Saving Data..." : "Commit Changes"}
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 4. CREATE DISPATCH MODAL (TUG 8 CREATION & TUG 5 INTEGRATION) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in no-print">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-500/15 rounded text-blue-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-sans uppercase tracking-wider">
                    Tambah Dispatch / Pengiriman Baru (TUG 8)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Membuat dokumen pengiriman TUG 8 terintegrasi data Permintaan Barang TUG 5
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateDispatchSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* SOURCE SELECTOR TABS */}
                <div className="grid grid-cols-2 gap-4 bg-slate-100 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchSource("tug5");
                      setSelectedTug10Id("");
                    }}
                    className={`py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
                      dispatchSource === "tug5"
                        ? "bg-white text-blue-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    📦 Sumber TUG 5 (Permintaan Kapal)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchSource("tug10");
                      setSelectedTug5Id("");
                    }}
                    className={`py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
                      dispatchSource === "tug10"
                        ? "bg-white text-emerald-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🔄 Sumber TUG 10 (Transfer Antar Kapal)
                  </button>
                </div>

                {/* Section 1 (TUG 5): Integrasi Permintaan Barang TUG 5 */}
                {dispatchSource === "tug5" && (
                  <div className="bg-blue-50/50 border border-blue-150 p-4.5 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 text-blue-900 border-b border-blue-100 pb-2">
                      <ClipboardList className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-black font-mono uppercase tracking-wider">
                        1. Pilih Permintaan Barang (TUG 5)
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Dokumen TUG 5 (Permintaan Barang) yang Siap Dikirim
                      </label>
                      <select
                        value={selectedTug5Id}
                        onChange={(e) => setSelectedTug5Id(e.target.value)}
                        required={dispatchSource === "tug5"}
                        className="w-full bg-white border border-slate-300 rounded-lg text-xs px-3 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">-- SILAKAN PILIH DOKUMEN TUG 5 --</option>
                        {requests
                          .filter(r => r.status === "Approved" || r.status === "Processed" || r.status === "Submitted")
                          .map(r => (
                            <option key={r.id} value={r.id}>
                              [{r.request_number}] - {r.vessel_name} (Status: {r.status} &bull; {r.items.length} item)
                            </option>
                          ))}
                        {/* Fallback showing other statuses if none of above are available, to keep it extremely resilient */}
                        {requests.filter(r => !["Approved", "Processed", "Submitted"].includes(r.status)).length > 0 && (
                          <optgroup label="Suku Cadang Lainnya">
                            {requests
                              .filter(r => !["Approved", "Processed", "Submitted"].includes(r.status))
                              .map(r => (
                                <option key={r.id} value={r.id}>
                                  [{r.request_number}] - {r.vessel_name} (Status: {r.status} &bull; {r.items.length} item)
                                </option>
                              ))}
                          </optgroup>
                        )}
                      </select>
                      <span className="text-[9.5px] text-slate-400 block mt-1.5">
                        Memilih TUG 5 akan mensinkronisasikan Nama Kapal, Daftar Suku Cadang, Nomor Work Order, Kode Akun ERP, Kode Fungsi, dan Alamat Tujuan secara otomatis.
                      </span>
                    </div>

                      {selectedTug5Id && (() => {
                        const selMR = requests.find(r => Boolean(r) && r.id === selectedTug5Id);
                        if (!selMR) return null;

                        const matchedInbound = (receivingList || []).find(r => 
                          Boolean(r) && (
                            (r.spk_number && selMR.work_order_ref && r.spk_number === selMR.work_order_ref) ||
                            (r.spk_id && selMR.work_order_ref && r.spk_id === selMR.work_order_ref) ||
                            (r.spk_number && selMR.request_number && r.spk_number === selMR.request_number)
                          )
                        );

                        const isInboundPartial = matchedInbound ? (
                          matchedInbound.status === ReceivingStatus.PARTIAL_REJECT || 
                          matchedInbound.status === ReceivingStatus.FULL_REJECT || 
                          (matchedInbound.status as string) === "PARTIAL_REJECT" || 
                          (matchedInbound.status as string) === "FULL_REJECT" || 
                          matchedInbound.items.some(i => {
                            const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
                            const st = i.status || i.qc_status;
                            return i.qty_received < targetQty || st === "PARTIAL" || st === "REJECTED" || st === "Rejected";
                          })
                        ) : false;

                        const inboundIncompleteList = matchedInbound ? matchedInbound.items
                          .filter(i => {
                            const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
                            const st = i.status || i.qc_status;
                            return i.qty_received < targetQty || st === "REJECTED" || st === "Rejected" || st === "PARTIAL" || Boolean(i.keeper_notes);
                          })
                          .map(i => {
                            const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
                            const name = i.part_name || i.spare_part_name || i.part_number;
                            const selisih = Math.max(0, targetQty - i.qty_received);
                            return {
                              part_name: name,
                              part_number: i.part_number,
                              qty_target: targetQty,
                              qty_received: i.qty_received,
                              qty_shortage: selisih,
                              notes: i.keeper_notes || i.reject_reason || "Barang belum diterima lengkap saat Inbound Receiving"
                            };
                          }) : [];

                        const prevDispatches = (dispatchList || []).filter(d => 
                          Boolean(d) && (
                            (selMR.work_order_ref && (d.work_order_ref === selMR.work_order_ref || d.spk_number === selMR.work_order_ref)) ||
                            (d.request_reference === selMR.request_number)
                          )
                        );

                      const currentPhase = prevDispatches.length + 1;
                      const isPartialThisBatch = dispatchItems.some(i => ((i.previously_dispatched || 0) + (i.qty_dispatched || 0)) < (i.qty_requested || 0)) || isInboundPartial;

                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-3.5 rounded-lg border border-blue-100/70 text-xs">
                            <div>
                              <span className="text-slate-400 font-mono text-[10px] block uppercase">Kapal Penerima</span>
                              <span className="font-bold text-slate-900">{selMR.vessel_name}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-mono text-[10px] block uppercase">No. Work Order / SPK</span>
                              <span className="font-bold text-slate-900">{selMR.work_order_ref || "NP"}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-mono text-[10px] block uppercase">Tahap Pengiriman</span>
                              <span className="font-bold text-blue-700 font-mono">Tahap ke-{currentPhase} {prevDispatches.length > 0 ? `(Susulan)` : `(Awal)`}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-mono text-[10px] block uppercase">Status Pengiriman</span>
                              <span className={`font-black uppercase text-[10.5px] ${isPartialThisBatch ? 'text-amber-700' : 'text-emerald-700'}`}>
                                {isPartialThisBatch ? "⚠️ PARSIAL (BELUM LENGKAP)" : "✓ LENGKAP (100%)"}
                              </span>
                            </div>
                          </div>

                          {/* INBOUND RECEIVING PARTIAL WARNING BANNER */}
                          {isInboundPartial && (
                            <div className="bg-amber-50/90 border-2 border-amber-300 rounded-xl p-3.5 space-y-2.5 shadow-xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
                                  <span>⚠️ PERHATIAN: DATA INBOUND RECEIVING PARSIAL / BELUM LENGKAP</span>
                                </div>
                                <span className="bg-amber-200 text-amber-950 font-mono text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                                  Status Inbound: {matchedInbound?.status || "PARTIAL_REJECT"}
                                </span>
                              </div>

                              <p className="text-[11px] text-amber-800 leading-relaxed">
                                Dokumen TUG 5 / SPK ini tercatat memiliki suku cadang yang <strong>belum lengkap diterima saat Inbound Receiving di Gudang</strong>. QTY pengiriman default telah disesuaikan dengan fisik barang yang diterima.
                              </p>

                              {matchedInbound?.keeper_notes && (
                                <div className="bg-white/80 p-2 rounded border border-amber-200 text-[11px] text-amber-950 font-mono">
                                  <span className="font-bold block text-[9.5px] text-amber-700 uppercase">Catatan Petugas Receiving:</span>
                                  "{matchedInbound.keeper_notes}"
                                </div>
                              )}

                              {inboundIncompleteList.length > 0 && (
                                <div className="space-y-1 pt-1 border-t border-amber-200/60">
                                  <span className="text-[10px] font-bold text-amber-900 uppercase block font-mono">Rincian Barang Belum Masuk Gudang (Kurang/Reject):</span>
                                  <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto pr-1">
                                    {inboundIncompleteList.map((inc, idx) => (
                                      <div key={idx} className="bg-white p-2 rounded border border-amber-200 text-xs flex items-center justify-between">
                                        <div>
                                          <span className="font-bold text-slate-900">{inc.part_name}</span> <span className="font-mono text-slate-400 text-[10px]">({inc.part_number})</span>
                                          <div className="text-amber-800 text-[11px] font-mono mt-0.5">
                                            Target SPK: <strong>{inc.qty_target}</strong> &bull; Diterima Inbound: <strong>{inc.qty_received}</strong> (Kurang: <strong className="text-rose-700">{inc.qty_shortage}</strong>)
                                          </div>
                                        </div>
                                        {inc.notes && (
                                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono italic max-w-[180px] truncate" title={inc.notes}>
                                            {inc.notes}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {prevDispatches.length > 0 && (
                            <div className="bg-blue-100/70 border border-blue-200 p-2.5 rounded-lg text-xs font-mono flex items-center justify-between text-blue-900">
                              <span className="font-bold flex items-center gap-1.5">
                                <History className="w-4 h-4 text-blue-600 shrink-0" />
                                Terdeteksi {prevDispatches.length}x Pengiriman Sebelumnya Untuk SPK #{selMR.work_order_ref || selMR.request_number}
                              </span>
                              <span className="text-[10px] bg-blue-200 px-2 py-0.5 rounded font-black">
                                Pengiriman Tahap ke-{currentPhase}
                              </span>
                            </div>
                          )}

                          {/* Interactive Item Table */}
                          <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                                Atur QTY Suku Cadang Yang Dikirim Pada Tahap Ini ({dispatchItems.length} Item)
                              </span>
                              <span className="text-[9.5px] font-mono text-slate-400">
                                Anda dapat mengubah QTY dikirim jika pengiriman dilakukan parsial.
                              </span>
                            </div>

                            <div className="overflow-x-auto max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
                              <table className="w-full text-left text-[11px] border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-mono text-[10px] uppercase">
                                    <th className="p-2.5">Suku Cadang / Part Number</th>
                                    <th className="p-2.5 text-center w-16">Unit</th>
                                    <th className="p-2.5 text-center w-20 text-slate-600">Target SPK</th>
                                    <th className="p-2.5 text-center w-24 text-amber-800 bg-amber-50/50">Diterima Inbound</th>
                                    <th className="p-2.5 text-center w-24 text-slate-500">Pernah Dikirim</th>
                                    <th className="p-2.5 text-center w-28 font-bold text-blue-800 bg-blue-50/50">QTY Kirim Tahap Ini</th>
                                    <th className="p-2.5 text-center w-20 text-rose-700">Sisa Belum Kirim</th>
                                    <th className="p-2.5 text-center w-28">Status Item</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-800 font-sans">
                                  {dispatchItems.map((itm, index) => {
                                    const prev = itm.previously_dispatched || 0;
                                    const req = itm.qty_requested || 0;
                                    const curr = itm.qty_dispatched || 0;
                                    const inboundQty = (itm as any).qty_inbound_received !== undefined ? (itm as any).qty_inbound_received : req;
                                    const remaining = Math.max(0, req - prev - curr);
                                    const isItemComplete = (prev + curr) >= req;
                                    const isInboundShort = inboundQty < req;

                                    return (
                                      <tr key={index} className="hover:bg-slate-50">
                                        <td className="p-2.5">
                                          <div className="font-bold text-slate-900">{itm.spare_part_name}</div>
                                          <div className="text-[10px] text-slate-400 font-mono">{itm.part_number}</div>
                                          {itm.inbound_notes && (
                                            <div className="text-[9.5px] text-amber-700 italic font-mono mt-0.5">Catatan Inbound: {itm.inbound_notes}</div>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-center font-mono font-bold text-slate-600">{itm.unit}</td>
                                        <td className="p-2.5 text-center font-mono font-bold">{req}</td>
                                        <td className="p-2.5 text-center font-mono font-bold bg-amber-50/30">
                                          <span className={isInboundShort ? "text-amber-900 font-black" : "text-slate-800"}>{inboundQty}</span>
                                          {isInboundShort && (
                                            <span className="text-[9px] text-rose-600 block font-normal">Kurang {req - inboundQty}</span>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-center font-mono text-slate-500">{prev}</td>
                                        <td className="p-2.5 text-center bg-blue-50/30">
                                          <input
                                            type="number"
                                            min="0"
                                            max={req - prev}
                                            value={itm.qty_dispatched}
                                            onChange={(e) => {
                                              const val = Math.max(0, parseInt(e.target.value) || 0);
                                              setDispatchItems(prevItems => prevItems.map((item, i) => i === index ? { ...item, qty_dispatched: val } : item));
                                            }}
                                            className="w-20 bg-white border border-blue-300 rounded p-1 text-center font-mono font-black text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                        </td>
                                        <td className="p-2.5 text-center font-mono font-bold text-rose-700">
                                          {remaining > 0 ? remaining : 0}
                                        </td>
                                        <td className="p-2.5 text-center">
                                          {isItemComplete ? (
                                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[9.5px] font-bold">✓ Lengkap</span>
                                          ) : (
                                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[9.5px] font-bold">⚠️ Parsial</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Section 1 (TUG 10): Integrasi Penurunan Barang TUG 10 */}
                {dispatchSource === "tug10" && (
                  <div className="bg-emerald-50/50 border border-emerald-150 p-4.5 rounded-xl space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 text-emerald-900 border-b border-emerald-100 pb-2">
                      <ClipboardList className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-black font-mono uppercase tracking-wider">
                        1. Pilih Bon Pengembalian / Penurunan (TUG 10)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Dokumen TUG 10 (Penurunan Suku Cadang)
                        </label>
                        <select
                          value={selectedTug10Id}
                          onChange={(e) => setSelectedTug10Id(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg text-xs px-3 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">-- SILAKAN PILIH DOKUMEN TUG 10 --</option>
                          {materialReturns.length === 0 ? (
                            <option disabled value="">Tidak ada dokumen TUG 10 tersedia</option>
                          ) : (
                            materialReturns.map(r => {
                              const isManual = !r.spk_number || r.spk_number === "MANUAL";
                              const modeLabel = isManual ? "MANUAL (TANPA SPK)" : `SPK: ${r.spk_number}`;
                              return (
                                <option key={r.id} value={r.id}>
                                  [{r.return_number}] - Dari Kapal: {r.vessel_name} ({modeLabel} &bull; Status: {r.status} &bull; {r.items.length} item)
                                </option>
                              );
                            })
                          )}
                        </select>
                        <span className="text-[9.5px] text-slate-400 block mt-1.5">
                          Memuat seluruh dokumen TUG 10 (manual tanpa SPK maupun tersinkron SPK).
                        </span>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Kapal Tujuan Transfer (Vessel Destination)
                        </label>
                        <input
                          type="text"
                          value={targetVesselName}
                          onChange={(e) => setTargetVesselName(e.target.value)}
                          placeholder="Contoh: MV. KARTINI BARUNA (opsional)"
                          className="w-full bg-white border border-slate-300 rounded-lg text-xs px-3 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <span className="text-[9.5px] text-slate-400 block mt-1.5">
                          Nama kapal penerima transfer baru (otomatis terisi jika dikosongkan).
                        </span>
                      </div>
                    </div>

                    {selectedTug10Id && (() => {
                      const selReturn = materialReturns.find(r => r.id === selectedTug10Id);
                      if (!selReturn) return null;
                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-3.5 rounded-lg border border-emerald-100/70 text-xs">
                            <div>
                              <span className="text-slate-400 font-mono text-[10px] block uppercase">Kapal Asal (Penurunan)</span>
                              <span className="font-bold text-slate-900">⚓ {selReturn.vessel_name}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-mono text-[10px] block uppercase">No. Work Order / SPK</span>
                              <span className="font-bold text-slate-900">{selReturn.work_order_number || selReturn.spk_number || "NP"}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-mono text-[10px] block uppercase">Kode Akun</span>
                              <span className="font-bold text-slate-900">{selReturn.account_code || "BPP"}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-mono text-[10px] block uppercase">Kode Fungsi</span>
                              <span className="font-bold text-slate-900">{selReturn.function_code || "ARMADA"}</span>
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                              Suku Cadang yang Akan Ditransfer ({dispatchItems.length} Item)
                            </span>
                            <div className="overflow-x-auto max-h-48 overflow-y-auto border border-slate-100 rounded">
                              <table className="w-full text-left text-[11px] border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-150 font-bold">
                                    <th className="p-2">Suku Cadang / Part Number</th>
                                    <th className="p-2 text-center w-24">Unit</th>
                                    <th className="p-2 text-center w-28">QTY Transfer</th>
                                    <th className="p-2 text-right w-36">Harga Stn (IDR)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dispatchItems.map((itm, index) => (
                                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                      <td className="p-2">
                                        <div className="font-bold text-slate-800">{itm.spare_part_name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{itm.part_number}</div>
                                      </td>
                                      <td className="p-2 text-center text-slate-600 font-bold">{itm.unit}</td>
                                      <td className="p-2 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30">
                                        {itm.qty_dispatched}
                                      </td>
                                      <td className="p-2">
                                        <div className="relative">
                                          <span className="absolute left-1.5 top-1.5 text-[10px] text-slate-400 font-bold">Rp</span>
                                          <input
                                            type="number"
                                            min="0"
                                            value={itm.unit_price}
                                            onChange={(e) => {
                                              const val = Math.max(0, parseInt(e.target.value) || 0);
                                              setDispatchItems(prev => prev.map((item, i) => i === index ? { ...item, unit_price: val } : item));
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded p-1 pl-6 text-xs font-bold font-mono text-right text-slate-800 focus:outline-none focus:border-emerald-500"
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Section 2: Detail Transporter & Expedisi */}
                <div className="border border-slate-200 p-4.5 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 text-slate-800">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-black font-mono uppercase tracking-wider">
                        2. Informasi Pengiriman & Transporter
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono font-bold">
                      Opsional / Tidak Wajib
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 uppercase block mb-1">
                        Nama Gudang Pengirim (Opsional)
                      </label>
                      <input
                        type="text"
                        value={wName}
                        onChange={(e) => setWName(e.target.value)}
                        placeholder="GUDANG UTAMA"
                        className="w-full bg-slate-50 border border-slate-250 rounded-md text-xs px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 uppercase block mb-1">
                        Alamat / Pelabuhan Tujuan (Opsional)
                      </label>
                      <input
                        type="text"
                        value={dDest}
                        onChange={(e) => setDDest(e.target.value)}
                        placeholder="Port Agent / Vessel Side"
                        className="w-full bg-slate-50 border border-slate-250 rounded-md text-xs px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 uppercase block mb-1">
                        Ekspedisi / Courier Name (Opsional)
                      </label>
                      <input
                        type="text"
                        value={cName}
                        onChange={(e) => setCName(e.target.value)}
                        placeholder="Internal Cargo / JNE / Vendor"
                        className="w-full bg-slate-50 border border-slate-250 rounded-md text-xs px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 uppercase block mb-1">
                        No. Kendaraan / No. Resi Tracking (Opsional)
                      </label>
                      <input
                        type="text"
                        value={tNumber}
                        onChange={(e) => setTNumber(e.target.value)}
                        placeholder="B 9482 TQA"
                        className="w-full bg-slate-50 border border-slate-250 rounded-md text-xs px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 uppercase block mb-1">
                        Driver / PIC Transporter (Opsional)
                      </label>
                      <input
                        type="text"
                        value={dPic}
                        onChange={(e) => setDPic(e.target.value)}
                        placeholder="Ahmad Subarjo"
                        className="w-full bg-slate-50 border border-slate-250 rounded-md text-xs px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-550 uppercase block mb-1">
                      Catatan / Keterangan Tambahan (Opsional)
                    </label>
                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="Catatan pengiriman kargo, instruksi bongkar muat..."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-250 rounded-md text-xs px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Section 3: Ringkasan Suku Cadang yang Akan Dikirim */}
                {dispatchSource === "tug5" && selectedTug5Id && (() => {
                  const selMR = requests.find(r => r.id === selectedTug5Id);
                  if (!selMR || !selMR.items || selMR.items.length === 0) return null;
                  
                  const hasIncompleteItems = selMR.items.some(
                    itm => itm.item_status === "Pending" || itm.item_status === "Returned"
                  );

                  return (
                    <div className="border border-slate-200 p-4.5 rounded-xl space-y-3">
                      <div className="flex items-center justify-between text-slate-800 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-black font-mono uppercase tracking-wider">
                            3. Ringkasan Material / Suku Cadang ({selMR.items.length} Item)
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          hasIncompleteItems 
                            ? "bg-amber-100 text-amber-800" 
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {hasIncompleteItems ? "Parsial (Incomplete)" : "Sinkron (Lengkap)"}
                        </span>
                      </div>

                      {hasIncompleteItems && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-lg p-3.5 text-xs flex gap-2.5 leading-relaxed">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-amber-900">Perhatian: Kargo Belum Lengkap!</span>
                            Beberapa item ditandai sebagai <span className="font-bold">Belum Datang</span> atau <span className="font-bold">Diretur</span> pada TUG 5. Hanya item "Sudah Datang" yang dikirimkan. Sisa barang akan ditinggal, dan status SPK <span className="font-mono font-bold text-slate-900">{selMR.work_order_ref || "NP"}</span> otomatis berubah menjadi <span className="bg-rose-100 text-rose-800 font-mono font-black px-1.5 py-0.5 rounded">INCOMPLETE</span>.
                          </div>
                        </div>
                      )}

                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {dispatchItems.map((itm, idx) => {
                          const isSent = itm.qty_dispatched > 0;
                          return (
                            <div key={idx} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                              <div className="flex-1">
                                <strong className={`block font-bold ${isSent ? "text-slate-900" : "text-slate-400 line-through font-medium"}`}>
                                  {itm.spare_part_name}
                                </strong>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span className="text-slate-400 font-mono text-[10px]">Part No: {itm.part_number} &bull; Unit: {itm.unit || "PCS"}</span>
                                  {itm.qty_requested > 0 && !isSent && (
                                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.1 rounded font-bold text-[8.5px] uppercase">
                                      Tidak Dikirim
                                    </span>
                                  )}
                                  {isSent && (
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.1 rounded font-bold text-[8.5px] uppercase">
                                      Siap Dikirim
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-right">
                                <div className="font-mono text-center bg-slate-50 border border-slate-150 p-1.5 rounded min-w-[90px]">
                                  <span className="text-slate-400 text-[8px] block uppercase font-bold leading-none mb-1">QTY Kirim</span>
                                  <strong className={`font-extrabold text-xs ${isSent ? "text-blue-700" : "text-slate-450"}`}>
                                    {itm.qty_dispatched} / {itm.qty_requested} {itm.unit || "PCS"}
                                  </strong>
                                </div>

                                {/* INPUT HARGA SATUAN (HARGA STN) */}
                                <div className="w-36 text-left">
                                  <label className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Harga Stn (IDR)</label>
                                  <div className="relative">
                                    <span className="absolute left-1.5 top-1.5 text-[10px] text-slate-400 font-bold font-sans">Rp</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={itm.unit_price}
                                      onChange={(e) => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        setDispatchItems(prev => prev.map((item, i) => i === idx ? { ...item, unit_price: val } : item));
                                      }}
                                      className="w-full bg-slate-50 border border-slate-250 rounded p-1 pl-6 text-xs font-bold font-mono text-right text-slate-800 focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 hover:bg-slate-100 text-slate-700 font-bold uppercase rounded text-xs cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    isLoading || 
                    (dispatchSource === "tug5" && !selectedTug5Id) || 
                    (dispatchSource === "tug10" && (!selectedTug10Id || !targetVesselName.trim()))
                  }
                  className={`px-5 py-2.5 rounded text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    isLoading || 
                    (dispatchSource === "tug5" && !selectedTug5Id) || 
                    (dispatchSource === "tug10" && (!selectedTug10Id || !targetVesselName.trim()))
                      ? "bg-slate-300 border-slate-300 cursor-not-allowed text-slate-500"
                      : dispatchSource === "tug10"
                        ? "bg-emerald-600 hover:bg-emerald-500 border border-emerald-700"
                        : "bg-blue-600 hover:bg-blue-500 border border-blue-700"
                  }`}
                >
                  {isLoading ? "Memproses..." : dispatchSource === "tug10" ? "Proses Transfer Antar Kapal" : "Simpan & Kirim Cargo"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
