(() => {
const C = window.CONFIG, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
let tok = sessionStorage.getItem('tok') || '', S = null, newCodes = [];
const LABEL = { setup: 'Persiapan', open: 'Voting Dibuka', closed: 'Voting Ditutup', announced: 'Pemenang Diumumkan' };
const PH = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100"><rect width="80" height="100" fill="#065f46"/><circle cx="40" cy="38" r="16" fill="#d4af37"/><path d="M8 100c0-24 13-37 32-37s32 13 32 37z" fill="#d4af37"/></svg>');

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2800) }
async function api(action, data = {}) {
  if (!C.API_URL) throw new Error('API_URL belum diisi di config.js');
  const r = await fetch(C.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: tok, ...data }) });
  const j = await r.json(); if (j.code === 'auth') logout(); return j;
}
async function call(action, data, okMsg) {
  try { const r = await api(action, data); if (!r.ok) { toast(r.error || 'Gagal'); return r } if (okMsg) toast(okMsg); return r }
  catch (e) { toast('Koneksi gagal: ' + e.message); return { ok: false } }
}
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
const csv = rows => '\ufeff' + rows.map(r => r.map(v => { v = String(v ?? ''); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"' }).join(',')).join('\r\n');
function dl(name, rows) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv(rows)], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click() }

/* ---------- Login ---------- */
async function login() {
  $('#login-msg').textContent = '';
  try {
    const r = await fetch(C.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'login', pin: $('#pin').value }) }).then(x => x.json());
    if (!r.ok) return $('#login-msg').textContent = r.error;
    tok = r.token; sessionStorage.setItem('tok', tok); $('#pin').value = ''; enter();
  } catch { $('#login-msg').textContent = C.API_URL ? 'Koneksi gagal.' : 'API_URL belum diisi di config.js.' }
}
function logout() { tok = ''; sessionStorage.removeItem('tok'); $('#login').hidden = false; $('#app').hidden = true; $('#logout').hidden = true }
function enter() { $('#login').hidden = true; $('#app').hidden = false; $('#logout').hidden = false; load() }
$('#btn-login').onclick = login; $('#pin').onkeydown = e => e.key === 'Enter' && login(); $('#logout').onclick = logout;

/* ---------- Data & tab ---------- */
async function load() {
  const r = await call('adminState'); if (!r.ok) return; S = r;
  $('#st-chip').textContent = LABEL[r.status]; $('#n-kode').textContent = r.stats.kode; $('#n-pakai').textContent = r.stats.terpakai; $('#n-suara').textContent = r.stats.suara;
  $('#b-open').hidden = !['setup', 'closed'].includes(r.status); $('#b-close').hidden = !['open', 'announced'].includes(r.status); $('#b-announce').hidden = r.status !== 'closed';
  $('#b-open').textContent = r.status === 'closed' ? 'Buka Kembali Voting' : 'Buka Voting'; $('#b-close').textContent = r.status === 'announced' ? 'Batalkan Pengumuman' : 'Tutup Voting';
  renderGuru();
}
$$('.tab-btn').forEach(b => b.onclick = () => {
  $$('.tab-btn').forEach(x => x.classList.toggle('on', x === b)); $$('.tab').forEach(t => t.hidden = t.id !== 't-' + b.dataset.t);
  if (b.dataset.t === 'rekap') rekap(); else load();
});

/* ---------- Kontrol ---------- */
$('#b-open').onclick = async () => { if (confirm('Buka voting sekarang?')) { await call('setStatus', { status: 'open' }, 'Voting dibuka'); load() } };
$('#b-close').onclick = async () => {
  const batal = S.status === 'announced';
  if (confirm(batal ? 'Batalkan pengumuman pemenang?' : 'Tutup voting? Suara baru tidak akan diterima.')) { await call('setStatus', { status: 'closed' }, batal ? 'Pengumuman dibatalkan' : 'Voting ditutup'); load() }
};
$('#b-announce').onclick = async () => { if (confirm('Umumkan pemenang di layar siswa sekarang?')) { await call('announce', {}, 'Pemenang diumumkan'); load() } };

/* ---------- Guru ---------- */
function resize(file) {
  return new Promise((ok, no) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onerror = () => no(new Error('File bukan gambar')); im.onload = () => {
      const W = 480, H = 600, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      const s = Math.max(W / im.width, H / im.height), w = im.width * s, h = im.height * s;
      x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(im, (W - w) / 2, (H - h) * .25, w, h);
      URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', .82));
    }; im.src = u;
  });
}
function renderGuru() {
  const tb = $('#guru-rows'); tb.replaceChildren();
  const lock = S.status === 'open';
  S.guru.forEach((g, i) => {
    const tr = document.createElement('tr'); let foto = '';
    tr.innerHTML = `<td>${i + 1}</td><td><img class="thumb" src="${esc(g.foto || PH)}" alt=""></td><td><input type="text" maxlength="40" value="${esc(g.nama)}" ${lock ? 'disabled' : ''}></td><td><input type="file" accept="image/*" ${lock ? 'disabled' : ''}></td><td><button class="btn" ${lock ? 'disabled' : ''}>Simpan</button></td>`;
    const img = tr.querySelector('img'), f = tr.querySelector('input[type=file]'), n = tr.querySelector('input[type=text]');
    f.onchange = async () => { try { foto = await resize(f.files[0]); img.src = foto } catch (e) { toast(e.message) } };
    tr.querySelector('button').onclick = async () => { const r = await call('saveGuru', { id: g.id, nama: n.value, foto }, g.id + ' tersimpan'); if (r.ok) { foto = ''; load() } };
    tb.append(tr);
  });
}

/* ---------- Kode pemilih ---------- */
function showCodes(list, label) {
  $('#codes').innerHTML = list.map(k => '<div>' + esc(k) + '</div>').join('');
  const b = $('#b-csv-kode'); b.hidden = !list.length; b.onclick = () => dl(label, [['kode', 'status'], ...list.map(k => [k.split(' ')[0], k.split(' ')[1] || 'baru'])]);
}
$('#b-gen').onclick = async () => {
  const n = +$('#n-gen').value; if (!(n >= 1 && n <= 500)) return toast('Jumlah 1–500');
  const r = await call('generateKode', { n }, n + ' kode dibuat'); if (r.ok) { showCodes(r.kode, 'kode_pemilih_baru.csv'); load() }
};
$('#b-list').onclick = async () => { const r = await call('listKode'); if (r.ok) showCodes(r.list.map(x => x.kode + ' ' + x.status), 'kode_pemilih_semua.csv') };

/* ---------- Rekap & validasi ---------- */
async function rekap() {
  const out = $('#rekap-out'); out.textContent = 'Memuat…';
  const r = await call('rekap');
  if (!r.ok) { out.innerHTML = '<p>' + esc(r.error || 'Rekap belum tersedia.') + '</p>'; return }
  const rows = r.ranking.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.nama)}</td><td>${x.suara}</td><td>${r.total ? (x.suara * 100 / r.total).toFixed(1) : 0}%</td></tr>`).join('');
  const chk = r.checks.map(c => `<li class="${c.ok ? 'ok' : 'bad'}">${c.ok ? '✓' : '✗'} ${esc(c.label)}${c.detail ? ' — ' + esc(c.detail) : ''}</li>`).join('');
  out.innerHTML = `<h3>Peringkat (total ${r.total} suara)</h3><table><thead><tr><th>#</th><th>Guru</th><th>Suara</th><th>%</th></tr></thead><tbody>${rows}</tbody></table><br><h3>Validasi</h3><ul style="margin:.6rem 0 1rem 1.2rem">${chk}</ul><div class="row"><button id="x-rekap" class="btn">Ekspor Rekap CSV</button><button id="x-raw" class="btn ghost">Ekspor Suara Mentah CSV</button></div>`;
  $('#x-rekap').onclick = () => dl('rekap_teacher_awards_2026.csv', [['peringkat', 'id', 'nama', 'suara'], ...r.ranking.map((x, i) => [i + 1, x.id, x.nama, x.suara])]);
  $('#x-raw').onclick = () => dl('suara_mentah.csv', [['waktu', 'kode', 'guru_id'], ...r.raw]);
}

/* ---------- Reset ---------- */
$('#b-reset').onclick = async () => {
  if ($('#reset-txt').value !== 'RESET') return toast('Ketik RESET terlebih dahulu');
  if (!confirm('Yakin? Semua suara dan kode pemilih akan dihapus permanen.')) return;
  const r = await call('reset', { confirm: 'RESET' }, 'Data voting direset'); if (r.ok) { $('#reset-txt').value = ''; showCodes([], 'x.csv'); load() }
};

if (tok) enter();
})();
