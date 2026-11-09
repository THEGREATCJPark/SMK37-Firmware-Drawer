import type { Artifact, Model } from '../catalog/schema';
import type { Identity } from '../vendor/fm1ota.js';
import { OTHER_SMK, OUR_LOADER } from '../vendor/fm1ota.js';
export type CurrentFamily = 'stock' | 'sloop-pro' | 'frodhes' | 'unknown';
export const TRANSITIONS = [
  { family: 'stock', version: 16, evidence: 'source-reviewed' },
  { family: 'sloop-pro', version: 900, evidence: 'source-reviewed' },
  { family: 'frodhes', version: 470, evidence: 'source-reviewed' },
] as const;
export function assertRoute(identity: Identity, artifact: Artifact, physical: Model, family: CurrentFamily, resume = false): void {
  const match = /^(.*)_(\d+)$/.exec(identity.text);
  if (!match || match[1] !== identity.model || Number(match[2]) !== identity.version) throw new Error('MIDI 식별 응답이 없거나 서로 일치하지 않습니다.');
  if (OTHER_SMK(identity)) throw new Error('독자 업데이트 형식입니다. 해당 개발자의 설치기를 사용하세요.');
  const reported = identity.model.replace(/^ota-/, '');
  if (physical === 'FM-1' || artifact.targetModel === 'FM-1' || reported !== physical || artifact.targetModel !== physical) {
    throw new Error(`모델 불일치: 선택한 실물 ${physical} · 응답 ${reported} · 파일 ${artifact.targetModel}`);
  }
  if (artifact.loaderFamily !== 'felucca-ufw' || artifact.method !== 'direct' || artifact.status !== 'published') throw new Error('검토된 SMK37 직접 설치 경로가 아닙니다.');
  if (resume) {
    if (!OUR_LOADER(identity)) throw new Error('지원하지 않는 loader입니다. 원래 설치기로 복구 안내를 확인하세요.');
    if (identity.text !== 'ota-' + artifact.packageIdentity) throw new Error('목표 패키지와 loader identity가 다릅니다.');
    return;
  }
  if (identity.model.startsWith('ota-')) throw new Error('업데이트 모드입니다. 동일 패키지 재개 절차를 사용하세요.');
  if (identity.version < 16) throw new Error('순정 V016 이전 또는 복구 상태입니다. M-Vave의 모델별 공식 업데이트 경로를 먼저 확인하세요.');
  if (family === 'unknown') throw new Error('현재 펌웨어를 기기에서 직접 확인하고 선택하세요. identity만으로 제품/버전을 구별할 수 없습니다.');
  if (!TRANSITIONS.some(t => t.family === family && t.version === identity.version)) throw new Error('현재 펌웨어에서 목표로 가는 설치 경로가 확인되지 않았습니다.');
}
