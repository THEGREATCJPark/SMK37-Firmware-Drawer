import type { Artifact, Model } from '../catalog/schema';
import type { CurrentFamily } from './policy';
import type { Identity, StepCallback } from '../vendor/fm1ota.js';
export type Phase = 'idle' | 'identifying' | 'checking' | 'verifying-file' | 'backup-review' | 'ready' | 'entering-loader' | 'writing' | 'reconnecting' | 'completed' | 'failed' | 'interrupted';
export interface InstallState { phase: Phase; busy: boolean; message: string; requests: number; identity?: Identity; artifact?: Artifact; simulated: boolean }
export interface InstallRequest { artifact: Artifact; bytes: Uint8Array; physical: Model; family: CurrentFamily; resume: boolean }
export interface Consent { fullBackup: { sha256: string; model: Model; verifiedByOwner: boolean }; recoveryReady: boolean; projectsAcknowledged: boolean }
export interface InstallRecord {
  id: string; startedAt: string; endedAt?:string; artifactId:string; productId:string; sha256:string; targetModel:Model;
  previousIdentity:string; reportedIdentity?:string; status:'in-progress'|'completed'|'interrupted'|'failed'|'external-opened';
  simulated:boolean; browser:string; note:string;
}
export interface Transport {
  readonly simulated: boolean;
  identify(): Promise<Identity>;
  transfer(image: Uint8Array, request: Omit<InstallRequest,'bytes'>, startIdentity:Identity, onStep:StepCallback): Promise<string>;
  close():Promise<void>;
}
