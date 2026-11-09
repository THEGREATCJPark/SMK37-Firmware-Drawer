import 'fake-indexeddb/auto';
import { expect,it } from 'vitest';
import {addBackup,assertBackupTarget,exportBackup,importBackup,listBackups} from '../src/storage/vault';
import {validateBundle} from '../src/porting/bundle';
import {fixtureArtifact,fixtureBytes} from './fixtures';
import {toBase64} from '../src/storage/vault';
it('프로젝트 파일은 해시와 family/version/schema를 보존해 가져온다',async()=>{
  const b=await addBackup({name:'song.dat',kind:'project',productId:'sloop-pro',family:'SLOOP',version:'2.8.4',schema:'project-v1'},new Uint8Array([1,2,3]));
  const result=await importBackup(exportBackup(b));expect(result.sha256).toBe(b.sha256);expect(result.bytes).toEqual(b.bytes);expect((await listBackups()).length).toBeGreaterThan(0);
  expect(()=>assertBackupTarget(b,{family:'FRODHES',version:'0.9.2',schema:'patch-v1'})).toThrow(/다른/);
  expect(()=>assertBackupTarget(b,{family:b.family,version:b.version,schema:b.schema})).not.toThrow();
});
it('변조된 보관 파일은 DB에 들어가지 않는다',async()=>{
  const b=await addBackup({name:'song.dat',kind:'project',productId:'sloop-pro',family:'SLOOP',version:'2.8.4',schema:'v1'},new Uint8Array([1,2,3]));
  const data=JSON.parse(exportBackup(b));data.base64='BAUG';await expect(importBackup(JSON.stringify(data))).rejects.toThrow(/해시/);
});
const bundle={format:'smk37-build-bundle',schemaVersion:1,status:'build-only',productId:'frodhes',name:'Local',source:{url:'https://github.com/genkigenki/smk37',commit:'f41582ee99fad7f9eb32c3f6401548ac5fc9aec3',license:'mixed'},targetModel:'SMK-37 Pro',version:'local',package:{filename:'local.fwsc',size:fixtureBytes.length,sha256:fixtureArtifact.sha256,identity:fixtureArtifact.packageIdentity,base64:toBase64(fixtureBytes)},recipe:{id:'manual',toolchain:'test',sdkCommit:'test'},checks:[{name:'build',status:'passed',detail:'mock fixture, not a build claim'}],mapping:{status:'needs-owner-decision',reference:'https://github.com/genkigenki/fm1-to-smk37'},storageReview:'실기 검증 전',remainingHardwareTests:['키와 패드']};
it('검사한 bundle도 build-only에 머문다',async()=>{const result=await validateBundle(JSON.stringify(bundle));expect(result.status).toBe('build-only');expect('method' in result).toBe(false);});
it('실기 검증됐다고 스스로 주장하는 bundle은 거절한다',async()=>{await expect(validateBundle(JSON.stringify({...bundle,status:'hardware-tested'}))).rejects.toThrow();});
it('bundle의 실제 파일과 모델 또는 hash가 다르면 거절한다',async()=>{
  await expect(validateBundle(JSON.stringify({...bundle,targetModel:'SMK-37 Elite'}))).rejects.toThrow(/모델/);
  await expect(validateBundle(JSON.stringify({...bundle,package:{...bundle.package,sha256:'a'.repeat(64)}}))).rejects.toThrow(/해시/);
});
