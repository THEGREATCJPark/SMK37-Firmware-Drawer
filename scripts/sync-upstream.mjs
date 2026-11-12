import { UpdateSnapshotSchema } from '../src/catalog/updates.ts';
import { previousDeployed, selectPreviousSnapshot } from './upstream/snapshot.mjs';
import { readFile, writeFile, mkdir, rename, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { checkProject, fetchBounded, normalizeDiscovery, verifiedStatement, reusableVerification, preserveAttestationVerdict, checkPinned, DISTRIBUTION, safeError, LIMIT } from './upstream/core.mjs';
const run=promisify(execFile);
const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const catalog=JSON.parse(await readFile('src/catalog/catalog.json','utf8'));
let previous;try{previous=JSON.parse(await readFile('public/updates.json','utf8'));}catch{previous=null;}
const now=new Date().toISOString();
const options={token:process.env.GH_TOKEN??process.env.GITHUB_TOKEN};
previous=selectPreviousSnapshot(previous,null);
if(process.argv.includes('--previous-deployed'))previous=await previousDeployed(previous,options);
const projects=[];
for(const product of catalog.products){projects.push(await checkProject(product,catalog.artifacts,previous?.projects?.find(p=>p.productId===product.id),now,options));}
const attestations=[];
const grouped=new Map();
for(const a of catalog.artifacts.filter(a=>a.bundled&&a.method==='direct')){const group=grouped.get(a.sha256)??[];group.push(a);grouped.set(a.sha256,group);}
for(const [sha256,artifacts] of grouped){
  const a=artifacts[0];const releaseRepo=a.releaseUrl.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\//)?.[1];
  if(!(DISTRIBUTION[a.productId]??[]).includes(releaseRepo))continue;
  let record={artifactIds:artifacts.map(a=>a.id),sha256,expectedRepository:releaseRepo,status:'not-checked',checkedAt:null,sourceCommit:null,error:null};
  const cached=previous?.attestations?.find(x=>x.sha256===sha256&&x.expectedRepository===releaseRepo);
  if(process.argv.includes('--verify-attestations') && !(process.argv.includes('--only-unchecked') && reusableVerification(cached,sha256,releaseRepo))){
    record.checkedAt=now;let temp;
    try{
      // Download only the pinned catalog URL from the allowlisted distribution repository.
      if(!a.downloadUrl.startsWith(`https://github.com/${releaseRepo}/releases/download/`))throw Error('Download is outside expected distribution repository');
      const bytes=await fetchBounded(a.downloadUrl,options);checkPinned(bytes,a);
      temp=await mkdtemp(join(tmpdir(),'smk-attestation-'));
      const path=join(temp,'artifact.fwsc');await writeFile(path,bytes);
      const {stdout}=await run('gh',['attestation','verify',path,'--repo',releaseRepo,'--format','json','--limit','10'],{timeout:45000,maxBuffer:LIMIT,windowsHide:true});
      record.sourceCommit=verifiedStatement(stdout,sha256,releaseRepo);record.status='verified';
    }catch(error){
      const detail=String(error.stderr??error.message??error);
      record.status=/no attestations found|no attestations|HTTP 404.*attestations/i.test(detail)?'missing':/verification failed|failed to verify|does not match|mismatch/i.test(detail)?'failed':'unavailable';
      record.error=record.status==='missing'?'No GitHub attestation found for this pinned digest.':safeError(detail);
    }finally{record=preserveAttestationVerdict(cached,record);if(temp && dirname(resolve(temp))===resolve(tmpdir()) && basename(temp).startsWith('smk-attestation-'))await rm(temp,{recursive:true,force:true});}
  } else {
    const prior=previous?.attestations?.find(x=>x.sha256===sha256&&x.expectedRepository===releaseRepo);
    if(prior)Object.assign(record,prior,{artifactIds:record.artifactIds});
  }
  attestations.push(record);
}
let discovery=previous?.discovery??{checkedAt:now,status:'not-checked',stale:false,error:null,items:[]};
if(process.argv.includes('--discover-hub')){
  // Respect the feed's one-read-per-day rule after successful and failed attempts alike.
  const recent=discovery.status!=='not-checked'&&Date.now()-Date.parse(discovery.checkedAt)<86400000;
  if(!recent){try{
    let bytes;try{const {stat}=await import('node:fs/promises');const path='.local/hub-catalog-review.json';if(Date.now()-(await stat(path)).mtimeMs<86400000)bytes=await readFile(path);}catch{}
    if(!bytes)bytes=await fetchBounded('https://thefirmwarehub.com/catalog.json',options);
    if(bytes.length>LIMIT)throw Error('Hub response exceeds 2 MiB');
    discovery={checkedAt:now,lastSuccessfulAt:now,status:'ok',stale:false,error:null,items:normalizeDiscovery(JSON.parse(bytes.toString().replace(/^\uFEFF/,'')))};
  }catch(error){discovery={...discovery,lastSuccessfulAt:discovery.lastSuccessfulAt??(discovery.status==='ok'?discovery.checkedAt:null),checkedAt:now,status:'unknown',stale:true,error:safeError(error)};}}
}
const snapshot={schemaVersion:1,generatedAt:now,projects,attestations,discovery};
UpdateSnapshotSchema.parse(snapshot);
const json=JSON.stringify(snapshot,null,2)+'\n';if(Buffer.byteLength(json)>200000)throw Error('Snapshot exceeds 200 KB');
await mkdir('public',{recursive:true});await writeFile('public/updates.json.tmp',json);await rename('public/updates.json.tmp','public/updates.json');
console.log(JSON.stringify({projects:projects.map(p=>({id:p.productId,status:p.status,tag:p.latest?.tag,error:p.error})),attestations:attestations.map(a=>({id:a.artifactIds[0],status:a.status,error:a.error})),discovery:discovery.items.length},null,2));
