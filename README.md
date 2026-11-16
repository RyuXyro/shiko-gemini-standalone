# Gemini Hub

Dashboard chat ala ChatGPT + generator gambar (Pollinations.ai) + WhatsApp bot, dalam satu project Next.js (App Router, TypeScript, Tailwind) yang siap di-deploy ke Vercel.

## Struktur

```
src/
├─ middleware.ts                  # proteksi password: /dashboard, /api/chat, /api/image, /api/conversations
├─ app/
│  ├─ layout.tsx · globals.css · page.tsx
│  ├─ login/page.tsx
│  ├─ dashboard/page.tsx          # memuat <Dashboard />
│  └─ api/
│     ├─ login · logout           # set/hapus cookie sesi
│     ├─ chat/route.ts            # streaming Gemini (Vercel AI SDK)
│     ├─ image/route.ts           # link gambar Pollinations (GET) + simpan riwayat (POST)
│     ├─ conversations/           # daftar, baca, hapus riwayat
│     └─ wa-api/route.ts          # webhook WhatsApp Cloud API
├─ components/Dashboard.tsx       # sidebar, chat, mode gambar, dialog system prompt
└─ lib/
   ├─ auth.ts · db.ts · prompts.ts · pollinations.ts · whatsapp.ts
```

## Menjalankan lokal

```bash
npm install
cp .env.local.example .env.local    # lalu isi nilainya
npm run dev                          # http://localhost:3000
```

Minimal untuk mulai: `GOOGLE_GENERATIVE_AI_API_KEY`, `DASHBOARD_PASSWORD`, `AUTH_SECRET`. `DATABASE_URL` dan variabel WhatsApp boleh dikosongkan dulu.

## Database (Neon, opsional)

1. Buat project gratis di https://neon.tech, salin connection string ke `DATABASE_URL`.
2. Selesai. Tabel `conversations` dan `messages` dibuat otomatis saat pertama dipakai.

Tanpa `DATABASE_URL`, chat tetap jalan tetapi riwayat hilang saat halaman ditutup.

## Deploy ke Vercel

1. Push project ke GitHub.
2. Di https://vercel.com/new, impor repo (framework Next.js terdeteksi otomatis).
3. Di **Settings → Environment Variables**, isi semua variabel dari `.env.local.example`.
4. Deploy. Buka `https://<project>.vercel.app/dashboard` dan masuk dengan password.

## Menghubungkan WhatsApp (Meta Cloud API)

1. Di https://developers.facebook.com buat app tipe **Business**, tambahkan produk **WhatsApp**.
2. Salin **Phone number ID** dan **access token** (untuk produksi, buat System User token permanen) ke env Vercel. Salin juga **App Secret** (App settings → Basic) ke `WHATSAPP_APP_SECRET`.
3. Di **WhatsApp → Configuration → Webhook**:
   - Callback URL: `https://<project>.vercel.app/api/wa-api`
   - Verify token: sama persis dengan `WHATSAPP_VERIFY_TOKEN`
   - Subscribe ke field **messages**.
4. Tambahkan nomor pribadi Anda sebagai penerima uji, lalu kirim pesan ke nomor bot.

Perintah bot: pesan biasa → dijawab Gemini · `/image <deskripsi>` → gambar · `/reset` → hapus konteks · `/help`.

Isi `WHATSAPP_ALLOWED_NUMBERS` agar hanya nomor Anda yang dilayani; tanpa itu siapa pun yang mengirim pesan memakai kuota Gemini Anda.

## Catatan

- **Waktu eksekusi**: pembuatan gambar di WhatsApp bisa memakan puluhan detik. Route diatur `maxDuration = 60`; jika Vercel plan Anda membatasi lebih rendah, hasilnya bisa terpotong.
- **Pollinations.ai** adalah layanan pihak ketiga gratis dan syaratnya bisa berubah. Semua URL-nya ada di `src/lib/pollinations.ts`.
- **Login** memakai satu password dan cookie httpOnly 30 hari. Cukup untuk penggunaan pribadi; tidak ada pembatasan percobaan login.
- **System prompt** dashboard disimpan di `localStorage` browser, bukan di database.
- Nama model dapat diganti lewat `GEMINI_MODEL`.
