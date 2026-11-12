import type {Artifact} from '../catalog/schema';
import type {UpdateSnapshot} from '../catalog/updates';
import {matchingAttestation,snapshotIsOld,approvalProblem} from '../catalog/update-client';
export function PackageEvidence({artifact,snapshot}:{artifact:Artifact;snapshot:UpdateSnapshot|null}){
 const proof=matchingAttestation(snapshot,artifact);
 const labels={verified:'GitHub 서명 검증됨',missing:'공개 증명 없음',unavailable:'조회하지 못함',failed:'검증 실패', 'not-checked':'아직 검사하지 않음'};
 return <section className="package-evidence" aria-label="패키지 검증 근거">
  <h3>이 파일의 검증 근거</h3>{approvalProblem(snapshot,artifact)&&<p className="notice">{approvalProblem(snapshot,artifact)}</p>}
  <dl className="evidence-grid"><div><dt>파일 무결성</dt><dd>SHA-256 고정 · 설치 전 실제 파일 검사</dd></div><div><dt>빌드 출처 증명</dt><dd>{proof?labels[proof.status]:'아직 검사하지 않음'}{proof?.status==='verified'&&snapshot&&(snapshotIsOld(snapshot)||proof.stale)?' · 확인 시각 재확인 필요':''}</dd></div><div><dt>실제 기기 시험</dt><dd>{artifact.experimental?'실험 포트 · 실기 미검증':'이 앱을 통한 실기 설치 미검증'}</dd></div></dl>
  <details><summary>해시·소스·검사 시각</summary><code className="hash">{artifact.sha256}</code>{artifact.sourceCommit&&<p>카탈로그 소스 커밋 <code className="hash">{artifact.sourceCommit}</code></p>}{proof&&<><p>증명 검사 대상: {proof.expectedRepository}</p><p>검사 시각: {proof.checkedAt?new Date(proof.checkedAt).toLocaleString('ko-KR'):'기록 없음'}</p>{proof.lastAttemptAt&&<p>최근 조회 시도: {new Date(proof.lastAttemptAt).toLocaleString('ko-KR')}{proof.stale?' · 조회 실패로 이전 검증 결과 유지':''}</p>}{proof.sourceCommit&&<p>서명된 소스 커밋 <code className="hash">{proof.sourceCommit}</code></p>}{proof.error&&<p className="hint">{proof.error}</p>}</>}{artifact.sourceArchiveUrl&&<a className="inline-link" href={artifact.sourceArchiveUrl} target="_blank" rel="noreferrer">대응 소스 받기</a>}<p className="hint">서명은 이 파일의 빌드 출처에 대한 근거입니다. 음질·데이터 보존·실기 호환성 인증은 아닙니다. 증명이 없다는 사실만으로 파일이 변조되었다고 판단하지 않습니다.</p></details>
 </section>;
}
