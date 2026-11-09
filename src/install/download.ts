import type { Artifact } from '../catalog/schema';
import { validatePackage } from './package';
import { BAUDGIRL_FACTORY,validateBaudgirlFactory } from './baudgirl-data';

export async function downloadBaudgirlFactory(signal:AbortSignal):Promise<Uint8Array>{
  const response=await fetch('http://127.0.0.1:19437/packages/va-factory',{signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok||!response.body)throw new Error('+VA 초기 음색을 받지 못했습니다. 개인 다운로드 도우미를 확인하세요.');
  const reader=response.body.getReader(),bytes=new Uint8Array(BAUDGIRL_FACTORY.size);let offset=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;if(offset+value.length>bytes.length)throw new Error('+VA 초기 음색 크기가 다릅니다.');bytes.set(value,offset);offset+=value.length;}}
  catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
  if(offset!==bytes.length)throw new Error('+VA 초기 음색 다운로드가 불완전합니다.');
  await validateBaudgirlFactory(bytes);signal.throwIfAborted();return bytes;
}

export async function downloadPackage(artifact:Artifact,signal:AbortSignal,onProgress:(received:number)=>void=()=>{}):Promise<Uint8Array> {
  if(artifact.method!=='direct'||!artifact.downloadUrl||!artifact.size) throw new Error('이 패키지의 다운로드 경로가 없습니다.');
  const url=artifact.personalHelper?'http://127.0.0.1:19437/packages/va-102':artifact.bundled?new URL(`./packages/${artifact.sha256}.fwsc`,document.baseURI).href:artifact.downloadUrl;
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
