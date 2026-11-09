import { expect,test } from '@playwright/test';
import { existsSync } from 'node:fs';

test('실제 카탈로그 · 검색 · 즐겨찾기 유지 · 안전한 기본 화면',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.locator('.firmware-card')).toHaveCount(7);
  await expect(page.getByRole('button',{name:'이 기기에 설치 시작'})).toHaveCount(0);
  await page.getByRole('button',{name:'SLOOP Pro 즐겨찾기'}).click();
  await expect(page.getByRole('button',{name:'SLOOP Pro 즐겨찾기'})).toHaveAttribute('aria-pressed','true');
  await page.reload();await expect(page.getByRole('button',{name:'SLOOP Pro 즐겨찾기'})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('textbox',{name:'펌웨어 검색'}).fill('피아노');
  await expect(page.getByRole('button',{name:'Erik37 열기',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'+VA 열기',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'검색 지우기'}).click();
  await page.screenshot({path:'output/playwright/desktop.png',fullPage:true});
  expect(errors).toEqual([]);
});
for(const width of [360,390]) test(`모바일 ${width}px에서 모든 화면이 가로 넘침 없이 동작한다`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.goto('/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Frodhes 열기',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button',{name:'파일 검사·설치 준비'}).click();
  await expect(page.getByRole('button',{name:'호환성·파일 검사'})).toBeDisabled();
  await expect(page.getByText('아직 연결하지 않음',{exact:true})).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.screenshot({path:'output/playwright/mobile.png',fullPage:true});
  await page.getByRole('button',{name:'포팅 작업실',exact:true}).first().click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('같은 앱의 두 탭 연결 차단 · 지연된 MIDI 목록 갱신 (모의 포트)',async({context,page})=>{
  await context.addInitScript(()=>{
    Object.defineProperty(Navigator.prototype,'requestMIDIAccess',{value:async()=>{
      const access=Object.assign(new EventTarget(),{inputs:new Map(),outputs:new Map()});
      setTimeout(()=>{access.inputs.set('mock-in',{id:'mock-in',name:'Delayed mock input',state:'connected'});access.outputs.set('mock-out',{id:'mock-out',name:'Delayed mock output',state:'connected'});access.dispatchEvent(new Event('statechange'));},300);
      return access;
    },configurable:true});
  });
  const open=async(p:typeof page)=>{await p.goto('/');await p.getByRole('button',{name:'Frodhes 열기',exact:true}).click();await p.getByRole('button',{name:'파일 검사·설치 준비'}).click();await p.getByRole('button',{name:'MIDI 연결',exact:true}).click();};
  await open(page);await expect(page.getByRole('option',{name:'Delayed mock input'})).toHaveCount(1);
  const second=await context.newPage();await open(second);await expect(second.getByText(/다른 서랍 탭이 MIDI를 사용/)).toBeVisible();
  await page.getByRole('dialog').last().getByRole('button',{name:'닫기',exact:true}).click();
  await second.getByRole('button',{name:'MIDI 연결',exact:true}).click();await expect(second.getByRole('dialog').last().getByRole('heading',{name:'MIDI 포트 선택'})).toBeVisible();
});

test('오프라인 보관 bytes가 손상되면 metadata가 같아도 SHA 검사에서 거절한다',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Frodhes 열기',exact:true}).click();await page.getByRole('button',{name:'파일 검사·설치 준비'}).click();
  await page.getByLabel('설치 패키지 파일').setInputFiles('.local/packages/frodhes-0.9.2.fwsc');await page.getByRole('button',{name:'검증 후 오프라인 보관'}).click();await expect(page.getByRole('button',{name:'다시 검증·보관'})).toBeVisible();
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const open=indexedDB.open('smk37-personal-drawer');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result;const tx=db.transaction('backups','readwrite');const store=tx.objectStore('backups');const read=store.getAll();read.onsuccess=()=>{const b=read.result[0];b.bytes[1000]^=1;store.put(b);};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}));
  await page.reload();await page.getByRole('button',{name:'Frodhes 열기',exact:true}).click();await page.getByRole('button',{name:'파일 검사·설치 준비'}).click();await page.getByRole('button',{name:'다시 검증·보관'}).click();
  await expect(page.getByText(/SHA-256.*다릅니다/)).toBeVisible();await expect(page.getByRole('button',{name:'호환성·파일 검사'})).toBeDisabled();
});
test('외부 설치기는 opened 상태만 남기고 성공을 만들지 않는다',async({page,context})=>{
  await context.route('https://baudgirl.com/**',route=>route.fulfill({body:'external installer test boundary',contentType:'text/html'}));
  await page.goto('/');await page.getByRole('button',{name:'+VA 열기',exact:true}).click();
  const popupPromise=page.waitForEvent('popup');await page.getByRole('button',{name:'개발자 설치 페이지',exact:true}).click();
  const popup=await popupPromise;await popup.waitForURL(/baudgirl/);await popup.close();
  await page.getByRole('button',{name:'닫기',exact:true}).click();await page.getByRole('button',{name:'백업과 이력',exact:true}).click();
  await expect(page.getByText('외부 설치기 열림',{exact:true})).toBeVisible();
  await expect(page.getByText('응답 확인',{exact:true})).toHaveCount(0);
});
test('실제 패키지 명시적 보관 · 오프라인 앱과 파일 재검증',async({page,context})=>{
  await page.goto('/');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  await page.getByRole('button',{name:'Frodhes 열기',exact:true}).click();await page.getByRole('button',{name:'파일 검사·설치 준비'}).click();
  await page.getByLabel('설치 패키지 파일').setInputFiles('.local/packages/frodhes-0.9.2.fwsc');
  await page.getByRole('button',{name:'검증 후 오프라인 보관'}).click();await expect(page.getByRole('button',{name:'다시 검증·보관'})).toBeVisible();
  await page.getByRole('button',{name:'닫기',exact:true}).click();await context.setOffline(true);await page.reload();
  await expect(page.locator('.firmware-card')).toHaveCount(7);await page.getByRole('button',{name:'Frodhes 열기',exact:true}).click();await page.getByRole('button',{name:'파일 검사·설치 준비'}).click();
  await expect(page.getByText('보관한 패키지를 불러왔습니다',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'다시 검증·보관'}).click();await expect(page.getByRole('button',{name:'호환성·파일 검사'})).toBeDisabled();
});
test('새 포팅 작업 파일은 다운로드되고, 실제 재현 빌드는 일반 설치로 승격되지 않는다',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'포팅 작업실',exact:true}).first().click();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'포팅 작업 내보내기',exact:true}).click();
  expect((await download).suggestedFilename()).toContain('smk37-port-job.json');
  const file='.build/firmware/sloop-pro-2.8.4/output/sloop-pro-2.8.4-local.drawer-bundle.json';
  expect(existsSync(file),'Run the pinned build recipe before the full UI evidence suite.').toBe(true);
  await page.getByLabel('완성 번들 가져오기',{exact:true}).setInputFiles(file);
  await expect(page.getByText('빌드 결과 · 실기 미확인',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'이 기기에 설치 시작'})).toHaveCount(0);
});
