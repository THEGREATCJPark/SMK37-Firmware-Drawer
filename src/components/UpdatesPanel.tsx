import {ExternalLink,RefreshCw,ArrowRight} from 'lucide-react';
import type {Product,Model} from '../catalog/schema';
import {catalog,artifactsFor} from '../catalog';
import type {UpdateSnapshot} from '../catalog/updates';
import {snapshotIsOld} from '../catalog/update-client';
export function UpdatesPanel({snapshot,loading,error,onRefresh,onSelect,model}:{snapshot:UpdateSnapshot|null;loading:boolean;error:string;onRefresh:()=>void;onSelect:(p:Product)=>void;model:Model}){
 const date=(s:string|null)=>s?new Date(s).toLocaleString('ko-KR'):'아직 확인하지 않음';
 return <div className="workspace-panel">
  <div className="page-title"><div><h1>새 배포 확인</h1><p>제작자 배포판과 이 앱에서 검사한 설치 버전을 나란히 확인하세요</p></div><button className="button secondary" disabled={loading} onClick={onRefresh}><RefreshCw size={16}/>{loading?'불러오는 중…':'최신 조사 불러오기'}</button></div>
  <p className="hint">서버가 하루 한 번 배포 정보를 조사합니다. 이 버튼은 가장 최근 조사 결과를 가져옵니다. 새 배포판이 발견돼도 설치 파일을 자동 교체하지 않습니다.</p>
  {error&&<p className="notice" role="status">{error} {snapshot?'마지막으로 받은 정보를 표시합니다.':'확인 실패를 최신 버전 없음으로 취급하지 않습니다.'}</p>}
  {snapshot&&<p className={snapshotIsOld(snapshot)?'notice':'hint'}>조사 결과 생성: {date(snapshot.generatedAt)}{snapshotIsOld(snapshot)?' · 48시간 이상 지났거나 시각 확인이 필요합니다.':''}</p>}
  {!snapshot&&<p className="empty-text">{loading?'제작자 배포 정보를 불러오고 있습니다.':'아직 배포 조사 정보가 없습니다. 설치 가능한 고정 파일은 기존 서랍에서 사용할 수 있습니다.'}</p>}
  <div className="update-list">{catalog.products.map(product=>{
   const observed=snapshot?.projects.find(p=>p.productId===product.id);const versions=[...new Set(artifactsFor(product.id,model).filter(a=>a.method==='direct').map(a=>a.version))];
   const uncertain=!observed||observed.status==='unknown'||observed.stale;
   return <article className="update-row" key={product.id}><div><h2>{product.name}</h2><p className="hint">{model} · 이 앱에서 설치 가능</p><p className="version-list">{versions.join(' / ')||'없음'}</p></div><div><span className="field-label">제작자 저장소의 최근 정식 배포</span><p><strong>{observed?.latest?.tag??(observed?.status==='no-release'?'정식 릴리스 없음':'확인되지 않음')}</strong> {uncertain&&<span className="pill muted">재확인 필요</span>}</p><p className="hint">확인: {date(observed?.checkedAt??null)}{observed?.stale?' · 이전 결과 보관 중':''}</p>{observed?.error&&<p className="hint">{observed.error}</p>}
   {observed?.latest&&<a className="inline-link" href={observed.latest.url} target="_blank" rel="noreferrer">원본 배포 내용 <ExternalLink size={14}/></a>}</div><button className="text-button" onClick={()=>onSelect(product)}>설치 버전 보기 <ArrowRight size={15}/></button></article>;
  })}</div>
  <p className="notice">제작자 최근 배포는 FM-1용이거나 다른 보드·계열일 수 있습니다. 버전 숫자가 크다는 이유로 SMK37에 설치하지 않습니다. 같은 기기 모델·loader·영역·고정 해시 검토를 통과한 파일만 기존 설치 화면에 나타납니다.</p>
  <section className="surface"><h2>SMK37 생태계 둘러보기</h2><p>추가로 발견한 프로젝트입니다. 이 목록은 이 앱의 설치 지원 목록과 별개이며, 설치 성공이나 모델 호환성을 보증하지 않습니다.</p>
   {snapshot?.discovery.status!=='ok'&&<p className="hint">현재 발견 목록을 새로 확인하지 못했습니다.{snapshot?.discovery.stale?' 이전 결과를 표시합니다.':''}</p>}
   <div className="discovery-grid">{snapshot?.discovery.items.map(item=><article key={item.id}><strong>{item.name}</strong>{item.version&&<p className="version-list">목록 표기 {item.version}</p>}<p className="hint">모델별 지원 확인 필요</p>{item.repository?<a className="inline-link" href={item.repository} target="_blank" rel="noreferrer">개발 자료 <ExternalLink size={13}/></a>:<span className="hint">원본 저장소 미확인</span>}</article>)}</div>
   <p className="hint">발견 목록: <a href="https://thefirmwarehub.com/smk37/" target="_blank" rel="noreferrer">The Firmware Hub · Sven Trogus</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. SMK37 관련 항목을 추려 재구성했습니다. 확인 시각: {date(snapshot?.discovery.checkedAt??null)}.</p>
  </section>
 </div>;
}
