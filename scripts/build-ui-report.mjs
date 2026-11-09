import { readFile, writeFile, mkdir } from 'node:fs/promises';

const folder = 'output/playwright/redesign';
const png = async (phase, name) => `data:image/png;base64,${(await readFile(`${folder}/${phase}/${name}.png`)).toString('base64')}`;
const shot = async (phase, name, alt) => `<img src="${await png(phase, name)}" alt="${alt}" decoding="async">`;
async function comparison(id, title, note, name) {
  return `<section aria-labelledby="${id}"><h2 id="${id}">${title}</h2><p>${note}</p>
    <div class="compare"><div class="switch" aria-label="${title} 화면 전환">
      <button type="button" data-view="final" aria-pressed="true">변경 후</button>
      <button type="button" data-view="before" aria-pressed="false">변경 전</button>
    </div><figure data-phase="final">${await shot('final',name,`${title} 변경 후 실제 앱 화면`)}<figcaption>변경 후 · 실제 production 앱</figcaption></figure>
    <figure data-phase="before" hidden>${await shot('before',name,`${title} 변경 전 실제 앱 화면`)}<figcaption>변경 전 · 동일한 데스크톱 브라우저 조건</figcaption></figure></div></section>`;
}
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SMK37 UI 개선 보고서</title><style>
*{box-sizing:border-box}body{margin:0;background:#f6f6f4;color:#252724;font:16px/1.7 system-ui,'Malgun Gothic',sans-serif}main{max-width:1184px;margin:auto;padding:56px 32px 80px}h1{font-size:36px;line-height:1.25;font-weight:600;margin:12px 0 20px}h2{font-size:24px;font-weight:600;margin:0 0 8px}h3{font-size:18px;font-weight:600;margin:0 0 12px}p{max-width:850px;margin:0 0 20px;color:#555953}a{color:#984421;text-underline-offset:4px}header{padding-bottom:32px;border-bottom:1px solid #c9cec5}.date{font-size:14px}section{margin-top:48px}.facts{display:flex;flex-wrap:wrap;gap:8px 24px;padding:20px 0;border-bottom:1px solid #c9cec5}.facts span{white-space:nowrap}ul{padding-left:22px;max-width:850px}li+li{margin-top:8px}.switch{display:flex;gap:4px;padding:8px;border:1px solid #c9cec5;background:#eaece7;border-radius:8px 8px 0 0}.switch button{font:inherit;padding:10px 20px;border:0;border-radius:4px;cursor:pointer;background:transparent;color:#252724}.switch button[aria-pressed=true]{background:#252724;color:white}button:focus-visible,a:focus-visible{outline:3px solid #984421;outline-offset:3px}figure{margin:0;background:white;border:1px solid #c9cec5;border-top:0}img{display:block;width:100%;height:auto}figcaption{padding:12px 16px;border-top:1px solid #eaece7;font-size:14px;color:#555953}.gallery{display:grid;grid-template-columns:minmax(230px,340px) minmax(0,1fr);gap:32px}.gallery figure{border:1px solid #c9cec5;margin-bottom:24px}.gallery details{border-top:1px solid #c9cec5;padding:16px 0}.gallery summary{cursor:pointer;font-weight:600;padding-bottom:12px}footer{margin-top:48px;padding-top:24px;border-top:1px solid #c9cec5;font-size:14px}[hidden]{display:none!important}@media(max-width:700px){main{padding:32px 16px 48px}h1{font-size:28px}.facts{display:block}.facts span{display:block}.gallery{grid-template-columns:1fr}.mobile{max-width:390px;margin:auto}section{margin-top:36px}}
</style><main><header><div class="date">SMK37 Firmware Drawer · 2026.11.09</div><h1>펌웨어를 고르고 확인하는 데 집중한 화면</h1>
<p>큰 인사말과 가상 제품 장식을 걷어내고, 모델별 버전·설치 경로·다음 작업을 먼저 읽을 수 있도록 정리했습니다. 이 보고서의 이미지는 실행 중인 앱에서 직접 캡처했습니다.</p>
<a href="http://127.0.0.1:4173/">로컬 앱 열기</a></header>
<div class="facts"><span><b>42개</b> 단위 시험 통과</span><span><b>26개</b> Chrome·Edge 시험 통과</span><span><b>Production 빌드</b> 통과</span></div>
<section><h2>적용한 방향</h2><ul><li>카드 그림 대신 제품·버전·설치 경로를 같은 열에 배치했습니다.</li><li>대상 모델을 모든 작업 화면의 공통 헤더에 두고, 모바일 주 메뉴는 하단으로 옮겼습니다.</li><li>설치 준비의 첫 작업을 앞으로 옮기고, 버튼이 비활성인 이유와 실제 USB 미검증 상태를 표시했습니다.</li><li>검색 초기화, 키보드 초점 복귀, 모델 변경 시 백업 확인값 초기화를 보완했습니다.</li></ul></section>
${await comparison('library','카탈로그','동일한 1440×1040 브라우저의 전체 페이지 캡처입니다. 제품별 버전과 설치 경로를 정렬해 비교할 수 있습니다.','01-library')}
${await comparison('install','설치 준비','제품 설명을 접고 기기 연결과 파일 선택을 먼저 보여줍니다. 표시 단계는 실제 설치 상태에 따라 바뀝니다.','03-install')}
<section><h2>나머지 작업 화면</h2><p>모바일은 390×844 최종 화면입니다. 320–1280px 범위의 목록·보관·포팅 화면과 좁은 오프라인 헤더를 브라우저 시험으로 확인했습니다.</p><div class="gallery"><div class="mobile"><h3>모바일 목록</h3><figure>${await shot('final','06-mobile','390px 모바일 목록과 하단 주 메뉴')}<figcaption>모델 선택 · 검색 · 목록 · 하단 탐색</figcaption></figure></div><div>
<details open><summary>제품 상세</summary><figure>${await shot('final','02-detail','Frodhes 상세와 버전·기능 안내')}</figure></details>
<details><summary>백업과 이력</summary><figure>${await shot('final','04-backups','백업 확인 기록과 프로젝트 보관함')}</figure></details>
<details><summary>포팅 작업실</summary><figure>${await shot('final','05-porting','기존 소스 재현 빌드와 별도 신규 포팅 준비')}</figure></details>
</div></div></section>
<section><h2>참고한 공개 자료</h2><p><a href="https://github.com/benjitaylor/skills/tree/299140fafd08df55a9c234e610c3f64af3f45531/stageshow">Benji Taylor · Stageshow</a>의 위계·간격·타이포 원칙과 <a href="https://github.com/heydamir/unslop/tree/97daa3eb365670ea3f87ed85356cbfcee18105a5">Damir Sokolovsky · unslop</a>의 진단 및 아홉 가지 정리 순서를 참고했습니다. Stageshow는 제품 일러스트레이션 도구이므로 가상 UI kit를 실제 앱에 넣지 않았습니다. unslop 가이드의 한국어 요약·적용 결과이며, 해당 가이드는 <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>입니다.</p></section>
<section><h2>검증 범위</h2><p><code>npm run check</code>가 exit 0으로 완료됐습니다. 실제 공개 패키지를 이용한 파일 검증·모의 MIDI 전송과 기존 보호 조건의 회귀시험을 포함합니다. 독립 코드 재검토에 남은 critical/important 지적은 없습니다.</p><p>실제 USB 권한 요청, 펌웨어 기록·지우기·복구는 실행하지 않았습니다. 최종 기록은 사용자가 앱에서 직접 시작합니다. 신규 FM-1 포트는 별도 준비 작업으로 유지했습니다. 실제 기기·Galaxy USB 검증과 전체 접근성 인증을 완료한 것은 아닙니다. 기존 원본 펌웨어 host suite 실패는 앱 시험 통과에 포함하지 않았습니다.</p></section>
<footer>이 파일은 캡처 이미지를 포함해 독립적으로 열 수 있습니다. 로컬 앱은 실행 중인 서버가 필요합니다. 기존 앱 탭에 이전 UI가 남으면 모든 앱 탭을 닫고 다시 열어 주세요.</footer>
</main><script>
document.querySelectorAll('.switch button').forEach(button=>button.addEventListener('click',()=>{const group=button.closest('.compare');group.querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));group.querySelectorAll('figure').forEach(figure=>{figure.hidden=figure.dataset.phase!==button.dataset.view;});}));
</script></html>`;
await mkdir(folder,{recursive:true});
await writeFile(`${folder}/report.html`,html,'utf8');
console.log(`Created ${folder}/report.html (${Buffer.byteLength(html)} bytes)`);
