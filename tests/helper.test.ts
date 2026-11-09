import { expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-ignore Standalone Node helper intentionally has no browser dependencies.
import { createDownloadHelper,VA } from '../helper/download-helper.mjs';
const origin='https://thegreatcjpark.github.io';
it('개인 도우미는 허용 출처와 고정 파일만 처리하고 원본의 바이트를 검증한다',async()=>{
  let calls=0;const bytes=readFileSync('.local/integration/va.fwsc');
  const server=createDownloadHelper(async(url:string)=>{calls++;expect(url).toBe(VA.url);return new Response(bytes);});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try{
    expect((await fetch(base+'/packages/va-102',{headers:{Origin:'https://other.example'}})).status).toBe(403);
    expect((await fetch(base+'/packages/va-102?url=https://other.example',{headers:{Origin:origin}})).status).toBe(404);
    expect((await fetch(base+'/packages/va-102',{method:'POST',headers:{Origin:origin}})).status).toBe(405);
    expect(calls).toBe(0);
    const preflight=await fetch(base+'/packages/va-102',{method:'OPTIONS',headers:{Origin:origin}});
    expect(preflight.headers.get('access-control-allow-private-network')).toBe('true');
    const r=await fetch(base+'/packages/va-102',{headers:{Origin:origin}});
    expect(r.status).toBe(200);expect(Buffer.from(await r.arrayBuffer())).toEqual(bytes);expect(calls).toBe(1);
  }finally{await new Promise<void>(resolve=>server.close(resolve));}
});
it('개인 도우미는 변조·과대 원본 응답을 브라우저로 보내지 않는다',async()=>{
  for(const bytes of [new Uint8Array(VA.size),new Uint8Array(VA.size+1)]){
    const server=createDownloadHelper(async()=>new Response(bytes));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/packages/va-102',{headers:{Origin:origin}});expect(r.status).toBe(502);expect((await r.text()).length).toBeLessThan(200);}
    finally{await new Promise<void>(resolve=>server.close(resolve));}
  }
});
