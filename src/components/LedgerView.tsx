/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  TrendingUp, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  History,
  FileSpreadsheet,
  AlertCircle,
  FileCheck
} from "lucide-react";
import { MovementLedgerEntry, SparePart } from "../types.js";

interface LedgerViewProps {
  movements: MovementLedgerEntry[];
  parts: SparePart[];
}

export default function LedgerView({ movements, parts }: LedgerViewProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "in" | "out">("all");

  const filteredMovements = movements.filter((m) => {
    // resolve part information
    const prt = parts.find((p) => p.id === m.spare_part_id);
    const prtName = prt ? prt.part_name.toLowerCase() : "";
    const prtNum = prt ? prt.part_number.toLowerCase() : "";

    const qtyVal = m.qty_in > 0 ? m.qty_in : -m.qty_out;

    const matchesSearch = 
      prtName.includes(search.toLowerCase()) ||
      prtNum.includes(search.toLowerCase()) ||
      m.reference_number.toLowerCase().includes(search.toLowerCase()) ||
      m.created_by.toLowerCase().includes(search.toLowerCase()) ||
      (m.remarks && m.remarks.toLowerCase().includes(search.toLowerCase()));

    const matchesType = 
      typeFilter === "all" || 
      (typeFilter === "in" && qtyVal > 0) ||
      (typeFilter === "out" && qtyVal < 0);

    return matchesSearch && matchesType;
  });

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto font-sans selection:bg-blue-105">
      
      {/* Title */}
      <div className="shrink-0 no-print">
        <h1 className="text-xl font-bold font-display tracking-tight text-slate-900 uppercase">
          Dynamic Stock Ledger Trail
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-1 uppercase">
          Continuous cryptographic audit trail of all physical receipt registrations, dispatches, and superintendent adjustments
        </p>
      </div>

      {/* Filter and CSV Export bar */}
      <section className="bg-white border border-slate-200 p-4 rounded-md shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between shrink-0 no-print">
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search serial codes, tracking numbers, or operator initials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-50 border border-slate-250 rounded text-xs pl-9 pr-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Filtering dropdowns */}
          <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200 self-start sm:self-center font-mono text-[10.5px]">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1 font-bold rounded-sm uppercase transition-colors mr-1 cursor-pointer ${
                typeFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-550 hover:bg-slate-205"
              }`}
            >
              All Movements
            </button>
            <button
              onClick={() => setTypeFilter("in")}
              className={`px-3 py-1 font-bold rounded-sm uppercase transition-colors mr-1 cursor-pointer ${
                typeFilter === "in" ? "bg-white text-blue-700 shadow-xs" : "text-slate-550 hover:bg-slate-205"
              }`}
            >
              Inbound (+)
            </button>
            <button
              onClick={() => setTypeFilter("out")}
              className={`px-3 py-1 font-bold rounded-sm uppercase transition-colors cursor-pointer ${
                typeFilter === "out" ? "bg-white text-red-700 shadow-xs" : "text-slate-550 hover:bg-slate-205"
              }`}
            >
              Outbound (-)
            </button>
          </div>

        </div>

        <div className="text-[10px] text-slate-400 font-mono tracking-wider font-extrabold uppercase">
          {filteredMovements.length} ledger trails registered
        </div>
      </section>

      {/* Ledger Audit Table */}
      <section className="flex-1 bg-white border border-slate-200 rounded-md shadow-xs flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center bg-slate-55">
          <div className="flex items-center gap-2 text-slate-700">
            <History className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold uppercase font-mono tracking-widest">
              Immutability check logs (Auditable transactions)
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredMovements.length === 0 ? (
            <div className="p-12 text-center text-slate-505 font-mono italic">
              No stock transactions registered yet.
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-55 border-b border-slate-150 font-serif text-[10.5px] italic text-slate-400">
                <tr>
                  <th className="px-4 py-2 uppercase tracking-tight">Timestamp Offset (UTC)</th>
                  <th className="px-5 py-2 uppercase tracking-tight">Target Spare item</th>
                  <th className="px-4 py-2 text-center uppercase tracking-tight">Direction</th>
                  <th className="px-4 py-2 text-right uppercase tracking-tight">Quantity Delta</th>
                  <th className="px-4 py-2 text-right uppercase tracking-tight">Running Balance</th>
                  <th className="px-4 py-2 uppercase tracking-tight">Ref Number</th>
                  <th className="px-4 py-2 uppercase tracking-tight">Operator ID</th>
                  <th className="px-4 py-2 uppercase tracking-tight">Remarks & Reasons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredMovements.map((move) => {
                  const correlatedPart = parts.find(p => p.id === move.spare_part_id);
                  const qtyVal = move.qty_in > 0 ? move.qty_in : -move.qty_out;
                  const isPositive = qtyVal > 0;

                  return (
                    <tr key={move.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Timestamp */}
                      <td className="px-4 py-3 font-mono text-slate-400 truncate max-w-[120px]" title={new Date(move.transaction_date).toISOString()}>
                        {new Date(move.transaction_date).toLocaleDateString([], { month: "short", day: "numeric" })} {new Date(move.transaction_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>

                      {/* Spare Name */}
                      <td className="px-5 py-3">
                        {correlatedPart ? (
                          <>
                            <span className="font-bold text-slate-900 block leading-tight">{correlatedPart.part_name}</span>
                            <span className="text-[9.5px] bg-slate-100 text-slate-600 px-1 font-mono rounded inline-block mt-0.5">
                              {correlatedPart.part_number} | SKU: {correlatedPart.sku}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-455 font-mono italic">Unlisted Core Part #{move.spare_part_id}</span>
                        )}
                      </td>

                      {/* Direction Icon */}
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1 ${
                          isPositive ? "bg-green-105 text-green-700" : "bg-red-105 text-red-700"
                        }`}>
                          {isPositive ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3 text-green-600 shrink-0" />
                              INBOUND
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-red-650 shrink-0" />
                              OUTBOUND
                            </>
                          )}
                        </span>
                      </td>

                      {/* Quantity Delta */}
                      <td className={`px-4 py-3 text-right font-mono font-bold text-sm ${isPositive ? "text-green-655" : "text-red-600"}`}>
                        {isPositive ? `+${qtyVal}` : qtyVal}
                      </td>

                      {/* Running Balance */}
                      <td className="px-4 py-3 text-right font-mono text-zinc-800 font-bold">
                        {move.after_stock !== undefined ? move.after_stock : correlatedPart?.current_stock || 0}
                      </td>

                      {/* Reference Code */}
                      <td className="px-4 py-3 font-mono text-blue-600 font-semibold text-xs truncate max-w-[125px]" title={move.reference_number}>
                        {move.reference_number}
                      </td>

                      {/* Operator */}
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {move.created_by}
                      </td>

                      {/* Remarks */}
                      <td className="px-4 py-3 text-slate-600 leading-tight max-w-sm truncate" title={move.remarks}>
                        {move.remarks || "—"}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

    </div>
  );
}
