import type { Artifact,Model } from '../catalog/schema';
import type { InstallRecord } from '../install/types';
import type { FullBackupRecord } from '../storage/vault';

export const RECOVERY_GUIDE='https://github.com/genkigenki/fm1-to-smk37/blob/54252ffa2219e3c9cd7eb70f4e99b361eaa048e1/docs/02-update-and-recovery.md';
export const symptoms={
  connection:'기기가 연결 목록에 안 보여요',
  interrupted:'설치가 중단되거나 로더에 머물러요',
  boot:'설치 후 부팅에 실패해요',
  stock:'공식 펌웨어로 돌아가고 싶어요',
} as const;
export type RecoverySymptom=keyof typeof symptoms;

export function createRecoveryReport(model:Model,symptom:RecoverySymptom,artifacts:Artifact[],history:InstallRecord[],record:FullBackupRecord|null){
  const recent=history.filter(h=>h.targetModel===model&&!h.simulated).sort((a,b)=>b.startedAt.localeCompare(a.startedAt)||String(b.endedAt??'').localeCompare(String(a.endedAt??''))).slice(0,10);
  return {
    format:'smk37-recovery-report',schemaVersion:1,createdAt:new Date().toISOString(),model,symptom,
    scope:'로컬 기록이며 현재 기기 상태나 재개 가능성을 인증하지 않습니다.',
    privacy:'덤프 원본, 파일명·보관 경로, 사용자 메모, 브라우저 정보는 제외했습니다. 모델·패키지·식별자·시각은 포함됩니다. 공유 전 검토하세요.',
    packages:artifacts.filter(a=>a.targetModel===model).map(a=>({id:a.id,productId:a.productId,version:a.version,sha256:a.sha256,packageIdentity:a.packageIdentity,loaderIdentity:a.loaderIdentity??null,loaderFamily:a.loaderFamily,recoveryUrl:a.recoveryUrl})),
    history:recent.map(h=>({startedAt:h.startedAt,endedAt:h.endedAt,artifactId:h.artifactId,sha256:h.sha256,status:h.status,previousIdentity:h.previousIdentity,reportedIdentity:h.reportedIdentity})),
    fullBackup:record?.model===model?{verificationMethod:record.verificationMethod??'legacy-unspecified',model:record.model,sha256:record.sha256,date:record.date,verifiedByOwner:record.verifiedByOwner}:null,
    guidanceUrl:RECOVERY_GUIDE,
  };
}
