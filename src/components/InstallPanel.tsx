import { BAUDGIRL_FACTORY,validateBaudgirlFactory } from '../install/baudgirl-data';
import { useEffect,useRef,useState } from 'react';
import { Usb,FileCheck2,ArrowRight,ExternalLink,ShieldCheck,Download,ChevronDown } from 'lucide-react';
import type { Artifact, Model } from '../catalog/schema';
import { catalog } from '../catalog';
import { InstallController,messageOf } from '../install/controller';
import { downloadPackage,downloadBaudgirlFactory } from '../install/download';
import { validatePackage } from '../install/package';
import { WebMidiTransport, portLists, type PortChoice,type PortLists } from '../install/transport';
import type { CurrentFamily } from '../install/policy';
import type { Identity } from '../vendor/fm1ota.js';
import type { InstallState } from '../install/types';
import { addBackup,getFullBackup,listBackups,listHistory,saveHistory,type FullBackupRecord } from '../storage/vault';
import { Modal } from './Modal';

export function InstallPanel({artifact,model,onBusy,onError,onExternal,onBackups}:{artifact:Artifact;model:Model;onBusy:(v:boolean)=>void;onError:(e:unknown)=>void;onExternal:(a:Artifact)=>void;onBackups:()=>void}){
  const [ports,setPorts]=useState<{lists:PortLists;reason:string;resolve:(c:PortChoice)=>void;reject:(e:Error)=>void}|null>(null);
  const [inputId,setInputId]=useState(''),[outputId,setOutputId]=useState('');
  const [identity,setIdentity]=useState<Identity|null>(null),[connecting,setConnecting]=useState(false);
  const [family,setFamily]=useState<CurrentFamily>('unknown'),[file,setFile]=useState<File|null>(null);
  const [downloading,setDownloading]=useState(false),[received,setReceived]=useState(0);
  const fetchAbort=useRef<AbortController|null>(null),packageEdited=useRef(false);
  const [bytes,setBytes]=useState<Uint8Array|null>(null),[cached,setCached]=useState(false);
  const [experimentalAcknowledged,setExperimentalAcknowledged]=useState(false);
  const [factoryBytes,setFactoryBytes]=useState<Uint8Array|null>(null),[factoryReset,setFactoryReset]=useState(false);
  const [fullBackup,setFullBackup]=useState<FullBackupRecord|null>(null);
  const [recovery,setRecovery]=useState(false),[projects,setProjects]=useState(false),[resume,setResume]=useState(false);
  const [logs,setLogs]=useState<string[]>([]);
  const [state,setState]=useState<InstallState>({phase:'idle',busy:false,message:'기기 연결과 패키지 파일을 준비하세요.',requests:0,simulated:false});
  const transport=useRef<WebMidiTransport|null>(null),controller=useRef<InstallController|null>(null);
  if(!transport.current) transport.current=new WebMidiTransport((access,reason,signal)=>new Promise((resolve,reject)=>{
    const cleanup=()=>{access.removeEventListener('statechange',refresh);signal.removeEventListener('abort',abort);};
    const done=(c:PortChoice)=>{cleanup();setPorts(null);resolve(c);};
    const fail=(e:Error)=>{cleanup();setPorts(null);reject(e);};
    const refresh=()=>{const lists=portLists(access);setPorts({lists,reason,resolve:done,reject:fail});};
    const abort=()=>fail(new Error('연결 대기가 끝났습니다. 다시 연결해 기기 상태를 확인하세요.'));
    if(signal.aborted){abort();return;}
    setInputId('');setOutputId('');access.addEventListener('statechange',refresh);signal.addEventListener('abort',abort,{once:true});refresh();
  }),line=>setLogs(v=>[...v.slice(-149),line]));
  if(!controller.current) controller.current=new InstallController(transport.current,catalog.artifacts,saveHistory,setState,listHistory);
  useEffect(()=>{onBusy(state.busy||connecting||downloading);},[state.busy,connecting,downloading,onBusy]);
  useEffect(()=>{
    getFullBackup(model).then(setFullBackup).catch(onError);
    listBackups().then(items=>{const factory=items.find(b=>b.sha256===BAUDGIRL_FACTORY.sha256);if(factory&&!packageEdited.current)setFactoryBytes(new Uint8Array(factory.bytes));const found=items.find(b=>b.kind==='package'&&b.sha256===artifact.sha256);if(found&&!packageEdited.current){setBytes(new Uint8Array(found.bytes));setCached(true);}}).catch(onError);
    return()=>{fetchAbort.current?.abort();void transport.current?.close();};
  },[artifact.id,model]);
  useEffect(()=>{
    const prevent=(e:BeforeUnloadEvent)=>{if(state.busy){e.preventDefault();e.returnValue='';}};
    window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);
  },[state.busy]);
  async function download(){
    packageEdited.current=true;setDownloading(true);setReceived(0);setBytes(null);setCached(false);setFile(null);setFactoryBytes(null);
    const abort=new AbortController();fetchAbort.current=abort;const timer=setTimeout(()=>abort.abort(new Error('다운로드 시간이 초과되었습니다. 다시 시도해 주세요.')),60000);
    try{const result=await downloadPackage(artifact,abort.signal,setReceived);if(artifact.loaderFamily==='baudgirl')setFactoryBytes(await downloadBaudgirlFactory(abort.signal));setBytes(result);setFile(new File([result as BlobPart],artifact.filename!));}
    catch(error){if(!abort.signal.aborted)onError(artifact.personalHelper?new Error('개인 다운로드 도우미를 실행하고 브라우저의 로컬 네트워크 연결을 허용해 주세요. '+messageOf(error)):error);else onError(abort.signal.reason);}finally{clearTimeout(timer);setDownloading(false);}
  }
  async function connect(){setConnecting(true);try{const id=await transport.current!.connect();setIdentity(id);setResume(id.model.startsWith('ota-'));}catch(e){onError(e);await transport.current!.close();}finally{setConnecting(false);}}
  async function prepare(){try{if(!bytes)throw new Error('패키지 파일을 먼저 선택하세요.');await controller.current!.prepare({artifact,bytes,physical:model,family,resume,factoryBytes:factoryBytes??undefined});}catch(e){onError(e);}}
  async function cache(){try{if(!bytes) return;await validatePackage(bytes,artifact);await addBackup({name:artifact.filename!,kind:'package',productId:artifact.productId,family:artifact.family,version:artifact.version,schema:'fwsc-v1'},bytes);if(factoryBytes){await validateBaudgirlFactory(factoryBytes);await addBackup({name:'va-factory.syx',kind:'project',productId:'va',family:'va',version:'102',schema:'va-factory-v1'},factoryBytes);}setCached(true);}catch(e){onError(e);}}
  async function start(){try{if(!fullBackup)throw new Error('전체 백업의 검증 기록을 먼저 등록하세요.');await controller.current!.start({fullBackup,recoveryReady:recovery,projectsAcknowledged:projects,factoryResetConfirmed:factoryReset,experimentalAcknowledged});}catch(e){onError(e);}finally{setIdentity(null);}}
  const locked=state.busy||connecting||downloading;
  const ready=state.phase==='ready',needsFactory=artifact.loaderFamily==='baudgirl'&&!factoryBytes;
  const transferStage=['initializing-data','entering-loader','writing','reconnecting','completed','interrupted'].includes(state.phase);
  return <section className="install-panel">
    <ol className="install-steps" aria-label="설치 단계"><li aria-current={!ready&&!transferStage?'step':undefined}><span>1</span>기기·파일</li><li aria-current={ready?'step':undefined}><span>2</span>최종 확인</li><li aria-current={transferStage?'step':undefined}><span>3</span>설치·응답</li></ol>
    <p className="hint hardware-disclosure">이 앱의 실제 USB 설치는 아직 검증되지 않았습니다.</p>
    {artifact.experimental&&<p className="notice"><strong>실험 포트 · 실기 미검증</strong><br/>3개 모델 빌드와 모의 플래시 검사는 통과했지만, 실제 부팅·오디오·패널·저장·복구는 확인하지 못했습니다.</p>}
    <p className="notice">{artifact.dataImpact} 이 앱은 전체 플래시나 작업물을 자동 백업하지 않습니다.</p>
    <fieldset disabled={locked||ready}>
      <div className="install-step"><b>01</b><div><strong>내 기기 연결</strong><p>실물 선택: {model}<br/>응답: <code>{identity?.text??'아직 연결하지 않음'}</code></p></div><button className="button secondary" onClick={connect}><Usb size={16}/>{connecting?'연결 중…':'MIDI 연결'}</button></div>
      <label>기기에서 직접 확인한 현재 펌웨어<select value={family} onChange={e=>setFamily(e.target.value as CurrentFamily)}><option value="unknown">현재 펌웨어를 선택하세요</option><option value="stock">M-Vave 순정 V016</option><option value="sloop-pro">SLOOP Pro (identity _900)</option><option value="frodhes">Frodhes SMK (_470)</option><option value="erik37">Erik37 1.2 (_480102)</option><option value="obervave">OberVave 3.3.2 (_9533)</option><option value="choralroot">ChoralRoot SMK (_920)</option><option value="sloopdx-preview">sloopDX SMK preview.1 (_900)</option><option value="va">SMK-37+VA 102</option></select></label>
      <p className="hint">선택 목록에 없는 출발 펌웨어는 아직 전환을 지원하지 않습니다. USB 이름과 identity만으로 실물 모델·설치 버전을 확정할 수 없습니다.</p>
      <label className="check-row"><input type="checkbox" checked={resume} onChange={e=>setResume(e.target.checked)}/>중단한 설치 재개 — 이 앱의 최근 중단 이력·파일 SHA-256·loader를 모두 검사합니다.</label>
      <div className="install-step"><b>02</b><div><strong>고정된 패키지 파일</strong><p className="filename">{artifact.filename} · {artifact.size?.toLocaleString()} bytes</p></div></div>
      {artifact.personalHelper&&<div className="notice"><strong>+VA 개인 다운로드 도우미</strong><p>Windows에서 도우미 ZIP을 풀고 Start-Helper.cmd를 실행해 주세요. 아래 버튼으로 이 웹에서 파일을 받습니다. 브라우저가 요청하면 로컬 네트워크 연결을 허용하세요.</p><a className="inline-link" href="https://github.com/THEGREATCJPark/SMK37-Firmware-Drawer/releases/download/download-helper-v1/SMK37-Download-Helper-Windows.zip">Windows 도우미 다운로드</a><p>+VA는 순정 V016에서 설치합니다. 기본 음색 128개와 빈 패턴 16개를 준비하고 읽어 검증하며, 음색 기록에 약 7분 이상 걸릴 수 있습니다. 기존 음색·패턴은 초기화됩니다.</p></div>}
      <button className="button" onClick={download} disabled={!artifact.downloadUrl}><Download size={16}/>{downloading?`다운로드 중 ${Math.round(received/(artifact.size||1)*100)}%`:bytes?'패키지 다시 받기':'이 웹에서 패키지 받기'}</button><p className="hint">선택한 모델의 파일을 받아 SHA-256·CRC·모델·영역을 검사합니다. 다른 사이트를 열거나 파일을 직접 고를 필요가 없습니다.</p>
      <label className="file-label"><FileCheck2 size={20}/>{file?.name??(cached?'보관한 패키지를 불러왔습니다':'또는 내 컴퓨터의 .fwsc 파일 선택')}<input aria-label="설치 패키지 파일" type="file" accept=".fwsc" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{packageEdited.current=true;if(f.size>2*1024*1024)throw new Error('패키지 파일은 2 MiB 이하이어야 합니다.');setFile(f);setBytes(new Uint8Array(await f.arrayBuffer()));setCached(false);}catch(err){onError(err);}}}/></label>
      {artifact.personalHelper&&<p className="hint">초기 음색 파일: {factoryBytes?'검증 준비됨':'도우미 다운로드에 포함됩니다'}. 초기화 중 끊긴 뒤 이미 +VA102로 돌아왔다면 중단 설치 재개를 선택해 데이터 준비만 이어갈 수 있습니다.</p>}
      <details><summary>고정된 SHA-256</summary><code className="hash">{artifact.sha256}</code></details>
      <div className="button-row"><button className="button secondary" disabled={!bytes} onClick={cache}><Download size={16}/>{cached?'다시 검증·보관':'검증 후 오프라인 보관'}</button><button className="button" disabled={!identity||!bytes||needsFactory} onClick={prepare}>호환성·파일 검사 <ArrowRight size={16}/></button></div>
      {(!identity||!bytes||needsFactory)&&<p className="requirement-hint">검사 전 준비: {!identity&&!bytes?'MIDI 기기 연결과 패키지 파일 선택':!identity?'MIDI 기기 연결':!bytes?'패키지 파일 선택':'+VA 초기 음색 다운로드'}</p>}
    </fieldset>
    <div className={'install-status '+(state.phase==='interrupted'||state.phase==='failed'?'problem':'')} role="status"><strong>{state.phase==='completed'?'재연결 응답 확인':state.phase==='interrupted'?'중단됨 — 상태 확인 필요':state.phase==='failed'?'진행할 수 없습니다':ready?'설치 준비됨':locked?'기기와 통신 중':'설치 전 확인'}</strong><p>{state.message}</p>{state.requests>0&&<p>{state.requests.toLocaleString()}개 요청에 응답 · {state.phase==='writing'?'기록 단계':'준비 단계'}</p>}</div>
    {ready&&<div className="final-review">
      <h3>이 패키지로 바꿉니다</h3><p><b>{model} → {artifact.version}</b><br/>{artifact.filename}</p><p>{artifact.dataImpact}</p>
      <p className="backup-status"><ShieldCheck size={16}/>{fullBackup?`전체 백업: 사용자 검증 기록 등록 (${fullBackup.reference})`:'전체 백업 검증 기록이 없습니다.'}</p>
      {!fullBackup&&<button className="button secondary" onClick={onBackups}>백업·복구 준비 등록</button>}
      <label className="check-row"><input type="checkbox" checked={recovery} onChange={e=>setRecovery(e.target.checked)}/>내 모델의 돌아갈 패키지와 복구 도구를 준비했습니다.</label>
      <label className="check-row"><input type="checkbox" checked={projects} onChange={e=>setProjects(e.target.checked)}/>현재 음색·프로젝트를 별도 보관했고 데이터 초기화 가능성을 확인했습니다.</label>
      {artifact.loaderFamily==='baudgirl'&&<label className="check-row"><input type="checkbox" checked={factoryReset} onChange={e=>setFactoryReset(e.target.checked)}/>백업을 보관했으며, 기존 음색 128개를 기본 음색으로 바꾸고 패턴 16개를 비우는 데 동의합니다.</label>}
      {artifact.experimental&&<label className="check-row"><input type="checkbox" checked={experimentalAcknowledged} onChange={e=>setExperimentalAcknowledged(e.target.checked)}/>실제 부팅·오디오·패널·저장·복구가 검증되지 않은 실험 포트임을 확인했습니다.</label>}
      <button className="button primary-install" disabled={(artifact.experimental&&!experimentalAcknowledged)||!fullBackup||!recovery||!projects||locked||(artifact.loaderFamily==='baudgirl'&&!factoryReset)} onClick={start}>{resume?'같은 패키지로 재개':'이 기기에 설치 시작'} <ArrowRight size={17}/></button>
      <button className="text-button" onClick={()=>void controller.current!.close().then(()=>setIdentity(null)).catch(onError)}>준비 단계로 돌아가기</button>
    </div>}
    <details className="technical-log"><summary><ChevronDown size={15}/>기술 로그</summary><pre>{logs.join('\n')||'아직 MIDI 통신이 없습니다.'}</pre><p className="hint">포트 이름이 포함될 수 있습니다. 외부 공유 전 확인하세요.</p></details>
    <p className="hint">기록을 시작하면 취소로 원상 복구되지 않습니다. 탭·USB·전원·화면을 유지하세요. 자동 재시도나 강제 재부팅은 실행하지 않습니다.</p>
    <a className="inline-link" href={artifact.releaseUrl} target="_blank" rel="noreferrer">패키지 출처 <ExternalLink size={14}/></a>
    {ports&&<Modal title="MIDI 포트 선택" busy={false} onClose={()=>{ports.reject(new Error('기기 선택을 취소했습니다.'));setPorts(null);}}>
      <p>{ports.reason}</p><p className="hint">다른 MIDI 기기는 분리해 주세요. 선택한 입력·출력 쌍에만 식별 요청을 보냅니다.</p>
      <label>MIDI 입력<select value={inputId} onChange={e=>setInputId(e.target.value)}><option value="">입력 선택</option>{ports.lists.inputs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>MIDI 출력<select value={outputId} onChange={e=>setOutputId(e.target.value)}><option value="">출력 선택</option>{ports.lists.outputs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      {!ports.lists.inputs.length&&<p className="notice">연결된 MIDI 입력이 없습니다. 기기가 나타나면 이 목록이 갱신됩니다. 케이블과 전원을 확인하세요.</p>}
      <button className="button" disabled={!ports.lists.inputs.some(p=>p.id===inputId)||!ports.lists.outputs.some(p=>p.id===outputId)} onClick={()=>{ports.resolve({inputId,outputId});setPorts(null);}}>선택한 포트 확인</button>
    </Modal>}
  </section>;
}
