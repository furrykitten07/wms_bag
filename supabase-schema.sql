-- ========================================================
-- WMS PT. PELAYARAN BAHTERA ADHIGUNA
-- MASTER SUPABASE / POSTGRESQL SCHEMA & INITIAL SEED
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================
-- 1. DROP EXISTING TABLES IF NEEDED (CASCADE SAFE)
-- ========================================================
DROP TABLE IF EXISTS movement_ledger_entries CASCADE;
DROP TABLE IF EXISTS material_returns CASCADE;
DROP TABLE IF EXISTS outbound_dispatches CASCADE;
DROP TABLE IF EXISTS material_requests CASCADE;
DROP TABLE IF EXISTS inbound_receivings CASCADE;
DROP TABLE IF EXISTS spk_work_orders CASCADE;
DROP TABLE IF EXISTS spare_parts CASCADE;
DROP TABLE IF EXISTS warehouse_locations CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS digital_signatures CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- ========================================================
-- 2. CREATE MASTER TABLES
-- ========================================================

-- Table 1: Users & Multi-Role Authentication
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL, -- SUPER_ADMIN, KEPALA_GUDANG, WAREHOUSE_STAFF, LOGISTICS_MANAGER, VP_RENDALHAR, VESSEL_CREW
    password VARCHAR(255) DEFAULT 'admin123' NOT NULL,
    vessel_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Vendors / Supplier Rekanan
CREATE TABLE vendors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: Warehouse Master Locations (Racks, Bins, Shelves)
CREATE TABLE warehouse_locations (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    warehouse VARCHAR(100) NOT NULL,
    zone VARCHAR(100),
    rack VARCHAR(100),
    shelf VARCHAR(100),
    bin VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 4: Master Spare Parts Inventory
CREATE TABLE spare_parts (
    id VARCHAR(50) PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    part_number VARCHAR(100) NOT NULL,
    alternative_part_number VARCHAR(100),
    part_name VARCHAR(255) NOT NULL,
    maker VARCHAR(255) NOT NULL,
    unit VARCHAR(50) DEFAULT 'PCS' NOT NULL,
    category VARCHAR(100) NOT NULL,
    current_stock INT DEFAULT 0 NOT NULL,
    reorder_point INT DEFAULT 5 NOT NULL,
    location_id VARCHAR(50) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 5: Inbound Receivings (Penerimaan Barang & QC)
CREATE TABLE inbound_receivings (
    id VARCHAR(50) PRIMARY KEY,
    purchase_order_num VARCHAR(100) NOT NULL,
    delivery_note_num VARCHAR(100) NOT NULL,
    spk_number VARCHAR(100),
    spk_id VARCHAR(100),
    vendor_id VARCHAR(50) REFERENCES vendors(id) ON DELETE SET NULL,
    vendor_name VARCHAR(255),
    received_date DATE NOT NULL,
    received_by VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
    qc_notes TEXT,
    keeper_notes TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 6: SPK Work Orders (Surat Perintah Kerja)
CREATE TABLE spk_work_orders (
    id VARCHAR(50) PRIMARY KEY,
    spk_number VARCHAR(100) UNIQUE NOT NULL,
    vessel_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    assigned_to VARCHAR(255) NOT NULL,
    target_port VARCHAR(100),
    date_created DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Open' NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 7: Material Requests (TUG 5 Permintaan Kapal & TUG 6 Permintaan Suku Cadang)
CREATE TABLE material_requests (
    id VARCHAR(50) PRIMARY KEY,
    request_number VARCHAR(100) UNIQUE NOT NULL,
    tug5_number VARCHAR(100),
    tug6_number VARCHAR(100),
    vessel_name VARCHAR(255) NOT NULL,
    warehouse_name VARCHAR(100) DEFAULT 'Gudang Merak',
    request_date DATE NOT NULL,
    requester_name VARCHAR(100) NOT NULL,
    work_order_ref VARCHAR(100),
    account_code VARCHAR(100) DEFAULT 'BPP',
    function_code VARCHAR(100) DEFAULT 'ARMADA',
    delivery_address TEXT,
    status VARCHAR(50) DEFAULT 'Draft' NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    remarks TEXT,
    
    -- 4 TAHAP APPROVAL & TTD DIGITAL LENGKAP:
    -- Tahap 1: Petugas Gudang (Aldi Hidayat)
    aldi_signed BOOLEAN DEFAULT FALSE,
    aldi_signed_at TIMESTAMPTZ,
    aldi_signature_url TEXT,
    -- Tahap 2: Kepala Gudang (Maghfur Muhammad Alfin)
    alfin_signed BOOLEAN DEFAULT FALSE,
    alfin_signed_at TIMESTAMPTZ,
    alfin_signature_url TEXT,
    -- Tahap 3: Manager Logistik (Mohamat Emir Ferdian)
    emir_signed BOOLEAN DEFAULT FALSE,
    emir_signed_at TIMESTAMPTZ,
    emir_signature_url TEXT,
    -- Tahap 4: VP Rendalhar (Sumbono)
    sumbono_signed BOOLEAN DEFAULT FALSE,
    sumbono_signed_at TIMESTAMPTZ,
    sumbono_signature_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 8: Outbound Dispatches (TUG 8 Pengeluaran Barang / Bon / Surat Jalan / Manifest)
CREATE TABLE outbound_dispatches (
    id VARCHAR(50) PRIMARY KEY,
    request_reference VARCHAR(100),
    vessel_name VARCHAR(255) NOT NULL,
    consignee VARCHAR(255),
    bon_pengeluaran_number VARCHAR(100),
    surat_jalan_number VARCHAR(100),
    manifest_number VARCHAR(100),
    tug8_number VARCHAR(100) UNIQUE,
    warehouse_name VARCHAR(100) DEFAULT 'Gudang Merak',
    delivery_destination TEXT,
    courier_name VARCHAR(100) DEFAULT 'Internal Cargo',
    tracking_number VARCHAR(100),
    driver_pic VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Draft' NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_by VARCHAR(100),
    work_order_ref VARCHAR(100),
    account_code VARCHAR(100) DEFAULT 'BPP',
    function_code VARCHAR(100) DEFAULT 'ARMADA',
    dispatch_date DATE,
    
    -- 4 TAHAP APPROVAL & TTD DIGITAL LENGKAP:
    aldi_signed BOOLEAN DEFAULT FALSE,
    aldi_signed_at TIMESTAMPTZ,
    aldi_signature_url TEXT,
    alfin_signed BOOLEAN DEFAULT FALSE,
    alfin_signed_at TIMESTAMPTZ,
    alfin_signature_url TEXT,
    emir_signed BOOLEAN DEFAULT FALSE,
    emir_signed_at TIMESTAMPTZ,
    emir_signature_url TEXT,
    sumbono_signed BOOLEAN DEFAULT FALSE,
    sumbono_signed_at TIMESTAMPTZ,
    sumbono_signature_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 9: Material Returns (TUG 10 Pengembalian Suku Cadang)
CREATE TABLE material_returns (
    id VARCHAR(50) PRIMARY KEY,
    return_number VARCHAR(100) UNIQUE NOT NULL,
    vessel_name VARCHAR(255) NOT NULL,
    warehouse_name VARCHAR(100) DEFAULT 'Gudang Merak',
    return_date DATE NOT NULL,
    return_reason VARCHAR(100) DEFAULT 'Broken',
    spk_number VARCHAR(100),
    dispatch_reference VARCHAR(100),
    created_by VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft' NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,

    -- 4 TAHAP APPROVAL & TTD DIGITAL LENGKAP:
    aldi_signed BOOLEAN DEFAULT FALSE,
    aldi_signed_at TIMESTAMPTZ,
    aldi_signature_url TEXT,
    alfin_signed BOOLEAN DEFAULT FALSE,
    alfin_signed_at TIMESTAMPTZ,
    alfin_signature_url TEXT,
    emir_signed BOOLEAN DEFAULT FALSE,
    emir_signed_at TIMESTAMPTZ,
    emir_signature_url TEXT,
    sumbono_signed BOOLEAN DEFAULT FALSE,
    sumbono_signed_at TIMESTAMPTZ,
    sumbono_signature_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 10: Master Digital Signatures
CREATE TABLE digital_signatures (
    id VARCHAR(50) PRIMARY KEY,
    role_title VARCHAR(100) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    signature_url TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 11: Movement Ledger Entries (Kartu Stok / Mutasi Barang)
CREATE TABLE movement_ledger_entries (
    id VARCHAR(50) PRIMARY KEY,
    transaction_type VARCHAR(50) NOT NULL,
    spare_part_id VARCHAR(50) NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
    spare_part_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100) NOT NULL,
    source_location VARCHAR(100),
    destination_location VARCHAR(100),
    qty_in INT DEFAULT 0 NOT NULL,
    qty_out INT DEFAULT 0 NOT NULL,
    before_stock INT NOT NULL,
    after_stock INT NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    remarks TEXT,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100) NOT NULL
);

-- Table 12: Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(255) NOT NULL,
    module VARCHAR(255) NOT NULL,
    details TEXT,
    operator VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 3. SEED INITIAL DATA
-- ========================================================

-- Insert 5 Key System Users
INSERT INTO users (id, username, name, email, role, password) VALUES
('usr-1', 'superadmin', 'Fikri Haikal (Superadmin)', 'superadmin@maritime-logistics.com', 'SUPER_ADMIN', 'admin123'),
('usr-2', 'alfin', 'MAGHFUR MUHAMMAD ALFIN', 'alfin.rendalhar@maritime-logistics.com', 'KEPALA_GUDANG', 'admin123'),
('usr-3', 'aldi', 'Aldi Hidayat', 'aldi.hidayat@maritime-logistics.com', 'WAREHOUSE_STAFF', 'admin123'),
('usr-4', 'emir', 'Mohamat Emir Ferdian', 'emir.ferdian@maritime-logistics.com', 'LOGISTICS_MANAGER', 'admin123'),
('usr-5', 'sumbono', 'Sumbono', 'sumbono@maritime-logistics.com', 'VP_RENDALHAR', 'admin123')
ON CONFLICT (username) DO NOTHING;

-- Insert Locations
INSERT INTO warehouse_locations (id, code, warehouse, zone, rack, shelf, bin) VALUES
('loc-1', 'A1', 'Gudang Merak', 'Zone A', 'Rack A', 'Level 1', 'A1-G'),
('loc-2', 'A2', 'Gudang Merak', 'Zone A', 'Rack A', 'Level 2', 'A2-M'),
('loc-3', 'B1', 'Gudang Merak', 'Zone B', 'Rack B', 'Level 1', 'B1-G'),
('loc-4', 'B2', 'Gudang Merak', 'Zone B', 'Rack B', 'Level 2', 'B2-M'),
('loc-5', 'C1', 'Gudang Merak', 'Zone C', 'Rack C', 'Level 1', 'C1-G')
ON CONFLICT (code) DO NOTHING;

-- Insert Sample Spare Parts
INSERT INTO spare_parts (id, sku, part_number, part_name, maker, unit, category, current_stock, reorder_point, location_id, remarks) VALUES
('part-1', 'SKU-ME-001', 'W6L20-302A', 'Main Engine Piston Ring', 'Wärtsilä', 'PCS', 'Mechanical', 18, 4, 'loc-1', 'Gunakan grease pelindung karat sebelum penyimpanan jangka panjang'),
('part-2', 'SKU-ME-002', 'W20-FUEL-INJ', 'Fuel Injector Nozzle v3', 'Wärtsilä', 'PCS', 'Mechanical', 10, 5, 'loc-1', 'Sangat sensitif terhadap debu. Simpan dalam wadah plastik steril.'),
('part-3', 'SKU-EL-101', 'AL-GEN-220V', 'Automatic Voltage Regulator (AVR)', 'Alfa Laval', 'PCS', 'Electrical', 8, 2, 'loc-2', 'Suku cadang kelistrikan utama generator kapal'),
('part-4', 'SKU-DK-201', 'ANCHOR-SHACKLE-50T', 'D-Shackle 50 Ton', 'Samudra Supply', 'PCS', 'Mechanical', 15, 3, 'loc-3', 'Sertifikasi uji beban terlampir di map filing QC'),
('part-5', 'SKU-SF-301', 'LIFERAFT-15P-SOLAS', 'Inflatable Liferaft 15 Persons', 'Survitec', 'UNIT', 'Consumable', 5, 2, 'loc-4', 'Pemeriksaan hydrostatic release unit (HRU) wajib berkala')
ON CONFLICT (sku) DO NOTHING;

-- ========================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS) & PUBLIC POLICIES
-- ========================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_receivings ENABLE ROW LEVEL SECURITY;
ALTER TABLE spk_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon all on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow anon all on vendors" ON vendors FOR ALL USING (true);
CREATE POLICY "Allow anon all on warehouse_locations" ON warehouse_locations FOR ALL USING (true);
CREATE POLICY "Allow anon all on spare_parts" ON spare_parts FOR ALL USING (true);
CREATE POLICY "Allow anon all on inbound_receivings" ON inbound_receivings FOR ALL USING (true);
CREATE POLICY "Allow anon all on spk_work_orders" ON spk_work_orders FOR ALL USING (true);
CREATE POLICY "Allow anon all on material_requests" ON material_requests FOR ALL USING (true);
CREATE POLICY "Allow anon all on outbound_dispatches" ON outbound_dispatches FOR ALL USING (true);
CREATE POLICY "Allow anon all on material_returns" ON material_returns FOR ALL USING (true);
CREATE POLICY "Allow anon all on digital_signatures" ON digital_signatures FOR ALL USING (true);
CREATE POLICY "Allow anon all on movement_ledger_entries" ON movement_ledger_entries FOR ALL USING (true);
CREATE POLICY "Allow anon all on audit_logs" ON audit_logs FOR ALL USING (true);

-- ========================================================
-- 5. SUPABASE STORAGE BUCKETS SETUP & POLICIES
-- ========================================================
-- Note: Create buckets 'signatures' and 'documents'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for Public Read & Anon Upload
CREATE POLICY "Public Read signatures" ON storage.objects FOR SELECT USING (bucket_id = 'signatures');
CREATE POLICY "Anon Insert signatures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'signatures');
CREATE POLICY "Anon Update signatures" ON storage.objects FOR UPDATE USING (bucket_id = 'signatures');
CREATE POLICY "Anon Delete signatures" ON storage.objects FOR DELETE USING (bucket_id = 'signatures');

CREATE POLICY "Public Read documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Anon Insert documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Anon Update documents" ON storage.objects FOR UPDATE USING (bucket_id = 'documents');
CREATE POLICY "Anon Delete documents" ON storage.objects FOR DELETE USING (bucket_id = 'documents');
