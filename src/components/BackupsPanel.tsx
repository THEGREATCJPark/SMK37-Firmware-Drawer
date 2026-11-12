import { useEffect,useRef,useState } from 'react';
import { Download,Upload,Trash2,ShieldCheck,FileArchive,ExternalLink } from 'lucide-react';
import type { Model } from '../catalog/schema';
import { catalog } from '../catalog';
import { addBackup,download,exportBackup,importBackup,listBackups,removeBackup,saveFullBackup,getFullBackup,listHistory,assertBackupTarget,type Backup,type FullBackupRecord } from '../storage/vault';
import { validateDumpPair, type DumpValidation } from '../recovery/dumps';
import type { InstallRecord } from '../install/types';

export function BackupsPanel({model,onError,onRecovery}:{model:Model;onError:(e:unknown)=>void;onRecovery?:()=>void}){
  const [backups,setBackups]=useState<Backup[]>([]),[history,setHistory]=useState<InstallRecord[]>([]);
  const [record,setRecord]=useState<FullBackupRecord|null>(null),[sha,setSha]=useState(''),[reference,setReference]=useState(''),[verified,setVerified]=useState(false);
  const [productId,setProductId]=useState('sloop-pro'),[version,setVersion]=useState('2.8.4'),[schema,setSchema]=useState('project-v1'),[family,setFamily]=useState('SLOOP');
  const [kind,setKind]=useState<Backup['kind']>('project'),[notice,setNotice]=useState('');
  const [dumpFiles,setDumpFiles]=useState<[File|null,File|null]>([null,null]),[dumpResult,setDumpResult]=useState<DumpValidation|null>(null),[dumpBusy,setDumpBusy]=useState(false),[dumpOwner,setDumpOwner]=useState(false),[dumpMessage,setDumpMessage]=useState('');
  const dumpGeneration=useRef(0);
  useEffect(()=>{dumpGeneration.current++;setDumpFiles([null,null]);setDumpResult(null);setDumpOwner(false);setVerified(false);setSha('');setReference('');setNotice('');setDumpMessage('');setRecord(null);},[model]);
  function chooseDump(index:number,file:File|null){dumpGeneration.current++;setDumpFiles(current=>index===0?[file,current[1]]:[current[0],file]);setDumpResult(null);setDumpOwner(false);setDumpMessage('');}
  async function checkDumps(){const generation=++dumpGeneration.current;setDumpBusy(true);setDumpResult(null);setDumpOwner(false);try{if(!dumpFiles[0]||!dumpFiles[1])throw new Error('독립적으로 읽은 덤프 두 개를 선택하세요.');if(dumpFiles.some(f=>f?.size!==1048576))throw new Error('각 덤프는 정확히 1 MiB여야 합니다.');const bytes=await Promise.all(dumpFiles.map(async f=>new Uint8Array(await f!.arrayBuffer())));const result=await validateDumpPair(bytes[0],bytes[1]);if(generation!==dumpGeneration.current)return;setDumpResult(result);setDumpMessage('두 파일의 크기·바이트·SHA-256·trimdat 검사를 통과했습니다.');}catch(e){if(generation!==dumpGeneration.current)return;setDumpMessage(e instanceof Error?e.message:'덤프 검증 실패');}finally{setDumpBusy(false);}}
  async function registerValidated(){if(!dumpResult||!dumpOwner)return;try{await saveFullBackup({verificationMethod:'local-dump-pair',sha256:dumpResult.sha256,model,verifiedByOwner:true,reference,date:new Date().toISOString()});setNotice('두 파일 검증과 소유자 확인을 마친 기록을 등록했습니다. 덤프 원본은 별도로 보관하세요.');await reload();}catch(e){onError(e);}}
  const [removing,setRemoving]=useState<string|null>(null);
  async function reload(){setBackups(await listBackups());setHistory(await listHistory());setRecord(await getFullBackup(model));}
  useEffect(()=>{void reload().catch(onError);},[model]);
  async function register(){try{await saveFullBackup({verificationMethod:'owner-record',sha256:sha.trim().toLowerCase(),model,verifiedByOwner:true,reference,date:new Date().toISOString()});setNotice('사용자가 확인한 전체 백업 기록을 등록했습니다.');await reload();}catch(e){onError(e);}}
  async function upload(file:File){try{if(file.size>23*1024*1024)throw new Error('파일 크기가 23 MiB를 넘습니다.');if(file.name.endsWith('.drawer-backup.json'))await importBackup(await file.text());else await addBackup({name:file.name,kind,productId,family:family.trim(),version:version.trim(),schema:schema.trim()},new Uint8Array(await file.arrayBuffer()));setNotice('파일을 이 브라우저의 보관함에 추가했습니다.');await reload();}catch(e){onError(e);}}
  function compatibleExport(b:Backup){try{assertBackupTarget(b,{family,version,schema});download(b.name,b.bytes.slice().buffer);setNotice('대상 정보가 일치하는 파일을 저장했습니다. 기기 복원은 해당 에디터에서 직접 진행하세요.');}catch(e){onError(e);}}
  return <div className="workspace-panel">
    <div className="page-title"><div><h1>백업과 이력</h1><p>전체 백업 기록, 음색·프로젝트, 설치 파일을 구분해 보관합니다</p></div>{onRecovery&&<button className="button secondary" onClick={onRecovery}>복구 도우미</button>}</div>
    <div className="notice">파일은 이 브라우저에만 저장됩니다. 브라우저 데이터가 지워질 수 있으니 중요한 파일은 별도 저장장치에도 내보내세요.</div>
    {notice&&<p className="success-message" role="status">{notice}</p>}
    <section className="surface"><div className="section-label"><h2><ShieldCheck size={20}/>첫 설치 전 준비</h2><span className="pill muted">{model}</span></div>
      <p>전체 플래시·공장 보정값 백업의 <b>검증 기록</b>을 등록합니다. 이 앱이 기기에서 전체 백업을 생성한 것은 아닙니다.</p>
      <a className="inline-link" href="https://github.com/genkigenki/fm1-to-smk37/blob/54252ffa2219e3c9cd7eb70f4e99b361eaa048e1/docs/02-update-and-recovery.md#3-full-flash-backup-do-this-first" target="_blank" rel="noreferrer">PC 전체 백업·공식 복귀 절차 <ExternalLink size={14}/></a>
      {record&&<p className="success-message">{record.verificationMethod==='local-dump-pair'?'두 파일 검사 + 소유자 확인':record.verificationMethod==='owner-record'?'수동 소유자 확인':'기존 소유자 확인 · 검사 방법 미기록'} · {record.reference}<br/><code className="hash">{record.sha256}</code></p>}
      <p className="hint">파일 검사는 실물 모델이나 보정값의 정확성을 증명하지 않습니다. 같은 파일을 두 번 고르지 말고, 기기에서 독립적으로 읽은 두 덤프를 선택하세요. 검사용 원본은 보관함에 저장되지 않습니다.</p>
      <div className="form-grid">{[0,1].map(index=><label key={`${model}-${index}`}>전체 덤프 {index+1}<input type="file" disabled={dumpBusy} aria-label={`전체 덤프 ${index+1}`} onChange={e=>chooseDump(index,e.target.files?.[0]??null)}/></label>)}</div>
      <button className="button secondary" disabled={dumpBusy||!dumpFiles[0]||!dumpFiles[1]} onClick={()=>void checkDumps()}>{dumpBusy?'파일 검사 중':'두 덤프 로컬 검증'}</button>
      {dumpMessage&&<p role="status" className={dumpResult?'success-message':'notice'}>{dumpMessage}</p>}
      {dumpResult&&<code className="hash">SHA-256: {dumpResult.sha256}</code>}
      <label>보관 위치를 알아볼 수 있는 메모<input value={reference} onChange={e=>setReference(e.target.value)} placeholder="예: 외장 SSD와 개인 보관 폴더"/></label>
      <label className="check-row"><input type="checkbox" checked={dumpOwner} disabled={!dumpResult} onChange={e=>setDumpOwner(e.target.checked)}/>독립적으로 읽은 두 파일은 내 {model} 기기의 덤프이며, 원본을 서로 다른 두 곳에 보관했습니다.</label>
      <button className="button secondary" disabled={!dumpResult||!dumpOwner||reference.trim().length<3} onClick={()=>void registerValidated()}>파일 검증 후 소유자 확인 기록 등록</button>
      <details><summary>수동 검증 기록 등록 (앱의 파일 검사 아님)</summary>
        <p className="hint">외부에서 직접 검증한 결과를 기록합니다. 수동 등록은 이 앱이 원본 파일을 검사했다는 뜻이 아닙니다. 이전 버전에서 만든 기록은 검사 방법이 미기록으로 표시됩니다.</p>
        <label>외부에서 검증한 두 덤프의 SHA-256<input value={sha} onChange={e=>setSha(e.target.value)} placeholder="64자리 해시" spellCheck={false}/></label>
        <label className="check-row"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/>내 {model} 기기의 독립된 1 MiB 덤프 두 개가 같은 SHA-256이고, 0xC1224의 trimdat를 확인해 두 곳에 보관했습니다.</label>
        <button className="button secondary" disabled={!verified||!/^[a-fA-F0-9]{64}$/.test(sha)||reference.trim().length<3} onClick={register}>수동 사용자 검증 기록 등록</button>
      </details>
    </section>
    <section className="surface"><div className="section-label"><h2>내 파일 보관함</h2><span>{backups.length} 개 파일</span></div>
      <p className="hint">음색·곡·샘플은 각 펌웨어의 에디터에서 저장한 파일을 가져오세요. 패키지 파일만으로 프로젝트가 복구되지는 않습니다.</p>
      <div className="form-grid"><label>제품<select value={productId} onChange={e=>setProductId(e.target.value)}>{catalog.products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>파일 종류<select value={kind} onChange={e=>setKind(e.target.value as Backup['kind'])}><option value="project">음색·곡·샘플·설정</option><option value="full-flash">전체 플래시 덤프</option><option value="package">설치 패키지</option></select></label><label>펌웨어 계열 (family)<input value={family} onChange={e=>setFamily(e.target.value)}/></label><label>정확한 버전<input value={version} onChange={e=>setVersion(e.target.value)}/></label><label>파일 형식 (schema)<input value={schema} onChange={e=>setSchema(e.target.value)}/></label></div>
      <label className="file-label"><Upload size={18}/>백업 파일 또는 서랍 보관 파일 가져오기<input aria-label="백업 파일 가져오기" type="file" onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value='';}}/></label>
      {!backups.length&&<div className="empty"><FileArchive size={30}/><h3>보관한 파일이 없습니다</h3><p>펌웨어별 에디터에서 저장한 파일을 여기에 모아 두세요.</p></div>}
      <div className="file-list">{backups.map(b=><article key={b.id} className="file-row"><FileArchive size={22}/><div><strong>{b.name}</strong><p>{b.family} · {b.version} · {b.schema} · {b.size.toLocaleString()} bytes</p><details><summary>파일 무결성</summary><code className="hash">{b.sha256}</code></details></div><div className="file-actions"><button className="icon-button" aria-label={`${b.name} 서랍 파일 내보내기`} onClick={()=>download(b.name+'.drawer-backup.json',exportBackup(b),'application/json')}><Download size={18}/></button><button className="text-button" onClick={()=>compatibleExport(b)}>대상 확인 후 원본 저장</button>{removing===b.id?<><button className="text-button danger" onClick={()=>void removeBackup(b.id).then(()=>{setRemoving(null);return reload();}).catch(onError)}>보관함에서 삭제</button><button className="text-button" onClick={()=>setRemoving(null)}>유지</button></>:<button className="icon-button" aria-label={`${b.name} 삭제`} onClick={()=>setRemoving(b.id)}><Trash2 size={17}/></button>}</div></article>)}</div>
    </section>
    <section className="surface"><div className="section-label"><h2>설치 이력</h2><button className="text-button" disabled={!history.length} onClick={()=>download('smk37-history.json',JSON.stringify(history,null,2),'application/json')}><Download size={16}/>이력 내보내기</button></div>
      {!history.length?<p className="empty-text">아직 설치 기록이 없습니다. 외부 설치기를 연 기록과 완료 응답은 구분해서 남깁니다.</p>:history.map(h=><article key={h.id} className="history-row"><div><strong>{catalog.products.find(p=>p.id===h.productId)?.name??h.productId}</strong><p>{new Date(h.startedAt).toLocaleString('ko-KR')} · {h.targetModel}{h.simulated?' · 모의 시험':''}</p><p>{h.note}</p><details><summary>패키지와 환경</summary><p>{h.artifactId}</p><code className="hash">{h.sha256}</code><p>{h.browser}</p><p>이전: {h.previousIdentity} → 응답: {h.reportedIdentity??'미확인'}</p></details></div><span className="pill muted">{h.status==='completed'?'응답 확인':h.status==='external-opened'?'외부 설치기 열림':h.status==='in-progress'?'미완료 · 재확인 필요':'중단·실패'}</span></article>)}
    </section>
  </div>;
}
