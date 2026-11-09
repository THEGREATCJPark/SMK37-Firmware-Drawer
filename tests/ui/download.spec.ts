import { test,expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const data=JSON.parse(readFileSync('src/catalog/catalog.json','utf8')) as {artifacts:Array<{filename:string|null;sha256:string|null;downloadUrl?:string}>};
test('다섯 펌웨어·세 모델 모두 같은 화면에서 패키지를 받아 검증한다',async({page,context})=>{
  await page.addInitScript(()=>{Object.defineProperty(navigator,'requestMIDIAccess',{value:()=>{throw Error('다운로드 중 MIDI 접근 금지');}});});
  await page.route('**/*.fwsc',async route=>{
    const url=route.request().url();
    const a=data.artifacts.find(a=>a.filename&&(url.endsWith('/'+a.filename)||url.endsWith('/'+a.sha256+'.fwsc')||a.downloadUrl===url));
    if(!a)throw Error('Unknown download '+url);
    await route.fulfill({body:readFileSync('.local/packages/'+a.filename),contentType:'application/octet-stream'});
  });
  await page.goto('/');
  for(const model of ['SMK-37 Pro','SMK-37 Elite','MKE-P37']){
    await page.getByLabel('실물 모델').selectOption(model);
    for(const name of ['SLOOP Pro','Frodhes','Erik37','OberVave','ChoralRoot']){
      await page.getByRole('button',{name:name+' 열기',exact:true}).click();
      await page.getByRole('button',{name:'파일 검사·설치 준비',exact:true}).click();
      await page.getByRole('button',{name:'이 웹에서 패키지 받기',exact:true}).click();
      await expect(page.getByRole('button',{name:'패키지 다시 받기',exact:true})).toBeEnabled();
      await expect(page.getByRole('button',{name:'검증 후 오프라인 보관',exact:true})).toBeEnabled();
      await expect(page.getByRole('button',{name:'이 기기에 설치 시작',exact:true})).toHaveCount(0);
      expect(context.pages()).toHaveLength(1);
      await page.getByRole('button',{name:'닫기',exact:true}).click();
    }
  }
});
test('다운로드 변조는 화면에서 거절하고 다른 배포 버전을 선택할 수 있다',async({page})=>{
  const bytes=readFileSync('.local/packages/frodhes-0.9.9-smk37-pro.fwsc');bytes[100]^=1;
  await page.route('**/*.fwsc',route=>route.fulfill({body:bytes,contentType:'application/octet-stream'}));
  await page.goto('/');await page.getByRole('button',{name:'Frodhes 열기',exact:true}).click();
  await page.getByLabel('설치할 버전').selectOption('frodhes-0.9.9-pro');
  await page.getByRole('button',{name:'파일 검사·설치 준비',exact:true}).click();
  await page.getByRole('button',{name:'이 웹에서 패키지 받기',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('SHA-256');
  await expect(page.getByRole('button',{name:'검증 후 오프라인 보관',exact:true})).toBeDisabled();
});
