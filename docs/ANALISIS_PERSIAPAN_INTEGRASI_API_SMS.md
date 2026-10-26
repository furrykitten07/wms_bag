# LAPORAN ANALISIS PERSIAPAN INTEGRASI API: SHIP MANAGEMENT SYSTEM (SMS) & WMS PT. BAHATERA ADHIGUNA

**Dokumen:** Analisis Kebutuhan Integrasi Sistem (System Integration Analysis Report)  
**Target Sistem:** WMS PT. Pelayaran Bahtera Adhiguna (Web App React/Vite + Express.js API)  
**Sistem Eksternal:** SMS (Ship Management System)  
**Status Implementasi:** DRAF ANALISIS (Belum Ada Kode yang Diubah)  
**Tanggal:** 22 Oktober 2026  

---

## 1. PENDAHULUAN & STATUS VERIFIKASI

Laporan ini disusun sebagai tahap pra-integrasi untuk memetakan arsitektur, model data, alur bisnis, serta kebutuhan pertukaran data antara aplikasi **WMS PT. BAG** dan sistem eksternal **SMS (Ship Management System)**.

> [!IMPORTANT]
> **Prinsip Analisis:**
> - **Fakta Terverifikasi:** Didasarkan langsung pada struktur kode sumber aktif (`src/types.ts`, `server.ts`, `db.ts`, komponen TUG, dan skema database WMS).
> - **Asumsi / Belum Diketahui:** Ditandai khusus karena spesifikasi teknis dan dokumentasi resmi dari pihak pengembang SMS belum diterima.

---

## 2. FUNGSI DAN ALUR PROSES WEBSITE YANG RELEVAN

### 2.1 Fakta dari Codebase WMS PT. BAG
Berdasarkan pemeriksaan codebase, WMS PT. BAG mengelola siklus logistik suku cadang kapal dengan entitas dan alur utama sebagai berikut:

```
[KAPAL / OPERASIONAL] ──(Permintaan Barang)──> [TUG 5 / TUG 6 (WMS)]
                                                       │
                                            (Persetujuan 4 Tahap)
                                            (Aldi -> Alfin -> Emir -> Sumbono)
                                                       │
                                            (Penerbitan SPK & TUG 8)
                                                       │
                                          [Outbound Dispatch / Surat Jalan]
                                                       │
                                                (Potong Stok Fisik)
                                                       │
[KAPAL / DERMAGA] <────(Pengiriman Fisik Logistik)─────┘
        │
 (Sisa / Copotan)
        │
        v
[Material Return TUG 10 (WMS)] ──(Approved)──> [Tambah Stok Kembali]
```

Modul dan model data WMS yang secara langsung bersinggungan dengan operasional kapal (SMS):

1. **Permintaan Barang Operasional Kapal (Material Request - TUG 5):**
   - Mengelola daftar suku cadang/material umum yang diminta oleh kapal (`vessel_name`) melalui pemohon/Chief Engineer (`requester_name`).
   - Status alur: `Draft` ➔ `Submitted` ➔ `Approved` (Persetujuan bertingkat) ➔ `Processed`.
2. **Permintaan Sparepart Mesin & Monitoring Item Kritis (Material Request - TUG 6):**
   - Menangani suku cadang teknis kapal, dilengkapi validasi otomatis terhadap database *Critical Spare Parts* (komponen mesin utama kapal yang membutuhkan atensi prioritas).
3. **Surat Perintah Kerja (SPK Work Order):**
   - Mengelompokkan penyiapan barang berdasarkan pelabuhan tujuan (`target_port`) dan daftar kapal target (`vessels: [{ vessel_name, items }]`).
4. **Pengeluaran Barang & Surat Jalan (Outbound Dispatch - TUG 8):**
   - Penerbitan Bon Pengeluaran dan Surat Jalan resmi. Ketika status diubah ke `Dispatched`, sistem secara otomatis memotong stok fisik (`current_stock`) di gudang dan mencatat transaksi ke *Movement Ledger*.
5. **Pengembalian Barang Sisa / Copotan (Material Return - TUG 10):**
   - Mencatat material bekas atau tidak terpakai dari kapal kembali ke gudang fisik. Saat disetujui (`Approved`), sistem secara otomatis menambah kembali stok gudang.
6. **Master Kapal (Vessels Fleet):**
   - Menyimpan daftar armada kapal resmi PT. BAG (`name`, `code`, `vessel_type`, `capacity`, `status`).

---

## 3. DATA DAN FIELD YANG PERLU DIKIRIM DARI SMS KE WMS

Dalam konteks operasional maritim, fungsi utama SMS terkait pergudangan adalah mengirimkan **Kebutuhan Logistik / Requisition Material dari Kapal** ke Gudang Pusat/Cabang WMS.

Berikut rincian payload data yang perlu dikirim dari SMS saat kru kapal menerbitkan permintaan barang:

### A. Level Header (Informasi Dokumen & Kapal)

| Nama Field SMS | Tipe Data | Status | Validasi WMS | Alasan Kebutuhan |
| :--- | :---: | :---: | :--- | :--- |
| `external_requisition_no` | String | **Wajib** | Min. 3 char, unik, non-empty | Sebagai ID referensi unik dari SMS guna mencegah duplikasi pengiriman data (idempotency) dan jejak audit antar-sistem. |
| `vessel_name` | String | **Wajib** | Harus terdaftar di Master Kapal WMS | Menentukan kapal mana yang meminta barang. Alokasi pengiriman dan cetak dokumen TUG terikat langsung pada nama kapal. |
| `vessel_code` | String | Opsional | Alphanumeric (opsional) | Alternatif identifikasi jika penulisan nama kapal memiliki variasi spasi/titik (misal: `MV. KARTINI BARUNA` vs `KARTINI BARUNA`). |
| `request_date` | String (ISO) | **Wajib** | Format valid `YYYY-MM-DD` | Tanggal resmi pengajuan dari kapal untuk pencatatan periode mutasi dan laporan TUG 11. |
| `requester_name` | String | **Wajib** | Min. 2 char | Nama pejabat kapal pemohon (biasanya Chief Engineer / Master). Wajib tertera pada kolom tanda tangan pemohon TUG. |
| `department` | String | Opsional | Enum: `ENGINE`, `DECK`, `LOGISTICS` (Default: `ENGINE`) | Pengelompokan jenis kebutuhan di kapal. |
| `urgency` | String | Opsional | Enum: `NORMAL`, `HIGH`, `URGENT`, `CRITICAL` (Default: `NORMAL`) | Penanda prioritas penyiapan barang di gudang. |
| `destination_port` | String | Opsional | Text | Pelabuhan tempat kapal bersandar untuk rencana pengantaran kargo. |
| `work_order_ref` | String | Opsional | Text | Nomor SPK / Maintenance Work Order dari SMS jika pengadaan terkait pekerjaan perawatan tertentu. |
| `remarks` | String | Opsional | Text | Catatan teknis pengiriman atau instruksi khusus dari kru kapal. |
| `tug_type` | String | Opsional | Enum: `TUG5` (Umum) atau `TUG6` (Sparepart Mesin) | Menentukan jenis formulir resmi yang akan dihasilkan di WMS. |

### B. Level Item Barang (`items` Array, Wajib Minimal 1 Item)

| Nama Field SMS | Tipe Data | Status | Validasi WMS | Alasan Kebutuhan |
| :--- | :---: | :---: | :--- | :--- |
| `part_number` | String | **Wajib** | Min. 1 char, non-empty | Kunci pengenal utama spesifikasi suku cadang pabrikan (OEM Part Number) agar gudang tidak salah mengambil barang. |
| `part_name` | String | **Wajib** | Min. 2 char | Deskripsi nama barang yang akan dicetak pada lembar fisik dokumen TUG dan Surat Jalan. |
| `requested_qty` | Number | **Wajib** | Angka bulat / desimal > 0 | Kuantitas suku cadang yang diminta oleh kapal. |
| `unit` | String | **Wajib** | Enum/Text (`PCS`, `SET`, `UNIT`, `BOX`, `MTR`, `KG`, dll) | Satuan ukuran fisik logistik barang. |
| `avg_monthly_usage` | Number | Opsional | Angka >= 0 (Default: 0) | Data pemakaian rata-rata per bulan kapal (standar kolom audit TUG 5 PT BAG). |
| `remaining_stock_onboard`| Number | Opsional | Angka >= 0 (Default: 0) | Sisa persediaan fisik suku cadang yang masih tersisa di atas kapal. |
| `item_notes` | String | Opsional | Text | Keterangan spesifik item (misal: "Untuk Overhaul Auxiliary Engine No. 2"). |

---

## 4. MAPPING FIELD SMS KE FIELD / MODEL WMS

| Field di Payload SMS | Model Target WMS | Field Database / Model WMS | Keterangan Transformasi |
| :--- | :--- | :--- | :--- |
| `external_requisition_no` | `MaterialRequest` | `work_order_ref` / `notes` | Disimpan sebagai referensi eksternal, auto-generate `request_number` resmi WMS (format `MR-YYYY-XXXXXX`). |
| `vessel_name` | `MaterialRequest` | `vessel_name` | Dicocokkan dengan tabel `vessels.name`. Jika tidak cocok, status masuk antrean validasi. |
| `request_date` | `MaterialRequest` | `request_date` | Dipetakan langsung sebagai tanggal pengajuan TUG. |
| `requester_name` | `MaterialRequest` | `requester_name` & `requested_by` | Nama pemohon di formulir TUG. |
| `department` | `MaterialRequest` | `department` | Unit departemen kapal. |
| `urgency` | `MaterialRequest` | `urgency` | Tingkat urgensi permintaan. |
| `destination_port` | `MaterialRequest` | `destination_port` & `delivery_address` | Alamat/dermaga distribusi logistik. |
| `remarks` | `MaterialRequest` | `remarks` | Catatan dokumen TUG. |
| `tug_type` | `MaterialRequest` | `tug_type` (`TUG5` / `TUG6`) | Menentukan apakah masuk ke menu TUG 5 atau TUG 6. |
| `items[].part_number` | `MaterialRequestItem` | `part_number` | Dicocokkan ke `spare_parts.part_number` untuk mengambil `spare_part_id` dan lokasi rak gudang. |
| `items[].part_name` | `MaterialRequestItem` | `spare_part_name` | Nama barang resmi. |
| `items[].requested_qty` | `MaterialRequestItem` | `requested_qty` | Jumlah diminta. |
| `items[].unit` | `MaterialRequestItem` | `unit` | Satuan barang. |
| `items[].avg_monthly_usage`| `MaterialRequestItem` | `avg_monthly_usage` | Nilai pemakaian bulanan kapal. |
| `items[].remaining_stock_onboard`| `MaterialRequestItem` | `remaining_stock` | Sisa stok kapal. |
| `items[].item_notes` | `MaterialRequestItem` | `notes` | Catatan spesifik per item. |

---

## 5. FLOW PENGIRIMAN DATA DARI SMS SAMPAI DIPROSES WMS

```
[Sistem SMS (Kapal/Darat)]
       │
       │ 1. Event: Requisition disetujui di SMS
       ▼
[HTTP Client SMS]
       │
       │ 2. POST /api/integrations/sms/requisitions (JSON Payload + Auth Token)
       ▼
[WMS API Gateway / Express.js Route]
       │
       ├──> A. Verifikasi Autentikasi (API Key / JWT Bearer) -> Tolak jika tidak valid (401/403)
       ├──> B. Validasi Schema Payload & Cek Idempotency Key -> Tolak jika duplikat/invalid (400)
       ├──> C. Resolusi Master Data:
       │       - Verifikasi nama kapal ke Master Armada (`vessels`)
       │       - Pencocokan suku cadang ke Master Katalog (`spare_parts`)
       │
       ▼
[Penyimpanan Data WMS]
       │
       ├──> Simpan ke tabel `material_requests` (Status: "Submitted" / "Draft")
       ├──> Generate nomor registrasi resmi WMS: MR-2026-XXXXXX / TUG 5 / TUG 6
       └──> Catat log integrasi ke `audit_logs`
       │
       ▼
[Respon HTTP 201 Created ke SMS]
       │ (Mengembalikan WMS Request ID & Nomor Dokumen Resmi)
       ▼
[Workflow Gudang di Web WMS]
       │
       ├──> Notifikasi muncul di Banner "Status TTD Digital Berjenjang"
       ├──> Pejabat WMS melakukan verifikasi TTD 4 Tahap (Aldi -> Alfin -> Emir -> Sumbono)
       ├──> Petugas Gudang memproses pengambilan barang (Picking SPK)
       └──> Penerbitan TUG 8 Dispatch (Stok fisik dipotong saat kargo diberangkatkan)
```

---

## 6. INFORMASI TEKNIS & AUTENTIKASI YANG PERLU DIKONFIRMASI

### Fakta Kondisi Saat Ini di WMS:
- Backend Express (`server.ts`) saat ini mengautentikasi pengguna internal hanya melalui header sederhana `x-user-username`.
- Belum ada skema autentikasi mesin-ke-mesin (*machine-to-machine / API Key*) yang terpasang di endpoint publik.
- CORS disetel untuk konsumsi web internal.

### Hal yang Wajib Dikonfirmasi dengan Pihak Pengembang SMS:

1. **Arah Komunikasi (Inbound vs Outbound):**
   - Apakah SMS yang akan melakukan panggilan `HTTP POST` secara aktif (Push/Webhook) ke server WMS saat data siap?
   - Atau WMS yang diwajibkan melakukan penarikan data secara berkala (Polling/Pull API) ke server SMS? *(Rekomendasi terbaik: Push dari SMS ke WMS).*
2. **Protokol & Keamanan Autentikasi:**
   - Metode autentikasi yang disepakati:
     - Opsi A: `API Key` permanen berbasis Header (misal: `X-API-KEY: secret_token_sms`).
     - Opsi B: `OAuth2 / JWT Bearer Token`.
     - Opsi C: `Basic Authentication` via HTTPS.
     - Opsi D: Pembatasan alamat IP Pengirim (*IP Whitelisting*).
3. **Format & Spesifikasi Payload:**
   - Apakah payload dikirimkan dalam format standar JSON over HTTPS?
4. **Jalur Jaringan (Networking & Hosting):**
   - Apakah server SMS dan WMS berada dalam satu jaringan privat korporat (Intranet PLN Group / VPN internal), atau komunikasi dilakukan melalui internet publik (memerlukan domain publik HTTPS dan Reverse Proxy SSL)?
5. **Kebutuhan Sinkronisasi Dua Arah (Two-Way Status Update):**
   - Apakah sistem SMS memerlukan webhook balasan (callback) saat status di WMS berubah?
     *(Contoh: Mengirim kabar ke SMS bahwa kargo sudah berstatus `Dispatched` beserta Nomor Resi/Surat Jalan dan Driver).*

---

## 7. DAFTAR PERTANYAAN YANG BELUM TERJAWAB (SEBELUM KODING DIMULAI)

Berikut daftar pertanyaan teknis yang memerlukan klarifikasi dan persetujuan dari pemilik project / tim SMS:

| No | Pertanyaan Kritis | Status | Implikasi Teknis |
| :---: | :--- | :---: | :--- |
| 1 | **Apakah dokumentasi API resmi (Swagger / Postman Collection) dari SMS sudah tersedia?** | Belum Diketahui | Menentukan apakah WMS yang menyediakan endpoint penerima (Webhook Receiver) atau WMS yang harus menyesuaikan format SMS. |
| 2 | **Bagaimana SMS mengidentifikasi armada kapal?** (Apakah menggunakan string nama kapal, kode lambung, IMO Number, atau ID internal SMS?) | Belum Diketahui | Jika format penamaan berbeda, perlu dibuat tabel referensi mapping kapal (misal: SMS ID `VSL-01` ➔ WMS `MV. KARTINI BARUNA`). |
| 3 | **Bagaimana jika kapal di SMS meminta suku cadang yang nomor part-nya BELUM ADA di master gudang WMS?** | Belum Diketahui | Apakah WMS harus otomatis membuatkan *Draft Suku Cadang Baru*, atau request ditolak dengan pesan kesalahan agar master part didaftarkan terlebih dahulu? |
| 4 | **Apakah pengiriman data dilakukan per transaksi (real-time) atau per batch harian?** | Belum Diketahui | Mempengaruhi arsitektur endpoint (endpoint single document vs batch import). |
| 5 | **Apakah cakupan integrasi SMS hanya Permintaan Barang (TUG 5/TUG 6), atau mencakup Pengembalian Material (TUG 10)?** | Belum Diketahui | Menentukan cakupan endpoint yang harus disiapkan di WMS. |
| 6 | **Apakah integrasi membutuhkan status balasan (Two-Way Sync)?** | Belum Diketahui | Jika iya, WMS harus memiliki service background untuk menembak webhook balik ke server SMS saat barang selesai dikirim (`Dispatched`). |
| 7 | **Siapa kontak teknis (PIC IT / Vendor SMS) yang ditunjuk untuk pengujian sandbox/staging?** | Belum Diketahui | Diperlukan untuk koordinasi handshake, uji coba payload dummy, dan pengetesan error handling. |

---

## 8. KESIMPULAN & REKOMENDASI TAHAP BERIKUTNYA

1. **Kesiapan Struktur Database WMS:**
   Struktur database dan model data WMS (`material_requests`, `material_request_items`, `vessels`, `spare_parts`) **sudah sangat siap dan kompatibel** untuk menampung data dari SMS tanpa perlu merombak skema database utama.
2. **Langkah yang Disarankan Setelah Analisis Disetujui:**
   - Menunggu konfirmasi jawaban atas 7 pertanyaan pada Bagian 7.
   - Merancang endpoint khusus integrasi (misalnya `POST /api/integrations/sms/material-requests`) dengan proteksi API Key tanpa mengganggu alur otentikasi internal aplikasi web yang sudah berjalan.
   - Melakukan pengetesan payload simulasi via Postman/cURL sebelum menghubungkan frontend.

---
*Laporan ini disimpan di `docs/ANALISIS_PERSIAPAN_INTEGRASI_API_SMS.md` sebagai dokumen referensi resmi.*
