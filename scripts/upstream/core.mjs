import { createHash } from 'node:crypto';
export const LIMIT = 2 * 1024 * 1024;
export const SOURCES = Object.freeze({ 'sloop-pro':'isod89/sloop-pro', va:null, erik37:'genkigenki/erik37', frodhes:'leonardoMirabal/frodhes', obervave:'zvenson/obervave', choralroot:'Quixotic7/ChoralRootFM1', sloopdx:'zvenson/dxsloop' });
export const DISTRIBUTION = Object.freeze({ 'sloop-pro':['isod89/sloop-pro'], va:[], erik37:['genkigenki/smk37'], frodhes:['leonardoMirabal/frodhes','genkigenki/smk37'], obervave:['zvenson/obervave'], choralroot:['Quixotic7/ChoralRootFM1'], sloopdx:['THEGREATCJPark/SMK37-Firmware-Drawer'] });
export const safeError = error => String(error?.message ?? error).replace(/(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]+/g,'[redacted]').slice(0,500);
export async function fetchBounded(url, { fetchImpl = fetch, retries = 2, sleep = ms => new Promise(resolve => setTimeout(resolve,ms)), token, maxBytes = LIMIT } = {}) {
  for(let attempt=0;;attempt++) {
    try {
      const response=await fetchImpl(url,{signal:AbortSignal.timeout(20000),headers:{Accept:'application/vnd.github+json',...(token && new URL(url).hostname==='api.github.com'?{Authorization:`Bearer ${token}`}:{})}});
      if(!response.ok) {
        const error=Object.assign(new Error(`HTTP ${response.status}${response.status===403||response.status===429?' (rate limit or access denied)':''}`),{status:response.status});
        if((response.status===429||response.status>=500)&&attempt<retries) {const delay=Number(response.headers.get('retry-after'));await sleep(Number.isFinite(delay)&&delay>0?Math.min(delay*1000,3000):500*(attempt+1));continue;}
        throw error;
      }
      if(Number(response.headers.get('content-length'))>Math.min(maxBytes,LIMIT)) throw Error('Response exceeds 2 MiB');
      const reader=response.body.getReader(); const chunks=[]; let size=0;
      for(;;) {const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>Math.min(maxBytes,LIMIT)){await reader.cancel();throw Error('Response exceeds 2 MiB');}chunks.push(value);}
      return Buffer.concat(chunks);
    } catch(error) {if(error.status || /exceeds/.test(error.message) || attempt>=retries)throw error;await sleep(500*(attempt+1));}
  }
}
export async function checkProject(product, artifacts, previous, now, options={}) {
  const repo=SOURCES[product.id];
  const result={productId:product.id,repository:repo?`https://github.com/${repo}`:null,distributionRepositories:(DISTRIBUTION[product.id]??[]).map(r=>`https://github.com/${r}`),pinnedVersions:[...new Set(artifacts.filter(a=>a.productId===product.id).map(a=>a.version))].slice(0,40),checkedAt:now,lastSuccessfulAt:previous?.lastSuccessfulAt??null,status:'unknown',stale:Boolean(previous?.lastSuccessfulAt),error:null,latest:previous?.latest??null};
  if(!repo){result.error='No allowlisted GitHub release source; publisher must be checked separately.';return result;}
  try {
    const release=JSON.parse((await fetchBounded(`https://api.github.com/repos/${repo}/releases/latest`,options)).toString());
    if(!release||Array.isArray(release)||release.draft||release.prerelease)throw Error('Invalid stable release response');
    let latest=null;
    if(release){if(typeof release.tag_name!=='string'||release.tag_name.length>200)throw Error('Invalid release tag');latest={tag:release.tag_name,url:`https://github.com/${repo}/releases/tag/${encodeURIComponent(release.tag_name)}`,publishedAt:release.published_at&&Number.isFinite(Date.parse(release.published_at))?new Date(release.published_at).toISOString():null};}
    return {...result,status:latest?'observed':'no-release',lastSuccessfulAt:now,stale:false,error:null,latest};
  } catch(error){
    if(error.status===404)return {...result,status:'no-release',latest:null,lastSuccessfulAt:now,stale:false,error:null};
    return {...result,status:'unknown',error:safeError(error)};
  }
}
// Names and repositories are reviewed metadata, never executable install targets.
const DISCOVERY = {
 'felucca-smk':['Felucca SMK','ChanceTheMaker/felucca-smk'],obervave:['Obervave','zvenson/obervave'],makkuro37:['Makkuro37','genkigenki/Makkuro37'],vector37:['Vector37','genkigenki/Vector37'],snoop37:['Snoop37',null],x0x37:['x0x37',null],fomni37:['Fomni37',null],maku37:['Maku37',null],rainbow37:['Rainbow37',null],ghoulbox:['GHOULBOX',null],choralroot:['ChoralRoot','Quixotic7/ChoralRootFM1'],orbit:['Orbit',null],amb:['AMB',null],polly:['Polly',null],winamp:['Winamp',null],speak37:['Speak37','genkigenki/Speak37'],erik37:['Erik37','genkigenki/erik37'],dub:['Dub',null],ketch:['Ketch',null],melodee:['Melodee',null],fmel:['FMEL',null],frodhes:['Frodhes','leonardoMirabal/frodhes'],zen:['Zen',null],skiff:['Skiff',null],fomajam:['FomaJam',null]
};
export function normalizeDiscovery(data) {
  if(!data.smk37?.versions || typeof data.smk37.versions!=='object')throw Error('Invalid Hub SMK feed');
  return Object.entries(data.smk37.versions).filter(([id])=>DISCOVERY[id]).slice(0,30).map(([id,entry])=>({id,name:DISCOVERY[id][0],version:typeof entry.version==='string'?entry.version.slice(0,100):null,models:['SMK37 (Hub listing; model compatibility unverified)'],repository:DISCOVERY[id][1]?`https://github.com/${DISCOVERY[id][1]}`:null,sourceUrl:'https://thefirmwarehub.com/catalog.json',license:null}));
}
export function preserveAttestationVerdict(previous, attempt) {
  const same=previous?.sha256===attempt.sha256 && previous?.expectedRepository===attempt.expectedRepository;
  if(same && ['verified','failed'].includes(previous.status) && ['unavailable','missing'].includes(attempt.status)) {
    return {...previous,artifactIds:attempt.artifactIds,stale:true,lastAttemptAt:attempt.checkedAt,error:`Latest lookup ${attempt.status}: ${attempt.error??'No current result'}`.slice(0,500)};
  }
  return {...attempt,stale:false,lastAttemptAt:attempt.checkedAt};
}
export function reusableVerification(record, sha256, expectedRepository) {
  return Boolean(record && record.status==='verified' && record.sha256===sha256 && record.expectedRepository===expectedRepository && /^[a-f0-9]{40}$/.test(record.sourceCommit??'') && Number.isFinite(Date.parse(record.checkedAt)));
}
export function verifiedStatement(output, sha256, expectedRepository) {
  const entries=JSON.parse(output);
  if(!Array.isArray(entries))throw Error('Invalid verification response');
  const entry=entries.find(e=>e.verificationResult?.statement?.subject?.some(s=>s.digest?.sha256===sha256));
  if(!entry)throw Error('Verified statement does not match pinned SHA-256');
  const cert=entry.verificationResult.signature?.certificate;
  const commit=cert?.sourceRepositoryDigest ?? cert?.SourceRepositoryDigest;
  if(typeof commit!=='string'||!/^[a-f0-9]{40}$/.test(commit))throw Error('Verified certificate source commit unavailable');
  const repository=`https://github.com/${expectedRepository}`;
  if(cert.sourceRepositoryURI!==repository)throw Error('Verified certificate source repository mismatch');
  const dependencies=entry.verificationResult.statement.predicate?.buildDefinition?.resolvedDependencies;
  const matching=Array.isArray(dependencies)&&dependencies.some(d=>typeof d.uri==='string' && (d.uri===`git+${repository}` || d.uri.startsWith(`git+${repository}@`)) && d.digest?.gitCommit===commit);
  if(!matching)throw Error('Verified source dependency does not match certificate repository and commit');
  return commit;
}
export function checkPinned(bytes, artifact) {
  if(bytes.length>LIMIT||bytes.length!==artifact.size||createHash('sha256').update(bytes).digest('hex')!==artifact.sha256)throw Error('Pinned artifact size or SHA-256 mismatch');
}
