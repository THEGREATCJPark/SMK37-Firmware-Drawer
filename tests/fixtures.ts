import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Artifact } from '../src/catalog/schema';
export const fixtureBytes = new Uint8Array(readFileSync('.local/packages/frodhes-0.9.2.fwsc'));
export const fixtureArtifact: Artifact = {
  id: 'frodhes-0.9.2-pro', productId: 'frodhes', targetModel: 'SMK-37 Pro', version: '0.9.2', upstreamVersion: '0.9.2', portVersion: '0.9.2',
  relationship: 'original', sourceCommit: 'f41582ee99fad7f9eb32c3f6401548ac5fc9aec3',
  releaseUrl: 'https://github.com/genkigenki/smk37', filename: 'frodhes-0.9.2.fwsc', size: fixtureBytes.length,
  sha256: createHash('sha256').update(fixtureBytes).digest('hex'), packageIdentity: 'SMK-37 Pro_470', loaderFamily: 'felucca-ufw',
  method: 'direct', distribution: 'local-file', status: 'published', externalUrl: 'https://genkigenki.github.io/smk37/#fw-erik37',
  evidence: [{kind:'published-build',url:'https://github.com/genkigenki/smk37',note:'fixture'}], family: 'ERIK37',
  prerequisites: [], dataImpact: '다른 계열 데이터 초기화 가능', backup: {scope:'외부 파일',editorUrl:null}, recoveryUrl:'https://genkigenki.github.io/smk37/help.html', verifiedAt:'2026-11-09',
};
