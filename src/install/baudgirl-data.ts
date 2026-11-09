// Independently implemented from protocol/data-format facts in baudgirl's public editor.
// Only the pinned owner's factory download is accepted; no preset data is redistributed.
import { unpack7, type Device } from '../vendor/fm1ota.js';
import { sha256hex } from '../vendor/fm1pkg.js';
export const BAUDGIRL_FACTORY = Object.freeze({size:29568, sha256:'8e67df1ceda3ae814cc4bb982413ef88cc8435263869afc2f29327b7954e2a41', url:'https://baudgirl.com/fm1/presets/fm1-factory-presets.syx'});
const checksum = (data: ArrayLike<number>) => (-data.length-Array.from(data).reduce((a,b)=>a+b,0)) & 127;
const frame = (body: number[]) => [240,67,0,125,...body,checksum(body),247];
const equal = (a: Uint8Array,b: Uint8Array) => a.length===b.length && a.every((v,i)=>v===b[i]);
const pack = (data: Uint8Array) => {
  const output:number[]=[];
  for(let i=0;i<data.length;i+=7){const group=data.subarray(i,i+7);output.push(group.reduce((n,b,k)=>n|((b>>>7)<<k),0),...group.map(b=>b&127));}
  return output;
};
const unpack = (data: Uint8Array,n:number) => Uint8Array.from({length:n},(_,i)=>data[Math.floor(i/7)*8+1+i%7]|(((data[Math.floor(i/7)*8]>>>(i%7))&1)<<7));

// Yamaha DX7 VCED -> VMEM field map: destination byte and source bitfields.
function packedVoice(edit: Uint8Array): Uint8Array {
  const result = new Uint8Array(128);
  const fields:Array<[number,number,number,number]> = [[11,11,3,0],[11,12,3,2],[12,13,7,0],[12,20,15,3],[13,14,3,0],[13,15,7,2],[14,16,127,0],[15,17,1,0],[15,18,31,1],[16,19,127,0]];
  for(let op=0;op<6;op++){
    result.set(edit.subarray(op*21,op*21+11),op*17);
    for(const [dest,src,mask,shift] of fields) result[op*17+dest] |= (edit[op*21+src]&mask)<<shift;
  }
  result.set(edit.subarray(126,135),102);
  result[111]=(edit[135]&7)|((edit[136]&1)<<3);
  result.set(edit.subarray(137,141),112);
  result[116]=(edit[141]&1)|((edit[142]&7)<<1)|((edit[143]&7)<<4);
  result.set(edit.subarray(144,155),117);
  return result;
}
export interface FactoryPreset { slot:number; message:Uint8Array; expected:Uint8Array }
export async function validateBaudgirlFactory(input: Uint8Array): Promise<FactoryPreset[]> {
  const bytes=input.slice();
  if(bytes.length!==BAUDGIRL_FACTORY.size || await sha256hex(bytes)!==BAUDGIRL_FACTORY.sha256)throw new Error('+VA factory 파일 크기 또는 SHA-256이 다릅니다.');
  const slots=new Set<number>(),presets:FactoryPreset[]=[];
  for(let offset=0;offset<bytes.length;offset+=231){
    const m=bytes.slice(offset,offset+231),slot=m[5];
    if(m[0]!==240||m[1]!==67||m[2]!==0||m[3]!==125||m[4]!==4||m[230]!==247||slot>127||slots.has(slot)||m.subarray(1,230).some(b=>b>127)||checksum(m.subarray(6,229))!==m[229])throw new Error('+VA factory preset 구조가 다릅니다.');
    slots.add(slot);
    const expected=new Uint8Array(187);expected.set(packedVoice(m.subarray(6,161)));expected.set(unpack(m.subarray(161,229),59),128);
    presets.push({slot,message:m,expected});
  }
  if(slots.size!==128)throw new Error('+VA factory 128개 슬롯이 필요합니다.');
  return presets.sort((a,b)=>a.slot-b.slot);
}

interface Reply {kind:number;status:number;arg:number;data:Uint8Array}
export function decodeBaudgirlDataReply(input: ArrayLike<number>): Reply|null {
  const wire=Array.from(input);
  if(wire[0]!==240||wire[1]!==125||wire.at(-1)!==247)return null;
  if(wire.slice(1,-1).some(b=>b>127))throw new Error('+VA 응답 MIDI 데이터가 손상되었습니다.');
  const b=Uint8Array.from(unpack7(wire.slice(1,-1)));
  if(b.length<10||b[0]!==125)return null;
  const n=b[7]+256*b[8];
  if(b.length!==10+n||((~b.subarray(0,9+n).reduce((a,v)=>a+v,0))&255)!==b[9+n])throw new Error('+VA 응답 길이 또는 체크섬이 다릅니다.');
  return {kind:b[1],status:b[2],arg:new DataView(b.buffer).getUint32(3,true),data:b.slice(9,9+n)};
}
export interface BaudgirlDataOptions {
  factoryResetConfirmed:boolean; backupVerified:boolean; signal?:AbortSignal;
  onProgress?:(stage:'presets'|'patterns'|'verify-patterns',done:number,total:number)=>void;
  /** Tests use a no-op clock. Production must retain the default three-second write spacing. */
  wait?:(ms:number)=>Promise<void>;
}
export async function initializeBaudgirlData(device:Device,input:Uint8Array,options:BaudgirlDataOptions):Promise<void> {
  if(device.id.text!=='SMK-37+VA_102'||device.id.model!=='SMK-37+VA'||device.id.version!==102)throw new Error('+VA102 기기 확인이 필요합니다.');
  if(!options.factoryResetConfirmed||!options.backupVerified)throw new Error('검증된 백업과 factory preset·빈 패턴 초기화 동의가 필요합니다.');
  const presets=await validateBaudgirlFactory(input),link=device.link;
  const wait=options.wait??(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
  const check=()=>options.signal?.throwIfAborted();
  async function ask(message:number[],kind:number,arg:number,n:number,timeout=4000):Promise<Uint8Array>{
    check();link.drain();if(link.send(message)===false)throw new Error('+VA 연결이 끊어졌습니다.');
    const deadline=Date.now()+timeout;
    while(Date.now()<deadline){check();const raw=await link.read(Math.min(250,deadline-Date.now()));if(!raw)continue;
      const reply=decodeBaudgirlDataReply(raw);if(!reply||reply.kind!==kind||reply.arg!==arg)continue;
      if(reply.status!==0||reply.data.length!==n)throw new Error('+VA 기기가 요청을 거부했거나 응답 크기가 다릅니다.');
      return reply.data;
    }
    throw new Error('+VA 데이터 응답 시간이 초과되었습니다.');
  }
  const readPreset=(slot:number)=>ask(frame([16,slot]),80,slot,187);
  for(let k=0;k<presets.length;k++){
    check();const p=presets[k];options.onProgress?.('presets',k,128);
    if(!equal(await readPreset(p.slot),p.expected)){
      check();if(link.send(Array.from(p.message))===false)throw new Error('+VA preset 전송이 끊어졌습니다.');
      if(!equal(await readPreset(p.slot),p.expected))throw new Error(`+VA preset ${p.slot+1} 읽기 검증이 다릅니다.`);
      await wait(3000);
    }
  }
  options.onProgress?.('presets',128,128);
  const empty=new Uint8Array(128).fill(255);for(let i=0;i<4;i++){empty[i*32+30]=0;empty[i*32+31]=0;}
  const payload=new Uint8Array(133);payload.set([50,50,6,16,0]);payload.set(empty,5);
  for(let p=0;p<16;p++)for(let part=0;part<16;part++){
    const done=p*16+part;options.onProgress?.('patterns',done,256);
    await ask(frame([34,p,part,done===255?1:0,...pack(payload)]),82,p|(part<<8)|0x4000,0);
  }
  options.onProgress?.('patterns',256,256);
  const mem=(addr:number,n:number)=>ask(frame([17,...Array.from({length:5},(_,i)=>Math.floor(addr/2**(7*i))&127),n&127,n>>>7]),81,addr,n);
  const settings=await mem(0x1c0e840+5816,137),mark=await mem(0x1c76ca0,4);
  if(new TextDecoder().decode(mark)!=='FMLK')throw new Error('+VA 패턴 lock 표가 확인되지 않았습니다.');
  for(let p=0;p<16;p++){
    options.onProgress?.('verify-patterns',p,16);
    if([18,34,50,98,118].some((o,i)=>settings[o+p]!==[50,50,6,16,0][i]))throw new Error('+VA 패턴 설정 읽기 검증이 다릅니다.');
    for(let chunk=0;chunk<8;chunk++){
      const address=chunk<2?0x1c14cd0+p*512+chunk*256:0x1c79d30+p*1536+(chunk-2)*256;
      const data=await mem(address,256);
      if(data.some((v,i)=>v!==empty[i%128]))throw new Error('+VA 빈 패턴 읽기 검증이 다릅니다.');
    }
    for(let chunk=0;chunk<2;chunk++)if((await mem(0x1c76ca0+0x60+p*512+chunk*256,256)).some(v=>v!==255))throw new Error('+VA pattern lock 초기화 검증이 다릅니다.');
  }
  options.onProgress?.('verify-patterns',16,16);check();
}
