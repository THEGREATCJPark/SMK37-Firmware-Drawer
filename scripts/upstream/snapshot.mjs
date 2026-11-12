import { UpdateSnapshotSchema } from '../../src/catalog/updates.ts';
import { fetchBounded } from './core.mjs';
export const DEPLOYED_SNAPSHOT_URL='https://thegreatcjpark.github.io/SMK37-Firmware-Drawer/updates.json';
export function selectPreviousSnapshot(previous, candidate) {
  const fallback=UpdateSnapshotSchema.safeParse(previous);
  const incoming=UpdateSnapshotSchema.safeParse(candidate);
  if(!incoming.success)return fallback.success?fallback.data:null;
  if(!fallback.success||Date.parse(incoming.data.generatedAt)>Date.parse(fallback.data.generatedAt))return incoming.data;
  return fallback.data;
}
export async function previousDeployed(previous, options={}) {
  try {
    const bytes=await fetchBounded(DEPLOYED_SNAPSHOT_URL,{...options,maxBytes:200000});
    return selectPreviousSnapshot(previous,JSON.parse(bytes.toString()));
  } catch {return selectPreviousSnapshot(previous,null);}
}
