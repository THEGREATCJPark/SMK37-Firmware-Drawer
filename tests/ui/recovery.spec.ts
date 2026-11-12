import { expect,test,type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const dump=()=>{const bytes=Buffer.alloc(1048576,0x55);bytes.write('trimdat',0xc1224,'ascii');return bytes;};
const file=(name:string,buffer:Buffer)=>({name,mimeType:'application/octet-stream',buffer});
const openBackups=async(page:Page)=>{await page.goto('/');await page.getByRole('button',{name:'백업과 이력',exact:true}).first().click();};
const register=(page:Page)=>page.getByRole('button',{name:'파일 검증 후 소유자 확인 기록 등록',exact:true});
const check=(page:Page)=>page.getByRole('button',{name:'두 덤프 로컬 검증',exact:true});
const owner=(page:Page)=>page.getByRole('checkbox',{name:/독립적으로 읽은 두 파일은/});

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    (window as Window&{midiRequests:number}).midiRequests=0;
    Object.defineProperty(Navigator.prototype,'requestMIDIAccess',{configurable:true,value:async()=>{
      (window as Window&{midiRequests:number}).midiRequests++;
      throw new Error('Recovery tests must not request MIDI');
    }});
  });
});
test.afterEach(async({page})=>{expect(await page.evaluate(()=>(window as Window&{midiRequests:number}).midiRequests)).toBe(0);});

test('두 실제 로컬 덤프 검사 · 불일치 거절 · 파일 변경 무효화 · 소유자 확인 후 기록 저장',async({page})=>{
  await openBackups(page);
  const first=dump(),different=dump();different[99999]^=1;
  await page.getByLabel('전체 덤프 1',{exact:true}).setInputFiles(file('first.bin',first));
  await page.getByLabel('전체 덤프 2',{exact:true}).setInputFiles(file('different.bin',different));
  await check(page).click();await expect(page.getByRole('status')).toContainText('두 덤프의 내용이 다릅니다');
  await expect(register(page)).toBeDisabled();await expect(owner(page)).toBeDisabled();
  await page.getByLabel('전체 덤프 2',{exact:true}).setInputFiles(file('second.bin',dump()));
  await check(page).click();await expect(page.getByRole('status')).toContainText('검사를 통과했습니다');
  await page.getByLabel('보관 위치를 알아볼 수 있는 메모').fill('PRIVATE_STORAGE_REFERENCE');
  await expect(register(page)).toBeDisabled();await owner(page).check();await expect(register(page)).toBeEnabled();
  await page.getByLabel('전체 덤프 1',{exact:true}).setInputFiles([]);
  await expect(register(page)).toBeDisabled();await expect(owner(page)).not.toBeChecked();await expect(check(page)).toBeDisabled();
  await page.getByLabel('전체 덤프 1',{exact:true}).setInputFiles(file('fresh-first.bin',first));
  await check(page).click();await expect(page.getByRole('status')).toContainText('검사를 통과했습니다');
  await owner(page).check();await register(page).click();
  await expect(page.getByText(/두 파일 검사 \+ 소유자 확인/)).toBeVisible();
  const saved=await page.evaluate(()=>new Promise<{sha256:string;model:string;verifiedByOwner:boolean}>((resolve,reject)=>{
    const open=indexedDB.open('smk37-personal-drawer');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result;const tx=db.transaction('settings');const request=tx.objectStore('settings').get('full-backup:SMK-37 Pro');request.onsuccess=()=>resolve(request.result);tx.oncomplete=()=>db.close();};
  }));
  expect(saved).toMatchObject({sha256:createHash('sha256').update(first).digest('hex'),model:'SMK-37 Pro',verifiedByOwner:true});
});

test('검증 후 모델 변경은 파일과 소유자 확인을 초기화한다',async({page})=>{
  await openBackups(page);
  for(const index of [1,2])await page.getByLabel(`전체 덤프 ${index}`,{exact:true}).setInputFiles(file(`read-${index}.bin`,dump()));
  await check(page).click();await expect(page.getByRole('status')).toContainText('검사를 통과했습니다');
  await page.getByLabel('보관 위치를 알아볼 수 있는 메모').fill('two offline copies');await owner(page).check();await expect(register(page)).toBeEnabled();
  await page.getByLabel('실물 모델',{exact:true}).selectOption('SMK-37 Elite');
  await expect(register(page)).toBeDisabled();await expect(check(page)).toBeDisabled();await expect(owner(page)).not.toBeChecked();
  await expect(page.getByLabel('보관 위치를 알아볼 수 있는 메모')).toHaveValue('');
  expect(await page.getByLabel('전체 덤프 1',{exact:true}).evaluate((el:HTMLInputElement)=>el.files?.length)).toBe(0);
});

test('360px 복구 안내 · 로컬 보고서는 모델 일치 실제 이력만 담고 경로와 원본을 제외한다',async({page})=>{
  await page.setViewportSize({width:360,height:844});await page.goto('/');
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{
    const open=indexedDB.open('smk37-personal-drawer');open.onerror=()=>reject(open.error);open.onsuccess=()=>{
      const db=open.result;const tx=db.transaction(['settings','history'],'readwrite');
      tx.objectStore('settings').put({model:'SMK-37 Pro',sha256:'b'.repeat(64),date:'2026-01-01T00:00:00Z',reference:'PRIVATE_PATH',verifiedByOwner:true},'full-backup:SMK-37 Pro');
      const history={id:'actual',startedAt:'2026-01-01T00:00:00Z',artifactId:'test-artifact',productId:'test',sha256:'a'.repeat(64),targetModel:'SMK-37 Pro',previousIdentity:'SMK-37 Pro_016',status:'interrupted',simulated:false,browser:'PRIVATE_BROWSER',note:'PRIVATE_NOTE'};
      tx.objectStore('history').put(history);tx.objectStore('history').put({...history,id:'simulation',simulated:true,artifactId:'SIMULATION_ARTIFACT'});tx.objectStore('history').put({...history,id:'other',targetModel:'FM-1',artifactId:'OTHER_MODEL_ARTIFACT'});
      tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
    };
  }));
  await page.getByRole('button',{name:'백업과 이력',exact:true}).first().click();
  await page.getByRole('button',{name:'복구 도우미',exact:true}).first().click();
  await expect(page.getByRole('heading',{name:'복구 안내',exact:true})).toBeVisible();
  await page.getByLabel('현재 증상',{exact:true}).selectOption('interrupted');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'복구 보고서 저장',exact:true}).click();const download=await pending;
  const content=await readFile((await download.path())!,'utf8');const report=JSON.parse(content);
  expect(report).toMatchObject({model:'SMK-37 Pro',symptom:'interrupted'});expect(report.history).toHaveLength(1);expect(report.history[0].artifactId).toBe('test-artifact');
  expect(report.packages.length).toBeGreaterThan(0);expect(report.fullBackup.sha256).toBe('b'.repeat(64));
  expect(content).not.toMatch(/PRIVATE_|SIMULATION_ARTIFACT|OTHER_MODEL_ARTIFACT|"bytes"|"base64"/);
});
