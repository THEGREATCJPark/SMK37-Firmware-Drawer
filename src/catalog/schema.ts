import { z } from 'zod';

export const Models = ['SMK-37 Pro', 'SMK-37 Elite', 'MKE-P37', 'FM-1'] as const;
export const ModelSchema = z.enum(Models);
const url = z.url().refine(v => v.startsWith('https://'), 'HTTPS 출처가 필요합니다.');
const sha = z.string().regex(/^[a-f0-9]{64}$/);
export const EvidenceSchema = z.object({
  kind: z.enum(['source-reviewed', 'published-build', 'build-tested', 'hardware-tested']),
  url, note: z.string().min(1),
});
export const ProductSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), name: z.string().min(1), author: z.string().min(1),
  repository: url, description: z.string().min(1), category: z.string().min(1),
  features: z.array(z.string()).min(1), limitations: z.array(z.string()),
  sourceAvailable: z.boolean(), license: z.string().min(1), verifiedAt: z.iso.date(),
  sources: z.array(url).min(1), manualUrl: url, mapping: z.string(),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/), glyph: z.string(),
});
export const ArtifactSchema = z.object({
  id: z.string().regex(/^[a-z0-9.-]+$/), productId: z.string(), targetModel: ModelSchema,
  version: z.string(), upstreamVersion: z.string().nullable(), portVersion: z.string().nullable(),
  relationship: z.enum(['original', 'official-board-build', 'community-port']),
  sourceCommit: z.string().regex(/^[a-f0-9]{40}$/).nullable(), releaseUrl: url,
  experimental: z.boolean().optional(), sourceArchiveUrl: url.optional(), personalHelper: z.boolean().optional(), bundled: z.boolean().optional(), downloadUrl: url.optional(), filename: z.string().nullable(), size: z.number().int().positive().max(2 * 1024 * 1024).nullable(),
  sha256: sha.nullable(), packageIdentity: z.string().nullable(),
  loaderIdentity: z.string().optional(), loaderFamily: z.enum(['felucca-ufw', 'baudgirl', 'unknown']),
  method: z.enum(['direct', 'external', 'unavailable']),
  distribution: z.enum(['local-file', 'fetch-allowed', 'external-only', 'none']),
  status: z.enum(['published', 'build-only', 'port-required']),
  externalUrl: url, evidence: z.array(EvidenceSchema),
  family: z.string(), prerequisites: z.array(z.string()), dataImpact: z.string(),
  backup: z.object({ scope: z.string(), editorUrl: url.nullable() }),
  recoveryUrl: url, verifiedAt: z.iso.date(),
}).superRefine((a, ctx) => {
  const baudgirl=a.loaderFamily==='baudgirl'&&a.productId==='va'&&a.packageIdentity==='SMK-37+VA_102'&&a.sha256==='01f7283b951d7a00ad54d00da6099b247085c87668d2be72519dc395ab9f83e4'&&a.size===859716;
  if (a.method === 'direct' && (a.targetModel === 'FM-1' || a.status !== 'published' ||
      (!baudgirl&&a.loaderFamily !== 'felucca-ufw') || !a.sha256 || !a.size || !a.filename || !a.packageIdentity || (!baudgirl&&(!a.sourceCommit || !a.loaderIdentity)))) {
    ctx.addIssue({ code: 'custom', message: '직접 설치에는 검토된 SMK37 공개 패키지의 고정 정보가 필요합니다.' });
  }
  if (a.method === 'direct' && !baudgirl && !a.packageIdentity?.startsWith(a.targetModel + '_')) {
    ctx.addIssue({ code: 'custom', message: '패키지 모델 식별자가 대상 모델과 다릅니다.' });
  }
});
export const CatalogSchema = z.object({
  schemaVersion: z.literal(1), reviewedAt: z.iso.date(),
  products: z.array(ProductSchema), artifacts: z.array(ArtifactSchema),
}).superRefine((c, ctx) => {
  for (const list of [c.products, c.artifacts]) {
    if (new Set(list.map(x => x.id)).size !== list.length) ctx.addIssue({ code: 'custom', message: '중복 ID' });
  }
  for (const a of c.artifacts) if (!c.products.some(p => p.id === a.productId)) {
    ctx.addIssue({ code: 'custom', message: '제품 없는 아티팩트' });
  }
});
export type Model = z.infer<typeof ModelSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Artifact = z.infer<typeof ArtifactSchema>;
export type Catalog = z.infer<typeof CatalogSchema>;
