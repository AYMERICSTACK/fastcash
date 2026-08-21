"use client";
import { useState } from "react";
import type { ManualReview } from "@/lib/manual-reviews";
import styles from "../admin.module.css";
export default function ReviewsManager({initialReviews}:{initialReviews:ManualReview[]}){
 const [reviews,setReviews]=useState(initialReviews); const [saving,setSaving]=useState(false); const [msg,setMsg]=useState("");
 const patch=(i:number,p:Partial<ManualReview>)=>setReviews(v=>v.map((r,n)=>n===i?{...r,...p}:r));
 const add=()=>setReviews(v=>[{id:`manual-${Date.now()}`,author:"",comment:"",rating:0,photoUrl:null,createTime:"",dateLabel:"",published:false},...v]);
 const save=async()=>{setSaving(true);setMsg("");const res=await fetch("/api/admin/reviews",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({reviews})});setSaving(false);setMsg(res.ok?"Avis enregistrés.":"Impossible d’enregistrer.");};
 return <div style={{maxWidth:1100,margin:"0 auto"}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"end",marginBottom:24,flexWrap:"wrap"}}><div><p style={{margin:0,opacity:.65,fontSize:13,fontWeight:700,textTransform:"uppercase"}}>Marketing</p><h1 style={{margin:"6px 0"}}>Avis clients</h1><p style={{margin:0,opacity:.7}}>Gérez les avis affichés sur le site en attendant la synchronisation Google Business.</p></div><button className={styles.button} onClick={add}>+ Ajouter un avis</button></div>
  <div style={{display:"grid",gap:14}}>{reviews.map((r,i)=><article key={r.id} style={{background:"#fff",border:"1px solid #e8e8e8",borderRadius:18,padding:18,boxShadow:"0 8px 30px rgba(0,0,0,.04)"}}>
   <div style={{display:"grid",gridTemplateColumns:"minmax(160px,1fr) minmax(130px,.45fr) minmax(110px,.35fr)",gap:12}}><label>Client<input style={input} value={r.author} onChange={e=>patch(i,{author:e.target.value})}/></label><label>Date affichée<input style={input} value={r.dateLabel||""} placeholder="il y a 1 mois" onChange={e=>patch(i,{dateLabel:e.target.value})}/></label><label>Note<input style={input} type="number" min="0" max="5" value={r.rating||""} placeholder="—" onChange={e=>patch(i,{rating:Number(e.target.value)||0})}/></label></div>
   <label style={{display:"block",marginTop:12}}>Avis<textarea style={{...input,minHeight:100,resize:"vertical"}} value={r.comment} onChange={e=>patch(i,{comment:e.target.value})}/></label>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,gap:12}}><label style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={r.published} onChange={e=>patch(i,{published:e.target.checked})}/> Publié sur le site</label><button onClick={()=>setReviews(v=>v.filter((_,n)=>n!==i))} style={{border:0,background:"transparent",color:"#a22",cursor:"pointer"}}>Supprimer</button></div>
  </article>)}</div>
  <div style={{position:"sticky",bottom:14,marginTop:20,display:"flex",justifyContent:"flex-end",alignItems:"center",gap:12}}>{msg&&<span style={{background:"#fff",padding:"10px 14px",borderRadius:12,boxShadow:"0 4px 20px #0001"}}>{msg}</span>}<button className={styles.button} disabled={saving} onClick={save}>{saving?"Enregistrement…":"Enregistrer les avis"}</button></div>
 </div>
}
const input:React.CSSProperties={display:"block",width:"100%",marginTop:6,border:"1px solid #ddd",borderRadius:10,padding:"10px 12px",font:"inherit",boxSizing:"border-box",background:"#fff"};
