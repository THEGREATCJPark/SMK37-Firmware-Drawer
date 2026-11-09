export interface Identity { text: string; model: string; version: number }
export interface Device { id: Identity; name: string; link: any }
export function pack7(data: ArrayLike<number>): number[];
export function unpack7(data: ArrayLike<number>): number[];
export function packageBoard(image: Uint8Array): 'smk' | 'fm1' | null;
export function packageFiles(image: Uint8Array): Array<{type:number;off:number;size:number;at:number;len:number}>;
export function regionTable(flash: Uint8Array): Record<string,[number,number]>;
export function isStockPackage(image: Uint8Array): boolean;
export function boardRefusal(model: string,image:Uint8Array,fm1Confirmed?:boolean): Error | null;
export function OUR_LOADER(id: Identity): boolean;
export function OTHER_SMK(id: Identity): boolean;
export const PORT_RE: RegExp;
export class MidiSession {
  constructor(doc?:Document,nav?:Navigator);
  access: MIDIAccess | null; isolated: boolean;
  open(ms?: number): Promise<MIDIAccess>;
  release(): Promise<void>;
}
export class Updater {
  constructor(access: unknown, log?: (s:string)=>void, opts?: Record<string,unknown>);
  access: any;
  find(filter?: (id:Identity)=>boolean, deep?: boolean): Promise<Device|null>;
  restart(link: any): Promise<number>;
  write(ota: Device,image:Uint8Array,step?:StepCallback):Promise<any>;
  serve(link:any,image:Uint8Array,finishAddr:number,idleMs:number,onProgress?: (n:number,addr:number)=>void,options?:Record<string,unknown>):Promise<any>;
  install(image:Uint8Array,product:string,onStep?:StepCallback,anyModel?:boolean,opts?:Record<string,unknown>):Promise<string>;
  resume(image:Uint8Array,onStep?:StepCallback,opts?:Record<string,unknown>):Promise<string|boolean>;
}
export type StepCallback = (step:string, detail?:string|number)=>void;
