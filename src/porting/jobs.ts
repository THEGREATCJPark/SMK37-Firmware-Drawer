import type { Catalog, Model, Product } from '../catalog/schema';
export function createPortJob(product:Product,catalog:Catalog,target:Model,buildExisting=false){
  const candidates=catalog.artifacts.filter(a=>a.productId===product.id&&a.targetModel===target&&a.status==='published');
  const upstream=catalog.artifacts.find(a=>a.productId===product.id&&a.targetModel==='FM-1')??candidates[0];
  const supported=product.id==='sloop-pro' && target==='SMK-37 Pro';
  return {
    format:'smk37-port-job',schemaVersion:1,createdAt:new Date().toISOString(),productId:product.id,targetModel:target,
    mode:buildExisting&&supported?'supported-target-build':candidates.length?'existing-package':'new-port-spec',
    source:{url:product.repository,commit:upstream?.sourceCommit??null,license:product.license,verifiedAt:product.verifiedAt},
    existingArtifacts:candidates.map(a=>({id:a.id,version:a.version,sha256:a.sha256,releaseUrl:a.releaseUrl})),
    recipe:supported?{id:'sloop-pro-2.8.4-pro',entry:'python scripts/firmware/build.py',target:'BOARD=smk37 MODEL=pro',sourceCommit:'701844ba0103c434b4fe4467373857b794487b51',scope:'기존 upstream 매핑을 유지한 Pro 빌드만 자동화. 실제 설치 없음.'}:null,
    upstreamBaseline:{model:'FM-1',version:upstream?.upstreamVersion??upstream?.version??null,required:'같은 날 원본 app/package/loader hash 비교. 기존 실패를 별도 기록.'},
    mapping:{status:supported?'existing-upstream':'needs-owner-decision',reference:product.manualUrl,notes:product.mapping,
      draft:{pads:'사용자가 역할 확정',faders:'사용자가 역할 확정',outerKeys:'사용자가 역할 확정',wheels:'사용자가 역할 확정',knobsAndButtons:'기존 UI 매핑부터 검토'}},
    storage:{protected:['0x00000-0x03FFF','0xC0000-0xC1FFF','0xF4000-0xFDFFF','0xFF000-0xFFFFF'],objects:'모든 OBJ_* 주소를 검토하고 SMK 저장창으로 재배치',family:'설정 schema 일치 확인 전 upstream과 공유하지 않음'},
    changes:supported?['소스 변경 없음. 지원 대상 재현 빌드.']:['BOARD_SMK37 분기','LCD·키·패드·노브·휠 매핑','저장 객체 배치','모델별 package identity','정상·재개 모델 검사'],
    checks:['FM-1 baseline byte-identical','SMK37 빌드','보호 주소와 RAM driver guard','package CRC/model/hash','MockTransport','보드별 host tests'],
    remainingHardwareTests:['전체 백업 검증','키·패드·노브·휠·페달','오디오','저장·재부팅','공식 복귀 경로'],
    guide:'https://github.com/genkigenki/fm1-to-smk37/tree/54252ffa2219e3c9cd7eb70f4e99b361eaa048e1',
    resultFormat:'smk37-build-bundle v1; docs/porting-workflow.md',
    constraints:['장치 명령 자동 실행 금지','새 매핑은 사용자 확정 전 구현 금지','임의 저장소 자동 실행 금지','결과는 build-only; 일반 설치 자동 승격 금지'],
  };
}
