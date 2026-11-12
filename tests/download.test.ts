import { afterEach,expect,it,vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { catalog } from '../src/catalog';
import { validatePackage } from '../src/install/package';
import { downloadPackage } from '../src/install/download';
import { assertRoute } from '../src/install/policy';
const targets=catalog.artifacts.filter(a=>a.method==='direct'&&a.loaderFamily==='felucca-ufw'&&a.status==='published'&&!a.experimental);
afterEach(()=>vi.unstubAllGlobals());
it('24개 모델별 공개 파일의 hash·identity·CRC·보호 영역이 카탈로그와 일치한다',async()=>{
  expect(targets).toHaveLength(24);
  for(const a of targets){const b=new Uint8Array(readFileSync('.local/packages/'+a.filename));expect((await validatePackage(b,a)).identity).toBe(a.packageIdentity);}
});
it('추가한 펌웨어에서 기존 펌웨어로의 전환과 같은 파일 loader 재개를 허용한다',()=>{
  for(const family of ['erik37','obervave','choralroot'] as const){
    const a=targets.find(a=>a.family===family&&a.targetModel==='SMK-37 Pro')!;
    const identity={text:a.packageIdentity!,model:'SMK-37 Pro',version:Number(a.packageIdentity!.split('_')[1])};
    expect(()=>assertRoute(identity,targets[0],'SMK-37 Pro',family)).not.toThrow();
    expect(()=>assertRoute({...identity,text:a.loaderIdentity!,model:'ota-'+identity.model,version:900},a,'SMK-37 Pro',family,true)).not.toThrow();
  }
});
it('다운로드 파일은 검증 후에만 반환하며 변조·크기 초과·취소는 거절한다',async()=>{
  const a=targets.find(a=>a.id==='frodhes-0.9.2-pro')!;
  const bytes=new Uint8Array(readFileSync('.local/packages/'+a.filename));
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(bytes)));
  expect(await downloadPackage(a,new AbortController().signal)).toEqual(bytes);
  const corrupt=bytes.slice();corrupt[100]^=1;
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(corrupt)));
  await expect(downloadPackage(a,new AbortController().signal)).rejects.toThrow(/SHA/);
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(new Uint8Array(a.size!+1))));
  await expect(downloadPackage(a,new AbortController().signal)).rejects.toThrow(/초과/);
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(bytes)));
  const abort=new AbortController();abort.abort();
  await expect(downloadPackage(a,abort.signal)).rejects.toThrow();
});
