import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pack7,type Device} from '../src/vendor/fm1ota.js';
import {decodeBaudgirlDataReply,initializeBaudgirlData,validateBaudgirlFactory} from '../src/install/baudgirl-data';
const bytes=new Uint8Array(readFileSync('.local/integration/va-factory.syx'));
const presets=await validateBaudgirlFactory(bytes);
function response(kind:number,arg:number,data:Uint8Array,status=0){
  const body=[125,kind,status,arg&255,(arg>>>8)&255,(arg>>>16)&255,(arg>>>24)&255,data.length&255,data.length>>>8,...data];
  return [240,...pack7([...body,(~body.reduce((a,b)=>a+b,0))&255]),247];
}
class DataMock {
  queue:number[][]=[]; writes:number[][]=[]; installed=new Set<number>();patternParts=new Set<number>();saves=0;corrupt='';
  drain(){this.queue=[];}
  send(message:number[]){
    const cmd=message[4];
    if(cmd===4){this.writes.push([...message]);this.installed.add(message[5]);return true;}
    if(cmd===16){const slot=message[5],data=this.installed.has(slot)?presets[slot].expected.slice():new Uint8Array(187).fill(255);if(this.corrupt==='preset'&&this.installed.has(slot))data[0]^=1;this.queue.push(response(80,slot,data));return true;}
    if(cmd===34){
      const p=message[5],part=message[6];this.writes.push([...message]);this.patternParts.add(p*16+part);this.saves+=message[7];
      this.queue.push(response(82,p|(part<<8)|0x4000,new Uint8Array(),this.corrupt==='ack'?1:0));return true;
    }
    if(cmd===17){
      const addr=message.slice(5,10).reduce((n,v,i)=>n+v*2**(i*7),0),n=message[10]+message[11]*128,data=new Uint8Array(n);
      if(addr===0x1c0e840+5816){for(let p=0;p<16;p++)[18,34,50,98,118].forEach((o,i)=>data[o+p]=[50,50,6,16,0][i]);}
      else if(addr===0x1c76ca0)data.set(new TextEncoder().encode('FMLK'));
      else if(addr>=0x1c76d00&&addr<0x1c78d00)data.fill(255);
      else {data.fill(255);for(let i=0;i<n;i+=32){data[i+30]=0;data[i+31]=0;}if(this.corrupt==='pattern')data[30]=1;}
      this.queue.push(response(81,addr,data));return true;
    }
    throw Error('Unexpected wire command');
  }
  async read(){return this.queue.shift()??null;}
  device():Device{return {id:{text:'SMK-37+VA_102',model:'SMK-37+VA',version:102},name:'memory-only',link:this};}
}
const consent={factoryResetConfirmed:true,backupVerified:true,wait:async()=>{}};
it('decodes all128 pinned presets identically to separately researched public reference output',async()=>{
  // Hash obtained independently from public fm1preset.js readSyx on the pinned factory file.
  expect(createHash('sha256').update(Buffer.concat(presets.map(p=>Buffer.from(p.expected)))).digest('hex')).toBe('9669a0752e2035eb436158bf2ef9a7036669e2ba16790a803c28258ecd9e4034');
  expect(presets.map(p=>p.slot)).toEqual(Array.from({length:128},(_,i)=>i));
  const corrupt=bytes.slice();corrupt[20]^=1;await expect(validateBaudgirlFactory(corrupt)).rejects.toThrow('SHA-256');
});
it('writes/reads128 factory presets and256 empty-step messages, saves once, verifies every pattern',async()=>{
  const mock=new DataMock(),waits:number[]=[];
  await initializeBaudgirlData(mock.device(),bytes,{...consent,wait:async ms=>{waits.push(ms);}});
  expect(mock.installed.size).toBe(128);expect(mock.patternParts.size).toBe(256);expect(mock.saves).toBe(1);
  expect(waits).toEqual(Array(128).fill(3000));
  expect(mock.writes.filter(m=>m[4]===4).map(m=>Uint8Array.from(m))).toEqual(presets.map(p=>p.message));
  // Independently generated with the public reference's emptyBank/encodeStepsPart.
  expect(createHash('sha256').update(Buffer.concat(mock.writes.filter(m=>m[4]===34).map(m=>Buffer.from(m)))).digest('hex')).toBe('0eb55c08b2d07e42ffb14b65ff0a4411f5dfafb37a9e08f295cf8690d5fcc2b2');
  for(const m of mock.writes.filter(m=>m[4]===34)){expect(m.length).toBe(162);expect((m.slice(4,-1).reduce((a,b)=>a+b,0)+156)&127).toBe(0);}
});
it('skips already equal presets on retry',async()=>{
  const mock=new DataMock();for(let i=0;i<128;i++)mock.installed.add(i);
  await initializeBaudgirlData(mock.device(),bytes,consent);
  expect(mock.writes.filter(m=>m[4]===4)).toHaveLength(0);
});
for(const fault of ['preset','pattern','ack'])it(`does not complete on ${fault} mismatch/refusal`,async()=>{
  const mock=new DataMock();mock.corrupt=fault;
  await expect(initializeBaudgirlData(mock.device(),bytes,consent)).rejects.toThrow();
});
it('refuses wrong model, missing consent, invalid factory file and aborted run before writes',async()=>{
  for(const reason of ['model','consent','file','abort']){
    const mock=new DataMock(),device=mock.device(),abort=new AbortController();
    if(reason==='model')device.id.text='FM-1_102';if(reason==='abort')abort.abort();
    await expect(initializeBaudgirlData(device,reason==='file'?bytes.subarray(1):bytes,{...consent,factoryResetConfirmed:reason!=='consent',signal:abort.signal})).rejects.toThrow();
    expect(mock.writes).toHaveLength(0);
  }
});
it('rejects damaged data reply checksums and lengths',()=>{
  const msg=response(80,2,new Uint8Array(187));msg[9]^=1;
  expect(()=>decodeBaudgirlDataReply(msg)).toThrow();
  expect(()=>decodeBaudgirlDataReply([240,...pack7([125,80,0,0,0,0,0,255,255,0]),247])).toThrow();
});
