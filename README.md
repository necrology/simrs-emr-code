# SIMRS EMR Web

Frontend Nuxt untuk API SIMRS EMR Laravel. Navigasi area Rawat Darurat, Rawat Jalan, Rawat Inap, dan Master Data dibentuk dari izin legacy milik user yang sedang login.

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

Halaman `/registrations/new` menyediakan wizard registrasi pasien existing untuk
Rawat Jalan dan IGD. Pilihan poli, dokter, cara bayar, penjamin, serta master
pendukung berasal dari endpoint schema Laravel; Rawat Inap tetap memakai alur
admisi/bed management terpisah. Wizard memfilter penjamin per cara bayar,
mewajibkan triase/cara datang untuk IGD, dan memakai kunci idempotensi agar klik
atau retry ganda tidak membuat registrasi kedua.
