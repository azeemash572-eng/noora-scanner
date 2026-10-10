const bwip=require('/tmp/z/node_modules/bwip-js'),fs=require('fs');
(async()=>{for(const [n,o] of Object.entries({ean13:{bcid:'ean13',text:'5901234123457'},code128:{bcid:'code128',text:'MODEL-AB12'},code39:{bcid:'code39',text:'ABC123'},upca:{bcid:'upca',text:'036000291452'},qr:{bcid:'qrcode',text:'NOORA-QR-77'}}))
 fs.writeFileSync(`fixtures/${n}.png`,await bwip.toBuffer({...o,scale:4,height:18,includetext:false,paddingwidth:20,paddingheight:20,backgroundcolor:'FFFFFF'}));})();
