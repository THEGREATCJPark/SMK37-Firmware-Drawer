import { expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { catalog } from '../src/catalog';
import { InstallController } from '../src/install/controller';
import type { InstallRecord,InstallRequest,Transport } from '../src/install/types';
import type { Identity } from '../src/vendor/fm1ota.js';
const artifact=catalog.artifacts.find(a=>a.id==='va-102-pro')!;
const bytes=new Uint8Array(readFileSync('.local/integration/va.fwsc'));
const factoryBytes=new Uint8Array(readFileSync('.local/integration/va-factory.syx'));
const consent={fullBackup:{model:'SMK-37 Pro' as const,verifiedByOwner:true,sha256:'a'.repeat(64)},recoveryReady:true,projectsAcknowledged:true,factoryResetConfirmed:true};
function rig(){
  let identity:Identity={text:'SMK-37 Pro_016',model:'SMK-37 Pro',version:16},calls=0;
  const records:InstallRecord[]=[];
  const transport:Transport={simulated:true,identify:async()=>identity,close:async()=>{},transfer:async()=>{calls++;return 'SMK-37+VA_102';}};
  const controller=new InstallController(transport,catalog.artifacts,async e=>{records.push(structuredClone(e));},()=>{},async()=>records);
  const request:InstallRequest={artifact,bytes,factoryBytes,physical:'SMK-37 Pro',family:'stock',resume:false};
  return {controller,transport,records,request,calls:()=>calls,setIdentity:(value:Identity)=>{identity=value;}};
}
it('VA는 펌웨어와 초기 음색을 모두 검사하고 별도 초기화 동의 없이는 전송하지 않는다',async()=>{
  const r=rig();await expect(r.controller.prepare({...r.request,factoryBytes:undefined})).rejects.toThrow(/초기 음색/);
  const corrupt=factoryBytes.slice();corrupt[10]^=1;await expect(r.controller.prepare({...r.request,factoryBytes:corrupt})).rejects.toThrow(/SHA/);
  await r.controller.prepare(r.request);await expect(r.controller.start({...consent,factoryResetConfirmed:false})).rejects.toThrow(/초기화/);expect(r.calls()).toBe(0);
});
it('VA 초기화 실패는 완료가 아니며 같은 중단 이력의 출발 identity만 데이터 재개에 사용한다',async()=>{
  const r=rig();await r.controller.prepare(r.request);
  r.transport.transfer=async(_image,_req,_identity,step)=>{step('setup','기본 음색 12/128');throw Error('setup interrupted');};
  await expect(r.controller.start(consent)).rejects.toThrow(/interrupted/);
  expect(r.records.at(-1)?.status).toBe('interrupted');expect(r.records.at(-1)?.previousIdentity).toBe('SMK-37 Pro_016');
  r.setIdentity({text:'SMK-37+VA_102',model:'SMK-37+VA',version:102});
  await r.controller.prepare({...r.request,resume:true,previousIdentity:'MKE-P37_016'});
  r.transport.transfer=async(_image,request)=>{expect(request.previousIdentity).toBe('SMK-37 Pro_016');expect(request.factoryResetConfirmed).toBe(true);return 'SMK-37+VA_102';};
  await r.controller.start(consent);expect(r.records.at(-1)?.status).toBe('completed');expect(r.records.at(-1)?.previousIdentity).toBe('SMK-37 Pro_016');
});
it('VA가 이미 실행 중이어도 중단 이력 없이 초기화 재개를 허용하지 않는다',async()=>{
  const r=rig();r.setIdentity({text:'SMK-37+VA_102',model:'SMK-37+VA',version:102});
  await expect(r.controller.prepare({...r.request,resume:true,previousIdentity:'SMK-37 Pro_016'})).rejects.toThrow(/이력/);
});
