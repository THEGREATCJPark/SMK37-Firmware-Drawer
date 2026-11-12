import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const source=()=>JSON.parse(readFileSync('public/updates.json','utf8'));
test('새 배포·설치 목록 분리, 출처 증명 표시, 모바일·오프라인 이전 조사 보관',async({page,context})=>{
 const snapshot=source();snapshot.generatedAt=new Date().toISOString();
 await page.route('**/updates.json',route=>route.fulfill({json:snapshot}));
 await page.addInitScript(()=>Object.defineProperty(navigator,'requestMIDIAccess',{value:()=>{throw Error('Unexpected MIDI');}}));
 await page.goto('/');await page.getByRole('button',{name:'새 배포 확인',exact:true}).click();
 await expect(page.getByRole('heading',{name:'새 배포 확인',exact:true})).toBeVisible();await expect(page.locator('.discovery-grid article')).toHaveCount(25);
 await expect(page.getByText('0.9.2 / 0.9.9 / 0.9.10',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'이 기기에 설치 시작'})).toHaveCount(0);
 await page.setViewportSize({width:360,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'내 펌웨어 서랍',exact:true}).click();await page.getByRole('button',{name:'OberVave 열기',exact:true}).click();
 await expect(page.getByText('GitHub 서명 검증됨',{exact:true})).toBeVisible();await expect(page.getByText('이 앱을 통한 실기 설치 미검증',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>new Promise<boolean>(resolve=>{const open=indexedDB.open('smk37-personal-drawer');open.onsuccess=()=>{const db=open.result;const read=db.transaction('settings').objectStore('settings').get('upstream-snapshot-v1');read.onsuccess=()=>{db.close();resolve(!!read.result);};read.onerror=()=>{db.close();resolve(false);};};open.onerror=()=>resolve(false);}));
 await page.unroute('**/updates.json');await context.setOffline(true);await page.reload();await page.getByRole('button',{name:'새 배포 확인',exact:true}).click();
 await expect(page.getByText(/마지막으로 받은 정보를 표시합니다/)).toBeVisible();await expect(page.locator('.discovery-grid article')).toHaveCount(25);
});
test('출처 실패와 오래된 조사 결과를 정상·최신으로 표시하지 않는다',async({page})=>{
 const s=source();s.generatedAt='2026-01-01T00:00:00Z';for(const a of s.attestations)if(a.artifactIds.some((id:string)=>id.startsWith('obervave'))){a.status='failed';a.sourceCommit=null;a.error='검증 실패 시험';}
 await page.route('**/updates.json',route=>route.fulfill({json:s}));await page.goto('/');await page.getByRole('button',{name:'새 배포 확인',exact:true}).click();
 await expect(page.getByText(/48시간 이상/)).toBeVisible();await page.getByRole('button',{name:'내 펌웨어 서랍',exact:true}).click();await page.getByRole('button',{name:'OberVave 열기',exact:true}).click();
 await expect(page.locator('.package-evidence').getByText(/검토 전에는 설치할 수 없습니다/)).toBeVisible();
 await page.getByRole('button',{name:'파일 검사·설치 준비'}).click();await expect(page.locator('.install-panel').getByRole('alert')).toContainText('빌드 출처 검증이 실패');
 await expect(page.getByRole('button',{name:'호환성·파일 검사'})).toBeDisabled();
});
