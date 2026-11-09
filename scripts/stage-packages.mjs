import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const catalog=JSON.parse(await readFile('src/catalog/catalog.json','utf8'));
await mkdir('public/packages',{recursive:true});
await writeFile('public/packages/GPL-3.0.txt',await readFile('LICENSE'));
const notices=catalog.artifacts.filter(a=>a.bundled&&a.method==='direct').map(a=>{
  const product=catalog.products.find(p=>p.id===a.productId);
  return {filename:`${a.sha256}.fwsc`,originalFilename:a.filename,sha256:a.sha256,author:product.author,license:product.license,
    originalRelease:a.releaseUrl,originalDownload:a.downloadUrl,source:product.repository+'/tree/'+a.sourceCommit,
    sourceArchive:product.repository+'/archive/'+a.sourceCommit+'.zip',licensing:product.repository+'/blob/'+a.sourceCommit+'/LICENSING.md'};
});
await writeFile('public/packages/NOTICE.json',JSON.stringify(notices,null,2));
for(const a of catalog.artifacts.filter(a=>a.bundled&&a.method==='direct')) {
  const path=`public/packages/${a.sha256}.fwsc`;let bytes;
  try{bytes=await readFile(path);}catch{
    try{bytes=await readFile(`.local/packages/${a.filename}`);}catch{
      for(let attempt=0;attempt<3;attempt++){
        try{const response=await fetch(a.downloadUrl,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error(`HTTP ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());break;}
        catch(error){if(attempt===2)throw error;}
      }
    }
  }
  if(bytes.length!==a.size||createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw Error(`${a.id}: package changed; build refused`);
  await writeFile(path,bytes);console.log(`${a.id}: pinned package staged`);
}
