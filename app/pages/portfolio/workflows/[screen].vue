<script setup lang="ts">
definePageMeta({
  layout: false,
  public: true,
})

type WorkflowScreen = 'operations' | 'registration' | 'assessment' | 'diagnosis' | 'prescription' | 'orders' | 'discharge'

const route = useRoute()
const validScreens: WorkflowScreen[] = [
  'operations',
  'registration',
  'assessment',
  'diagnosis',
  'prescription',
  'orders',
  'discharge',
]

const screen = computed<WorkflowScreen>(() => {
  const value = String(route.params.screen ?? '') as WorkflowScreen
  return validScreens.includes(value) ? value : 'operations'
})

const navigation = [
  { group: 'Operasional', items: [
    { screen: 'operations', mark: 'OP', label: 'Alur layanan' },
    { screen: 'registration', mark: 'RG', label: 'Registrasi' },
  ] },
  { group: 'Dokumentasi klinis', items: [
    { screen: 'assessment', mark: 'AS', label: 'Asesmen & CPPT' },
    { screen: 'diagnosis', mark: 'DX', label: 'Diagnosis & tindakan' },
    { screen: 'prescription', mark: 'RX', label: 'Resep obat' },
    { screen: 'orders', mark: 'PN', label: 'Penunjang' },
  ] },
  { group: 'Finalisasi', items: [
    { screen: 'discharge', mark: 'RP', label: 'Resume & pulang' },
  ] },
] as const

const labels: Record<WorkflowScreen, string> = {
  operations: 'Konsep alur layanan',
  registration: 'Registrasi pasien',
  assessment: 'Asesmen dan CPPT',
  diagnosis: 'Diagnosis dan tindakan',
  prescription: 'Peresepan obat',
  orders: 'Order dan hasil penunjang',
  discharge: 'Resume medis dan pemulangan',
}

const serviceSteps = [
  { number: '01', label: 'Identifikasi', detail: 'Pasien dan penjamin', state: 'done' },
  { number: '02', label: 'Registrasi', detail: 'Unit, dokter, jadwal', state: 'done' },
  { number: '03', label: 'Asesmen', detail: 'Keluhan dan tanda vital', state: 'active' },
  { number: '04', label: 'Rencana klinis', detail: 'Diagnosis, tindakan, order', state: '' },
  { number: '05', label: 'Finalisasi', detail: 'Resume dan tindak lanjut', state: '' },
]

const recentEncounters = [
  ['REG-DEMO-0142', 'Pasien Contoh A', 'Poli Penyakit Dalam', 'Simulasi · menunggu asesmen'],
  ['REG-DEMO-0141', 'Pasien Contoh B', 'Instalasi Gawat Darurat', 'Simulasi · dalam pelayanan'],
  ['REG-DEMO-0140', 'Pasien Contoh C', 'Poli Saraf', 'Simulasi · selesai'],
]

useHead({ title: () => labels[screen.value] })
</script>

<template>
  <div class="workflow-shell">
    <aside class="workflow-sidebar">
      <div class="workflow-title">
        <span class="workflow-symbol">WF</span>
        <span>Workflow Pelayanan</span>
      </div>
      <template v-for="section in navigation" :key="section.group">
        <div class="workflow-group">{{ section.group }}</div>
        <NuxtLink
          v-for="item in section.items"
          :key="item.screen"
          :to="`/portfolio/workflows/${item.screen}`"
          class="workflow-link"
          :class="{ active: screen === item.screen }"
        >
          <span>{{ item.mark }}</span>{{ item.label }}
        </NuxtLink>
      </template>
      <div class="demo-note">
        <strong>Mode portofolio</strong>
        <span>Data, status, hasil, dan aksi pada layar ini adalah simulasi offline.</span>
      </div>
    </aside>

    <div class="workflow-main">
      <header class="workflow-topbar">
        <div>
          <small>WORKFLOW KLINIS</small>
          <strong>{{ labels[screen] }}</strong>
        </div>
        <div class="top-context">
          <span class="role-chip">OFFLINE · DATA SINTETIS</span>
          <span class="role-chip">Petugas Demo</span>
        </div>
      </header>

      <main class="workflow-content">
        <template v-if="screen === 'operations'">
          <div class="page-heading">
            <div><h1>Perjalanan pasien hari ini</h1><p>Pantau perpindahan konteks dari registrasi sampai finalisasi pelayanan.</p></div>
            <button class="primary-action">Pratinjau registrasi</button>
          </div>
          <section class="metric-row">
            <article><span>Contoh registrasi aktif</span><strong>128</strong><small>Simulasi rawat jalan dan IGD</small></article>
            <article><span>Contoh menunggu asesmen</span><strong>24</strong><small>Simulasi prioritas layanan</small></article>
            <article><span>Contoh dalam pelayanan</span><strong>39</strong><small>Simulasi lintas unit</small></article>
            <article><span>Contoh siap finalisasi</span><strong>17</strong><small>Simulasi kelengkapan resume</small></article>
          </section>
          <section class="workflow-panel flow-panel">
            <div class="panel-heading"><div><strong>Alur encounter terpilih</strong><span>REG-DEMO-0142 · Rawat jalan</span></div><span class="status-chip active">Simulasi · asesmen</span></div>
            <div class="service-flow">
              <article v-for="step in serviceSteps" :key="step.number" :class="step.state">
                <b>{{ step.number }}</b><strong>{{ step.label }}</strong><span>{{ step.detail }}</span>
              </article>
            </div>
          </section>
          <section class="workflow-panel">
            <div class="panel-heading"><div><strong>Contoh encounter</strong><span>Urutan sintetis untuk memperlihatkan perubahan state</span></div><button class="secondary-action">Lihat contoh</button></div>
            <table class="workflow-table"><thead><tr><th>Registrasi</th><th>Pasien</th><th>Unit layanan</th><th>Status</th></tr></thead><tbody><tr v-for="row in recentEncounters" :key="row[0]"><td><b>{{ row[0] }}</b></td><td>{{ row[1] }}</td><td>{{ row[2] }}</td><td><span class="status-chip">{{ row[3] }}</span></td></tr></tbody></table>
          </section>
        </template>

        <template v-else-if="screen === 'registration'">
          <div class="page-heading"><div><h1>Registrasi pasien</h1><p>Pilih pasien lama atau pasien baru sebelum menentukan layanan.</p></div><div class="action-line"><button class="secondary-action">Pasien lama</button><button class="primary-action">Pasien baru · contoh</button></div></div>
          <div class="registration-steps"><span class="done"><b>1</b>Identitas</span><span class="done"><b>2</b>Layanan</span><span class="active"><b>3</b>Pembayaran</span><span><b>4</b>Verifikasi</span></div>
          <div class="two-column registration-layout">
            <section class="workflow-panel">
              <div class="panel-heading"><div><strong>Identitas pasien</strong><span>Pada implementasi, nomor rekam medis dibuat setelah validasi</span></div><span class="status-chip success">Contoh hasil deduplikasi</span></div>
              <div class="form-layout compact-form">
                <label class="wide"><span>Nama lengkap *</span><input value="Pasien Contoh" readonly></label>
                <label><span>Jenis kelamin *</span><select><option>Perempuan</option></select></label>
                <label><span>Tanggal lahir *</span><input value="1990-08-17" readonly></label>
                <label><span>Tempat lahir</span><input value="Bandung" readonly></label>
                <label><span>NIK</span><input value="NIK-DEMO-0001" readonly></label>
                <label class="wide"><span>Alamat *</span><textarea readonly>Alamat sintetis untuk kebutuhan demonstrasi workflow.</textarea></label>
              </div>
            </section>
            <div class="stacked-panels">
              <section class="workflow-panel">
                <div class="panel-heading"><div><strong>Tujuan layanan</strong><span>Rawat jalan</span></div></div>
                <dl class="review-list"><dt>Unit</dt><dd>Poli Penyakit Dalam</dd><dt>Dokter</dt><dd>Dokter Contoh, Sp.PD</dd><dt>Waktu</dt><dd>19 Juli 2026 · 09:30 (simulasi)</dd><dt>Jenis kunjungan</dt><dd>Kunjungan baru</dd></dl>
              </section>
              <section class="workflow-panel">
                <div class="panel-heading"><div><strong>Penjamin</strong><span>Validasi administratif</span></div></div>
                <div class="form-layout compact-form single"><label><span>Cara pembayaran</span><select><option>Jaminan kesehatan</option></select></label><label><span>Penjamin</span><select><option>Penjamin contoh</option></select></label><label><span>Nomor kepesertaan</span><input value="MEMBER-DEMO-01" readonly></label></div>
                <div class="action-line"><button class="secondary-action">Kembali</button><button class="primary-action">Pratinjau verifikasi</button></div>
              </section>
            </div>
          </div>
        </template>

        <template v-else-if="screen === 'assessment'">
          <div class="patient-banner"><span class="patient-avatar">PC</span><div><strong>Pasien Contoh · 35 tahun</strong><span>RM-DEMO-001 · REG-DEMO-0142 · Poli Penyakit Dalam</span></div><span class="status-chip active">Simulasi · encounter aktif</span></div>
          <div class="page-heading clinical-heading"><div><h1>Asesmen awal dan CPPT</h1><p>Catatan terstruktur mengikuti encounter dan profesi petugas.</p></div><div class="action-line"><button class="secondary-action">Pratinjau draf</button><button class="primary-action">Pratinjau finalisasi</button></div></div>
          <div class="clinical-columns">
            <section class="workflow-panel assessment-form">
              <div class="panel-heading"><div><strong>Catatan perkembangan</strong><span>19 Juli 2026 · 09:42 WIB (simulasi)</span></div><span class="status-chip warning">Simulasi · draf</span></div>
              <div class="form-layout">
                <label class="wide"><span>Subjective *</span><textarea readonly>Keluhan pusing sejak dua hari, terutama ketika berubah posisi. Tidak disertai nyeri dada.</textarea></label>
                <label><span>Objective *</span><textarea readonly>Kondisi umum baik, compos mentis, hemodinamik stabil.</textarea></label>
                <label><span>Assessment *</span><textarea readonly>Observasi vertigo perifer; diagnosis banding tetap dipantau.</textarea></label>
                <label class="wide"><span>Planning *</span><textarea readonly>Terapi simptomatik, edukasi perubahan posisi, evaluasi hasil laboratorium, kontrol tujuh hari.</textarea></label>
              </div>
            </section>
            <div class="stacked-panels">
              <section class="workflow-panel">
                <div class="panel-heading"><div><strong>Tanda vital</strong><span>Pembaruan 09:38 WIB</span></div></div>
                <div class="vital-grid"><article><b>130/85</b><span>Tekanan darah</span></article><article><b>82</b><span>Nadi (kali/menit)</span></article><article><b>36,7°C</b><span>Suhu</span></article><article><b>98%</b><span>SpO₂</span></article></div>
              </section>
              <section class="workflow-panel history-panel"><div class="panel-heading"><div><strong>Riwayat CPPT</strong><span>Kolaborasi antarprofesi</span></div></div><div class="timeline-item"><b>09:15</b><div><strong>Perawat</strong><span>Triase dan tanda vital selesai.</span></div></div><div class="timeline-item current"><b>09:42</b><div><strong>Dokter</strong><span>Asesmen dalam penyusunan.</span></div></div></section>
            </div>
          </div>
        </template>

        <template v-else-if="screen === 'diagnosis'">
          <div class="patient-banner"><span class="patient-avatar">PC</span><div><strong>Pasien Contoh · RM-DEMO-001</strong><span>REG-DEMO-0142 · Simulasi asesmen difinalisasi</span></div><span class="status-chip success">Simulasi · konteks siap</span></div>
          <div class="page-heading clinical-heading"><div><h1>Diagnosis dan tindakan</h1><p>Pilih terminologi klinis, tentukan prioritas, lalu kaitkan tindakan ke encounter.</p></div><button class="primary-action">Pratinjau simpan</button></div>
          <div class="two-column balanced">
            <section class="workflow-panel">
              <div class="panel-heading"><div><strong>Diagnosis ICD-10</strong><span>Diagnosis utama dan penyerta</span></div></div>
              <div class="lookup-box"><label><span>Cari kode atau istilah diagnosis</span><div><input value="vertigo" readonly><button class="secondary-action">Cari contoh</button></div></label><div class="lookup-result"><span><b>H81.1</b> Benign paroxysmal vertigo</span><button>+ Contoh</button></div><div class="lookup-result"><span><b>R42</b> Dizziness and giddiness</span><button>+ Contoh</button></div></div>
              <table class="workflow-table compact"><thead><tr><th>Kode</th><th>Diagnosis terpilih</th><th>Jenis</th></tr></thead><tbody><tr><td><b>H81.1</b></td><td>Benign paroxysmal vertigo</td><td><span class="status-chip active">Utama</span></td></tr><tr><td><b>R42</b></td><td>Dizziness and giddiness</td><td><span class="status-chip">Sekunder</span></td></tr></tbody></table>
            </section>
            <section class="workflow-panel">
              <div class="panel-heading"><div><strong>Rencana tindakan</strong><span>Tindakan medis dan edukasi</span></div></div>
              <div class="form-layout compact-form single"><label><span>Tindakan</span><select><option>Manuver reposisi kanalit</option></select></label><label><span>Pelaksana</span><select><option>Dokter Contoh</option></select></label><label><span>Catatan tindakan</span><textarea readonly>Dilakukan setelah penilaian kontraindikasi dan persetujuan pasien.</textarea></label></div>
              <div class="procedure-list"><article><span class="procedure-icon">01</span><div><strong>Edukasi perubahan posisi</strong><small>Contoh rencana · Dokter</small></div><span class="status-chip warning">Simulasi · belum</span></article><article><span class="procedure-icon">02</span><div><strong>Manuver reposisi</strong><small>19 Juli · 10:05 (simulasi)</small></div><span class="status-chip success">Simulasi · selesai</span></article></div>
            </section>
          </div>
        </template>

        <template v-else-if="screen === 'prescription'">
          <div class="patient-banner"><span class="patient-avatar">PC</span><div><strong>Pasien Contoh · RM-DEMO-001</strong><span>Berat 58 kg · eGFR tidak tersedia</span></div><span class="allergy-alert">Alergi: belum terkonfirmasi</span></div>
          <div class="page-heading clinical-heading"><div><h1>Peresepan obat</h1><p>Rancang obat, dosis, aturan pakai, dan jumlah sebelum handoff farmasi.</p></div><button class="primary-action">Pratinjau kirim</button></div>
          <div class="prescription-grid">
            <section class="workflow-panel">
              <div class="panel-heading"><div><strong>Tambah item resep</strong><span>Resep rawat jalan</span></div></div>
              <div class="form-layout compact-form"><label class="wide"><span>Obat *</span><div class="input-with-tag"><input value="Betahistine tablet 6 mg" readonly><span>Formularium (contoh)</span></div></label><label><span>Dosis</span><input value="6 mg" readonly></label><label><span>Frekuensi</span><select><option>3 kali sehari</option></select></label><label><span>Rute</span><select><option>Oral</option></select></label><label><span>Durasi</span><input value="7 hari" readonly></label><label><span>Jumlah</span><input value="21 tablet" readonly></label><label><span>Aturan pakai</span><select><option>Sesudah makan</option></select></label><label class="wide"><span>Catatan</span><input value="Hentikan dan hubungi fasilitas kesehatan bila muncul reaksi alergi." readonly></label></div>
              <div class="action-line"><button class="secondary-action">Reset contoh</button><button class="primary-action">+ Tambah simulasi</button></div>
            </section>
            <section class="workflow-panel prescription-list">
              <div class="panel-heading"><div><strong>R/ DEMO-0142</strong><span>2 item contoh · belum dikirim</span></div><span class="status-chip warning">Simulasi · draf</span></div>
              <article><div><b>1</b><strong>Betahistine 6 mg</strong><span>3 × 1 · oral · sesudah makan · 7 hari</span></div><small>Jumlah 21 tablet</small></article>
              <article><div><b>2</b><strong>Vitamin B kompleks</strong><span>1 × 1 · oral · sesudah makan · 14 hari</span></div><small>Jumlah 14 tablet</small></article>
              <div class="safety-check"><strong>Contoh pemeriksaan keselamatan · belum terhubung</strong><span>Simulasi: tidak ada duplikasi pada daftar contoh</span><span>Verifikasi dosis belum diimplementasikan</span><span>Status alergi belum dikonfirmasi</span></div>
            </section>
          </div>
        </template>

        <template v-else-if="screen === 'orders'">
          <div class="patient-banner"><span class="patient-avatar">PC</span><div><strong>Pasien Contoh · RM-DEMO-001</strong><span>REG-DEMO-0142 · Diagnosis contoh H81.1</span></div><span class="status-chip active">Simulasi · rencana klinis</span></div>
          <div class="page-heading clinical-heading"><div><h1>Order dan hasil penunjang</h1><p>Permintaan pemeriksaan, status pengerjaan, dan hasil kembali pada encounter yang sama.</p></div><button class="primary-action">Pratinjau order</button></div>
          <div class="orders-layout">
            <section class="workflow-panel order-builder">
              <div class="panel-heading"><div><strong>Permintaan pemeriksaan</strong><span>Pilih layanan penunjang</span></div></div>
              <div class="order-type"><button class="active">Laboratorium</button><button>Radiologi</button></div>
              <div class="check-grid"><label><input type="checkbox" checked> Darah lengkap</label><label><input type="checkbox" checked> Gula darah sewaktu</label><label><input type="checkbox"> Elektrolit</label><label><input type="checkbox"> Fungsi ginjal</label></div>
              <div class="form-layout compact-form single"><label><span>Prioritas</span><select><option>Rutin</option></select></label><label><span>Diagnosis / indikasi</span><textarea readonly>Pusing berulang; evaluasi kondisi sistemik.</textarea></label><label><span>Catatan untuk unit penunjang</span><input value="Mohon hasil terverifikasi sebelum pasien pulang." readonly></label></div>
            </section>
            <section class="workflow-panel result-tracker">
              <div class="panel-heading"><div><strong>Status order (simulasi)</strong><span>ORD-DEMO-0931 · contoh hasil, bukan dari LIS/RIS</span></div><span class="status-chip active">Simulasi · sebagian</span></div>
              <div class="result-progress"><span class="done">Diminta<small>09:50</small></span><span class="done">Sampel<small>10:04</small></span><span class="active">Verifikasi<small>10:42</small></span><span>Final<small>—</small></span></div>
              <table class="workflow-table compact"><thead><tr><th>Pemeriksaan</th><th>Hasil contoh</th><th>Nilai rujukan contoh</th><th>Status</th></tr></thead><tbody><tr><td>Hemoglobin</td><td><b>13,2 g/dL</b></td><td>12,0–15,0 g/dL</td><td><span class="status-chip success">Simulasi · final</span></td></tr><tr><td>Leukosit</td><td><b>7.800 /µL</b></td><td>4.000–10.000 /µL</td><td><span class="status-chip success">Simulasi · final</span></td></tr><tr><td>Gula darah</td><td>Dalam proses</td><td>70–140 mg/dL</td><td><span class="status-chip warning">Simulasi · proses</span></td></tr></tbody></table>
              <div class="radiology-result"><span>RD</span><div><strong>CT Kepala tanpa kontras</strong><small>Order radiologi · belum dijadwalkan</small></div><button class="secondary-action">Lihat detail</button></div>
            </section>
          </div>
        </template>

        <template v-else-if="screen === 'discharge'">
          <div class="patient-banner"><span class="patient-avatar">PC</span><div><strong>Pasien Contoh · RM-DEMO-001</strong><span>REG-DEMO-0142 · Durasi simulasi 2 jam 18 menit</span></div><span class="status-chip warning">Simulasi · menunggu finalisasi</span></div>
          <div class="page-heading clinical-heading"><div><h1>Resume medis dan pemulangan</h1><p>Rangkum hasil pelayanan, obat pulang, edukasi, dan rencana tindak lanjut.</p></div><button class="primary-action">Pratinjau finalisasi</button></div>
          <div class="discharge-layout">
            <section class="workflow-panel discharge-form">
              <div class="panel-heading"><div><strong>Ringkasan pelayanan</strong><span>Contoh ringkasan yang pada implementasi ditarik dari catatan terfinalisasi</span></div></div>
              <div class="form-layout compact-form"><label class="wide"><span>Alasan kunjungan</span><textarea readonly>Pusing berulang terutama saat berubah posisi.</textarea></label><label class="wide"><span>Ringkasan pemeriksaan dan terapi</span><textarea readonly>Kondisi umum stabil. Pemeriksaan fisik dan laboratorium dasar tanpa temuan kegawatan. Diberikan terapi simptomatik serta edukasi.</textarea></label><label><span>Diagnosis utama</span><input value="H81.1 · Benign paroxysmal vertigo" readonly></label><label><span>Kondisi pulang</span><select><option>Membaik</option></select></label><label class="wide"><span>Instruksi tindak lanjut</span><textarea readonly>Kontrol tujuh hari atau kembali lebih cepat bila keluhan memberat, gangguan bicara, kelemahan anggota gerak, atau penurunan kesadaran.</textarea></label></div>
            </section>
            <div class="stacked-panels discharge-side">
              <section class="workflow-panel"><div class="panel-heading"><div><strong>Checklist finalisasi</strong><span>Simulasi · 6 dari 7 lengkap</span></div></div><ul class="final-check"><li class="done">Asesmen awal</li><li class="done">Diagnosis utama</li><li class="done">Tindakan</li><li class="done">Hasil penunjang</li><li class="done">Resep pulang</li><li class="done">Edukasi pasien</li><li class="pending">Tanda tangan klinisi</li></ul></section>
              <section class="workflow-panel"><div class="panel-heading"><div><strong>Rencana kontrol</strong><span>Rawat jalan</span></div></div><dl class="review-list"><dt>Tanggal</dt><dd>26 Juli 2026 (simulasi)</dd><dt>Unit</dt><dd>Poli Penyakit Dalam</dd><dt>Obat pulang</dt><dd>2 item contoh</dd><dt>Dokumen pasien</dt><dd>Resume dan instruksi</dd></dl></section>
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
:global(html), :global(body), :global(#__nuxt) { min-height: 100%; }
:global(body) { margin: 0; background: #eef2f1; color: #182522; font-family: Inter, "Segoe UI", sans-serif; }
* { box-sizing: border-box; }
button, input, select, textarea { font: inherit; }
.workflow-shell { display: grid; min-height: 100vh; grid-template-columns: 224px minmax(0, 1fr); }
.workflow-sidebar { position: fixed; inset: 0 auto 0 0; width: 224px; padding: 0 11px 18px; overflow: hidden; background: #153f36; color: #e8f2ef; }
.workflow-title { height: 64px; display: flex; align-items: center; gap: 10px; margin-inline: -11px; padding: 0 15px; border-bottom: 1px solid #315b52; font-weight: 800; }
.workflow-symbol { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid #74ad9f; border-radius: 7px; font-size: 11px; }
.workflow-group { padding: 18px 9px 6px; color: #91b7ae; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.workflow-link { display: flex; min-height: 40px; align-items: center; gap: 9px; margin: 2px 0; padding: 7px 9px; border-radius: 6px; color: #dbeae6; text-decoration: none; }
.workflow-link > span { display: grid; width: 28px; height: 28px; place-items: center; border: 1px solid #50796f; border-radius: 5px; font-size: 10px; font-weight: 800; }
.workflow-link.active { background: #2b6256; color: #fff; }
.workflow-link.active > span { border-color: #8bc7b8; background: #367568; }
.demo-note { position: absolute; right: 12px; bottom: 18px; left: 12px; display: grid; gap: 3px; padding: 11px; border: 1px solid #426d63; border-radius: 7px; background: #194a40; }
.demo-note strong { font-size: 11px; }.demo-note span { color: #a9c9c1; font-size: 9px; line-height: 1.45; }
.workflow-main { grid-column: 2; min-width: 0; }
.workflow-topbar { position: sticky; z-index: 5; top: 0; height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; border-bottom: 1px solid #d6dfdc; background: #fff; }
.workflow-topbar > div:first-child { display: grid; gap: 1px; }.workflow-topbar small { color: #71807b; font-size: 9px; font-weight: 800; letter-spacing: .1em; }.workflow-topbar strong { font-size: 15px; }
.top-context { display: flex; align-items: center; gap: 8px; color: #61716c; font-size: 11px; }.sync-dot { width: 8px; height: 8px; border-radius: 50%; background: #2d9b76; box-shadow: 0 0 0 3px #dff3eb; }.role-chip { margin-left: 6px; padding: 5px 9px; border: 1px solid #cbd6d3; border-radius: 5px; background: #f7f9f8; color: #31423d; font-weight: 700; }
.workflow-content { max-width: 1440px; margin: 0 auto; padding: 18px 22px 32px; }
.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 14px; }.page-heading h1 { margin: 0; font-size: 22px; line-height: 1.2; }.page-heading p { margin: 4px 0 0; color: #64736e; font-size: 12px; }.clinical-heading { align-items: center; }
.primary-action, .secondary-action { min-height: 34px; padding: 7px 12px; border: 1px solid #aebdb8; border-radius: 5px; background: #fff; color: #2b403a; font-weight: 750; }.primary-action { border-color: #12604f; background: #12604f; color: #fff; }.secondary-action { background: #f9fbfa; }
.metric-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }.metric-row article { display: grid; gap: 2px; padding: 13px 15px; border: 1px solid #d5deda; border-radius: 7px; background: #fff; }.metric-row span { color: #65746f; font-size: 11px; }.metric-row strong { color: #155e4e; font-size: 25px; line-height: 1.1; }.metric-row small { color: #83908c; font-size: 9px; }
.workflow-panel { overflow: hidden; border: 1px solid #d5deda; border-radius: 7px; background: #fff; }.workflow-panel + .workflow-panel { margin-top: 11px; }.panel-heading { min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 13px; border-bottom: 1px solid #e2e8e6; }.panel-heading > div { display: grid; gap: 1px; }.panel-heading strong { font-size: 13px; }.panel-heading span { color: #70807a; font-size: 10px; }
.flow-panel { margin-bottom: 12px; }.service-flow { display: grid; grid-template-columns: repeat(5, 1fr); padding: 15px; }.service-flow article { position: relative; display: grid; gap: 2px; padding: 2px 13px 2px 40px; }.service-flow article:not(:last-child)::after { position: absolute; top: 15px; right: -4px; width: 16px; height: 1px; background: #c9d5d1; content: ''; }.service-flow b { position: absolute; top: 0; left: 0; display: grid; width: 31px; height: 31px; place-items: center; border: 1px solid #cbd6d2; border-radius: 50%; color: #71807b; font-size: 10px; }.service-flow .done b { border-color: #238662; background: #e3f3ed; color: #17664c; }.service-flow .active b { border-color: #17664c; background: #17664c; color: #fff; }.service-flow strong { font-size: 11px; }.service-flow span { color: #74827e; font-size: 9px; }
.workflow-table { width: 100%; border-collapse: collapse; font-size: 11px; }.workflow-table th { padding: 8px 12px; background: #eff3f2; color: #53635e; text-align: left; font-size: 10px; }.workflow-table td { padding: 9px 12px; border-top: 1px solid #e6ebe9; }.workflow-table.compact td, .workflow-table.compact th { padding: 8px 10px; }
.status-chip { display: inline-flex; width: fit-content; padding: 3px 7px; border-radius: 4px; background: #e8edeb; color: #4a5b55 !important; font-size: 9px !important; font-weight: 800; }.status-chip.active { background: #dfeeea; color: #165d4c !important; }.status-chip.success { background: #def2e7; color: #146346 !important; }.status-chip.warning { background: #fff0cf; color: #77540b !important; }
.registration-steps { display: grid; grid-template-columns: repeat(4, 1fr); margin-bottom: 12px; border: 1px solid #d5deda; border-radius: 7px; background: #fff; }.registration-steps span { display: flex; min-height: 48px; align-items: center; gap: 8px; padding: 8px 13px; border-right: 1px solid #e0e6e4; color: #71807b; font-size: 11px; font-weight: 700; }.registration-steps span:last-child { border-right: 0; }.registration-steps b { display: grid; width: 25px; height: 25px; place-items: center; border: 1px solid #bdcac6; border-radius: 50%; font-size: 9px; }.registration-steps .done b { border-color: #2d8b69; background: #e0f2eb; color: #176147; }.registration-steps .active { color: #173f36; }.registration-steps .active b { border-color: #173f36; background: #173f36; color: #fff; }
.two-column, .clinical-columns, .prescription-grid, .orders-layout, .discharge-layout { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(340px, .88fr); gap: 12px; }.two-column.balanced, .prescription-grid, .orders-layout { grid-template-columns: repeat(2, minmax(0, 1fr)); }.stacked-panels { display: grid; align-content: start; gap: 11px; }.stacked-panels > .workflow-panel { margin: 0; }
.form-layout { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 13px; }.form-layout label { display: grid; gap: 4px; }.form-layout label > span, .lookup-box label > span { color: #50615b; font-size: 10px; font-weight: 800; }.form-layout .wide { grid-column: 1 / -1; }.form-layout.single { grid-template-columns: 1fr; }.form-layout input, .form-layout select, .form-layout textarea, .lookup-box input { width: 100%; min-height: 34px; padding: 7px 9px; border: 1px solid #bdc9c5; border-radius: 5px; background: #fff; color: #273732; }.form-layout textarea { min-height: 62px; resize: none; }.compact-form { gap: 8px; }.compact-form textarea { min-height: 52px; }.action-line { display: flex; align-items: center; justify-content: flex-end; gap: 7px; padding: 0 13px 13px; }
.review-list { display: grid; grid-template-columns: 118px 1fr; margin: 0; padding: 9px 13px 12px; }.review-list dt, .review-list dd { margin: 0; padding: 7px 0; border-bottom: 1px solid #edf0ef; font-size: 10px; }.review-list dt { color: #73817d; }.review-list dd { font-weight: 700; }
.patient-banner { display: flex; min-height: 61px; align-items: center; gap: 11px; margin-bottom: 12px; padding: 9px 13px; border: 1px solid #bcd5cd; border-radius: 7px; background: #eaf5f1; }.patient-avatar { display: grid; width: 39px; height: 39px; place-items: center; border-radius: 8px; background: #176250; color: #fff; font-weight: 800; }.patient-banner > div { display: grid; flex: 1; gap: 2px; }.patient-banner strong { font-size: 13px; }.patient-banner div span { color: #5d716a; font-size: 10px; }
.assessment-form textarea { min-height: 76px; }.vital-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 12px; }.vital-grid article { display: grid; gap: 2px; padding: 10px; border: 1px solid #dde5e2; border-radius: 6px; background: #f8faf9; }.vital-grid b { color: #155e4e; font-size: 19px; }.vital-grid span { color: #6b7975; font-size: 9px; }.timeline-item { display: flex; gap: 10px; margin: 0 12px; padding: 10px 2px; border-bottom: 1px solid #e6ebe9; }.timeline-item > b { color: #537069; font-size: 10px; }.timeline-item > div { display: grid; gap: 1px; }.timeline-item strong { font-size: 10px; }.timeline-item span { color: #71807b; font-size: 9px; }.timeline-item.current { border-left: 3px solid #218267; padding-left: 8px; }
.lookup-box { display: grid; gap: 7px; padding: 12px; }.lookup-box label { display: grid; gap: 4px; }.lookup-box label > div { display: grid; grid-template-columns: 1fr auto; gap: 6px; }.lookup-result { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 9px; border: 1px solid #dce4e1; border-radius: 5px; background: #f8faf9; font-size: 10px; }.lookup-result button { border: 0; background: transparent; color: #12604f; font-weight: 800; }.procedure-list { display: grid; gap: 7px; padding: 0 12px 12px; }.procedure-list article { display: flex; align-items: center; gap: 9px; padding: 9px; border: 1px solid #e0e6e4; border-radius: 6px; }.procedure-icon { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 5px; background: #e5f2ee; color: #176250; font-size: 9px; font-weight: 800; }.procedure-list article > div { display: grid; flex: 1; gap: 1px; }.procedure-list strong { font-size: 10px; }.procedure-list small { color: #71807b; font-size: 9px; }
.allergy-alert { padding: 6px 9px; border: 1px solid #e2b8a0; border-radius: 5px; background: #fff0e8; color: #8a3f22; font-size: 10px; font-weight: 800; }.input-with-tag { position: relative; }.input-with-tag span { position: absolute; top: 7px; right: 7px; padding: 2px 5px; border-radius: 3px; background: #dff1ea; color: #176147; font-size: 8px; font-weight: 800; }.prescription-list article { padding: 11px 13px; border-bottom: 1px solid #e5eae8; }.prescription-list article > div { display: grid; grid-template-columns: 24px 1fr; gap: 2px 7px; }.prescription-list article b { grid-row: 1 / 3; display: grid; width: 22px; height: 22px; place-items: center; border-radius: 5px; background: #e1f1eb; color: #176250; font-size: 9px; }.prescription-list article strong { font-size: 11px; }.prescription-list article span, .prescription-list article small { color: #6f7d78; font-size: 9px; }.prescription-list article > small { display: block; margin: 5px 0 0 31px; }.safety-check { display: grid; gap: 4px; margin: 11px; padding: 10px; border: 1px solid #d6e3df; border-radius: 6px; background: #f3f8f6; font-size: 9px; }.safety-check strong { margin-bottom: 2px; font-size: 10px; }
.order-type { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; padding: 11px 12px 0; }.order-type button { min-height: 32px; border: 1px solid #bdc9c5; border-radius: 5px; background: #fff; color: #53645e; font-weight: 700; }.order-type .active { border-color: #176250; background: #e3f1ed; color: #176250; }.check-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 10px 12px 0; }.check-grid label { display: flex; align-items: center; gap: 7px; padding: 8px; border: 1px solid #dce4e1; border-radius: 5px; font-size: 10px; }.check-grid input { accent-color: #176250; }.result-progress { display: grid; grid-template-columns: repeat(4, 1fr); padding: 13px 12px; }.result-progress span { position: relative; display: grid; gap: 2px; padding-top: 19px; color: #75837f; text-align: center; font-size: 9px; }.result-progress span::before { position: absolute; z-index: 1; top: 2px; left: 50%; width: 12px; height: 12px; border: 2px solid #bdc9c5; border-radius: 50%; background: #fff; content: ''; }.result-progress span:not(:last-child)::after { position: absolute; top: 8px; left: calc(50% + 7px); width: calc(100% - 13px); height: 2px; background: #d1d9d6; content: ''; }.result-progress .done::before, .result-progress .active::before { border-color: #238361; background: #238361; }.result-progress .active { color: #175c4b; font-weight: 800; }.result-progress small { font-size: 8px; }.radiology-result { display: flex; align-items: center; gap: 9px; margin: 12px; padding: 9px; border: 1px solid #dde5e2; border-radius: 6px; }.radiology-result > span { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 5px; background: #e7eef5; color: #355f88; font-size: 9px; font-weight: 800; }.radiology-result > div { display: grid; flex: 1; gap: 1px; }.radiology-result strong { font-size: 10px; }.radiology-result small { color: #74827e; font-size: 9px; }
.discharge-form textarea { min-height: 65px; }.final-check { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin: 0; padding: 8px 12px 12px; list-style: none; }.final-check li { position: relative; padding: 8px 6px 8px 23px; border-bottom: 1px solid #edf0ef; color: #566660; font-size: 10px; }.final-check li::before { position: absolute; top: 7px; left: 2px; display: grid; width: 14px; height: 14px; place-items: center; border: 1px solid #bdc9c5; border-radius: 50%; content: '·'; }.final-check .done::before { border-color: #238361; background: #e2f2ec; color: #176147; content: '✓'; }.final-check .pending { color: #8b5c13; }.final-check .pending::before { border-color: #d4aa64; background: #fff1d8; content: '!'; }
@media (max-width: 980px) { .workflow-shell { grid-template-columns: 76px 1fr; }.workflow-sidebar { width: 76px; }.workflow-title span:last-child, .workflow-link:not(.active) { font-size: 0; }.workflow-link { justify-content: center; font-size: 0; }.workflow-group, .demo-note { display: none; }.workflow-main { grid-column: 2; }.metric-row { grid-template-columns: 1fr 1fr; }.two-column, .clinical-columns, .prescription-grid, .orders-layout, .discharge-layout { grid-template-columns: 1fr; } }
</style>
