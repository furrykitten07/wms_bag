/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import QRCode from "react-qr-code";
import { 
  Search, 
  Layers, 
  FolderTree, 
  QrCode, 
  Printer, 
  ChevronRight, 
  Download, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Info, 
  X, 
  FileText, 
  Boxes, 
  HelpCircle, 
  Plus, 
  Edit2, 
  Save, 
  Barcode, 
  RotateCcw, 
  CheckCircle2, 
  Package, 
  MapPin, 
  ShieldCheck 
} from "lucide-react";

import { SparePart } from "../types.js";
import { api } from "../api.js";

// Catalog item interface linked 100% to Spare Part Master
export interface CatalogItem {
  id: string;
  part_name: string;
  part_number: string;
  sku: string;
  barcode: string;
  description: string;
  unit: string;
  hierarchy: string[];
  specification: string;
  manufacturer: string;
  vessel_compatibility: string;
  weight_kg: number;
  current_stock: number;
  location_id?: string;
  reorder_point?: number;
}

interface SparePartCatalogViewProps {
  parts?: SparePart[];
  onAddPart?: (part: Partial<SparePart>) => Promise<any>;
  onUpdatePart?: (id: string, part: Partial<SparePart>) => Promise<any>;
}

// Clean SVG Barcode Graphic Component
export function BarcodeGraphic({ code, height = 32, width = 140 }: { code: string; height?: number; width?: number }) {
  const bars = useMemo(() => {
    const clean = String(code || "BC-00000000").replace(/[^a-zA-Z0-9]/g, "");
    const pattern: number[] = [];
    for (let i = 0; i < clean.length; i++) {
      const charCode = clean.charCodeAt(i);
      pattern.push((charCode % 3) + 1);
      pattern.push(((charCode >> 1) % 2) + 1);
      pattern.push(((charCode >> 2) % 3) + 1);
    }
    while (pattern.length < 32) {
      pattern.push(1, 2, 1, 3);
    }
    return pattern.slice(0, 38);
  }, [code]);

  let currentX = 8;
  return (
    <div className="flex flex-col items-center bg-white px-2 py-1 rounded border border-slate-200 shadow-xs select-none">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-hidden">
        <rect width={width} height={height} fill="#ffffff" />
        {bars.map((barWidth, idx) => {
          const x = currentX;
          currentX += barWidth + 1.2;
          if (idx % 2 === 0 && x + barWidth <= width - 8) {
            return (
              <rect
                key={idx}
                x={x}
                y={2}
                width={barWidth}
                height={height - 4}
                fill="#0f172a"
              />
            );
          }
          return null;
        })}
      </svg>
      <span className="text-[9px] font-mono font-bold tracking-widest text-slate-800 mt-0.5">
        {code}
      </span>
    </div>
  );
}

// Helper to get persistent barcode mapping from localStorage
function getBarcodeCache(): Record<string, string> {
  try {
    const saved = localStorage.getItem("wms_part_barcode_cache");
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
}

function saveBarcodeCache(cache: Record<string, string>) {
  try {
    localStorage.setItem("wms_part_barcode_cache", JSON.stringify(cache));
  } catch (e) {}
}

// Helper to get custom catalog metadata (hierarchy, custom specs, weight)
function getCatalogMetadata(): Record<string, Partial<CatalogItem>> {
  try {
    const saved = localStorage.getItem("spare_part_catalog_custom_meta");
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
}

function saveCatalogMetadata(meta: Record<string, Partial<CatalogItem>>) {
  try {
    localStorage.setItem("spare_part_catalog_custom_meta", JSON.stringify(meta));
  } catch (e) {}
}

// Generate unique barcode generator with format BC-XXXXXXXX
function generateRandomBarcode(): string {
  const num = Math.floor(10000000 + Math.random() * 90000000);
  return `BC-${num}`;
}

export default function SparePartCatalogView({ 
  parts = [],
  onAddPart,
  onUpdatePart 
}: SparePartCatalogViewProps) {
  // Local state for catalog metadata overrides
  const [customMeta, setCustomMeta] = useState<Record<string, Partial<CatalogItem>>>(() => getCatalogMetadata());

  // Listen to catalog updates from receiving or other tabs
  useEffect(() => {
    const handleUpdate = () => {
      setCustomMeta(getCatalogMetadata());
    };
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("catalog_updated", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("catalog_updated", handleUpdate);
    };
  }, []);

  // Construct allCatalogItems directly from Spare Part Master (`parts`), ensuring 100% unique barcodes
  const allCatalogItems = useMemo<CatalogItem[]>(() => {
    if (!parts || parts.length === 0) return [];

    const barcodeCache = getBarcodeCache();
    const usedBarcodes = new Set<string>();
    let cacheChanged = false;

    const items: CatalogItem[] = parts.map((p, idx) => {
      // 1. Resolve distinct barcode
      let bc = (p.barcode || "").trim();
      
      // Check if barcode is embedded in remarks
      if (!bc && p.remarks && p.remarks.includes("[BC:")) {
        const match = p.remarks.match(/\[BC:([^\]]+)\]/);
        if (match) bc = match[1].trim();
      }

      // Check cache
      if (!bc && barcodeCache[p.id]) {
        bc = barcodeCache[p.id];
      }

      // If empty or colliding with a previously assigned barcode in this list
      if (!bc || usedBarcodes.has(bc.toUpperCase())) {
        // Generate deterministic seed based on ID & SKU
        const seedStr = `${p.id}-${p.sku || ""}-${idx}`;
        let hash = 0;
        for (let i = 0; i < seedStr.length; i++) {
          hash = (hash << 5) - hash + seedStr.charCodeAt(i);
          hash |= 0;
        }
        const cleanNum = (Math.abs(hash) % 90000000 + 10000000).toString();
        bc = `BC-${cleanNum}`;

        // Ensure absolute uniqueness across the set
        let collisionCounter = 1;
        while (usedBarcodes.has(bc.toUpperCase())) {
          bc = `BC-${Math.min(99999999, Number(cleanNum) + collisionCounter * 137)}`;
          collisionCounter++;
        }
      }

      usedBarcodes.add(bc.toUpperCase());

      if (barcodeCache[p.id] !== bc) {
        barcodeCache[p.id] = bc;
        cacheChanged = true;
      }

      // 2. Resolve custom metadata overrides if any
      const meta = customMeta[p.id] || {};

      const hierarchy = meta.hierarchy || [
        p.category || "General Spares",
        p.maker || p.brand || "Master System",
        "Engine Parts"
      ];

      return {
        id: p.id,
        part_name: p.part_name || "Suku Cadang",
        part_number: p.part_number || "-",
        sku: p.sku || `SKU-${p.id}`,
        barcode: bc,
        description: p.description || p.remarks || `${p.part_name} — Suku cadang terdaftar dalam Spare Part Master.`,
        unit: p.unit || "PCS",
        hierarchy: hierarchy,
        specification: meta.specification || p.specification || `Rak Penyimpanan: ${p.location_id || 'Depot Utama'}, Limit RP: ${p.reorder_point || 0}`,
        manufacturer: meta.manufacturer || p.maker || p.brand || p.vendor_id || "Vendor Maritim BAg",
        vessel_compatibility: meta.vessel_compatibility || p.vessel_compatibility || "Semua Armada Kapal",
        weight_kg: meta.weight_kg !== undefined ? meta.weight_kg : (Number((p as any).weight_kg) || 1.0),
        current_stock: p.current_stock ?? 0,
        location_id: p.location_id,
        reorder_point: p.reorder_point
      };
    });

    if (cacheChanged) {
      saveBarcodeCache(barcodeCache);
    }

    return items;
  }, [parts, customMeta]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Modal states
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editItemForm, setEditItemForm] = useState<CatalogItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New item form state
  const [newPartName, setNewPartName] = useState("");
  const [newPartNumber, setNewPartNumber] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newBarcode, setNewBarcode] = useState(generateRandomBarcode());
  const [newDescription, setNewDescription] = useState("");
  const [newUnit, setNewUnit] = useState("PCS");
  const [newSystem, setNewSystem] = useState("General Spares");
  const [newSubsystem, setNewSubsystem] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newSpecification, setNewSpecification] = useState("");
  const [newManufacturer, setNewManufacturer] = useState("");
  const [newVesselCompatibility, setNewVesselCompatibility] = useState("Semua Armada Kapal");
  const [newWeight, setNewWeight] = useState("1.0");
  const [newInitialStock, setNewInitialStock] = useState("10");
  const [newLocationId, setNewLocationId] = useState("loc-1");

  const [validationError, setValidationError] = useState("");
  const [editValidationError, setEditValidationError] = useState("");

  // Categories compiled dynamically from data hierarchy roots
  const categories = useMemo(() => {
    const list = new Set<string>();
    allCatalogItems.forEach(item => {
      if (item.hierarchy && item.hierarchy[0]) {
        list.add(item.hierarchy[0]);
      }
    });
    return ["All", ...Array.from(list)];
  }, [allCatalogItems]);

  // Filtered catalog data
  const filteredData = useMemo(() => {
    return allCatalogItems.filter(item => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        item.part_name.toLowerCase().includes(query) ||
        item.part_number.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.barcode.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.manufacturer.toLowerCase().includes(query) ||
        item.hierarchy.some(h => h.toLowerCase().includes(query));

      const matchesCategory = selectedCategory === "All" || item.hierarchy[0] === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [allCatalogItems, searchQuery, selectedCategory]);

  // Pagination logic
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, itemsPerPage]);

  const handleOpenPrintModal = (item: CatalogItem) => {
    setSelectedItem(item);
    setIsEditingItem(false);
    setEditValidationError("");
    setEditItemForm(JSON.parse(JSON.stringify(item)));
    setIsPrintModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setNewPartName("");
    setNewPartNumber("");
    setNewSku(`SKU-${Date.now().toString().slice(-6)}`);
    setNewBarcode(generateRandomBarcode());
    setNewDescription("");
    setNewUnit("PCS");
    setNewSystem("General Spares");
    setNewSubsystem("");
    setNewSection("");
    setNewSpecification("");
    setNewManufacturer("Vendor Maritim BAg");
    setNewVesselCompatibility("Semua Armada Kapal");
    setNewWeight("1.0");
    setNewInitialStock("10");
    setNewLocationId("loc-1");
    setValidationError("");
    setIsCreateModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditValidationError("");
    if (!editItemForm) return;

    if (!editItemForm.part_name.trim()) return setEditValidationError("Nama sparepart wajib diisi.");
    if (!editItemForm.part_number.trim()) return setEditValidationError("Nomor part wajib diisi.");
    if (!editItemForm.sku.trim()) return setEditValidationError("SKU wajib diisi.");
    if (!editItemForm.barcode.trim()) return setEditValidationError("Barcode wajib diisi.");

    // Format hierarchy
    const cleanHierarchy: string[] = [];
    if (editItemForm.hierarchy && editItemForm.hierarchy[0]) {
      cleanHierarchy.push(editItemForm.hierarchy[0].trim());
    } else {
      cleanHierarchy.push("General Spares");
    }

    if (editItemForm.hierarchy && editItemForm.hierarchy[1] && editItemForm.hierarchy[1].trim()) {
      cleanHierarchy.push(editItemForm.hierarchy[1].trim());
    }
    if (editItemForm.hierarchy && editItemForm.hierarchy[2] && editItemForm.hierarchy[2].trim()) {
      cleanHierarchy.push(editItemForm.hierarchy[2].trim());
    }

    const updatedItem: CatalogItem = {
      ...editItemForm,
      part_name: editItemForm.part_name.trim(),
      part_number: editItemForm.part_number.trim(),
      sku: editItemForm.sku.trim(),
      barcode: editItemForm.barcode.trim(),
      description: editItemForm.description.trim(),
      hierarchy: cleanHierarchy,
      specification: editItemForm.specification ? editItemForm.specification.trim() : "N/A",
      manufacturer: editItemForm.manufacturer ? editItemForm.manufacturer.trim() : "N/A",
      vessel_compatibility: editItemForm.vessel_compatibility ? editItemForm.vessel_compatibility.trim() : "Semua Armada Kapal",
      weight_kg: Number(editItemForm.weight_kg) || 0
    };

    setIsSubmitting(true);
    try {
      // 1. Update in Spare Part Master
      const masterPayload: Partial<SparePart> = {
        part_name: updatedItem.part_name,
        part_number: updatedItem.part_number,
        sku: updatedItem.sku,
        barcode: updatedItem.barcode,
        unit: updatedItem.unit,
        category: updatedItem.hierarchy[0] || "General Spares",
        maker: updatedItem.manufacturer,
        description: updatedItem.description,
        vessel_compatibility: updatedItem.vessel_compatibility,
        specification: updatedItem.specification
      };

      if (onUpdatePart) {
        await onUpdatePart(updatedItem.id, masterPayload);
      } else {
        await api.updateSparePart(updatedItem.id, masterPayload);
      }

      // 2. Save metadata in localStorage
      const meta = getCatalogMetadata();
      meta[updatedItem.id] = {
        hierarchy: updatedItem.hierarchy,
        specification: updatedItem.specification,
        manufacturer: updatedItem.manufacturer,
        vessel_compatibility: updatedItem.vessel_compatibility,
        weight_kg: updatedItem.weight_kg
      };
      saveCatalogMetadata(meta);
      setCustomMeta(meta);

      // 3. Save barcode to cache
      const bcCache = getBarcodeCache();
      bcCache[updatedItem.id] = updatedItem.barcode;
      saveBarcodeCache(bcCache);

      setSelectedItem(updatedItem);
      setIsEditingItem(false);
    } catch (err: any) {
      setEditValidationError(err.message || "Gagal memperbarui suku cadang.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSparePart = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!newPartName.trim()) return setValidationError("Nama sparepart wajib diisi.");
    if (!newPartNumber.trim()) return setValidationError("Nomor part wajib diisi.");
    if (!newSku.trim()) return setValidationError("SKU wajib diisi.");
    if (!newBarcode.trim()) return setValidationError("Barcode wajib diisi.");

    // Check if barcode already exists
    const barcodeCollision = allCatalogItems.some(i => i.barcode.toLowerCase() === newBarcode.trim().toLowerCase());
    if (barcodeCollision) {
      return setValidationError(`Barcode "${newBarcode.trim()}" sudah digunakan oleh barang lain. Silakan buat barcode baru.`);
    }

    const hierarchy = [newSystem.trim()];
    if (newSubsystem.trim()) hierarchy.push(newSubsystem.trim());
    if (newSection.trim()) hierarchy.push(newSection.trim());

    const generatedId = `part-${Date.now()}`;
    const initialStockNum = Math.max(0, Number(newInitialStock) || 0);

    const masterPayload: Partial<SparePart> = {
      id: generatedId,
      part_name: newPartName.trim(),
      part_number: newPartNumber.trim(),
      sku: newSku.trim(),
      barcode: newBarcode.trim(),
      unit: newUnit,
      category: newSystem.trim(),
      maker: newManufacturer.trim() || "OEM / Supplier",
      brand: newManufacturer.trim() || "OEM / Supplier",
      description: newDescription.trim() || `${newPartName.trim()} — Terdaftar via Catalog Sparepart.`,
      vessel_compatibility: newVesselCompatibility.trim() || "Semua Armada Kapal",
      specification: newSpecification.trim() || `Rak: ${newLocationId}, Terdaftar via Catalog`,
      location_id: newLocationId,
      current_stock: initialStockNum,
      reorder_point: 5,
      minimum_stock: 2,
      maximum_stock: 100
    };

    setIsSubmitting(true);
    try {
      // 1. Create in Spare Part Master
      if (onAddPart) {
        await onAddPart(masterPayload);
      } else {
        await api.createSparePart(masterPayload);
      }

      // 2. Save metadata in localStorage
      const meta = getCatalogMetadata();
      meta[generatedId] = {
        hierarchy: hierarchy,
        specification: newSpecification.trim() || `Rak: ${newLocationId}, Terdaftar via Catalog`,
        manufacturer: newManufacturer.trim() || "OEM / Supplier",
        vessel_compatibility: newVesselCompatibility.trim() || "Semua Armada Kapal",
        weight_kg: Number(newWeight) || 1.0
      };
      saveCatalogMetadata(meta);
      setCustomMeta(meta);

      // 3. Save barcode to cache
      const bcCache = getBarcodeCache();
      bcCache[generatedId] = newBarcode.trim();
      saveBarcodeCache(bcCache);

      // Broadcast update
      window.dispatchEvent(new Event("catalog_updated"));

      setIsCreateModalOpen(false);
    } catch (err: any) {
      setValidationError(err.message || "Gagal mendaftarkan suku cadang ke Master.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto bg-slate-50 font-sans selection:bg-blue-100">
      
      {/* Title Header */}
      <div className="shrink-0 no-print flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold font-display tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600" /> Catalog Sparepart
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Katalog suku cadang otomatis tersinkronisasi 100% dari Spare Part Master, lengkap dengan Barcode unik dan QR Code siap cetak.
          </p>
        </div>
        <div className="flex items-center gap-3 mt-3 md:mt-0">
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 border border-blue-700 text-white font-bold text-xs uppercase rounded-lg flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Suku Cadang
          </button>
          <div className="bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs font-bold font-mono shadow-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-400" />
            <span>TOTAL DATA: {allCatalogItems.length} ITEM</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar Area */}
      <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-4 no-print">
        <div className="flex items-center justify-between text-xs font-black text-slate-800 uppercase tracking-wider font-mono border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>Saringan & Filtrasi Katalog Master</span>
          </div>
          {(searchQuery || selectedCategory !== "All") && (
            <button 
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="text-blue-600 hover:text-blue-500 font-bold tracking-tight lowercase cursor-pointer"
            >
              [reset filter]
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, part number, SKU, barcode, pabrikan, atau hierarki..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs pl-9 pr-4 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
            />
          </div>

          {/* Category Tree Hierarchy dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2.5 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">-- SEMUA SISTEM ({categories.length - 1}) --</option>
              {categories.filter(c => c !== "All").map(cat => (
                <option key={cat} value={cat}>{cat.toUpperCase()}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Filter Status summary */}
        {filteredData.length !== allCatalogItems.length && (
          <div className="text-[11px] font-mono text-slate-500 font-medium">
            Menampilkan <strong className="text-blue-700">{filteredData.length}</strong> dari total <strong className="text-slate-800">{allCatalogItems.length}</strong> suku cadang master
          </div>
        )}
      </div>

      {/* Main Catalog Listing */}
      {filteredData.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-3 shadow-xs">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Suku Cadang Tidak Ditemukan</h3>
          <p className="text-xs max-w-md mx-auto">
            Tidak ada kecocokan data untuk kata kunci "{searchQuery}" dengan kriteria filter yang Anda pilih. Coba bersihkan filter atau periksa ejaan Anda.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {paginatedData.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col md:flex-row gap-5 relative group"
              >
                {/* Product Detail Content Side */}
                <div className="flex-1 space-y-3">
                  <div>
                    {/* Visual Hierarchy Tree Breadcrumbs */}
                    <div className="flex flex-wrap items-center gap-1 text-[9.5px] font-mono text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                      {item.hierarchy.map((node, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                          <span className={`${i === item.hierarchy.length - 1 ? "text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100" : ""}`}>
                            {node}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">
                      {item.part_name}
                    </h3>
                    
                    {/* Part Number, SKU, and Distinct Barcode Pill */}
                    <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-mono mt-1.5">
                      <span className="text-slate-500 font-medium">
                        Part No: <span className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-bold">{item.part_number}</span>
                      </span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-slate-500 font-medium">
                        SKU: <span className="text-slate-700 font-bold">{item.sku}</span>
                      </span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded font-extrabold shadow-2xs">
                        <Barcode className="w-3.5 h-3.5 text-blue-600" />
                        {item.barcode}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-650 leading-relaxed font-sans line-clamp-2">
                    {item.description}
                  </p>

                  <div className="grid grid-cols-4 gap-2 text-[11px] pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block uppercase font-mono text-[9px]">Stok Master</span>
                      <strong className={`font-extrabold text-[11px] inline-block px-1.5 py-0.5 rounded border ${
                        item.current_stock > 0 
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200" 
                          : "text-rose-700 bg-rose-50 border-rose-200"
                      }`}>
                        {item.current_stock} {item.unit}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase font-mono text-[9px]">Satuan</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{item.unit}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase font-mono text-[9px]">Berat</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{item.weight_kg} Kg</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase font-mono text-[9px]">Pabrikan</span>
                      <strong className="text-slate-800 font-bold truncate block mt-0.5" title={item.manufacturer}>
                        {item.manufacturer}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* QR Code & Barcode Side */}
                <div className="w-full md:w-44 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-5 shrink-0 select-none bg-slate-50/70 rounded-r-xl p-3">
                  <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-xs max-w-[95px] flex items-center justify-center" title="Scan dengan Kamera HP untuk membuka informasi part langsung">
                    <QRCode
                      value={typeof window !== "undefined" ? `${window.location.origin}/?part=${encodeURIComponent(item.barcode || item.id)}` : `/?part=${encodeURIComponent(item.barcode || item.id)}`}
                      size={80}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox={`0 0 256 256`}
                    />
                  </div>
                  
                  {/* Visual Barcode & Unique Token */}
                  <div className="mt-2 text-center w-full">
                    <span className="text-[8.5px] font-mono font-bold text-slate-600 uppercase tracking-widest block">
                      TOKEN: #{item.barcode}
                    </span>
                    <span className="text-[7.5px] text-blue-600 font-semibold block mt-0.5">
                      ✓ Scan Kamera HP Langsung
                    </span>
                  </div>
                  
                  <div className="flex gap-2 w-full mt-3 no-print">
                    <button
                      onClick={() => handleOpenPrintModal(item)}
                      className="w-full bg-white hover:bg-blue-50 text-blue-700 border border-slate-250 hover:border-blue-300 py-1.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer shadow-xs transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Detail
                    </button>
                    <button
                      onClick={() => handleOpenPrintModal(item)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-2.5 rounded border border-slate-250 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                      title="Cetak Label Barcode & QR"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-200 no-print gap-4">
            <div className="text-xs text-slate-500 font-semibold font-mono">
              Menampilkan <span className="text-slate-800 font-bold">{Math.min(filteredData.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredData.length, currentPage * itemsPerPage)}</span> dari <span className="text-slate-800 font-bold">{filteredData.length}</span> Suku Cadang Master
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                <span>Tampilkan:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={20}>20</option>
                </select>
              </div>

              <div className="flex gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className={`px-3 py-1.5 border rounded text-xs font-bold uppercase transition-all ${
                    currentPage === 1
                      ? "border-slate-150 bg-slate-50 text-slate-400 cursor-not-allowed"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                  }`}
                >
                  Sebelumnya
                </button>
                <div className="flex items-center px-2 text-xs font-bold text-slate-700 font-mono">
                  {currentPage} / {Math.max(1, totalPages)}
                </div>
                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className={`px-3 py-1.5 border rounded text-xs font-bold uppercase transition-all ${
                    currentPage === totalPages || totalPages === 0
                      ? "border-slate-150 bg-slate-50 text-slate-400 cursor-not-allowed"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                  }`}
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW SPARE PART MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-950 px-6 py-4.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-black font-sans uppercase tracking-wider">
                  Registrasi Suku Cadang Baru (Tersinkron ke Master &amp; Catalog)
                </span>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleCreateSparePart} className="overflow-y-auto p-6 space-y-4">
              
              {validationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold">
                  ⚠️ {validationError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Part Name */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    Nama Sparepart <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Main Engine Fuel Injector"
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Part Number */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    Nomor Part (Part Number) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: YMR-9082-LN"
                    value={newPartNumber}
                    onChange={(e) => setNewPartNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* SKU */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    SKU Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SKU-ME-FUI-18"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                {/* Barcode (Unique) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase text-blue-700 tracking-wide flex items-center gap-1">
                      <Barcode className="w-3.5 h-3.5" /> Barcode Unik <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewBarcode(generateRandomBarcode())}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Acak Barcode
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BC-88123456"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    className="w-full bg-blue-50/50 border border-blue-200 rounded-lg text-xs px-3 py-2 font-bold text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                {/* Unit / Satuan */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    Satuan (Unit)
                  </label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="SET">SET</option>
                    <option value="BOX">BOX</option>
                    <option value="UNIT">UNIT</option>
                    <option value="MTR">MTR (Meter)</option>
                    <option value="ROLL">ROLL</option>
                    <option value="KIT">KIT</option>
                    <option value="CAN">CAN</option>
                    <option value="PAIL">PAIL</option>
                  </select>
                </div>

                {/* Hierarchy Root */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    Sistem Root (Hierarchy 1) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newSystem}
                    onChange={(e) => setNewSystem(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Main Engine Parts">Main Engine Parts</option>
                    <option value="Auxiliary Engine Spares">Auxiliary Engine Spares</option>
                    <option value="Turbocharger Parts">Turbocharger Parts</option>
                    <option value="Pump Spares">Pump Spares</option>
                    <option value="Electrical Equipment">Electrical Equipment</option>
                    <option value="Piping Valves &amp; Seals">Piping Valves &amp; Seals</option>
                    <option value="General Spares">General Spares</option>
                    <option value="Sparepart Kapal">Sparepart Kapal</option>
                  </select>
                </div>

                {/* Subsystem */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    Sub-Sistem (Hierarchy 2)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Fuel Injection System"
                    value={newSubsystem}
                    onChange={(e) => setNewSubsystem(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Section */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    Seksi / Bagian (Hierarchy 3)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Nozzle Assembly"
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Initial Stock */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    Stok Fisik Awal
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newInitialStock}
                    onChange={(e) => setNewInitialStock(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Manufacturer */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    Pabrikan / Pembuat
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Yanmar Marine Co., Ltd."
                    value={newManufacturer}
                    onChange={(e) => setNewManufacturer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Vessel Compatibility */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    Kesesuaian Kapal / Armada
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: MV. ARIMBI BARUNA, MV. KARTINI BARUNA"
                    value={newVesselCompatibility}
                    onChange={(e) => setNewVesselCompatibility(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Weight */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    Bobot / Berat (Kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.0"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                  Deskripsi / Keterangan Suku Cadang <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Masukkan fungsi, spesifikasi umum, atau keterangan part..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Technical Specifications */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                  Spesifikasi Teknis
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Material: Forged Steel Alloy, Diameter: 960mm, Hard-chrome plated"
                  value={newSpecification}
                  onChange={(e) => setNewSpecification(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 hover:bg-slate-100 text-slate-700 font-bold uppercase rounded text-xs cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded bg-blue-600 hover:bg-blue-500 border border-blue-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {isSubmitting ? "Menyimpan..." : "Daftarkan Suku Cadang"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* DETAIL & PRINT MODAL */}
      {isPrintModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between text-white shrink-0 no-print">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-black font-sans uppercase tracking-wider">
                  {isEditingItem ? "Edit Data Suku Cadang Master" : "Label Barcode &amp; QR Code Suku Cadang"}
                </span>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-5">
              {isEditingItem && editItemForm ? (
                /* EDIT FORM */
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  {editValidationError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold">
                      ⚠️ {editValidationError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                        Nama Sparepart <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editItemForm.part_name}
                        onChange={(e) => setEditItemForm({ ...editItemForm, part_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                        Nomor Part (Part Number) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editItemForm.part_number}
                        onChange={(e) => setEditItemForm({ ...editItemForm, part_number: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                        SKU Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editItemForm.sku}
                        onChange={(e) => setEditItemForm({ ...editItemForm, sku: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-blue-700 tracking-wide flex items-center gap-1">
                        <Barcode className="w-3.5 h-3.5" /> Barcode Unik <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editItemForm.barcode}
                        onChange={(e) => setEditItemForm({ ...editItemForm, barcode: e.target.value })}
                        className="w-full bg-blue-50/50 border border-blue-200 rounded-lg text-xs px-3 py-2 font-bold text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                        Satuan (Unit)
                      </label>
                      <input
                        type="text"
                        value={editItemForm.unit}
                        onChange={(e) => setEditItemForm({ ...editItemForm, unit: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                        Sistem Root (Hierarchy 1)
                      </label>
                      <input
                        type="text"
                        value={editItemForm.hierarchy[0] || ""}
                        onChange={(e) => {
                          const h = [...editItemForm.hierarchy];
                          h[0] = e.target.value;
                          setEditItemForm({ ...editItemForm, hierarchy: h });
                        }}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                        Pabrikan / Pembuat
                      </label>
                      <input
                        type="text"
                        value={editItemForm.manufacturer}
                        onChange={(e) => setEditItemForm({ ...editItemForm, manufacturer: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                        Bobot / Berat (Kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editItemForm.weight_kg || ""}
                        onChange={(e) => setEditItemForm({ ...editItemForm, weight_kg: Number(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                      Deskripsi / Keterangan Suku Cadang <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={editItemForm.description}
                      onChange={(e) => setEditItemForm({ ...editItemForm, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                      Spesifikasi Teknis
                    </label>
                    <textarea
                      rows={2}
                      value={editItemForm.specification || ""}
                      onChange={(e) => setEditItemForm({ ...editItemForm, specification: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                </form>
              ) : (
                /* STATIC PREVIEW & PRINTABLE LABEL */
                <>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-white shadow-inner flex flex-col md:flex-row gap-6 print:border-solid print:border-2 print:border-slate-900 print:rounded-none">
                    
                    {/* Left: QR Code side */}
                    <div className="flex flex-col items-center justify-center shrink-0 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
                      <div className="p-3 bg-white border border-slate-300 rounded-xl shadow-xs" title="Scan dengan Kamera HP untuk membuka informasi part tanpa login">
                        <QRCode
                          value={typeof window !== "undefined" ? `${window.location.origin}/?part=${encodeURIComponent(selectedItem.barcode || selectedItem.id)}` : `/?part=${encodeURIComponent(selectedItem.barcode || selectedItem.id)}`}
                          size={135}
                          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                          viewBox={`0 0 256 256`}
                        />
                      </div>
                      <div className="text-center mt-3 font-mono">
                        <span className="text-[10px] font-black text-blue-700 uppercase bg-blue-50 border border-blue-100 px-2 py-0.5 rounded block">
                          TOKEN: #{selectedItem.barcode}
                        </span>
                        <span className="text-[8px] text-slate-400 block mt-1 uppercase tracking-widest">
                          Scan Langsung via Kamera HP
                        </span>
                        <a
                          href={typeof window !== "undefined" ? `${window.location.origin}/?part=${encodeURIComponent(selectedItem.barcode || selectedItem.id)}` : `/?part=${encodeURIComponent(selectedItem.barcode || selectedItem.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline mt-2 inline-flex items-center gap-1 no-print cursor-pointer"
                          title="Klik untuk menguji tampilan halaman mobile langsung di tab browser baru"
                        >
                          Uji Buka Tautan Scan HP ↗
                        </a>
                      </div>
                    </div>

                    {/* Right: Barcode & Details */}
                    <div className="flex-1 space-y-3">
                      <div>
                        {/* Catalog Hierarchy Display */}
                        <div className="flex flex-wrap items-center gap-1 text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider mb-1">
                          {selectedItem.hierarchy.map((node, i) => (
                            <React.Fragment key={i}>
                              {i > 0 && <span className="text-slate-300">&gt;</span>}
                              <span>{node}</span>
                            </React.Fragment>
                          ))}
                        </div>
                        
                        <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
                          {selectedItem.part_name}
                        </h2>
                        
                        <p className="text-xs font-bold font-mono text-slate-700 mt-1">
                          NO PART: <span className="text-slate-900">{selectedItem.part_number}</span>
                          <span className="mx-2 text-slate-300">|</span>
                          SKU: <span className="text-slate-600">{selectedItem.sku}</span>
                        </p>
                      </div>

                      {/* Visual Barcode Graphic */}
                      <div className="py-1">
                        <BarcodeGraphic code={selectedItem.barcode} width={200} height={38} />
                      </div>

                      <div className="border-t border-slate-150 pt-2 space-y-1.5 text-xs">
                        <div className="grid grid-cols-3 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200/80 my-1">
                          <span className="text-emerald-800 font-bold font-mono text-[10px] uppercase flex items-center gap-1">
                            <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                            Stok Master (Qty):
                          </span>
                          <span className="col-span-2 font-extrabold text-sm text-emerald-800">
                            {selectedItem.current_stock} {selectedItem.unit}
                          </span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="text-slate-450 font-medium font-mono text-[10px] uppercase">Pabrikan:</span>
                          <span className="col-span-2 font-bold text-slate-800">{selectedItem.manufacturer}</span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="text-slate-450 font-medium font-mono text-[10px] uppercase">Spesifikasi:</span>
                          <span className="col-span-2 font-semibold text-slate-700">{selectedItem.specification}</span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="text-slate-450 font-medium font-mono text-[10px] uppercase">Kesesuaian:</span>
                          <span className="col-span-2 font-semibold text-slate-700">{selectedItem.vessel_compatibility}</span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="text-slate-450 font-medium font-mono text-[10px] uppercase">Bobot/Unit:</span>
                          <span className="col-span-2 font-bold text-slate-800">{selectedItem.weight_kg} Kg / {selectedItem.unit}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[11px] leading-normal text-slate-600 italic">
                        {selectedItem.description}
                      </div>
                    </div>

                  </div>

                  {/* Informational Guidance */}
                  <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-lg text-xs space-y-1 no-print">
                    <p className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-blue-900 font-mono">
                      <Info className="w-4 h-4 text-blue-600" /> PANDUAN SCANNER KAMERA HP &amp; BARCODE
                    </p>
                    <p className="leading-relaxed">
                      Kode QR ini dapat dipindai langsung menggunakan kamera smartphone (iPhone/Android). Saat dipindai, HP akan langsung membuka halaman rincian informasi spesifikasi, stok riil, lokasi rak, dan kesesuaian kapal suku cadang ini <strong>tanpa perlu login</strong>. Label fisik juga dapat dipindai oleh scanner barcode 1D optik di gudang.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3 shrink-0 no-print">
              {isEditingItem ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingItem(false);
                      setEditValidationError("");
                    }}
                    className="px-4 py-2 border border-slate-250 hover:bg-slate-100 text-slate-700 font-bold uppercase rounded text-xs cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSaveEdit}
                    className="px-5 py-2.5 rounded bg-blue-600 hover:bg-blue-500 border border-blue-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsPrintModalOpen(false)}
                    className="px-4 py-2 border border-slate-250 hover:bg-slate-100 text-slate-700 font-bold uppercase rounded text-xs cursor-pointer transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={() => {
                      setEditItemForm(JSON.parse(JSON.stringify(selectedItem)));
                      setIsEditingItem(true);
                      setEditValidationError("");
                    }}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-900 text-white font-bold text-xs uppercase rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Suku Cadang
                  </button>
                  <button
                    onClick={executePrint}
                    className="px-5 py-2.5 rounded bg-blue-600 hover:bg-blue-500 border border-blue-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Printer className="w-4 h-4" /> Cetak Label Barcode &amp; QR
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
