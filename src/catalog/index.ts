import { CatalogSchema, type Model } from './schema';
import data from './catalog.json';
export const catalog=CatalogSchema.parse(data);
export function artifactsFor(productId:string,model:Model){return catalog.artifacts.filter(a=>a.productId===productId&&a.targetModel===model);}
export function primaryArtifact(productId:string,model:Model){const list=artifactsFor(productId,model);return list.find(a=>a.method==='direct')??list.find(a=>a.status==='published')??list[0];}
