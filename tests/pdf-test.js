const {chromium}=require('/node_modules/playwright-core');const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const srv=http.createServer((q,r)=>{let p=q.url.split('?')[0];if(p.endsWith('/'))p+='index.html';const f=path.join(root,p);if(!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
(async()=>{await new Promise(r=>srv.listen(8098,r));
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const page=await (await b.newContext({viewport:{width:390,height:800},acceptDownloads:true})).newPage();
const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:8098/');
await page.click('#pdfBtn');
const dir=process.argv[2];
await page.setInputFiles('#pdfFiles',[dir+'/a.jpg',dir+'/b.png']);
await page.setInputFiles('#pdfCam',[dir+'/c.jpg']);
await page.waitForFunction(()=>document.querySelectorAll('#pdfList li').length===3);
// reorder: move 3rd up (order a,c,b), remove nothing
await page.click('#pdfList li:nth-child(3) button[data-a=up]');
await page.screenshot({path:'/tmp/pt/ui.png'});
const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#pdfMake')]);
await dl.saveAs('/tmp/pt/out.pdf');console.log('name',dl.suggestedFilename());
// remove test + english label
await page.click('#pdfClose');await page.click('#langBtn');await page.click('#pdfBtn');console.log('EN label:',await page.textContent('#pdfMake'));
await page.click('#pdfList li:nth-child(1) button[data-a=rm]');console.log('after remove',await page.$$eval('#pdfList li',l=>l.length));
console.log('errors',errs);await b.close();srv.close()})();
