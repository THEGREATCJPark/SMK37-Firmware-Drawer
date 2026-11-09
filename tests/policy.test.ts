import { expect, it } from 'vitest';
import { assertRoute } from '../src/install/policy';
import { fixtureArtifact } from './fixtures';
import type { Identity } from '../src/vendor/fm1ota.js';
function id(text: string): Identity { const [model,version] = text.split('_'); return {text,model,version:Number(version)}; }

it('순정 V016에서 선택한 정확한 모델로의 전환을 허용한다', () => {
  expect(() => assertRoute(id('SMK-37 Pro_016'),fixtureArtifact,'SMK-37 Pro','stock')).not.toThrow();
});
it('FM-1 기기와 패키지는 정상·재개 모두 차단한다', () => {
  for (const resume of [false,true]) {
    expect(() => assertRoute(id((resume?'ota-':'')+'FM-1_900'),fixtureArtifact,'SMK-37 Pro','sloop-pro',resume)).toThrow(/모델/);
    expect(() => assertRoute(id((resume?'ota-':'')+'SMK-37 Pro_470'),{...fixtureArtifact,targetModel:'FM-1',packageIdentity:'FM-1_900'},'SMK-37 Pro','frodhes',resume)).toThrow(/모델|SMK37/);
  }
});
it('구형 순정, 독자 업데이트 형식, 미확인 출발 펌웨어를 차단한다', () => {
  expect(() => assertRoute(id('SMK-37 Pro_015'),fixtureArtifact,'SMK-37 Pro','stock')).toThrow(/V016/);
  expect(() => assertRoute(id('SMK-37_931'),fixtureArtifact,'SMK-37 Pro','unknown')).toThrow(/업데이트 형식/);
  expect(() => assertRoute(id('SMK-37 Pro_999'),fixtureArtifact,'SMK-37 Pro','sloop-pro')).toThrow(/경로/);
  expect(() => assertRoute(id('SMK-37 Pro_900'),fixtureArtifact,'SMK-37 Pro','unknown')).toThrow(/직접 확인/);
});
it('재개에서는 알려진 loader와 동일한 target package만 허용한다', () => {
  expect(() => assertRoute(id('ota-SMK-37 Pro_900'),fixtureArtifact,'SMK-37 Pro','unknown',true)).not.toThrow();
  expect(() => assertRoute(id('ota-SMK-37 Pro_016'),fixtureArtifact,'SMK-37 Pro','stock',true)).toThrow(/loader/);
  expect(() => assertRoute(id('ota-SMK-37 Pro_470'),fixtureArtifact,'SMK-37 Pro','sloop-pro',true)).toThrow(/loader identity/);
  expect(() => assertRoute(id('ota-SMK-37 Elite_470'),fixtureArtifact,'SMK-37 Pro','frodhes',true)).toThrow(/모델/);
});
it('기기 identity 자체가 불일치하거나 누락되면 거절한다', () => {
  expect(() => assertRoute({text:'SMK-37 Pro_016',model:'FM-1',version:16},fixtureArtifact,'SMK-37 Pro','stock')).toThrow(/식별/);
  expect(() => assertRoute({text:'',model:'',version:0},fixtureArtifact,'SMK-37 Pro','stock')).toThrow(/식별/);
});
