import { z } from 'zod';
const timestamp = z.iso.datetime();
const github = z.string().max(300).regex(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/releases\/tag\/[^\s]+)?$/);
const short = z.string().max(500);
export const ProjectUpdateSchema = z.object({
  productId: z.string().max(80), repository: github.nullable(), distributionRepositories: z.array(github).max(10),
  pinnedVersions: z.array(z.string().max(100)).max(40), checkedAt: timestamp, lastSuccessfulAt: timestamp.nullable(),
  status: z.enum(['observed', 'no-release', 'unknown']), stale: z.boolean(), error: short.nullable(),
  latest: z.object({ tag: z.string().max(200), url: github, publishedAt: timestamp.nullable() }).nullable(),
});
export const ArtifactAttestationSchema = z.object({
  artifactIds: z.array(z.string().max(100)).max(20), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  expectedRepository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  status: z.enum(['verified', 'missing', 'unavailable', 'failed', 'not-checked']), checkedAt: timestamp.nullable(), stale: z.boolean().optional(), lastAttemptAt: timestamp.nullable().optional(),
  sourceCommit: z.string().regex(/^[a-f0-9]{40}$/).nullable(), error: short.nullable(),
}).refine(a => a.status !== 'verified' || Boolean(a.sourceCommit && a.checkedAt), 'Verified attestations require certificate commit and timestamp');
export const UpdateSnapshotSchema = z.object({
  schemaVersion: z.literal(1), generatedAt: timestamp, projects: z.array(ProjectUpdateSchema).max(20),
  attestations: z.array(ArtifactAttestationSchema).max(30),
  discovery: z.object({ checkedAt: timestamp, lastSuccessfulAt: timestamp.nullable().optional(), status: z.enum(['ok', 'unknown', 'not-checked']), stale: z.boolean(), error: short.nullable(),
    items: z.array(z.object({ id: z.string().max(100), name: z.string().max(100), version: z.string().max(100).nullable().optional(), models: z.array(z.string().max(60)).max(8), repository: github.nullable(),
      sourceUrl: z.literal('https://thefirmwarehub.com/catalog.json'), license: z.string().max(100).nullable() })).max(30),
  }),
}).refine(s => new Set(s.projects.map(p => p.productId)).size === s.projects.length && new Set(s.attestations.map(a => a.sha256 + ':' + a.expectedRepository)).size === s.attestations.length, 'Duplicate snapshot entries');
export type UpdateSnapshot = z.infer<typeof UpdateSnapshotSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;
export type ArtifactAttestation = z.infer<typeof ArtifactAttestationSchema>;
