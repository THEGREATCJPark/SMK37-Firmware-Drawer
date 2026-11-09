import { expect, test } from '@playwright/test';

test('검색·용도 빈 결과를 초기화하고 선택 모델을 다른 작업 화면에도 유지한다', async ({page}) => {
  await page.goto('/');
  await page.getByLabel('펌웨어 검색').fill('없는음원-xyz');
  await expect(page.getByRole('heading',{name:'조건에 맞는 펌웨어가 없습니다'})).toBeVisible();
  await page.getByRole('button',{name:'필터 초기화'}).click();
  await expect(page.locator('.firmware-card')).toHaveCount(7);
  await page.getByLabel('용도',{exact:true}).selectOption('일렉트릭 피아노');
  await expect(page.locator('.firmware-card')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Frodhes 열기',exact:true})).toBeVisible();
  await page.getByLabel('실물 모델').selectOption('SMK-37 Elite');
  await page.getByRole('button',{name:'백업과 이력',exact:true}).click();
  await expect(page.getByLabel('실물 모델')).toHaveValue('SMK-37 Elite');
  await expect(page.locator('.surface').first()).toContainText('SMK-37 Elite');
  await page.getByLabel('보관 위치를 알아볼 수 있는 메모').fill('test backup reference');
  await page.getByLabel('동일한 두 전체 덤프의 SHA-256').fill('a'.repeat(64));
  await page.getByRole('checkbox',{name:/내 기기의 1 MiB 덤프/}).check();
  await expect(page.getByRole('button',{name:'사용자 검증 기록 등록'})).toBeEnabled();
  await page.getByLabel('실물 모델').selectOption('MKE-P37');
  await expect(page.getByRole('button',{name:'사용자 검증 기록 등록'})).toBeDisabled();
  await expect(page.getByLabel('동일한 두 전체 덤프의 SHA-256')).toHaveValue('');
  await expect(page.getByRole('checkbox',{name:/내 기기의 1 MiB 덤프/})).not.toBeChecked();
  await page.getByRole('button',{name:'포팅 작업실',exact:true}).click();
  await expect(page.getByRole('button',{name:'재현 빌드 작업 내보내기'})).toBeDisabled();
});

test('키보드 본문 이동·상세 열기·Escape 닫기·초점 복귀', async ({page}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'본문으로 이동'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  const trigger=page.getByRole('button',{name:'Frodhes 열기',exact:true});
  await trigger.focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('실물 모델')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByLabel('실물 모델')).toBeEnabled();
});

test('모바일과 태블릿에서 목록·보관·포팅이 넘치지 않고 화면 전환은 맨 위에서 시작한다', async ({page}) => {
  for(const width of [320,360,390,700,768,1024,1280]) {
    await page.setViewportSize({width,height:900});await page.goto('/');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:'sloopDX 열기',exact:true}).scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'백업과 이력',exact:true}).click();
    await expect(page.getByRole('heading',{name:'백업과 이력',exact:true})).toBeInViewport();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:'포팅 작업실',exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});

test('설치 준비는 설명을 접고 다음 작업과 비활성 이유를 표시한다', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Frodhes 열기',exact:true}).click();
  await page.getByRole('button',{name:'파일 검사·설치 준비'}).click();
  await expect(page.getByRole('button',{name:'MIDI 연결',exact:true})).toBeInViewport();
  await expect(page.getByText('검사 전 준비: MIDI 기기 연결과 패키지 파일 선택')).toBeVisible();
  await expect(page.getByText('이 앱의 실제 USB 설치는 아직 검증되지 않았습니다.')).toBeVisible();
  expect(await page.locator('.detail-fold').getAttribute('open')).toBeNull();
  await expect(page.locator('.install-steps [aria-current=step]')).toContainText('기기·파일');
  await expect(page.getByRole('button',{name:'이 기기에 설치 시작'})).toHaveCount(0);
});

test('오프라인의 좁은 헤더에서도 대상 모델과 안내가 겹치지 않는다', async ({page,context}) => {
  await page.goto('/');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  await context.setOffline(true);
  for(const width of [320,360,700,768]) {
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const model=await page.getByLabel('실물 모델').boundingBox();
    const help=await page.getByRole('button',{name:'연결 및 사용 안내'}).boundingBox();
    expect(model!.x+model!.width).toBeLessThan(help!.x);
  }
});
