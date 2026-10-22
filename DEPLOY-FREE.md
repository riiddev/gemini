# Deploy Latveria gratis (preview/hobi)

Repo ini menyimpan source di `latveria-main.zip`. `Dockerfile` mengekstrak arsip, membangun frontend, memasang API Bun/Hono, menjalankan migrasi dan seed idempoten, lalu menyajikan frontend + API pada satu origin.

## Arsitektur yang disarankan

- **Render Free Web Service** untuk aplikasi Bun/Hono, WebSocket Warrior Battle, dan frontend.
- **Neon Free Postgres** untuk akun, sesi, soal, percobaan latihan, hasil, konfigurasi, dan cache diagram.
- **TeX worker** belum termasuk di image web karena Dockerfile upstream memasang `texlive-full` (besar dan tidak cocok untuk batas resource gratis). Diagram sederhana yang didukung renderer lokal tetap dapat digunakan; diagram kompleks yang tidak tercakup renderer akan membutuhkan worker terpisah.

Free tier bisa tidur saat tidak aktif; request pertama setelah idle dapat memerlukan sekitar satu menit. Neon juga memakai compute yang scale-to-zero. Ini cukup untuk mencoba/portofolio, bukan jaminan layanan produksi.

## Langkah setup

1. Buat proyek PostgreSQL di [Neon](https://console.neon.tech/). Ambil URL koneksi dengan pooling aktif untuk `DATABASE_URL`, dan URL koneksi direct/non-pooled untuk `DATABASE_MIGRATION_URL`. Keduanya harus memakai `sslmode=require`. Simpan sebagai secret; jangan commit ke Git.
2. Buka [Render Blueprint](https://dashboard.render.com/blueprint/new?repo=https%3A%2F%2Fgithub.com%2Friiddev%2Fgemini) setelah file `render.yaml` tersedia di branch `main`. Pastikan GitHub repo `riiddev/gemini` dan branch `main` dipilih.
3. Saat Render meminta variabel yang belum tersinkron, isi `DATABASE_URL` dengan URL pooled dan `DATABASE_MIGRATION_URL` dengan URL direct dari Neon. Render menghasilkan `BETTER_AUTH_SECRET` otomatis.
4. Dockerfile mengambil origin autentikasi dari `RENDER_EXTERNAL_URL` yang disediakan Render, jadi URL domain tidak perlu ditulis atau ditebak secara manual.
5. Pilih paket **Free** dan tinjau resource yang akan dibuat sebelum klik Deploy. Setelah deployment READY, buka `https://<domain-render>/api/health`; respons yang diharapkan adalah `{"status":"ok"}`. Periksa log Render jika migrasi awal gagal.

## Membuat admin pertama

Setelah akun didaftarkan, gunakan SQL Editor proyek Neon dan jalankan dengan email akunmu sendiri:

```sql
UPDATE "user"
SET role = 'admin'
WHERE lower(email) = lower('EMAIL_AKUN_KAMU')
RETURNING id, email, role;
```

Pastikan tepat satu baris yang berubah. Jangan biarkan endpoint promosi admin publik.

## Batasan yang diketahui

- Avatar upload butuh endpoint S3-compatible dan credentials. Tanpa mengonfigurasi R2/object storage, unggah avatar tidak siap.
- Diagram LaTeX kompleks membutuhkan TeX worker terpisah. Worker dari source upstream membangun `texlive-full`, sehingga tidak disertakan dalam deployment gratis pertama.
- Render Free Web Services dapat spin down setelah 15 menit tanpa traffic; Render menyebut tier ini untuk testing/hobby dan bukan production.
- Neon Free memiliki batas compute/storage/network transfer; cek dashboard Neon untuk pemakaian terkini.
