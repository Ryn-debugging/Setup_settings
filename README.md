# RakitPC.id — Platform Simulasi & Perencanaan Kustomisasi PC

**RakitPC.id** adalah aplikasi web berbasis simulasi dan perencanaan perakitan komputer (PC) kustom yang memungkinkan pengguna memilih komponen perangkat keras secara bebas sesuai anggaran dan kebutuhan. Sistem dilengkapi mesin validasi kompatibilitas otomatis, analisis potensi *bottleneck*, kalkulator estimasi daya, rekomendasi rakitan otomatis (*Auto-Build by Budget*), serta fitur ekspor spesifikasi ke format gambar (**PNG Build Card**), dokumen (**PDF Formal**), dan tautan berbagi (**Shareable Link**).

---

## Fitur Utama

1. **Workspace Simulasi Perakitan (`/builder`)**:
   - Pemilihan 8 kategori komponen utama: **CPU**, **Motherboard**, **RAM** (mendukung multi-kit), **GPU**, **Storage** (mendukung multi-slot SSD/HDD), **PSU**, **Casing**, dan **CPU Cooler**.
   - **Smart Filter**: Otomatis memfilter komponen yang kompatibel dengan komponen yang sudah dipilih (dengan opsi *toggle* "Tampilkan Semua").
   - **Real-Time Summary Bar & Mobile Sticky Bottom Bar**: Menampilkan total estimasi harga (IDR), estimasi daya (Watt), dan indikator status kompatibilitas (*Aman / Peringatan / Konflik*).

2. **Mesin Validasi Kompatibilitas (`src/lib/compatibility.ts`)**:
   - **CPU ↔ Motherboard**: Pengecekan tipe *socket* (`AM4`, `AM5`, `LGA1700`, `LGA1851`) dan catatan *chipset* BIOS.
   - **CPU & Motherboard ↔ RAM**: Pengecekan tipe memori (`DDR4` vs `DDR5`), jumlah keping RAM terhadap slot DIMM Motherboard, dan kapasitas maksimal.
   - **GPU & CPU Cooler ↔ Casing**: Pengecekan dimensi fisik milimeter (`gpu_length_mm ≤ case_max_gpu_mm`, `cooler_height_mm ≤ case_max_cooler_mm`, ukuran radiator AIO, dan *form factor* `ATX` / `Micro-ATX` / `Mini-ITX`).
   - **Total Daya ↔ PSU**: Menghitung total TDP sistem ditambah margin keamanan 25–30% serta membandingkannya dengan kapasitas Watt PSU.

3. **Analisis Skor Bottleneck & Rekomendasi Otomatis (`src/lib/bottleneck.ts` & `src/lib/auto-builder.ts`)**:
   - **Kalkulator Skor Bottleneck**: Simulasi keseimbangan performa CPU vs GPU (skala 1–100) pada skenario **1080p Gaming**, **1440p Gaming**, **4K Gaming**, dan **Produktivitas / Workstation**.
   - **Generator Rakitan Otomatis (*Auto-Build by Budget*)**: Menyusun kombinasi komponen paling optimal dan 100% kompatibel berdasarkan target anggaran (IDR) dan kategori kebutuhan (*Gaming*, *Editing / Rendering*, *Office / Coding*).

4. **Simpan, Ekspor & Bagikan (`src/lib/export-utils.ts`)**:
   - **Export to PNG (Build Card)**: Mengunduh kartu gambar ringkasan spesifikasi beresolusi tinggi via `html-to-image`.
   - **Export to PDF**: Mengunduh dokumen spesifikasi formal lengkap dengan tabel harga, daya, dan catatan kompatibilitas via `jsPDF`.
   - **Shareable Link (`/build/[slug]`)**: Menyimpan rakitan ke database dan menghasilkan tautan publik dengan fitur **"Clone & Edit Rakitan Ini"**.

5. **Dashboard Admin & Kurator Data (`/admin/login` & `/admin/dashboard`)**:
   - **CRUD Komponen Manual**: Form input dan edit komponen lengkap dengan atribut JSONB `specs` per kategori, unggah foto, dan *preview* skor performa.
   - **Bulk Import (CSV)**: Unggah file `.csv` dengan validasi kolom otomatis dan *template* CSV siap pakai.
   - **Update Harga Massal**: Pembaruan harga pasar banyak komponen sekaligus (inline maupun penyesuaian persentase kurs).

---

## Arsitektur & Struktur Proyek

- `src/types/pc.ts` — Definisi TypeScript untuk komponen, `specs` JSONB, laporan kompatibilitas, analisis bottleneck, dan rakitan tersimpan.
- `src/lib/compatibility.ts` — Mesin Validasi Kompatibilitas & Smart Filter.
- `src/lib/bottleneck.ts` — Kalkulator Skor Bottleneck multi-skenario.
- `src/lib/auto-builder.ts` — Mesin Generator Rakitan Otomatis berbasis alokasi anggaran.
- `src/lib/db.ts` & `src/lib/supabase.ts` — Lapisan persistensi hibrida (Supabase PostgreSQL + fallback database lokal persisten `data/local-db.json`).
- `supabase/migrations/001_initial_schema.sql` & `supabase/seed.sql` — Skema tabel PostgreSQL (`components`, `saved_builds`, `build_items`) dan kebijakan *Row Level Security* (RLS).

---

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

Untuk menjalankan pengujian mesin validasi kompatibilitas, bottleneck, dan auto-builder:

```bash
npx tsx tests/engines.test.ts
```
