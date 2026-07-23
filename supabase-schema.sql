-- ==========================================
-- SUPABASE / POSTGRESQL DATABASE SCHEMA
-- WAREHOUSE MANAGEMENT SYSTEM (WMS)
-- PT. PELAYARAN BAHTERA ADHIGUNA
-- ==========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DROP EXISTING TABLES IF ANY (ORDERED BY DEPENDENCY TO AVOID ERRORS)
DROP TABLE IF EXISTS material_returns CASCADE;
DROP TABLE IF EXISTS material_requests CASCADE;
DROP TABLE IF EXISTS spk_work_orders CASCADE;
DROP TABLE IF EXISTS movement_ledger_entries CASCADE;
DROP TABLE IF EXISTS approval_tasks CASCADE;
DROP TABLE IF EXISTS vessel_requests CASCADE;
DROP TABLE IF EXISTS outbound_dispatches CASCADE;
DROP TABLE IF EXISTS inbound_receivings CASCADE;
DROP TABLE IF EXISTS spare_parts CASCADE;
DROP TABLE IF EXISTS warehouse_locations CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- ==========================================
-- 2. CREATE TABLES
-- ==========================================

-- Table: Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(255) NOT NULL,
    module VARCHAR(255) NOT NULL,
    details TEXT,
    operator VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Users (Dynamic Auth & Roles)
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL, -- SUPER_ADMIN, WAREHOUSE_ADMIN, SUPERINTENDENT, VESSEL_CREW
    password VARCHAR(255) DEFAULT 'admin123' NOT NULL,
    vessel_name VARCHAR(255), -- Applicable for Vessel Crew
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Vendors
CREATE TABLE vendors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Warehouse Locations
CREATE TABLE warehouse_locations (
    id VARCHAR(50) PRIMARY KEY,
    location_name VARCHAR(100) UNIQUE NOT NULL, -- e.g., Rak A-1, Bin B-5
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Spare Parts (Master Inventory)
CREATE TABLE spare_parts (
    id VARCHAR(50) PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    part_number VARCHAR(100) NOT NULL,
    alternative_part_number VARCHAR(100),
    part_name VARCHAR(255) NOT NULL,
    maker VARCHAR(255) NOT NULL,
    unit VARCHAR(50) DEFAULT 'PCS' NOT NULL,
    category VARCHAR(100) NOT NULL, -- e.g., Mechanical, Electrical, Consumable
    current_stock INT DEFAULT 0 NOT NULL,
    reorder_point INT DEFAULT 5 NOT NULL,
    location_id VARCHAR(50) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Inbound Receivings (Penerimaan Barang / PO / TUG 5)
CREATE TABLE inbound_receivings (
    id VARCHAR(50) PRIMARY KEY,
    po_number VARCHAR(100) NOT NULL,
    delivery_note_number VARCHAR(100) NOT NULL,
    vendor_id VARCHAR(50) REFERENCES vendors(id) ON DELETE SET NULL,
    received_date DATE NOT NULL,
    received_by VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL, -- DRAFT, APPROVED_QC, COMPLETED
    qc_notes TEXT,
    items JSONB NOT NULL, -- Array of items: [{part_id, qty_received, qty_accepted, condition}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Outbound Dispatches (Pengeluaran Barang)
CREATE TABLE outbound_dispatches (
    id VARCHAR(50) PRIMARY KEY,
    manifest_number VARCHAR(100) UNIQUE NOT NULL,
    carrier VARCHAR(100) NOT NULL,
    vessel_name VARCHAR(255) NOT NULL,
    dispatch_date DATE NOT NULL,
    dispatched_by VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL, -- PENDING, DISPATCHED, DELIVERED
    items JSONB NOT NULL, -- Array of items: [{part_id, quantity}]
    destination TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Vessel Requests (Permintaan Suku Cadang Kapal)
CREATE TABLE vessel_requests (
    id VARCHAR(50) PRIMARY KEY,
    request_number VARCHAR(100) UNIQUE NOT NULL,
    vessel_name VARCHAR(255) NOT NULL,
    request_date DATE NOT NULL,
    requested_by VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING_SUPERINTENDENT' NOT NULL, -- PENDING_SUPERINTENDENT, APPROVED, DECLINED
    items JSONB NOT NULL, -- Array of items: [{part_id, qty_requested}]
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: SPK Work Orders (Surat Perintah Kerja)
CREATE TABLE spk_work_orders (
    id VARCHAR(50) PRIMARY KEY,
    spk_number VARCHAR(100) UNIQUE NOT NULL,
    vessel_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    assigned_to VARCHAR(255) NOT NULL,
    date_created DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'OPEN' NOT NULL, -- OPEN, IN_PROGRESS, COMPLETED
    items JSONB DEFAULT '[]'::jsonb NOT NULL, -- Items list
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Material Requests (Permintaan Barang / TUG 9)
CREATE TABLE material_requests (
    id VARCHAR(50) PRIMARY KEY,
    request_number VARCHAR(100) UNIQUE NOT NULL,
    vessel_name VARCHAR(255) NOT NULL,
    request_date DATE NOT NULL,
    requested_by VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING_SUPERINTENDENT' NOT NULL, -- PENDING_SUPERINTENDENT, APPROVED, DECLINED, COMPLETED
    items JSONB NOT NULL, -- Array of items: [{part_id, qty_requested, qty_approved}]
    notes TEXT,
    approved_by VARCHAR(50),
    approval_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Material Returns (Pengembalian Barang / TUG 10)
CREATE TABLE material_returns (
    id VARCHAR(50) PRIMARY KEY,
    return_number VARCHAR(100) UNIQUE NOT NULL,
    vessel_name VARCHAR(255) NOT NULL,
    return_date DATE NOT NULL,
    returned_by VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING_VERIFICATION' NOT NULL, -- PENDING_VERIFICATION, VERIFIED, REJECTED
    items JSONB NOT NULL, -- Array of items: [{part_id, qty_returned, condition}]
    notes TEXT,
    verified_by VARCHAR(50),
    verification_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Movement Ledger Entries (Kartu Stock / Ledger Log)
CREATE TABLE movement_ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id VARCHAR(50) NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
    reference_number VARCHAR(100) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    qty_in INT DEFAULT 0 NOT NULL,
    qty_out INT DEFAULT 0 NOT NULL,
    before_stock INT NOT NULL,
    after_stock INT NOT NULL,
    created_by VARCHAR(50) NOT NULL,
    remarks TEXT
);


-- ==========================================
-- 3. INSERT SEED DATA (INITIAL OPERATORS & CONFIGURATION)
-- ==========================================

-- Insert Users (Default Password: 'admin123')
INSERT INTO users (id, username, name, email, role, password, vessel_name) VALUES
('usr-1', 'superadmin', 'Fikri Haikal (Superadmin)', 'superadmin@maritime-logistics.com', 'SUPER_ADMIN', 'admin123', NULL),
('usr-2', 'staff_gudang_1', 'Ahmad Subarjo (Staff 1)', 'ahmad.subarjo@maritime-logistics.com', 'WAREHOUSE_ADMIN', 'admin123', NULL),
('usr-3', 'staff_gudang_2', 'Taufik Hidayat (Staff 2)', 'taufik.hidayat@maritime-logistics.com', 'WAREHOUSE_ADMIN', 'admin123', NULL),
('usr-4', 'admin', 'System Admin Alias', 'admin@maritime-logistics.com', 'SUPER_ADMIN', 'admin123', NULL),
('usr-5', 'supt_marine', 'Capt. H. Wijaya', 'wijaya.h@maritime-logistics.com', 'SUPERINTENDENT', 'admin123', NULL),
('usr-6', 'crew_voyager', 'Anto Wijaya', 'voyager.chief@maritime-crew.com', 'VESSEL_CREW', 'admin123', 'MV Ocean Voyager'),
('usr-7', 'crew_dawn', 'Siti Rahma', 'dawn.chief@maritime-crew.com', 'VESSEL_CREW', 'admin123', 'MV Pacific Dawn');

-- Insert Locations
INSERT INTO warehouse_locations (id, location_name, description) VALUES
('loc-1', 'RAK-A1', 'Rak utama sisi utara (Suku Cadang Mesin)'),
('loc-2', 'RAK-A2', 'Rak utama sisi utara (Suku Cadang Listrik)'),
('loc-3', 'RAK-B1', 'Rak sekunder sisi barat (Peralatan Deck)'),
('loc-4', 'RAK-B2', 'Rak sekunder sisi barat (Safety Equipment)'),
('loc-5', 'ZONE-C', 'Area lantai bebas untuk barang berdimensi besar');

-- Insert Vendors
INSERT INTO vendors (id, name, code, contact_person, phone, email, address) VALUES
('vnd-1', 'Wärtsilä Indonesia', 'WRT-001', 'Hadi Wijaya', '0812-3456-7890', 'sales@wartsila.co.id', 'Kawasan Industri MM2100, Bekasi'),
('vnd-2', 'Samudra Marine Supply', 'SMS-992', 'Linda Hartati', '0811-987-654', 'info@samudramarine.com', 'Jl. Pelabuhan Tanjung Priok No. 12, Jakarta'),
('vnd-3', 'Alfa Laval Maritime', 'ALF-401', 'Budi Santoso', '021-5554321', 'budi.santoso@alfalaval.com', 'Sudirman Central Business District, Jakarta'),
('vnd-4', 'Chugoku Paints Indonesia', 'CHG-302', 'Ayu Lestari', '021-889977', 'ayu@chugoku.co.id', 'Cikarang Industrial Estate, Bekasi');

-- Insert Sample Inventory Items
INSERT INTO spare_parts (id, sku, part_number, alternative_part_number, part_name, maker, unit, category, current_stock, reorder_point, location_id, remarks) VALUES
('part-1', 'SKU-ME-001', 'W6L20-302A', 'ALT-W6L20', 'Main Engine Piston Ring', 'Wärtsilä', 'PCS', 'Mechanical', 12, 4, 'loc-1', 'Gunakan grease pelindung karat sebelum penyimpanan jangka panjang'),
('part-2', 'SKU-ME-002', 'W20-FUEL-INJ', NULL, 'Fuel Injector Nozzle v3', 'Wärtsilä', 'PCS', 'Mechanical', 3, 5, 'loc-1', 'Sangat sensitif terhadap debu. Simpan dalam wadah plastik steril.'),
('part-3', 'SKU-EL-101', 'AL-GEN-220V', 'AVR-MX321', 'Automatic Voltage Regulator (AVR)', 'Alfa Laval', 'PCS', 'Electrical', 8, 2, 'loc-2', 'Suku cadang kelistrikan utama generator kapal'),
('part-4', 'SKU-DK-201', 'ANCHOR-SHACKLE-50T', NULL, 'D-Shackle 50 Ton', 'Samudra Supply', 'PCS', 'Mechanical', 15, 3, 'loc-3', 'Sertifikasi uji beban terlampir di map filing QC'),
('part-5', 'SKU-SF-301', 'LIFERAFT-15P-SOLAS', 'SOLAS-LR15', 'Inflatable Liferaft 15 Persons', 'Survitec', 'UNIT', 'Consumable', 2, 2, 'loc-4', 'Pemeriksaan hydrostatic release unit (HRU) wajib berkala');
