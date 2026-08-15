"use client";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "fc_favorites";
export default function FavoriteButton({ productId, compact=false }: { productId: string|number; compact?: boolean }) {
  const id=String(productId); const [active,setActive]=useState(false); const [busy,setBusy]=useState(false);
  useEffect(()=>{ try { setActive(JSON.parse(localStorage.getItem(KEY)||"[]").includes(id)); } catch {} 
    fetch(`/api/favorites?productId=${encodeURIComponent(id)}`).then(r=>r.ok?r.json():null).then(d=>{if(d?.authenticated){setActive(!!d.favorite);}}).catch(()=>{});
  },[id]);
  async function toggle(){ if(busy)return; const next=!active; setActive(next); setBusy(true);
    try { const arr:string[]=JSON.parse(localStorage.getItem(KEY)||"[]"); localStorage.setItem(KEY,JSON.stringify(next?[...new Set([...arr,id])]:arr.filter(x=>x!==id)));
      await fetch("/api/favorites",{method:next?"POST":"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:id})});
    } finally {setBusy(false)} }
  return <button type="button" onClick={toggle} disabled={busy} className={`favorite-button ${compact?"favorite-button-compact":""} ${active?"is-active":""}`} aria-label={active?"Retirer des favoris":"Ajouter aux favoris"} title={active?"Retirer des favoris":"Ajouter aux favoris"}><Heart size={compact?19:21} fill={active?"currentColor":"none"}/>{compact?null:<span>{active?"Dans mes favoris":"Ajouter aux favoris"}</span>}</button>
}
