# نُورا سکینر — Noora Scanner (iPhone PWA)

Offline barcode stock-entry app. Scan a barcode with the phone camera, confirm quantity and model number, save locally (IndexedDB), list / edit / delete, export CSV. Urdu (RTL) by default, English toggle.
Decoder: @zxing/library 0.23 bundled locally (`zxing.min.js`, Apache-2.0) – no CDN. Uses native BarcodeDetector when present (Android Chrome), ZXing on iOS Safari.

## Host on GitHub Pages (English)
1. Create a public repo, upload all files in this folder (keep `.nojekyll`).
2. Settings -> Pages -> Deploy from branch `main`, folder `/ (root)`.
3. Open `https://<user>.github.io/<repo>/` on the iPhone in **Safari** (camera needs HTTPS).
4. Share button -> **Add to Home Screen**. Open it once online; afterwards it works offline.
When you update the app, bump `V` in `sw.js` so phones refresh the cache.

## ہوسٹ کرنے اور انسٹال کرنے کا طریقہ (اردو)
1. GitHub پر نیا پبلک ریپو بنائیں اور اس فولڈر کی تمام فائلیں اپ لوڈ کریں۔
2. Settings ← Pages ← Branch: main، فولڈر root منتخب کریں۔
3. آئی فون کے **Safari** میں لنک کھولیں (کیمرا کے لیے HTTPS ضروری ہے)۔
4. شیئر بٹن ← **Add to Home Screen**۔ ایک بار انٹرنیٹ پر کھولیں، پھر آف لائن بھی چلے گا۔

## استعمال
- «اسکین کریں» دبائیں، کیمرا کی اجازت دیں، بارکوڈ فریم میں رکھیں۔
- مقدار اور ماڈل نمبر لکھ کر «محفوظ کریں»۔
- اگر بارکوڈ پہلے سے ہو تو «مقدار جمع کریں» دبائیں یا موجودہ اندراج میں ترمیم کریں۔
- کیمرا نہ چلے تو «دستی اندراج»۔ «ترمیم» / «حذف» سے تبدیلی۔ «CSV ایکسپورٹ» سے فائل شیئر کریں۔
- اوپر EN / اردو بٹن سے زبان بدلیں۔

## Tests
`node tests/gen.js` (needs bwip-js) generates fixtures; `node tests/e2e.js` runs Playwright (system Chrome) tests: decoder, storage, UI flows, fake camera, offline.

## Limits
Camera scanning is untested on a real iPhone. iOS may clear website data after ~7 days of non-use if not installed to the Home Screen; export CSV regularly as backup.
