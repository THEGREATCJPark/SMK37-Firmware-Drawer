import {useEffect,useRef,useState} from 'react';
import {UpdateSnapshotSchema,type UpdateSnapshot} from '../catalog/updates';
import {fetchUpdateSnapshot} from '../catalog/update-client';
import {settings} from '../storage/vault';
export function useUpdates(){
 const [snapshot,setSnapshot]=useState<UpdateSnapshot|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const request=useRef<AbortController|null>(null),mounted=useRef(false);
 async function refresh(){
  request.current?.abort();const abort=new AbortController();request.current=abort;setLoading(true);setError('');
  const timer=setTimeout(()=>abort.abort(new Error('배포 정보 응답 시간이 초과되었습니다.')),15000);
  try{const next=await fetchUpdateSnapshot(abort.signal);if(mounted.current&&request.current===abort){setSnapshot(next);await settings.set('upstream-snapshot-v1',next).catch(()=>{});}}
  catch(e){if(mounted.current&&request.current===abort)setError(e instanceof Error?e.message:String(e));}
  finally{clearTimeout(timer);if(mounted.current&&request.current===abort)setLoading(false);}
 }
 useEffect(()=>{mounted.current=true;void(async()=>{try{const stored=UpdateSnapshotSchema.safeParse(await settings.get('upstream-snapshot-v1',null));if(mounted.current&&stored.success)setSnapshot(stored.data);}catch{}if(mounted.current)void refresh();})();return()=>{mounted.current=false;request.current?.abort();};},[]);
 return {snapshot,loading,error,refresh};
}
