const {chromium}=require('/node_modules/playwright-core');const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=q.url.split('?')[0];if(p.endsWith('/'))p+='index.html';const f=path.join(root,p);if(!f.startsWith(root)||!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
let pass=0;const ok=(c,m)=>{assert(c,m);pass++;console.log('PASS',m)};
(async()=>{await new Promise(r=>srv.listen(8099,r));const base='http://localhost:8099/';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+path.join(__dirname,'fixtures/cam.y4m')]});
const ctx=await browser.newContext({viewport:{width:390,height:800},permissions:['camera']});const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.goto(base);await page.waitForSelector('#list',{state:'attached'});
// decoder tests
for(const [n,exp] of [['ean13','5901234123457'],['code128','MODEL-AB12'],['code39','ABC123'],['upca','036000291452'],['qr','NOORA-QR-77']]){
 const b64=fs.readFileSync(path.join(__dirname,'fixtures',n+'.png')).toString('base64');
 const got=await page.evaluate(async b=>{const im=new Image();im.src='data:image/png;base64,'+b;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);return decodeCanvas(c)},b64);
 ok(got===exp,`decoder ${n} -> ${got}`)}
// storage logic
const s=await page.evaluate(async()=>{await Store.clear();const id=await Store.add({barcode:' 111 ',quantity:'3',model:'M1'});await Store.addQuantity(id,2);let r=await Store.all();const a=r[0];
 await Store.update(id,{barcode:'111',quantity:9,model:'M2'});const b=(await Store.all())[0];const f=await Store.findByBarcode('111');let bad=0;try{await Store.add({barcode:'',quantity:1})}catch(e){bad++}try{await Store.add({barcode:'x',quantity:-1})}catch(e){bad++}
 const csv=Store.toCSV([{barcode:'=1,"a"',quantity:1,model:'m',ts:'t'}]);await Store.remove(id);return {a,b,f:!!f,bad,csv,n:(await Store.all()).length}});
ok(s.a.quantity===5&&s.a.barcode==='111','add+addQuantity trims & sums');ok(s.b.model==='M2'&&s.b.quantity===9,'update');ok(s.f,'findByBarcode');ok(s.bad===2,'validation rejects');ok(s.csv.includes(`"'=1,""a"""`),'CSV escaping/formula guard');ok(s.n===0,'remove');
// UI: manual add
await page.click('#manualBtn');await page.fill('#fBarcode','8901234567890');await page.fill('#fQty','4');await page.fill('#fModel','XR-500');await page.click('#saveBtn');
await page.waitForSelector('li');ok((await page.textContent('li .bc')).includes('8901234567890'),'manual add shows in list');
// persistence across reload
await page.reload();await page.waitForSelector('li');ok((await page.$$('li')).length===1,'persists after reload');
// duplicate -> add quantity
await page.click('#manualBtn');await page.fill('#fBarcode','8901234567890');await page.dispatchEvent('#fBarcode','change');await page.waitForSelector('#dupMsg:not([hidden])');ok(true,'duplicate warning shown');
await page.fill('#fQty','6');await page.click('#addQtyBtn');await page.waitForTimeout(300);ok((await page.$$('li')).length===1&&(await page.textContent('li .meta')).includes('10'),'duplicate add-quantity sums to 10');
// edit
await page.click('li .edit');await page.fill('#fQty','7');await page.fill('#fModel','XR-600');await page.click('#saveBtn');await page.waitForTimeout(300);const t=await page.textContent('li');ok(t.includes('7')&&t.includes('XR-600'),'edit saved');
// language toggle
await page.click('#langBtn');ok(await page.getAttribute('html','dir')==='ltr','EN toggles LTR');await page.click('#langBtn');ok(await page.getAttribute('html','dir')==='rtl','Urdu RTL');await page.waitForTimeout(300);
await page.waitForTimeout(400);await page.screenshot({path:path.join(__dirname,'shot-list.png')});
// fake camera scan flow
await page.click('#scanBtn');await page.waitForFunction(()=>document.getElementById('fBarcode').value==='5901234123457',null,{timeout:15000});ok(true,'fake camera scan decoded 5901234123457 and opened form');
await page.screenshot({path:path.join(__dirname,'shot-scan-form.png')});
await page.fill('#fQty','2');await page.fill('#fModel','CAM-1');await page.click('#saveBtn');await page.waitForTimeout(300);ok((await page.$$('li')).length===2,'scanned entry saved');
// export download
const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#exportBtn')]);const csv=fs.readFileSync(await dl.path(),'utf8');ok(csv.includes('5901234123457')&&csv.includes('XR-600')&&csv.startsWith('\ufeffbarcode'),'CSV export contents');
// delete
page.on('dialog',d=>d.accept());await page.click('li .del');await page.waitForTimeout(300);ok((await page.$$('li')).length===1,'delete');
// manifest + SW offline
const mf=await (await page.request.get(base+'manifest.webmanifest')).json();ok(mf.name==='نُورا سکینر'&&mf.icons.length>=2,'manifest');
await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForTimeout(500);await ctx.setOffline(true);await page.reload();await page.waitForSelector('li');ok((await page.$$('li')).length===1,'works offline via service worker (data + app shell)');
ok(errs.length===0,'no page errors '+errs.join());
console.log(`ALL ${pass} PASSED`);await browser.close();srv.close()})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
