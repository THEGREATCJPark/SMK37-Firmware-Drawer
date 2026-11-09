import {expect,it} from 'vitest';
import {acquireMidiLease} from '../src/install/lease';
import {SelectedUpdater} from '../src/install/transport';
import {MockMidiDevice} from './mock-midi';
import {fixtureArtifact,fixtureBytes} from './fixtures';
import {logicalImage} from '../src/vendor/fm1pkg.js';
import type {MidiSession} from '../src/vendor/fm1ota.js';
it('같은 origin의 두 MIDI 세션은 동시에 잠금을 얻을 수 없다',async()=>{
  let held=false;
  const manager={request:async(_name:unknown,_opts:unknown,cb:(lock:unknown)=>Promise<void>)=>{
    if(held)return cb(null);held=true;try{await cb({name:'smk37-drawer-midi'});}finally{held=false;}
  }} as unknown as LockManager;
  const release=await acquireMidiLease(manager);
  await expect(acquireMidiLease(manager)).rejects.toThrow(/다른/);
  release();await new Promise(r=>setTimeout(r,0));const again=await acquireMidiLease(manager);again();
  await expect(acquireMidiLease(undefined)).rejects.toThrow(/지원/);
});
it('선택 어댑터는 선택하지 않은 다른 MIDI 포트에 요청하지 않는다',async()=>{
  const image=logicalImage(fixtureBytes),mock=new MockMidiDevice(image,fixtureArtifact.packageIdentity!);
  let stray=0;mock.access.inputs.set('other-in',{...mock.input,id:'other-in',name:'Other'});
  mock.access.outputs.set('other-out',{...mock.output,id:'other-out',name:'Other',send:()=>stray++});
  const up=new SelectedUpdater(mock.access as unknown as MIDIAccess,{inputId:mock.input.id,outputId:mock.output.id},async()=>{throw Error('unexpected selector');},null,null,{} as MidiSession,()=>{},new AbortController().signal);
  const found=await up.find();expect(found?.id.text).toBe('SMK-37 Pro_016');found?.link.closeNow();expect(stray).toBe(0);expect(mock.upgrades).toBe(0);
});
it('재연결 선택이 늦게 끝나도 닫힌 세션은 포트를 다시 열지 않는다',async()=>{
  const mock=new MockMidiDevice(logicalImage(fixtureBytes),fixtureArtifact.packageIdentity!);const abort=new AbortController();
  const up=new SelectedUpdater(mock.access as unknown as MIDIAccess,{inputId:mock.input.id,outputId:mock.output.id},async()=>{abort.abort(new Error('timeout'));return {inputId:mock.input.id,outputId:mock.output.id};},null,null,{} as MidiSession,()=>{},abort.signal);
  // Simulate the exact pending-selection state after upstream session restart.
  (up as unknown as {needsSelection:boolean}).needsSelection=true;
  await expect(up.find()).rejects.toThrow(/timeout/);expect(mock.sent).toHaveLength(0);
});
it('재열거 때 다른 모델을 고르면 다음 데이터 요청 전에 차단한다',async()=>{
  const mock=new MockMidiDevice(logicalImage(fixtureBytes),fixtureArtifact.packageIdentity!,'ota-FM-1_470');
  const request={artifact:fixtureArtifact,physical:'SMK-37 Pro' as const,family:'stock' as const,resume:false};
  const up=new SelectedUpdater(mock.access as unknown as MIDIAccess,{inputId:mock.input.id,outputId:mock.output.id},async()=>({inputId:mock.input.id,outputId:mock.output.id}),request,null,{} as MidiSession,()=>{},new AbortController().signal);
  Object.assign(up,{needsSelection:true,stage:'loader'});
  await expect(up.find()).rejects.toThrow(/모델/);expect(mock.upgrades).toBe(0);
});
