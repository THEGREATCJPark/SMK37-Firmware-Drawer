import { z } from 'zod';
import { ModelSchema } from '../catalog/schema';
import { fromBase64 } from '../storage/vault';
import { inspectPackage } from '../install/package';
const https=z.url().refine(x=>x.startsWith('https://'));
export const BundleSchema=z.object({
  format:z.literal('smk37-build-bundle'),schemaVersion:z.literal(1),status:z.literal('build-only'),
  productId:z.string().min(1).max(80),name:z.string().min(1).max(120),
  source:z.object({url:https,commit:z.string().regex(/^[a-f0-9]{40}$/),license:z.string().min(1)}),
  targetModel:ModelSchema.exclude(['FM-1']),version:z.string().min(1),
  package:z.object({filename:z.string().regex(/^[\w.-]+\.fwsc$/),size:z.number().int().positive().max(2*1024*1024),sha256:z.string().regex(/^[a-f0-9]{64}$/),identity:z.string(),base64:z.string().max(2800000)}),
  recipe:z.object({id:z.string(),toolchain:z.string(),sdkCommit:z.string()}),
  checks:z.array(z.object({name:z.string(),status:z.enum(['passed','failed','not-run']),detail:z.string()})).min(1).max(150),
  mapping:z.object({status:z.enum(['existing-upstream','needs-owner-decision']),reference:https}),
  storageReview:z.string().min(1),remainingHardwareTests:z.array(z.string()).min(1),
});
export type BuildBundle=z.infer<typeof BundleSchema>;
export async function validateBundle(text:string):Promise<BuildBundle>{
  if(text.length>4*1024*1024)throw new Error('가져오기 번들은 4 MiB 이하이어야 합니다.');
  const b=BundleSchema.parse(JSON.parse(text));
  const bytes=fromBase64(b.package.base64);
  if(bytes.length!==b.package.size)throw new Error('패키지 크기가 일치하지 않습니다.');
  const inspected=await inspectPackage(bytes);
  if(inspected.sha256!==b.package.sha256)throw new Error('패키지 해시가 일치하지 않습니다.');
  if(inspected.identity!==b.package.identity||!inspected.identity.startsWith(b.targetModel+'_'))throw new Error('실제 모델 식별자와 번들의 모델이 다릅니다.');
  return b; // Always build-only. No API promotes an imported artifact into the reviewed install catalog.
}
