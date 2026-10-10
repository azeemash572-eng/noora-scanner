/* Barcode decoding via bundled ZXing (vendor/zxing.min.js). */
(function (root) {
  const Z = root.ZXing;
  function makeReader() {
    const hints = new Map();
    const F = Z.BarcodeFormat;
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.CODE_93, F.ITF, F.CODABAR, F.QR_CODE, F.DATA_MATRIX, F.PDF_417, F.AZTEC]);
    hints.set(Z.DecodeHintType.TRY_HARDER, true);
    const r = new Z.MultiFormatReader();
    r.setHints(hints);
    return r;
  }
  const reader = makeReader();
  function decodeCanvas(canvas) {
    const src = new Z.HTMLCanvasElementLuminanceSource(canvas);
    for (const B of [Z.HybridBinarizer, Z.GlobalHistogramBinarizer]) {
      try { return reader.decode(new Z.BinaryBitmap(new B(src))).getText(); } catch (e) { /* NotFound */ }
    }
    // try inverted (white-on-black codes)
    try { return reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(src.invert()))).getText(); } catch (e) {}
    return null;
  }
  function decodeImageSource(img, w, h, maxW) {
    const scale = Math.min(1, (maxW || 1280) / w);
    const c = document.createElement('canvas');
    c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    c.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, c.width, c.height);
    return decodeCanvas(c);
  }
  function decodeBlob(blob) {
    return new Promise((res, rej) => {
      const img = new Image(); const url = URL.createObjectURL(blob);
      img.onload = () => {
        let t = decodeImageSource(img, img.naturalWidth, img.naturalHeight, 1600) || decodeImageSource(img, img.naturalWidth, img.naturalHeight, 900);
        URL.revokeObjectURL(url); res(t);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
      img.src = url;
    });
  }
  let stream = null, timer = null;
  async function start(video, onCode) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nocamera');
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    video.setAttribute('playsinline', ''); video.muted = true;
    video.srcObject = stream;
    await video.play();
    let busy = false;
    timer = setInterval(() => {
      if (busy || !video.videoWidth) return;
      busy = true;
      try { const t = decodeImageSource(video, video.videoWidth, video.videoHeight, 1024); if (t) onCode(t); } finally { busy = false; }
    }, 200);
  }
  function stop() {
    if (timer) clearInterval(timer); timer = null;
    if (stream) stream.getTracks().forEach(t => t.stop()); stream = null;
  }
  root.Scanner = { start, stop, decodeBlob, decodeCanvas };
})(window);
