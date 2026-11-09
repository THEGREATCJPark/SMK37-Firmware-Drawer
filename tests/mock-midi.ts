// In-memory Web MIDI device. No navigator, USB, COM, or physical ports are touched.
// Protocol framing follows SLOOP Pro web/test_pro.mjs (GPL-3.0-only),
// Copyright (C) 2026 Leo Kuroshita (@kurogedelic), Hügelton Instruments.
// Drawer additions: full-image comparison, invalid request, timeout and detach cases.
import { pack7,unpack7 } from '../src/vendor/fm1ota.js';
export type Fault='none'|'disconnect'|'timeout'|'bad-request'|'wrong-return';
export class MockMidiDevice {
  access:{inputs:Map<string,any>;outputs:Map<string,any>}={inputs:new Map(),outputs:new Map()};
  input:any;output:any;identity:string;sent:number[][]=[];received:number[]=[];mismatches=0;upgrades=0;generation=0;
  queue:Array<[number,number]>=[];waiting?:[number,number];
  constructor(public image:Uint8Array,public product:string,public initial='SMK-37 Pro_016',public fault:Fault='none',public sampleOnly=false){this.identity=initial;this.boot(initial);}
  boot(identity:string){
    for(const p of [...this.access.inputs.values(),...this.access.outputs.values()])p.state='disconnected';
    this.access.inputs.clear();this.access.outputs.clear();this.identity=identity;this.generation++;
    this.input={id:'in-'+this.generation,name:'SMK Test',state:'connected',onmidimessage:null,open:async()=>{},close:async()=>{}};
    this.output={id:'out-'+this.generation,name:'SMK Test',state:'connected',open:async()=>{},close:async()=>{},send:(d:number[])=>{this.sent.push([...d]);queueMicrotask(()=>this.receive([...d]));}};
    this.access.inputs.set(this.input.id,this.input);this.access.outputs.set(this.output.id,this.output);
  }
  tx(bytes:number[]){const input=this.input;queueMicrotask(()=>{if(input.state==='connected')input.onmidimessage?.({data:Uint8Array.from(bytes)});});}
  receive(d:number[]){
    if(d.join(',')==='240,0,50,69,0,0,0,64,127,247'){
      const text=[...new TextEncoder().encode(this.identity)];const u=[0,0x59,0x11,28,0,0,...text,...Array(27-text.length).fill(0)];
      u.push((~u.slice(6).reduce((a,b)=>a+b,0))&255);this.tx([0xf0,...pack7(u),0xf7]);return;
    }
    if(d.join(',')==='240,34,36,53,127,247'){
      this.upgrades++;if(this.fault==='timeout')return;
      const writing=this.identity.startsWith('ota-');
      const len=this.sampleOnly?Math.min(1536,this.image.length):this.image.length;
      this.queue=writing?Array.from({length:Math.ceil(len/512)},(_,i)=>[i*512,Math.min(512,len-i*512)] as [number,number]):[[0,64],[64,160],[4096,512]];
      this.queue.push([writing?0xf0000000:0xe0000000,8]);
      if(writing&&this.fault==='bad-request')this.queue.unshift([this.image.length+1,512]);this.next();return;
    }
    if(!this.waiting)return;
    const u=unpack7(d.slice(1,-1)),[addr,len]=this.waiting;this.waiting=undefined;
    if(addr<0xe0000000){
      const data=u.slice(14,14+len);
      if(data.some((b,i)=>b!==this.image[addr+i]))this.mismatches++;
      if(this.identity.startsWith('ota-'))this.received.push(...data);
    }
    if(addr===0xe0000000){setTimeout(()=>this.boot('ota-'+this.product),60);return;}
    if(addr===0xf0000000){setTimeout(()=>this.boot(this.fault==='wrong-return'?'SMK-37 Pro_999':this.product),20);return;}
    if(this.identity.startsWith('ota-')&&this.fault==='disconnect'&&this.received.length>=512){this.input.state='disconnected';this.output.state='disconnected';return;}
    this.next();
  }
  next(){const r=this.queue.shift();if(!r)return;this.waiting=r;const [a,n]=r;
    const u=[0,0x59,0x30,8,0,0,0,a&255,(a>>>8)&255,(a>>>16)&255,(a>>>24)&255,n&255,(n>>>8)&255,0];u.push((~u.slice(6).reduce((s,b)=>s+b,0))&255);this.tx([0xf0,...pack7(u),0xf7]);
  }
}
