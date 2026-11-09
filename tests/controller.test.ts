import { expect, it } from 'vitest';
import { InstallController } from '../src/install/controller';
import type { Consent, InstallRecord, Transport } from '../src/install/types';
import type { Identity } from '../src/vendor/fm1ota.js';
import { fixtureArtifact, fixtureBytes } from './fixtures';
const start:Identity={text:'SMK-37 Pro_016',model:'SMK-37 Pro',version:16};
const consent:Consent={fullBackup:{sha256:'b'.repeat(64),model:'SMK-37 Pro',verifiedByOwner:true},recoveryReady:true,projectsAcknowledged:true};
function rig() {
  const records:InstallRecord[]=[]; let transfers=0;
  const transport:Transport={simulated:true,identify:async()=>({...start}),close:async()=>{},transfer:async(_image,r,_start,onStep)=>{
    transfers++; onStep('start',start.text); onStep('write',1); onStep('written'); onStep('reboot'); onStep('done',r.artifact.packageIdentity!); return r.artifact.packageIdentity!;
  }};
  const controller=new InstallController(transport,[fixtureArtifact],async r=>{records.push(structuredClone(r));},()=>{},async()=>records);
  const req={artifact:fixtureArtifact,bytes:fixtureBytes,physical:'SMK-37 Pro' as const,family:'stock' as const,resume:false};
  return {controller,transport,records,req,transfers:()=>transfers};
}
it('파일 준비는 기록 명령을 보내지 않고 최종 클릭 이후 응답까지 기다린다',async()=>{
  const r=rig(); await r.controller.prepare(r.req); expect(r.controller.state.phase).toBe('ready'); expect(r.transfers()).toBe(0);
  await r.controller.start(consent); expect(r.controller.state.phase).toBe('completed'); expect(r.records.at(-1)?.simulated).toBe(true);
});
it('loader 이름만 같고 정확한 중단 파일 이력이 없으면 재개를 거절한다',async()=>{
  const r=rig();r.transport.identify=async()=>({text:'ota-SMK-37 Pro_470',model:'ota-SMK-37 Pro',version:470});
  await expect(r.controller.prepare({...r.req,resume:true})).rejects.toThrow(/이력/);expect(r.transfers()).toBe(0);
});
it('중단 이력의 실제 SHA와 모델이 맞아야 재개한다',async()=>{
  const r=rig();await r.controller.prepare(r.req);r.transport.transfer=async()=>{throw new Error('disconnect');};
  await expect(r.controller.start(consent)).rejects.toThrow();
  r.transport.identify=async()=>({text:'ota-SMK-37 Pro_470',model:'ota-SMK-37 Pro',version:470});
  await r.controller.prepare({...r.req,resume:true});expect(r.controller.state.phase).toBe('ready');
  r.records.at(-1)!.sha256='0'.repeat(64);
  await expect(r.controller.prepare({...r.req,resume:true})).rejects.toThrow(/이력/);
});
it('백업 준비가 없으면 쓰지 않는다',async()=>{
  const r=rig(); await r.controller.prepare(r.req);
  await expect(r.controller.start({...consent,recoveryReady:false})).rejects.toThrow(/백업|복구/); expect(r.transfers()).toBe(0);
});
it('중단 뒤 외부 설치기를 열었다면 같은 loader라도 재개 근거로 쓰지 않는다',async()=>{
  const r=rig();await r.controller.prepare(r.req);r.transport.transfer=async()=>{throw new Error('disconnect');};await expect(r.controller.start(consent)).rejects.toThrow();
  r.records.push({...r.records.at(-1)!,id:'external',startedAt:'2099-01-01T00:00:00.000Z',status:'external-opened'});
  r.transport.identify=async()=>({text:'ota-SMK-37 Pro_470',model:'ota-SMK-37 Pro',version:470});
  await expect(r.controller.prepare({...r.req,resume:true})).rejects.toThrow(/이력/);
});
it('준비 후 기기를 바꿔도 재확인에서 차단한다',async()=>{
  const r=rig(); await r.controller.prepare(r.req); r.transport.identify=async()=>({text:'FM-1_015',model:'FM-1',version:15});
  await expect(r.controller.start(consent)).rejects.toThrow(/모델|바뀌/); expect(r.transfers()).toBe(0);
});
it('재연결 identity가 다르면 완료 이력을 만들지 않는다',async()=>{
  const r=rig(); await r.controller.prepare(r.req); r.transport.transfer=async()=> 'SMK-37 Pro_999';
  await expect(r.controller.start(consent)).rejects.toThrow(/응답|식별/); expect(r.records.some(x=>x.status==='completed')).toBe(false);
});
it('기록 중 끊김은 중단 이력으로 남기며 자동 재전송하지 않는다',async()=>{
  const r=rig(); await r.controller.prepare(r.req); r.transport.transfer=async(_i,_r,_s,step)=>{step('write',4);throw new Error('USB 연결 끊김');};
  await expect(r.controller.start(consent)).rejects.toThrow(/끊김/); expect(r.controller.state.phase).toBe('interrupted');
  expect(r.records.at(-1)?.status).toBe('interrupted');
});
it('이중 설치 클릭과 설치 중 준비·닫기를 차단한다',async()=>{
  const r=rig(); await r.controller.prepare(r.req); let finish!:()=>void;
  r.transport.transfer=async()=>{await new Promise<void>(res=>{finish=res});return fixtureArtifact.packageIdentity!;};
  const one=r.controller.start(consent);
  await expect(r.controller.start(consent)).rejects.toThrow(/진행/);
  await expect(r.controller.prepare(r.req)).rejects.toThrow(/진행/);
  await expect(r.controller.close()).rejects.toThrow(/진행/);
  while(!finish) await new Promise(res=>setTimeout(res,1)); finish(); await one;
});
it('저장 실패 시 기록 진입 전 멈춘다',async()=>{
  const r=rig(); const c=new InstallController(r.transport,[fixtureArtifact],async()=>{throw new Error('저장 공간 부족');});
  await c.prepare(r.req); await expect(c.start(consent)).rejects.toThrow(/저장/); expect(r.transfers()).toBe(0);
});
