import { useCallback, useEffect, useState } from 'react';
import { Search, Heart, Library, Archive, FlaskConical, ArrowUpRight, ArrowRight, BookOpen, WifiOff, X, ChevronDown } from 'lucide-react';
import { catalog, primaryArtifact, artifactsFor } from './catalog';
import type { Artifact, Model, Product } from './catalog/schema';
import { settings, listHistory, saveHistory } from './storage/vault';
import { closeAllMidi } from './install/transport';
import { messageOf } from './install/controller';
import { Modal } from './components/Modal';
import { InstallPanel } from './components/InstallPanel';
import { BackupsPanel } from './components/BackupsPanel';
import { PortingPanel } from './components/PortingPanel';

type View = 'drawer' | 'favorites' | 'backups' | 'porting';
const descriptions: Record<string, string> = {
  'sloop-pro': '샘플과 신스로 만드는 4트랙 그루브박스',
  'va': 'FM·가상 아날로그·8비트 음원을 한 건반에서',
  'erik37': 'Salamander 샘플 기반의 그랜드 피아노',
  'frodhes': '타건에 반응하는 물리 모델 일렉트릭 피아노',
  'obervave': '아날로그 신스와 스트링, 실시간 이펙트',
  'choralroot': '건반으로 만드는 코드와 아르페지오',
  'sloopdx': '6오퍼레이터 FM 드럼과 SLOOP 시퀀서',
};
const viewNames: Record<View, string> = { drawer:'펌웨어 서랍', favorites:'즐겨찾기', backups:'백업과 이력', porting:'포팅 작업실' };

export default function App() {
  const [view, setView] = useState<View>('drawer');
  const [model, setModel] = useState<Model>('SMK-37 Pro');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [selected, setSelected] = useState<Product|null>(null);
  const [artifactId,setArtifactId]=useState<string|null>(null);
  const [install, setInstall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [help, setHelp] = useState(false);
  const onError = useCallback((e:unknown) => setError(messageOf(e)), []);
  const onBusy = useCallback((value:boolean) => setBusy(value), []);

  async function reloadRecent() {
    const history = await listHistory();
    setRecent([...new Set(history.filter(r => r.status==='completed' && !r.simulated).map(r => r.productId))].slice(0,4));
  }
  useEffect(() => {
    settings.get<string[]>('favorites', []).then(setFavorites).catch(onError).finally(() => setFavoritesReady(true));
    void reloadRecent().catch(onError);
    const network = () => setOnline(navigator.onLine);
    window.addEventListener('online', network);
    window.addEventListener('offline', network);
    return () => { window.removeEventListener('online', network); window.removeEventListener('offline', network); };
  }, []);
  useEffect(() => { window.scrollTo({top:0, behavior:'instant'}); }, [view]);

  async function favorite(id:string) {
    if (!favoritesReady || savingFavorite) return;
    setSavingFavorite(true);
    const next = favorites.includes(id) ? favorites.filter(x => x!==id) : [...favorites,id];
    try { await settings.set('favorites',next); setFavorites(next); }
    catch (e) { onError(e); }
    finally { setSavingFavorite(false); }
  }
  function show(product:Product) { setSelected(product); setArtifactId(null); setInstall(false); }
  function resetFilters() { setQuery(''); setCategory('전체'); setOnlyAvailable(false); }
  async function closeDetail() {
    if (busy) return;
    await closeAllMidi(); setSelected(null); setInstall(false);
    void reloadRecent().catch(onError);
  }
  async function external(artifact:Artifact) {
    if (busy) return;
    const tab = window.open('about:blank','_blank');
    if (tab) tab.opener = null;
    try {
      await closeAllMidi();
      await saveHistory({id:crypto.randomUUID(), startedAt:new Date().toISOString(), artifactId:artifact.id, productId:artifact.productId, sha256:artifact.sha256??'미확인', targetModel:artifact.targetModel, previousIdentity:'외부 이동 전 상태 미확인', status:'external-opened', simulated:false, browser:navigator.userAgent, note:'개발자 설치 페이지를 열었습니다. 설치 여부와 결과는 확인하지 않았습니다.'});
      if (tab) tab.location.href = artifact.externalUrl;
      else throw new Error('새 창이 차단되었습니다. 브라우저의 팝업 설정을 확인한 뒤 다시 눌러 주세요.');
    } catch (e) { tab?.close(); onError(e); }
  }
  const active = selected ? artifactsFor(selected.id,model).find(a=>a.id===artifactId)??primaryArtifact(selected.id,model) : undefined;
  const visible = catalog.products.filter(product => {
    const artifact = primaryArtifact(product.id,model);
    return (view!=='favorites' || favorites.includes(product.id)) &&
      (!onlyAvailable || artifact?.status==='published') && (category==='전체' || product.category===category) &&
      `${product.name} ${product.description} ${product.category} ${product.features.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase());
  });
  const filtered = query.trim()!=='' || category!=='전체' || onlyAvailable;
  const modelArtifacts = catalog.products.map(p => primaryArtifact(p.id,model));
  const directCount = modelArtifacts.filter(a => a?.method==='direct').length;
  const externalCount = modelArtifacts.filter(a => a?.method==='external').length;
  const navigation = [
    {id:'drawer' as const, label:'내 펌웨어 서랍', icon:Library, count:catalog.products.length},
    {id:'favorites' as const, label:'즐겨찾기', icon:Heart, count:favorites.length},
    {id:'backups' as const, label:'백업과 이력', icon:Archive},
    {id:'porting' as const, label:'포팅 작업실', icon:FlaskConical},
  ];

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">본문으로 이동</a>
    <aside className="sidebar">
      <button className="brand" aria-label="서랍 홈" onClick={() => { setView('drawer'); resetFilters(); window.scrollTo({top:0,behavior:'instant'}); }}>
        <strong>SMK37</strong><span>Firmware drawer</span>
      </button>
      <nav aria-label="주 메뉴">
        {navigation.map(({id,label,icon:Icon,count}) => <button key={id} className={view===id?'active':''} aria-label={label} aria-current={view===id?'page':undefined} onClick={() => setView(id)}>
          <Icon aria-hidden="true"/><span className="nav-label">{label}</span>{count!==undefined && <span className="nav-count" aria-hidden="true">{count}</span>}
        </button>)}
      </nav>
      <div className="side-note"><span>개인 보관함</span><p>파일과 이력은<br/>이 브라우저에 저장됩니다</p></div>
      <div className="side-bottom"><button onClick={() => setHelp(true)}><BookOpen aria-hidden="true"/>사용 안내</button><span>기기 연결은 설치 화면에서</span></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <span className="breadcrumb">{viewNames[view]}</span>
        <label className="model-picker"><span>대상 모델</span><select aria-label="실물 모델" value={model} disabled={busy || selected!==null} onChange={e => setModel(e.target.value as Model)}><option>SMK-37 Pro</option><option>SMK-37 Elite</option><option>MKE-P37</option></select></label>
        {!online && <span className="network offline"><WifiOff aria-hidden="true"/>오프라인</span>}
        <button className="icon-button top-help" aria-label="연결 및 사용 안내" onClick={() => setHelp(true)}><BookOpen aria-hidden="true"/></button>
      </header>
      <main id="main-content" tabIndex={-1}>
        {(view==='drawer' || view==='favorites') && <>
          <div className="page-title library-title"><div><h1>{viewNames[view]}</h1><p>{view==='favorites'?'자주 사용하는 펌웨어를 모아두세요':'내 건반에 맞는 버전과 설치 경로를 확인하세요'}</p></div><span className="catalog-count">{visible.length}<small> / {catalog.products.length}</small></span></div>
          <div className="library-context"><span><b>{model}</b> 기준 · 직접 설치 {directCount}종 / 외부 설치 {externalCount}종</span><button className="text-button" onClick={() => setView('backups')}>첫 설치 전 백업 준비 <ArrowRight aria-hidden="true"/></button></div>
          {recent.length>0 && <div className="recent"><span>최근 응답 확인</span>{recent.map(id => <button key={id} onClick={() => { const p=catalog.products.find(x => x.id===id); if(p) show(p); }}>{catalog.products.find(p => p.id===id)?.name}</button>)}</div>}
          <section className="collection" aria-label="펌웨어 목록">
            <div className="library-toolbar">
              <div className="search"><Search aria-hidden="true"/><input aria-label="펌웨어 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="이름, 소리, 기능 검색"/>{query && <button className="icon-button" aria-label="검색 지우기" onClick={() => setQuery('')}><X aria-hidden="true"/></button>}</div>
              <label className="category-select"><span className="sr-only">용도</span><select aria-label="용도" value={category} onChange={e => setCategory(e.target.value)}><option value="전체">모든 용도</option>{[...new Set(catalog.products.map(p => p.category))].map(c => <option key={c}>{c}</option>)}</select></label>
              <label className="available-filter"><input type="checkbox" checked={onlyAvailable} onChange={e => setOnlyAvailable(e.target.checked)}/>SMK 패키지만</label>
            </div>
            <div className="list-heading" aria-hidden="true"><span>펌웨어</span><span>모델별 버전</span><span>설치 경로</span><span/></div>
            <div className="card-grid">
              {visible.map(product => {
                const artifact=primaryArtifact(product.id,model);
                const pending=artifact?.status==='port-required';
                return <article className={'firmware-card '+(pending?'pending-row':'')} key={product.id}>
                  <span className="catalog-index" aria-hidden="true">{String(catalog.products.indexOf(product)+1).padStart(2,'0')}</span>
                  <div className="firmware-info"><h2><button aria-label={`${product.name} 상세 보기`} onClick={() => show(product)}>{product.name}</button></h2><p>{descriptions[product.id] ?? product.description.split('.')[0]}</p><span className="row-category">{product.category}</span></div>
                  <div className="firmware-version"><span className="mobile-label">버전</span><span>{pending?'SMK 포트 없음':artifact?.version}</span></div>
                  <div className="firmware-route"><span className={'route-label '+(pending?'pending':artifact?.method==='direct'?'direct':'')}>{pending?'포팅 필요':artifact?.method==='direct'?'앱에서 설치':'개발자 설치기'}</span><span className="route-note">{pending?'작업 파일 만들기':artifact?.method==='direct'?'파일 검사 후 진행':'외부 페이지로 이동'}</span></div>
                  <div className="row-actions"><button className="icon-button favorite" disabled={!favoritesReady || savingFavorite} aria-label={`${product.name} 즐겨찾기`} aria-pressed={favorites.includes(product.id)} onClick={() => void favorite(product.id)}><Heart fill={favorites.includes(product.id)?'currentColor':'none'} aria-hidden="true"/></button><button className="row-open" aria-label={`${product.name} 열기`} onClick={() => show(product)}>상세 보기 <ArrowRight aria-hidden="true"/></button></div>
                </article>;
              })}
            </div>
            {!visible.length && <div className="empty"><h2>{filtered?'조건에 맞는 펌웨어가 없습니다':'즐겨찾기가 비어 있습니다'}</h2><p>{filtered?'검색어나 용도를 바꾸거나 필터를 초기화하세요':'목록에서 하트를 누르면 여기에 모입니다'}</p><button className="button secondary" onClick={() => { resetFilters(); if(!filtered) setView('drawer'); }}>{filtered?'필터 초기화':'전체 펌웨어 보기'}</button></div>}
            <p className="list-note">공개 패키지 여부와 실제 기기 검증은 다릅니다. 이 앱의 USB 실기 시험은 아직 하지 않았습니다.</p>
          </section>
          <div className="workbench-banner"><div><h2>아직 SMK37용이 없는 펌웨어</h2><p>FM-1 원본의 포팅 작업을 별도 파일로 준비할 수 있습니다</p></div><button className="text-button" onClick={() => setView('porting')}>포팅 작업실 <ArrowRight aria-hidden="true"/></button></div>
        </>}
        {view==='backups' && <BackupsPanel key={model} model={model} onError={onError}/>}
        {view==='porting' && <PortingPanel model={model} onError={onError} onSelect={show}/>}
      </main>
      <footer><span>SMK37 · 개인용 펌웨어 도구</span><span>카탈로그 확인 2026.11.09</span></footer>
    </div>
    {selected && active && <Modal title={selected.name} wide busy={busy} onClose={() => void closeDetail().catch(onError)}>
      <div className="detail-context"><span>{selected.category}</span><span>{model} · {active.version}</span></div>
      {install && active.method==='direct' ? <InstallPanel key={active.id} artifact={active} model={model} onBusy={onBusy} onError={onError} onExternal={a => void external(a)} onBackups={() => { void closeDetail(); setView('backups'); }}/>:<>
        <p className="detail-description">{selected.description}</p>{artifactsFor(selected.id,model).filter(a=>a.method==='direct').length>1&&<label>설치할 버전<select aria-label="설치할 버전" value={active.id} onChange={e=>setArtifactId(e.target.value)}>{artifactsFor(selected.id,model).filter(a=>a.method==='direct').map(a=><option key={a.id} value={a.id}>{a.version} · {a.filename}</option>)}</select></label>}
        <div className="detail-actions">
          {active.method==='direct'?<button className="button" onClick={() => setInstall(true)}>파일 검사·설치 준비 <ArrowRight aria-hidden="true"/></button>:active.method==='external'?<button className="button" onClick={() => void external(active)}>개발자 설치 페이지 <ArrowUpRight aria-hidden="true"/></button>:<button className="button" onClick={() => { setSelected(null); setView('porting'); }}>포팅 준비하기 <ArrowRight aria-hidden="true"/></button>}
          <a className="button secondary" href={selected.manualUrl} target="_blank" rel="noreferrer">매뉴얼 <ArrowUpRight aria-hidden="true"/></a>
        </div>
        <p className="hint">{active.method==='external'?'온라인 필요 · 이 앱의 MIDI 포트를 해제하고 외부 설치기로 이동합니다.':active.method==='direct'?'패키지를 검사한 뒤, 별도의 최종 설치 버튼으로 기록을 시작합니다.':'SMK37 패키지는 아직 없습니다. FM-1 파일을 이 기기에 바로 설치할 수 없습니다.'}</p>
      </>}
      <details className="detail-fold" open={!install}><summary>버전·기능·데이터 안내 <ChevronDown aria-hidden="true"/></summary>
        <section className="detail-section"><h3>내 모델의 배포 버전</h3><p className="hint">원본 최신판과 SMK 포트는 서로 다른 버전일 수 있습니다</p>
          {artifactsFor(selected.id,model).map(a => <div className="version-row" key={a.id}><div><b>{a.version}</b><span>원본 {a.upstreamVersion??'미확인'} / SMK 포트 {a.portVersion??'해당 없음'}</span><code>{a.packageIdentity??'패키지 identity 미확인'}</code></div><span className="pill muted">{a.method==='direct'?'앱에서 설치':a.status==='port-required'?'포팅 필요':'외부 설치'}</span><a className="icon-button" href={a.releaseUrl} target="_blank" rel="noreferrer" aria-label={`${a.version} 배포 출처`}><ArrowUpRight aria-hidden="true"/></a></div>)}
        </section>
        <section className="detail-section"><h3>패널과 기능</h3><p>{selected.mapping}</p><ul>{selected.features.map(f => <li key={f}>{f}</li>)}</ul></section>
        <section className="detail-section"><h3>데이터 보관과 복귀</h3><p>{active.backup.scope}</p>{active.backup.editorUrl && <a className="inline-link" href={active.backup.editorUrl} target="_blank" rel="noreferrer">개발자 백업·에디터 <ArrowUpRight aria-hidden="true"/></a>}<p className="notice">{active.dataImpact}</p><ul className="limitations">{selected.limitations.map(l => <li key={l}>{l}</li>)}</ul><a className="inline-link" href={active.recoveryUrl} target="_blank" rel="noreferrer">공식 복귀·복구 안내 <ArrowUpRight aria-hidden="true"/></a></section>
      </details>
      <details className="evidence"><summary>개발자·출처·검증 근거</summary><p>{selected.author}</p><p>{selected.license}</p><a className="inline-link" href={selected.repository} target="_blank" rel="noreferrer">원본 소스·개발자 <ArrowUpRight aria-hidden="true"/></a><ul>{active.evidence.map((e,i) => <li key={i}><a href={e.url} target="_blank" rel="noreferrer">{e.kind}</a> — {e.note}</li>)}</ul><p>이 앱의 USB 실기 기록은 없습니다. SHA-256은 파일 무결성 확인이며 호환성 증명이 아닙니다.</p>{selected.sources.map(url => <a className="source-link" href={url} key={url} target="_blank" rel="noreferrer">{url}</a>)}</details>
    </Modal>}
    {help && <Modal title="연결 및 설치 안내" onClose={() => setHelp(false)}>
      <ol className="guide-steps"><li><strong>모델과 현재 펌웨어 확인</strong><p>PC의 Chrome 또는 Edge와 USB 데이터 케이블을 사용하세요. 다른 MIDI 앱과 설치기 탭은 닫아 주세요.</p></li><li><strong>전체 백업과 복귀 파일 준비</strong><p>PC 백업 절차로 전체 덤프를 별도 보관하고 사용자 검증 기록을 등록합니다. 음색과 프로젝트는 펌웨어별 에디터에서 따로 저장하세요.</p></li><li><strong>파일 검사 후 직접 설치</strong><p>순정 V016·SLOOP Pro·Frodhes·Erik37·OberVave·ChoralRoot의 검토한 identity를 지원합니다. 실제 기기 응답과 파일을 검사한 뒤 최종 설치 버튼을 직접 누릅니다.</p></li><li><strong>Galaxy 사용은 별도 확인</strong><p>PC localhost는 휴대폰 주소가 아닙니다. 휴대폰에는 접근 가능한 HTTPS 환경이 필요하며, Android USB 설치와 재연결은 실기 미확인입니다.</p></li></ol>
      <p className="notice">중단 후에는 같은 파일·loader·최근 중단 이력을 다시 검사합니다. 자동 재시도나 강제 재부팅은 하지 않습니다.</p>
      <div className="button-row"><button className="button" onClick={() => { setHelp(false); setView('backups'); }}>백업 보관함 열기</button><a className="inline-link" href="https://github.com/genkigenki/fm1-to-smk37/blob/54252ffa2219e3c9cd7eb70f4e99b361eaa048e1/docs/02-update-and-recovery.md" target="_blank" rel="noreferrer">백업·복구 원문 <ArrowUpRight aria-hidden="true"/></a></div>
    </Modal>}
    {error && <div className="toast" role="alert"><span>{error}</span><button className="icon-button" aria-label="알림 닫기" onClick={() => setError('')}><X aria-hidden="true"/></button></div>}
  </div>;
}
