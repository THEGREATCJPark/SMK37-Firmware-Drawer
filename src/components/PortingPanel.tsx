import { useEffect,useState } from 'react';
import { ArrowDownToLine,Upload,ExternalLink,FlaskConical,PackageCheck } from 'lucide-react';
import type { Model,Product } from '../catalog/schema';
import { catalog,primaryArtifact } from '../catalog';
import { createPortJob } from '../porting/jobs';
import { validateBundle, type BuildBundle } from '../porting/bundle';
import { download,listBuilds,saveBuild } from '../storage/vault';
export function PortingPanel({model,onError,onSelect}:{model:Model;onError:(e:unknown)=>void;onSelect:(p:Product)=>void}){
  const [builds,setBuilds]=useState<BuildBundle[]>([]),[message,setMessage]=useState('');
  useEffect(()=>{listBuilds().then(b=>setBuilds(b as BuildBundle[])).catch(onError);},[]);
  function job(product:Product,build=false){download(product.id+'.smk37-port-job.json',JSON.stringify(createPortJob(product,catalog,model,build),null,2),'application/json');setMessage('Desktop Codex용 작업 파일을 내보냈습니다. 새 매핑은 실제 포팅 전에 확정하세요.');}
  async function importBuild(file:File){try{if(file.size>4*1024*1024)throw new Error('번들은 4 MiB 이하이어야 합니다.');const b=await validateBundle(await file.text());await saveBuild(b.package.sha256,b);setBuilds(await listBuilds() as BuildBundle[]);setMessage('모델·구조·해시를 확인했습니다. 개발 결과 보관함에 실기 미확인 상태로 등록했습니다.');}catch(e){onError(e);}}
  const candidates=catalog.products.filter(p=>primaryArtifact(p.id,model)?.status==='port-required');
  const sloop=catalog.products.find(p=>p.id==='sloop-pro')!;
  return <div className="workspace-panel"><div className="page-title"><div><span className="eyebrow">THE WORKBENCH</span><h1>포팅 작업실</h1><p>다음 악기를 위한 준비. 빌드와 기기 설치를 분리합니다.</p></div><FlaskConical size={38}/></div>
    {message&&<p className="success-message" role="status">{message}</p>}
    <section className="surface"><div className="section-label"><h2>먼저, 기존 SMK 패키지 확인</h2><span className="pill">1 → 2 → 3</span></div><div className="process-grid"><div><b>01</b><h3>배포된 패키지</h3><p>SMK37용 빌드가 이미 있으면 서랍의 검토된 설치 경로를 사용합니다.</p></div><div><b>02</b><h3>지원 대상 재현 빌드</h3><p>BOARD=smk37를 지원하는 고정 소스를 Desktop에서 빌드합니다.</p></div><div><b>03</b><h3>새로운 포팅</h3><p>입력 매핑·저장 주소·보호 영역을 검토하는 별도 작업 명세를 만듭니다.</p></div></div></section>
    <section className="surface"><div className="section-label"><h2>SLOOP Pro · 빌드 경로</h2><span className="pill muted">기존 보드 지원</span></div><p>고정 커밋의 기존 Pro 매핑을 사용합니다. FM-1 기준 빌드와 비교하고, 결과를 아래로 가져올 수 있습니다.</p><div className="button-row"><button className="button secondary" onClick={()=>onSelect(sloop)}>공개 패키지 보기</button><button className="button" disabled={model!=='SMK-37 Pro'} onClick={()=>job(sloop,true)}><ArrowDownToLine size={17}/>재현 빌드 작업 내보내기</button></div><p className="hint">PC 실행 방법: 프로젝트의 docs/porting-workflow.md · scripts/firmware/build.py. 브라우저는 소스나 셸 명령을 실행하지 않습니다.</p></section>
    <section className="surface"><div className="section-label"><h2>FM-1 → SMK37 준비 대기</h2><span>{candidates.length} PROJECTS</span></div>{candidates.map(p=><article className="job-row" key={p.id}><div><span className="pill amber">포팅 필요</span><h3>{p.name}</h3><p>{p.description}</p><p className="hint">{p.license}</p><a className="inline-link" href={p.repository} target="_blank" rel="noreferrer">원본 소스 <ExternalLink size={14}/></a></div><button className="button secondary" onClick={()=>job(p)}><ArrowDownToLine size={17}/>포팅 작업 내보내기</button></article>)}</section>
    <section className="surface"><div className="section-label"><h2>개발 결과 보관함</h2><span className="pill muted">일반 설치와 분리</span></div><p>metadata·패키지·SHA-256·검사 결과가 든 <code>.drawer-bundle.json</code>을 가져오세요. 빌드 결과는 일반 설치 카드로 자동 등록되지 않습니다.</p><label className="file-label"><Upload size={18}/>완성 번들 가져오기<input aria-label="완성 번들 가져오기" type="file" accept=".json" onChange={e=>{const f=e.target.files?.[0];if(f)void importBuild(f);e.target.value='';}}/></label>
      {!builds.length&&<div className="empty"><PackageCheck size={32}/><h3>준비한 결과물을 기다리고 있어요</h3><p>가져오면 파일 검증 결과와 남은 실기 시험을 여기에서 볼 수 있습니다.</p></div>}
      {builds.map(b=><article className="build-result" key={b.package.sha256}><span className="pill amber">빌드 결과 · 실기 미확인</span><h3>{b.name}</h3><p>{b.targetModel} · {b.version} · {b.package.size.toLocaleString()} bytes</p><code className="hash">{b.package.sha256}</code><ul>{b.checks.map((c,i)=><li key={i}>{c.status==='passed'?'✓':c.status==='failed'?'!':'–'} {c.name}: {c.detail}</li>)}</ul><p><b>남은 실기 시험</b> · {b.remainingHardwareTests.join(' / ')}</p><button className="text-button" onClick={()=>download(b.productId+'.drawer-bundle.json',JSON.stringify(b,null,2),'application/json')}><ArrowDownToLine size={16}/>번들 다시 내보내기</button></article>)}
    </section></div>;
}
