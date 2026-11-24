// Isi API_URL dengan URL Web App Apps Script (berakhiran /exec).
// Dibiarkan kosong = MODE DEMO (tanpa server, hanya untuk melihat tampilan).
window.CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycby5SZ9ARkORy91pez0LmmmkeDvSvpGxnXzpN5J_sP--HkREOcAVaEz6tzof5YP0lWO89g/exec",
  AUTO_RETURN_DETIK: 6,   // kembali ke layar kode setelah terima kasih
  POLL_DETIK: 5,          // cek status voting ke server
  IDLE_DETIK: 60          // layar voting kembali otomatis jika tidak disentuh
};
