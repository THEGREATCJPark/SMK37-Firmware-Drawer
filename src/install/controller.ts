import { validateBaudgirlFactory } from './baudgirl-data';
import type { Artifact } from '../catalog/schema';
import type { Consent, InstallRecord, InstallRequest, InstallState, Transport } from './types';
import { assertRoute } from './policy';
import { validatePackage, type ValidatedPackage } from './package';
import type { Identity } from '../vendor/fm1ota.js';
export class InstallController {
  state:InstallState={phase:'idle',busy:false,message:'기기를 연결해 주세요.',requests:0,simulated:false};
  private prepared?: { request: InstallRequest; pkg: ValidatedPackage; identity: Identity };
  constructor(private transport:Transport,private approved:readonly Artifact[],private record:(r:InstallRecord)=>Promise<void>,private changed:(s:InstallState)=>void=()=>{}, private history:()=>Promise<InstallRecord[]>=async()=>[],private approvalBlock:(artifact:Artifact)=>string|null=()=>null) {
    this.state.simulated=transport.simulated;
  }
  private emit(patch:Partial<InstallState>) { this.state={...this.state,...patch}; this.changed({...this.state}); }
  private assertIdle() { if(this.state.busy) throw new Error('설치 작업이 진행 중입니다.'); }
  private async checkResume(r:InstallRequest) {
    if(!r.resume)return;
    const latest=(await this.history()).filter(e=>e.targetModel===r.physical&&e.simulated===this.transport.simulated).sort((a,b)=>b.startedAt.localeCompare(a.startedAt)||String(b.endedAt??'').localeCompare(String(a.endedAt??'')))[0];
    if(!latest || !['in-progress','interrupted'].includes(latest.status) || latest.sha256!==r.artifact.sha256 || latest.artifactId!==r.artifact.id)throw new Error('정확히 같은 파일의 최근 중단 이력이 없습니다. 원래 설치기의 복구 안내를 확인하세요.');
    return latest.previousIdentity;
  }
  async prepare(r:InstallRequest):Promise<void>{
    this.assertIdle(); this.prepared=undefined;
    this.emit({phase:'identifying',busy:true,message:'선택한 MIDI 포트의 실제 식별 응답을 읽고 있습니다.',requests:0});
    try {
      const known=this.approved.find(a=>a.id===r.artifact.id);
      if(!known || JSON.stringify(known)!==JSON.stringify(r.artifact)) throw new Error('검토된 카탈로그와 다른 manifest입니다.');
      const block=this.approvalBlock(r.artifact);if(block)throw new Error(block);
      const request=structuredClone(r); // Caller cannot swap bytes/model while hashing or installing.
      const identity=await this.transport.identify();
      this.emit({phase:'checking',identity,message:'모델과 출발 펌웨어의 전환 조건을 확인합니다.'});
      request.previousIdentity=await this.checkResume(request);
      assertRoute(identity,request.artifact,request.physical,request.family,request.resume,request.previousIdentity);
      this.emit({phase:'verifying-file',message:'SHA-256 · 실제 identity · CRC · 플래시 영역을 검사합니다.'});
      const pkg=await validatePackage(request.bytes,request.artifact);
      if(request.artifact.loaderFamily==='baudgirl'){if(!request.factoryBytes)throw new Error('+VA 초기 음색 파일을 먼저 준비하세요.');await validateBaudgirlFactory(request.factoryBytes);}
      await this.checkResume(request);
      this.emit({phase:'backup-review',message:'백업과 복구 준비 확인이 필요합니다.'});
      this.prepared={request,pkg,identity};
      this.emit({phase:'ready',artifact:request.artifact,message:'파일 검증을 마쳤습니다. 아래 준비 사항을 확인한 뒤 직접 설치를 시작하세요.'});
    } catch(error) { this.emit({phase:'failed',message:messageOf(error)}); throw error; }
    finally { this.emit({busy:false}); }
  }
  async start(consent:Consent):Promise<void>{
    this.assertIdle();
    const p=this.prepared;
    if(!p || this.state.phase!=='ready') throw new Error('기기와 파일을 다시 검사하세요.');
    const block=this.approvalBlock(p.request.artifact);if(block)throw new Error(block);
    if(!consent.fullBackup.verifiedByOwner || consent.fullBackup.model!==p.request.physical || !/^[a-f0-9]{64}$/.test(consent.fullBackup.sha256) || !consent.recoveryReady || !consent.projectsAcknowledged) {
      throw new Error('전체 백업 검증 기록, 복구 경로와 작업물 보존 확인이 필요합니다.');
    }
    if(p.request.artifact.experimental&&!consent.experimentalAcknowledged)throw new Error('실험 포트의 실기 미검증 확인이 필요합니다.');
    if(p.request.artifact.loaderFamily==='baudgirl'&&!consent.factoryResetConfirmed)throw new Error('+VA 음색·패턴 초기화 동의가 필요합니다.');
    p.request.factoryResetConfirmed=consent.factoryResetConfirmed===true;
    this.emit({busy:true,phase:'checking',message:'기기를 다시 확인합니다.'});
    let started=false; let entry:InstallRecord|undefined;
    try {
      const identity=await this.transport.identify();
      if(await this.checkResume(p.request)!==p.request.previousIdentity)throw new Error('준비 후 중단 기록의 출발 기기가 바뀌었습니다.');
      assertRoute(identity,p.request.artifact,p.request.physical,p.request.family,p.request.resume,p.request.previousIdentity);
      if(identity.text!==p.identity.text) throw new Error('준비 후 기기 응답이 바뀌었습니다. 다시 연결해 검사하세요.');
      await this.checkResume(p.request);
      entry={id:crypto.randomUUID(),startedAt:new Date().toISOString(),artifactId:p.request.artifact.id,productId:p.request.artifact.productId,
        sha256:p.pkg.sha256,targetModel:p.request.physical,previousIdentity:p.request.previousIdentity??identity.text,status:'in-progress',simulated:this.transport.simulated,
        browser:globalThis.navigator?.userAgent??'Node test',note:'기록 시작 전 저장. 새로고침 후에는 상태를 다시 검사해야 합니다.'};
      await this.record(entry); // No device mutation if the local journal could not be saved.
      const finalBlock=this.approvalBlock(p.request.artifact);if(finalBlock)throw new Error(finalBlock);
      started=true;
      this.emit({phase:p.request.resume?'writing':'entering-loader',message:'기기 요청에 응답하고 있습니다. USB·전원을 유지하세요.'});
      const returned=await this.transport.transfer(p.pkg.image.slice(),p.request,identity,(step,detail)=>{
        if(step==='setup')this.emit({phase:'initializing-data',message:String(detail)});
        else if(step==='write') this.emit({phase:'writing',requests:typeof detail==='number'?detail:0,message:'기기가 요청한 패키지 데이터를 전송하고 있습니다.'});
        else if(step==='verify') this.emit({phase:'entering-loader',requests:typeof detail==='number'?detail:0,message:'기기에서 패키지를 검사하고 loader를 준비합니다.'});
        else if(['loader','wait','reboot','back'].includes(step)) this.emit({phase:'reconnecting',message:step==='loader'?'업데이트 모드의 MIDI 포트를 다시 선택하세요.':'다시 연결된 기기의 응답을 확인합니다.'});
      });
      if(returned!==p.request.artifact.packageIdentity) throw new Error(`전송 후 식별 응답이 다릅니다: ${returned}`);
      entry={...entry,status:'completed',endedAt:new Date().toISOString(),reportedIdentity:returned,
        note:'전송과 재연결 identity 확인. 프로토콜은 이미지 해시·제품 버전을 증명하지 않음. 음색·패널 실기 미확인.'};
      await this.record(entry);
      this.emit({phase:'completed',message:this.transport.simulated?'모의 전송을 마쳤습니다. 실제 기기에는 기록하지 않았습니다.':'전송과 재연결 응답을 확인했습니다. 음색·패널·저장을 직접 점검하세요.'});
    } catch(error) {
      const msg=messageOf(error);
      if(entry) { try { await this.record({...entry,status:started?'interrupted':'failed',endedAt:new Date().toISOString(),note:msg}); } catch { /* Keep original error; UI also warns journal persistence may be incomplete. */ } }
      this.emit({phase:started?'interrupted':'failed',message:msg+(started?' 자동 재시도하지 않습니다. 같은 파일과 loader 상태를 확인해 재개하세요.':'')});
      throw error;
    } finally { this.prepared=undefined; this.emit({busy:false}); }
  }
  async close():Promise<void>{this.assertIdle();this.prepared=undefined;await this.transport.close();this.emit({phase:'idle',artifact:undefined,identity:undefined,message:'연결을 해제했습니다.'});}
}
export const messageOf=(e:unknown)=>e instanceof Error?e.message:String(e);
