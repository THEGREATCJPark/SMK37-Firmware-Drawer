import type { Artifact } from '../catalog/schema';
import { validatePackage } from './package';

export async function downloadPackage(artifact:Artifact,signal:AbortSignal,onProgress:(received:number)=>void=()=>{}):Promise<Uint8Array> {
  if(artifact.method!=='direct'||!artifact.downloadUrl||!artifact.size) throw new Error('이 패키지의 다운로드 경로가 없습니다.');
  const url=artifact.bundled?new URL(`./packages/${artifact.sha256}.fwsc`,document.baseURI).href:artifact.downloadUrl;
  const response=await fetch(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok||!response.body) throw new Error(`패키지를 받지 못했습니다 (HTTP ${response.status}). 다시 시도해 주세요.`);
  const reader=response.body.getReader(),parts:Uint8Array[]=[];let received=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;received+=value.length;
    if(received>artifact.size)throw new Error('서버 파일이 고정된 패키지 크기를 초과합니다.');parts.push(value);onProgress(received);
  }} catch(error){await reader.cancel().catch(()=>{});throw error;} finally{reader.releaseLock();}
  signal.throwIfAborted();
  const bytes=new Uint8Array(received);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  await validatePackage(bytes,artifact);signal.throwIfAborted();return bytes;
}
