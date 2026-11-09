import { useCallback,useEffect,useState } from 'react';
import { Search,Heart,Library,Archive,FlaskConical,ArrowUpRight,ArrowRight,Usb,ChevronDown,BookOpen,Wifi,WifiOff,X,KeyboardMusic,SlidersHorizontal,Clock3 } from 'lucide-react';
import { catalog,primaryArtifact,artifactsFor } from './catalog';
import type { Artifact,Model,Product } from './catalog/schema';
import { settings,listHistory,saveHistory } from './storage/vault';
import { closeAllMidi } from './install/transport';
import { messageOf } from './install/controller';
import { Cartridge } from './components/Cartridge';
import { Modal } from './components/Modal';
import { InstallPanel } from './components/InstallPanel';
import { BackupsPanel } from './components/BackupsPanel';
import { PortingPanel } from './components/PortingPanel';
type View='drawer'|'favorites'|'backups'|'porting';

export default function App(){
  const [view,setView]=useState<View>('drawer'),[model,setModel]=useState<Model>('SMK-37 Pro');
  const [query,setQuery]=useState(''),[category,setCategory]=useState('전체'),[onlyAvailable,setOnlyAvailable]=useState(false);
  const [favorites,setFavorites]=useState<string[]>([]),[recent,setRecent]=useState<string[]>([]);
  const [selected,setSelected]=useState<Product|null>(null),[install,setInstall]=useState(false),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[online,setOnline]=useState(navigator.onLine),[help,setHelp]=useState(false);
  const onError=useCallback((e:unknown)=>setError(messageOf(e)),[]);
  const onBusy=useCallback((v:boolean)=>setBusy(v),[]);
  async function reloadRecent(){const h=await listHistory();setRecent([...new Set(h.filter(r=>r.status==='completed'&&!r.simulated).map(r=>r.productId))].slice(0,4));}
  useEffect(()=>{settings.get<string[]>('favorites',[]).then(setFavorites).catch(onError);void reloadRecent().catch(onError);
    const network=()=>setOnline(navigator.onLine);window.addEventListener('online',network);window.addEventListener('offline',network);
    return()=>{window.removeEventListener('online',network);window.removeEventListener('offline',network);};},[]);
  async function favorite(id:string){const next=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];try{await settings.set('favorites',next);setFavorites(next);}catch(e){onError(e);}}
  function show(p:Product){setSelected(p);setInstall(false);}
  async function closeDetail(){if(busy)return;await closeAllMidi();setSelected(null);setInstall(false);void reloadRecent().catch(onError);}
  async function external(a:Artifact){
    if(busy)return;
    const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;
    try{await closeAllMidi();await saveHistory({id:crypto.randomUUID(),startedAt:new Date().toISOString(),artifactId:a.id,productId:a.productId,sha256:a.sha256??'미확인',targetModel:a.targetModel,previousIdentity:'외부 이동 전 상태 미확인',status:'external-opened',simulated:false,browser:navigator.userAgent,note:'개발자 설치 페이지를 열었습니다. 설치 여부와 결과는 확인하지 않았습니다.'});
      if(tab)tab.location.href=a.externalUrl;else throw new Error('브라우저가 새 창을 차단했습니다. 아래 개발자 설치기 링크를 새 탭에서 열어 주세요.');
    }catch(e){tab?.close();onError(e);}
  }
  const active=selected?primaryArtifact(selected.id,model):undefined;
  const direct=catalog.products.filter(p=>primaryArtifact(p.id,model)?.method==='direct').length;
  const visible=catalog.products.filter(p=>{
    const a=primaryArtifact(p.id,model);return (view!=='favorites'||favorites.includes(p.id))&&
      (!onlyAvailable||a?.status==='published')&&(category==='전체'||p.category===category)&&
      `${p.name} ${p.description} ${p.category} ${p.features.join(' ')}`.toLowerCase().includes(query.toLowerCase());
  });
  return <div className="app-shell">
    <aside className="sidebar"><button className="brand" onClick={()=>setView('drawer')} aria-label="서랍 홈"><span className="brand-mark"><Library size={23}/></span><span>SMK37<span className="brand-sub">FIRMWARE DRAWER</span></span></button>
      <div className="side-section-label">MY COLLECTION</div><nav aria-label="주 메뉴">
        <button className={view==='drawer'?'active':''} onClick={()=>setView('drawer')}><Library size={19}/>내 펌웨어 서랍 <span>{catalog.products.length}</span></button>
        <button className={view==='favorites'?'active':''} onClick={()=>setView('favorites')}><Heart size={19}/>즐겨찾기 <span>{favorites.length}</span></button>
        <button className={view==='backups'?'active':''} onClick={()=>setView('backups')}><Archive size={19}/>백업과 이력</button>
        <button className={view==='porting'?'active':''} onClick={()=>setView('porting')}><FlaskConical size={19}/>포팅 작업실 <i className="nav-dot"/></button>
      </nav>
      <div className="side-device"><div className="tiny-keyboard" aria-hidden="true">{Array.from({length:14},(_,i)=><i key={i}/>)}</div><span className="eyebrow">MY INSTRUMENT</span><strong>{model}</strong><span className="device-status"><i/>실제 기기 미확인</span><button className="text-button" onClick={()=>setHelp(true)}>연결·복구 안내 <ArrowUpRight size={14}/></button></div>
      <div className="side-bottom"><button onClick={()=>setHelp(true)}><BookOpen size={17}/>사용 안내</button><p>당신의 건반에, 새로운 소리.</p><span>LOCAL FIRST · PERSONAL USE</span></div>
    </aside>
    <div className="main-column"><header className="topbar"><span className="breadcrumb">내 작업실 <span>/</span> 펌웨어 라이브러리</span><span className={'network '+(!online?'offline':'')}>{online?<Wifi size={14}/>:<WifiOff size={14}/>} {online?'온라인':'오프라인'}</span><button className="top-help" onClick={()=>setHelp(true)}><BookOpen size={16}/><span>가이드</span></button><span className="avatar">나</span></header>
      <main>
        {(view==='drawer'||view==='favorites')&&<>
          <div className="intro-line"><span className="eyebrow">A LITTLE DRAWER. A LOT OF SOUND.</span><span className="edition">개인 컬렉션 / 01</span></div>
          <section className="hero"><div className="hero-copy"><h1>{view==='favorites'?<>자주 꺼내는<br/><em>나만의 소리.</em></>:<>오늘은, 어떤 악기가<br/><em>되어볼까요?</em></>}</h1><p>하나의 건반, 여러 가지 가능성.<br/>마음에 드는 펌웨어를 골라 나의 악기를 바꿔보세요.</p><div className="hero-meta"><span><b>{catalog.products.length}</b>개의 악기</span><i/><span><b>{direct}</b>종 직접 설치 어댑터</span><i/><span>실기 확인은 별도</span></div></div><div className="hero-art" aria-hidden="true"><span className="hero-orbit"/><div className="mini-cart mini-back"><span>PLAY SOMETHING NEW</span><b>+VA</b></div><div className="mini-cart mini-front"><span>SOUND / 001</span><b>SLOOP<br/>PRO</b><div className="mini-wave">▂▅▃▇▅▂▆▃▅▁</div><small>DRUMS · SYNTH · SAMPLES</small></div><span className="hero-caption">CHOOSE YOUR NEXT SOUND ↗</span></div></section>
          <div className="device-bar"><div className="device-icon"><KeyboardMusic size={23}/></div><div><span className="eyebrow">선택한 실물 모델</span><label className="model-picker"><select aria-label="실물 모델" value={model} onChange={e=>setModel(e.target.value as Model)}><option>SMK-37 Pro</option><option>SMK-37 Elite</option><option>MKE-P37</option></select><ChevronDown size={15}/></label></div><span className="device-bar-note">연결 전에도 둘러볼 수 있어요.<br/>설치는 기기·파일 확인 후 시작합니다.</span><button className="button secondary" onClick={()=>setHelp(true)}><Usb size={16}/>연결 안내</button></div>
          {recent.length>0&&<div className="recent"><Clock3 size={16}/><span>최근 응답 확인</span>{recent.map(id=><button key={id} onClick={()=>{const p=catalog.products.find(x=>x.id===id);if(p)show(p);}}>{catalog.products.find(p=>p.id===id)?.name}</button>)}</div>}
          <section className="collection"><div className="collection-title"><h2>{view==='favorites'?'즐겨찾는 악기':'내 펌웨어 서랍'} <span>{visible.length}</span></h2><div className="search"><Search size={17}/><input aria-label="펌웨어 검색" value={query} onChange={e=>setQuery(e.target.value)} placeholder="이름, 소리, 기능 검색"/>{query&&<button aria-label="검색 지우기" onClick={()=>setQuery('')}><X size={15}/></button>}</div></div>
          <div className="filters"><div className="category-pills" aria-label="용도 필터">{['전체',...new Set(catalog.products.map(p=>p.category))].map(c=><button key={c} className={category===c?'chosen':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><label className="available-filter"><input type="checkbox" checked={onlyAvailable} onChange={e=>setOnlyAvailable(e.target.checked)}/><SlidersHorizontal size={15}/>SMK 패키지만</label></div>
          <div className="card-grid">{visible.map(p=>{const a=primaryArtifact(p.id,model);return <article className="firmware-card" key={p.id}><div className="card-visual"><button className="art-button" aria-label={`${p.name} 상세 보기`} onClick={()=>show(p)}><Cartridge product={p} index={catalog.products.indexOf(p)}/></button><button className={'favorite '+(favorites.includes(p.id)?'saved':'')} aria-label={`${p.name} 즐겨찾기`} aria-pressed={favorites.includes(p.id)} onClick={()=>void favorite(p.id)}><Heart size={18} fill={favorites.includes(p.id)?'currentColor':'none'}/></button></div><div className="card-body"><div className="card-kicker"><span>{p.category}</span><span>{a?.version==='미정'?'PORTING':a?.version}</span></div><h3>{p.name}</h3><p className="card-description">{p.description}</p><div className="feature-tags">{p.features.slice(0,3).map(f=><span key={f}>{f}</span>)}</div><div className="card-foot"><span className={'status-label '+(a?.status==='port-required'?'pending':'')}><i/>{a?.status==='port-required'?'포팅 필요':a?.method==='direct'?'SMK37 패키지 있음':'개발자 페이지에서 설치'}</span><button className="icon-button" aria-label={`${p.name} 열기`} onClick={()=>show(p)}><ArrowUpRight size={19}/></button></div></div></article>;})}</div>
          {!visible.length&&<div className="empty"><Search size={30}/><h3>{view==='favorites'?'마음에 드는 악기를 담아보세요':'찾는 악기가 없어요'}</h3><p>{view==='favorites'?'카드의 하트를 누르면 이곳에 모입니다.':'다른 검색어나 용도 필터를 사용해 보세요.'}</p></div>}
          </section><div className="workbench-banner"><FlaskConical size={26}/><div><strong>아직 내 건반용이 없는 소리라면</strong><p>FM-1 펌웨어를 위한 포팅 작업을 파일로 준비하세요.</p></div><button className="text-button" onClick={()=>setView('porting')}>포팅 작업실 <ArrowRight size={17}/></button></div>
        </>}
        {view==='backups'&&<BackupsPanel model={model} onError={onError}/>}
        {view==='porting'&&<PortingPanel model={model} onError={onError} onSelect={show}/>}
      </main><footer><span><Library size={15}/> SMK37 FIRMWARE DRAWER</span><span>출처 확인 2026.11.09 · 공개 패키지와 실기 검증은 다릅니다.</span></footer>
    </div>
    {selected&&active&&<Modal title={selected.name} wide busy={busy} onClose={()=>void closeDetail().catch(onError)}><div className="detail-top"><div className="detail-art"><Cartridge product={selected} index={catalog.products.indexOf(selected)} small/></div><div><span className="pill muted">{selected.category}</span><p className="detail-description">{selected.description}</p><p className="hint">by {selected.author} · 출처 확인 {selected.verifiedAt}</p><div className="feature-tags">{selected.features.map(f=><span key={f}>{f}</span>)}</div></div></div>
      {install&&active.method==='direct'?<InstallPanel key={active.id} artifact={active} model={model} onBusy={onBusy} onError={onError} onExternal={a=>void external(a)} onBackups={()=>{void closeDetail();setView('backups');}}/>:<>
        <div className="detail-actions">{active.method==='direct'?<button className="button" onClick={()=>setInstall(true)}>파일 검사·설치 준비 <ArrowRight size={17}/></button>:active.method==='external'?<button className="button" onClick={()=>void external(active)}>개발자 설치 페이지 <ArrowUpRight size={17}/></button>:<button className="button" onClick={()=>{setSelected(null);setView('porting');}}>포팅 준비하기 <ArrowRight size={17}/></button>}<a className="button secondary" href={selected.manualUrl} target="_blank" rel="noreferrer"><BookOpen size={16}/>매뉴얼</a><a className="inline-link" href={selected.repository} target="_blank" rel="noreferrer">원본 소스·개발자 <ArrowUpRight size={14}/></a></div>
        <p className="hint">{active.method==='external'?'온라인 필요 · 앱의 MIDI 포트를 닫고 외부 설치기로 이동합니다. 외부 설치 완료는 추측하지 않습니다.':active.method==='direct'?'원본 패키지는 직접 선택합니다. 파일 검증 이후에도 최종 설치 버튼을 눌러야 기록합니다.':'SMK37용 설치 대상이 없습니다. FM-1 파일을 변환해 즉시 설치하는 기능은 제공하지 않습니다.'}</p>
      </>}
      <div className="detail-section"><h3>내 모델의 배포 버전</h3><p className="hint">실물 선택: {model} · 직접 설치 범위는 고정된 두 제품입니다. 원본 최신판과 포트 버전을 분리합니다.</p><div className="version-list">{artifactsFor(selected.id,model).map(a=><div className="version-row" key={a.id}><div><b>{a.version}</b><span>원본 {a.upstreamVersion??'미확인'} / SMK 포트 {a.portVersion??'해당 없음'}</span><code>{a.packageIdentity??'패키지 identity 미확인'}</code></div><span className="pill muted">{a.method==='direct'?'직접 어댑터':a.status==='port-required'?'포팅 필요':'외부 설치'}</span><a href={a.releaseUrl} target="_blank" rel="noreferrer" aria-label={`${a.version} 배포 출처`}><ArrowUpRight size={18}/></a></div>)}</div></div>
      <div className="detail-section"><h3>패널과 데이터</h3><p>{selected.mapping}</p><p>{active.backup.scope}</p>{active.backup.editorUrl&&<a className="inline-link" href={active.backup.editorUrl} target="_blank" rel="noreferrer">개발자 백업·에디터 <ArrowUpRight size={14}/></a>}<p className="notice">{active.dataImpact}</p><ul className="limitations">{selected.limitations.map(l=><li key={l}>{l}</li>)}</ul><a className="inline-link" href={active.recoveryUrl} target="_blank" rel="noreferrer">공식 복귀·복구 안내 <ArrowUpRight size={14}/></a></div>
      <details className="evidence"><summary>출처·라이선스·검증 근거</summary><p>{selected.license}</p><ul>{active.evidence.map((e,i)=><li key={i}><a href={e.url} target="_blank" rel="noreferrer">{e.kind}</a> — {e.note}</li>)}</ul><p>이 앱에서 수행한 USB 실기 기록은 없습니다. SHA-256은 무결성 확인이며 호환성 증명이 아닙니다.</p>{selected.sources.map(url=><a className="source-link" href={url} key={url} target="_blank" rel="noreferrer">{url}</a>)}</details>
    </Modal>}
    {help&&<Modal title="첫 연결을 준비하세요" onClose={()=>setHelp(false)}><ol className="guide-steps"><li><strong>PC의 Chrome 또는 Edge</strong><p>데이터 전송이 되는 USB 케이블을 사용하고 다른 MIDI 앱·설치기 탭을 닫으세요.</p></li><li><strong>내 기기의 전체 백업과 복귀 경로</strong><p>포팅 키트의 PC 절차로 전체 덤프를 별도 보관하고, 백업과 이력에서 사용자 검증 기록을 등록하세요.</p></li><li><strong>펌웨어 선택 → 파일 검사 → 직접 설치 시작</strong><p>실물 모델, 기기 응답, 파일의 모델과 해시를 대조합니다. 현재 지원 경로는 순정 V016·SLOOP Pro·Frodhes 0.9.2입니다.</p></li><li><strong>Galaxy는 HTTPS 환경에서</strong><p>홈 화면 추가용 PWA를 제공합니다. PC localhost 주소는 폰에서 그대로 열리지 않습니다. 접근 가능한 HTTPS 배포는 별도 요청 시 진행합니다. Android USB 설치와 재연결은 실기 미확인입니다.</p></li></ol><p className="notice">중단되면 같은 패키지를 보관하고 loader 식별자를 다시 확인하세요. 알 수 없는 상태에서 강제 재부팅·순정 복구를 자동 실행하지 않습니다.</p><a className="inline-link" href="https://github.com/genkigenki/fm1-to-smk37/blob/54252ffa2219e3c9cd7eb70f4e99b361eaa048e1/docs/02-update-and-recovery.md" target="_blank" rel="noreferrer">백업·복구 원문 <ArrowUpRight size={14}/></a><button className="button" onClick={()=>{setHelp(false);setView('backups');}}>백업 보관함 열기</button></Modal>}
    {error&&<div className="toast" role="alert"><span>{error}</span><button className="icon-button" aria-label="알림 닫기" onClick={()=>setError('')}><X size={18}/></button></div>}
  </div>;
}
