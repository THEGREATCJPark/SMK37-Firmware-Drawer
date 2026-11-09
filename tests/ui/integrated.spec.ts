import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
const va=readFileSync('.local/packages/SMK-37+VA-102.fwsc');
const factory=readFileSync('.local/integration/va-factory.syx');
test('+VA downloads both pinned files in the same page and caches only on request',async({page,context})=>{
 await context.addInitScript(()=>{Object.defineProperty(Navigator.prototype,'requestMIDIAccess',{value:()=>{throw Error('Unexpected MIDI access');},configurable:true});});
 await page.route('http://127.0.0.1:19437/packages/va-102',route=>route.fulfill({body:va,contentType:'application/octet-stream'}));
 await page.route('http://127.0.0.1:19437/packages/va-factory',route=>route.fulfill({body:factory,contentType:'application/octet-stream'}));
 await page.goto('/');await page.getByRole('button',{name:'+VA 열기',exact:true}).click();await page.getByRole('button',{name:'파일 검사·설치 준비'}).click();
 await page.getByRole('button',{name:'이 웹에서 패키지 받기'}).click();
 await expect(page.getByText(/초기 음색 파일: 검증 준비됨/)).toBeVisible();
 await expect(page.getByRole('button',{name:'호환성·파일 검사'})).toBeDisabled();
 await page.getByRole('button',{name:'검증 후 오프라인 보관'}).click();await expect(page.getByRole('button',{name:'다시 검증·보관'})).toBeVisible();
 expect(context.pages()).toHaveLength(1);
 await page.reload();await page.getByRole('button',{name:'+VA 열기',exact:true}).click();await page.getByRole('button',{name:'파일 검사·설치 준비'}).click();
 await expect(page.getByText(/초기 음색 파일: 검증 준비됨/)).toBeVisible();
 await expect(page.getByText('보관한 패키지를 불러왔습니다',{exact:true})).toBeVisible();
});
test('+VA factory download corruption blocks preparation without MIDI',async({page})=>{
 await page.route('http://127.0.0.1:19437/packages/va-102',route=>route.fulfill({body:va}));
 await page.route('http://127.0.0.1:19437/packages/va-factory',route=>route.fulfill({body:Buffer.alloc(factory.length)}));
 await page.goto('/');await page.getByRole('button',{name:'+VA 열기',exact:true}).click();await page.getByRole('button',{name:'파일 검사·설치 준비'}).click();await page.getByRole('button',{name:'이 웹에서 패키지 받기'}).click();
 await expect(page.getByText(/SHA-256이 다릅니다/)).toBeVisible();
 await expect(page.getByRole('button',{name:'검증 후 오프라인 보관'})).toBeDisabled();
});
test('sloopDX is visibly experimental and downloadable in the installer',async({page})=>{
 await page.goto('/');await expect(page.getByText('실험 포트 설치',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'sloopDX 열기',exact:true}).click();await page.getByRole('button',{name:'파일 검사·설치 준비'}).click();
 await expect(page.locator('.install-panel').getByText('실험 포트 · 실기 미검증',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'이 웹에서 패키지 받기'}).click();await expect(page.getByRole('button',{name:'패키지 다시 받기'})).toBeVisible();
 await expect(page.getByRole('button',{name:'호환성·파일 검사'})).toBeDisabled();
});
