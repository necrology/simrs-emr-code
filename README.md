# SIMRS

Frontend Nuxt untuk API SIMRS. Navigasi area Rawat Darurat, Rawat Jalan, Rawat Inap, dan Master Data dibentuk dari izin legacy milik user yang sedang login.

## Setup

```powershell
bun install
Copy-Item .env.example .env
bun run dev
```

## Verifikasi

```powershell
bun run lint
bun run typecheck
bun run test
bun run build
```

Frontend tidak boleh mengakses PostgreSQL atau URL CodeIgniter secara langsung. Semua akses data melewati proxy server Nuxt menuju Laravel API.

Halaman `/simrs` menampilkan katalog modul ExtJS sesuai gabungan privilege grup
pengguna, lengkap dengan jalur start menu, method yang diizinkan, dan status
migrasi. Sidebar hanya menampilkan modul hasil migrasi yang memang diizinkan;
placeholder Farmasi/Laboratorium/Radiologi lama tidak lagi dipasang statis.

Halaman `/online-queues` memonitor APM dan Antrean Online BPJS secara read-only,
termasuk task 1-7/99, check-in, kuota, antrean admisi/poli/farmasi, serta status
API. Halaman ini tidak mengirim registrasi, SEP, check-in, atau update task BPJS.

Halaman `/registrations/new` menyediakan wizard registrasi pasien existing untuk
Rawat Jalan dan IGD. Pilihan poli, dokter, cara bayar, penjamin, serta master
pendukung berasal dari endpoint schema Laravel; Rawat Inap tetap memakai alur
admisi/bed management terpisah. Wizard memfilter penjamin per cara bayar,
mewajibkan triase/cara datang untuk IGD, dan memakai kunci idempotensi agar klik
atau retry ganda tidak membuat registrasi kedua.
