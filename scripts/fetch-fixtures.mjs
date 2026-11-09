import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const pinned='https://raw.githubusercontent.com/genkigenki/smk37/f41582ee99fad7f9eb32c3f6401548ac5fc9aec3/firmware/';
const files=[
  {name:'frodhes-0.9.2.fwsc',url:pinned+'frodhes-0.9.2.fwsc',sha:'3363807b50524989a3d0bc2a0e03649f8b79a73d6b804359a554e0cbea110463'},
  {name:'fm1-frodhes-0.9.7.fwsc',url:pinned+'fm1-frodhes-0.9.7.fwsc',sha:'ecf62e5420e1e5da5a01078ceb2c54d765c940d93070b90afc064c669297eaf3'},
  {name:'sloop-pro-2.8.4.fwsc',url:'https://github.com/isod89/sloop-pro/releases/download/v2.8.4/sloop-pro-2.8.4.fwsc',sha:'7c18163fd2088663ff057b729419e4ff3b08ceb77ad72072fced3c26a8aeb80a'},
];
const catalog=JSON.parse(await readFile('src/catalog/catalog.json','utf8'));
for(const a of catalog.artifacts.filter(a=>a.method==='direct'&&a.downloadUrl)){if(!files.some(f=>f.name===a.filename))files.push({name:a.filename,url:a.downloadUrl,sha:a.sha256});}
await mkdir('.local/packages',{recursive:true});
for(const f of files){
  const path='.local/packages/'+f.name;
  let bytes;try{bytes=await readFile(path);}catch{for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(f.url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error(`${f.name}: HTTP ${r.status}`);bytes=Buffer.from(await r.arrayBuffer());break;}catch(error){if(attempt===2)throw error;}}}
  if(createHash('sha256').update(bytes).digest('hex')!==f.sha)throw new Error(`${f.name}: SHA-256 mismatch; nothing replaced.`);
  await writeFile(path,bytes);console.log(`${f.name}: ${bytes.length} bytes, pinned SHA-256 OK (local-only fixture)`);
}
