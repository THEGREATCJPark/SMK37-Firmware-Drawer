import { useState } from 'react';
import { Download,ExternalLink,LifeBuoy } from 'lucide-react';
import { catalog } from '../catalog';
import type { Model } from '../catalog/schema';
import { download,getFullBackup,listHistory } from '../storage/vault';
import { createRecoveryReport,RECOVERY_GUIDE,symptoms,type RecoverySymptom } from '../recovery/report';

const guidance:Record<RecoverySymptom,string[]>={
  connection:['데이터 통신이 가능한 USB 케이블과 다른 포트를 확인하세요. 기기를 사용하는 DAW·에디터·다른 설치기 탭을 닫으세요.','USB MIDI가 없고 WL82 UBOOT로 나타난다면 일반 MIDI 설치 상태가 아닙니다. 아래 모델별 복구 문서를 확인하세요.'],
  interrupted:['실제 쓰기가 진행 중이면 USB·전원을 유지하세요. 중단 여부를 먼저 확인하고 원래 설치기의 안내를 따르세요.','재개는 같은 실물 모델의 최신 실제 설치 이력이 미완료·중단 상태이고 패키지 ID와 SHA-256까지 같아야 합니다. 이 화면은 재개를 실행하거나 승인하지 않습니다.'],
  boot:['실물 모델, 설치한 패키지와 현재 표시되는 USB 식별자를 기록하세요. 반복해서 전원을 끊거나 다른 모델의 패키지를 시도하지 마세요.','참조 SLOOP 기반 포트에는 부팅 실패 복구 화면이 있지만 모든 펌웨어·모델에 적용되는 기능은 아닙니다. 해당 패키지의 복구 안내를 확인하세요.'],
  stock:['M-Vave에서 실물 모델에 맞는 공식 패키지와 업데이트 절차를 확인하세요. 현재 음색·곡·설정은 펌웨어별 에디터에서 별도 보관하세요.','전체 덤프와 기기 고유 보정값은 본인 기기의 자료만 사용하세요. 공식 복귀가 다른 펌웨어의 프로젝트 호환이나 설정 보존을 보장하지 않습니다.'],
};

export function RecoveryPanel({model,onError,onBackups}:{model:Model;onError:(e:unknown)=>void;onBackups?:()=>void}){
  const [symptom,setSymptom]=useState<RecoverySymptom>('connection');
  const [exporting,setExporting]=useState(false),[notice,setNotice]=useState('');
  async function exportReport(){setExporting(true);try{const [history,record]=await Promise.all([listHistory(),getFullBackup(model)]);download('smk37-recovery-report.json',JSON.stringify(createRecoveryReport(model,symptom,catalog.artifacts,history,record),null,2),'application/json');setNotice('복구 보고서를 저장했습니다. 공유 전에 내용을 검토하세요.');}catch(e){onError(e);}finally{setExporting(false);}}
  const links=[...new Set(catalog.artifacts.filter(a=>a.targetModel===model).map(a=>a.recoveryUrl))];
  return <div className="workspace-panel">
    <div className="page-title"><div><h1>복구 안내</h1><p>{model} · 증상과 로컬 기록을 확인합니다</p></div></div>
    <div className="notice">이 화면은 USB 명령을 보내지 않습니다. 앱은 전체 플래시 백업 생성이나 자동 복원을 지원하지 않습니다.</div>
    <section className="surface"><div className="section-label"><h2><LifeBuoy size={20}/>어떤 상태인가요?</h2></div>
      <label>현재 증상<select aria-label="현재 증상" value={symptom} onChange={e=>{setSymptom(e.target.value as RecoverySymptom);setNotice('');}}>{Object.entries(symptoms).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <ol>{guidance[symptom].map(item=><li key={item}>{item}</li>)}</ol>
      <p className="hint">FM-1용 복구 도구나 명령을 SMK에 그대로 적용하지 마세요. 참조 문서의 실기 확인은 일부 SMK-37 Pro에 한정되며 다른 모델까지 보장하지 않습니다.</p>
      <a className="inline-link" href={RECOVERY_GUIDE} target="_blank" rel="noreferrer">고정 버전의 백업·복구 참조 문서 <ExternalLink size={14}/></a>
      {links.filter(url=>url!==RECOVERY_GUIDE).map((url,i)=><p key={url}><a className="inline-link" href={url} target="_blank" rel="noreferrer">{model} 카탈로그 복구 출처 {i+1} <ExternalLink size={14}/></a></p>)}
      {onBackups&&<button className="button secondary" onClick={onBackups}>전체 덤프 파일 검증으로 이동</button>}
    </section>
    <section className="surface"><h2>로컬 복구 보고서</h2><p>선택 모델·증상, 카탈로그 패키지 해시와 로더 식별자, 같은 모델의 최근 실제 설치 기록 최대 10개, 전체 백업 기록의 해시·시각만 담습니다.</p><p className="hint">덤프 원본·파일명·보관 경로·메모·브라우저 정보는 제외합니다. 보고서는 현재 기기 상태의 증명이 아니며 서버로 전송되지 않습니다. 공유 전 식별자와 시각을 검토하세요.</p><button className="button secondary" disabled={exporting} onClick={()=>void exportReport()}><Download size={16}/>{exporting?'보고서 준비 중':'복구 보고서 저장'}</button>{notice&&<p role="status" className="success-message">{notice}</p>}</section>
  </div>;
}
