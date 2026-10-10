/* Storage logic: IndexedDB with in-memory fallback. Entry: {id, barcode, quantity, model, ts} */
(function (root) {
  const DB = 'noora-scanner', STORE = 'entries';
  function openDB() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => {
        const s = r.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        s.createIndex('barcode', 'barcode');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  function tx(mode, fn) {
    return openDB().then(db => new Promise((res, rej) => {
      const t = db.transaction(STORE, mode), s = t.objectStore(STORE);
      let out; const rq = fn(s); if (rq) rq.onsuccess = () => { out = rq.result; };
      t.oncomplete = () => { db.close(); res(out); };
      t.onerror = t.onabort = () => { db.close(); rej(t.error); };
    }));
  }
  function clean(e) {
    const q = parseInt(e.quantity, 10);
    if (!e.barcode || !String(e.barcode).trim()) throw new Error('barcode required');
    if (!(q >= 0)) throw new Error('invalid quantity');
    return { barcode: String(e.barcode).trim(), quantity: q, model: String(e.model || '').trim(), ts: e.ts || new Date().toISOString() };
  }
  const Store = {
    all: () => tx('readonly', s => s.getAll()).then(a => a.sort((x, y) => y.ts.localeCompare(x.ts))),
    findByBarcode: b => tx('readonly', s => s.index('barcode').getAll(String(b).trim())).then(a => a[0] || null),
    add: e => tx('readwrite', s => s.add(clean(e))),
    update: (id, e) => tx('readwrite', s => s.put(Object.assign(clean(e), { id }))),
    remove: id => tx('readwrite', s => s.delete(id)),
    clear: () => tx('readwrite', s => s.clear()),
    /* add quantity to an existing barcode entry; keeps model unless a new one is given */
    addQuantity: async (id, extra, model) => {
      const all = await Store.all(); const cur = all.find(x => x.id === id);
      if (!cur) throw new Error('not found');
      return Store.update(id, { barcode: cur.barcode, quantity: cur.quantity + parseInt(extra, 10), model: model || cur.model, ts: new Date().toISOString() });
    },
    toCSV: rows => {
      const q = v => '"' + String(v).replace(/"/g, '""').replace(/^([=+\-@])/, "'$1") + '"';
      return '\ufeff' + ['barcode,quantity,model,timestamp'].concat(rows.map(r => [q(r.barcode), r.quantity, q(r.model), q(r.ts)].join(','))).join('\r\n') + '\r\n';
    }
  };
  root.Store = Store;
})(typeof window !== 'undefined' ? window : globalThis);
