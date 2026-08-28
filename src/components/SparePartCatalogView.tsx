import React, { useState, useMemo } from "react";
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
  Save
} from "lucide-react";

// Catalog item interface (Removed status field as requested)
interface CatalogItem {
  id: string;
  part_name: string;
  part_number: string;
  sku: string;
  description: string;
  unit: string;
  hierarchy: string[]; // e.g. ["Propulsion System", "Main Engine (Sulzer 9RTA96C)", "Piston Section"]
  specification: string;
  manufacturer: string;
  vessel_compatibility: string;
  weight_kg: number;
}

// 20 comprehensive initial maritime spare parts
const INITIAL_CATALOG_DATA: CatalogItem[] = [
  {
    id: "SP-CAT-001",
    part_name: "Piston Crown - Main Engine",
    part_number: "9RTA-96C-PC01",
    sku: "SKU-ME-PST-01",
    description: "Piston crown paduan baja tempa tahan panas tinggi, dirancang untuk silinder mesin induk Sulzer 9RTA96C.",
    unit: "PCS",
    hierarchy: ["Propulsion System", "Main Engine (Sulzer 9RTA96C)", "Piston Assembly"],
    specification: "Material: Forged Steel Alloy, Diameter: 960mm, Hard-chrome plated grooves",
    manufacturer: "Sulzer Diesel Engines Ltd",
    vessel_compatibility: "MV. KARTINI BARUNA, MV. INTAN BARUNA, MV. RASUNA BARUNA",
    weight_kg: 485
  },
  {
    id: "SP-CAT-002",
    part_name: "Turbocharger Gas Inlet Gasket",
    part_number: "YMR-6EY18-TG04",
    sku: "SKU-AE-TUR-02",
    description: "Gasket inlet gas buang turbin tahan temperatur tinggi (hingga 700°C) untuk auxiliary engine Yanmar 6EY18AL.",
    unit: "SET",
    hierarchy: ["Auxiliary System", "Auxiliary Engine (Yanmar 6EY18AL)", "Turbine Section", "Gaskets"],
    specification: "Material: Graphite with Stainless Steel Grid Insert, Temp: Max 700°C",
    manufacturer: "Yanmar Marine Co., Ltd.",
    vessel_compatibility: "MV. ARIMBI BARUNA, MV. MALAHAYATI BARUNA",
    weight_kg: 0.85
  },
  {
    id: "SP-CAT-003",
    part_name: "Cylinder Liner Lubricator Nozzle",
    part_number: "SLZ-82091-LN",
    sku: "SKU-ME-LIN-12",
    description: "Nozzle injeksi oli silinder mesin induk untuk pelumasan liner silinder, mencegah abrasi piston ring.",
    unit: "PCS",
    hierarchy: ["Propulsion System", "Main Engine (Sulzer 9RTA96C)", "Cylinder Liner", "Lubrication"],
    specification: "Pressure rating: 45 Bar, Material: SUS316 Stainless Steel, Flow Rate: 1.2 L/min",
    manufacturer: "Wärtsilä Switzerland",
    vessel_compatibility: "MV. MEUTIA BARUNA, MV. MARTHA BARUNA",
    weight_kg: 2.1
  },
  {
    id: "SP-CAT-004",
    part_name: "Exhaust Gas Valve Spindle",
    part_number: "9RTA-EXV-408",
    sku: "SKU-ME-VAL-03",
    description: "Katup buang gas silinder mesin induk berbahan Nimonic alloy tahan korosi sulfur dan panas ekstrem.",
    unit: "PCS",
    hierarchy: ["Propulsion System", "Main Engine (Sulzer 9RTA96C)", "Exhaust Valve System"],
    specification: "Material: Nimonic 80A / Stellite-faced seat, Stem length: 1850mm",
    manufacturer: "Sulzer Diesel Engines Ltd",
    vessel_compatibility: "MV. MEUTIA BARUNA, MV. MARTHA BARUNA",
    weight_kg: 142
  },
  {
    id: "SP-CAT-005",
    part_name: "Cooling Water Pump Impeller",
    part_number: "SUL-CWP-IMP-90",
    sku: "SKU-PMP-CW-04",
    description: "Impeller pompa air laut pendingin mesin induk berbahan perunggu laut (phosphor bronze) antikarat.",
    unit: "PCS",
    hierarchy: ["Auxiliary System", "Cooling Water System", "Sea Water Pump"],
    specification: "Material: Phosphor Bronze, Outer Diameter: 420mm, Shaft Fit: Keyway 50mm",
    manufacturer: "Shinko Pumps Co.",
    vessel_compatibility: "All Fleet (Universal)",
    weight_kg: 18.5
  },
  {
    id: "SP-CAT-006",
    part_name: "Centrifugal Purifier Ball Bearing",
    part_number: "SKF-6312-C3-PF",
    sku: "SKU-PUR-BRG-18",
    description: "Bearing putaran tinggi khusus untuk separator pemurni minyak kotor (MDO / LO Purifier Mitsubishi SJ-Series).",
    unit: "PCS",
    hierarchy: ["Auxiliary System", "Purifier System", "Vertical Shaft Assembly"],
    specification: "Type: Deep Groove Ball Bearing, Clearance: C3 High Temp, Brand: SKF Explorer",
    manufacturer: "SKF Bearings Global",
    vessel_compatibility: "MV. KARTINI BARUNA, MV. INTAN BARUNA, MV. RASUNA BARUNA, MV Java Pioneer",
    weight_kg: 1.2
  },
  {
    id: "SP-CAT-007",
    part_name: "O-Ring Kit for Hydraulic Steering",
    part_number: "MHI-SG-ORK-85",
    sku: "SKU-STR-HYD-07",
    description: "Satu set seal O-Ring karet Viton tahan tekanan hidrolik tinggi untuk sistem kemudi kapal (Steering Gear).",
    unit: "BOX",
    hierarchy: ["Steering & Deck", "Steering Gear System", "Hydraulic Cylinder Seals"],
    specification: "Material: Fluorocarbon Rubber (Viton), Pressure: Max 250 Bar, Temp: -20°C to 200°C",
    manufacturer: "Mitsubishi Heavy Industries",
    vessel_compatibility: "MV. MEUTIA BARUNA, MV. MARTHA BARUNA",
    weight_kg: 0.35
  },
  {
    id: "SP-CAT-008",
    part_name: "Fuel Oil Separator Friction Clutch Pad",
    part_number: "AL-FCP-30521",
    sku: "SKU-PUR-FCP-09",
    description: "Kampas kopling friksi penengah start-up mangkok separator Alfa Laval S-835.",
    unit: "SET",
    hierarchy: ["Auxiliary System", "Purifier System", "Clutch Assembly"],
    specification: "Asbestos-free organic lining, Set of 3 blocks with springs",
    manufacturer: "Alfa Laval Marine",
    vessel_compatibility: "MV. ARIMBI BARUNA, MV. MALAHAYATI BARUNA",
    weight_kg: 0.45
  },
  {
    id: "SP-CAT-009",
    part_name: "Lub Oil Auto-Filter Element",
    part_number: "BOLL-1340021-LO",
    sku: "SKU-FLT-LUB-05",
    description: "Elemen filter otomatis oli pelumas utama mesin induk tipe lilin (candle filter insert) kerapatan 10 micron.",
    unit: "PCS",
    hierarchy: ["Auxiliary System", "Lub Oil System", "Automatic Backwash Filter"],
    specification: "Filtration: 10 Micron, Mesh Material: Stainless Steel wire cloth, Tipe: Candle Element",
    manufacturer: "Boll & Kirch Filterbau GmbH",
    vessel_compatibility: "All Fleet",
    weight_kg: 4.8
  },
  {
    id: "SP-CAT-010",
    part_name: "Pressure Gauge - Steam Boiler Line",
    part_number: "WIK-PG-015B",
    sku: "SKU-BLR-PG-10",
    description: "Manometer pengukur tekanan uap boiler dengan jarum peredam gliserin agar stabil dari getaran kapal.",
    unit: "PCS",
    hierarchy: ["Auxiliary System", "Boiler Steam System", "Instrumentation"],
    specification: "Scale: 0-16 Bar, Connection: 1/2 inch NPT Lower Mount, Case: Stainless Steel filled with Glycerin",
    manufacturer: "WIKA Instruments",
    vessel_compatibility: "MV. KARTINI BARUNA, MV. INTAN BARUNA, MV. RASUNA BARUNA",
    weight_kg: 0.7
  },
  {
    id: "SP-CAT-011",
    part_name: "Solenoid Valve Air Compressor",
    part_number: "ASCO-8210G-AC",
    sku: "SKU-CMP-SOL-11",
    description: "Solenoid valve kontrol penguras otomatis air kondensat pada starting air receiver compressor.",
    unit: "PCS",
    hierarchy: ["Auxiliary System", "Starting Air Compressor", "Automatic Drain Valve"],
    specification: "Coil Voltage: 220V AC, Pipe size: 1/2 inch, Body: Brass, Action: Normally Closed",
    manufacturer: "ASCO Valve Co.",
    vessel_compatibility: "All Fleet",
    weight_kg: 1.1
  },
  {
    id: "SP-CAT-012",
    part_name: "Alternator Carbon Brush Set",
    part_number: "MHI-CB-SHAFT-88",
    sku: "SKU-ELE-BRS-12",
    description: "Sikat arang karbon berkualitas tinggi untuk transfer arus grounding shaft generator transmisi poros baling-baling.",
    unit: "SET",
    hierarchy: ["Electrical & Automation", "Shaft Generator", "Grounding Brush Holder"],
    specification: "Grade: High copper-graphite, Dimensions: 32x40x60mm, Qty: 4 brushes per set",
    manufacturer: "Morgan Advanced Materials",
    vessel_compatibility: "MV. MEUTIA BARUNA, MV. MARTHA BARUNA",
    weight_kg: 0.25
  },
  {
    id: "SP-CAT-013",
    part_name: "Bilge Pump Mechanical Seal",
    part_number: "BUR-M7N-55MS",
    sku: "SKU-PMP-BLG-13",
    description: "Mechanical seal tahan air kotor berminyak untuk poros pompa bilge utama kamar mesin.",
    unit: "PCS",
    hierarchy: ["Auxiliary System", "Bilge & Ballast System", "Bilge Pump Packing"],
    specification: "Shaft diameter: 55mm, Material: Silicon Carbide vs Carbon, Viton secondary seals",
    manufacturer: "Burgmann Seals",
    vessel_compatibility: "All Fleet",
    weight_kg: 0.6
  },
  {
    id: "SP-CAT-014",
    part_name: "Thermocouple Exhaust Gas K-Type",
    part_number: "YMR-TC-EXH-K",
    sku: "SKU-AE-INST-14",
    description: "Sensor suhu thermocouple tipe K untuk memantau suhu gas buang masing-masing silinder auxiliary engine.",
    unit: "PCS",
    hierarchy: ["Auxiliary System", "Auxiliary Engine (Yanmar 6EY18AL)", "Exhaust Gas Sensors"],
    specification: "Sensor type: K-Type (Chromel/Alumel), Length: 350mm, Cable: Steel braided 2m",
    manufacturer: "Yanmar Marine Co., Ltd.",
    vessel_compatibility: "MV. ARIMBI BARUNA, MV. MALAHAYATI BARUNA",
    weight_kg: 0.3
  },
  {
    id: "SP-CAT-015",
    part_name: "Safety Relief Valve Starting Air Receiver",
    part_number: "SRV-SAR-30B",
    sku: "SKU-CMP-SRV-15",
    description: "Katup pengaman mekanis pelepas tekanan berlebih botol angin start-up utama kapal pada tekanan 30 Bar.",
    unit: "PCS",
    hierarchy: ["Auxiliary System", "Starting Air Compressor", "Air Receiver Safety"],
    specification: "Set Pressure: 30.0 Bar, Inlet size: DN50 Flanged, Body: Cast Steel",
    manufacturer: "Seetru Safety Valves Ltd",
    vessel_compatibility: "MV. KARTINI BARUNA, MV. INTAN BARUNA, MV. RASUNA BARUNA",
    weight_kg: 14.5
  },
  {
    id: "SP-CAT-016",
    part_name: "Diaphragm OWS Control Valve",
    part_number: "OWS-DP-CV12",
    sku: "SKU-ENV-OWS-16",
    description: "Diafragma karet neoprene fleksibel berpenguat rajutan nilon untuk pneumatic control valve oil water separator (OWS).",
    unit: "PCS",
    hierarchy: ["Environmental System", "Oily Water Separator", "Control Valves"],
    specification: "Material: Neoprene with Nylon reinforcement, Diameter: 180mm, Pre-punched 8 holes",
    manufacturer: "RWO Environmental Systems",
    vessel_compatibility: "MV. MEUTIA BARUNA, MV. MARTHA BARUNA",
    weight_kg: 0.15
  },
  {
    id: "SP-CAT-017",
    part_name: "Nozzle Tip - Aux Engine Injector",
    part_number: "YMR-DLC-6EY18",
    sku: "SKU-AE-FUI-17",
    description: "Nozzle tip injektor bahan bakar mesin Yanmar berlapis karbon DLC (Diamond Like Carbon) tahan aus.",
    unit: "PCS",
    hierarchy: ["Auxiliary System", "Auxiliary Engine (Yanmar 6EY18AL)", "Fuel Injection Valve"],
    specification: "Coating: DLC, Holes: 6 x 0.28mm, Opening pressure: 280 Bar",
    manufacturer: "Yanmar Marine Co., Ltd.",
    vessel_compatibility: "MV. ARIMBI BARUNA, MV. MALAHAYATI BARUNA",
    weight_kg: 0.18
  },
  {
    id: "SP-CAT-018",
    part_name: "Air Intake Valve Service Compressor",
    part_number: "CMP-IV-772A",
    sku: "SKU-CMP-SRV-18",
    description: "Katup isap (intake plate valve) untuk kompresor udara dinas kamar mesin.",
    unit: "PCS",
    hierarchy: ["Auxiliary System", "Starting Air Compressor", "Valves & Reeds"],
    specification: "Type: Multi-ring plate valve, Diameter: 120mm, Material: Sandvik flapper steel",
    manufacturer: "Atlas Copco Marine",
    vessel_compatibility: "All Fleet",
    weight_kg: 0.4
  },
  {
    id: "SP-CAT-019",
    part_name: "Piston Ring Set (Aux Engine)",
    part_number: "PRS-YAN-6EY18",
    sku: "SKU-AE-PST-19",
    description: "Satu set cincin piston (ring kompresi dan ring oli) keliling silinder Yanmar 6EY18AL.",
    unit: "SET",
    hierarchy: ["Auxiliary System", "Auxiliary Engine (Yanmar 6EY18AL)", "Piston Rings"],
    specification: "3 Rings per cylinder: 1st Keystone-barrel, 2nd Taper-faced, 3rd Slotted coil spring loaded",
    manufacturer: "Yanmar Marine Co., Ltd.",
    vessel_compatibility: "MV. ARIMBI BARUNA, MV. MALAHAYATI BARUNA",
    weight_kg: 1.1
  },
  {
    id: "SP-CAT-020",
    part_name: "Coupling Insert - Emergency Fire Pump",
    part_number: "ROT-GR-42-EFP",
    sku: "SKU-PMP-FIR-20",
    description: "Karet coupling laba-laba penengah poros dinamo motor dan pompa pemadam kebakaran darurat.",
    unit: "PCS",
    hierarchy: ["Safety & Firefighting", "Emergency Fire Pump", "Coupling Element"],
    specification: "Type: Rotex Spidex 42, Shore hardness: 92 Shore-A, Color: Yellow",
    manufacturer: "KTR Systems GmbH",
    vessel_compatibility: "All Fleet",
    weight_kg: 0.12
  }
];

export default function SparePartCatalogView() {
  // Persistence via localStorage
  const [catalogData, setCatalogData] = useState<CatalogItem[]>(() => {
    const saved = localStorage.getItem("spare_part_catalog_data");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading spare part catalog data from localStorage:", e);
      }
    }
    return INITIAL_CATALOG_DATA;
  });

  // Save changes to localStorage
  const saveToLocalStorage = (newData: CatalogItem[]) => {
    setCatalogData(newData);
    localStorage.setItem("spare_part_catalog_data", JSON.stringify(newData));
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editItemForm, setEditItemForm] = useState<CatalogItem | null>(null);

  // New item form state
  const [newPartName, setNewPartName] = useState("");
  const [newPartNumber, setNewPartNumber] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newUnit, setNewUnit] = useState("PCS");
  const [newSystem, setNewSystem] = useState("Auxiliary System");
  const [newSubsystem, setNewSubsystem] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newSpecification, setNewSpecification] = useState("");
  const [newManufacturer, setNewManufacturer] = useState("");
  const [newVesselCompatibility, setNewVesselCompatibility] = useState("All Fleet");
  const [newWeight, setNewWeight] = useState("");

  const [validationError, setValidationError] = useState("");
  const [editValidationError, setEditValidationError] = useState("");

  // Filter Categories compiled dynamically from data hierarchy roots
  const categories = useMemo(() => {
    const list = new Set<string>();
    catalogData.forEach(item => {
      if (item.hierarchy && item.hierarchy[0]) {
        list.add(item.hierarchy[0]);
      }
    });
    return ["All", ...Array.from(list)];
  }, [catalogData]);

  // Apply filters to data (Removed status filter)
  const filteredData = useMemo(() => {
    return catalogData.filter(item => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        item.part_name.toLowerCase().includes(query) ||
        item.part_number.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.hierarchy.some(h => h.toLowerCase().includes(query));

      const matchesCategory = selectedCategory === "All" || item.hierarchy[0] === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [catalogData, searchQuery, selectedCategory]);

  // Pagination logic
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, itemsPerPage]);

  const handlePrintLabel = (item: CatalogItem) => {
    setSelectedItem(item);
    setIsEditingItem(false);
    setEditValidationError("");
    setEditItemForm(JSON.parse(JSON.stringify(item)));
    setIsPrintModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditValidationError("");
    if (!editItemForm) return;

    if (!editItemForm.part_name.trim()) return setEditValidationError("Nama sparepart wajib diisi.");
    if (!editItemForm.part_number.trim()) return setEditValidationError("Nomor part wajib diisi.");
    if (!editItemForm.sku.trim()) return setEditValidationError("SKU wajib diisi.");
    if (!editItemForm.description.trim()) return setEditValidationError("Deskripsi wajib diisi.");

    // Format hierarchy
    const cleanHierarchy: string[] = [];
    if (editItemForm.hierarchy && editItemForm.hierarchy[0]) {
      cleanHierarchy.push(editItemForm.hierarchy[0].trim());
    } else {
      cleanHierarchy.push("Auxiliary System");
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
      description: editItemForm.description.trim(),
      hierarchy: cleanHierarchy,
      specification: editItemForm.specification ? editItemForm.specification.trim() : "N/A",
      manufacturer: editItemForm.manufacturer ? editItemForm.manufacturer.trim() : "N/A",
      vessel_compatibility: editItemForm.vessel_compatibility ? editItemForm.vessel_compatibility.trim() : "Universal",
      weight_kg: Number(editItemForm.weight_kg) || 0
    };

    const updatedData = catalogData.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    );

    saveToLocalStorage(updatedData);
    setSelectedItem(updatedItem);
    setIsEditingItem(false);
  };

  const executePrint = () => {
    window.print();
  };

  // Create new catalog item handler
  const handleCreateSparePart = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!newPartName.trim()) return setValidationError("Nama sparepart wajib diisi.");
    if (!newPartNumber.trim()) return setValidationError("Nomor part wajib diisi.");
    if (!newSku.trim()) return setValidationError("SKU wajib diisi.");
    if (!newDescription.trim()) return setValidationError("Deskripsi wajib diisi.");
    if (!newSystem.trim()) return setValidationError("Sistem/Hierarki Root wajib dipilih.");

    // Generate fresh high-contrast sequential ID
    const nextNum = catalogData.length + 1;
    const generatedId = `SP-CAT-${String(nextNum).padStart(3, "0")}`;

    // Create hierarchy array from filled fields
    const hierarchy = [newSystem.trim()];
    if (newSubsystem.trim()) hierarchy.push(newSubsystem.trim());
    if (newSection.trim()) hierarchy.push(newSection.trim());

    const newItem: CatalogItem = {
      id: generatedId,
      part_name: newPartName.trim(),
      part_number: newPartNumber.trim(),
      sku: newSku.trim(),
      description: newDescription.trim(),
      unit: newUnit,
      hierarchy: hierarchy,
      specification: newSpecification.trim() || "N/A",
      manufacturer: newManufacturer.trim() || "N/A",
      vessel_compatibility: newVesselCompatibility.trim() || "Universal",
      weight_kg: Number(newWeight) || 0
    };

    const updatedData = [newItem, ...catalogData];
    saveToLocalStorage(updatedData);

    // Reset Form Fields
    setNewPartName("");
    setNewPartNumber("");
    setNewSku("");
    setNewDescription("");
    setNewUnit("PCS");
    setNewSystem("Auxiliary System");
    setNewSubsystem("");
    setNewSection("");
    setNewSpecification("");
    setNewManufacturer("");
    setNewVesselCompatibility("All Fleet");
    setNewWeight("");
    setIsCreateModalOpen(false);
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
            Katalog terlengkap berisi hierarki spesifikasi detail, turunan struktur mesin, dan QR Code statis siap cetak.
          </p>
        </div>
        <div className="flex items-center gap-3 mt-3 md:mt-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 border border-blue-700 text-white font-bold text-xs uppercase rounded-lg flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Suku Cadang
          </button>
          <span className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold font-mono">
            TOTAL DATA: {catalogData.length} ITEM
          </span>
        </div>
      </div>

      {/* Filter Toolbar Area (Removed status filter) */}
      <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-4 no-print">
        <div className="flex items-center justify-between text-xs font-black text-slate-800 uppercase tracking-wider font-mono border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>Saringan & Filtrasi Katalog</span>
          </div>
          {filteredData.length !== catalogData.length && (
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
              placeholder="Cari nama, part number, SKU, pabrikan, atau sub-mesin..."
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
                <div className="flex-1 space-y-3.5">
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
                    <p className="text-[10px] font-mono text-slate-500 font-bold mt-1">
                      Part No: <span className="text-slate-800 bg-slate-150 px-1.5 py-0.5 rounded border border-slate-200">{item.part_number}</span>
                      <span className="mx-2">&bull;</span>
                      SKU: <span className="text-slate-700 font-medium">{item.sku}</span>
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-650 leading-relaxed font-sans line-clamp-2">
                    {item.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2.5 text-[11px] pt-1.5 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block uppercase font-mono text-[9px]">Satuan / Unit</span>
                      <strong className="text-slate-800 font-bold">{item.unit}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase font-mono text-[9px]">Berat (Weight)</span>
                      <strong className="text-slate-800 font-bold">{item.weight_kg} Kg</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase font-mono text-[9px]">Pabrikan</span>
                      <strong className="text-slate-800 font-bold truncate block" title={item.manufacturer}>
                        {item.manufacturer}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* QR Code Block Side */}
                <div className="w-full md:w-36 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-5 shrink-0 select-none bg-slate-50/50 rounded-r-xl p-3">
                  <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-inner max-w-[100px]">
                    <QRCode
                      value={`PART-ID:${item.id}|NUM:${item.part_number}|NAME:${item.part_name}`}
                      size={80}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox={`0 0 256 256`}
                    />
                  </div>
                  <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-2 text-center">
                    QR-TOKEN #{item.id.replace("SP-CAT-", "")}
                  </span>
                  
                  <div className="flex gap-2 w-full mt-3.5 no-print">
                    <button
                      onClick={() => handlePrintLabel(item)}
                      className="w-full bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 hover:border-blue-200 py-1.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer shadow-xs transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Detail
                    </button>
                    <button
                      onClick={() => handlePrintLabel(item)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 py-1.5 px-2.5 rounded border border-slate-200 flex items-center justify-center cursor-pointer transition-colors"
                      title="Cetak Label QR"
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
              Menampilkan <span className="text-slate-800 font-bold">{Math.min(filteredData.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredData.length, currentPage * itemsPerPage)}</span> dari <span className="text-slate-800 font-bold">{filteredData.length}</span> Suku Cadang Katalog
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
                  Registrasi Suku Cadang Baru (Catalog Sparepart)
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
                    placeholder="Contoh: Fuel Injector Valve"
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
                    placeholder="Contoh: SKU-AE-FUI-18"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    <option value="MTR">MTR (Meter)</option>
                    <option value="ROLL">ROLL</option>
                    <option value="KIT">KIT</option>
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
                    <option value="Propulsion System">Propulsion System</option>
                    <option value="Auxiliary System">Auxiliary System</option>
                    <option value="Steering & Deck">Steering & Deck</option>
                    <option value="Electrical & Automation">Electrical & Automation</option>
                    <option value="Environmental System">Environmental System</option>
                    <option value="Safety & Firefighting">Safety & Firefighting</option>
                  </select>
                </div>

                {/* Subsystem / Engine (Hierarchy 2) */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    Turunan Mesin (Hierarchy 2)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Main Engine (Sulzer 9RTA96C)"
                    value={newSubsystem}
                    onChange={(e) => setNewSubsystem(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Component Section (Hierarchy 3) */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    Kategori Bagian (Hierarchy 3)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Gaskets / Turbine Section"
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Manufacturer / Pabrikan */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    Pabrikan (Manufacturer)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Yanmar Marine Co."
                    value={newManufacturer}
                    onChange={(e) => setNewManufacturer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Vessel Compatibility */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    Kesesuaian Kapal (Vessels)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: MV. ARIMBI BARUNA, MV. MALAHAYATI BARUNA"
                    value={newVesselCompatibility}
                    onChange={(e) => setNewVesselCompatibility(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Weight (Kg) */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                    Bobot (Weight in Kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Contoh: 12.5"
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
                  rows={3}
                  placeholder="Deskripsikan fungsi, lokasi penempatan, atau tindakan pencegahan servis..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Specifications */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                  Spesifikasi Teknis
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Material: Nimonic 80A, Max pressure: 300 Bar, Thread: M24..."
                  value={newSpecification}
                  onChange={(e) => setNewSpecification(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

            </form>

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
                type="button"
                onClick={handleCreateSparePart}
                className="px-5 py-2.5 rounded bg-blue-600 hover:bg-blue-500 border border-blue-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                Simpan Baru
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Detail & QR Label Print Preview Modal */}
      {isPrintModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in print:p-0 print:bg-white print:backdrop-blur-none">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden print:shadow-none print:border-none print:m-0 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0 no-print">
              <div className="flex items-center gap-2">
                {isEditingItem ? (
                  <Edit2 className="w-5 h-5 text-blue-400" />
                ) : (
                  <QrCode className="w-5 h-5 text-blue-400" />
                )}
                <span className="text-xs font-black font-sans uppercase tracking-wider">
                  {isEditingItem ? "Ubah Informasi Suku Cadang (Edit Catalog)" : "Kartu Detail & Label QR Suku Cadang"}
                </span>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {isEditingItem && editItemForm ? (
                /* EDITING FORM SECTION */
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  
                  {editValidationError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold font-mono">
                      ⚠️ {editValidationError}
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
                        placeholder="Contoh: Piston Crown - Main Engine"
                        value={editItemForm.part_name}
                        onChange={(e) => setEditItemForm({ ...editItemForm, part_name: e.target.value })}
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
                        placeholder="Contoh: 9RTA-96C-PC01"
                        value={editItemForm.part_number}
                        onChange={(e) => setEditItemForm({ ...editItemForm, part_number: e.target.value })}
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
                        placeholder="Contoh: SKU-ME-PST-01"
                        value={editItemForm.sku}
                        onChange={(e) => setEditItemForm({ ...editItemForm, sku: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Unit / Satuan */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                        Satuan (Unit)
                      </label>
                      <select
                        value={editItemForm.unit}
                        onChange={(e) => setEditItemForm({ ...editItemForm, unit: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="PCS">PCS (Pieces)</option>
                        <option value="SET">SET</option>
                        <option value="BOX">BOX</option>
                        <option value="MTR">MTR (Meter)</option>
                        <option value="ROLL">ROLL</option>
                        <option value="KIT">KIT</option>
                      </select>
                    </div>

                    {/* Hierarchy Root */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                        Sistem Root (Hierarchy 1) <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editItemForm.hierarchy[0] || "Auxiliary System"}
                        onChange={(e) => {
                          const h = [...(editItemForm.hierarchy || [])];
                          h[0] = e.target.value;
                          setEditItemForm({ ...editItemForm, hierarchy: h });
                        }}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Propulsion System">Propulsion System</option>
                        <option value="Auxiliary System">Auxiliary System</option>
                        <option value="Steering & Deck">Steering & Deck</option>
                        <option value="Electrical & Automation">Electrical & Automation</option>
                        <option value="Environmental System">Environmental System</option>
                        <option value="Safety & Firefighting">Safety & Firefighting</option>
                      </select>
                    </div>

                    {/* Subsystem / Engine (Hierarchy 2) */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                        Turunan Mesin (Hierarchy 2)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Main Engine (Sulzer 9RTA96C)"
                        value={editItemForm.hierarchy[1] || ""}
                        onChange={(e) => {
                          const h = [...(editItemForm.hierarchy || [])];
                          h[1] = e.target.value;
                          setEditItemForm({ ...editItemForm, hierarchy: h });
                        }}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Component Section (Hierarchy 3) */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                        Kategori Bagian (Hierarchy 3)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Piston Assembly"
                        value={editItemForm.hierarchy[2] || ""}
                        onChange={(e) => {
                          const h = [...(editItemForm.hierarchy || [])];
                          h[2] = e.target.value;
                          setEditItemForm({ ...editItemForm, hierarchy: h });
                        }}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Manufacturer */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                        Pabrikan (Manufacturer)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Sulzer Diesel Engines Ltd"
                        value={editItemForm.manufacturer || ""}
                        onChange={(e) => setEditItemForm({ ...editItemForm, manufacturer: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Vessel Compatibility */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                        Kesesuaian Kapal (Vessels)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: MV. MEUTIA BARUNA, MV. MARTHA BARUNA"
                        value={editItemForm.vessel_compatibility || ""}
                        onChange={(e) => setEditItemForm({ ...editItemForm, vessel_compatibility: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Weight */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wide">
                        Bobot (Weight in Kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Contoh: 485"
                        value={editItemForm.weight_kg || ""}
                        onChange={(e) => setEditItemForm({ ...editItemForm, weight_kg: Number(e.target.value) || 0 })}
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
                      rows={3}
                      placeholder="Masukkan deskripsi detail..."
                      value={editItemForm.description}
                      onChange={(e) => setEditItemForm({ ...editItemForm, description: e.target.value })}
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
                      placeholder="Contoh: Material: Forged Steel Alloy, Diameter: 960mm"
                      value={editItemForm.specification || ""}
                      onChange={(e) => setEditItemForm({ ...editItemForm, specification: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                </form>
              ) : (
                /* STATIC PREVIEW & PRINTABLE CARD */
                <>
                  {/* Printable Label Layout Box */}
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-white shadow-inner flex flex-col md:flex-row gap-6 print:border-solid print:border-2 print:border-slate-900 print:rounded-none">
                    
                    {/* QR Code on Printable Side */}
                    <div className="flex flex-col items-center justify-center shrink-0 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
                      <div className="p-2.5 bg-white border border-slate-300 rounded-xl">
                        <QRCode
                          value={`PART-ID:${selectedItem.id}|NUM:${selectedItem.part_number}|NAME:${selectedItem.part_name}`}
                          size={140}
                          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                          viewBox={`0 0 256 256`}
                        />
                      </div>
                      <div className="text-center mt-3 font-mono">
                        <span className="text-[10px] font-black text-blue-700 uppercase bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                          {selectedItem.id}
                        </span>
                        <span className="text-[8px] text-slate-400 block mt-1 uppercase tracking-widest">
                          Verified static token ID
                        </span>
                      </div>
                    </div>

                    {/* Metadata details on Printable Side */}
                    <div className="flex-1 space-y-3.5">
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
                        <p className="text-xs font-bold font-mono text-slate-600 mt-1">
                          NO PART: <span className="text-slate-900">{selectedItem.part_number}</span>
                        </p>
                        <p className="text-[10px] font-mono font-bold text-slate-400 uppercase mt-0.5">
                          SKU: <span className="text-slate-600">{selectedItem.sku}</span>
                        </p>
                      </div>

                      <div className="border-t border-slate-150 pt-2.5 space-y-1.5 text-xs">
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

                      <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-[11px] leading-normal text-slate-600 italic">
                        {selectedItem.description}
                      </div>
                    </div>

                  </div>

                  {/* Informational Guidance */}
                  <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3.5 rounded-lg text-xs space-y-1 no-print">
                    <p className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-blue-900 font-mono">
                      <Info className="w-4 h-4 text-blue-600" /> PETUNJUK PENGGUNAAN QR
                    </p>
                    <p className="leading-relaxed">
                      Gunakan kamera perangkat Anda atau terminal scanner genggam WMS untuk memindai kode QR statis ini. Scanner akan langsung membuka lembar inventaris, mencocokkan suku cadang dalam pengisian Permintaan Barang (TUG 5), atau melacak log historis stok secara otomatis.
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
                    onClick={handleSaveEdit}
                    className="px-5 py-2.5 rounded bg-blue-600 hover:bg-blue-500 border border-blue-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Save className="w-4 h-4" /> Simpan Perubahan
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
                    <Printer className="w-4 h-4" /> Cetak Label QR
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
