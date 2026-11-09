import { expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Updater } from '../src/vendor/fm1ota.js';
import { logicalImage } from '../src/vendor/fm1pkg.js';
import { MockMidiDevice } from './mock-midi';
const timing={settle:0,reboot:0,step1Total:1000,step1Idle:200,loader:2000,back:2000,firstReq:150,idle:150,resend:[]};
const frodhes=logicalImage(new Uint8Array(readFileSync('.local/packages/frodhes-0.9.2.fwsc')));
for(const [file,product] of [['frodhes-0.9.2.fwsc','SMK-37 Pro_470'],['sloop-pro-2.8.4.fwsc','SMK-37 Pro_900'],['erik37.fwsc','SMK-37 Pro_480102'],['obervave-3.3.2-smk37.fwsc','SMK-37 Pro_9533'],['choralroot-0.29-smk37-1core.fwsc','SMK-37 Pro_920'],['frodhes-0.9.9-smk37-pro.fwsc','SMK-37 Pro_470']]){
  it(`${file}: 실제 전체 image를 MIDI 요청에 맞춰 전송하고 재열거 identity를 확인한다`,async()=>{
    const image=logicalImage(new Uint8Array(readFileSync('.local/packages/'+file)));const mock=new MockMidiDevice(image,product);
    const up=new Updater(mock.access,()=>{},{timing});const result=await up.install(image,product,()=>{},false,{refuseOldStock:true});
    expect(result).toBe(product);expect(Uint8Array.from(mock.received)).toEqual(image);expect(mock.mismatches).toBe(0);expect(mock.generation).toBe(3);
  },30000);
}
it('이미 loader인 상태의 재개도 재연결을 확인한다',async()=>{
  const mock=new MockMidiDevice(frodhes,'SMK-37 Pro_470','ota-SMK-37 Pro_900','none',true);const up=new Updater(mock.access,()=>{},{timing});
  expect(await up.resume(frodhes,()=>{},{package:'SMK-37 Pro_470',verify:true})).toBe('SMK-37 Pro_470');expect(mock.received.length).toBe(1536);
});
it('다른 loader, identity 없는 재개, FM-1 target은 업데이트 명령도 보내지 않는다',async()=>{
  for(const [identity,product] of [['ota-SMK-37 Pro_016','SMK-37 Pro_470'],['ota-SMK-37 Pro_900',''],['ota-SMK-37 Pro_900','FM-1_900'],['ota-FM-1_900','SMK-37 Pro_470']]){
    const mock=new MockMidiDevice(frodhes,product,identity);const up=new Updater(mock.access,()=>{},{timing});
    await expect(up.resume(frodhes,()=>{},{package:product,verify:true})).rejects.toThrow();expect(mock.upgrades).toBe(0);
  }
});
for(const fault of ['disconnect','timeout','bad-request','wrong-return'] as const){
  it(`${fault}: 전송 성공으로 만들지 않는다`,async()=>{
    const mock=new MockMidiDevice(frodhes,'SMK-37 Pro_470','ota-SMK-37 Pro_900',fault,true);const up=new Updater(mock.access,()=>{},{timing});
    const outcome=await up.resume(frodhes,()=>{},{package:'SMK-37 Pro_470',verify:true}).then(value=>({value,error:null}),error=>({value:null,error}));
    expect(outcome.error instanceof Error || outcome.value === false).toBe(true);
  },6000);
}
