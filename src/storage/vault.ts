import { openDB, type DBSchema } from 'idb';
import { z } from 'zod';
import type { InstallRecord } from '../install/types';
import { sha256hex } from '../vendor/fm1pkg.js';
import { ModelSchema, type Model } from '../catalog/schema';

export const BackupMetaSchema=z.object({
  id:z.string().min(1),name:z.string().min(1).max(240),kind:z.enum(['project','full-flash','package']),
  productId:z.string().min(1),family:z.string().min(1),version:z.string().min(1),schema:z.string().min(1),
  sha256:z.string().regex(/^[a-f0-9]{64}$/),size:z.number().int().positive().max(16*1024*1024),createdAt:z.iso.datetime(),
});
export type BackupMeta=z.infer<typeof BackupMetaSchema>;
export interface Backup extends BackupMeta { bytes:Uint8Array }
export const FullBackupSchema=z.object({verificationMethod:z.enum(['owner-record','local-dump-pair']).optional(),sha256:z.string().regex(/^[a-f0-9]{64}$/),model:ModelSchema,verifiedByOwner:z.literal(true),reference:z.string().min(3),date:z.iso.datetime()});
export type FullBackupRecord=z.infer<typeof FullBackupSchema>;
interface DrawerDB extends DBSchema {
  settings:{key:string;value:unknown};
  backups:{key:string;value:Backup};
  history:{key:string;value:InstallRecord};
  builds:{key:string;value:unknown};
}
let connection:ReturnType<typeof openDB<DrawerDB>>|undefined;
const db=()=>connection??=openDB<DrawerDB>('smk37-personal-drawer',1,{upgrade(d){
  d.createObjectStore('settings');d.createObjectStore('backups',{keyPath:'id'});d.createObjectStore('history',{keyPath:'id'});d.createObjectStore('builds');
}});
export const settings={get:async<T>(key:string,fallback:T):Promise<T>=>((await(await db()).get('settings',key)) as T)??fallback,
  set:async(key:string,value:unknown)=>{await(await db()).put('settings',value,key);}};
export async function saveFullBackup(record:FullBackupRecord){const r=FullBackupSchema.parse(record);await settings.set('full-backup:'+r.model,r);}
export async function getFullBackup(model:Model):Promise<FullBackupRecord|null>{const r=await settings.get('full-backup:'+model,null);const p=FullBackupSchema.safeParse(r);return p.success?p.data:null;}
export async function saveHistory(record:InstallRecord){await(await db()).put('history',record);}
export async function listHistory(){return (await(await db()).getAll('history')).sort((a,b)=>b.startedAt.localeCompare(a.startedAt));}
export async function listBackups(){return (await(await db()).getAll('backups')).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
export async function removeBackup(id:string){await(await db()).delete('backups',id);}
export async function addBackup(meta:Omit<BackupMeta,'id'|'sha256'|'size'|'createdAt'>,bytes:Uint8Array):Promise<Backup>{
  const b={...meta,id:crypto.randomUUID(),sha256:await sha256hex(bytes),size:bytes.length,createdAt:new Date().toISOString(),bytes:bytes.slice()};
  BackupMetaSchema.parse(b);
  if(b.kind==='full-flash' && (b.size!==1048576 || new TextDecoder().decode(bytes.subarray(0xc1224,0xc122b))!=='trimdat')) throw new Error('전체 덤프는 1 MiB이며 0xC1224의 trimdat 표식이 필요합니다.');
  await(await db()).put('backups',b);return b;
}
export function assertBackupTarget(backup:BackupMeta,target:{family:string;version:string;schema:string}):void {
  if(backup.family!==target.family||backup.version!==target.version||backup.schema!==target.schema)throw new Error('다른 펌웨어 계열·버전·schema에 이 파일을 복원할 수 없습니다. 해당 에디터의 호환 조건을 확인하세요.');
}
export function toBase64(bytes:Uint8Array):string {
  let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s);
}
export function fromBase64(text:string):Uint8Array {
  if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))throw new Error('base64 형식이 잘못됐습니다.');
  return Uint8Array.from(atob(text),c=>c.charCodeAt(0));
}
export function exportBackup(b:Backup):string {
  const {bytes,...metadata}=b;return JSON.stringify({format:'smk37-backup',schemaVersion:1,metadata,base64:toBase64(bytes)},null,2);
}
export async function importBackup(text:string):Promise<Backup>{
  if(text.length>23*1024*1024)throw new Error('보관 파일이 너무 큽니다.');
  const a=z.object({format:z.literal('smk37-backup'),schemaVersion:z.literal(1),metadata:BackupMetaSchema,base64:z.string().max(23*1024*1024)}).parse(JSON.parse(text));
  const bytes=fromBase64(a.base64);
  if(bytes.length!==a.metadata.size||await sha256hex(bytes)!==a.metadata.sha256)throw new Error('백업 크기 또는 해시가 다릅니다.');
  return addBackup(a.metadata,bytes);
}
export async function saveBuild(id:string,bundle:unknown){await(await db()).put('builds',bundle,id);}
export async function listBuilds(){return(await(await db()).getAll('builds'));}
export function download(name:string,data:BlobPart,mime='application/octet-stream'){
  const url=URL.createObjectURL(new Blob([data],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
