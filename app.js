(() => {
const C = window.CONFIG, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PH = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 125"><rect width="100" height="125" fill="#065f46"/><circle cx="50" cy="48" r="20" fill="#d4af37" opacity=".85"/><path d="M12 125c0-30 16-46 38-46s38 16 38 46z" fill="#d4af37" opacity=".85"/></svg>');
const AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LS = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }, set(k, v) { localStorage.setItem(k, JSON.stringify(v)) } };
let st = { status: 'setup', guru: LS.get('guru', []) }, cur = 'opening', kode = '', pilih = null, busy = false, idleT, flushing = false, thanksT;

/* ---------- API (POST text/plain agar tanpa preflight CORS) ---------- */
async function api(action, data = {}) {
  if (!C.API_URL) return mock(action);
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(C.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...data }), signal: ctl.signal });
    return await r.json();
  } finally { clearTimeout(t) }
}
function mock(a) {
  const g = Array.from({ length: 18 }, (_, i) => ({ id: 'G' + String(i + 1).padStart(2, '0'), nama: 'Guru ' + String(i + 1).padStart(2, '0'), foto: '' }));
  if (a === 'state') return { ok: true, status: 'open', guru: g };
  if (a === 'winner') return { ok: true, winners: [g[6]], total: 0 };
  return { ok: true };
}

/* ---------- Navigasi ---------- */
function show(n) {
  cur = n; $$('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + n));
  scrollTo(0, 0); arm();
  if (n === 'nominasi') updBtn();
}
function arm() {
  clearTimeout(idleT);
  if (['kode', 'pilih'].includes(cur)) idleT = setTimeout(() => { kode = ''; drawKode(); closeModal(); show('nominasi') }, C.IDLE_DETIK * 1000);
}
document.addEventListener('pointerdown', arm);
$$('[data-go]').forEach(b => b.onclick = () => show(b.dataset.go));
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2600) }

/* ---------- Kartu & grid ---------- */
function card(g, i, fn) {
  const d = document.createElement('button'); d.className = 'card';
  d.innerHTML = '<span class="no"></span><img alt=""><span class="nm"></span>';
  d.querySelector('.no').textContent = i + 1;
  const im = d.querySelector('img'); im.src = g.foto || PH; im.onerror = () => { im.onerror = null; im.src = PH };
  d.querySelector('.nm').textContent = g.nama;
  if (fn) d.onclick = () => fn(g); else d.tabIndex = -1;
  return d;
}
function renderGrids() {
  const a = $('#grid-nom'); a.replaceChildren(...st.guru.map((g, i) => card(g, i))); a.classList.add('view');
}
function updBtn() {
  const b = $('#btn-mulai'), s = st.status;
  b.textContent = { setup: 'Voting Belum Dibuka', open: 'Mulai Voting', closed: 'Voting Ditutup', announced: 'Lihat Pemenang' }[s] || 'Mulai Voting';
  b.disabled = s === 'setup';
}
$('#btn-mulai').onclick = () => {
  if (st.status === 'open') { if (C.PAKAI_KODE) { kode = ''; drawKode(); msg(''); show('kode') } else pilihGuru() }
  else if (st.status === 'closed') show('closed')
  else if (st.status === 'announced') pemenang()
};

/* ---------- Kode pemilih ---------- */
const keys = $('#keys');
AL.split('').forEach(ch => { const b = document.createElement('button'); b.className = 'key'; b.textContent = ch; b.onclick = () => ketik(ch); keys.append(b) });
const del = document.createElement('button'); del.className = 'key del'; del.textContent = 'Hapus'; del.onclick = () => { kode = kode.slice(0, -1); drawKode(); msg('') }; keys.append(del);
function ketik(ch) { if (kode.length < 6 && !busy) { kode += ch; drawKode(); msg(''); if (kode.length === 6) lanjut() } }
function drawKode() { $$('#codebox span').forEach((s, i) => s.textContent = kode[i] || '') }
function msg(m) { $('#kode-msg').textContent = m }
document.addEventListener('keydown', e => {
  if (cur !== 'kode') return;
  const k = e.key.toUpperCase();
  if (k === 'BACKSPACE') { kode = kode.slice(0, -1); drawKode() } else if (k.length === 1 && AL.includes(k)) ketik(k);
});
$('#btn-lanjut').onclick = lanjut;
async function lanjut() {
  if (kode.length < 6) return msg('Kode terdiri dari 6 karakter.');
  if (busy) return; busy = true; msg('Memeriksa kode…');
  try {
    const r = await api('cekKode', { kode });
    if (r.ok) { msg(''); pilihGuru() }
    else { msg(r.error || 'Kode tidak valid.'); kode = ''; drawKode(); if (r.code === 'closed') show('closed') }
  } catch { msg('Koneksi terputus. Periksa jaringan lalu coba lagi.') }
  busy = false;
}

/* ---------- Pilih & konfirmasi ---------- */
function pilihGuru() {
  const g = $('#grid-pilih'); g.classList.remove('view');
  g.replaceChildren(...st.guru.map((x, i) => card(x, i, openConfirm))); show('pilih');
}
$('#btn-batal').onclick = () => { kode = ''; drawKode(); show('nominasi') };
function openConfirm(g) {
  pilih = g; $('#m-foto').src = g.foto || PH; $('#m-nama').textContent = g.nama;
  $('#btn-ya').disabled = false; $('#modal').classList.add('on');
}
function closeModal() { $('#modal').classList.remove('on') }
$('#btn-ganti').onclick = () => { pilih = null; closeModal() };
$('#btn-ya').onclick = kirim;

async function kirim() {
  if (busy || !pilih) return; busy = true; $('#btn-ya').disabled = true;
  const item = { kode, guruId: pilih.id, reqId: (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random()) };
  let mode = 'ok';
  try {
    const r = await api('vote', item);
    if (!r.ok) { closeModal(); busy = false; pilih = null; kode = ''; drawKode(); if (r.code === 'closed') show('closed'); else if (C.PAKAI_KODE) { show('kode'); msg(r.error || 'Suara gagal dikirim.') } else { show('nominasi'); toast(r.error || 'Suara gagal dikirim.') } return }
  } catch {
    // Koneksi putus: simpan lokal, kirim ulang otomatis (reqId sama, aman dari suara ganda)
    const q = LS.get('q', []); q.push(item); LS.set('q', q); mode = 'offline'; updQ();
  }
  closeModal(); busy = false; pilih = null; kode = ''; drawKode(); thanks(mode);
}
function thanks(mode) {
  $('#thanks-msg').textContent = mode === 'offline' ? 'Suaramu disimpan dan akan dikirim saat koneksi pulih.' : 'Suaramu sudah tercatat.';
  show('thanks'); let n = C.AUTO_RETURN_DETIK; $('#count').textContent = n;
  clearInterval(thanksT);
  thanksT = setInterval(() => { $('#count').textContent = --n; if (n <= 0) nextVoter() }, 1000);
}
function nextVoter() { clearInterval(thanksT); if (cur !== 'thanks') return; if (st.status === 'open') { if (C.PAKAI_KODE) { msg(''); show('kode') } else pilihGuru() } else show(st.status === 'announced' ? 'closing' : 'closed') }
$('#btn-next').onclick = nextVoter;

/* ---------- Antrean offline ---------- */
function updQ() { const n = LS.get('q', []).length, b = $('#qbadge'); b.hidden = !n; b.textContent = n + ' suara menunggu dikirim' }
async function flush() {
  const q = LS.get('q', []); if (!q.length || flushing) return; flushing = true; const rest = [];
  for (const it of q) {
    try { const r = await api('vote', it); if (!r.ok && r.code === 'closed') rest.push(it) } catch { rest.push(it) }
  }
  LS.set('q', rest); updQ(); flushing = false;
}

/* ---------- Status server ---------- */
function setNet(ok) { $('#net').className = 'dot ' + (ok ? 'ok' : ''); $('#net').title = ok ? 'Terhubung' : 'Koneksi terputus' }
async function refresh() {
  try {
    const r = await api('state'); if (!r.ok) throw 0;
    const prev = st.status, ganti = JSON.stringify(st.guru) !== JSON.stringify(r.guru);
    st = { status: r.status, guru: r.guru }; LS.set('guru', r.guru); setNet(true);
    if (ganti || !$('#grid-nom').children.length) renderGrids();
    $('#demo').hidden = !!C.API_URL; updBtn(); onState(prev); flush();
  } catch { setNet(false) }
}
function onState(prev) {
  if (st.status === prev) return;
  if (st.status === 'closed' && ['kode', 'pilih'].includes(cur)) { closeModal(); show('closed') }
  if (st.status === 'announced') { if (['closed', 'kode', 'pilih', 'thanks'].includes(cur)) { closeModal(); pemenang() } }
  $('#btn-win').hidden = st.status !== 'announced';
}
$('#btn-win').onclick = pemenang;

/* ---------- Pemenang ---------- */
async function pemenang() {
  show('winner'); $('#w-pre').hidden = false; $('#w-show').hidden = true; $('.rays').classList.remove('on');
  let r; try { r = await api('winner') } catch { r = null }
  if (!r || !r.ok) { toast('Pemenang belum bisa dimuat'); show('closed'); return }
  for (const n of [3, 2, 1]) { const c = $('#w-count'); c.textContent = n; c.style.animation = 'none'; c.offsetHeight; c.style.animation = ''; await sleep(1100) }
  const l = $('#w-list'); l.replaceChildren();
  r.winners.forEach(w => {
    const d = document.createElement('div'); d.className = 'wcard'; d.innerHTML = '<img alt=""><h1 class="gold-text"></h1>';
    const im = d.querySelector('img'); im.src = w.foto || PH; im.onerror = () => { im.onerror = null; im.src = PH };
    d.querySelector('h1').textContent = w.nama; l.append(d);
  });
  $('#w-total').textContent = 'Dari ' + r.total + ' suara yang masuk';
  $('#w-pre').hidden = true; $('#w-show').hidden = false; $('.rays').classList.add('on'); confetti();
}
$('#btn-replay').onclick = pemenang;
function confetti() {
  const c = $('#confetti'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const col = ['#f6e08a', '#d4af37', '#10b981', '#ffffff'];
  const p = Array.from({ length: 220 }, () => ({ x: Math.random() * c.width, y: -Math.random() * c.height, r: 4 + Math.random() * 7, vy: 2 + Math.random() * 4, vx: -1.5 + Math.random() * 3, c: col[Math.random() * 4 | 0], a: Math.random() * 6 }));
  let t = 0;
  (function f() {
    x.clearRect(0, 0, c.width, c.height);
    p.forEach(q => { q.y += q.vy; q.x += q.vx + Math.sin(q.a += .05); x.fillStyle = q.c; x.fillRect(q.x, q.y, q.r, q.r * 1.6) });
    if (++t < 420 && cur === 'winner') requestAnimationFrame(f); else x.clearRect(0, 0, c.width, c.height);
  })();
}

/* ---------- Layar penuh & lainnya ---------- */
function fs() { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.() }
$('#fs').onclick = fs;
document.addEventListener('keydown', e => { if (e.key === 'f' && cur !== 'kode') fs() });
addEventListener('online', refresh); addEventListener('offline', () => setNet(false));
document.addEventListener('contextmenu', e => e.preventDefault());
navigator.wakeLock?.request('screen').catch(() => {});

if (st.guru.length) renderGrids();
updQ(); refresh(); setInterval(refresh, C.POLL_DETIK * 1000);
})();
