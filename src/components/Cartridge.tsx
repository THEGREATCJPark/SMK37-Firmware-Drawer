import type { Product } from '../catalog/schema';
export function Cartridge({product,index=0,small=false}:{product:Product;index?:number;small?:boolean}){
  return <div className={'cartridge '+(small?'small':'')} style={{'--cart':product.color} as React.CSSProperties} aria-hidden="true">
    <div className="cart-ridges"/><div className="cart-label">
      <div className="cart-top"><span>SMK / SOUND LIBRARY</span><span>{String(index+1).padStart(2,'0')}</span></div>
      <div className="cart-art"><svg viewBox="0 0 260 78" fill="none"><path d={index%3===0?'M0 39h18V14h18v50h18V27h18v26h18V8h18v62h18V24h18v30h18V15h18v48h18V30h18v18h26':index%3===1?'M-10 40C12-5 33-5 54 40s42 45 63 0 42-45 63 0 42 45 63 0 42-45 63 0':'M0 59l24-40v40l24-40v40l24-40v40l24-40v40l24-40v40l24-40v40l24-40v40l24-40v40l24-40v40l24-40v40l24-40'} stroke="currentColor" strokeWidth="2.5"/><path d="M0 39H260" stroke="currentColor" strokeDasharray="2 5" opacity=".2"/></svg></div>
      <strong>{product.name}</strong><span className="cart-category">{product.category}</span>
    </div><div className="cart-bottom"><i/><span>PERSONAL COLLECTION</span><i/></div>
  </div>;
}
