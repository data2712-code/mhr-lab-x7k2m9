-- MHR Deck Lab — migrasi v6.47
-- Tambah kolom published_at ke public.decks, dipakai untuk menampilkan
-- tanggal publish (format DD-MM-YYYY) di galeri "Dari Pengguna".
--
-- Jalankan SEKALI di SQL Editor Supabase (dashboard proyek > SQL Editor),
-- sama seperti migrasi-migrasi sebelumnya (lihat README.md § v6.47 untuk
-- konteks lengkap). Aman dijalankan berkali-kali (IF NOT EXISTS).
--
-- Setelah kolom ini ada, decks.js (setPublic()) otomatis mengisinya setiap
-- kali sebuah deck di-toggle JADI publik. Deck yang SUDAH publik sebelum
-- migrasi ini dijalankan akan punya published_at kosong (NULL) sampai
-- pemiliknya membatalkan lalu mempublikasikan ulang — sementara itu,
-- galerinya otomatis jatuh ke created_at sebagai perkiraan (lihat
-- renderPubGrid() di index.html).

alter table public.decks
  add column if not exists published_at timestamptz;
