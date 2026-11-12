import { describe, expect, it, vi } from 'vitest';
import { checkProject, fetchBounded, normalizeDiscovery, verifiedStatement, reusableVerification, preserveAttestationVerdict, checkPinned, LIMIT } from '../scripts/upstream/core.mjs';
import { selectPreviousSnapshot, previousDeployed, DEPLOYED_SNAPSHOT_URL } from '../scripts/upstream/snapshot.mjs';
import { UpdateSnapshotSchema } from '../src/catalog/updates';
const now='2026-11-12T00:00:00.000Z';
const release={tag_name:'v2.0',published_at:now,draft:false,prerelease:false,html_url:'https://evil.example'};
const options=(response:Response)=>({fetchImpl:vi.fn(async()=>response),sleep:async()=>{}});
describe('bounded upstream metadata',()=>{
 it('constructs source links from allowlist and does not follow release URLs',async()=>{
  const o=options(new Response(JSON.stringify(release)));
  const p=await checkProject({id:'frodhes',repository:'https://evil.example'},[{productId:'frodhes',version:'1.0'}],null,now,o);
  expect(p.latest.url).toBe('https://github.com/leonardoMirabal/frodhes/releases/tag/v2.0');
  expect(p.pinnedVersions).toEqual(['1.0']);expect(p.status).toBe('observed');
 });
 it('preserves last good result as stale unknown on rate limits',async()=>{
  const old={lastSuccessfulAt:now,latest:{tag:'v1',url:'https://github.com/leonardoMirabal/frodhes/releases/tag/v1',publishedAt:now}};
  const p=await checkProject({id:'frodhes'},[],old,now,options(new Response('',{status:403})));
  expect(p).toMatchObject({status:'unknown',stale:true,latest:old.latest});expect(p.error).toContain('403');
 });
 it('distinguishes a successful empty response from network exhaustion',async()=>{
  const empty=await checkProject({id:'frodhes'},[],null,now,options(new Response('',{status:404})));
  expect(empty.status).toBe('no-release');
  const fail=vi.fn(async()=>{throw Error('timeout')});
  const unknown=await checkProject({id:'frodhes'},[],null,now,{fetchImpl:fail,sleep:async()=>{}});
  expect(unknown.status).toBe('unknown');expect(fail).toHaveBeenCalledTimes(3);
 });
 it('does not fetch an arbitrary product or call no releases on an error',async()=>{
  const o=options(new Response('[]'));const p=await checkProject({id:'evil'},[],null,now,o);
  expect(o.fetchImpl).not.toHaveBeenCalled();expect(p.status).toBe('unknown');
 });
 it('retries transient errors with bounded retry-after',async()=>{
  const sleep=vi.fn(async()=>{});const f=vi.fn().mockResolvedValueOnce(new Response('',{status:429,headers:{'retry-after':'9999'}})).mockResolvedValue(new Response('[]'));
  expect((await fetchBounded('https://api.github.com/repos/a/b/releases',{fetchImpl:f,sleep})).toString()).toBe('[]');expect(sleep).toHaveBeenCalledWith(3000);
 });
 it('enforces actual streaming byte limit without a content length',async()=>{
  await expect(fetchBounded('https://api.github.com/a',options(new Response(new Uint8Array(LIMIT+1))))).rejects.toThrow('2 MiB');
 });
 it('ignores Hub provenance claims, arbitrary repositories and unknown entries',()=>{
  const items=normalizeDiscovery({smk37:{versions:{snoop37:{version:'7',verified:true,repo:'evil/repo'},evil:{version:'8'}}}});
  expect(items).toHaveLength(1);expect(items[0].repository).toBeNull();expect(items[0]).not.toHaveProperty('verified');
 });
 it('requires cryptographically verified statement subject and certificate commit',()=>{
  const sha='a'.repeat(64), commit='b'.repeat(40);
  const result=[{verificationResult:{statement:{subject:[{digest:{sha256:sha}}],predicate:{buildDefinition:{resolvedDependencies:[{uri:'git+https://github.com/zvenson/obervave@refs/tags/v1',digest:{gitCommit:commit}}]}}},signature:{certificate:{sourceRepositoryDigest:commit,sourceRepositoryURI:'https://github.com/zvenson/obervave'}}}}];
  expect(verifiedStatement(JSON.stringify(result),sha,'zvenson/obervave')).toBe(commit);
  expect(()=>verifiedStatement(JSON.stringify(result),'c'.repeat(64),'zvenson/obervave')).toThrow('match');
  expect(()=>verifiedStatement(JSON.stringify(result),sha,'evil/repo')).toThrow('repository mismatch');
  result[0].verificationResult.statement.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit='c'.repeat(40);
  expect(()=>verifiedStatement(JSON.stringify(result),sha,'zvenson/obervave')).toThrow('dependency');
  delete result[0].verificationResult.signature.certificate.sourceRepositoryDigest;
  expect(()=>verifiedStatement(JSON.stringify(result),sha,'zvenson/obervave')).toThrow('commit');
 });
 it('retains cryptographic verdicts when later lookup is unavailable or missing',()=>{
  const common={artifactIds:['a'],sha256:'a'.repeat(64),expectedRepository:'zvenson/obervave',checkedAt:now,error:null};
  for(const status of ['failed','verified'])for(const outcome of ['unavailable','missing']) {
   const prior={...common,status,sourceCommit:'b'.repeat(40)};
   const result=preserveAttestationVerdict(prior,{...common,status:outcome,checkedAt:'2026-11-13T00:00:00.000Z',sourceCommit:null,error:'timeout'});
   expect(result).toMatchObject({status,sourceCommit:prior.sourceCommit,checkedAt:now,stale:true,lastAttemptAt:'2026-11-13T00:00:00.000Z'});
  }
  expect(preserveAttestationVerdict({...common,status:'verified'},{...common,status:'failed'}).status).toBe('failed');
  expect(preserveAttestationVerdict({...common,status:'failed'},{...common,status:'verified'}).status).toBe('verified');
 });
 it('reuses only complete verified results for the exact artifact and repository',()=>{
  const sha='a'.repeat(64),repo='zvenson/obervave';
  const r={status:'verified',sha256:sha,expectedRepository:repo,sourceCommit:'b'.repeat(40),checkedAt:now};
  expect(reusableVerification(r,sha,repo)).toBe(true);
  for(const status of ['missing','failed','unavailable','not-checked'])expect(reusableVerification({...r,status},sha,repo)).toBe(false);
  expect(reusableVerification(r,'c'.repeat(64),repo)).toBe(false);expect(reusableVerification(r,sha,'evil/repo')).toBe(false);
  expect(reusableVerification({...r,sourceCommit:null},sha,repo)).toBe(false);
 });
 it('rejects a changed pinned package before gh is called',()=>{
  expect(()=>checkPinned(Buffer.from('changed'),{size:7,sha256:'a'.repeat(64)})).toThrow('mismatch');
 });
 it('uses only newer valid deployed snapshots and falls back on malformed or unavailable data',async()=>{
  const {readFile}=await import('node:fs/promises');const snapshot=JSON.parse(await readFile('public/updates.json','utf8'));
  expect(selectPreviousSnapshot(snapshot,{generatedAt:'2099-01-01T00:00:00.000Z'})).toEqual(snapshot);
  const newer={...snapshot,generatedAt:'2099-01-01T00:00:00.000Z'};
  expect(selectPreviousSnapshot(snapshot,newer)).toEqual(newer);
  expect(selectPreviousSnapshot(newer,snapshot)).toEqual(newer);
  const o=options(new Response('{broken'));expect(await previousDeployed(snapshot,o)).toEqual(snapshot);
  expect(o.fetchImpl.mock.calls[0][0]).toBe(DEPLOYED_SNAPSHOT_URL);
  expect(await previousDeployed(snapshot,options(new Response('',{status:503})))).toEqual(snapshot);
 });
 it('validates shipped snapshot and rejects fabricated incomplete verified state',async()=>{
  const {readFile}=await import('node:fs/promises');const snapshot=JSON.parse(await readFile('public/updates.json','utf8'));
  expect(UpdateSnapshotSchema.safeParse(snapshot).success).toBe(true);
  expect(UpdateSnapshotSchema.safeParse({...snapshot,projects:[...snapshot.projects,snapshot.projects[0]]}).success).toBe(false);
  snapshot.attestations[0].status='verified';snapshot.attestations[0].sourceCommit=null;
  expect(UpdateSnapshotSchema.safeParse(snapshot).success).toBe(false);
 });
});
