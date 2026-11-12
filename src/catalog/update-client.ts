import { UpdateSnapshotSchema,type UpdateSnapshot,type ArtifactAttestation } from './updates';
import type { Artifact } from './schema';
export const UPDATE_MAX_BYTES=256*1024;
export function snapshotIsOld(snapshot:UpdateSnapshot,now=Date.now()):boolean {
 const age=now-Date.parse(snapshot.generatedAt);return age>48*60*60*1000||age < -5*60*1000;
}
export function matchingAttestation(snapshot:UpdateSnapshot|null,artifact:Artifact):ArtifactAttestation|undefined {
 const release=new URL(artifact.releaseUrl);const parts=release.pathname.split('/').filter(Boolean);
 const repository=release.hostname==='github.com'?parts.slice(0,2).join('/').toLowerCase():null;
 return snapshot?.attestations.find(a=>a.sha256===artifact.sha256&&a.artifactIds.includes(artifact.id)&&repository===a.expectedRepository.toLowerCase());
}
export async function fetchUpdateSnapshot(signal:AbortSignal):Promise<UpdateSnapshot>{
 const response=await fetch(new URL('./updates.json',document.baseURI),{cache:'no-store',credentials:'omit',signal});
 if(!response.ok||!response.body)throw Error('배포 정보를 받지 못했습니다. 보관된 정보의 확인 시각을 참고하세요.');
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>UPDATE_MAX_BYTES)throw Error('배포 정보가 허용 크기를 넘습니다.');chunks.push(value);}}
 catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 signal.throwIfAborted();return UpdateSnapshotSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
}

export function approvalProblem(snapshot:UpdateSnapshot|null,artifact:Artifact):string|null {
 const proof=matchingAttestation(snapshot,artifact);
 if(proof?.status==='failed')return '이 파일의 빌드 출처 검증이 실패했습니다. 검토 전에는 설치할 수 없습니다.';
 if(proof?.status==='verified'&&artifact.sourceCommit&&proof.sourceCommit!==artifact.sourceCommit)return '서명된 소스와 카탈로그의 소스가 다릅니다. 출처 확인 전에는 설치할 수 없습니다.';
 return null;
}
