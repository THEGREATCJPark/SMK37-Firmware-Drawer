import {expect,it} from 'vitest';
import {catalog} from '../src/catalog';
import {CatalogSchema} from '../src/catalog/schema';
import {createPortJob} from '../src/porting/jobs';
it('카탈로그는 중복 ID, 없는 제품 참조, 대상 identity 혼합을 거절한다',()=>{
  const c=structuredClone(catalog);c.products.push(c.products[0]);expect(CatalogSchema.safeParse(c).success).toBe(false);
  const ref=structuredClone(catalog);ref.artifacts[0].productId='missing';expect(CatalogSchema.safeParse(ref).success).toBe(false);
  const identity=structuredClone(catalog);const a=identity.artifacts.find(a=>a.method==='direct')!;a.packageIdentity='FM-1_900';expect(CatalogSchema.safeParse(identity).success).toBe(false);
});
it('FM-1 원본과 SMK 포트 버전 및 포팅 필요 상태를 독립적으로 유지한다',()=>{
  const choral=catalog.artifacts.filter(a=>a.productId==='choralroot');
  expect(new Set(choral.map(a=>a.version)).size).toBeGreaterThan(1);
  expect(catalog.artifacts.filter(a=>a.productId==='sloopdx'&&a.targetModel!=='FM-1').every(a=>a.status==='published'&&a.method==='direct'&&a.experimental===true&&!!a.sourceArchiveUrl)).toBe(true);
  const sloop=catalog.products.find(p=>p.id==='sloop-pro')!;
  expect(createPortJob(sloop,catalog,'SMK-37 Elite',true).recipe).toBe(null);
  expect(createPortJob(sloop,catalog,'SMK-37 Pro',true).recipe?.target).toContain('MODEL=pro');
});
