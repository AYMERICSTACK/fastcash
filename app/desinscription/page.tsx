"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function UnsubscribeCard() {
  const params = useSearchParams(); const token = params.get("token") || ""; const preview = params.get("preview") === "1";
  const [state, setState] = useState<"idle"|"busy"|"done"|"error">("idle");
  async function unsubscribe() {
    if (preview) { setState("done"); return; }
    setState("busy"); const res = await fetch("/api/newsletter/unsubscribe", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({token}) }); setState(res.ok ? "done" : "error");
  }
  return <main style={{minHeight:"70vh",display:"grid",placeItems:"center",padding:"48px 20px",background:"#f5f2eb"}}><section style={{maxWidth:600,width:"100%",background:"#fff",border:"1px solid #e5dcc7",borderRadius:22,padding:32,boxShadow:"0 20px 60px rgba(0,0,0,.08)"}}><p style={{margin:0,color:"#9c771b",fontWeight:900,letterSpacing:2,textTransform:"uppercase",fontSize:12}}>FAST CASH Genève</p><h1 style={{fontSize:34,margin:"12px 0"}}>Se désinscrire</h1>{state==="done"?<p>Votre désinscription est bien enregistrée. Vous ne recevrez plus nos campagnes marketing.</p>:<><p style={{lineHeight:1.65,color:"#555"}}>Vous pouvez arrêter les communications marketing FAST CASH à tout moment.</p><button onClick={unsubscribe} disabled={state==="busy" || (!token && !preview)} style={{marginTop:12,padding:"14px 20px",border:0,borderRadius:8,background:"#d9b72f",fontWeight:900,cursor:"pointer"}}>{state==="busy"?"Traitement…":"Confirmer ma désinscription"}</button>{state==="error"?<p style={{color:"#a51b1b"}}>Impossible de traiter ce lien. Contactez FAST CASH si le problème persiste.</p>:null}</>}</section></main>;
}
export default function UnsubscribePage(){ return <Suspense fallback={null}><UnsubscribeCard/></Suspense>; }
