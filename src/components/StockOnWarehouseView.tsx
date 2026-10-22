/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { 
  Warehouse, 
  Package, 
  Truck, 
  Ship, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  ArrowUpDown, 
  Calendar, 
  ExternalLink, 
  Info, 
  Layers, 
  Tag, 
  Eye, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  MapPin, 
  Hash, 
  Boxes, 
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  Loader2,
  CheckCircle,
  X
} from "lucide-react";
import { 
  InboundReceiving, 
  OutboundDispatch, 
  SparePart, 
  WarehouseLocation, 
  SPKWorkOrder, 
  Vessel, 
  User 
} from "../types.js";

interface StockOnWarehouseViewProps {
  parts?: SparePart[];
  receivingList?: InboundReceiving[];
  dispatchList?: OutboundDispatch[];
  locations?: WarehouseLocation[];
  spkList?: SPKWorkOrder[];
  vessels?: Vessel[];
  currentUser?: User | null;
  onNavigateTab?: (tab: string) => void;
  onPreviewReceivingDoc?: (rec: InboundReceiving) => void;
  onPreviewDispatchDoc?: (dsp: OutboundDispatch) => void;
}

// Clean and normalize strings for robust matching
const cleanStr = (val: any): string => 
  (val || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

const invalidPns = ["", "-", "--", "---", "none", "null", "undefined", "n/a", "na", "pn-generic", "generic", "0"];

// Generate a reliable matching key for spare parts (prioritize valid ID before part number)
export const getPartKey = (itm: any): string => {
  if (!itm) return "unknown";
  const id = (itm.spare_part_id || itm.id || "").toString().trim();
  const isDummyId = !id || id === "-" || id.startsWith("temp-") || id.startsWith("item-") || id === "undefined" || id === "null";
  if (!isDummyId) {
    return `id:${id.toLowerCase()}`;
  }
  const pn = cleanStr(itm.part_number);
  if (pn && !invalidPns.includes(pn)) {
    return `pn:${pn}`;
  }
  const name = cleanStr(itm.spare_part_name || itm.part_name);
  if (name) {
    return `name:${name}`;
  }
  return `fallback:${Math.random()}`;
};

export default function StockOnWarehouseView({
  parts = [],
  receivingList = [],
  dispatchList = [],
  locations = [],
  spkList = [],
  vessels = [],
  currentUser,
  onNavigateTab,
  onPreviewReceivingDoc,
  onPreviewDispatchDoc
}: StockOnWarehouseViewProps) {
  // Navigation / Tab Switch: "pospk" (Per PO & SPK) vs "items" (Per Suku Cadang) vs "mutations" (Riwayat Mutasi)
  const [activeTab, setActiveTab] = useState<"pospk" | "items" | "mutations">("pospk");

  // Filtering states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "partial" | "exhausted">("all");
  const [selectedVessel, setSelectedVessel] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"remaining_desc" | "remaining_asc" | "date_desc" | "date_asc" | "name_asc">("date_desc");
  const [showArchivedDispatched, setShowArchivedDispatched] = useState<boolean>(false);

  // Expandable row state in PO/SPK view
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  // Drilldown modal for specific PO/SPK or Spare Part
  const [detailModalItem, setDetailModalItem] = useState<any | null>(null);

  // Print Rekapitulasi Modal state
  const [isRekapModalOpen, setIsRekapModalOpen] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  // Toggle expand/collapse
  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    poSPKBalances.forEach(p => {
      next[p.groupKey] = true;
    });
    setExpandedKeys(next);
  };

  const collapseAll = () => {
    setExpandedKeys({});
  };

  // Helper to resolve location display name
  const getLocationName = (locId?: string, fallbackName?: string): string => {
    if (!locId && !fallbackName) return "Gudang Merak";
    if (locId) {
      const found = locations.find(l => l.id === locId || l.code === locId);
      if (found) {
        return `${found.warehouse} (${found.rack || found.zone || found.code})`;
      }
    }
    return fallbackName || locId || "Gudang Merak";
  };

  // -------------------------------------------------------------
  // COMPUTATION ENGINE: INTEGRATING INBOUND (RECEIVING) & OUTBOUND (DISPATCH)
  // -------------------------------------------------------------

  // 1. Group Inbound Receivings into PO / SPK records and calculate deductions
  const poSPKBalances = useMemo(() => {
    // Structure: Map<po_spk_key, PO_SPK_Group>
    const groupMap = new Map<string, {
      groupKey: string;
      poNumber: string;
      spkNumber: string;
      deliveryNote: string;
      vendorName: string;
      vesselName: string;
      receivedDate: string;
      receivingIds: string[];
      rawReceivingDocs: InboundReceiving[];
      itemsMap: Map<string, {
        partKey: string;
        sparePartId: string;
        partName: string;
        partNumber: string;
        unit: string;
        category: string;
        barcode: string;
        locationId: string;
        locationName: string;
        qtyReceived: number;
        qtyDispatched: number;
        remainingStock: number;
        matchedDispatches: Array<{
          dispatchId: string;
          dispatchNumber: string;
          tug8Number: string;
          dispatchDate: string;
          vesselName: string;
          qtyDispatched: number;
        }>;
      }>;
    }>();

    // Scan Receiving List (Inbound)
    (receivingList || []).forEach(rec => {
      if (!rec) return;

      const poNum = (rec.purchase_order_num || "").trim();
      const spkNum = (rec.spk_number || (poNum.toUpperCase().startsWith("SPK") ? poNum : "")).trim();
      
      // Determine primary identifier key
      const key = spkNum 
        ? `spk:${cleanStr(spkNum)}` 
        : (poNum ? `po:${cleanStr(poNum)}` : `rec:${rec.id}`);

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          groupKey: key,
          poNumber: poNum || spkNum || "PO-NON-REGISTERED",
          spkNumber: spkNum || "-",
          deliveryNote: rec.delivery_note_num || "-",
          vendorName: rec.vendor_name || "Vendor Logistik BAG",
          vesselName: rec.vessel_name || "-",
          receivedDate: rec.received_date || rec.created_at || "",
          receivingIds: [rec.id],
          rawReceivingDocs: [rec],
          itemsMap: new Map()
        });
      } else {
        const existing = groupMap.get(key)!;
        if (!existing.receivingIds.includes(rec.id)) {
          existing.receivingIds.push(rec.id);
          existing.rawReceivingDocs.push(rec);
        }
        if (!existing.vesselName || existing.vesselName === "-") {
          existing.vesselName = rec.vessel_name || "-";
        }
      }

      const group = groupMap.get(key)!;

      // Ingest items received in this inbound document
      (rec.items || []).forEach(item => {
        if (!item) return;
        const partKey = getPartKey(item);
        const qtyIn = Number(item.qty_received ?? item.qty_ordered ?? item.qty ?? item.quantity ?? 0);
        if (qtyIn <= 0) return;

        const matchedMaster = parts.find(p => getPartKey(p) === partKey);
        const resolvedName = item.spare_part_name || item.part_name || matchedMaster?.part_name || "Suku Cadang";
        const resolvedPn = item.part_number || matchedMaster?.part_number || "-";
        const resolvedUnit = item.unit || matchedMaster?.unit || "PCS";
        const resolvedLoc = getLocationName(item.location_id || matchedMaster?.location_id, (matchedMaster as any)?.location_name);

        if (!group.itemsMap.has(partKey)) {
          group.itemsMap.set(partKey, {
            partKey,
            sparePartId: item.spare_part_id || (item as any).id || matchedMaster?.id || `sp-${Math.random()}`,
            partName: resolvedName,
            partNumber: resolvedPn,
            unit: resolvedUnit,
            category: (item as any).category || matchedMaster?.category || "General Spares",
            barcode: item.barcode || matchedMaster?.barcode || "-",
            locationId: item.location_id || matchedMaster?.location_id || "loc-wh-merak",
            locationName: resolvedLoc,
            qtyReceived: qtyIn,
            qtyDispatched: 0,
            remainingStock: qtyIn,
            matchedDispatches: []
          });
        } else {
          const it = group.itemsMap.get(partKey)!;
          it.qtyReceived += qtyIn;
          it.remainingStock += qtyIn;
        }
      });
    });

    // Scan Dispatch List (Outbound) to deduct from matching PO / SPK groups
    (dispatchList || []).forEach(dsp => {
      if (!dsp || !dsp.items || dsp.items.length === 0) return;

      // Build target references strictly from this dispatch
      const dspRefs = new Set<string>();
      const rawWo = cleanStr(dsp.work_order_ref);
      const rawSpk = cleanStr(dsp.spk_number);
      const rawReqRef = cleanStr(dsp.request_reference);
      const rawNotes = dsp.notes || "";

      if (rawWo && rawWo !== "-" && rawWo !== "null" && rawWo !== "undefined") dspRefs.add(rawWo);
      if (rawSpk && rawSpk !== "-" && rawSpk !== "null" && rawSpk !== "undefined") dspRefs.add(rawSpk);
      if (rawReqRef && rawReqRef !== "-" && rawReqRef !== "null" && rawReqRef !== "undefined") dspRefs.add(rawReqRef);

      // Extract Inbound PO / SPK references from notes if present
      // Examples: "Diimpor otomatis dari Inbound Receiving: P36679" or "INBOUND: P36935"
      const m1 = rawNotes.match(/Inbound\s+Receiving:\s*([A-Za-z0-9_.\/-]+)/i);
      if (m1 && m1[1]) dspRefs.add(cleanStr(m1[1]));
      const m2 = rawNotes.match(/INBOUND:\s*([A-Za-z0-9_.\/-]+)/i);
      if (m2 && m2[1]) dspRefs.add(cleanStr(m2[1]));
      const m3 = rawNotes.match(/PO[:\s]+([A-Za-z0-9_.\/-]+)/i);
      if (m3 && m3[1]) dspRefs.add(cleanStr(m3[1]));
      const m4 = rawNotes.match(/SPK[:\s]+([A-Za-z0-9_.\/-]+)/i);
      if (m4 && m4[1]) dspRefs.add(cleanStr(m4[1]));

      const dspTUG8 = dsp.tug8_number || dsp.dispatch_number || `TUG8-${dsp.id}`;
      const dspDate = dsp.dispatch_date || dsp.created_at || "";
      const dspVessel = dsp.vessel_name || "-";

      // If dispatch does NOT have any valid PO/SPK reference, do NOT match any group
      if (dspRefs.size === 0) return;

      const refList = Array.from(dspRefs);

      // Match target PO / SPK groups
      groupMap.forEach(group => {
        const grpSPK = cleanStr(group.spkNumber);
        const grpPO = cleanStr(group.poNumber);

        const isMatch = refList.some(ref => {
          if (!ref || ref.length < 2) return false;
          if (grpPO && grpPO !== "po-non-registered") {
            if (ref === grpPO) return true;
            if (ref.length >= 4 && grpPO.length >= 4 && (ref.includes(grpPO) || grpPO.includes(ref))) return true;
          }
          if (grpSPK && grpSPK !== "-" && grpSPK !== "null") {
            if (ref === grpSPK) return true;
            if (ref.length >= 4 && grpSPK.length >= 4 && (ref.includes(grpSPK) || grpSPK.includes(ref))) return true;
          }
          return false;
        });

        if (isMatch) {
          // Deduct matching items
          dsp.items.forEach(dItem => {
            if (!dItem) return;
            const qtyOut = Number(dItem.qty_dispatched ?? dItem.qty_approved ?? dItem.requested_qty ?? 0);
            if (qtyOut <= 0) return;

            const dId = (dItem.spare_part_id || (dItem as any).id || "").toString().trim().toLowerCase();
            const dPn = cleanStr(dItem.part_number);
            const dName = cleanStr(dItem.spare_part_name || (dItem as any).part_name);

            // Hierarchical matching for items within the PO/SPK group:
            // 1. By exact spare_part_id / id (if non-dummy)
            let targetItem: any = null;
            if (dId && !dId.startsWith("temp-") && !dId.startsWith("item-") && dId !== "-" && dId !== "null" && dId !== "undefined") {
              targetItem = Array.from(group.itemsMap.values()).find(i => 
                (i.sparePartId && i.sparePartId.toLowerCase() === dId) || (i.partKey === `id:${dId}`)
              );
            }

            // 2. By distinct Part Number
            if (!targetItem && dPn && !invalidPns.includes(dPn)) {
              targetItem = Array.from(group.itemsMap.values()).find(i => cleanStr(i.partNumber) === dPn);
            }

            // 3. By Part Name
            if (!targetItem && dName) {
              targetItem = Array.from(group.itemsMap.values()).find(i => cleanStr(i.partName) === dName);
            }

            // 4. Fallback to partKey
            if (!targetItem) {
              const dKey = getPartKey(dItem);
              targetItem = group.itemsMap.get(dKey);
            }

            if (targetItem) {
              targetItem.qtyDispatched += qtyOut;
              targetItem.remainingStock = Math.max(0, targetItem.qtyReceived - targetItem.qtyDispatched);
              targetItem.matchedDispatches.push({
                dispatchId: dsp.id,
                dispatchNumber: dsp.dispatch_number || "-",
                tug8Number: dspTUG8,
                dispatchDate: dspDate,
                vesselName: dspVessel,
                qtyDispatched: qtyOut
              });
            }
          });
        }
      });
    });

    // Convert map to list and compute summary metrics for each PO / SPK
    const result: Array<{
      groupKey: string;
      poNumber: string;
      spkNumber: string;
      deliveryNote: string;
      vendorName: string;
      vesselName: string;
      receivedDate: string;
      receivingIds: string[];
      rawReceivingDocs: InboundReceiving[];
      totalReceived: number;
      totalDispatched: number;
      totalRemaining: number;
      remainingPercent: number;
      status: "AVAILABLE" | "PARTIAL" | "EXHAUSTED";
      items: Array<{
        partKey: string;
        sparePartId: string;
        partName: string;
        partNumber: string;
        unit: string;
        category: string;
        barcode: string;
        locationId: string;
        locationName: string;
        qtyReceived: number;
        qtyDispatched: number;
        remainingStock: number;
        matchedDispatches: Array<{
          dispatchId: string;
          dispatchNumber: string;
          tug8Number: string;
          dispatchDate: string;
          vesselName: string;
          qtyDispatched: number;
        }>;
      }>;
      uniqueDispatches: Array<{
        tug8Number: string;
        dispatchDate: string;
        vesselName: string;
      }>;
    }> = [];

    groupMap.forEach(group => {
      const itemsArr = Array.from(group.itemsMap.values());
      const totalIn = itemsArr.reduce((acc, i) => acc + i.qtyReceived, 0);
      const totalOut = itemsArr.reduce((acc, i) => acc + Math.min(i.qtyReceived, i.qtyDispatched), 0);
      const totalRem = itemsArr.reduce((acc, i) => acc + i.remainingStock, 0);
      const remPct = totalIn > 0 ? Math.round((totalRem / totalIn) * 100) : 0;

      let status: "AVAILABLE" | "PARTIAL" | "EXHAUSTED" = "AVAILABLE";
      if (totalRem === 0) {
        status = "EXHAUSTED";
      } else if (totalOut > 0 && totalRem > 0) {
        status = "PARTIAL";
      }

      // Collect unique dispatches
      const dspSet = new Map<string, { tug8Number: string; dispatchDate: string; vesselName: string }>();
      itemsArr.forEach(i => {
        i.matchedDispatches.forEach(d => {
          if (!dspSet.has(d.tug8Number)) {
            dspSet.set(d.tug8Number, {
              tug8Number: d.tug8Number,
              dispatchDate: d.dispatchDate,
              vesselName: d.vesselName
            });
          }
        });
      });

      result.push({
        groupKey: group.groupKey,
        poNumber: group.poNumber,
        spkNumber: group.spkNumber,
        deliveryNote: group.deliveryNote,
        vendorName: group.vendorName,
        vesselName: group.vesselName,
        receivedDate: group.receivedDate,
        receivingIds: group.receivingIds,
        rawReceivingDocs: group.rawReceivingDocs,
        totalReceived: totalIn,
        totalDispatched: totalOut,
        totalRemaining: totalRem,
        remainingPercent: remPct,
        status,
        items: itemsArr,
        uniqueDispatches: Array.from(dspSet.values())
      });
    });

    return result;
  }, [receivingList, dispatchList, parts, locations]);

  // 2. Compute Consolidated Spare Part Stock on Hand (Tab 2)
  const consolidatedPartBalances = useMemo(() => {
    const partMap = new Map<string, {
      partKey: string;
      sparePartId: string;
      partName: string;
      partNumber: string;
      unit: string;
      category: string;
      barcode: string;
      locationName: string;
      masterCurrentStock: number;
      totalInbound: number;
      totalOutbound: number;
      warehouseBalance: number;
      associatedPOs: Array<{
        poNumber: string;
        spkNumber: string;
        vendorName: string;
        receivedDate: string;
        qtyReceived: number;
        qtyDispatched: number;
        remainingStock: number;
      }>;
      associatedDispatches: Array<{
        tug8Number: string;
        dispatchDate: string;
        vesselName: string;
        qtyDispatched: number;
      }>;
    }>();

    // Accumulate from poSPKBalances
    poSPKBalances.forEach(pGroup => {
      pGroup.items.forEach(itm => {
        if (!partMap.has(itm.partKey)) {
          const matchedMaster = parts.find(p => getPartKey(p) === itm.partKey);
          partMap.set(itm.partKey, {
            partKey: itm.partKey,
            sparePartId: itm.sparePartId,
            partName: itm.partName,
            partNumber: itm.partNumber,
            unit: itm.unit,
            category: itm.category,
            barcode: itm.barcode,
            locationName: itm.locationName,
            masterCurrentStock: Number(matchedMaster?.current_stock ?? itm.remainingStock),
            totalInbound: itm.qtyReceived,
            totalOutbound: Math.min(itm.qtyReceived, itm.qtyDispatched),
            warehouseBalance: itm.remainingStock,
            associatedPOs: [{
              poNumber: pGroup.poNumber,
              spkNumber: pGroup.spkNumber,
              vendorName: pGroup.vendorName,
              receivedDate: pGroup.receivedDate,
              qtyReceived: itm.qtyReceived,
              qtyDispatched: Math.min(itm.qtyReceived, itm.qtyDispatched),
              remainingStock: itm.remainingStock
            }],
            associatedDispatches: [...itm.matchedDispatches]
          });
        } else {
          const existing = partMap.get(itm.partKey)!;
          existing.totalInbound += itm.qtyReceived;
          existing.totalOutbound += Math.min(itm.qtyReceived, itm.qtyDispatched);
          existing.warehouseBalance += itm.remainingStock;
          existing.associatedPOs.push({
            poNumber: pGroup.poNumber,
            spkNumber: pGroup.spkNumber,
            vendorName: pGroup.vendorName,
            receivedDate: pGroup.receivedDate,
            qtyReceived: itm.qtyReceived,
            qtyDispatched: Math.min(itm.qtyReceived, itm.qtyDispatched),
            remainingStock: itm.remainingStock
          });
          itm.matchedDispatches.forEach(d => {
            existing.associatedDispatches.push(d);
          });
        }
      });
    });

    return Array.from(partMap.values());
  }, [poSPKBalances, parts]);

  // 3. Compute KPI Summary Metrics
  const summaryKPIs = useMemo(() => {
    let totalInbound = 0;
    let totalOutbound = 0;
    let totalRemaining = 0;
    let activePOsWithStock = 0;

    poSPKBalances.forEach(p => {
      totalInbound += p.totalReceived;
      totalOutbound += p.totalDispatched;
      totalRemaining += p.totalRemaining;
      if (p.totalRemaining > 0) activePOsWithStock++;
    });

    const activePartsCount = consolidatedPartBalances.filter(p => p.warehouseBalance > 0).length;

    return {
      totalInbound,
      totalOutbound,
      totalRemaining,
      activePOsWithStock,
      totalPOs: poSPKBalances.length,
      activePartsCount,
      totalItemsTracked: consolidatedPartBalances.length
    };
  }, [poSPKBalances, consolidatedPartBalances]);

  // 4. Filtering and Sorting for Tab 1 (PO / SPK Balance)
  const filteredPOSPKBalances = useMemo(() => {
    let list = [...poSPKBalances];

    // By default, exclude PO/SPKs that are fully dispatched (0 warehouse stock)
    if (!showArchivedDispatched) {
      list = list.filter(p => p.totalRemaining > 0);
    }

    // Status Filter
    if (statusFilter === "available") {
      list = list.filter(p => p.status === "AVAILABLE" && p.totalRemaining > 0);
    } else if (statusFilter === "partial") {
      list = list.filter(p => p.status === "PARTIAL" && p.totalRemaining > 0);
    } else if (statusFilter === "exhausted") {
      list = list.filter(p => p.status === "EXHAUSTED" || p.totalRemaining === 0);
    }

    // Vessel Filter
    if (selectedVessel !== "all") {
      list = list.filter(p => cleanStr(p.vesselName).includes(cleanStr(selectedVessel)));
    }

    // Location Filter
    if (selectedLocation !== "all") {
      list = list.filter(p => p.items.some(i => cleanStr(i.locationName).includes(cleanStr(selectedLocation))));
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = cleanStr(searchQuery);
      list = list.filter(p => {
        return (
          cleanStr(p.poNumber).includes(q) ||
          cleanStr(p.spkNumber).includes(q) ||
          cleanStr(p.vendorName).includes(q) ||
          cleanStr(p.vesselName).includes(q) ||
          cleanStr(p.deliveryNote).includes(q) ||
          p.items.some(i => cleanStr(i.partName).includes(q) || cleanStr(i.partNumber).includes(q) || cleanStr(i.barcode).includes(q))
        );
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "remaining_desc") return b.totalRemaining - a.totalRemaining;
      if (sortBy === "remaining_asc") return a.totalRemaining - b.totalRemaining;
      if (sortBy === "date_desc") return new Date(b.receivedDate || 0).getTime() - new Date(a.receivedDate || 0).getTime();
      if (sortBy === "date_asc") return new Date(a.receivedDate || 0).getTime() - new Date(b.receivedDate || 0).getTime();
      if (sortBy === "name_asc") return a.poNumber.localeCompare(b.poNumber);
      return 0;
    });

    return list;
  }, [poSPKBalances, showArchivedDispatched, statusFilter, selectedVessel, selectedLocation, searchQuery, sortBy]);

  // 5. Filtering and Sorting for Tab 2 (Consolidated Suku Cadang)
  const filteredPartBalances = useMemo(() => {
    let list = [...consolidatedPartBalances];

    // By default, exclude spare parts that have 0 balance in warehouse
    if (!showArchivedDispatched) {
      list = list.filter(p => p.warehouseBalance > 0);
    }

    // Status Filter
    if (statusFilter === "available") {
      list = list.filter(p => p.warehouseBalance > 0 && p.totalOutbound === 0);
    } else if (statusFilter === "partial") {
      list = list.filter(p => p.totalOutbound > 0 && p.warehouseBalance > 0);
    } else if (statusFilter === "exhausted") {
      list = list.filter(p => p.warehouseBalance === 0);
    }

    // Location Filter
    if (selectedLocation !== "all") {
      list = list.filter(p => cleanStr(p.locationName).includes(cleanStr(selectedLocation)));
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = cleanStr(searchQuery);
      list = list.filter(p => {
        return (
          cleanStr(p.partName).includes(q) ||
          cleanStr(p.partNumber).includes(q) ||
          cleanStr(p.barcode).includes(q) ||
          cleanStr(p.category).includes(q) ||
          p.associatedPOs.some(po => cleanStr(po.poNumber).includes(q) || cleanStr(po.spkNumber).includes(q) || cleanStr(po.vendorName).includes(q))
        );
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "remaining_desc") return b.warehouseBalance - a.warehouseBalance;
      if (sortBy === "remaining_asc") return a.warehouseBalance - b.warehouseBalance;
      if (sortBy === "name_asc") return a.partName.localeCompare(b.partName);
      return b.warehouseBalance - a.warehouseBalance;
    });

    return list;
  }, [consolidatedPartBalances, showArchivedDispatched, statusFilter, selectedLocation, searchQuery, sortBy]);

  // Extract vessel list options
  const vesselOptions = useMemo(() => {
    const set = new Set<string>();
    poSPKBalances.forEach(p => {
      if (p.vesselName && p.vesselName !== "-") set.add(p.vesselName);
    });
    (vessels || []).forEach(v => {
      if (v.name) set.add(v.name);
    });
    return Array.from(set).sort();
  }, [poSPKBalances, vessels]);

  // -------------------------------------------------------------
  // EXPORT & PRINT HANDLERS
  // -------------------------------------------------------------
  const handleExportCSV = () => {
    if (activeTab === "pospk") {
      const headers = [
        "No",
        "Nomor PO",
        "Nomor SPK",
        "Pemasok (Vendor)",
        "Kapal Target",
        "Tgl Masuk",
        "Nama Suku Cadang",
        "Part Number",
        "Satuan",
        "Lokasi Rak",
        "QTY Inbound (Masuk)",
        "QTY Outbound (Terkirim TUG 8)",
        "Sisa Gudang",
        "Status Ketersediaan",
        "No Dokumen TUG 8 Terkait"
      ];

      const rows: any[][] = [];
      let rowIdx = 1;

      filteredPOSPKBalances.forEach(p => {
        p.items
          .filter(itm => showArchivedDispatched ? true : itm.remainingStock > 0)
          .forEach(itm => {
            const effectiveOut = Math.min(itm.qtyReceived, itm.qtyDispatched);
            const tug8Refs = itm.matchedDispatches.map(d => `${d.tug8Number} (${d.qtyDispatched} ${itm.unit})`).join("; ") || "-";
            rows.push([
              rowIdx++,
              `"${p.poNumber.replace(/"/g, '""')}"`,
              `"${p.spkNumber.replace(/"/g, '""')}"`,
              `"${p.vendorName.replace(/"/g, '""')}"`,
              `"${p.vesselName.replace(/"/g, '""')}"`,
              `"${p.receivedDate.split("T")[0]}"`,
              `"${itm.partName.replace(/"/g, '""')}"`,
              `"${itm.partNumber.replace(/"/g, '""')}"`,
              `"${itm.unit}"`,
              `"${itm.locationName.replace(/"/g, '""')}"`,
              itm.qtyReceived,
              effectiveOut,
              itm.remainingStock,
              itm.remainingStock === 0 ? "Habis Terdistribusi" : itm.qtyDispatched > 0 ? "Sebagian Terkirim" : "Tersedia Utuh",
              `"${tug8Refs.replace(/"/g, '""')}"`
            ]);
          });
      });

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Laporan_Stock_On_Warehouse_PO_SPK_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = [
        "No",
        "Nama Suku Cadang",
        "Part Number",
        "Kategori",
        "Barcode",
        "Lokasi Rak Gudang",
        "Akumulasi Masuk (Inbound)",
        "Akumulasi Keluar (Outbound TUG 8)",
        "Sisa Fisik di Gudang",
        "Satuan",
        "Status Stok",
        "Daftar PO/SPK Asal"
      ];

      const rows = filteredPartBalances.map((itm, idx) => {
        const poRefs = itm.associatedPOs.map(po => `${po.poNumber} (${po.qtyReceived} ${itm.unit})`).join("; ");
        return [
          idx + 1,
          `"${itm.partName.replace(/"/g, '""')}"`,
          `"${itm.partNumber.replace(/"/g, '""')}"`,
          `"${itm.category.replace(/"/g, '""')}"`,
          `"${itm.barcode}"`,
          `"${itm.locationName.replace(/"/g, '""')}"`,
          itm.totalInbound,
          itm.totalOutbound,
          itm.warehouseBalance,
          `"${itm.unit}"`,
          itm.warehouseBalance === 0 ? "Habis" : itm.warehouseBalance <= 5 ? "Menipis" : "Tersedia",
          `"${poRefs.replace(/"/g, '""')}"`
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Laporan_Stock_On_Warehouse_Suku_Cadang_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    setIsRekapModalOpen(true);
  };

  const executeBrowserPrint = () => {
    document.body.classList.add("printing-stock-rekap-active");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-stock-rekap-active");
    }, 1000);
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("stock-rekap-printable-card");
    if (!element) return;
    setIsGeneratingPDF(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      } as any);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`REKAP_STOCK_ON_WAREHOUSE_${dateStr}.pdf`);
    } catch (err) {
      console.error("Gagal export PDF:", err);
      alert("Gagal mengunduh PDF. Silakan gunakan tombol 'Cetak Sekarang' dan pilih 'Save as PDF'.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      
      {/* Top Banner & Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-slate-900 font-display">
                STOCK ON WAREHOUSE
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>REAL-TIME BALANCER</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring ketersediaan fisik stok gudang terintegrasi langsung antara <span className="font-semibold text-blue-700">Receiving (Inbound)</span> dan pengurangan <span className="font-semibold text-rose-700">Dispatch (Outbound TUG 8)</span> per nomor PO/SPK.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 border border-slate-300 shadow-2xs transition-all cursor-pointer"
            title="Export data stok gudang ke CSV/Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 border border-slate-300 shadow-2xs transition-all cursor-pointer"
            title="Cetak ringkasan stok gudang"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Sisa Stok Fisik Gudang */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-white to-white p-4 rounded-2xl border border-emerald-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 font-mono">
                Sisa Stok Fisik Gudang
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Warehouse className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {summaryKPIs.totalRemaining.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Unit Tersedia</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Stok riil di gudang siap kirim</span>
            </div>
          </div>

          {/* Card 2: Total Inbound Penerimaan */}
          <div className="bg-gradient-to-br from-blue-500/10 via-white to-white p-4 rounded-2xl border border-blue-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 font-mono">
                Akumulasi Barang Masuk
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {summaryKPIs.totalInbound.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Total Inbound</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-blue-700 font-medium">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Dari {summaryKPIs.activePOsWithStock} PO/SPK Tersedia di Gudang</span>
            </div>
          </div>

          {/* Card 3: Total Outbound Pengiriman TUG 8 */}
          <div className="bg-gradient-to-br from-indigo-500/10 via-white to-white p-4 rounded-2xl border border-indigo-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 font-mono">
                Akumulasi Barang Terkirim
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {summaryKPIs.totalOutbound.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Terkirim (TUG 8)</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-indigo-700 font-medium">
              <Ship className="w-3.5 h-3.5 text-indigo-600" />
              <span>Distribusi ke kapal armada</span>
            </div>
          </div>

          {/* Card 4: PO/SPK Tersedia di Gudang */}
          <div className="bg-gradient-to-br from-amber-500/10 via-white to-white p-4 rounded-2xl border border-amber-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 font-mono">
                PO / SPK Tersedia di Gudang
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {summaryKPIs.activePOsWithStock}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Dokumen Aktif</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
              <Boxes className="w-3.5 h-3.5 text-amber-600" />
              <span>{summaryKPIs.activePartsCount} jenis sparepart fisik di gudang</span>
            </div>
          </div>

        </div>

        {/* Navigation Tabs (PO/SPK View vs Consolidated Suku Cadang) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
            <button
              onClick={() => setActiveTab("pospk")}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "pospk"
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Rekap Berdasarkan Nomor PO &amp; SPK</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-100 text-blue-800 font-bold">
                {showArchivedDispatched ? poSPKBalances.length : summaryKPIs.activePOsWithStock}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("items")}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "items"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Rekap Seluruh Suku Cadang (Stock On Hand)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-100 text-indigo-800 font-bold">
                {showArchivedDispatched ? consolidatedPartBalances.length : summaryKPIs.activePartsCount}
              </span>
            </button>
          </div>

          {activeTab === "pospk" && (
            <div className="flex items-center gap-2 self-end md:self-auto text-xs font-semibold text-slate-500">
              <button
                onClick={expandAll}
                className="hover:text-blue-600 cursor-pointer underline decoration-dotted"
              >
                Buka Semua Rincian
              </button>
              <span>&bull;</span>
              <button
                onClick={collapseAll}
                className="hover:text-blue-600 cursor-pointer underline decoration-dotted"
              >
                Tutup Semua
              </button>
            </div>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={activeTab === "pospk" 
                  ? "Cari Nomor PO, Nomor SPK, Suku Cadang, Vendor, Kapal..." 
                  : "Cari Nama Suku Cadang, Part Number, Barcode, Kategori, PO..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Vessel Filter */}
            <div className="w-full md:w-52">
              <select
                value={selectedVessel}
                onChange={(e) => setSelectedVessel(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                <option value="all">Semua Kapal Target</option>
                {vesselOptions.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* Sorting */}
            <div className="w-full md:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                <option value="date_desc">Tgl Masuk (Terbaru)</option>
                <option value="date_asc">Tgl Masuk (Terlama)</option>
                <option value="remaining_desc">Sisa Stok (Terbanyak)</option>
                <option value="remaining_asc">Sisa Stok (Tersedikit)</option>
                <option value="name_asc">Urut Nama (A - Z)</option>
              </select>
            </div>

          </div>

          {/* Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
              <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                <span>Status Stok:</span>
              </span>

              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  statusFilter === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua di Gudang ({activeTab === "pospk" 
                  ? (showArchivedDispatched ? poSPKBalances.length : summaryKPIs.activePOsWithStock)
                  : (showArchivedDispatched ? consolidatedPartBalances.length : summaryKPIs.activePartsCount)
                })
              </button>

              <button
                onClick={() => setStatusFilter("available")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  statusFilter === "available"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Stok Tersedia Utuh</span>
              </button>

              <button
                onClick={() => setStatusFilter("partial")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  statusFilter === "partial"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Sebagian Terkirim</span>
              </button>

              {showArchivedDispatched && (
                <button
                  onClick={() => setStatusFilter("exhausted")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    statusFilter === "exhausted"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span>Habis Terdistribusi</span>
                </button>
              )}
            </div>

            {/* Checkbox to reveal 0-stock archived items */}
            <div className="shrink-0 flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showArchivedDispatched}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShowArchivedDispatched(checked);
                    if (!checked && statusFilter === "exhausted") {
                      setStatusFilter("all");
                    }
                  }}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px]">Tampilkan arsip PO/SPK yang sudah habis (0 stok)</span>
              </label>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: REKAP BERDASARKAN NOMOR PO & SPK (PO/SPK BALANCE) */}
        {/* ======================================================== */}
        {activeTab === "pospk" && (
          <div className="space-y-4">
            {filteredPOSPKBalances.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                <Warehouse className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h3 className="text-sm font-bold text-slate-700">Tidak ada data PO / SPK yang sesuai</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Coba ubah kata kunci pencarian atau sesuaikan filter status stok untuk melihat data lainnya.
                </p>
              </div>
            ) : (
              filteredPOSPKBalances.map((group, idx) => {
                const isExpanded = Boolean(expandedKeys[group.groupKey]);

                return (
                  <div 
                    key={group.groupKey}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
                  >
                    {/* Card Header Summary */}
                    <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-slate-50/60">
                      
                      {/* Left: Identitas PO & SPK */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-mono font-bold text-slate-700 text-sm shrink-0">
                          {idx + 1}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-black text-slate-900 tracking-tight bg-blue-50 text-blue-900 px-2 py-0.5 rounded-md border border-blue-200">
                              PO: {group.poNumber}
                            </span>
                            
                            {group.spkNumber && group.spkNumber !== "-" && (
                              <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded-md border border-indigo-200">
                                SPK: {group.spkNumber}
                              </span>
                            )}

                            {group.status === "AVAILABLE" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Stok Tersedia Penuh</span>
                              </span>
                            ) : group.status === "PARTIAL" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-amber-100 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Sebagian Terkirim</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-slate-100 text-slate-600 border border-slate-300">
                                <XCircle className="w-3 h-3 text-slate-500" />
                                <span>Habis Terdistribusi</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                            <div className="flex items-center gap-1.5 font-medium">
                              <Truck className="w-3.5 h-3.5 text-slate-400" />
                              <span>Vendor: <strong className="text-slate-700">{group.vendorName}</strong></span>
                            </div>
                            <span>&bull;</span>
                            <div className="flex items-center gap-1.5 font-medium">
                              <Ship className="w-3.5 h-3.5 text-slate-400" />
                              <span>Kapal Target: <strong className="text-slate-700">{group.vesselName}</strong></span>
                            </div>
                            <span>&bull;</span>
                            <div className="flex items-center gap-1.5 font-medium font-mono">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>Tgl Masuk: {group.receivedDate ? group.receivedDate.split("T")[0] : "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Balance Metrics & Action */}
                      <div className="flex items-center gap-4 self-end lg:self-center flex-wrap">
                        
                        {/* Progress Bar & Numerical Balance */}
                        <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs font-mono">
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">
                              Masuk vs Terkirim
                            </div>
                            <div className="text-xs font-bold text-slate-700">
                              <span className="text-blue-700">{group.totalReceived}</span>
                              <span className="text-slate-300 mx-1">/</span>
                              <span className="text-indigo-700">{group.totalDispatched} Kirim</span>
                            </div>
                          </div>

                          <div className="w-px h-8 bg-slate-200"></div>

                          <div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold">
                              Sisa Gudang
                            </div>
                            <div className={`text-base font-black ${
                              group.totalRemaining > 0 ? "text-emerald-700" : "text-slate-400"
                            }`}>
                              {group.totalRemaining} <span className="text-[10px] font-normal text-slate-500">Unit</span>
                            </div>
                          </div>

                          <div className="w-16 hidden sm:block">
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  group.remainingPercent > 50 ? "bg-emerald-500" : group.remainingPercent > 0 ? "bg-amber-500" : "bg-slate-300"
                                }`}
                                style={{ width: `${Math.min(100, group.remainingPercent)}%` }}
                              />
                            </div>
                            <div className="text-[9px] text-slate-400 text-center mt-0.5">
                              {group.remainingPercent}% Sisa
                            </div>
                          </div>
                        </div>

                        {/* Expand Button */}
                        {(() => {
                          const availableItemsCount = group.items.filter(i => i.remainingStock > 0).length;
                          return (
                            <button
                              onClick={() => toggleExpand(group.groupKey)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isExpanded 
                                  ? "bg-slate-900 text-white" 
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              }`}
                            >
                              <span>
                                {isExpanded 
                                  ? "Tutup Rincian" 
                                  : showArchivedDispatched
                                    ? `Rincian (${group.items.length} Item)`
                                    : `Rincian (${availableItemsCount} Item di Gudang)`
                                }
                              </span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                          );
                        })()}

                      </div>

                    </div>

                    {/* Expandable Breakdown Table */}
                    {isExpanded && (() => {
                      const displayedItems = group.items.filter(itm => showArchivedDispatched ? true : itm.remainingStock > 0);
                      const exhaustedCount = group.items.length - displayedItems.length;

                      return (
                        <div className="border-t border-slate-200 bg-slate-50/50 p-4 sm:p-5">
                          
                          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-1.5">
                              <Boxes className="w-4 h-4 text-blue-600" />
                              <span>
                                {showArchivedDispatched 
                                  ? `Seluruh Suku Cadang pada PO: ${group.poNumber}` 
                                  : `Daftar Suku Cadang Tersedia di Gudang pada PO: ${group.poNumber} (${displayedItems.length} Item Fisik)`
                                }
                              </span>
                            </div>
                            {exhaustedCount > 0 && !showArchivedDispatched && (
                              <button
                                onClick={() => setShowArchivedDispatched(true)}
                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                              >
                                Tampilkan juga {exhaustedCount} item yang sudah terkirim habis
                              </button>
                            )}
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100/80 text-slate-600 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                  <th className="py-2.5 px-3 text-center">No</th>
                                  <th className="py-2.5 px-4 font-bold">Nama Suku Cadang</th>
                                  <th className="py-2.5 px-3">Part Number</th>
                                  <th className="py-2.5 px-3">Lokasi Gudang</th>
                                  <th className="py-2.5 px-3 text-center">Satuan</th>
                                  <th className="py-2.5 px-3 text-center bg-blue-50/60 font-bold text-blue-900">QTY Masuk (Inbound)</th>
                                  <th className="py-2.5 px-3 text-center bg-indigo-50/60 font-bold text-indigo-900">QTY Terkirim (TUG 8)</th>
                                  <th className="py-2.5 px-3 text-center bg-emerald-50/80 font-black text-emerald-900">Sisa di Gudang</th>
                                  <th className="py-2.5 px-3 text-center">Status Item</th>
                                  <th className="py-2.5 px-3">Dokumen TUG 8 Pengiriman</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {displayedItems.length === 0 ? (
                                  <tr>
                                    <td colSpan={10} className="py-6 text-center text-slate-400">
                                      Tidak ada item yang tersisa di gudang untuk dokumen ini.
                                    </td>
                                  </tr>
                                ) : (
                                  displayedItems.map((itm, iIdx) => {
                                    const effectiveOut = Math.min(itm.qtyReceived, itm.qtyDispatched);
                                    return (
                                      <tr key={itm.partKey} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">
                                          {iIdx + 1}
                                        </td>
                                        
                                        <td className="py-2.5 px-4">
                                          <div className="font-bold text-slate-900 leading-snug">
                                            {itm.partName}
                                          </div>
                                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                                            <span>Kat: {itm.category}</span>
                                            {itm.barcode && itm.barcode !== "-" && (
                                              <span>&bull; BC: {itm.barcode}</span>
                                            )}
                                          </div>
                                        </td>

                                        <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                                          {itm.partNumber || "-"}
                                        </td>

                                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                          <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="truncate max-w-[140px]" title={itm.locationName}>
                                              {itm.locationName}
                                            </span>
                                          </div>
                                        </td>

                                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                                          {itm.unit}
                                        </td>

                                        <td className="py-2.5 px-3 text-center font-mono text-sm font-bold text-blue-700 bg-blue-50/30">
                                          {itm.qtyReceived}
                                        </td>

                                        <td className="py-2.5 px-3 text-center font-mono text-sm font-bold text-indigo-700 bg-indigo-50/30">
                                          {effectiveOut}
                                        </td>

                                        <td className="py-2.5 px-3 text-center font-mono text-sm font-black bg-emerald-50/40">
                                          <span className={`inline-block px-2 py-0.5 rounded-lg ${
                                            itm.remainingStock > 0 
                                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold" 
                                              : "bg-slate-100 text-slate-400 font-normal"
                                          }`}>
                                            {itm.remainingStock}
                                          </span>
                                        </td>

                                        <td className="py-2.5 px-3 text-center">
                                          {itm.remainingStock === itm.qtyReceived ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-bold uppercase font-mono bg-emerald-100 text-emerald-800">
                                              Tersedia Utuh
                                            </span>
                                          ) : itm.remainingStock > 0 ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-bold uppercase font-mono bg-amber-100 text-amber-800">
                                              Parsial ({itm.remainingStock})
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-bold uppercase font-mono bg-slate-100 text-slate-600">
                                              Habis Terkirim
                                            </span>
                                          )}
                                        </td>

                                        <td className="py-2.5 px-3 text-[11px] font-mono text-slate-600">
                                          {itm.matchedDispatches.length === 0 ? (
                                            <span className="text-slate-400 italic">Belum Ada TUG 8</span>
                                          ) : (
                                            <div className="flex flex-col gap-1">
                                              {itm.matchedDispatches.map((d, dIdx) => (
                                                <div key={dIdx} className="flex items-center gap-1.5 text-[10px]">
                                                  <span className="font-bold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded">
                                                    {d.tug8Number}
                                                  </span>
                                                  <span className="text-slate-500">
                                                    (-{d.qtyDispatched} {itm.unit}) &bull; {d.vesselName}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>

                          {exhaustedCount > 0 && !showArchivedDispatched && (
                            <div className="mt-2.5 px-3 py-2 bg-slate-100/80 rounded-xl text-[11px] text-slate-500 flex items-center justify-between">
                              <span>
                                * Menampilkan <strong>{displayedItems.length}</strong> jenis item yang masih bersisa di gudang ({exhaustedCount} item telah terkirim habis dan disembunyikan).
                              </span>
                              <button
                                onClick={() => setShowArchivedDispatched(true)}
                                className="text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer shrink-0 ml-2"
                              >
                                Tampilkan Semua
                              </button>
                            </div>
                          )}

                          {/* Document Trail Summary */}
                          <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 text-slate-500">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                Dokumen Sumber Inbound: <strong className="text-slate-700">{group.receivingIds.length} Penerimaan</strong> &bull; Surat Jalan: <span className="font-mono text-slate-700">{group.deliveryNote}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {group.uniqueDispatches.length > 0 && (
                                <div className="flex items-center gap-1 text-[11px] text-indigo-700 font-mono">
                                  <span>TUG 8 Terkait:</span>
                                  {group.uniqueDispatches.map(d => (
                                    <span key={d.tug8Number} className="bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-bold">
                                      {d.tug8Number}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {onNavigateTab && (
                                <button
                                  onClick={() => onNavigateTab("dispatch")}
                                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <span>Buka Menu Dispatch (TUG 8)</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })()}

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: REKAP SELURUH SUKU CADANG GUDANG (STOCK ON HAND)  */}
        {/* ======================================================== */}
        {activeTab === "items" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Boxes className="w-4 h-4 text-indigo-600" />
                <span>
                  {showArchivedDispatched
                    ? `Seluruh Suku Cadang Terdata (${filteredPartBalances.length} Jenis Barang)`
                    : `Suku Cadang Tersedia di Gudang (${filteredPartBalances.length} Jenis Barang Fisik)`
                  }
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Sinkron otomatis antara Inbound vs Outbound
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 text-slate-600 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 text-center">No</th>
                    <th className="py-3 px-4 font-bold">Suku Cadang</th>
                    <th className="py-3 px-3">Part Number</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3">Lokasi Rak</th>
                    <th className="py-3 px-3 text-center">Satuan</th>
                    <th className="py-3 px-3 text-center bg-blue-50/60 font-bold text-blue-900">Total Masuk (Inbound)</th>
                    <th className="py-3 px-3 text-center bg-indigo-50/60 font-bold text-indigo-900">Total Keluar (TUG 8)</th>
                    <th className="py-3 px-3 text-center bg-emerald-50/80 font-black text-emerald-900">Sisa Riil di Gudang</th>
                    <th className="py-3 px-3 text-center">Status Stok</th>
                    <th className="py-3 px-4">Daftar PO / SPK Asal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredPartBalances.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <Boxes className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <span>Tidak ditemukan suku cadang yang sesuai filter.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredPartBalances.map((itm, idx) => {
                      return (
                        <tr key={itm.partKey} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold">
                            {idx + 1}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 leading-snug">
                              {itm.partName}
                            </div>
                            {itm.barcode && itm.barcode !== "-" && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                BC: {itm.barcode}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                            {itm.partNumber || "-"}
                          </td>

                          <td className="py-3 px-3 text-slate-600 text-[11px]">
                            {itm.category || "General Spares"}
                          </td>

                          <td className="py-3 px-3 text-slate-600 text-[11px]">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[130px]" title={itm.locationName}>
                                {itm.locationName}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                            {itm.unit}
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-sm font-bold text-blue-700 bg-blue-50/20">
                            {itm.totalInbound}
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-sm font-bold text-indigo-700 bg-indigo-50/20">
                            {itm.totalOutbound}
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-base font-black bg-emerald-50/40">
                            <span className={`inline-block px-2.5 py-0.5 rounded-lg ${
                              itm.warehouseBalance > 0
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300 font-black shadow-2xs"
                                : "bg-slate-100 text-slate-400 font-normal"
                            }`}>
                              {itm.warehouseBalance}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            {itm.warehouseBalance > 5 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono bg-emerald-100 text-emerald-800">
                                Aman
                              </span>
                            ) : itm.warehouseBalance > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono bg-amber-100 text-amber-800">
                                Menipis
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono bg-rose-100 text-rose-800">
                                Habis
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {itm.associatedPOs
                                .filter(po => showArchivedDispatched ? true : po.remainingStock > 0)
                                .slice(0, 3)
                                .map((po, pIdx) => (
                                  <span 
                                    key={pIdx}
                                    className="font-mono text-[9.5px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                                    title={`Vendor: ${po.vendorName} | Masuk: ${po.qtyReceived} ${itm.unit} | Sisa: ${po.remainingStock} ${itm.unit}`}
                                  >
                                    {po.poNumber} ({po.remainingStock})
                                  </span>
                              ))}
                              {itm.associatedPOs.filter(po => showArchivedDispatched ? true : po.remainingStock > 0).length > 3 && (
                                <span className="font-mono text-[9px] text-slate-400 self-center">
                                  +{itm.associatedPOs.filter(po => showArchivedDispatched ? true : po.remainingStock > 0).length - 3} lagi
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL RESMI CETAK REKAPITULASI STOK FISIK GUDANG (A4 PDF & PRINT) */}
      {isRekapModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-[9999] p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto stock-rekap-print-modal">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full print:rounded-none">
            
            {/* Top Action Bar (Hidden on Print) */}
            <div className="bg-slate-900 text-white px-6 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 no-print shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide">
                    Cetak Rekap Ketersediaan Stok Fisik Gudang (Stock On Warehouse)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Format Resmi A4 • PT. Pelayaran Bahtera Adhiguna • Gudang Merak
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isGeneratingPDF}
                  onClick={handleDownloadPDF}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Unduh file dokumen dalam format PDF"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Membuat PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Unduh PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={executeBrowserPrint}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
                  title="Cetak langsung ke printer atau Simpan sebagai PDF (A4)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Sekarang (Print A4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRekapModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-2"
                  title="Tutup Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Scrollable Sheet Area */}
            <div id="stock-rekap-printable-area" className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/70 print:bg-white print:p-0">
              <div id="stock-rekap-printable-card" className="max-w-4xl mx-auto bg-white border border-slate-300 shadow-xl rounded-sm p-6 sm:p-8 md:p-10 print:p-0 print:border-none print:shadow-none print:max-w-full print:w-full">
                
                {/* 1. Official Letterhead */}
                <div className="border-b-2 border-double border-slate-900 pb-3 mb-4 flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <img 
                      src="/bag-logo.jpg" 
                      alt="BAG Logo" 
                      className="h-12 md:h-14 w-auto object-contain shrink-0" 
                      onError={(e)=>{ (e.target as HTMLElement).style.display='none'; }} 
                    />
                    <div>
                      <h1 className="font-display font-bold text-base md:text-lg leading-tight uppercase tracking-tight text-slate-950">
                        PT. PELAYARAN BAHTERA ADHIGUNA (BAG)
                      </h1>
                      <p className="text-[9.5px] md:text-[10px] text-slate-600 font-mono leading-relaxed">
                        Maritime Logistics and Spares Warehouse<br />
                        Jl. Yos Sudarso No 193 Tanjung Sekong, Merak, Banten<br />
                        Phone: (021) 229-099-01 • Email: warehouse.merak@bahteraadhiguna.co.id
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-slate-900 text-white font-mono text-[9px] font-bold rounded uppercase tracking-wider">
                      FORM WH-REKAP-01
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      ERP WMS BALANCER
                    </div>
                  </div>
                </div>

                {/* 2. Document Title */}
                <div className="text-center my-4 pb-3 border-b border-slate-300">
                  <h2 className="text-base md:text-lg font-black tracking-wide uppercase text-slate-950 font-display">
                    LAPORAN REKAPITULASI KETERSEDIAAN STOK FISIK GUDANG
                  </h2>
                  <p className="text-[10.5px] font-mono text-slate-600 font-semibold uppercase mt-0.5">
                    (REAL-TIME STOCK ON WAREHOUSE BALANCER • INBOUND RECEIVING VS OUTBOUND TUG 8)
                  </p>
                </div>

                {/* 3. Meta Particulars */}
                <div className="grid grid-cols-2 gap-4 border border-slate-900/80 p-3 rounded text-xs font-mono uppercase bg-slate-50/60 mb-4 print:border-slate-800">
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex">
                      <span className="w-32 text-slate-500 shrink-0">Fasilitas Gudang:</span>
                      <strong className="text-slate-950 font-bold">WAREHOUSE MERAK (WH-MERAK)</strong>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-slate-500 shrink-0">Tanggal Cetak:</span>
                      <strong className="text-slate-950 font-bold">
                        {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                      </strong>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-slate-500 shrink-0">Filter Armada:</span>
                      <strong className="text-blue-900 font-bold">
                        {selectedVessel === "all" ? "Semua Armada Kapal" : selectedVessel}
                      </strong>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex">
                      <span className="w-32 text-slate-500 shrink-0">Petugas Cetak:</span>
                      <strong className="text-slate-950 font-bold">
                        {currentUser?.name || "MAGHFUR MUHAMMAD ALFIN"} ({currentUser?.role || "Warehouse Admin"})
                      </strong>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-slate-500 shrink-0">Status Sistem:</span>
                      <strong className="text-emerald-700 font-bold">TERVALIDASI REAL-TIME WMS</strong>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-slate-500 shrink-0">Dokumen PO/SPK:</span>
                      <strong className="text-slate-950 font-bold">{summaryKPIs.activePOsWithStock} PO Aktif Tersedia</strong>
                    </div>
                  </div>
                </div>

                {/* 4. KPI Indicators Summary Badges */}
                <div className="grid grid-cols-4 gap-2 mb-4 font-mono">
                  <div className="p-2 border border-emerald-400 bg-emerald-50/60 rounded text-center">
                    <span className="text-[9px] text-emerald-800 font-bold block uppercase">Sisa Stok Fisik Gudang</span>
                    <strong className="text-sm md:text-base font-black text-emerald-950">{summaryKPIs.totalRemaining.toLocaleString()} Unit</strong>
                  </div>
                  <div className="p-2 border border-blue-400 bg-blue-50/60 rounded text-center">
                    <span className="text-[9px] text-blue-800 font-bold block uppercase">Total Barang Masuk (In)</span>
                    <strong className="text-sm md:text-base font-black text-blue-950">{summaryKPIs.totalInbound.toLocaleString()} Unit</strong>
                  </div>
                  <div className="p-2 border border-indigo-400 bg-indigo-50/60 rounded text-center">
                    <span className="text-[9px] text-indigo-800 font-bold block uppercase">Total Terkirim (Out)</span>
                    <strong className="text-sm md:text-base font-black text-indigo-950">{summaryKPIs.totalOutbound.toLocaleString()} Unit</strong>
                  </div>
                  <div className="p-2 border border-slate-400 bg-slate-50 rounded text-center">
                    <span className="text-[9px] text-slate-700 font-bold block uppercase">PO/SPK Fisik Tersedia</span>
                    <strong className="text-sm md:text-base font-black text-slate-950">{summaryKPIs.activePOsWithStock} Dokumen</strong>
                  </div>
                </div>

                {/* 5. Detailed Breakdown Table (Grouped per PO/SPK) */}
                <div className="space-y-4 mb-6">
                  {filteredPOSPKBalances.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-mono border border-dashed border-slate-300 rounded">
                      Tidak ada data stok gudang yang sesuai dengan kriteria filter saat ini.
                    </div>
                  ) : (
                    filteredPOSPKBalances.map((group, gIdx) => {
                      const availableItems = group.items.filter(i => showArchivedDispatched ? true : i.remainingStock > 0);
                      if (availableItems.length === 0) return null;

                      return (
                        <div key={group.groupKey || gIdx} className="border border-slate-800 rounded overflow-hidden break-inside-avoid mb-3">
                          {/* Group Banner */}
                          <div className="bg-slate-100 border-b border-slate-800 px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-blue-900">
                                PO/SPK: {group.spkNumber}
                              </span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-700 font-medium truncate max-w-xs">
                                Vendor: {group.vendorName}
                              </span>
                              <span className="text-slate-400">•</span>
                              <span className="text-indigo-900 font-bold">
                                Kapal: {group.vesselName}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10.5px]">
                              <span>Tgl Masuk: <strong>{group.receivedDate}</strong></span>
                              <span className="px-2 py-0.5 rounded font-black text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Sisa Gudang: {group.totalRemaining} Unit
                              </span>
                            </div>
                          </div>

                          {/* Group Items Table */}
                          <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-300 text-[9.5px] font-bold text-slate-700 uppercase tracking-wider">
                              <tr>
                                <th className="px-2 py-1.5 border-r border-slate-300 text-center w-8">#</th>
                                <th className="px-3 py-1.5 border-r border-slate-300">NAMA SUKU CADANG</th>
                                <th className="px-3 py-1.5 border-r border-slate-300 text-center w-28">PART NUMBER</th>
                                <th className="px-3 py-1.5 border-r border-slate-300 w-32">LOKASI RAK</th>
                                <th className="px-2 py-1.5 border-r border-slate-300 text-center w-16 text-blue-800">MASUK</th>
                                <th className="px-2 py-1.5 border-r border-slate-300 text-center w-16 text-indigo-800">TERKIRIM</th>
                                <th className="px-2 py-1.5 border-r border-slate-300 text-center w-16 text-emerald-900 font-black bg-emerald-50/50">SISA GUDANG</th>
                                <th className="px-2 py-1.5 border-r border-slate-300 text-center w-12">STN</th>
                                <th className="px-2 py-1.5 text-center w-20">STATUS</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-[10.5px]">
                              {availableItems.map((itm, iIdx) => (
                                <tr key={iIdx} className="hover:bg-slate-50/50">
                                  <td className="px-2 py-1.5 border-r border-slate-300 text-center font-mono text-slate-500">
                                    {iIdx + 1}
                                  </td>
                                  <td className="px-3 py-1.5 border-r border-slate-300 font-medium text-slate-900">
                                    <div>{itm.partName}</div>
                                    {itm.barcode && itm.barcode !== "-" && (
                                      <div className="text-[9px] text-slate-400 font-mono">BC: {itm.barcode}</div>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 border-r border-slate-300 text-center font-mono text-slate-700">
                                    {itm.partNumber || "-"}
                                  </td>
                                  <td className="px-3 py-1.5 border-r border-slate-300 text-slate-600 truncate max-w-[120px]">
                                    {itm.locationName}
                                  </td>
                                  <td className="px-2 py-1.5 border-r border-slate-300 text-center font-mono font-bold text-blue-800">
                                    {itm.qtyReceived}
                                  </td>
                                  <td className="px-2 py-1.5 border-r border-slate-300 text-center font-mono font-bold text-indigo-800">
                                    {itm.qtyDispatched}
                                  </td>
                                  <td className="px-2 py-1.5 border-r border-slate-300 text-center font-mono font-black text-emerald-950 bg-emerald-50/40">
                                    {itm.remainingStock}
                                  </td>
                                  <td className="px-2 py-1.5 border-r border-slate-300 text-center font-mono text-slate-600">
                                    {itm.unit}
                                  </td>
                                  <td className="px-2 py-1.5 text-center font-mono text-[9.5px]">
                                    {itm.remainingStock > 0 ? (
                                      <span className="font-bold text-emerald-700">Tersedia</span>
                                    ) : (
                                      <span className="text-slate-400">Habis</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 6. Digital Signatures (Tanda Tangan Resmi Berjenjang) */}
                <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-2 gap-8 break-inside-avoid">
                  <div className="text-center font-mono">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Dibuat & Diperiksa Oleh,</div>
                    <div className="text-[11px] font-bold text-slate-900 uppercase mt-0.5">Petugas Gudang Logistik</div>
                    <div className="h-16 flex items-center justify-center my-1.5">
                      <div className="px-3 py-1 bg-slate-50 border border-slate-300 rounded text-[9.5px] text-slate-600 font-mono">
                        ✓ Terverifikasi Digital Sistem WMS
                      </div>
                    </div>
                    <div className="font-bold text-xs uppercase text-slate-950 border-t border-slate-400 pt-1 inline-block min-w-[180px]">
                      Aldi Hidayat
                    </div>
                    <div className="text-[9.5px] text-slate-500">Petugas Gudang Merak</div>
                  </div>

                  <div className="text-center font-mono">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Mengetahui & Menyetujui,</div>
                    <div className="text-[11px] font-bold text-slate-900 uppercase mt-0.5">Kepala Gudang Merak</div>
                    <div className="h-16 flex items-center justify-center my-1.5">
                      <div className="px-3 py-1 bg-emerald-50 border border-emerald-300 rounded text-[9.5px] text-emerald-800 font-mono font-bold">
                        ✓ Tervalidasi Kepala Gudang
                      </div>
                    </div>
                    <div className="font-bold text-xs uppercase text-slate-950 border-t border-slate-400 pt-1 inline-block min-w-[180px]">
                      MAGHFUR MUHAMMAD ALFIN
                    </div>
                    <div className="text-[9.5px] text-slate-500">Kepala Gudang Merak (PT. BAG)</div>
                  </div>
                </div>

                {/* 7. Document Security Footer */}
                <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400 font-mono flex items-center justify-between">
                  <span>Dicetak otomatis dari Sistem WMS PT. Pelayaran Bahtera Adhiguna</span>
                  <span>Dokumen Rekapitulasi Fisik Stok Gudang Merak</span>
                </div>

              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
