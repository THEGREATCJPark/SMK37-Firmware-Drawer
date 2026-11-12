import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {UpdateSnapshotSchema} from '../src/catalog/updates';
import {matchingAttestation,approvalProblem,snapshotIsOld,fetchUpdateSnapshot,UPDATE_MAX_BYTES} from '../src/catalog/update-client';
import {catalog} from '../src/catalog';
import {InstallController} from '../src/install/controller';
import {fixtureArtifact,fixtureBytes} from './fixtures';
import type {Transport,Consent} from '../src/install/types';
const snapshot=()=>UpdateSnapshotSchema.parse(JSON.parse(readFileSync('public/updates.json','utf8')));
afterEach(()=>vi.unstubAllGlobals());
it('배포 snapshot은 schema를 통과하고 출처 증명은 정확한 artifact·hash·저장소에만 적용한다',()=>{
 const s=snapshot(),a=catalog.artifacts.find(a=>a.productId==='obervave'&&a.method==='direct')!;
 expect(matchingAttestation(s,a)).toBeDefined();expect(approvalProblem(s,a)).toBeNull();
 expect(matchingAttestation(s,{...a,sha256:'0'.repeat(64)})).toBeUndefined();
 expect(matchingAttestation(s,{...a,releaseUrl:'https://github.com/other/repo/releases/tag/v1'})).toBeUndefined();
 const proof=matchingAttestation(s,a)!;proof.status='failed';expect(approvalProblem(s,a)).toMatch(/검증이 실패/);
 proof.status='unavailable';expect(approvalProblem(s,a)).toBeNull();proof.status='verified';proof.sourceCommit='a'.repeat(40);expect(approvalProblem(s,a)).toMatch(/소스가 다릅니다/);
});
it('오래되거나 미래 시각인 배포 자료를 최신으로 취급하지 않는다',()=>{
 const s=snapshot(),time=Date.parse(s.generatedAt);expect(snapshotIsOld(s,time)).toBe(false);expect(snapshotIsOld(s,time+49*3600000)).toBe(true);expect(snapshotIsOld(s,time-3600000)).toBe(true);
});
it('배포 fetch는 과대 응답과 비정상 schema를 거부한다',async()=>{
 vi.stubGlobal('document',{baseURI:'https://example.test/drawer/'});
 for(const body of [new Uint8Array(UPDATE_MAX_BYTES+1),new TextEncoder().encode('{"schemaVersion":99}')]){
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(body)));await expect(fetchUpdateSnapshot(new AbortController().signal)).rejects.toThrow();
 }
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(snapshot()))));expect((await fetchUpdateSnapshot(new AbortController().signal)).schemaVersion).toBe(1);
});
it('출처 검증 실패는 prepare와 이미 준비한 start에서 모두 기기 기록 전에 차단한다',async()=>{
 let block:string|null='출처 실패',calls=0;
 const transport:Transport={simulated:true,identify:async()=>({text:'SMK-37 Pro_016',model:'SMK-37 Pro',version:16}),close:async()=>{},transfer:async()=>{calls++;return fixtureArtifact.packageIdentity!;}};
 const c=new InstallController(transport,[fixtureArtifact],async()=>{},()=>{},async()=>[],()=>block);
 const request={artifact:fixtureArtifact,bytes:fixtureBytes,physical:'SMK-37 Pro' as const,family:'stock' as const,resume:false};
 await expect(c.prepare(request)).rejects.toThrow('출처 실패');block=null;await c.prepare(request);block='검토 필요';
 const consent:Consent={fullBackup:{sha256:'a'.repeat(64),model:'SMK-37 Pro',verifiedByOwner:true},recoveryReady:true,projectsAcknowledged:true};
 await expect(c.start(consent)).rejects.toThrow('검토 필요');expect(calls).toBe(0);
});
it('최종 이력 저장 대기 중 출처 차단이 도착해도 transfer를 호출하지 않는다',async()=>{
 let block:string|null=null,calls=0,release:(()=>void)|undefined;
 const transport:Transport={simulated:true,identify:async()=>({text:'SMK-37 Pro_016',model:'SMK-37 Pro',version:16}),close:async()=>{},transfer:async()=>{calls++;return fixtureArtifact.packageIdentity!;}};
 const c=new InstallController(transport,[fixtureArtifact],async record=>{if(record.status==='in-progress')await new Promise<void>(resolve=>{release=resolve;});},()=>{},async()=>[],()=>block);
 await c.prepare({artifact:fixtureArtifact,bytes:fixtureBytes,physical:'SMK-37 Pro',family:'stock',resume:false});
 const running=c.start({fullBackup:{sha256:'a'.repeat(64),model:'SMK-37 Pro',verifiedByOwner:true},recoveryReady:true,projectsAcknowledged:true});
 const rejected=expect(running).rejects.toThrow('새 출처 차단');
 while(!release)await new Promise(resolve=>setTimeout(resolve,0));block='새 출처 차단';release();await rejected;expect(calls).toBe(0);expect(c.state.phase).toBe('failed');
});
