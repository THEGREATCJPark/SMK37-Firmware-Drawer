import { useEffect,useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({title,children,onClose,busy=false,wide=false}:{title:string;children:ReactNode;onClose:()=>void;busy?:boolean;wide?:boolean}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
  return <dialog ref={ref} className={'modal '+(wide?'wide':'')} aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <div className="modal-head"><span className="eyebrow">FIRMWARE DRAWER</span><button className="icon-button" disabled={busy} aria-label="닫기" onClick={onClose}><X size={20}/></button></div>
    <h2>{title}</h2>{children}
  </dialog>;
}
