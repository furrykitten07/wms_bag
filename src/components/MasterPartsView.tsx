/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Building2, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit3, 
  Layers, 
  Package, 
  X, 
  CheckCircle, 
  ShieldAlert,
  Barcode,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Anchor,
  Eye,
  ChevronDown,
  AlertTriangle
} from "lucide-react";
import { SparePart, WarehouseLocation, Vendor, UserRole } from "../types.js";

interface MasterPartsViewProps {
  parts: SparePart[];
  locations: WarehouseLocation[];
  vendors: Vendor[];
  role: UserRole;
  onAddPart: (part: Partial<SparePart>) => Promise<any>;
  onUpdatePart: (id: string, part: Partial<SparePart>) => Promise<any>;
  onDeletePart: (id: string) => Promise<any>;
  onAddVendor: (v: Partial<Vendor>) => Promise<any>;
  onExportStockReport: () => void;
  onAddLocation?: (loc: Partial<WarehouseLocation>) => Promise<any>;
  onUpdateLocation?: (id: string, loc: Partial<WarehouseLocation>) => Promise<any>;
  onDeleteLocation?: (id: string) => Promise<any>;
}

export default function MasterPartsView({
  parts,
  locations,
  vendors,
  role,
  onAddPart,
  onUpdatePart,
  onDeletePart,
  onAddVendor,
  onExportStockReport,
  onAddLocation,
  onUpdateLocation,
  onDeleteLocation,
}: MasterPartsViewProps) {
  // Filters state
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [alertFilter, setAlertFilter] = useState("all"); // "all" | "low"

  // Parts Pagination states
  const [partsPage, setPartsPage] = useState(1);
  const partsPerPage = 8;

  React.useEffect(() => {
    setPartsPage(1);
  }, [search, selectedCategory, selectedLocation, alertFilter]);

  // Active view tab inside parts panel
  const [viewSubTab, setViewSubTab] = useState<"parts" | "vendors" | "locations">("parts");

  // Location Modals state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<WarehouseLocation | null>(null);
  const [locationForm, setLocationForm] = useState<Partial<WarehouseLocation>>({
    code: "",
    warehouse: "Jakarta HQ Warehouse",
    zone: "",
    rack: "",
    shelf: "",
    bin: "",
  });

  // Part Modals state
  const [selectedViewPart, setSelectedViewPart] = useState<SparePart | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [partForm, setPartForm] = useState<Partial<SparePart>>({
    sku: "",
    part_number: "",
    part_name: "",
    alternative_part_number: "",
    category: "Main Engine Parts",
    vendor_id: "vnd-4",
    vessel_compatibility: "All Vessels",
    unit: "PCS",
    brand: "",
    maker: "",
    minimum_stock: 2,
    maximum_stock: 10,
    reorder_point: 3,
    current_stock: 4,
    location_id: "loc-1",
    barcode: "",
    description: "",
  });

  // Vendor Modal State
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState<Partial<Vendor>>({
    name: "",
    code: "",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
  });

  // Category array definitions
  const categories = [
    "All Categories",
    "Main Engine Parts",
    "Auxiliary Engine Spares",
    "Turbocharger Parts",
    "Pump Spares",
    "Electrical Equipment",
    "Navigational Instruments",
    "Piping Valves & Seals"
  ];

  const handleOpenAddModal = () => {
    setEditingPart(null);
    setPartForm({
      sku: `SKU-ME-${Math.floor(100 + Math.random() * 900)}`,
      part_number: "",
      part_name: "",
      alternative_part_number: "",
      category: "Main Engine Parts",
      vendor_id: vendors[0]?.id || "vnd-1",
      vessel_compatibility: "MV. KARTINI BARUNA",
      unit: "PCS",
      brand: "",
      maker: "",
      minimum_stock: 2,
      maximum_stock: 12,
      reorder_point: 4,
      current_stock: 5,
      location_id: locations[0]?.id || "loc-1",
      barcode: `BC-${Math.floor(Math.random() * 900000) + 100000}`,
      description: "",
    });
    setIsPartModalOpen(true);
  };

  const handleOpenEditModal = (part: SparePart) => {
    setEditingPart(part);
    setPartForm({ ...part });
    setIsPartModalOpen(true);
  };

  const submitPartForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partForm.part_name || !partForm.part_number) {
      alert("Part Name and Part Number are required");
      return;
    }

    try {
      if (editingPart) {
        await onUpdatePart(editingPart.id, partForm);
      } else {
        await onAddPart(partForm);
      }
      setIsPartModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to submit part form");
    }
  };

  const submitVendorForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name) {
      alert("Supplier / Vendor Name is required!");
      return;
    }

    try {
      await onAddVendor(vendorForm);
      setIsVendorModalOpen(false);
      setVendorForm({
        name: "",
        code: "",
        email: "",
        phone: "",
        address: "",
        contactPerson: "",
      });
    } catch (err: any) {
      alert(err.message || "Failed to register vendor");
    }
  };

  const handleOpenAddLocationModal = () => {
    setEditingLocation(null);
    setLocationForm({
      code: "",
      warehouse: "Jakarta HQ Warehouse",
      zone: "",
      rack: "",
      shelf: "",
      bin: ""
    });
    setIsLocationModalOpen(true);
  };

  const handleOpenEditLocationModal = (loc: WarehouseLocation) => {
    setEditingLocation(loc);
    setLocationForm({ ...loc });
    setIsLocationModalOpen(true);
  };

  const submitLocationForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationForm.code) {
      alert("Location code is required (e.g. A1, B2)");
      return;
    }
    try {
      if (editingLocation) {
        if (onUpdateLocation) {
          await onUpdateLocation(editingLocation.id, locationForm);
        }
      } else {
        if (onAddLocation) {
          await onAddLocation(locationForm);
        }
      }
      setIsLocationModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to submit location details");
    }
  };

  // Filter Parts dynamically
  const filteredParts = parts.filter((part) => {
    const term = search.toLowerCase();
    const matchesSearch = 
      part.part_name.toLowerCase().includes(term) ||
      part.part_number.toLowerCase().includes(term) ||
      part.sku.toLowerCase().includes(term) ||
      (part.maker && part.maker.toLowerCase().includes(term));

    const matchesCategory = 
      selectedCategory === "all" || selectedCategory === "All Categories" || 
      part.category === selectedCategory;

    const locObj = locations.find((l) => l.id === part.location_id) || locations[0];
    const matchesLocation = 
      selectedLocation === "all" || 
      part.location_id === selectedLocation ||
      (locObj && locObj.code.includes(selectedLocation));

    const matchesAlerts = 
      alertFilter === "all" || 
      (alertFilter === "low" && part.current_stock <= part.reorder_point);

    return matchesSearch && matchesCategory && matchesLocation && matchesAlerts;
  });

  // Computed pagination values for Parts
  const partsTotalPages = Math.ceil(filteredParts.length / partsPerPage);
  const paginatedParts = filteredParts.slice((partsPage - 1) * partsPerPage, partsPage * partsPerPage);

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto font-sans selection:bg-blue-105">
      
      {/* Title & Sub-tabs toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 no-print">
        <div>
          <h1 className="text-xl font-bold font-display tracking-tight text-slate-900 uppercase">
            Master Registers Module
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1 uppercase">
            Maintain spare parts catalog, storage location layout, and official suppliers directory
          </p>
        </div>

        {/* Tab switch control */}
        <div className="flex gap-2 self-start md:self-center border border-slate-250 p-1 bg-slate-100 rounded-md">
          <button
            onClick={() => setViewSubTab("parts")}
            className={`px-3 py-1.5 text-xs font-semibold uppercase font-display rounded-sm cursor-pointer transition-colors ${
              viewSubTab === "parts" ? "bg-white text-slate-900 shadow-xs" : "text-slate-650 hover:bg-slate-200"
            }`}
          >
            Spare Parts Catalog ({parts.length})
          </button>
          <button
            onClick={() => setViewSubTab("vendors")}
            className={`px-3 py-1.5 text-xs font-semibold uppercase font-display rounded-sm cursor-pointer transition-colors ${
              viewSubTab === "vendors" ? "bg-white text-slate-900 shadow-xs" : "text-slate-650 hover:bg-slate-200"
            }`}
          >
            Registered Vendors ({vendors.length})
          </button>
          <button
            onClick={() => setViewSubTab("locations")}
            className={`px-3 py-1.5 text-xs font-semibold uppercase font-display rounded-sm cursor-pointer transition-colors ${
              viewSubTab === "locations" ? "bg-white text-slate-900 shadow-xs" : "text-slate-650 hover:bg-slate-200"
            }`}
          >
            HQ Layout Matrix
          </button>
        </div>
      </div>

      {/* VIEW: PARTS MAIN CATALOG */}
      {viewSubTab === "parts" && (
        <>
          {/* Filtering Header block */}
          <section className="bg-white border border-slate-200 p-4 rounded-md shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between shrink-0 no-print">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full max-w-4xl">
              
              {/* Text Search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Part name, MFG number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-250 rounded text-xs pl-8 pr-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Category dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-250 rounded text-xs px-2 py-2 w-full focus:outline-none font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.slice(1).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Location dropdown */}
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-slate-50 border border-slate-250 rounded text-xs px-2 py-2 w-full focus:outline-none font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.code}</option>
                ))}
              </select>

              {/* Stock Alerts toggle filter */}
              <select
                value={alertFilter}
                onChange={(e) => setAlertFilter(e.target.value)}
                className="bg-slate-50 border border-slate-250 rounded text-xs px-2 py-2 w-full focus:outline-none font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">All Stock Statuses</option>
                <option value="low">Low Stock Alarms</option>
              </select>

            </div>

            {/* Quick Actions buttons */}
            <div className="flex gap-2 w-full md:w-auto justify-end">
              <button 
                onClick={onExportStockReport}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] uppercase font-mono px-3.5 py-2 rounded-sm transition-colors cursor-pointer"
              >
                Stock PDF
              </button>
              {role !== UserRole.VESSEL_CREW && (
                <button
                  onClick={handleOpenAddModal}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase font-mono px-4 py-2 rounded-sm transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-600/10 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Spare
                </button>
              )}
            </div>
          </section>

          {/* Master Parts Table list container */}
          <section className="flex-1 bg-white border border-slate-200 rounded-md shadow-xs flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">
                  Real-time Registered Spare parts Inventory ({filteredParts.length})
                </h3>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {filteredParts.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs italic font-mono uppercase">
                  No matching spare parts entries registered in layout slots.
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-150 font-serif text-[10.5px] italic text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left font-serif uppercase tracking-wider">SKU / MFG Part Number</th>
                      <th className="px-4 py-2 text-left font-serif uppercase tracking-wider">Description</th>
                      <th className="px-4 py-2 text-left font-serif uppercase tracking-wider">Storage Slot Location</th>
                      <th className="px-4 py-2 text-right font-serif uppercase tracking-wider">Available Stock</th>
                      <th className="px-4 py-2 text-right font-serif uppercase tracking-wider text-slate-400">Reserved</th>
                      <th className="px-4 py-2 text-center font-serif uppercase tracking-wider">Minimum Limit</th>
                      <th className="px-4 py-2 text-right font-serif uppercase tracking-wider no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {paginatedParts.map((part) => {
                      const locationObj = locations.find((l) => l.id === part.location_id) || locations[0];
                      const isLowStock = part.current_stock <= part.reorder_point;

                      return (
                        <tr key={part.id} className="hover:bg-blue-50/40 transition-colors font-medium">
                          <td className="px-4 py-3">
                            <span className="font-mono text-blue-600 font-bold block">{part.sku}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1 font-mono rounded inline-block mt-0.5 font-bold">
                              {part.part_number}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-sm">
                            <div className="font-bold text-slate-900">{part.part_name}</div>
                            <div className="flex items-center gap-2 text-[9px] text-slate-400 uppercase mt-0.5">
                              <span>Maker: {part.maker}</span>
                              <span>•</span>
                              <span>Cat: {part.category}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 font-mono text-slate-700 font-semibold text-xs">
                              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>{locationObj ? locationObj.code : part.location_id}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 block ml-4">
                              {locationObj ? `${locationObj.warehouse} - ${locationObj.zone}` : ""}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-mono font-bold text-sm ${isLowStock ? "text-red-650 font-black animate-pulse bg-red-50 px-1.5 py-0.5 rounded border border-red-200" : "text-slate-800"}`}>
                              {part.current_stock} {part.unit}
                            </span>
                            {isLowStock && (
                              <span className="block text-[8px] font-bold text-red-500 text-right uppercase tracking-tighter mt-0.5">
                                ALARM - LOW STOCK
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-400">
                            {part.reserved_stock} {part.unit}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-550 font-mono">
                            {part.reorder_point} {part.unit}
                          </td>
                          <td className="px-4 py-3 text-right no-print relative">
                            <div className="flex items-center justify-end">
                              <div className="relative inline-block text-left">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionId(activeActionId === part.id ? null : part.id);
                                  }}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-blue-600 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all duration-200 cursor-pointer border border-slate-850"
                                >
                                  <span>Actions</span>
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                                
                                {activeActionId === part.id && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-10" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveActionId(null);
                                      }}
                                    />
                                    <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-20 overflow-hidden text-left py-1 text-slate-700 animate-in fade-in duration-100">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          setSelectedViewPart(part);
                                        }}
                                        className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-blue-500" />
                                        <span>View Details</span>
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                          handleOpenEditModal(part);
                                        }}
                                        className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                      >
                                        <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                                        <span>Edit / Stock Adjust</span>
                                      </button>
                                      
                                      {role === UserRole.SUPER_ADMIN && (
                                        <div className="border-t border-slate-100 my-1"></div>
                                      )}
                                      
                                      {role === UserRole.SUPER_ADMIN && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveActionId(null);
                                            if(confirm(`Are you absolutely sure you want to delete spare part item: ${part.part_name}?`)) {
                                              onDeletePart(part.id);
                                            }
                                          }}
                                          className="w-full px-4 py-2 text-xs font-bold text-red-650 hover:bg-red-50 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-red-650" />
                                          <span>Hapus Suku Cadang</span>
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

            {/* Pagination for Master Suku Cadang */}
            {partsTotalPages > 1 && (
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between text-xs font-mono select-none no-print">
                <div className="text-slate-500 font-medium">
                  Showing <span className="font-bold text-slate-800">{Math.min(filteredParts.length, (partsPage - 1) * partsPerPage + 1)}-{Math.min(filteredParts.length, partsPage * partsPerPage)}</span> of <span className="font-bold text-slate-800">{filteredParts.length}</span> spare parts
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={partsPage === 1}
                    onClick={() => setPartsPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-350 disabled:opacity-40 rounded font-bold text-slate-700 hover:text-blue-600 cursor-pointer disabled:cursor-not-allowed transition-all shadow-xs"
                  >
                    &larr; Previous
                  </button>
                  <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded">
                    Page {partsPage} of {partsTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={partsPage === partsTotalPages}
                    onClick={() => setPartsPage((p) => Math.min(partsTotalPages, p + 1))}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-350 disabled:opacity-40 rounded font-bold text-slate-700 hover:text-blue-600 cursor-pointer disabled:cursor-not-allowed transition-all shadow-xs"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* VIEW: VENDORS REGISTER */}
      {viewSubTab === "vendors" && (
        <div className="flex flex-col gap-6">
          <section className="bg-white border border-slate-200 p-4 rounded-md shadow-xs flex justify-between items-center no-print">
            <div>
              <h3 className="font-bold font-display text-xs text-slate-750 uppercase tracking-wider">Supplier Register</h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Active port and manufacturer provisioning representatives</p>
            </div>
            {role !== UserRole.VESSEL_CREW && (
              <button
                onClick={() => setIsVendorModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase font-mono px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Vendor
              </button>
            )}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-col gap-3 hover:border-slate-350 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{vendor.name}</h4>
                    <span className="font-mono text-[9px] bg-blue-50 text-blue-800 px-1.5 font-bold rounded mt-1 inline-block uppercase">
                      Code: {vendor.code}
                    </span>
                  </div>
                  <Building2 className="w-5 h-5 text-slate-400" />
                </div>
                
                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600 font-medium">
                  <div className="grid grid-cols-3">
                    <span className="text-slate-400">Contact Person:</span>
                    <span className="col-span-2 text-slate-900 font-bold">{vendor.contactPerson}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-400">Email:</span>
                    <span className="col-span-2 font-mono text-blue-600 truncate">{vendor.email}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-400">Tel Phone:</span>
                    <span className="col-span-2 font-mono">{vendor.phone}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-400">Address:</span>
                    <span className="col-span-2 truncate">{vendor.address}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: STORAGE LAYOUT MATRIX */}
      {viewSubTab === "locations" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <section className="bg-white border border-slate-200 p-5 rounded-md shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
            <div className="space-y-1">
              <h3 className="font-bold text-xs font-display uppercase tracking-widest text-slate-850 flex items-center gap-2">
                <MapPin className="text-blue-600 w-4 h-4 shrink-0" />
                Matriks Tata Letak & Posisi Rak Gudang (A1 - C3)
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                Sistem koordinat vertikal & horizontal: <span className="font-bold text-blue-600">A1-A3</span>, <span className="font-bold text-blue-600">B1-B3</span>, dan <span className="font-bold text-blue-600">C1-C3</span>.
                Semakin besar angkanya (1 → 2 → 3), semakin tinggi posisi rak vertikal barang tersebut.
              </p>
            </div>
            {role !== UserRole.VESSEL_CREW && (
              <button
                type="button"
                onClick={handleOpenAddLocationModal}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase font-mono px-3 py-1.5 rounded shadow-xs transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Slot Lokasi
              </button>
            )}
          </section>

          {/* VISUAL LAYOUT SCHEMATIC GRID */}
          <div className="bg-slate-900 text-slate-100 rounded-md p-5 border border-slate-800 font-mono text-xs shadow-md">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
              <span className="font-bold text-white uppercase text-[9px] tracking-widest flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                Visualisasi Skema Lantai & Ketinggian Rak Gudang (Storage Elevation Grid)
              </span>
              <span className="text-[9px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">HQ Depot Grid Plan</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Row A */}
              <div className="bg-slate-950/40 p-3 rounded border border-slate-800/80">
                <div className="text-slate-300 text-[9px] uppercase font-bold tracking-wider mb-2 text-center border-b border-slate-800 pb-1 font-sans">
                  Baris RAK A (Fast Moving)
                </div>
                <div className="flex flex-col gap-1.5 text-[10px]">
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/40 hover:bg-slate-800 rounded">
                    <span className="font-bold text-amber-500">A3 (High Shelf)</span>
                    <span className="text-[9px] text-slate-400">Elevasi 2.5m+ (Forklift/Ladder!)</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/40 hover:bg-slate-800 rounded">
                    <span className="font-bold text-blue-400">A2 (Mid Shelf)</span>
                    <span className="text-[9px] text-slate-400">Elevasi 1.2m - 2.5m (Sedang)</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/40 hover:bg-slate-800 rounded">
                    <span className="font-bold text-emerald-400">A1 (Low Shelf)</span>
                    <span className="text-[9px] text-slate-400">Elevasi Dasar &lt; 1.2m (Mudah)</span>
                  </div>
                </div>
              </div>

              {/* Row B */}
              <div className="bg-slate-950/40 p-3 rounded border border-slate-800/80 font-sans">
                <div className="text-slate-300 text-[9px] uppercase font-bold tracking-wider mb-2 text-center border-b border-slate-800 pb-1">
                  Baris RAK B (Medium Weight)
                </div>
                <div className="flex flex-col gap-1.5 text-[10px] font-mono">
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/40 hover:bg-slate-800 rounded">
                    <span className="font-bold text-amber-500">B3 (High Shelf)</span>
                    <span className="text-[9px] text-slate-400">Elevasi 2.5m+ (Forklift/Ladder!)</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/40 hover:bg-slate-800 rounded">
                    <span className="font-bold text-blue-400">B2 (Mid Shelf)</span>
                    <span className="text-[9px] text-slate-400">Elevasi 1.2m - 2.5m (Sedang)</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/40 hover:bg-slate-800 rounded">
                    <span className="font-bold text-emerald-400">B1 (Low Shelf)</span>
                    <span className="text-[9px] text-slate-400">Elevasi Dasar &lt; 1.2m (Mudah)</span>
                  </div>
                </div>
              </div>

              {/* Row C */}
              <div className="bg-slate-950/40 p-3 rounded border border-slate-800/80 font-sans">
                <div className="text-slate-300 text-[9px] uppercase font-bold tracking-wider mb-2 text-center border-b border-slate-800 pb-1">
                  Baris RAK C (Electrical / Light)
                </div>
                <div className="flex flex-col gap-1.5 text-[10px] font-mono font-mono">
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/40 hover:bg-slate-800 rounded">
                    <span className="font-bold text-amber-500">C3 (High Shelf)</span>
                    <span className="text-[9px] text-slate-400">Elevasi 2.5m+ (Forklift/Ladder!)</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/40 hover:bg-slate-800 rounded">
                    <span className="font-bold text-blue-400">C2 (Mid Shelf)</span>
                    <span className="text-[9px] text-slate-400">Elevasi 1.2m - 2.5m (Sedang)</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/40 hover:bg-slate-800 rounded">
                    <span className="font-bold text-emerald-400">C1 (Low Shelf)</span>
                    <span className="text-[9px] text-slate-400">Elevasi Dasar &lt; 1.2m (Mudah)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {locations.map((loc) => {
              // Count which parts are stored in this location
              const partCount = parts.filter(p => p.location_id === loc.id || p.location_id === loc.code).length;

              // Determine visual badge based on height level (1, 2, or 3)
              const codeLower = loc.code.toLowerCase();
              const isHigh = codeLower.includes("3") || loc.shelf.toLowerCase().includes("3") || loc.shelf.toLowerCase().includes("high");
              const isMid = codeLower.includes("2") || loc.shelf.toLowerCase().includes("2") || loc.shelf.toLowerCase().includes("mid");

              let heightBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
              let heightLabel = "LEVEL 1 (Dasar, Mudah Diakses)";
              if (isHigh) {
                heightBadge = "bg-amber-50 text-amber-700 border-amber-200";
                heightLabel = "LEVEL 3 (Tinggi, Butuh Tangga/Forklift)";
              } else if (isMid) {
                heightBadge = "bg-blue-50 text-blue-700 border-blue-200";
                heightLabel = "LEVEL 2 (Sedang, Tinggi Dada)";
              }

              return (
                <div key={loc.id} className="bg-white border border-slate-200 rounded-md p-4 flex flex-col gap-3 shadow-xs hover:border-blue-400 transition-colors">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="text-blue-600 w-4 h-4 shrink-0" />
                      <span className="font-mono font-bold text-xs text-slate-900">{loc.code}</span>
                    </div>
                    <span className="text-[10px] font-bold font-mono bg-slate-100 text-slate-100 bg-slate-800 px-2 py-0.5 rounded">
                      {partCount} Jenis Items
                    </span>
                  </div>
                  
                  <div className="space-y-1.5 text-xs flex-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Depot Fac:</span>
                      <span className="font-bold text-slate-800">{loc.warehouse}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sector Zone:</span>
                      <span className="text-slate-700 font-medium">{loc.zone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Row Grid Rack:</span>
                      <span className="text-slate-700 font-medium">{loc.rack}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Shelf Height:</span>
                      <span className="text-slate-700 font-medium">{loc.shelf}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Container Bin:</span>
                      <span className="text-slate-700 font-semibold">{loc.bin}</span>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-dashed border-slate-100">
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border inline-block ${heightBadge}`}>
                        {heightLabel}
                      </span>
                    </div>
                  </div>

                  {role !== UserRole.VESSEL_CREW && (
                    <div className="border-t border-slate-100 pt-2 flex gap-1.5 justify-end no-print">
                      <button
                        type="button"
                        onClick={() => handleOpenEditLocationModal(loc)}
                        className="p-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-blue-600 rounded text-[9.5px] font-bold uppercase transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (partCount > 0) {
                            alert(`Gagal menghapus: Slot ini masih digunakan oleh ${partCount} item sparepart. Pindahkan item terlebih dahulu.`);
                            return;
                          }
                          if (onDeleteLocation && confirm(`Apakah Anda yakin ingin menghapus slot lokasi ${loc.code}?`)) {
                            onDeleteLocation(loc.id);
                          }
                        }}
                        className="p-1 px-2 bg-red-50 hover:bg-red-100 text-red-650 rounded text-[9.5px] font-bold uppercase transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL FORM: CREATE OR EDIT SPARE PART ITEM */}
      {isPartModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white text-slate-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-200">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center border-b border-slate-800">
              <h3 className="font-display font-semibold text-xs uppercase tracking-widest flex items-center gap-2">
                <BoxIcon / > {editingPart ? "Modify Part & Stock Adjust" : "Add genuine marine spare to catalog"}
              </h3>
              <button 
                onClick={() => setIsPartModalOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitPartForm} className="overflow-y-auto p-6 max-h-[80vh] space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider block mb-1">
                    SKU Identifier (auto-assigned if empty)
                  </label>
                  <input
                    type="text"
                    value={partForm.sku || ""}
                    onChange={(e) => setPartForm({ ...partForm, sku: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. SKU-ME-PST-05"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider block mb-1">
                    Genuine Maker Part Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={partForm.part_number || ""}
                    onChange={(e) => setPartForm({ ...partForm, part_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. MAN-560-1282"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider block mb-1">
                  Item Description *
                </label>
                <input
                  type="text"
                  required
                  value={partForm.part_name || ""}
                  onChange={(e) => setPartForm({ ...partForm, part_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2 font-semibold text-slate-800 focus:outline-none"
                  placeholder="e.g. Main Engine cylinder Liner sealing gasket type-K"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Alternative Part Code
                  </label>
                  <input
                    type="text"
                    value={partForm.alternative_part_number || ""}
                    onChange={(e) => setPartForm({ ...partForm, alternative_part_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2 font-mono"
                    placeholder="ALT-MAN-560X"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Spare Part Category
                  </label>
                  <select
                    value={partForm.category}
                    onChange={(e) => setPartForm({ ...partForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2 py-2 font-bold text-slate-700 cursor-pointer"
                  >
                    {categories.slice(1).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Asset Brand Name
                  </label>
                  <input
                    type="text"
                    value={partForm.brand || ""}
                    onChange={(e) => setPartForm({ ...partForm, brand: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-1.5"
                    placeholder="e.g. MAN"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Genuine Maker
                  </label>
                  <input
                    type="text"
                    value={partForm.maker || ""}
                    onChange={(e) => setPartForm({ ...partForm, maker: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-1.5"
                    placeholder="MAN Energy Solutions"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Asset Supply Unit
                  </label>
                  <input
                    type="text"
                    value={partForm.unit || ""}
                    onChange={(e) => setPartForm({ ...partForm, unit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2 py-1.5 text-center uppercase"
                    placeholder="e.g. PCS, SET, KG"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-150 p-3 rounded">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Physical Storage Slot Location
                  </label>
                  <select
                    value={partForm.location_id}
                    onChange={(e) => setPartForm({ ...partForm, location_id: e.target.value })}
                    className="w-full bg-white border border-slate-250 rounded text-xs px-2 py-2 font-mono font-bold text-slate-700 cursor-pointer"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.code} ({loc.zone})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Associate Supplier / Vendor
                  </label>
                  <select
                    value={partForm.vendor_id}
                    onChange={(e) => setPartForm({ ...partForm, vendor_id: e.target.value })}
                    className="w-full bg-white border border-slate-250 rounded text-xs px-2 py-2 font-bold text-slate-700 cursor-pointer"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 border-t border-slate-100 pt-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Safety stock min
                  </label>
                  <input
                    type="number"
                    value={partForm.minimum_stock || 0}
                    onChange={(e) => setPartForm({ ...partForm, minimum_stock: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-1.5 text-center font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Reorder point
                  </label>
                  <input
                    type="number"
                    value={partForm.reorder_point || 0}
                    onChange={(e) => setPartForm({ ...partForm, reorder_point: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-1.5 text-center font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Maximum Stock
                  </label>
                  <input
                    type="number"
                    value={partForm.maximum_stock || 0}
                    onChange={(e) => setPartForm({ ...partForm, maximum_stock: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-1.5 text-center font-mono"
                  />
                </div>
                <div className="bg-blue-50 p-1.5 rounded border border-blue-200">
                  <label className="text-[9.5px] uppercase font-bold text-blue-700 font-mono block mb-1 text-center">
                    Current stock counts
                  </label>
                  <input
                    type="number"
                    value={partForm.current_stock || 0}
                    onChange={(e) => setPartForm({ ...partForm, current_stock: Number(e.target.value) })}
                    className="w-full bg-white border border-blue-400 rounded text-xs px-2.5 py-1 text-center font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                  Vessel Compatibility Class Details
                </label>
                <input
                  type="text"
                  value={partForm.vessel_compatibility || ""}
                  onChange={(e) => setPartForm({ ...partForm, vessel_compatibility: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-1.5"
                  placeholder="e.g. MV. KARTINI BARUNA, MV. INTAN BARUNA"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                  Barcode / QR Label
                </label>
                <input
                  type="text"
                  value={partForm.barcode || ""}
                  onChange={(e) => setPartForm({ ...partForm, barcode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-1.5 font-mono"
                  placeholder="AN8911282"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                  Technical Remarks Description
                </label>
                <textarea
                  value={partForm.description || ""}
                  onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2 h-20"
                  placeholder="Enter specifications, heat stamps, material codes..."
                />
              </div>

              <div className="bg-slate-900 border-t border-slate-100 p-4 -mx-6 -mb-6 flex justify-end gap-3 font-mono">
                <button
                  type="button"
                  onClick={() => setIsPartModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  {editingPart ? "Apply Adjustments" : "Commit Spare"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL FORM: CREATE NEW VENDOR */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center border-b border-slate-800">
              <h3 className="font-display font-semibold text-xs uppercase tracking-widest flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-400" /> Catalog New Supplier Vendor
              </h3>
              <button onClick={() => setIsVendorModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitVendorForm} className="p-6 space-y-4 font-sans">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                  Supplier Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={vendorForm.name}
                  onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2 text-slate-900 font-semibold"
                  placeholder="e.g. Wärtsilä Corporation"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                  Supplier Identifier Code (Initials)
                </label>
                <input
                  type="text"
                  value={vendorForm.code}
                  onChange={(e) => setVendorForm({ ...vendorForm, code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2 font-mono uppercase"
                  placeholder="e.g. VND-WRT-01"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                  Point-of-Contact agent *
                </label>
                <input
                  type="text"
                  required
                  value={vendorForm.contactPerson}
                  onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2"
                  placeholder="e.g. Hans Lindqvist"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={vendorForm.email}
                  onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2 font-mono"
                  placeholder="spareparts@supplier.com"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={vendorForm.phone}
                  onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2 font-mono"
                  placeholder="+358 10 990 0000"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                  Supplier Depot Address
                </label>
                <input
                  type="text"
                  value={vendorForm.address}
                  onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2"
                  placeholder="Helsinki, Finland"
                />
              </div>

              <div className="bg-slate-900 border-t border-slate-100 p-4 -mx-6 -mb-6 flex justify-end gap-3 font-mono">
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase cursor-pointer"
                >
                  Register Vendor
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL FORM: CREATE OR EDIT STORAGE SLOT LOCATION */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center border-b border-slate-800">
              <h3 className="font-display font-semibold text-xs uppercase tracking-widest flex items-center gap-1.55">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0" /> {editingLocation ? "Ubah Detail Slot Lokasi" : "Daftarkan Slot Lokasi Baru"}
              </h3>
              <button onClick={() => setIsLocationModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitLocationForm} className="p-6 space-y-4 font-sans text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                  Kode Koordinat Lokasi * (e.g., A1, A2, B3)
                </label>
                <input
                  type="text"
                  required
                  value={locationForm.code}
                  onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2 font-mono font-bold"
                  placeholder="e.g. A3"
                />
                <span className="text-[9px] text-slate-400 mt-1 block font-mono">
                  Gunakan format baris + tingkat tinggi. Contoh: A1 (dasar), B2 (sedang), C3 (rak tinggi).
                </span>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                  Fasilitas Gudang / Warehouse Name *
                </label>
                <input
                  type="text"
                  required
                  value={locationForm.warehouse}
                  onChange={(e) => setLocationForm({ ...locationForm, warehouse: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2 font-bold text-slate-700"
                  placeholder="e.g. Jakarta HQ Warehouse"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Sector Zone *
                  </label>
                  <input
                    type="text"
                    required
                    value={locationForm.zone}
                    onChange={(e) => setLocationForm({ ...locationForm, zone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2"
                    placeholder="e.g. Zone A"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Row Grid Rack *
                  </label>
                  <input
                    type="text"
                    required
                    value={locationForm.rack}
                    onChange={(e) => setLocationForm({ ...locationForm, rack: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2"
                    placeholder="e.g. Rack A"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Shelf Height Level *
                  </label>
                  <select
                    required
                    value={locationForm.shelf}
                    onChange={(e) => setLocationForm({ ...locationForm, shelf: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2 py-2 text-slate-800"
                  >
                    <option value="">-- Pilih Level --</option>
                    <option value="Level 1 (Dasar, < 1.2m)">Level 1 (Dasar, &lt; 1.2m)</option>
                    <option value="Level 2 (Sedang, 1.2m - 2.5m)">Level 2 (Sedang, 1.2m - 2.5m)</option>
                    <option value="Level 3 (Tinggi, > 2.5m)">Level 3 (Tinggi, &gt; 2.5m)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
                    Container Bin ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={locationForm.bin}
                    onChange={(e) => setLocationForm({ ...locationForm, bin: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded text-xs px-2.5 py-2 font-mono"
                    placeholder="e.g. A3-G"
                  />
                </div>
              </div>

              <div className="bg-slate-900 border-t border-slate-100 p-4 -mx-6 -mb-6 flex justify-end gap-3 font-mono pt-3">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase cursor-pointer"
                >
                  {editingLocation ? "Simpan" : "Daftarkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED VIEW MODAL FOR SPARE PART */}
      {selectedViewPart && (() => {
        const part = selectedViewPart;
        const locId = part.location_id;
        const matchedLoc = locations.find((l) => l.id === locId) || locations.find((l) => l.code === locId);
        const matchedVendor = vendors.find((v) => v.id === part.vendor_id);
        const isLow = part.current_stock <= part.reorder_point;
        
        let heightLevelLabel = "LEVEL 1 (Dasar, Mudah Diakses)";
        let heightLevelColor = "bg-emerald-50 text-emerald-800 border-emerald-250";
        if (matchedLoc) {
          const codeLower = matchedLoc.code.toLowerCase();
          const isHigh = codeLower.includes("3") || matchedLoc.shelf.toLowerCase().includes("3") || matchedLoc.shelf.toLowerCase().includes("high");
          const isMid = codeLower.includes("2") || matchedLoc.shelf.toLowerCase().includes("2") || matchedLoc.shelf.toLowerCase().includes("mid");
          if (isHigh) {
            heightLevelLabel = "LEVEL 3 (Tinggi, Butuh Tangga / Forklift)";
            heightLevelColor = "bg-amber-50 text-amber-805 border-amber-250";
          } else if (isMid) {
            heightLevelLabel = "LEVEL 2 (Sedang, Tinggi Dada)";
            heightLevelColor = "bg-blue-50 text-blue-805 border-blue-250";
          }
        }

        return (
          <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white text-slate-800 rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col border border-slate-200 transition-all">
              
              {/* Modal Header */}
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <BoxIcon />
                  <div>
                    <h3 className="font-display font-black text-xs uppercase tracking-wider text-slate-200">
                      Rincian Detail Suku Cadang Suku Cadang
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                      ID: {part.id} &bull; SKU: <span className="text-yellow-450 font-bold">{part.sku || "N/A"}</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedViewPart(null)} 
                  className="text-slate-405 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
                
                {/* Main Card Header with Title and Stock Status Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                      {part.category}
                    </span>
                    <h2 className="font-display font-bold text-lg text-slate-900 mt-1.5 leading-tight">
                      {part.part_name}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Part Number: <span className="font-mono text-slate-900 font-bold">{part.part_number}</span>
                      {part.alternative_part_number && (
                        <> | Alt Part Code: <span className="font-mono text-slate-900 font-bold">{part.alternative_part_number}</span></>
                      )}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-4 shrink-0 min-w-[176px]">
                    <div className="text-center flex-1">
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono block">Stok Saat Ini</span>
                      <p className={`text-xl font-black mt-0.5 ${isLow ? "text-red-650 animate-pulse" : "text-emerald-650"}`}>
                        {part.current_stock}
                      </p>
                      <span className="text-[9px] font-bold text-slate-500 font-mono uppercase bg-slate-200/60 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {part.unit}
                      </span>
                    </div>

                    <div className="w-px h-10 bg-slate-200"></div>

                    <div className="text-xs space-y-1">
                      <p className="text-slate-500">Reserved: <span className="font-bold text-slate-800 font-mono">{part.reserved_stock}</span></p>
                      <p className="text-slate-500">Reorder: <span className="font-bold text-slate-800 font-mono">{part.reorder_point}</span></p>
                    </div>
                  </div>
                </div>

                {/* Grid info: Technical Particulars and Location Logistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Technical Specifications */}
                  <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-200 space-y-4">
                    <h4 className="text-[11px] uppercase font-black tracking-wider text-slate-500 font-mono flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                      <Anchor className="w-3.5 h-3.5 text-blue-500" /> Spesifikasi Teknis Suku Cadang
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-y-3 text-xs leading-relaxed">
                      <span className="text-slate-500 font-medium font-sans">Merk / Brand:</span>
                      <span className="col-span-2 font-bold text-slate-800">{part.brand || "-"}</span>

                      <span className="text-slate-500 font-medium font-sans">Produsen (Maker):</span>
                      <span className="col-span-2 font-bold text-slate-800">{part.maker || "-"}</span>

                      <span className="text-slate-500 font-medium font-sans">Komp. Kapal:</span>
                      <span className="col-span-2 text-slate-800 bg-white border border-slate-200 p-1 px-1.5 rounded-sm font-medium text-[11px]">
                        {part.vessel_compatibility || "Semua Kapal"}
                      </span>

                      <span className="text-slate-500 font-medium font-mono">Barcode:</span>
                      <span className="col-span-2 font-mono font-bold text-slate-800 flex items-center gap-1.5">
                        <Barcode className="w-4 h-4 text-slate-500" /> {part.barcode || "N/A"}
                      </span>
                    </div>

                    {part.description && (
                      <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Deskripsi & Catatan Tambahan:</span>
                        <p className="text-xs text-slate-650 leading-relaxed bg-white border border-slate-200 p-2.5 rounded italic">
                          "{part.description}"
                        </p>
                      </div>
                    )}

                    <div className="pt-2">
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded p-2 text-center max-w-xs mx-auto">
                        <div className="w-12 h-12 bg-slate-100 flex items-center justify-center font-mono font-bold text-xs border border-slate-250 select-none">
                          [QR CODE]
                        </div>
                        <div className="text-left">
                          <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">System Digital Token ID</span>
                          <p className="text-[10px] font-mono font-bold text-slate-800">{part.qr_code || "QR_" + part.id}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Storage Warehouse Location and LIVE Reassignment */}
                  <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-200 space-y-4">
                    <h4 className="text-[11px] uppercase font-black tracking-wider text-slate-500 font-mono flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" /> Posisi Penyimpanan di Gudang
                    </h4>

                    {matchedLoc ? (
                      <div className="space-y-3 text-xs leading-relaxed">
                        <div className="grid grid-cols-3">
                          <span className="text-slate-500 font-medium">Slot Letak:</span>
                          <span className="col-span-2 font-mono font-black text-xs text-slate-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded inline-block w-fit">
                            {matchedLoc.code}
                          </span>
                        </div>

                        <div className="grid grid-cols-3">
                          <span className="text-slate-500 font-medium">Fasilitas Depot:</span>
                          <span className="col-span-2 font-bold text-slate-800">{matchedLoc.warehouse}</span>
                        </div>

                        <div className="grid grid-cols-3">
                          <span className="text-slate-500 font-medium">Zona Sektor (Zone):</span>
                          <span className="col-span-2 font-semibold text-slate-700">{matchedLoc.zone}</span>
                        </div>

                        <div className="grid grid-cols-3">
                          <span className="text-slate-500 font-medium">Rak Grid (Rack):</span>
                          <span className="col-span-2 text-slate-700">{matchedLoc.rack}</span>
                        </div>

                        <div className="grid grid-cols-3">
                          <span className="text-slate-500 font-medium">Kotak Wadah (Bin):</span>
                          <span className="col-span-2 font-mono font-bold text-slate-800">{matchedLoc.bin}</span>
                        </div>

                        <div className="mt-2 text-center">
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-1 rounded border inline-block ${heightLevelColor}`}>
                            {heightLevelLabel}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-xs text-amber-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                        <span>Suku cadang ini tidak terikat pada slot gudang resmi aktif!</span>
                      </div>
                    )}

                    {/* LIVE LOCATION SWITCHER DROPDOWN */}
                    {role !== UserRole.VESSEL_CREW && (
                      <div className="mt-4 bg-blue-50/50 border border-blue-100 rounded-lg p-4 space-y-3.5 shadow-xs">
                        <div className="flex items-center gap-1.5 border-b border-blue-100 pb-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-[10px] uppercase font-bold text-blue-800 font-mono tracking-wider">
                            Pindahkan Slot Penyimpanan
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Pilih posisi baru untuk menaruh spare part ini pada rack / shelf grid gudang:
                        </p>

                        <div className="space-y-2.5">
                          <select
                            id="live-location-reassign"
                            defaultValue={part.location_id}
                            className="bg-white border border-slate-250 rounded-md text-xs px-3 py-2 font-mono font-bold text-slate-800 w-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {locations.map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                Slot {loc.code} — {loc.zone} ({loc.bin})
                              </option>
                            ))}
                          </select>
                          
                          <button
                            type="button"
                            onClick={async () => {
                              const selectEl = document.getElementById("live-location-reassign") as HTMLSelectElement;
                              if (selectEl) {
                                const newLocId = selectEl.value;
                                try {
                                  await onUpdatePart(part.id, { location_id: newLocId });
                                  setSelectedViewPart({
                                    ...part,
                                    location_id: newLocId
                                  });
                                  alert(`Lokasi penyimpanan suku cadang berhasil dipindahkan ke slot: ${locations.find(l => l.id === newLocId)?.code || newLocId}`);
                                } catch (err: any) {
                                  alert(`Gagal memindahkan lokasi: ${err.message}`);
                                }
                              }
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10.5px] font-bold uppercase tracking-wider py-2.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10 hover:shadow-md"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Terapkan Pemindahan
                          </button>
                        </div>
                        
                        <span className="text-[8.5px] text-slate-450 leading-relaxed block text-center font-mono italic">
                          * Sistem akan mencatat riwayat pemindahan slot penyimpanan secara otomatis.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Associated Vendor Section */}
                <div className="bg-slate-550/50 p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <h4 className="text-[11px] uppercase font-black tracking-wider text-slate-500 font-mono flex items-center gap-1.5 border-b border-slate-200 pb-1.5 mb-3">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" /> Informasi Supplier / Vendor Rekan
                  </h4>
                  {matchedVendor ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                      <div className="space-y-1.5">
                        <p className="text-slate-500">Nama Supplier: <span className="font-bold text-slate-900">{matchedVendor.name}</span></p>
                        <p className="text-slate-500">Kode Rekan: <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold">{matchedVendor.code}</span></p>
                        <p className="text-slate-500">Alamat Kantor: <span className="text-slate-700 font-normal">{matchedVendor.address}</span></p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-slate-500">Contact Person: <span className="font-bold text-slate-800">{matchedVendor.contactPerson || "-"}</span></p>
                        <p className="text-slate-500 font-mono">Email: <a href={`mailto:${matchedVendor.email}`} className="text-blue-600 hover:underline">{matchedVendor.email}</a></p>
                        <p className="text-slate-500 font-mono">No. Telepon: <span className="text-slate-800 font-semibold">{matchedVendor.phone || "-"}</span></p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Tidak ada supplier rekan yang dikaitkan pada item ini.</p>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-900 border-t border-slate-800 p-4 px-6 flex justify-between items-center font-mono">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Mare-WMS Engine v1.8
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedViewPart(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold uppercase cursor-pointer"
                  >
                    Tutup
                  </button>
                  {role !== UserRole.VESSEL_CREW && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedViewPart(null);
                        handleOpenEditModal(part);
                      }}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Ubah Data & Stok
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}

// Inline Tiny box icon
function BoxIcon() {
  return (
    <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
