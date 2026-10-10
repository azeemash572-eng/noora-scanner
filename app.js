(function () {
  const $ = id => document.getElementById(id);
  const T = {
    ur: { scan: 'اسکین کریں', manual: 'دستی اندراج', export: 'CSV ایکسپورٹ', empty: 'ابھی کوئی اندراج نہیں۔ اسکین کریں۔', cancel: 'منسوخ', barcode: 'بارکوڈ', qty: 'مقدار', model: 'ماڈل نمبر', save: 'محفوظ کریں', addqty: 'مقدار جمع کریں',
      edit: 'ترمیم', del: 'حذف', newEntry: 'نیا اندراج', editEntry: 'اندراج میں ترمیم', saved: 'محفوظ ہو گیا', deleted: 'حذف ہو گیا', confirmDel: 'یہ اندراج حذف کریں؟', entries: 'اندراجات',
      dup: 'یہ بارکوڈ پہلے سے موجود ہے (مقدار: {q}، ماڈل: {m})۔ مقدار جمع کریں یا موجودہ میں ترمیم کریں۔', point: 'کیمرا بارکوڈ پر رکھیں', camErr: 'کیمرا نہیں کھل سکا۔ اجازت چیک کریں یا دستی اندراج استعمال کریں۔', scanned: 'اسکین ہو گیا', badQty: 'درست مقدار لکھیں' },
    en: { scan: 'Scan', manual: 'Manual entry', export: 'Export CSV', empty: 'No entries yet. Tap Scan.', cancel: 'Cancel', barcode: 'Barcode', qty: 'Quantity', model: 'Model number', save: 'Save', addqty: 'Add quantity',
      edit: 'Edit', del: 'Delete', newEntry: 'New entry', editEntry: 'Edit entry', saved: 'Saved', deleted: 'Deleted', confirmDel: 'Delete this entry?', entries: 'entries',
      dup: 'This barcode already exists (qty {q}, model {m}). Add quantity to it, or edit the existing entry.', point: 'Point the camera at a barcode', camErr: 'Could not open the camera. Check permission or use manual entry.', scanned: 'Scanned', badQty: 'Enter a valid quantity' }
  };
  let lang = localStorage.getItem('lang') || 'ur', editing = null, dupOf = null;
  const t = k => T[lang][k];
  function applyLang() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(e => e.textContent = t(e.dataset.i18n));
    $('langBtn').textContent = lang === 'ur' ? 'EN' : 'اردو';
    render();
  }
  function toast(m) { const e = $('toast'); e.textContent = m; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, 2000); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let rseq = 0;
  async function render() {
    const my = ++rseq; const rows = await Store.all(); if (my !== rseq) return;
    $('count').textContent = (lang === 'ur' ? t('entries') + ': ' : '') + rows.length + (lang === 'ur' ? '' : ' ' + t('entries')); $('empty').hidden = rows.length > 0;
    $('list').innerHTML = rows.map(r => `<li data-id="${r.id}"><div class="bc">${esc(r.barcode)}</div>
      <div class="meta"><span>${t('qty')}: <b dir="ltr">${r.quantity}</b></span><span>${t('model')}: <b dir="ltr">${esc(r.model || '—')}</b></span></div>
      <div class="meta muted"><span dir="ltr">${new Date(r.ts).toLocaleString()}</span></div>
      <div class="row"><button class="edit">${t('edit')}</button><button class="danger del">${t('del')}</button></div></li>`).join('');
  }
  /* ---------- dialog ---------- */
  async function openForm(barcode, entry) {
    editing = entry || null; dupOf = null;
    $('dlgTitle').textContent = entry ? t('editEntry') : t('newEntry');
    $('fBarcode').value = entry ? entry.barcode : (barcode || '');
    $('fQty').value = entry ? entry.quantity : 1; $('fModel').value = entry ? entry.model : '';
    $('addQtyBtn').hidden = true; $('dupMsg').hidden = true;
    if (!$('dlg').open) $('dlg').showModal();
    if (!entry && barcode) await checkDup();
    (barcode ? $('fQty') : $('fBarcode')).focus();
  }
  async function checkDup() {
    const b = $('fBarcode').value.trim(); dupOf = null;
    if (!editing && b) dupOf = await Store.findByBarcode(b);
    $('addQtyBtn').hidden = $('dupMsg').hidden = !dupOf;
    if (dupOf) {
      $('dupMsg').textContent = t('dup').replace('{q}', dupOf.quantity).replace('{m}', dupOf.model || '—');
      if (!$('fModel').value) $('fModel').value = dupOf.model;
    }
  }
  $('fBarcode').addEventListener('change', checkDup);
  $('form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const q = parseInt($('fQty').value, 10); if (!(q >= 0)) return toast(t('badQty'));
    const e = { barcode: $('fBarcode').value, quantity: q, model: $('fModel').value };
    await checkDup();
    if (dupOf) { // duplicate: save acts as "edit existing" (replace its values)
      await Store.update(dupOf.id, e);
    } else if (editing) await Store.update(editing.id, Object.assign({}, e, { ts: new Date().toISOString() }));
    else await Store.add(e);
    $('dlg').close(); toast(t('saved')); render();
  });
  $('addQtyBtn').onclick = async () => {
    const q = parseInt($('fQty').value, 10); if (!(q >= 0) || !dupOf) return toast(t('badQty'));
    await Store.addQuantity(dupOf.id, q, $('fModel').value.trim()); $('dlg').close(); toast(t('saved')); render();
  };
  $('cancelBtn').onclick = () => $('dlg').close();
  $('manualBtn').onclick = () => openForm('');
  $('list').addEventListener('click', async ev => {
    const li = ev.target.closest('li'); if (!li) return; const id = +li.dataset.id;
    const rows = await Store.all(), r = rows.find(x => x.id === id);
    if (ev.target.classList.contains('edit')) openForm(null, r);
    else if (ev.target.classList.contains('del') && confirm(t('confirmDel'))) { await Store.remove(id); toast(t('deleted')); render(); }
  });
  /* ---------- export ---------- */
  $('exportBtn').onclick = async () => {
    const rows = await Store.all(); const csv = Store.toCSV(rows);
    const name = 'noora-scanner-' + new Date().toISOString().slice(0, 10) + '.csv';
    const file = new File([csv], name, { type: 'text/csv' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  };
  /* ---------- scanner ---------- */
  let stream = null, loop = null, reader = null;
  function getReader() {
    if (reader) return reader; const Z = ZXing, hints = new Map(), F = Z.BarcodeFormat;
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.CODE_93, F.ITF, F.CODABAR, F.QR_CODE, F.DATA_MATRIX, F.PDF_417, F.AZTEC]);
    hints.set(Z.DecodeHintType.TRY_HARDER, true);
    reader = new Z.MultiFormatReader(); reader.setHints(hints); return reader;
  }
  /* decode a canvas; also used by tests */
  function decodeCanvas(cv) {
    const Z = ZXing;
    try {
      const src = new Z.HTMLCanvasElementLuminanceSource(cv);
      return getReader().decode(new Z.BinaryBitmap(new Z.HybridBinarizer(src))).getText();
    } catch (e) { return null; }
  }
  window.decodeCanvas = decodeCanvas;
  function stopScan() {
    clearInterval(loop); loop = null;
    if (stream) stream.getTracks().forEach(x => x.stop()); stream = null; $('video').srcObject = null; $('scanner').hidden = true;
  }
  async function startScan() {
    $('scanner').hidden = false; $('scanMsg').textContent = t('point');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (e) { stopScan(); toast(t('camErr')); return; }
    const v = $('video'); v.srcObject = stream; try { await v.play(); } catch (e) {}
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });
    const native = 'BarcodeDetector' in window ? new BarcodeDetector() : null; let busy = false;
    loop = setInterval(async () => {
      if (busy || !v.videoWidth) return; busy = true;
      let code = null;
      try {
        cv.width = v.videoWidth; cv.height = v.videoHeight; ctx.drawImage(v, 0, 0);
        if (native) { const r = await native.detect(cv); if (r.length) code = r[0].rawValue; }
        if (!code) code = decodeCanvas(cv);
      } catch (e) {}
      busy = false;
      if (code) { stopScan(); if (navigator.vibrate) navigator.vibrate(60); toast(t('scanned') + ': ' + code); openForm(code); }
    }, 200);
  }
  $('scanBtn').onclick = startScan; $('scanClose').onclick = stopScan;
  $('langBtn').onclick = () => { lang = lang === 'ur' ? 'en' : 'ur'; localStorage.setItem('lang', lang); applyLang(); };
  applyLang();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
