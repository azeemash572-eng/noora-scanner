/* NOORA: offline image -> PDF. Minimal PDF writer (JPEG via DCTDecode) + UI. No external deps. */
(function (root) {
  const A4W = 595.28, A4H = 841.89, MARGIN = 18, MAXPX = 1600;
  const enc = s => { const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; return a; };
  const f2 = n => (+n.toFixed(2)).toString();
  /* pages: [{jpeg:Uint8Array,width,height}] -> Uint8Array PDF */
  function buildPdf(pages) {
    const chunks = [], offs = []; let len = 0;
    const put = d => { if (typeof d === 'string') d = enc(d); chunks.push(d); len += d.length; };
    const obj = (n, fn) => { offs[n] = len; put(n + ' 0 obj\n'); fn(); put('\nendobj\n'); };
    const N = pages.length; // objs: 1 catalog, 2 pages, then per page: page, content, image
    put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, () => put('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => put('<< /Type /Pages /Count ' + N + ' /Kids [' + pages.map((_, i) => (3 + i * 3) + ' 0 R').join(' ') + '] >>'));
    pages.forEach((p, i) => {
      const pg = 3 + i * 3, ct = pg + 1, im = pg + 2;
      const s = Math.min((A4W - 2 * MARGIN) / p.width, (A4H - 2 * MARGIN) / p.height), w = p.width * s, h = p.height * s;
      const x = (A4W - w) / 2, y = (A4H - h) / 2;
      const content = 'q ' + f2(w) + ' 0 0 ' + f2(h) + ' ' + f2(x) + ' ' + f2(y) + ' cm /Im0 Do Q';
      obj(pg, () => put('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + f2(A4W) + ' ' + f2(A4H) + '] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>'));
      obj(ct, () => put('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream'));
      obj(im, () => { put('<< /Type /XObject /Subtype /Image /Width ' + p.width + ' /Height ' + p.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n'); put(p.jpeg); put('\nendstream'); });
    });
    const total = 3 + N * 3, xr = len;
    put('xref\n0 ' + total + '\n0000000000 65535 f \n');
    for (let n = 1; n < total; n++) put(String(offs[n]).padStart(10, '0') + ' 00000 n \n');
    put('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF\n');
    const out = new Uint8Array(len); let o = 0; chunks.forEach(c => { out.set(c, o); o += c.length; }); return out;
  }
  /* File/Blob -> {blob,jpeg,width,height}; draws through canvas so EXIF orientation is applied, downscales to MAXPX */
  async function loadImage(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      let w = img.naturalWidth, h = img.naturalHeight; if (!w || !h) throw new Error('bad image');
      const k = Math.min(1, MAXPX / Math.max(w, h)); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.drawImage(img, 0, 0, w, h);
      const blob = await new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('encode')), 'image/jpeg', 0.85));
      cv.width = cv.height = 0;
      return { blob, width: w, height: h };
    } finally { URL.revokeObjectURL(url); }
  }
  async function makePdf(items) {
    const pages = []; for (const it of items) pages.push({ jpeg: new Uint8Array(await it.blob.arrayBuffer()), width: it.width, height: it.height });
    return new Blob([buildPdf(pages)], { type: 'application/pdf' });
  }
  root.NooraPdf = { buildPdf, loadImage, makePdf };

  /* ---------- UI ---------- */
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  const S = {
    ur: { pdf: 'PDF بنائیں', pdfTitle: 'تصاویر سے PDF', pick: 'تصاویر منتخب کریں', cam: 'کیمرا سے لیں', make: 'PDF بنائیں', close: 'بند کریں', none: 'کوئی تصویر منتخب نہیں', pages: 'صفحات', busy: 'پروسیس ہو رہا ہے…', done: 'PDF تیار ہو گیا', fail: 'تصویر پڑھی نہیں جا سکی', up: 'اوپر', down: 'نیچے', rm: 'ہٹائیں' },
    en: { pdf: 'Convert to PDF', pdfTitle: 'Photos to PDF', pick: 'Choose photos', cam: 'Take photo', make: 'Create PDF', close: 'Close', none: 'No photos selected', pages: 'pages', busy: 'Processing…', done: 'PDF ready', fail: 'Could not read an image', up: 'Up', down: 'Down', rm: 'Remove' }
  };
  const L = () => document.documentElement.lang === 'en' ? 'en' : 'ur';
  const tt = k => S[L()][k];
  let items = [], busy = false;
  const toast = m => { const e = $('toast'); e.textContent = m; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, 2200); };
  function labels() {
    document.querySelectorAll('[data-pi]').forEach(e => e.textContent = tt(e.dataset.pi));
    $('pdfMake').textContent = busy ? tt('busy') : tt('make'); draw();
  }
  function draw() {
    $('pdfNone').hidden = items.length > 0; $('pdfCount').textContent = items.length ? items.length + ' ' + tt('pages') : '';
    $('pdfMake').disabled = busy || !items.length;
    const ul = $('pdfList'); ul.innerHTML = '';
    items.forEach((it, i) => {
      const li = document.createElement('li'); li.dataset.i = i;
      li.innerHTML = '<img alt=""><b>' + (i + 1) + '</b><button data-a="up"></button><button data-a="down"></button><button data-a="rm" class="danger"></button>';
      li.querySelector('img').src = it.url;
      const [u, d, r] = li.querySelectorAll('button'); u.textContent = '↑'; d.textContent = '↓'; r.textContent = '✕';
      u.title = u.ariaLabel = tt('up'); d.title = d.ariaLabel = tt('down'); r.title = r.ariaLabel = tt('rm');
      u.disabled = i === 0; d.disabled = i === items.length - 1; ul.appendChild(li);
    });
  }
  async function add(files) {
    busy = true; labels();
    for (const f of files) {
      try { const r = await loadImage(f); r.url = URL.createObjectURL(r.blob); items.push(r); draw(); }
      catch (e) { toast(tt('fail')); }
    }
    busy = false; labels();
  }
  async function make() {
    busy = true; labels();
    try {
      const blob = await makePdf(items), name = 'noora-' + new Date().toISOString().slice(0, 10) + '.pdf';
      const file = new File([blob], name, { type: 'application/pdf' });
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; } }
      catch (e) { if (e.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 60000); toast(tt('done'));
    } catch (e) { toast(tt('fail')); } finally { busy = false; labels(); }
  }
  function init() {
    $('pdfBtn').onclick = () => { if (!$('pdfDlg').open) $('pdfDlg').showModal(); labels(); };
    $('pdfClose').onclick = () => $('pdfDlg').close();
    $('pdfFiles').onchange = e => { const f = [...e.target.files]; e.target.value = ''; add(f); };
    $('pdfCam').onchange = e => { const f = [...e.target.files]; e.target.value = ''; add(f); };
    $('pdfMake').onclick = make;
    $('pdfList').onclick = e => {
      const b = e.target.closest('button'); if (!b) return; const i = +b.closest('li').dataset.i, a = b.dataset.a;
      if (a === 'rm') { URL.revokeObjectURL(items[i].url); items.splice(i, 1); }
      else { const j = a === 'up' ? i - 1 : i + 1; if (j < 0 || j >= items.length) return; [items[i], items[j]] = [items[j], items[i]]; }
      draw();
    };
    new MutationObserver(labels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    labels();
  }
  init();
})(typeof window !== 'undefined' ? window : globalThis);
