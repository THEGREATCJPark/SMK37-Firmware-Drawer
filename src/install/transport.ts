import { initializeBaudgirlData } from './baudgirl-data';
import { transferBaudgirl } from './baudgirl';
import { MidiSession, Updater, type Device, type Identity, type StepCallback } from '../vendor/fm1ota.js';
import type { InstallRequest, Transport } from './types';
import { assertRoute } from './policy';
import { acquireMidiLease } from './lease';

export interface PortChoice { inputId: string; outputId: string }
export interface PortOption { id:string; name:string }
export interface PortLists { inputs:PortOption[]; outputs:PortOption[] }
export type SelectPorts=(access:MIDIAccess,reason:string,signal:AbortSignal)=>Promise<PortChoice>;
const sessions=new Set<WebMidiTransport>();
export async function closeAllMidi(){await Promise.all([...sessions].map(s=>s.close()));}
export function portLists(access:MIDIAccess):PortLists {
  const list=(ports:Iterable<MIDIPort>)=>[...ports].filter(p=>p.state==='connected').map(p=>({id:p.id,name:p.name||'이름 없는 MIDI 포트'}));
  return {inputs:list(access.inputs.values()),outputs:list(access.outputs.values())};
}

// Upstream protocol, restricted to a pair explicitly selected by the user. No global MIDI scanning.
export class SelectedUpdater extends Updater {
  private needsSelection=false;
  private stage:'initial'|'loader'|'return'='initial';
  constructor(access:MIDIAccess,private choice:PortChoice,private select:SelectPorts,private request:Omit<InstallRequest,'bytes'>|null,
    private original:Identity|null, session:MidiSession, log:(s:string)=>void, private signal:AbortSignal) { super(access,log,{session,all:true}); }
  async restart(link:Device['link']):Promise<number> {
    this.stage=this.stage==='initial'?'loader':'return';
    this.needsSelection=true;
    return super.restart(link);
  }
  async find(filter?:(id:Identity)=>boolean):Promise<Device|null> {
    this.signal.throwIfAborted();
    const access=this.access as MIDIAccess;
    if(this.needsSelection) {
      this.choice=await this.select(access,this.stage==='loader'?'업데이트 모드로 돌아온 같은 기기의 포트를 선택하세요.':'설치 후 돌아온 같은 기기의 포트를 선택하세요.',this.signal);
      this.signal.throwIfAborted();
      this.needsSelection=false;
    }
    const input=access.inputs.get(this.choice.inputId),output=access.outputs.get(this.choice.outputId);
    if(!input || !output || input.state!=='connected' || output.state!=='connected') return null;
    this.access={inputs:new Map([[input.id,input]]),outputs:new Map([[output.id,output]])};
    let found:Device|null=null;
    try { found=await super.find(); } finally { this.access=access; }
    if(this.signal.aborted){found?.link.closeNow();this.signal.throwIfAborted();}
    if(!found) return null;
    try {
      if(this.request) {
        const {artifact,physical,family,resume}=this.request;
        if(this.stage==='initial') {
          assertRoute(found.id,artifact,physical,family,resume,this.request.previousIdentity);
          if(found.id.text!==this.original?.text) throw new Error('설치 직전 기기 식별자가 바뀌었습니다.');
        } else if(this.stage==='loader') assertRoute(found.id,artifact,physical,family,true,this.request.previousIdentity??this.original?.text);
        else if(found.id.text!==artifact.packageIdentity) throw new Error('재연결된 기기의 식별자가 목표와 다릅니다.');
      }
      if(filter&&!filter(found.id)) {found.link.closeNow();return null;}
      return found;
    } catch(e) {found.link.closeNow();throw e;}
  }
  async write(ota:Device,image:Uint8Array,step?:StepCallback) {
    // Resume starts in the loader, so the subsequent restart must expect the final app.
    this.stage='loader';
    return super.write(ota,image,step);
  }
}

export class WebMidiTransport implements Transport {
  readonly simulated=false;
  private session=new MidiSession();
  private abort=new AbortController();
  private releaseLease:(()=>void)|null=null;
  private access:MIDIAccess|null=null;
  private choice:PortChoice|null=null;
  constructor(private select:SelectPorts,private log:(s:string)=>void=()=>{}){}
  async connect():Promise<Identity> {
    await this.close();
    this.abort=new AbortController();
    this.releaseLease=await acquireMidiLease();
    sessions.add(this);
    if(!globalThis.isSecureContext) throw new Error('HTTPS 또는 PC의 localhost 보안 환경이 필요합니다.');
    this.access=await this.session.open(); // Only reached by the user's connect action.
    this.choice=await this.select(this.access,'내 기기의 MIDI 입력과 출력을 선택하세요.',this.abort.signal);
    return this.identify();
  }
  async identify():Promise<Identity> {
    if(!this.access||!this.choice) throw new Error('먼저 MIDI 연결을 눌러 기기를 선택하세요.');
    const up=new SelectedUpdater(this.access,this.choice,this.select,null,null,this.session,this.log,this.abort.signal);
    const device=await up.find();
    if(!device) throw new Error('선택한 포트에서 식별 응답이 없습니다. USB 데이터 케이블과 다른 MIDI 앱을 확인하세요.');
    device.link.closeNow();
    return device.id;
  }
  async transfer(image:Uint8Array,request:Omit<InstallRequest,'bytes'>,identity:Identity,onStep:StepCallback):Promise<string> {
    if(!this.access||!this.choice) throw new Error('MIDI 연결이 없습니다.');
    const up=new SelectedUpdater(this.access,this.choice,this.select,request,identity,this.session,this.log,this.abort.signal);
    try {
      const result=request.artifact.loaderFamily==='baudgirl'
        ? await transferBaudgirl(up,image,identity,{physical:request.physical,resume:request.resume,previousIdentity:request.previousIdentity,afterFirmware:async device=>{if(!request.factoryBytes)throw new Error('+VA 초기 음색 파일이 없습니다.');await initializeBaudgirlData(device,request.factoryBytes,{factoryResetConfirmed:request.factoryResetConfirmed===true,backupVerified:request.factoryResetConfirmed===true,signal:this.abort.signal,onProgress:(stage,done,total)=>onStep('setup',`${stage==='presets'?'기본 음색':stage==='patterns'?'빈 패턴 준비':'패턴 읽기 검증'} ${done}/${total} · USB·전원을 유지하세요.`)});}},onStep)
        : request.resume
        ? await up.resume(image,onStep,{package:request.artifact.packageIdentity,verify:true,anyModel:false})
        : await up.install(image,request.artifact.packageIdentity!,onStep,identity.text==='SMK-37+VA_102'&&request.family==='va',{refuseOldStock:true});
      if(typeof result!=='string') throw new Error('전송 또는 재연결 응답이 완료되지 않았습니다.');
      return result;
    } finally {await this.close();}
  }
  async close() {this.abort.abort(new Error('MIDI 세션이 닫혔습니다.'));try{await this.session.release();}finally{this.access=null;this.choice=null;sessions.delete(this);this.releaseLease?.();this.releaseLease=null;}}
}
