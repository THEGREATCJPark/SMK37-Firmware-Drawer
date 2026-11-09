import { useEffect,useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({title,children,onClose,busy=false,wide=false}:{title:string;children:ReactNode;onClose:()=>void;busy?:boolean;wide?:boolean}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const dialog=ref.current;
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    dialog?.showModal();
    return()=>{dialog?.close();queueMicrotask(()=>{if(previous?.isConnected)previous.focus({preventScroll:true});});};
  },[]);
  return <dialog ref={ref} className={'modal '+(wide?'wide':'')} aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <div className="modal-head"><h2>{title}</h2><button className="icon-button" disabled={busy} aria-label="닫기" onClick={onClose}><X aria-hidden="true"/></button></div>
    <div className="modal-body">{children}</div>
  </dialog>;
}
