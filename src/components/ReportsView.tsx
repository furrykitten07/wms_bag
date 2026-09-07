/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  MovementLedgerEntry, 
  SparePart,
  InboundReceiving,
  OutboundDispatch,
  SPKWorkOrder,
  MaterialRequest,
  MaterialReturn,
  TransactionType
} from "../types.js";
import { 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Printer, 
  RefreshCw, 
  Clock, 
  Layers, 
  Info,
  CheckCircle,
  Hash,
  Ship,
  Package,
  Send,
  RotateCcw,
  Building2,
  FileSpreadsheet
} from "lucide-react";

interface ReportsViewProps {
  movements: MovementLedgerEntry[];
  parts: SparePart[];
  receivingList?: InboundReceiving[];
  dispatchList?: OutboundDispatch[];
  spkList?: SPKWorkOrder[];
  materialRequests?: MaterialRequest[];
  materialReturns?: MaterialReturn[];
  onPrintReport: (filteredMovements: MovementLedgerEntry[], stats: any, timeFilter: string) => void;
  onPrintSPKReport?: (spkData: any) => void;
}

export default function ReportsView({ 
  movements, 
  parts, 
  receivingList, 
  dispatchList, 
  spkList,
  materialRequests,
  materialReturns,
  onPrintReport,
  onPrintSPKReport
}: ReportsViewProps) {
  // View Mode: "spk" (Grouped by SPK & TUG Flow), "ref" (Grouped by Reference Number), or "flat" (Flat Movement Ledger)
  const [viewMode, setViewMode] = useState<"spk" | "ref" | "flat">("spk");

  // Filters State
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "all" | "custom">("month");
  const [dateFrom, setDateFrom] = useState<string>(() => {
    // Default to 30 days ago
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  
  const [typeFilter, setTypeFilter] = useState<"all" | "in" | "out">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const safeFormatDate = (dateVal?: any, options?: Intl.DateTimeFormatOptions) => {
    if (!dateVal) return "-";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("id-ID", options);
  };

  const safeFormatTime = (dateVal?: any) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Compile all combined movements from movements, receivingList (Inbound), and dispatchList (Outbound)
  const allCombinedMovements = useMemo(() => {
    const list: MovementLedgerEntry[] = [...movements];
    const existingIds = new Set(movements.map(m => m.id));

    // 1. Convert Inbound Receiving records into ledger entries
    if (receivingList && receivingList.length > 0) {
      receivingList.forEach(rec => {
        if (!rec || !rec.items) return;
        (rec.items || []).forEach((item, idx) => {
          if (!item) return;
          const entryId = `rec-${rec.id}-${item.spare_part_id || idx}`;
          if (!existingIds.has(entryId)) {
            const qty = item.qty_received || item.qty_ordered || 0;
            list.push({
              id: entryId,
              transaction_type: TransactionType.RECEIVING,
              spare_part_id: item.spare_part_id,
              spare_part_name: item.spare_part_name,
              part_number: item.part_number,
              qty_in: qty,
              qty_out: 0,
              before_stock: 0,
              after_stock: qty,
              reference_number: rec.purchase_order_num || rec.delivery_note_num || `PO-${rec.id}`,
              remarks: `Inbound PO | Vendor: ${rec.vendor_name || '-'} | DN: ${rec.delivery_note_num || '-'} | Status: ${rec.status}`,
              transaction_date: rec.received_date || new Date().toISOString(),
              created_by: rec.created_by || "Ahmad Subarjo (Staff 1)"
            });
          }
        });
      });
    }

    // 2. Convert Outbound Dispatch records into ledger entries
    if (dispatchList && dispatchList.length > 0) {
      dispatchList.forEach(dsp => {
        if (!dsp || !dsp.items) return;
        (dsp.items || []).forEach((item, idx) => {
          if (!item) return;
          const entryId = `dsp-${dsp.id}-${item.spare_part_id || idx}`;
          if (!existingIds.has(entryId)) {
            const qty = item.qty_dispatched || item.qty_requested || 0;
            list.push({
              id: entryId,
              transaction_type: TransactionType.DISPATCH,
              spare_part_id: item.spare_part_id,
              spare_part_name: item.spare_part_name,
              part_number: item.part_number,
              qty_in: 0,
              qty_out: qty,
              before_stock: qty,
              after_stock: 0,
              reference_number: dsp.tug8_number || dsp.dispatch_number || dsp.surat_jalan_number || dsp.bon_pengeluaran_number || `DSP-${dsp.id}`,
              remarks: `Outbound TUG 8 | Kapal: ${dsp.vessel_name || '-'} | Tujuan: ${dsp.destination_port || 'Pelabuhan'} | Transporter: ${dsp.transporter_name || '-'}`,
              transaction_date: dsp.dispatch_date || dsp.created_at || new Date().toISOString(),
              created_by: dsp.created_by || "Ahmad Subarjo (Staff 1)"
            });
          }
        });
      });
    }

    return list.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [movements, receivingList, dispatchList]);

  // Group movements & items by SPK & TUG Flow
  const spkGroupedList = useMemo(() => {
    const spks = (spkList && spkList.length > 0) ? spkList.filter(Boolean) : [
      {
        id: "spk-seed-1",
        spk_number: "SPK-2026-0001",
        target_port: "Pelabuhan Merak, Banten",
        status: "Dispatched" as const,
        created_at: "2026-06-15T09:00:00.000Z",
        created_by: "Budi Santoso",
        vessels: [
          {
            vessel_name: "MV. KARTINI BARUNA",
            items: [
              { spare_part_id: "sp-1", spare_part_name: "Main Engine Piston Ring Set", part_number: "ME-PR-9921", qty_to_pick: 12, unit: "SET" },
              { spare_part_id: "sp-2", spare_part_name: "Auxiliary Fuel Injector Valve", part_number: "AF-IV-4010", qty_to_pick: 6, unit: "PCS" }
            ]
          }
        ]
      },
      {
        id: "spk-seed-2",
        spk_number: "SPK-2026-0002",
        target_port: "Pelabuhan Tanjung Priok, Jakarta",
        status: "Picked & Ready" as const,
        created_at: "2026-06-20T10:00:00.000Z",
        created_by: "Ahmad Subarjo",
        vessels: [
          {
            vessel_name: "TB Adhiguna Power 02",
            items: [
              { spare_part_id: "sp-3", spare_part_name: "Centrifugal Sea Water Pump Impeller", part_number: "SW-PI-8802", qty_to_pick: 2, unit: "UNIT" }
            ]
          }
        ]
      }
    ];

    return spks.map(spk => {
      if (!spk) return null;
      const matchingTug5 = (materialRequests || []).find(
        mr => mr && (mr.work_order_ref === spk.spk_number || mr.spk_number === spk.spk_number || (mr as any).spk_id === spk.id)
      );
      const matchingTug8 = (dispatchList || []).find(
        d => d && (d.spk_number === spk.spk_number || d.spk_id === spk.id || d.work_order_ref === spk.spk_number)
      );
      const matchingTug10 = (materialReturns || []).find(
        r => r && (r.spk_number === spk.spk_number || r.spk_id === spk.id || r.work_order_number === spk.spk_number)
      );

      const itemMap: { [key: string]: any } = {};

      (spk.vessels || []).forEach(v => {
        if (!v || !v.items) return;
        (v.items || []).forEach(it => {
          if (!it) return;
          itemMap[it.spare_part_id] = {
            spare_part_id: it.spare_part_id,
            spare_part_name: it.spare_part_name,
            part_number: it.part_number,
            unit: it.unit,
            qty_spk: it.qty_to_pick,
            qty_tug5: 0,
            qty_tug8: 0,
            qty_tug10: 0,
            remarks: `Alokasi Kapal ${v.vessel_name || '-'}`
          };
        });
      });

      if (matchingTug5 && matchingTug5.items) {
        matchingTug5.items.forEach(it => {
          if (!it) return;
          const curr = itemMap[it.spare_part_id] || {
            spare_part_id: it.spare_part_id,
            spare_part_name: it.spare_part_name,
            part_number: it.part_number,
            unit: it.unit,
            qty_spk: 0,
            qty_tug5: 0,
            qty_tug8: 0,
            qty_tug10: 0,
            remarks: it.notes || "Permintaan TUG 5"
          };
          curr.qty_tug5 = it.requested_qty;
          itemMap[it.spare_part_id] = curr;
        });
      }

      if (matchingTug8 && matchingTug8.items) {
        matchingTug8.items.forEach(it => {
          if (!it) return;
          const curr = itemMap[it.spare_part_id] || {
            spare_part_id: it.spare_part_id,
            spare_part_name: it.spare_part_name || (it as any).part_name,
            part_number: it.part_number,
            unit: it.unit,
            qty_spk: 0,
            qty_tug5: 0,
            qty_tug8: 0,
            qty_tug10: 0,
            remarks: (it as any).notes || "Outbound TUG 8"
          };
          curr.qty_tug8 = it.qty_dispatched;
          itemMap[it.spare_part_id] = curr;
        });
      }

      if (matchingTug10 && matchingTug10.items) {
        matchingTug10.items.forEach(it => {
          if (!it) return;
          const curr = itemMap[it.spare_part_id] || {
            spare_part_id: it.spare_part_id,
            spare_part_name: it.part_name || (it as any).spare_part_name,
            part_number: it.part_number,
            unit: it.unit,
            qty_spk: 0,
            qty_tug5: 0,
            qty_tug8: 0,
            qty_tug10: 0,
            remarks: it.notes || "Return TUG 10"
          };
          curr.qty_tug10 = it.qty_returned;
          itemMap[it.spare_part_id] = curr;
        });
      }

      const itemsList = Object.values(itemMap).map(it => ({
        ...it,
        qty_tug8: it.qty_tug8 || it.qty_spk || 1,
        qty_net: Math.max(0, (it.qty_tug8 || it.qty_spk || 1) - (it.qty_tug10 || 0))
      }));

      const vList = Array.isArray(spk.vessels) ? spk.vessels : [];
      const primaryVessel = (vList[0] && vList[0].vessel_name) ? vList[0].vessel_name : (matchingTug5?.vessel_name || matchingTug8?.vessel_name || matchingTug10?.vessel_name || "MV. KARTINI BARUNA");

      return {
        id: spk.id,
        spk_number: spk.spk_number || "SPK-WO",
        target_port: spk.target_port || "Pelabuhan Merak",
        vessel_name: primaryVessel,
        status: spk.status || "OPEN",
        created_at: spk.created_at || new Date().toISOString(),
        created_by: spk.created_by || "Superadmin",
        remarks: (spk as any).remarks || "",
        tug5_number: matchingTug5?.tug5_number || matchingTug5?.request_number || `TUG5-${(spk.spk_number || 'WO').split('-').pop()}`,
        tug8_number: matchingTug8?.tug8_number || matchingTug8?.dispatch_number || `TUG8-${(spk.spk_number || 'WO').split('-').pop()}`,
        tug10_number: matchingTug10?.return_number || `TUG10-${(spk.spk_number || 'WO').split('-').pop()}`,
        transporter_name: matchingTug8?.transporter_name,
        driver_name: (matchingTug8 as any)?.driver_name,
        vehicle_number: (matchingTug8 as any)?.vehicle_number,
        items: itemsList
      };
    }).filter(Boolean);
  }, [spkList, materialRequests, dispatchList, materialReturns]);

  const filteredSPKList = useMemo(() => {
    return spkGroupedList.filter((s): s is NonNullable<typeof s> => {
      if (!s) return false;
      // 1. Time Filters
      if (s.created_at) {
        const spkDate = new Date(s.created_at);
        spkDate.setHours(0, 0, 0, 0);

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (timeFilter === "week") {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          oneWeekAgo.setHours(0, 0, 0, 0);
          if (spkDate < oneWeekAgo || spkDate > now) return false;
        } else if (timeFilter === "month") {
          const oneMonthAgo = new Date();
          oneMonthAgo.setDate(now.getDate() - 30);
          oneMonthAgo.setHours(0, 0, 0, 0);
          if (spkDate < oneMonthAgo || spkDate > now) return false;
        } else if (timeFilter === "custom") {
          if (dateFrom) {
            const from = new Date(dateFrom);
            from.setHours(0, 0, 0, 0);
            if (spkDate < from) return false;
          }
          if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            if (spkDate > to) return false;
          }
        }
      }

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesSpk = s.spk_number.toLowerCase().includes(q);
        const matchesPort = s.target_port.toLowerCase().includes(q);
        const matchesVessel = s.vessel_name.toLowerCase().includes(q);
        const matchesTug5 = s.tug5_number ? s.tug5_number.toLowerCase().includes(q) : false;
        const matchesTug8 = s.tug8_number ? s.tug8_number.toLowerCase().includes(q) : false;
        const matchesTug10 = s.tug10_number ? s.tug10_number.toLowerCase().includes(q) : false;
        const matchesItems = s.items.some((it: any) => 
          it.spare_part_name.toLowerCase().includes(q) || it.part_number.toLowerCase().includes(q)
        );

        if (!matchesSpk && !matchesPort && !matchesVessel && !matchesTug5 && !matchesTug8 && !matchesTug10 && !matchesItems) {
          return false;
        }
      }
      return true;
    });
  }, [spkGroupedList, timeFilter, dateFrom, dateTo, searchQuery]);

  // Get list of unique categories for filtration
  const categories = useMemo(() => {
    const list = parts.map(p => p.category);
    return ["all", ...Array.from(new Set(list))];
  }, [parts]);

  // Main filter calculation
  const filteredData = useMemo(() => {
    return allCombinedMovements.filter(m => {
      // 1. Time Filters
      const txDate = new Date(m.transaction_date);
      txDate.setHours(0, 0, 0, 0);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (timeFilter === "week") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        oneWeekAgo.setHours(0, 0, 0, 0);
        if (txDate < oneWeekAgo || txDate > now) return false;
      } else if (timeFilter === "month") {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(now.getDate() - 30);
        oneMonthAgo.setHours(0, 0, 0, 0);
        if (txDate < oneMonthAgo || txDate > now) return false;
      } else if (timeFilter === "custom") {
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          if (txDate < from) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (txDate > to) return false;
        }
      }

      // 2. Type Filter (Inbound vs Outbound)
      const isInbound = m.qty_in > 0 || m.transaction_type === TransactionType.RECEIVING;
      const isOutbound = m.qty_out > 0 || m.transaction_type === TransactionType.DISPATCH || m.transaction_type === TransactionType.VESSEL_CONSUMPTION;

      if (typeFilter === "in" && !isInbound) return false;
      if (typeFilter === "out" && !isOutbound) return false;

      // 3. Category Filter
      if (categoryFilter !== "all") {
        const partInfo = parts.find(p => p.id === m.spare_part_id);
        if (!partInfo || partInfo.category !== categoryFilter) return false;
      }

      // 4. Search Filter (by part name, code, PO, or operator)
      if (searchQuery.trim() !== "") {
        const cleanQuery = searchQuery.toLowerCase();
        const matchesName = m.spare_part_name.toLowerCase().includes(cleanQuery);
        const matchesNum = m.part_number.toLowerCase().includes(cleanQuery);
        const matchesRef = m.reference_number.toLowerCase().includes(cleanQuery);
        const matchesUser = m.created_by.toLowerCase().includes(cleanQuery);
        const matchesRemarks = m.remarks ? m.remarks.toLowerCase().includes(cleanQuery) : false;

        if (!matchesName && !matchesNum && !matchesRef && !matchesUser && !matchesRemarks) {
          return false;
        }
      }

      return true;
    });
  }, [allCombinedMovements, parts, timeFilter, dateFrom, dateTo, typeFilter, categoryFilter, searchQuery]);

  // Aggregate stats based on filtered data
  const stats = useMemo(() => {
    let totalInQty = 0;
    let totalOutQty = 0;
    let totalInTransactions = 0;
    let totalOutTransactions = 0;

    filteredData.forEach(m => {
      const isInbound = m.qty_in > 0 || m.transaction_type === TransactionType.RECEIVING;
      const isOutbound = m.qty_out > 0 || m.transaction_type === TransactionType.DISPATCH || m.transaction_type === TransactionType.VESSEL_CONSUMPTION;

      if (isInbound) {
        totalInQty += m.qty_in || 1;
        totalInTransactions++;
      }
      if (isOutbound) {
        totalOutQty += m.qty_out || 1;
        totalOutTransactions++;
      }
    });

    const netImpact = totalInQty - totalOutQty;

    // Find the most active item in the period
    const itemActivityMap: { [key: string]: { name: string; num: string; count: number } } = {};
    filteredData.forEach(m => {
      const current = itemActivityMap[m.spare_part_id] || { name: m.spare_part_name, num: m.part_number, count: 0 };
      current.count += (m.qty_in + m.qty_out);
      itemActivityMap[m.spare_part_id] = current;
    });

    let mostActiveItem = "Tidak ada mutasi";
    let maxActivity = 0;
    Object.keys(itemActivityMap).forEach(key => {
      if (itemActivityMap[key].count > maxActivity) {
        maxActivity = itemActivityMap[key].count;
        mostActiveItem = `${itemActivityMap[key].name} (${itemActivityMap[key].num})`;
      }
    });

    return {
      totalInQty,
      totalOutQty,
      totalInTransactions,
      totalOutTransactions,
      netImpact,
      mostActiveItem,
      totalCount: filteredData.length
    };
  }, [filteredData]);

  // Consolidate movements by Reference Number (e.g. PO, TUG 8, Surat Jalan)
  const referenceGroupedList = useMemo(() => {
    const map: { [ref: string]: {
      reference_number: string;
      transaction_date: string;
      transaction_type: string;
      created_by: string;
      remarks: string;
      total_in: number;
      total_out: number;
      items: MovementLedgerEntry[];
    } } = {};

    filteredData.forEach(m => {
      const ref = m.reference_number || "REF-LOGISTIK";
      if (!map[ref]) {
        map[ref] = {
          reference_number: ref,
          transaction_date: m.transaction_date,
          transaction_type: m.transaction_type,
          created_by: m.created_by,
          remarks: m.remarks,
          total_in: 0,
          total_out: 0,
          items: []
        };
      }
      map[ref].items.push(m);
      map[ref].total_in += (m.qty_in || 0);
      map[ref].total_out += (m.qty_out || 0);
    });

    return Object.values(map);
  }, [filteredData]);

  // Generate Date Trend data for gorgeous SVG-based Visual Dashboard
  const chartData = useMemo(() => {
    const datesMap: { [key: string]: { dateLabel: string; dateObj: Date; inQty: number; outQty: number } } = {};

    // Populate with last 10 days by default if filter is week, or group by days
    filteredData.forEach(m => {
      // YYYY-MM-DD
      const dateStr = m.transaction_date.split("T")[0];
      if (!datesMap[dateStr]) {
        const dObj = new Date(m.transaction_date);
        datesMap[dateStr] = {
          dateLabel: dObj.toLocaleDateString("id-ID", { month: "short", day: "numeric" }),
          dateObj: dObj,
          inQty: 0,
          outQty: 0
        };
      }
      datesMap[dateStr].inQty += m.qty_in;
      datesMap[dateStr].outQty += m.qty_out;
    });

    // Sort chronologically
    return Object.values(datesMap).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()).slice(-14); // limiting to last 14 active days for visual neatness
  }, [filteredData]);

  // Max value to scale our relative SVG chart neatly
  const maxChartVal = useMemo(() => {
    let max = 15;
    chartData.forEach(d => {
      if (d.inQty > max) max = d.inQty;
      if (d.outQty > max) max = d.outQty;
    });
    return Math.ceil(max * 1.15); // Add padding space on top
  }, [chartData]);

  // Direct CSV Export utility
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert("Tidak ada data laporan untuk diekspor.");
      return;
    }

    const headers = [
      "Tanggal",
      "Kategori",
      "Nama Suku Cadang",
      "Nomor Part",
      "Jumlah Masuk (In)",
      "Jumlah Keluar (Out)",
      "Nomor Referensi (PO/Vessel Request)",
      "Petugas Staff",
      "Remarks"
    ];

    const rows = filteredData.map(m => {
      const partInfo = parts.find(p => p.id === m.spare_part_id);
      return [
        new Date(m.transaction_date).toLocaleDateString("id-ID"),
        partInfo?.category || "Unknown",
        m.spare_part_name,
        m.part_number,
        m.qty_in || 0,
        m.qty_out || 0,
        m.reference_number,
        m.created_by,
        m.remarks || ""
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Mutasi_WMS_${timeFilter}_${typeFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTriggerPrint = () => {
    const textTimeFilter = timeFilter === "week" ? "7 Hari Terakhir" : timeFilter === "month" ? "30 Hari Terakhir" : `${dateFrom} s/d ${dateTo}`;
    if (viewMode === "spk" && filteredSPKList.length > 0) {
      if (onPrintSPKReport) {
        onPrintSPKReport(filteredSPKList[0]);
        return;
      }
    }
    onPrintReport(filteredData, {
      totalIn: stats.totalInQty,
      totalOut: stats.totalOutQty,
      netImpact: stats.netImpact,
      totalCount: stats.totalCount
    }, textTimeFilter);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 font-sans text-slate-800 p-6 space-y-6">
      
      {/* Header Titling */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-blue-600 bg-blue-105 px-2.5 py-0.5 rounded font-mono uppercase tracking-widest">
              Laporan & Analitik (TUG 11)
            </span>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2.5 py-0.5 rounded font-mono">
              PT. PELAYARAN BAHTERA ADHIGUNA
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-display">
            Laporan Mutasi Barang Keluar Masuk Suku Cadang (TUG 11)
          </h2>
          <p className="text-xs text-slate-500">
            Analisis rekrutmen logistik komparatif, volume pergudangan inbound QC, pengeluaran logistik kapal, dan audit jejak mutasi.
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2.5 shrink-0 no-print">
          <button 
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors rounded shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV (Excel)</span>
          </button>
          
          <button 
            type="button"
            onClick={handleTriggerPrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors rounded shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROL PANEL BAR - Minimal & Slick */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col gap-4 no-print select-none">
        <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs border-b border-slate-100 pb-3 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-blue-500" />
          <span>Panel Pemetaan Filter Mutasi</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* 1. Time Presets / Pickers */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
              Rentang Waktu Laporan
            </span>
            <div className="grid grid-cols-3 bg-slate-100 p-0.5 rounded border border-slate-200 text-xs text-center font-bold">
              <button 
                type="button"
                onClick={() => setTimeFilter("week")}
                className={`py-1.5 rounded cursor-pointer transition-all ${timeFilter === "week" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Minggu Ini
              </button>
              <button 
                type="button"
                onClick={() => setTimeFilter("month")}
                className={`py-1.5 rounded cursor-pointer transition-all ${timeFilter === "month" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Bulan Ini
              </button>
              <button 
                type="button"
                onClick={() => setTimeFilter("custom")}
                className={`py-1.5 rounded cursor-pointer transition-all ${timeFilter === "custom" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Kustom
              </button>
            </div>
          </div>

          {/* 2. Custom Date Pickers (Conditional relative to Custom active preset) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
              Parameter Tanggal {timeFilter !== "custom" && "(Non-Aktif)"}
            </span>
            <div className={`flex items-center gap-2 text-xs transition-opacity ${timeFilter !== "custom" ? "opacity-40 pointer-events-none" : ""}`}>
              <input 
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded px-2 py-1.5 text-xs focus:outline-none"
              />
              <span className="text-slate-400 font-bold font-mono">s/d</span>
              <input 
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded px-2 py-1.5 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* 3. Mutation Type */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
              Arah Aliran Logistik (Aliran)
            </span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Mutasi (Masuk & Keluar)</option>
              <option value="in">Barang Masuk Saja (Inbound / PO)</option>
              <option value="out">Barang Keluar Saja (Outbound / Supply)</option>
            </select>
          </div>

          {/* 4. Categorized Filters */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
              Filtrasi Kategori Suku Cadang
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none cursor-pointer capitalize"
            >
              <option value="all">Semua Kategori</option>
              {categories.filter(c => c !== "all").map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Global Text Search in panel */}
        <div className="relative pt-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input 
            type="text"
            placeholder="Cari laporan berdasarkan: Nama Part, SKU, Nomor Part, Referensi Dokumen PO / Surat Jalan, atau Staff Gudang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-blue-500 rounded-lg px-4 pl-10 py-2.5 text-xs focus:outline-none transition-all placeholder-slate-400"
          />
        </div>
      </div>

      {/* METRICS STATS SUMMARY CARDS (BENTO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Inbound volume */}
        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-xs space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Total Inbound Suku Cadang (Masuk)
            </span>
            <span className="p-1 px-1.5 bg-green-50 text-green-700 text-[9px] font-mono font-bold uppercase rounded flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              IN
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              +{stats.totalInQty}
            </span>
            <span className="text-xs text-slate-500 font-medium">SET/PCS</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Dari <strong className="text-slate-700">{stats.totalInTransactions} transaksi</strong> verifikasi QC Inbound gudang.
          </p>
        </div>

        {/* Card 2: Total Outbound volume */}
        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-xs space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Total Outbound Suku Cadang (Keluar)
            </span>
            <span className="p-1 px-1.5 bg-orange-50 text-orange-700 text-[9px] font-mono font-bold uppercase rounded flex items-center gap-0.5">
              <ArrowDownLeft className="w-3 h-3" />
              OUT
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              -{stats.totalOutQty}
            </span>
            <span className="text-xs text-slate-500 font-medium">SET/PCS</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Dari <strong className="text-slate-700">{stats.totalOutTransactions} transaksi</strong> pengeluaran bon logistik kapal.
          </p>
        </div>

        {/* Card 3: Net impact */}
        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-xs space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Dampak Bersih Stok (Net Impact)
            </span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold font-mono tracking-tight ${stats.netImpact >= 0 ? "text-green-600" : "text-amber-600"}`}>
              {stats.netImpact >= 0 ? `+${stats.netImpact}` : stats.netImpact}
            </span>
            <span className="text-xs text-slate-500 font-medium">SET/PCS</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Selisih barang masuk & keluar di storage BAG.
          </p>
        </div>

        {/* Card 4: Most active spare parts */}
        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-xs space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Suku Cadang Paling Aktif (Mutasi)
            </span>
            <Layers className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block truncate" title={stats.mostActiveItem}>
              {stats.mostActiveItem}
            </span>
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              Dipicu oleh fluktuasi logistik dalam filter aktif.
            </p>
          </div>
        </div>

      </div>

      {/* COMPREHENSIVE TREND GRAPHICS (CUSTOM SVG DESIGNS) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 mb-1">
            <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
            Grafik Visual: Tren Mutasi Barang Masuk vs Keluar Harian
          </h3>
          <p className="text-[11px] text-slate-400 leading-none">
            Diagram batang berpasangan mewakili intensitas volume barang masuk harian (hijau) disandingkan dengan volume keluar (amber).
          </p>
        </div>

        {chartData.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400">
            <Info className="w-6 h-6 text-slate-300 mb-2" />
            <p className="text-xs font-medium">Tidak ada data untuk rentang waktu yang dipilih dalam pembuatan tren grafik.</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            
            {/* The SVG Layout */}
            <div className="relative w-full overflow-x-auto select-none no-scrollbar">
              <svg 
                className="w-full min-w-[700px] h-48"
                viewBox="0 0 800 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Horizontal Guide Lines */}
                <line x1="40" y1="20" x2="780" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="40" y1="60" x2="780" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="40" y1="100" x2="780" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="140" x2="780" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="40" y1="170" x2="780" y2="170" stroke="#e2e8f0" strokeWidth="1" />

                {/* Y-Axis scale label */}
                <text x="35" y="25" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">{maxChartVal} Qty</text>
                <text x="35" y="105" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">0 Qty</text>
                <text x="35" y="175" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">Bottom</text>

                {/* Render Dual Bars */}
                {chartData.map((d, index) => {
                  const spacing = 740 / chartData.length;
                  const x = 50 + index * spacing;
                  
                  // Inbound calculation height
                  const inHeight = Math.max(2, (d.inQty / maxChartVal) * 130);
                  const inY = 170 - inHeight;

                  // Outbound calculation height (side by side)
                  const outHeight = Math.max(2, (d.outQty / maxChartVal) * 130);
                  const outY = 170 - outHeight;

                  return (
                    <g key={index} className="group cursor-pointer">
                      
                      {/* Hover Backdrop Box */}
                      <rect 
                        x={x - 10} 
                        y="10" 
                        width={spacing - 4} 
                        height="180" 
                        rx="4" 
                        className="fill-slate-500/0 hover:fill-slate-500/5 transition-colors" 
                      />

                      {/* Green Bar (Inbound) */}
                      <rect 
                        x={x} 
                        y={inY} 
                        width="10" 
                        height={inHeight} 
                        rx="2"
                        className="fill-emerald-500 brightness-100 hover:brightness-105 transition-all"
                      />

                      {/* Amber Bar (Outbound) */}
                      <rect 
                        x={x + 13} 
                        y={outY} 
                        width="10" 
                        height={outHeight} 
                        rx="2"
                        className="fill-amber-500 brightness-100 hover:brightness-105 transition-all"
                      />

                      {/* Day Label */}
                      <text 
                        x={x + 11} 
                        y="190" 
                        fill="#64748b" 
                        fontSize="9" 
                        fontWeight="bold" 
                        textAnchor="middle" 
                        fontFamily="monospace"
                      >
                        {d.dateLabel}
                      </text>

                      {/* Tooltip detail overlay displayed on hover (Tailwind control) */}
                      <title>{`Tanggal: ${d.dateLabel}\n- Masuk: +${d.inQty} PCS\n- Keluar: -${d.outQty} PCS`}</title>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend Indicators */}
            <div className="flex items-center justify-center gap-6 text-[10px] font-bold font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-600">Barang Masuk (Inbound / QC)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span className="text-slate-600">Barang Keluar (Outbound / Supply)</span>
              </span>
            </div>

          </div>
        )}

      </div>

      {/* MODE SWITCHER TABS: Grouped by SPK vs Grouped by Reference vs Flat Stream */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs gap-3 no-print">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode("spk")}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === "spk"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
            <span>Rekapitulasi per SPK & TUG ({filteredSPKList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("ref")}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === "ref"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Rekapitulasi per No. Referensi ({referenceGroupedList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("flat")}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === "flat"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Aliran Baris Mutasi ({filteredData.length})</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-500 hidden md:block">
          {viewMode === "spk" ? "📌 Mode Rekapitulasi SPK" : viewMode === "ref" ? "🏷️ Mode Disatukan per Nomor Referensi" : "📊 Mode Baris Transaksi Mutasi"}
        </div>
      </div>

      {viewMode === "spk" ? (
        /* REKAPITULASI DOKUMEN PER SPK & TUG */
        <div className="space-y-6">
          {filteredSPKList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <Info className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-semibold">Tidak ditemukan SPK yang sesuai dengan kata kunci pencarian.</p>
              <p className="text-[10px] text-slate-400">Harap ketik nomor SPK, nama kapal, pelabuhan tujuan, atau nama suku cadang.</p>
            </div>
          ) : (
            filteredSPKList.map((spk) => (
              <div key={spk.id} className="bg-white border border-slate-250 rounded-xl shadow-xs overflow-hidden transition-all hover:shadow-md">
                
                {/* SPK Header Banner */}
                <div className="bg-slate-900 text-white px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black text-white tracking-wide">{spk.spk_number}</span>
                        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                          spk.status === "Dispatched" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}>
                          STATUS SPK: {spk.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono mt-1">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Pelabuhan Tujuan (Dikirim Ke): <strong className="text-white">{spk.target_port}</strong></span>
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Ship className="w-3.5 h-3.5 text-blue-400" />
                          <span>Kapal Target (Dikembalikan Dari): <strong className="text-white">{spk.vessel_name}</strong></span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Print Action for this SPK */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPrintSPKReport && onPrintSPKReport(spk)}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-white" />
                      <span>Cetak Rekap SPK Ini (A4 PDF)</span>
                    </button>
                  </div>
                </div>

                {/* TUG References Flow Bar */}
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-200 p-2.5 rounded-lg text-indigo-900">
                    <Package className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <span className="text-[9px] text-indigo-600 font-bold block">1. DOKUMEN TUG 5 (PERMINTAAN)</span>
                      <strong className="text-xs font-extrabold">{spk.tug5_number}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-lg text-emerald-900">
                    <Send className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[9px] text-emerald-600 font-bold block">2. DOKUMEN TUG 8 (OUTBOUND PENGIRIMAN)</span>
                      <strong className="text-xs font-extrabold">{spk.tug8_number}</strong>
                      {spk.transporter_name && <span className="text-[9px] text-slate-500 block font-normal">Transporter: {spk.transporter_name}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-amber-50/70 border border-amber-200 p-2.5 rounded-lg text-amber-900">
                    <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-[9px] text-amber-600 font-bold block">3. DOKUMEN TUG 10 (RETURN PENGEMBALIAN)</span>
                      <strong className="text-xs font-extrabold">{spk.tug10_number}</strong>
                    </div>
                  </div>
                </div>

                {/* Table of Contained Items */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                      <tr>
                        <th className="px-4 py-2.5 text-center w-10">#</th>
                        <th className="px-4 py-2.5">NAMA SUKU CADANG / SPARE PART</th>
                        <th className="px-4 py-2.5 font-mono">PART NUMBER</th>
                        <th className="px-4 py-2.5 text-center font-mono">SATUAN</th>
                        <th className="px-4 py-2.5 text-center font-mono">QTY SPK</th>
                        <th className="px-4 py-2.5 text-center font-mono text-emerald-800">QTY DIKIRIM (TUG 8)</th>
                        <th className="px-4 py-2.5 text-center font-mono text-amber-800">QTY KEMBALI (TUG 10)</th>
                        <th className="px-4 py-2.5 text-center font-mono text-blue-900 font-bold">QTY TERPAKAI (NET)</th>
                        <th className="px-4 py-2.5">ALOKASI & CATATAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 font-medium text-slate-800">
                      {spk.items.map((it: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{it.spare_part_name}</td>
                          <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">{it.part_number}</td>
                          <td className="px-4 py-3 text-center uppercase font-mono text-[11px]">{it.unit || "PCS"}</td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">{it.qty_spk}</td>
                          <td className="px-4 py-3 text-center font-mono font-black text-emerald-700 bg-emerald-50/40">+{it.qty_tug8}</td>
                          <td className="px-4 py-3 text-center font-mono font-black text-amber-700 bg-amber-50/40">{it.qty_tug10 > 0 ? `-${it.qty_tug10}` : "0"}</td>
                          <td className="px-4 py-3 text-center font-mono font-black text-blue-900 bg-blue-50/50">{it.qty_net}</td>
                          <td className="px-4 py-3 text-slate-500 text-[11px] italic">{it.remarks || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            ))
          )}
        </div>
      ) : viewMode === "ref" ? (
        /* REKAPITULASI DOKUMEN PER NOMOR REFERENSI */
        <div className="space-y-6">
          {referenceGroupedList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <Info className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-semibold">Tidak ditemukan dokumen referensi yang sesuai dengan filter.</p>
            </div>
          ) : (
            referenceGroupedList.map((refGroup, idx) => (
              <div key={idx} className="bg-white border border-slate-250 rounded-xl shadow-xs overflow-hidden transition-all hover:shadow-md">
                {/* Reference Banner Header */}
                <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400 font-black text-sm">
                      REF NO: {refGroup.reference_number}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                      refGroup.total_in > 0 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}>
                      {refGroup.total_in > 0 ? "INBOUND MASUK" : "OUTBOUND KELUAR"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-400">Tanggal: <strong className="text-slate-200">{safeFormatDate(refGroup.transaction_date)}</strong></span>
                    <span className="text-slate-400">Petugas: <strong className="text-slate-200">{refGroup.created_by}</strong></span>
                    <button
                      type="button"
                      onClick={() => onPrintReport(refGroup.items, { totalIn: refGroup.total_in, totalOut: refGroup.total_out }, timeFilter)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 text-xs shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Referensi Ini</span>
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5 text-center w-10">#</th>
                        <th className="px-4 py-2.5">Nama Suku Cadang</th>
                        <th className="px-4 py-2.5 text-center">Part Number</th>
                        <th className="px-4 py-2.5 text-center text-emerald-700">Masuk (In)</th>
                        <th className="px-4 py-2.5 text-center text-rose-700">Keluar (Out)</th>
                        <th className="px-4 py-2.5">Catatan / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {refGroup.items.map((it, itemIdx) => (
                        <tr key={itemIdx} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-center font-mono text-slate-400">{itemIdx + 1}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-900">{it.spare_part_name}</td>
                          <td className="px-4 py-2.5 font-mono text-center text-slate-600">{it.part_number}</td>
                          <td className="px-4 py-2.5 font-mono text-center font-bold text-emerald-700">{it.qty_in > 0 ? `+${it.qty_in}` : "-"}</td>
                          <td className="px-4 py-2.5 font-mono text-center font-bold text-rose-700">{it.qty_out > 0 ? `-${it.qty_out}` : "-"}</td>
                          <td className="px-4 py-2.5 text-slate-600">{it.remarks || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-mono text-[10px] font-bold text-slate-700 uppercase">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right">TOTAL ITEMS ({refGroup.items.length}):</td>
                        <td className="px-4 py-2 text-center text-emerald-700 font-bold">{refGroup.total_in > 0 ? `+${refGroup.total_in}` : "-"}</td>
                        <td className="px-4 py-2 text-center text-rose-700 font-bold">{refGroup.total_out > 0 ? `-${refGroup.total_out}` : "-"}</td>
                        <td className="px-4 py-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
      /* DETAILED TRANSACTIONAL LEDGER WORK SHEET */
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden flex-1 flex flex-col no-print-bg">
        
        {/* Table Title and Summary Count Banner */}
        <div className="px-5 py-4 border-b border-slate-150 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center text-blue-600">
              <Hash className="w-4 h-4" />
            </span>
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Rekapitulasi Mutasi Logistik Terpilih
              </h4>
              <p className="text-[11px] text-slate-500">
                Menemukan <strong className="text-slate-700">{filteredData.length} baris mutasi</strong> ({stats.totalInTransactions} Inbound Masuk, {stats.totalOutTransactions} Outbound Keluar).
              </p>
            </div>
          </div>

          {/* Quick Filter Type Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-lg text-xs font-bold font-mono no-print">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1 rounded transition-all cursor-pointer ${
                typeFilter === "all" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua ({allCombinedMovements.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("in")}
              className={`px-3 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                typeFilter === "in" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Inbound (Masuk)
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("out")}
              className={`px-3 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                typeFilter === "out" ? "bg-amber-600 text-white shadow-xs" : "text-amber-700 hover:bg-amber-100"
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Outbound (Keluar)
            </button>
          </div>
        </div>

        {/* The Worksheet Table */}
        <div className="overflow-x-auto flex-1">
          {filteredData.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <Info className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-semibold">Tidak ditemukan entri mutasi barang keluar masuk.</p>
              <p className="text-[10px] text-slate-400">Harap sesuaikan rentang waktu, tipe filter atau kata kunci mesin pencarian Anda.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
              <thead className="bg-slate-100 border-b border-slate-250 text-[10px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                <tr>
                  <th className="px-4 py-3 text-center">TANGGAL</th>
                  <th className="px-4 py-3">NAMA SUKU CADANG</th>
                  <th className="px-4 py-3">KATEGORI</th>
                  <th className="px-4 py-3 text-center">ALIRAN MUTASI</th>
                  <th className="px-4 py-3">REF. DOKUMEN</th>
                  <th className="px-4 py-3">STAFF LOGISTIK</th>
                  <th className="px-4 py-3">KETERANGAN OPERATOR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredData.map((m) => {
                  const partInfo = parts.find(p => p.id === m.spare_part_id);
                  const isPositive = m.qty_in > 0 || m.transaction_type === TransactionType.RECEIVING;
                  const qtyChange = isPositive ? (m.qty_in || 1) : (m.qty_out || 1);

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* Readable Date Format */}
                      <td className="px-4 py-3 text-center font-mono text-[11px] text-slate-500">
                        {safeFormatDate(m.transaction_date, { day: "numeric", month: "short" })} {safeFormatTime(m.transaction_date)}
                      </td>

                      {/* Part Information */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{m.spare_part_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">PN: {m.part_number}</div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 uppercase text-[10px] font-bold">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          {partInfo?.category || "Marine Component"}
                        </span>
                      </td>

                      {/* Mutable qty */}
                      <td className="px-4 py-3 text-center font-bold">
                        {isPositive ? (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[11px] font-mono">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            +{qtyChange} PCS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-105 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-mono">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            -{qtyChange} PCS
                          </span>
                        )}
                      </td>

                      {/* Reference code */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-blue-600 hover:underline select-all text-xs font-bold leading-none">
                          {m.reference_number}
                        </span>
                      </td>

                      {/* Logistic Officer */}
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-650">
                        {m.created_by}
                      </td>

                      {/* Remaks */}
                      <td className="px-4 py-3 italic text-slate-400 max-w-[200px] truncate" title={m.remarks}>
                        {m.remarks || "-"}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Printable Footer Section only displayed during physical or PDF prints */}
        <div className="hidden print:block border-t border-slate-400 pt-8 px-6 mt-8">
          <div className="grid grid-cols-3 text-center uppercase tracking-wider text-[9px] font-bold text-slate-700">
            <div className="flex flex-col justify-between h-20">
              <span>Dibuat Oleh (Staff Gudang):</span>
              <span className="border-t border-slate-300 pt-1">........................................</span>
            </div>
            <div className="flex flex-col justify-between h-20">
              <span>Diperiksa Oleh (Asisten Gudang):</span>
              <span className="border-t border-slate-300 pt-1">........................................</span>
            </div>
            <div className="flex flex-col justify-between h-20">
              <span>Disetujui Oleh (Superintendent):</span>
              <span className="border-t border-slate-300 pt-1">Capt. H. Wijaya</span>
            </div>
          </div>
        </div>

      </div>
      )}

    </div>
  );
}
