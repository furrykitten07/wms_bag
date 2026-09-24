/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  FileText, 
  PlusCircle, 
  Trash2, 
  Save, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Printer, 
  Download, 
  Eye, 
  Search, 
  Filter, 
  ChevronRight, 
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  User, 
  Anchor, 
  MapPin, 
  FileSpreadsheet, 
  History, 
  AlertTriangle,
  ArrowLeft,
  X,
  ChevronDown,
  Edit3,
  Archive,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal
} from "lucide-react";
import { 
  User as UserType, 
  UserRole, 
  SparePart, 
  MaterialRequest, 
  MaterialRequestItem, 
  MaterialRequestStatus,
  SPKWorkOrder,
  DigitalSignature,
  InboundReceiving,
  ReceivingStatus
} from "../types.js";
import BatchPrintZipModal from "./BatchPrintZipModal.js";

const ALDI_SIGNATURE_URL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="70" viewBox="0 0 220 70"><path d="M 20 42 C 45 15, 60 55, 90 28 C 110 15, 130 52, 160 32 C 180 22, 190 48, 200 40" stroke="%230f2b5c" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M 35 52 L 185 48" stroke="%231e293b" stroke-width="1.8" fill="none" stroke-linecap="round"/><text x="75" y="62" font-family="cursive" font-size="11" font-weight="bold" fill="%230f2b5c">Aldi Hidayat</text></svg>`;
const ALFIN_SIGNATURE_URL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="70" viewBox="0 0 220 70"><path d="M 15 42 C 35 15, 50 58, 80 25 C 100 12, 120 52, 150 30 C 170 20, 185 45, 205 35" stroke="%230f2b5c" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M 30 50 L 180 46" stroke="%231e293b" stroke-width="1.8" fill="none" stroke-linecap="round"/><text x="45" y="62" font-family="cursive" font-size="11" font-weight="bold" fill="%230f2b5c">Maghfur M. Alfin</text></svg>`;

interface MaterialRequestViewProps {
  requests: MaterialRequest[];
  parts: SparePart[];
  currentUser: UserType;
  onCreateRequest: (request: Partial<MaterialRequest>) => Promise<void>;
  onCreateRequestBatch: (requests: Partial<MaterialRequest>[]) => Promise<void>;
  onUpdateRequest: (id: string, request: Partial<MaterialRequest>) => Promise<void>;
  onDeleteRequest: (id: string) => Promise<void>;
  onLogMRAction: (id: string, action: "Printed" | "Downloaded") => Promise<void>;
  onPreviewTUG5: (request: MaterialRequest) => void;
  spkList?: SPKWorkOrder[];
  receivingList?: InboundReceiving[];
  autoOpenMRId?: string | null;
  onClearAutoOpenMRId?: () => void;
  signatures?: DigitalSignature[];
}

export default function MaterialRequestView({
  requests,
  parts,
  currentUser,
  onCreateRequest,
  onCreateRequestBatch,
  onUpdateRequest,
  onDeleteRequest,
  onLogMRAction,
  onPreviewTUG5,
  spkList = [],
  receivingList = [],
  autoOpenMRId,
  onClearAutoOpenMRId,
  signatures = []
}: MaterialRequestViewProps) {
  const [selectedMRId, setSelectedMRId] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isBatchZipModalOpen, setIsBatchZipModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  React.useEffect(() => {
    if (autoOpenMRId) {
      const target = requests.find(
        r => r.id === autoOpenMRId || r.request_number === autoOpenMRId || r.tug5_number === autoOpenMRId
      );
      if (target) {
        setSelectedMRId(target.id);
        setIsDetailsOpen(true);
        if (onClearAutoOpenMRId) {
          onClearAutoOpenMRId();
        }
      }
    }
  }, [autoOpenMRId, requests]);

  // TUG 5 (Material Requests) Pagination states
  const [tugPage, setTugPage] = useState(1);
  const [tugPerPage, setTugPerPage] = useState<number>(10);

  // Selected request IDs state for Bulk Delete Checklist
  const [selectedMRIds, setSelectedMRIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  React.useEffect(() => {
    setTugPage(1);
    setSelectedMRIds([]);
  }, [searchQuery, statusFilter]);

  // Create form state
  const [requestDate, setRequestDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [vesselName, setVesselName] = useState<string>(currentUser.vesselName || "MV. KARTINI BARUNA");
  const [warehouseName, setWarehouseName] = useState<string>("Gudang Merak");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [workOrderRef, setWorkOrderRef] = useState<string>("");
  const [accountCode, setAccountCode] = useState<string>("BPP");
  const [functionCode, setFunctionCode] = useState<string>("ARMADA");
  const [remarks, setRemarks] = useState<string>("");
  const [formItems, setFormItems] = useState<Partial<MaterialRequestItem>[]>([]);

  // Selected item selector lists
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemUsage, setItemUsage] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState<string>("");

  const activeMR = requests.find(r => r.id === selectedMRId) || null;

  const uLower = (currentUser.username || "").toLowerCase();
  const rLower = (currentUser.role || "").toLowerCase();

  const isAldiRole = uLower.includes("aldi") || rLower.includes("petugas") || rLower.includes("staff") || rLower.includes("gudang") || uLower.includes("superadmin") || rLower.includes("super");
  const isAlfinRole = uLower.includes("alfin") || rLower.includes("kepala") || uLower.includes("superadmin") || rLower.includes("super");
  const isEmirRole = uLower.includes("emir") || rLower.includes("manager") || rLower.includes("logistik") || uLower.includes("superadmin") || rLower.includes("super");
  const isSumbonoRole = uLower.includes("sumbono") || rLower.includes("vp") || rLower.includes("rendalhar") || uLower.includes("superadmin") || rLower.includes("super");

  const resetForm = () => {
    setRequestDate(new Date().toISOString().split("T")[0]);
    setVesselName(currentUser.vesselName || "MV. KARTINI BARUNA");
    setWarehouseName("Gudang Merak");
    setDeliveryAddress("");
    setWorkOrderRef("");
    setAccountCode("BPP");
    setFunctionCode("ARMADA");
    setRemarks("");
    setFormItems([]);
    setSelectedPartId("");
    setItemQty(1);
    setItemUsage(1);
    setItemNotes("");
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncConfirmation, setShowSyncConfirmation] = useState(false);
  const [pendingSyncList, setPendingSyncList] = useState<SPKWorkOrder[]>([]);
  const [selectedSyncIds, setSelectedSyncIds] = useState<string[]>([]);

  // Helper to resolve Inbound Receiving & Partial completeness info for a TUG 5 document
  const getInboundInfoForMR = (mr: Partial<MaterialRequest> | MaterialRequest) => {
    const spkRef = mr.work_order_ref || mr.spk_number;
    const match = receivingList.find(r => 
      (spkRef && r.spk_number === spkRef) ||
      (mr.receiving_ref_id && r.id === mr.receiving_ref_id)
    );

    if (!match) {
      return {
        hasInbound: false,
        receivingRecord: null,
        status: mr.receiving_status || "BELUM_INBOUND",
        isPartial: mr.is_partial || false,
        incompleteItems: mr.incomplete_items_summary || "",
        completionDate: mr.completion_date || null,
        auditLogs: [] as any[]
      };
    }

    const isPartial = match.status === ReceivingStatus.PARTIAL_REJECT || 
                      match.status === ReceivingStatus.FULL_REJECT || 
                      (match.status as string) === "PARTIAL_REJECT" || 
                      (match.status as string) === "FULL_REJECT" || 
                      match.items.some(i => {
                        const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
                        const st = i.status || i.qc_status;
                        return i.qty_received < targetQty || st === "PARTIAL" || st === "REJECTED" || st === "Rejected";
                      });

    const isComplete = match.status === ReceivingStatus.ACCEPTED || 
                       match.status === ReceivingStatus.VERIFIED || 
                       (match.status as string) === "ACCEPTED" || 
                       (match.status as string) === "VERIFIED";

    const incompleteItemsList = match.items
      .filter(i => {
        const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
        const st = i.status || i.qc_status;
        return i.qty_received < targetQty || st === "REJECTED" || st === "Rejected" || st === "PARTIAL";
      })
      .map(i => {
        const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
        const diff = targetQty - i.qty_received;
        const noteStr = i.keeper_notes ? ` (${i.keeper_notes})` : "";
        const name = i.part_name || i.spare_part_name;
        return `${name}: SPK ${targetQty} ${i.unit || 'PCS'} → Diterima ${i.qty_received} ${i.unit || 'PCS'} (Selisih: ${diff} ${i.unit || 'PCS'}${noteStr})`;
      });
    
    const incompleteItemsSummary = incompleteItemsList.join(" | ") || (isPartial ? "Beberapa barang dalam status parsial / belum lengkap." : "");

    let completionDate = mr.completion_date || null;
    if (isComplete && match.verified_at) {
      completionDate = match.verified_at;
    } else if (isComplete && match.completion_date) {
      completionDate = match.completion_date;
    } else if (isComplete && !completionDate) {
      completionDate = match.created_at || new Date().toISOString();
    }

    return {
      hasInbound: true,
      receivingRecord: match,
      status: match.status,
      isPartial,
      incompleteItems: incompleteItemsSummary,
      completionDate: isComplete ? completionDate : null,
      auditLogs: match.audit_logs || []
    };
  };

  const handleSyncSPK = () => {
    const unmatchedSPKs = spkList.filter(spk => {
      return !requests.some(req => req.work_order_ref === spk.spk_number);
    });

    if (unmatchedSPKs.length === 0) {
      alert(`Seluruh daftar SPK (${spkList.length} SPK) sudah tersinkronisasi sempurna dengan TUG 5 (Permintaan Barang) di sistem!`);
      return;
    }

    setPendingSyncList(unmatchedSPKs);
    setSelectedSyncIds(unmatchedSPKs.map(s => s.id));
    setShowSyncConfirmation(true);
  };

  const executeBatchSync = async () => {
    if (isSyncing) return;
    const toSync = pendingSyncList.filter(spk => selectedSyncIds.includes(spk.id));
    if (toSync.length === 0) {
      alert("Harap pilih setidaknya satu SPK yang ingin disinkronkan!");
      return;
    }

    setIsSyncing(true);
    try {
      const payloads: Partial<MaterialRequest>[] = toSync.map(spk => {
        const allItems: any[] = [];
        
        spk.vessels.forEach(vessel => {
          vessel.items.forEach(itm => {
            const matchedPart = parts.find(p => p.id === itm.spare_part_id || p.part_number === itm.part_number);
            allItems.push({
              spare_part_id: matchedPart?.id || itm.spare_part_id,
              spare_part_name: matchedPart?.part_name || itm.spare_part_name,
              part_number: matchedPart?.part_number || itm.part_number,
              unit: matchedPart?.unit || itm.unit || "PCS",
              avg_monthly_usage: 1,
              remaining_stock: matchedPart?.current_stock || 0,
              requested_qty: itm.qty_to_pick,
              notes: `Sinkronisasi Otomatis SPK - Kapal: ${vessel.vessel_name}`
            });
          });
        });

        const primaryVessel = spk.vessels[0]?.vessel_name || "MV. KARTINI BARUNA";
        const cargoAddress = `Pelabuhan Target: ${spk.target_port || "Pelabuhan Merak Mas, Cilegon"}`;

        const matchedInbound = receivingList.find(r => r.spk_number === spk.spk_number);
        let inboundStatus: string | undefined = undefined;
        let isPartial: boolean | undefined = undefined;
        let incompleteSummary: string | undefined = undefined;
        let completionDate: string | undefined = undefined;
        let receivingRefId: string | undefined = undefined;

        if (matchedInbound) {
          receivingRefId = matchedInbound.id;
          inboundStatus = matchedInbound.status;
          isPartial = matchedInbound.status === ReceivingStatus.PARTIAL_REJECT || 
                      matchedInbound.status === ReceivingStatus.FULL_REJECT || 
                      (matchedInbound.status as string) === "PARTIAL_REJECT" || 
                      (matchedInbound.status as string) === "FULL_REJECT" || 
                      matchedInbound.items.some(i => {
                        const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
                        const st = i.status || i.qc_status;
                        return i.qty_received < targetQty || st === "PARTIAL" || st === "REJECTED" || st === "Rejected";
                      });
          const incList = matchedInbound.items
            .filter(i => {
              const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
              const st = i.status || i.qc_status;
              return i.qty_received < targetQty || st === "REJECTED" || st === "Rejected" || st === "PARTIAL";
            })
            .map(i => {
              const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
              const name = i.part_name || i.spare_part_name;
              return `${name}: SPK ${targetQty} → Diterima ${i.qty_received} (Kurang ${targetQty - i.qty_received}${i.keeper_notes ? ` - ${i.keeper_notes}` : ""})`;
            });
          incompleteSummary = incList.join(" | ");
          const isComplete = matchedInbound.status === ReceivingStatus.ACCEPTED || 
                             matchedInbound.status === ReceivingStatus.VERIFIED || 
                             (matchedInbound.status as string) === "ACCEPTED" || 
                             (matchedInbound.status as string) === "VERIFIED";
          if (isComplete && !isPartial) {
            completionDate = matchedInbound.verified_at || matchedInbound.completion_date || matchedInbound.created_at;
          }
        }

        return {
          request_date: new Date(spk.created_at).toISOString().split("T")[0],
          requester_name: spk.created_by || "Crew User",
          vessel_name: primaryVessel,
          warehouse_name: "Gudang Merak",
          delivery_address: cargoAddress,
          work_order_ref: spk.spk_number,
          account_code: "BPP", // Default account code
          function_code: "ARMADA",  // Default function code
          remarks: `SINKRONISASI OTOMATIS REGISTER SPK: ${spk.spk_number} (Dari Register Eksternal)`,
          status: "Draft" as const, // Start as Draft
          items: allItems,
          receiving_ref_id: receivingRefId,
          receiving_status: inboundStatus,
          is_partial: isPartial,
          incomplete_items_summary: incompleteSummary,
          completion_date: completionDate
        };
      });

      await onCreateRequestBatch(payloads);
      setShowSyncConfirmation(false);
      setPendingSyncList([]);
      setSelectedSyncIds([]);
      alert(`Sinkronisasi sukses! ${payloads.length} dokumen TUG 5 (Permintaan Barang) telah disinkronkan dengan status DRAFT. Harap setujui dengan akun Staff Gudang.`);
    } catch (err: any) {
      console.error(err);
      alert("Gagal melakukan sinkronisasi otomatis: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStartCreate = () => {
    resetForm();
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleStartEdit = (mr: MaterialRequest) => {
    setRequestDate(mr.request_date);
    setVesselName(mr.vessel_name);
    setWarehouseName(mr.warehouse_name || "Gudang Merak");
    setDeliveryAddress(mr.delivery_address || "");
    setWorkOrderRef(mr.work_order_ref || "");
    setAccountCode(mr.account_code || "BPP");
    setFunctionCode(mr.function_code || "ARMADA");
    setRemarks(mr.remarks || "");
    setFormItems(mr.items.map(itm => ({ ...itm })));
    setIsCreating(false);
    setIsEditing(true);
  };

  const handleAddFormItem = () => {
    if (!selectedPartId) return;
    const part = parts.find(p => p.id === selectedPartId);
    if (!part) return;

    // Check if item already exists in list
    if (formItems.some(itm => itm.spare_part_id === part.id)) {
      alert("Part ini sudah dimasukkan ke daftar!");
      return;
    }

    const newItem: Partial<MaterialRequestItem> = {
      spare_part_id: part.id,
      spare_part_name: part.part_name,
      part_number: part.part_number,
      unit: part.unit,
      avg_monthly_usage: itemUsage,
      remaining_stock: part.current_stock,
      requested_qty: itemQty,
      notes: itemNotes
    };

    setFormItems([...formItems, newItem]);
    setSelectedPartId("");
    setItemQty(1);
    setItemUsage(1);
    setItemNotes("");
  };

  const handleRemoveFormItem = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const handleUpdateFormItemStatus = (idx: number, status: "Arrived" | "Pending" | "Returned") => {
    const updated = [...formItems];
    updated[idx].item_status = status;
    if (status === "Pending") {
      updated[idx].notes = "Barang belum datang";
    } else if (status === "Returned") {
      updated[idx].notes = "Barang diretur";
    } else {
      updated[idx].notes = "";
    }
    setFormItems(updated);
  };

  const handleUpdateFormItemNotes = (idx: number, notesText: string) => {
    const updated = [...formItems];
    updated[idx].notes = notesText;
    setFormItems(updated);
  };

  const handleSaveRequest = async (status: MaterialRequestStatus) => {
    if (formItems.length === 0) {
      alert("Harap masukkan setidaknya 1 item kargo yang diminta.");
      return;
    }

    const matchedInbound = receivingList.find(r => r.spk_number === workOrderRef);
    let receiving_ref_id = activeMR?.receiving_ref_id;
    let receiving_status = activeMR?.receiving_status;
    let is_partial = activeMR?.is_partial;
    let incomplete_items_summary = activeMR?.incomplete_items_summary;
    let completion_date = activeMR?.completion_date;

    if (matchedInbound) {
      receiving_ref_id = matchedInbound.id;
      receiving_status = matchedInbound.status;
      is_partial = matchedInbound.status === ReceivingStatus.PARTIAL_REJECT || 
                  matchedInbound.status === ReceivingStatus.FULL_REJECT || 
                  (matchedInbound.status as string) === "PARTIAL_REJECT" || 
                  (matchedInbound.status as string) === "FULL_REJECT" || 
                  matchedInbound.items.some(i => {
                    const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
                    const st = i.status || i.qc_status;
                    return i.qty_received < targetQty || st === "PARTIAL" || st === "REJECTED" || st === "Rejected";
                  });
      const incList = matchedInbound.items
        .filter(i => {
          const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
          const st = i.status || i.qc_status;
          return i.qty_received < targetQty || st === "REJECTED" || st === "Rejected" || st === "PARTIAL";
        })
        .map(i => {
          const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
          const name = i.part_name || i.spare_part_name;
          return `${name}: SPK ${targetQty} → Diterima ${i.qty_received} (Kurang ${targetQty - i.qty_received}${i.keeper_notes ? ` - ${i.keeper_notes}` : ""})`;
        });
      incomplete_items_summary = incList.join(" | ");
      const isComplete = matchedInbound.status === ReceivingStatus.ACCEPTED || 
                         matchedInbound.status === ReceivingStatus.VERIFIED || 
                         (matchedInbound.status as string) === "ACCEPTED" || 
                         (matchedInbound.status as string) === "VERIFIED";
      if (isComplete && !is_partial) {
        completion_date = matchedInbound.verified_at || matchedInbound.completion_date || matchedInbound.created_at;
      }
    }

    const reqData = {
      request_date: requestDate,
      requester_name: currentUser.name,
      vessel_name: vesselName,
      warehouse_name: warehouseName,
      delivery_address: deliveryAddress,
      work_order_ref: workOrderRef,
      account_code: accountCode,
      function_code: functionCode,
      remarks,
      status,
      items: formItems as MaterialRequestItem[],
      receiving_ref_id,
      receiving_status,
      is_partial,
      incomplete_items_summary,
      completion_date
    };

    try {
      if (isCreating) {
        await onCreateRequest(reqData);
      } else if (isEditing && activeMR) {
        await onUpdateRequest(activeMR.id, reqData);
      }
      setIsCreating(false);
      setIsEditing(false);
      setIsDetailsOpen(false);
      resetForm();
    } catch (err: any) {
      alert("Error saving: " + err.message);
    }
  };

  const handleApprove = async () => {
    if (!activeMR) return;
    if (confirm(`Approve Material Request ${activeMR.request_number} & generate TUG 5?`)) {
      await onUpdateRequest(activeMR.id, { status: "Approved" });
      setIsDetailsOpen(false);
    }
  };

  const handleMarkProcessed = async () => {
    if (!activeMR) return;
    if (confirm(`Tandai request ${activeMR.request_number} ini telah diproses (Dispatched / Dikirim)?`)) {
      await onUpdateRequest(activeMR.id, { status: "Processed" });
      setIsDetailsOpen(false);
    }
  };

  const handleViewDetails = (mr: MaterialRequest) => {
    setSelectedMRId(mr.id);
    setIsDetailsOpen(true);
  };

  const handleEditClick = (mr: MaterialRequest) => {
    setSelectedMRId(mr.id);
    setRequestDate(mr.request_date || new Date().toISOString().split("T")[0]);
    setVesselName(mr.vessel_name || currentUser.vesselName || "MV. KARTINI BARUNA");
    setWarehouseName(mr.warehouse_name || "Gudang Merak");
    setDeliveryAddress(mr.delivery_address || "");
    setWorkOrderRef(mr.work_order_ref || "");
    setAccountCode(mr.account_code || "BPP");
    setFunctionCode(mr.function_code || "ARMADA");
    setRemarks(mr.remarks || "");
    setFormItems(mr.items || []);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleSubmitClick = async (mr: MaterialRequest) => {
    if (currentUser.role === UserRole.WAREHOUSE_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) {
      if (confirm(`Approve Draft TUG 5 ${mr.request_number} (Status -> Submitted)?`)) {
        await onUpdateRequest(mr.id, { status: "Submitted" });
      }
    } else {
      alert(`Permintaan TUG 5 ${mr.request_number} telah diajukan ke Staff Gudang untuk diverifikasi!`);
    }
  };

  // Filter requests
  const filteredRequests = (requests || []).filter(mr => {
    if (!mr) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      if (statusFilter === "All") return true;
      return mr.status === statusFilter;
    }

    const reqNum = mr.request_number || "";
    const vesName = mr.vessel_name || "";

    const matchesHeader = 
      reqNum.toLowerCase().includes(q) ||
      (mr.tug5_number && mr.tug5_number.toLowerCase().includes(q)) ||
      (mr.tug6_number && mr.tug6_number.toLowerCase().includes(q)) ||
      (mr.tug_number && mr.tug_number.toLowerCase().includes(q)) ||
      (mr.spk_number && mr.spk_number.toLowerCase().includes(q)) ||
      (mr.spk_id && mr.spk_id.toLowerCase().includes(q)) ||
      vesName.toLowerCase().includes(q) ||
      (mr.requester_name && mr.requester_name.toLowerCase().includes(q)) ||
      (mr.requested_by && mr.requested_by.toLowerCase().includes(q)) ||
      (mr.created_by && mr.created_by.toLowerCase().includes(q)) ||
      (mr.work_order_ref && mr.work_order_ref.toLowerCase().includes(q)) ||
      (mr.remarks && mr.remarks.toLowerCase().includes(q)) ||
      (mr.notes && mr.notes.toLowerCase().includes(q));

    const matchesItems = mr.items && mr.items.some(item => 
      (item.spare_part_name && item.spare_part_name.toLowerCase().includes(q)) ||
      (item.part_number && item.part_number.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q))
    );

    const matchesSearch = matchesHeader || matchesItems;
    
    if (statusFilter === "All") return matchesSearch;
    return mr.status === statusFilter && matchesSearch;
  });

  const unmatchedCount = spkList.filter(spk => !requests.some(req => req.work_order_ref === spk.spk_number)).length;

  // Computed TUG 5 pagination values
  const tugTotalPages = Math.ceil(filteredRequests.length / tugPerPage);
  const paginatedRequests = filteredRequests.slice((tugPage - 1) * tugPerPage, tugPage * tugPerPage);

  const isAllPageSelected = paginatedRequests.length > 0 && paginatedRequests.every(r => selectedMRIds.includes(r.id));
  const isSomePageSelected = paginatedRequests.some(r => selectedMRIds.includes(r.id));

  const handleSelectAllPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedRequests.map(r => r.id);
      const combined = Array.from(new Set([...selectedMRIds, ...pageIds]));
      setSelectedMRIds(combined);
    } else {
      const pageIds = new Set(paginatedRequests.map(r => r.id));
      setSelectedMRIds(selectedMRIds.filter(id => !pageIds.has(id)));
    }
  };

  const handleToggleSelectRow = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedMRIds(prev => [...prev, id]);
    } else {
      setSelectedMRIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMRIds.length === 0) return;
    const confirmMsg = `Apakah Anda yakin ingin menghapus ${selectedMRIds.length} dokumen TUG 5 yang dichecklist?`;
    if (!confirm(confirmMsg)) return;

    setIsBulkDeleting(true);
    const totalToDelete = selectedMRIds.length;
    try {
      for (const id of selectedMRIds) {
        await onDeleteRequest(id);
      }
      if (selectedMRId && selectedMRIds.includes(selectedMRId)) {
        setSelectedMRId(null);
      }
      setSelectedMRIds([]);
      alert(`Berhasil menghapus ${totalToDelete} dokumen TUG 5.`);
    } catch (err: any) {
      console.error("Bulk delete error:", err);
      alert("Terjadi kesalahan saat menghapus dokumen TUG 5.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const renderApprovalStatus = (mr: MaterialRequest) => {
    const signedCount = (mr.aldi_signed ? 1 : 0) + (mr.alfin_signed ? 1 : 0) + (mr.emir_signed ? 1 : 0) + (mr.sumbono_signed ? 1 : 0);
    const isFullyApproved = signedCount === 4;

    return (
      <div className="flex flex-col items-center gap-1.5 min-w-[150px]">
        {/* Status Pill Badge */}
        {isFullyApproved ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Disetujui Penuh (4/4)</span>
          </span>
        ) : signedCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            <Clock className="w-3 h-3 text-blue-500 animate-spin-slow" />
            <span>Disetujui ({signedCount}/4)</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>Menunggu TTD (0/4)</span>
          </span>
        )}

        {/* Mini 4-Role Signer Chips */}
        <div className="flex items-center gap-1">
          <span 
            title={mr.aldi_signed ? "Petugas Gudang (Aldi Hidayat): Sudah TTD" : "Petugas Gudang (Aldi Hidayat): Belum TTD"} 
            className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold border transition-colors ${
              mr.aldi_signed ? "bg-teal-50 text-teal-700 border-teal-300 font-extrabold" : "bg-slate-50 text-slate-400 border-slate-200 line-through opacity-70"
            }`}
          >
            {mr.aldi_signed ? "✓ Aldi" : "Aldi"}
          </span>
          <span 
            title={mr.alfin_signed ? "Kepala Gudang (Alfin): Sudah TTD" : "Kepala Gudang (Alfin): Belum TTD"} 
            className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold border transition-colors ${
              mr.alfin_signed ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-extrabold" : "bg-slate-50 text-slate-400 border-slate-200 line-through opacity-70"
            }`}
          >
            {mr.alfin_signed ? "✓ Alfin" : "Alfin"}
          </span>
          <span 
            title={mr.emir_signed ? "Manager Logistik (Emir): Sudah TTD" : "Manager Logistik (Emir): Belum TTD"} 
            className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold border transition-colors ${
              mr.emir_signed ? "bg-amber-50 text-amber-800 border-amber-300 font-extrabold" : "bg-slate-50 text-slate-400 border-slate-200 line-through opacity-70"
            }`}
          >
            {mr.emir_signed ? "✓ Emir" : "Emir"}
          </span>
          <span 
            title={mr.sumbono_signed ? "VP Rendalhar (Sumbono): Sudah TTD" : "VP Rendalhar (Sumbono): Belum TTD"} 
            className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold border transition-colors ${
              mr.sumbono_signed ? "bg-indigo-50 text-indigo-700 border-indigo-300 font-extrabold" : "bg-slate-50 text-slate-400 border-slate-200 line-through opacity-70"
            }`}
          >
            {mr.sumbono_signed ? "✓ Sumbono" : "Sumbono"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 border-l border-slate-200">
      
      {/* 1. VIEW HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div>
          <h1 className="text-base font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Daftar Permintaan Barang-Barang (Material Umum)
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans font-medium">
            Sistem pengajuan logistik kapal PT. Pelayaran Bahtera Adhiguna. Ajukan, setujui, dan unduh form cetak TUG 5 resmi.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
          <button
            onClick={() => setIsBatchZipModalOpen(true)}
            className="px-4 py-3 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold text-xs uppercase rounded-lg flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Archive className="w-4 h-4 text-blue-600" />
            <span>Export ZIP Batch TUG 5</span>
          </button>

          <button
            onClick={handleSyncSPK}
            disabled={isSyncing}
            className={`px-4 py-3 font-bold text-xs uppercase rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm border cursor-pointer text-center relative ${
              isSyncing
                ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                : unmatchedCount > 0
                ? "bg-blue-600 hover:bg-blue-500 border-blue-600 text-white animate-pulse-subtle"
                : "bg-white hover:bg-slate-50 border-slate-250 text-slate-700"
            }`}
          >
            <span>⚡ Sinkronisasi Register SPK</span>
            {unmatchedCount > 0 && (
              <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                {unmatchedCount} BARU
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTER PANEL */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Cari nomor request, kapal penerima, WO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-250 text-slate-800 p-2.5 pl-9 text-xs rounded-lg outline-none focus:border-emerald-600 focus:bg-white placeholder:text-slate-450 font-sans font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end font-mono text-[11px] font-bold">
          <span className="text-slate-450 uppercase tracking-wider flex items-center gap-1.5 mr-1 text-[10px] font-extrabold">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> STATUS FILTER TUG 5:
          </span>
          <div className="flex gap-2">
            {["All", "Draft", "Submitted", "Approved", "Rejected", "Processed"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-2 rounded-lg border uppercase transition-all duration-150 cursor-pointer text-[10px] font-black ${
                  statusFilter === st 
                    ? "bg-slate-900 border-slate-900 text-white shadow-xs" 
                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. CORE FLAT TABLE DISPLAY */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        
        {/* Bulk Delete Action Bar */}
        {selectedMRIds.length > 0 && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between shadow-xs sticky top-0 z-20">
            <div className="flex items-center gap-2 font-mono text-xs text-rose-900 font-extrabold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Terpilih <span className="bg-rose-200 text-rose-950 px-2 py-0.5 rounded font-black">{selectedMRIds.length}</span> Dokumen TUG 5</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setSelectedMRIds([])}
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
                <span>{isBulkDeleting ? "Menghapus..." : `Hapus (${selectedMRIds.length}) Terpilih`}</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 text-slate-700 text-[10px] font-mono uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                <th className="py-4 px-4 font-black w-12 text-center bg-slate-50">
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
                <th className="py-4 px-6 font-black w-16 text-center">NO</th>
                <th className="py-4 px-6 font-semibold">No. Request</th>
                <th className="py-4 px-6 font-semibold">Tanggal Pengajuan</th>
                <th className="py-4 px-6 font-semibold">Kapal Penerima</th>
                <th className="py-4 px-6 font-semibold">Pemohon (Chief Eng.)</th>
                <th className="py-4 px-6 font-semibold text-center">Status Inbound</th>
                <th className="py-4 px-6 font-semibold text-center">Kuantitas Item</th>
                <th className="py-4 px-6 font-semibold">Work Order No.</th>
                <th className="py-4 px-6 font-semibold">Status Approval</th>
                <th className="py-4 px-6 font-semibold text-right no-print w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400 font-mono text-[11px]">
                    Tidak ada dokumen permintaan barang TUG 5 yang terekam.
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((mr, idx) => {
                  const dateStr = mr.request_date ? new Date(mr.request_date).toLocaleDateString("id-ID", { 
                    day: "numeric", 
                    month: "long", 
                    year: "numeric" 
                  }) : "-";
                  const isSelected = selectedMRIds.includes(mr.id);
                  const inboundInfo = getInboundInfoForMR(mr);
                  return (
                    <tr 
                      key={mr.id} 
                      className={`transition-colors ${
                        isSelected ? "bg-rose-50/60" : "hover:bg-slate-50/70"
                      }`}
                    >
                      <td className="py-4.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer accent-indigo-600"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectRow(mr.id, e)}
                        />
                      </td>
                      <td className="py-4.5 px-6 text-center font-mono text-slate-400 font-bold">{(tugPage - 1) * tugPerPage + idx + 1}</td>
                      <td 
                        onClick={() => handleViewDetails(mr)}
                        className="py-4.5 px-6 font-mono font-black text-emerald-600 hover:underline cursor-pointer"
                      >
                        {mr.request_number}
                      </td>
                      <td className="py-4.5 px-6 text-slate-650 font-medium">{dateStr}</td>
                      <td className="py-4.5 px-6 text-slate-900 font-bold font-sans">{mr.vessel_name}</td>
                      <td className="py-4.5 px-6 text-slate-700 font-semibold">{mr.requester_name}</td>
                      <td className="py-4.5 px-6 text-center">
                        {inboundInfo.hasInbound ? (
                          inboundInfo.isPartial ? (
                            <div className="flex flex-col items-center gap-0.5" title={inboundInfo.incompleteItems}>
                              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 w-fit shadow-2xs">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                ⚠️ Parsial (Selisih)
                              </span>
                              <span className="text-[9px] text-amber-700 font-sans font-medium line-clamp-1 max-w-[150px]">
                                {inboundInfo.incompleteItems}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 w-fit shadow-2xs">
                                <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                                ✓ Lengkap
                              </span>
                              {inboundInfo.completionDate && (
                                <span className="text-[9px] text-emerald-700 font-mono font-bold">
                                  Fix: {new Date(inboundInfo.completionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                </span>
                              )}
                            </div>
                          )
                        ) : (
                          <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider w-fit inline-block">
                            ⚪ Belum Inbound
                          </span>
                        )}
                      </td>
                      <td className="py-4.5 px-6 text-center font-mono font-bold">
                        <span className="bg-slate-50 px-3 py-1.5 rounded border border-slate-205 text-slate-700 text-[10px]">
                          {(mr.items || []).length} Suku Cadang
                        </span>
                      </td>
                      <td className="py-4.5 px-6 font-mono text-rose-600 font-bold text-[11.5px]">{mr.work_order_ref || "-"}</td>
                      <td className="py-4.5 px-6">{renderApprovalStatus(mr)}</td>
                      <td className="py-4.5 px-6 text-right no-print relative">
                        <div className="flex items-center justify-end">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionId(activeActionId === mr.id ? null : mr.id);
                              }}
                              className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-sans font-bold transition-all duration-200 cursor-pointer shadow-xs active:scale-95 border ${
                                activeActionId === mr.id
                                  ? "bg-blue-600 border-blue-600 text-white shadow-md ring-2 ring-blue-500/20"
                                  : "bg-white border-slate-300 hover:border-slate-400 text-slate-800 hover:bg-slate-50 hover:shadow"
                              }`}
                            >
                              <SlidersHorizontal className={`w-3.5 h-3.5 ${activeActionId === mr.id ? "text-white" : "text-blue-600"}`} />
                              <span>Actions</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeActionId === mr.id ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                            </button>

                            {activeActionId === mr.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionId(null);
                                  }}
                                />
                                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-left p-1.5 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5 divide-y divide-slate-100 text-slate-700">
                                  
                                  {/* Header Info */}
                                  <div className="px-3.5 py-2.5 bg-slate-50/80 rounded-xl mb-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">TUG 5 Document</span>
                                      <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">{mr.status}</span>
                                    </div>
                                    <div className="font-mono text-xs font-black text-slate-800 truncate mt-0.5">{mr.request_number}</div>
                                    <div className="text-[10.5px] text-slate-500 font-medium truncate">{mr.vessel_name}</div>
                                  </div>

                                  {/* SECTION 1: PERSETUJUAN & TTD DIGITAL (4 ROLES) */}
                                  <div className="py-1.5 space-y-1">
                                    <div className="px-2 py-1 text-[9px] font-mono font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                      <span>Approval & Tanda Tangan</span>
                                    </div>

                                    {/* 1. ALDI HIDAYAT (PETUGAS GUDANG) */}
                                    {mr.aldi_signed ? (
                                      <div className="px-2.5 py-1.5 bg-emerald-50/80 border border-emerald-200/80 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                          <div>
                                            <div className="text-[11px] font-bold text-emerald-900 leading-tight">Aldi Hidayat</div>
                                            <div className="text-[9px] text-emerald-700 font-mono">Petugas Gudang &bull; Signed</div>
                                          </div>
                                        </div>
                                        <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">✓ ACC</span>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          const now = new Date().toISOString();
                                          await onUpdateRequest(mr.id, {
                                            aldi_signed: true,
                                            aldi_signed_at: now,
                                            aldi_signature_url: ALDI_SIGNATURE_URL,
                                            status: mr.status === "Draft" ? "Submitted" : mr.status
                                          });
                                        }}
                                        className="w-full px-2.5 py-2 text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg border border-teal-200 flex items-center justify-between cursor-pointer transition-colors text-left"
                                        title="Beri Tanda Tangan Digital Petugas Gudang (Aldi Hidayat)"
                                      >
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                                          <span>✓ TTD Petugas Gudang (Aldi)</span>
                                        </div>
                                        <span className="text-[9px] font-mono bg-teal-200 text-teal-900 px-1.5 py-0.5 rounded font-black">ACC</span>
                                      </button>
                                    )}

                                    {/* 2. MAGHFUR MUHAMMAD ALFIN (KEPALA GUDANG) */}
                                    {mr.alfin_signed ? (
                                      <div className="px-2.5 py-1.5 bg-emerald-50/80 border border-emerald-200/80 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                          <div>
                                            <div className="text-[11px] font-bold text-emerald-900 leading-tight">M. Alfin</div>
                                            <div className="text-[9px] text-emerald-700 font-mono">Kepala Gudang &bull; Signed</div>
                                          </div>
                                        </div>
                                        <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">✓ ACC</span>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          const now = new Date().toISOString();
                                          await onUpdateRequest(mr.id, {
                                            alfin_signed: true,
                                            alfin_signed_at: now,
                                            alfin_signature_url: ALFIN_SIGNATURE_URL,
                                            status: mr.status === "Draft" ? "Submitted" : mr.status
                                          });
                                        }}
                                        className="w-full px-2.5 py-2 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 flex items-center justify-between cursor-pointer transition-colors text-left"
                                        title="Beri Tanda Tangan Digital Kepala Gudang (Maghfur Muhammad Alfin)"
                                      >
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>✓ TTD Kepala Gudang (Alfin)</span>
                                        </div>
                                        <span className="text-[9px] font-mono bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-black">ACC</span>
                                      </button>
                                    )}

                                    {/* 3. MOHAMAT EMIR FERDIAN (MANAGER LOGISTIK) */}
                                    {mr.emir_signed ? (
                                      <div className="px-2.5 py-1.5 bg-emerald-50/80 border border-emerald-200/80 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                          <div>
                                            <div className="text-[11px] font-bold text-emerald-900 leading-tight">Emir Ferdian</div>
                                            <div className="text-[9px] text-emerald-700 font-mono">Manager Logistik &bull; Signed</div>
                                          </div>
                                        </div>
                                        <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">✓ ACC</span>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          const now = new Date().toISOString();
                                          await onUpdateRequest(mr.id, {
                                            emir_signed: true,
                                            emir_signed_at: now,
                                            emir_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=EmirFerdian"
                                          });
                                        }}
                                        className="w-full px-2.5 py-2 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-200 flex items-center justify-between cursor-pointer transition-colors text-left"
                                        title="Beri Tanda Tangan Digital Manager Logistik (Mohamat Emir Ferdian)"
                                      >
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="w-3.5 h-3.5 text-amber-600" />
                                          <span>✓ TTD Level 2 (Emir)</span>
                                        </div>
                                        <span className="text-[9px] font-mono bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-black">ACC</span>
                                      </button>
                                    )}

                                    {/* 4. SUMBONO (VP RENDALHAR) */}
                                    {mr.sumbono_signed ? (
                                      <div className="px-2.5 py-1.5 bg-emerald-50/80 border border-emerald-200/80 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                          <div>
                                            <div className="text-[11px] font-bold text-emerald-900 leading-tight">Sumbono</div>
                                            <div className="text-[9px] text-emerald-700 font-mono">VP Rendalhar &bull; Signed</div>
                                          </div>
                                        </div>
                                        <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">✓ ACC</span>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          const now = new Date().toISOString();
                                          await onUpdateRequest(mr.id, {
                                            sumbono_signed: true,
                                            sumbono_signed_at: now,
                                            sumbono_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=Sumbono",
                                            status: "Approved"
                                          });
                                        }}
                                        className="w-full px-2.5 py-2 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-lg border border-indigo-200 flex items-center justify-between cursor-pointer transition-colors text-left"
                                        title="Sahkan & Tanda Tangan Digital VP Rendalhar (Sumbono)"
                                      >
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                                          <span>✓ Sahkan & TTD (Sumbono)</span>
                                        </div>
                                        <span className="text-[9px] font-mono bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded font-black">ACC</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* SECTION 2: AKSI DOKUMEN & CETAK */}
                                  <div className="py-1.5 space-y-0.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveActionId(null);
                                        handleViewDetails(mr);
                                      }}
                                      className="w-full px-2.5 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors text-left"
                                    >
                                      <Eye className="w-4 h-4 text-blue-500 shrink-0" />
                                      <span>Detail / View Lengkap</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveActionId(null);
                                        onPreviewTUG5(mr);
                                      }}
                                      className="w-full px-2.5 py-2 text-xs font-bold hover:bg-emerald-50 text-emerald-800 rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors text-left"
                                    >
                                      <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <span>Cetak TUG 5 (PDF)</span>
                                    </button>

                                    {["Draft", "Rejected"].includes(mr.status) && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          handleEditClick(mr);
                                        }}
                                        className="w-full px-2.5 py-2 text-xs font-semibold hover:bg-amber-50 text-amber-800 rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors text-left"
                                      >
                                        <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span>Edit Permintaan</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* SECTION 3: HAPUS */}
                                  <div className="pt-1">
                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setActiveActionId(null);
                                        if (confirm(`Apakah Anda yakin ingin menghapus Permintaan Barang (TUG 5) dengan nomor ${mr.request_number} ini?`)) {
                                          await onDeleteRequest(mr.id);
                                        }
                                      }}
                                      className="w-full px-2.5 py-2 text-xs font-bold hover:bg-rose-50 text-rose-600 rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors text-left"
                                    >
                                      <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                                      <span>Hapus TUG 5</span>
                                    </button>
                                  </div>

                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modern Sticky Pagination Bar for TUG 5 */}
        <div id="tug-pagination-bar" className="bg-white border-t border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans text-xs shrink-0 shadow-md sticky bottom-0 z-20 no-print">
          {/* Left: Record Range Summary & Per Page Selector */}
          <div className="flex items-center gap-4 text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 uppercase font-bold">Baris per halaman:</span>
              <select
                value={tugPerPage}
                onChange={(e) => {
                  setTugPerPage(Number(e.target.value));
                  setTugPage(1);
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
              Menampilkan <span className="text-slate-900 font-black">{filteredRequests.length > 0 ? (tugPage - 1) * tugPerPage + 1 : 0}</span> - <span className="text-slate-900 font-black">{Math.min(tugPage * tugPerPage, filteredRequests.length)}</span> dari <span className="text-slate-900 font-black">{filteredRequests.length}</span> data TUG 5
            </span>
          </div>

          {/* Right: Page Number Buttons */}
          <div className="flex items-center gap-1 font-mono">
            <button
              disabled={tugPage === 1}
              onClick={() => setTugPage(1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              disabled={tugPage === 1}
              onClick={() => setTugPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 px-2.5 text-xs font-bold"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden md:inline">Sebelumnya</span>
            </button>

            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: tugTotalPages || 1 }, (_, i) => i + 1)
                .filter(p => p === 1 || p === tugTotalPages || Math.abs(p - tugPage) <= 1)
                .map((p, i, arr) => {
                  const prev = arr[i - 1];
                  const showEllipsis = prev && p - prev > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-slate-400 font-bold">...</span>}
                      <button
                        onClick={() => setTugPage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          tugPage === p
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
              disabled={tugPage >= tugTotalPages || tugTotalPages <= 1}
              onClick={() => setTugPage(p => Math.min(tugTotalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 px-2.5 text-xs font-bold"
              title="Halaman Selanjutnya"
            >
              <span className="hidden md:inline">Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              disabled={tugPage >= tugTotalPages || tugTotalPages <= 1}
              onClick={() => setTugPage(tugTotalPages)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. MODAL POPUP: VIEW DETAILS DIALOG */}
      {/* ========================================================= */}
      {isDetailsOpen && activeMR && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white border border-slate-205 rounded-xl shadow-2xl max-w-4xl w-full font-sans overflow-hidden my-8 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-205 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-55 p-2 rounded-lg border border-emerald-100">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-display text-slate-950 tracking-wider uppercase flex items-center gap-2">
                    {activeMR.request_number}
                    {renderApprovalStatus(activeMR)}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Diajukan: {activeMR.created_at ? new Date(activeMR.created_at).toLocaleString("id-ID") : "-"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Timeline Flow */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-[9px] font-black font-mono uppercase tracking-widest text-slate-400 mb-3 text-center">
                  TUG 5 MATERIAL REQUEST LIFECYCLE STATE LOG
                </h4>
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full border bg-emerald-50 border-emerald-550 text-emerald-600 text-xs font-mono font-bold flex items-center justify-center">1</div>
                    <span className="text-[9px] font-mono font-semibold mt-1 text-slate-500">Draft</span>
                  </div>
                  <div className={`flex-1 h-0.5 ${["Submitted", "Approved", "Processed", "Rejected"].includes(activeMR.status) ? "bg-emerald-500" : "bg-slate-200"}`}></div>
                  
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full border text-xs font-mono font-bold flex items-center justify-center ${
                      activeMR.status === "Submitted"
                        ? "bg-blue-600 border-blue-600 text-white shadow"
                        : ["Approved", "Processed"].includes(activeMR.status)
                          ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                          : "bg-white border-slate-200 text-slate-300"
                    }`}>2</div>
                    <span className="text-[9px] font-mono font-semibold mt-1 text-slate-500">Submitted</span>
                  </div>
                  <div className={`flex-1 h-0.5 ${["Approved", "Processed"].includes(activeMR.status) ? "bg-emerald-500" : "bg-slate-200"}`}></div>
                  
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full border text-xs font-mono font-bold flex items-center justify-center ${
                      activeMR.status === "Approved"
                        ? "bg-emerald-600 border-emerald-600 text-white shadow"
                        : activeMR.status === "Processed"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                          : activeMR.status === "Rejected"
                            ? "bg-rose-100 border-rose-500 text-rose-600 font-bold"
                            : "bg-white border-slate-200 text-slate-300"
                    }`}>{activeMR.status === "Rejected" ? "X" : "3"}</div>
                    <span className="text-[9px] font-mono font-semibold mt-1 text-slate-500">
                      {activeMR.status === "Rejected" ? "Rejected" : "Approved"}
                    </span>
                  </div>
                  <div className={`flex-1 h-0.5 ${activeMR.status === "Processed" ? "bg-emerald-500" : "bg-slate-200"}`}></div>
                  
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full border text-xs font-mono font-bold flex items-center justify-center ${
                      activeMR.status === "Processed"
                        ? "bg-amber-500 border-amber-500 text-slate-900 shadow font-black"
                        : "bg-white border-slate-200 text-slate-300"
                    }`}>4</div>
                    <span className="text-[9px] font-mono font-semibold mt-1 text-slate-500">Processed</span>
                  </div>
                </div>
              </div>

              {/* Informational Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 leading-relaxed text-xs">
                
                {/* Panel 1 */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex items-center gap-1">
                    <Anchor className="w-3.5 h-3.5 text-slate-400" />
                    Informasi Kapal & Pemohon
                  </h4>
                  <div className="flex justify-between border-b border-slate-100 pb-1 font-mono text-[11px]">
                    <span className="text-slate-400">Request Number:</span>
                    <span className="text-emerald-700 font-bold">{activeMR.request_number}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1 font-mono text-[11px]">
                    <span className="text-slate-400">Tanggal TUG 5:</span>
                    <span className="text-slate-800 font-semibold">{activeMR.request_date ? new Date(activeMR.request_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-400">Kepala Bagian / Pemohon:</span>
                    <span className="text-slate-800 font-bold">{activeMR.requester_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-400">Nama Kapal:</span>
                    <span className="text-blue-700 font-bold">{activeMR.vessel_name}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-400">🏢 Depo Gudang:</span>
                    <span className="text-slate-800 font-semibold">{activeMR.warehouse_name}</span>
                  </div>
                </div>

                {/* Panel 2 */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Dokumen & Referensi Akuntansi
                  </h4>
                  <div className="flex justify-between border-b border-slate-100 pb-1 font-mono text-[11px]">
                    <span className="text-slate-400">No. Perintah Kerja:</span>
                    <span className="text-slate-800 font-black text-rose-600">{activeMR.work_order_ref || "TIADA"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1 font-mono text-[11px]">
                    <span className="text-slate-400">Kode Akun ERP:</span>
                    <span className="text-indigo-700 font-extrabold">{activeMR.account_code || "TIADA"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1 font-mono text-[11px]">
                    <span className="text-slate-400">Kode Fungsi Layanan:</span>
                    <span className="text-emerald-700 font-extrabold">{activeMR.function_code || "TIADA"}</span>
                  </div>
                  <div className="pt-0.5">
                    <span className="text-slate-400 block mb-1">Alamat Distribusi Fisik:</span>
                    <span className="text-slate-700 block bg-white p-2 rounded border border-slate-200 italic leading-tight text-[11px]">
                      {activeMR.delivery_address || "Pelabuhan Merak Mas, Cilegon, Banten"}
                    </span>
                  </div>

                  {/* WMS SPK Integration info box removed for clean info flow */}
                </div>

              </div>

              {/* Remarks/Reject Reason Log */}
              {activeMR.remarks && (
                <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl text-xs flex items-start gap-2.5 text-slate-700">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <strong>Pemberitahuan & Approval Ledger Remark:</strong>
                    <p className="whitespace-pre-wrap mt-1 leading-relaxed font-sans">{activeMR.remarks}</p>
                  </div>
                </div>
              )}

              {/* PANEL INBOUND RECEIVING & KELENGKAPAN SPK */}
              {(() => {
                const inboundInfo = getInboundInfoForMR(activeMR);
                return (
                  <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-3.5 shadow-md">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-2.5 gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <h4 className="text-xs font-black font-display uppercase tracking-wider text-slate-100">
                          STATUS KELENGKAPAN DATA INBOUND RECEIVING (PENERIMAAN BARANG)
                        </h4>
                      </div>
                      <div>
                        {inboundInfo.hasInbound ? (
                          inboundInfo.isPartial ? (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              ⚠️ DATA PARSIAL (BELUM LENGKAP)
                            </span>
                          ) : (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ✓ DATA LENGKAP & TERVERIFIKASI
                            </span>
                          )
                        ) : (
                          <span className="bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            ⚪ BELUM TERDAPAT DATA INBOUND
                          </span>
                        )}
                      </div>
                    </div>

                    {inboundInfo.hasInbound && inboundInfo.receivingRecord ? (
                      <div className="space-y-3 text-xs">
                        
                        {/* Detail Status & Timestamp Completeness */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-800/80 p-3 rounded-lg border border-slate-700/80 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[9.5px] uppercase font-bold">No. SPK Inbound:</span>
                            <span className="text-rose-400 font-black">{inboundInfo.receivingRecord.spk_number}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Status Verifikasi Gudang:</span>
                            <span className="text-emerald-400 font-bold uppercase">{inboundInfo.receivingRecord.status}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Waktu Lengkap / Verifikasi:</span>
                            <span className="text-amber-300 font-bold">
                              {inboundInfo.completionDate ? new Date(inboundInfo.completionDate).toLocaleString("id-ID") : (inboundInfo.isPartial ? "⏳ Menunggu barang susulan / belum lengkap" : "-")}
                            </span>
                          </div>
                        </div>

                        {/* Rincian Barang Parsial jika ada */}
                        {inboundInfo.isPartial && (
                          <div className="bg-amber-950/40 border border-amber-500/40 p-3.5 rounded-lg space-y-2">
                            <div className="flex items-center gap-2 text-amber-300 font-bold text-[11.5px]">
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>Keterangan Barang Yang Belum Lengkap (Parsial / Selisih):</span>
                            </div>
                            <div className="space-y-1.5 text-[11px] text-slate-200">
                              {inboundInfo.receivingRecord.items
                                .filter(i => {
                                  const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
                                  const st = i.status || i.qc_status;
                                  return i.qty_received < targetQty || st === "REJECTED" || st === "Rejected" || st === "PARTIAL";
                                })
                                .map((itm, i) => {
                                  const targetQty = itm.qty_spk ?? itm.qty_ordered ?? 0;
                                  const selisih = targetQty - itm.qty_received;
                                  const name = itm.part_name || itm.spare_part_name;
                                  return (
                                    <div key={i} className="bg-slate-900/80 p-2 rounded border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                      <div>
                                        <span className="font-bold text-white">{name}</span>
                                        <span className="text-slate-400 font-mono text-[10px] ml-2">({itm.part_number})</span>
                                        {itm.keeper_notes && (
                                          <span className="text-amber-300 text-[10.5px] block italic font-sans">
                                            💬 Catatan Gudang: "{itm.keeper_notes}"
                                          </span>
                                        )}
                                      </div>
                                      <div className="font-mono text-[10.5px] shrink-0 text-right">
                                        <span className="text-slate-300">Target: {targetQty} {itm.unit || 'PCS'}</span> &bull;{" "}
                                        <span className="text-emerald-400 font-bold">Diterima: {itm.qty_received}</span> &bull;{" "}
                                        <span className="text-rose-400 font-extrabold bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800">
                                          Kurang: {selisih} {itm.unit || 'PCS'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* Audit Log History Timeline */}
                        <div className="space-y-2 pt-1">
                          <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 text-blue-400" />
                            RIWAYAT LOG HISTORY KELENGKAPAN DATA & RECEIVING INBOUND:
                          </h5>

                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {inboundInfo.auditLogs && inboundInfo.auditLogs.length > 0 ? (
                              inboundInfo.auditLogs.map((log: any, i: number) => (
                                <div key={i} className="bg-slate-800/60 border border-slate-700/60 p-2.5 rounded-lg flex items-start justify-between text-[11px] gap-3">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-blue-300">{log.action || log.user}</span>
                                      <span className="text-slate-400 text-[10px] font-mono">oleh {log.user || 'Sistem'}</span>
                                    </div>
                                    <p className="text-slate-300 text-[10.5px]">{log.notes}</p>
                                  </div>
                                  <span className="text-[9.5px] font-mono text-slate-400 whitespace-nowrap bg-slate-900 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                                    {log.timestamp ? new Date(log.timestamp).toLocaleString("id-ID") : "-"}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="text-[10.5px] font-mono text-slate-400 italic bg-slate-800/40 p-2.5 rounded text-center border border-slate-700/50">
                                Data penerimaan inbound tercatat pada {inboundInfo.receivingRecord.created_at ? new Date(inboundInfo.receivingRecord.created_at).toLocaleString("id-ID") : "-"}. Log detail pemeriksaan tersimpan di database.
                              </div>
                            )}

                            {/* Timestamp saat lengkap */}
                            {inboundInfo.completionDate && (
                              <div className="bg-emerald-950/60 border border-emerald-500/50 p-2.5 rounded-lg flex items-center justify-between text-[11px] text-emerald-200">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                  <div>
                                    <strong className="text-white block text-[11px]">SPK INBOUND DISENYATAKAN LENGKAP & TERVERIFIKASI</strong>
                                    <span className="text-emerald-300 text-[10px]">Seluruh barang kargo telah berhasil dicocokkan 100% tanpa selisih.</span>
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-600 shrink-0">
                                  {new Date(inboundInfo.completionDate).toLocaleString("id-ID")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 font-mono italic">
                        Belum ada tautan transaksi receiving (inbound) untuk SPK #{activeMR.work_order_ref || '-'}.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Items List inside Modal */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black font-mono uppercase tracking-widest text-slate-500 flex items-center justify-between">
                  <span>RINCIAN DAFTAR MATERIAL SUKU CADANG (TUG 5 CODES)</span>
                  <span className="bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-emerald-800 text-[9.5px]">
                    Daftar {(activeMR.items || []).length} Barang
                  </span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 text-[10px] font-mono uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-4 font-black w-12 text-center">No</th>
                        <th className="py-2.5 px-3 font-semibold">Nama Suku Cadang Kapal</th>
                        <th className="py-2.5 px-3 font-semibold">Part Number / SKU</th>
                        <th className="py-2.5 px-3 w-20 text-center font-semibold">Satuan</th>
                        <th className="py-2.5 px-3 w-32 text-center font-semibold text-slate-500">Rata2 Pemakaian</th>
                        <th className="py-2.5 px-3 w-32 text-center font-semibold text-slate-500">Sisa Stok Sedia</th>
                        <th className="py-2.5 px-3 w-32 text-center font-bold text-blue-800 bg-blue-50/30">Requested Qty</th>
                        <th className="py-2.5 px-3 w-36 text-center font-semibold">Status Barang</th>
                        <th className="py-2.5 px-3 font-semibold">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                      {(activeMR.items || []).map((itm, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-slate-900 font-bold">{itm.spare_part_name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-650">{itm.part_number}</td>
                          <td className="py-2.5 px-3 text-center uppercase font-mono">{itm.unit}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{itm.avg_monthly_usage !== undefined ? itm.avg_monthly_usage : 1}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{itm.remaining_stock !== undefined ? itm.remaining_stock : 0}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-blue-850 bg-blue-50/10 text-xs">{itm.requested_qty}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border inline-block ${
                              itm.item_status === "Pending"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : itm.item_status === "Returned"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                              {itm.item_status === "Pending" ? "Belum Datang" : itm.item_status === "Returned" ? "Diretur" : "Sudah Datang"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-sans italic text-slate-500">{itm.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4-Level Approval & Signature Stepper */}
              <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-3 mt-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                  <span className="text-xs font-black font-display uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Status Persetujuan Berjenjang & Tanda Tangan Digital (4-Tahap TTD)
                  </span>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-bold uppercase">
                    Document Status: {activeMR.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  
                  {/* TAHAP 1: ALDI HIDAYAT (PETUGAS GUDANG) */}
                  <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${activeMR.aldi_signed ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100' : 'bg-slate-800/80 border-slate-700 text-slate-300'}`}>
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                        <span>TAHAP 1: PETUGAS GUDANG</span>
                        {activeMR.aldi_signed ? (
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/40 font-bold flex items-center gap-1">✓ SIGNED</span>
                        ) : (
                          <span className="bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/40 font-bold">⏳ PENDING</span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-white mt-1.5">Aldi Hidayat</div>
                      <div className="text-[10px] text-slate-400">Petugas Gudang (Pemeriksa / Penyerah)</div>
                    </div>

                    {activeMR.aldi_signed ? (
                      <div className="mt-3 pt-2 border-t border-emerald-500/30 text-[9.5px] font-mono text-emerald-300">
                        ✓ TTD Digital dibubuhkan: {activeMR.aldi_signed_at ? new Date(activeMR.aldi_signed_at).toLocaleString("id-ID") : "Terverifikasi"}
                      </div>
                    ) : isAldiRole ? (
                      <button
                        onClick={async () => {
                          const now = new Date().toISOString();
                          await onUpdateRequest(activeMR.id, {
                            aldi_signed: true,
                            aldi_signed_at: now,
                            aldi_signature_url: ALDI_SIGNATURE_URL,
                            status: activeMR.status === "Draft" ? "Submitted" : activeMR.status
                          });
                        }}
                        className="mt-3 w-full py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Setujui & TTD (Petugas Gudang)
                      </button>
                    ) : (
                      <div className="mt-3 text-[9.5px] text-slate-400 font-mono italic">
                        🔒 Memerlukan login akun <strong>aldi</strong> (Petugas Gudang)
                      </div>
                    )}
                  </div>

                  {/* TAHAP 2: ALFIN (KEPALA GUDANG) */}
                  <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${activeMR.alfin_signed ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100' : 'bg-slate-800/80 border-slate-700 text-slate-300'}`}>
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                        <span>TAHAP 2: KEPALA GUDANG</span>
                        {activeMR.alfin_signed ? (
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/40 font-bold flex items-center gap-1">✓ SIGNED</span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/40 font-bold">⏳ PENDING</span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-white mt-1.5">Maghfur Muhammad Alfin</div>
                      <div className="text-[10px] text-slate-400">Kepala Gudang (Menyetujui)</div>
                    </div>

                    {activeMR.alfin_signed ? (
                      <div className="mt-3 pt-2 border-t border-emerald-500/30 text-[9.5px] font-mono text-emerald-300">
                        ✓ TTD Digital dibubuhkan: {activeMR.alfin_signed_at ? new Date(activeMR.alfin_signed_at).toLocaleString("id-ID") : "Terverifikasi"}
                      </div>
                    ) : isAlfinRole ? (
                      <button
                        onClick={async () => {
                          const now = new Date().toISOString();
                          await onUpdateRequest(activeMR.id, {
                            alfin_signed: true,
                            alfin_signed_at: now,
                            alfin_signature_url: ALFIN_SIGNATURE_URL,
                            status: activeMR.status === "Draft" ? "Submitted" : activeMR.status
                          });
                        }}
                        className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Setujui & TTD (Kepala Gudang)
                      </button>
                    ) : (
                      <div className="mt-3 text-[9.5px] text-slate-400 font-mono italic">
                        🔒 Memerlukan login akun <strong>alfin</strong> (Kepala Gudang)
                      </div>
                    )}
                  </div>

                  {/* TAHAP 3: EMIR (MANAGER LOGISTIK) */}
                  <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${activeMR.emir_signed ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100' : 'bg-slate-800/80 border-slate-700 text-slate-300'}`}>
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                        <span>TAHAP 3: MANAGER LOGISTIK</span>
                        {activeMR.emir_signed ? (
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/40 font-bold flex items-center gap-1">✓ SIGNED</span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/40 font-bold">⏳ PENDING</span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-white mt-1.5">Mohamat Emir Ferdian</div>
                      <div className="text-[10px] text-slate-400">Manager Logistik</div>
                    </div>

                    {activeMR.emir_signed ? (
                      <div className="mt-3 pt-2 border-t border-emerald-500/30 text-[9.5px] font-mono text-emerald-300">
                        ✓ TTD Digital dibubuhkan: {activeMR.emir_signed_at ? new Date(activeMR.emir_signed_at).toLocaleString("id-ID") : "Terverifikasi"}
                      </div>
                    ) : isEmirRole ? (
                      <button
                        onClick={async () => {
                          const now = new Date().toISOString();
                          await onUpdateRequest(activeMR.id, {
                            emir_signed: true,
                            emir_signed_at: now,
                            emir_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=EmirFerdian"
                          });
                        }}
                        className="mt-3 w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Setujui & TTD (Emir)
                      </button>
                    ) : (
                      <div className="mt-3 text-[9.5px] text-slate-400 font-mono italic">
                        🔒 Memerlukan login akun <strong>emir</strong> (Manager Logistik)
                      </div>
                    )}
                  </div>

                  {/* TAHAP 4: SUMBONO (VP RENDALHAR) */}
                  <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${activeMR.sumbono_signed ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100' : 'bg-slate-800/80 border-slate-700 text-slate-300'}`}>
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                        <span>TAHAP 4: VP RENDALHAR</span>
                        {activeMR.sumbono_signed ? (
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/40 font-bold flex items-center gap-1">✓ SIGNED</span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/40 font-bold">⏳ PENDING</span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-white mt-1.5">Sumbono</div>
                      <div className="text-[10px] text-slate-400">VP Rendalhar</div>
                    </div>

                    {activeMR.sumbono_signed ? (
                      <div className="mt-3 pt-2 border-t border-emerald-500/30 text-[9.5px] font-mono text-emerald-300">
                        ✓ TTD Digital dibubuhkan: {activeMR.sumbono_signed_at ? new Date(activeMR.sumbono_signed_at).toLocaleString("id-ID") : "Disahkan"}
                      </div>
                    ) : isSumbonoRole ? (
                      <button
                        onClick={async () => {
                          const now = new Date().toISOString();
                          await onUpdateRequest(activeMR.id, {
                            sumbono_signed: true,
                            sumbono_signed_at: now,
                            sumbono_signature_url: "https://api.dicebear.com/7.x/initials/svg?seed=Sumbono",
                            status: "Approved"
                          });
                        }}
                        className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Sahkan & TTD (Sumbono)
                      </button>
                    ) : (
                      <div className="mt-3 text-[9.5px] text-slate-400 font-mono italic">
                        🔒 Memerlukan login akun <strong>sumbono</strong> (VP Rendalhar)
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>

            {/* Modal Bottom Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-205 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              
              {/* Left Action group: View/Print TUG 5 */}
              <div>
                <button
                  onClick={() => {
                    onPreviewTUG5(activeMR);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white font-mono font-bold text-xs uppercase rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-blue-400" />
                  Preview & Cetak TUG 5
                </button>
              </div>

              {/* Right Action operational modifiers */}
              <div className="flex gap-2">
                
                {/* Edit for draft and rejected */}
                {["Draft", "Rejected"].includes(activeMR.status) && (
                  <button
                    onClick={() => {
                      setIsDetailsOpen(false);
                      handleStartEdit(activeMR);
                    }}
                    className="px-4 py-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase rounded-lg transition-colors cursor-pointer"
                  >
                    Edit Permintaan
                  </button>
                )}

                {/* Direct Approval for Draft / Submitted */}
                {["Draft", "Submitted"].includes(activeMR.status) && 
                 [UserRole.SUPER_ADMIN, UserRole.WAREHOUSE_ADMIN, UserRole.SUPERINTENDENT].includes(currentUser.role) && (
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve
                  </button>
                )}

                {/* Submit for Crew (Draft only) */}
                {activeMR.status === "Draft" && currentUser.role === UserRole.VESSEL_CREW && (
                  <button
                    onClick={async () => {
                      if (confirm(`Submit Material Request ${activeMR.request_number}?`)) {
                        await onUpdateRequest(activeMR.id, { status: "Submitted" });
                        setIsDetailsOpen(false);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit
                  </button>
                )}

                {/* Dispatch Flow for warehouse */}
                {activeMR.status === "Approved" && (currentUser.role === UserRole.WAREHOUSE_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && (
                  <button
                    onClick={handleMarkProcessed}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 border border-amber-400 font-bold text-xs uppercase rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-slate-900" />
                    Selesaikan Pengiriman
                  </button>
                )}

                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-lg transition-colors"
                >
                  Tutup Dialog
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODAL POPUP: CREATE / EDIT TRANSACTION FORM */}
      {/* ========================================================= */}
      {(isCreating || isEditing) && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white border border-slate-205 rounded-xl shadow-2xl max-w-5xl w-full font-sans overflow-hidden my-8 flex flex-col max-h-[90vh]">
            
            {/* Modal Form Header */}
            <div className="p-5 border-b border-slate-205 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black font-display text-slate-950 tracking-wide uppercase">
                  {isCreating ? "Isi Data Permintaan Barang Baru (TUG 5)" : `Edit Dokumen TUG 5 — ${activeMR?.request_number}`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                  resetForm();
                }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Form Segment 1: Header metadata */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4">
                <h4 className="text-[10px] font-black font-mono uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1.5 flex items-center gap-1">
                  <span>1. TUG 5 MATERIAL REQUISITION HEADER</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Col 1 */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Chief Engineer (Pemohon)</label>
                      <input
                        type="text"
                        disabled
                        value={currentUser.name}
                        className="w-full bg-slate-100 border border-slate-250 rounded-lg text-xs px-3 py-2 font-bold text-slate-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tanggal Permintaan</label>
                      <input
                        type="date"
                        value={requestDate}
                        onChange={(e) => setRequestDate(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-lg text-xs px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Col 2 */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block mb-1">Depo Logistik (Gudang)</label>
                      <input
                        type="text"
                        value={warehouseName}
                        onChange={(e) => setWarehouseName(e.target.value)}
                        placeholder="Jakarta HQ Depot"
                        className="w-full bg-white border border-slate-250 rounded-lg text-xs px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block mb-1">Nama Kapal (Vessel Destination)</label>
                      <input
                        type="text"
                        value={vesselName}
                        onChange={(e) => setVesselName(e.target.value)}
                        placeholder="MV. KARTINI BARUNA"
                        className="w-full bg-white border border-slate-250 rounded-lg text-xs px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Col 3 */}
                  <div className="space-y-3 bg-blue-50/20 p-3 rounded-lg border border-blue-100/50">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">No. Perintah Kerja (Work Order)</label>
                      <select
                        value={workOrderRef}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWorkOrderRef(val);
                          const matchedSPK = spkList.find(s => s.spk_number === val);
                          if (matchedSPK) {
                            if (matchedSPK.vessels.length > 0) {
                              setVesselName(matchedSPK.vessels[0].vessel_name);
                            }
                            if (matchedSPK.target_port) {
                              setDeliveryAddress(`Pelabuhan Target: ${matchedSPK.target_port}`);
                            }
                          }
                        }}
                        className="w-full bg-white border border-slate-250 rounded-lg text-xs px-3 py-2 font-mono text-rose-600 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="">-- HUBUNGKAN DENGAN SPK WMS --</option>
                        {spkList.map(s => (
                          <option key={s.id} value={s.spk_number}>
                            {s.spk_number} &bull; {s.target_port} ({s.status})
                          </option>
                        ))}
                      </select>

                      {(() => {
                        const matchedSPK = spkList.find(s => s.spk_number === workOrderRef);
                        if (!matchedSPK) return null;
                        return (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-center">
                            <span className="text-[9px] font-bold text-blue-800 block mb-1 uppercase tracking-tight">
                              ✓ Terdeteksi SPK Aktif!
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                              const totalItemsCount = matchedSPK.vessels.reduce((acc, v) => acc + v.items.length, 0);
                              if (totalItemsCount === 0) {
                                alert("Tidak ditemukan data suku cadang / item kargo di dalam SPK ini.");
                                return;
                              }
                              if (confirm(`Muat seluruh ${totalItemsCount} suku cadang dari semua kapal di dalam SPK ${matchedSPK.spk_number} ke dalam Form TUG 5?`)) {
                                const loadedItems = matchedSPK.vessels.flatMap(v =>
                                  v.items.map(it => {
                                    const matchedPart = parts.find(p => p.id === it.spare_part_id || p.part_number === it.part_number);
                                    return {
                                      spare_part_id: matchedPart?.id || it.spare_part_id,
                                      spare_part_name: matchedPart?.part_name || it.spare_part_name,
                                      part_number: matchedPart?.part_number || it.part_number,
                                      unit: matchedPart?.unit || it.unit,
                                      avg_monthly_usage: 1,
                                      remaining_stock: matchedPart?.current_stock || 0,
                                      requested_qty: it.qty_to_pick,
                                      notes: `Diimpor dari SPK: ${matchedSPK.spk_number} (${v.vessel_name})`
                                    };
                                  })
                                );
                                setFormItems(loadedItems);
                              }
                              }}
                              className="w-full py-1.5 px-3 bg-blue-650 hover:bg-blue-700 text-white font-bold rounded text-[10px] uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                            >
                              ✨ Muat Suku Cadang Dari SPK
                            </button>
                            <span className="text-[8px] text-slate-500 block mt-1 leading-tight">
                              Kapal yang ada dalam SPK: {matchedSPK.vessels.map(v => v.vessel_name).join(", ")}
                            </span>

                            {(() => {
                              const matchedInbound = receivingList.find(r => r.spk_number === matchedSPK.spk_number);
                              if (!matchedInbound) return null;
                              const isPartial = matchedInbound.status === ReceivingStatus.PARTIAL_REJECT || 
                                                matchedInbound.status === ReceivingStatus.FULL_REJECT || 
                                                (matchedInbound.status as string) === "PARTIAL_REJECT" || 
                                                (matchedInbound.status as string) === "FULL_REJECT" || 
                                                matchedInbound.items.some(i => {
                                                  const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
                                                  const st = i.status || i.qc_status;
                                                  return i.qty_received < targetQty || st === "PARTIAL" || st === "REJECTED" || st === "Rejected";
                                                });
                              const incItems = matchedInbound.items.filter(i => {
                                const targetQty = i.qty_spk ?? i.qty_ordered ?? 0;
                                const st = i.status || i.qc_status;
                                return i.qty_received < targetQty || st === "REJECTED" || st === "Rejected" || st === "PARTIAL";
                              });

                              return (
                                <div className={`mt-2 p-2 rounded text-left border text-[10px] font-sans ${isPartial ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'}`}>
                                  <div className="font-bold flex items-center justify-between border-b pb-1 mb-1 border-current/20">
                                    <span className="flex items-center gap-1 uppercase tracking-tight">
                                      {isPartial ? <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" /> : <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />}
                                      Inbound Receiving Status: {matchedInbound.status}
                                    </span>
                                    <span className="font-mono text-[9px]">
                                      {isPartial ? "⚠️ PARSIAL" : "✓ LENGKAP"}
                                    </span>
                                  </div>

                                  {isPartial && incItems.length > 0 ? (
                                    <div className="space-y-0.5 text-[9.5px]">
                                      <div className="font-bold text-amber-800">⚠️ Barang Belum Lengkap Dari Receiving:</div>
                                      <ul className="list-disc pl-3 text-amber-950 space-y-0.5">
                                        {incItems.map((itm, i) => {
                                          const targetQty = itm.qty_spk ?? itm.qty_ordered ?? 0;
                                          const name = itm.part_name || itm.spare_part_name;
                                          return (
                                            <li key={i}>
                                              <strong>{name}</strong>: SPK {targetQty} &rarr; Diterima {itm.qty_received} (Selisih {targetQty - itm.qty_received} {itm.unit || 'PCS'})
                                              {itm.keeper_notes && <span className="italic text-amber-700 font-normal"> — "{itm.keeper_notes}"</span>}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  ) : (
                                    <div className="text-[9.5px] text-emerald-800 font-medium">
                                      ✓ Seluruh barang telah diterima 100% lengkap pada {matchedInbound.verified_at ? new Date(matchedInbound.verified_at).toLocaleDateString("id-ID") : (matchedInbound.completion_date ? new Date(matchedInbound.completion_date).toLocaleDateString("id-ID") : new Date(matchedInbound.created_at || new Date()).toLocaleDateString("id-ID"))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pb-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Kode Akun</label>
                        <input
                          type="text"
                          value={accountCode}
                          onChange={(e) => setAccountCode(e.target.value)}
                          placeholder="e.g. ACC-5400"
                          className="w-full bg-white border border-slate-250 rounded-lg text-xs px-2.5 py-2 font-mono text-slate-700 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Fungsi</label>
                        <input
                          type="text"
                          value={functionCode}
                          onChange={(e) => setFunctionCode(e.target.value)}
                          placeholder="e.g. FNC-DEPT"
                          className="w-full bg-white border border-slate-250 rounded-lg text-xs px-2.5 py-2 font-mono text-slate-700 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Alamat Pengantaran Logistik</label>
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Masukkan dermaga, pelabuhan, agen logistik, dsb..."
                      className="w-full bg-white border border-slate-250 p-2.5 text-xs rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Catatan Tambahan / Urgensi Operasional</label>
                    <textarea
                      rows={2}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Catatan tambahan kapal, instruksi loading cargo dsb..."
                      className="w-full bg-white border border-slate-250 p-2.5 text-xs rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Form Segment 2: Spare Parts selector inputs */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3">
                <h4 className="text-[10px] font-black font-mono uppercase tracking-widest text-slate-505 border-b border-slate-200 pb-1.5 flex justify-between items-center">
                  <span>2. PILIH SUKU CADANG (SPARE PARTS ENGINE)</span>
                  <span className="text-slate-400 font-medium italic lowercase text-[9px]">live inventory synchronizer</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  
                  {/* Selector dropdown */}
                  <div className="md:col-span-5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Pilih Suku Cadang</label>
                    <select
                      value={selectedPartId}
                      onChange={(e) => {
                        setSelectedPartId(e.target.value);
                        setItemUsage(1);
                      }}
                      className="w-full bg-white border border-slate-250 text-xs rounded-lg px-2.5 py-2 font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Pilih Suku Cadang --</option>
                      {parts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.part_name} &bull; SKU: {p.sku} (Part No: {p.part_number}) &mdash; Tersedia: {p.current_stock} {p.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity requested block */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Kebutuhan (Qty)</label>
                    <input
                      type="number"
                      min={1}
                      value={itemQty}
                      onChange={(e) => setItemQty(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-250 rounded-lg text-xs px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Avg Monthly Usage */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Rata2/Bulan</label>
                    <input
                      type="number"
                      min={0}
                      value={itemUsage}
                      onChange={(e) => setItemUsage(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-250 rounded-lg text-xs px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Remarks input notes */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Keterangan Item</label>
                    <input
                      type="text"
                      placeholder="e.g. Kritis / Overhaul"
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      className="w-full bg-white border border-slate-250 rounded-lg text-xs px-3 py-2 font-sans text-slate-800 focus:outline-none"
                    />
                  </div>

                  {/* Addition trigger button */}
                  <div className="md:col-span-1">
                    <button
                      type="button"
                      onClick={handleAddFormItem}
                      disabled={!selectedPartId}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 rounded-lg text-xs font-mono font-bold disabled:opacity-40 select-none cursor-pointer text-center"
                    >
                      ADD
                    </button>
                  </div>

                </div>
              </div>

              {/* Form Segment 3: Items Table representation */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black font-mono uppercase tracking-widest text-slate-500 block">
                  DAFTAR GRID ITEM YANG AKAN DISIMPAN
                </h4>

                <div className="border border-slate-205 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 text-[10px] font-mono uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-4 font-black w-12 text-center">No</th>
                        <th className="py-2.5 px-3 font-semibold">Nama Barang (Ditulis Lengkap)</th>
                        <th className="py-2.5 px-3 font-semibold">Nomor Part / SKU Reference</th>
                        <th className="py-2.5 px-3 w-20 text-center font-semibold">Satuan</th>
                        <th className="py-2.5 px-3 w-32 text-center font-semibold text-slate-500">Rerata Guna/Bln</th>
                        <th className="py-2.5 px-3 w-32 text-center font-semibold text-slate-500">Sisa Stok Depo</th>
                        <th className="py-2.5 px-3 w-32 text-center font-black text-emerald-600 bg-emerald-50/25 border-x border-slate-200">Kebutuhan</th>
                        <th className="py-2.5 px-3 w-40 font-semibold text-center text-blue-800">Status Kedatangan</th>
                        <th className="py-2.5 px-3 font-semibold">Keterangan Khusus</th>
                        <th className="py-2.5 px-3 w-16 text-center text-rose-600 font-semibold">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {formItems.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 px-4 text-center text-slate-450 font-mono italic">
                            Belum ada suku cadang ditambahkan. Pilih dan masukkan parts di atas.
                          </td>
                        </tr>
                      ) : (
                        formItems.map((itm, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-4 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-2 px-3 text-slate-900 font-bold">{itm.spare_part_name}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{itm.part_number}</td>
                            <td className="py-2 px-3 text-center font-mono uppercase">{itm.unit}</td>
                            <td className="py-2 px-3 text-center font-mono font-semibold text-slate-550">{itm.avg_monthly_usage}</td>
                            <td className="py-2 px-3 text-center font-mono font-semibold text-slate-500">{itm.remaining_stock}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-emerald-600 bg-emerald-50/20 text-xs border-x border-slate-100">{itm.requested_qty}</td>
                            <td className="py-2 px-3 text-center">
                              <select
                                value={itm.item_status || "Arrived"}
                                onChange={(e) => handleUpdateFormItemStatus(idx, e.target.value as any)}
                                className={`text-[11px] font-bold rounded-md px-2 py-1 focus:outline-none focus:ring-1 border cursor-pointer ${
                                  itm.item_status === "Pending"
                                    ? "bg-amber-50 text-amber-800 border-amber-200 focus:ring-amber-500"
                                    : itm.item_status === "Returned"
                                      ? "bg-rose-50 text-rose-800 border-rose-200 focus:ring-rose-500"
                                      : "bg-emerald-50 text-emerald-800 border-emerald-200 focus:ring-emerald-500"
                                }`}
                              >
                                <option value="Arrived">Sudah Datang</option>
                                <option value="Pending">Belum Datang</option>
                                <option value="Returned">Diretur</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={itm.notes || ""}
                                onChange={(e) => handleUpdateFormItemNotes(idx, e.target.value)}
                                placeholder="Tulis catatan (opsional)..."
                                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveFormItem(idx)}
                                className="p-1 hover:bg-rose-50 text-rose-600 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 ml-auto mr-auto" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Form Bottom Footer Panel */}
            <div className="p-4 bg-slate-50 border-t border-slate-205 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-705 text-xs font-bold uppercase rounded-lg hover:bg-slate-55 transition-colors cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={() => handleSaveRequest("Draft")}
                className="px-4 py-2 bg-slate-250 border border-slate-350 hover:bg-slate-300 text-slate-800 text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveRequest("Submitted")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-505 text-white text-xs font-black uppercase rounded-lg transition-all shadow-md shadow-emerald-100 cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Permintaan
              </button>
            </div>

          </div>
        </div>
      )}



      {/* ========================================================= */}
      {/* 7. MODAL POPUP: SPK AUTOMATIC BATCH SYNCHRONIZATION MODAL */}
      {/* ========================================================= */}
      {showSyncConfirmation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-fade-in">
          <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-md w-full font-sans overflow-hidden animate-zoom-in">
            <div className="p-4 border-b border-blue-100 bg-blue-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-blue-800 font-black font-display uppercase tracking-wider text-xs">
                <span>⚡ Sinkronisasi Register SPK</span>
              </div>
              <button 
                onClick={() => {
                  if (!isSyncing) setShowSyncConfirmation(false);
                }} 
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                disabled={isSyncing}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-blue-50/60 border border-blue-105 rounded-lg flex items-start gap-2.5">
                <span className="text-xl">✨</span>
                <div className="text-xs text-blue-900 leading-relaxed font-semibold">
                  Sistem mendeteksi <span className="font-extrabold text-blue-700">{pendingSyncList.length} Surat Perintah Kerja (SPK)</span> eksternal baru dari WMS yang belum memiliki form TUG 5 (Permintaan Barang) di modul ini.
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 no-print">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pilih SPK yang akan disinkronisasi ({selectedSyncIds.length} terpilih):</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => setSelectedSyncIds(pendingSyncList.map(s => s.id))}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold disabled:opacity-50"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300 text-[10px]">|</span>
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => setSelectedSyncIds([])}
                      className="text-[10px] text-slate-500 hover:text-slate-700 font-bold disabled:opacity-50"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg max-h-[180px] overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                  {pendingSyncList.map((spk) => {
                    const totalParts = spk.vessels.reduce((acc, v) => acc + v.items.length, 0);
                    const isChecked = selectedSyncIds.includes(spk.id);
                    return (
                      <div 
                        key={spk.id} 
                        onClick={() => {
                          if (isSyncing) return;
                          if (isChecked) {
                            setSelectedSyncIds(selectedSyncIds.filter(id => id !== spk.id));
                          } else {
                            setSelectedSyncIds([...selectedSyncIds, spk.id]);
                          }
                        }}
                        className={`p-3 flex items-center gap-3 text-xs hover:bg-slate-100 cursor-pointer transition-colors ${
                          isChecked ? "bg-blue-50/30" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by div parent onClick for easier mobile/desktop accessibility
                          disabled={isSyncing}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <div className="font-mono font-bold text-slate-800">{spk.spk_number}</div>
                          <div className="text-[10px] text-slate-500 font-semibold">{spk.target_port}</div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block bg-blue-100 text-blue-800 font-bold text-[9px] px-1.5 py-0.5 rounded-full uppercase">
                            {totalParts} Suku Cadang
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200/80 font-semibold">
                Suku cadang, detail kapal, pelabuhan target, dan operator akan terpetakan secara otomatis dan tersimpan dalam status <span className="text-blue-700 font-extrabold">DRAFT</span> yang selanjutnya memerlukan persetujuan dua tingkat (Staff Gudang & Superintendent).
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs">
              <button
                disabled={isSyncing}
                onClick={() => setShowSyncConfirmation(false)}
                className="px-4 py-2 border border-slate-300 font-bold text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                Batalkan
              </button>
              <button
                disabled={isSyncing}
                onClick={executeBatchSync}
                className={`px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                  isSyncing ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isSyncing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Mensinkronkan...</span>
                  </>
                ) : (
                  <span>Ya, Sinkronkan Sekarang!</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Print ZIP Modal for TUG 5 */}
      <BatchPrintZipModal
        isOpen={isBatchZipModalOpen}
        type="tug5"
        requests={requests}
        signatures={signatures}
        onClose={() => setIsBatchZipModalOpen(false)}
      />

    </div>
  );
}
