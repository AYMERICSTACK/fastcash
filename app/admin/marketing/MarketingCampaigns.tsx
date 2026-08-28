"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "../admin.module.css";

type Subscriber={id:string;email:string;firstName:string|null;lastName:string|null;subscribed:boolean;source:string};
type Campaign={id:string;name:string;subject:string;status:string;sentAt:string|null;createdAt:string;recipients:number};
type Draft={name:string;subject:string;preheader:string;eyebrow:string;title:string;intro:string;body:string;ctaLabel:string;ctaUrl:string};

function csvRows(text:string){
  const lines=text.replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean); if(lines.length<2)return [];
  const parse=(line:string)=>{const out:string[]=[];let cur="";let q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(ch===','&&!q){out.push(cur);cur="";}else cur+=ch;}out.push(cur);return out;};
  const h=parse(lines[0]).map(x=>x.trim().toLowerCase());
  return lines.slice(1).map(parse).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??""]))).filter(r=>r.email);
}

function previewHtml(d:Draft){
  const ps=d.body.split(/\n\s*\n/).map(x=>`<p style="margin:0 0 16px;color:#4d4a45;font:15px/1.7 Arial">${x.replace(/</g,"&lt;").replace(/\n/g,"<br>")}</p>`).join("");
  return `<!doctype html><body style="margin:0;background:#f1eee7;font-family:Arial;padding:24px"><div style="max-width:650px;margin:auto"><div style="background:#070707;padding:28px;text-align:center;border-radius:20px 20px 0 0;border-bottom:1px solid #765f17"><b style="color:white;font-size:25px;letter-spacing:.2em">FAST CASH</b><div style="color:#d9b72f;font-size:10px;letter-spacing:.34em;margin-top:7px">GENÈVE</div></div><div style="background:white;padding:32px;border:1px solid #e4ddcf;border-radius:0 0 20px 20px"><span style="border:1px solid #d9b72f;background:#fbf7e8;padding:7px 10px;color:#806410;font-size:10px;font-weight:bold;letter-spacing:.14em">${d.eyebrow}</span><h1 style="font-size:32px;line-height:1.08;margin:20px 0 12px">${d.title}</h1><p style="color:#68635b;font:16px/1.65 Arial">${d.intro}</p><p style="margin-top:24px;font-weight:bold">Bonjour Client,</p>${ps}<a style="display:inline-block;background:#d9b72f;color:#080808;padding:15px 22px;text-decoration:none;font-size:12px;font-weight:bold;text-transform:uppercase">${d.ctaLabel}</a><div style="margin-top:28px;padding-top:18px;border-top:1px solid #eee;color:#777;font-size:11px">Vous recevez cet email car vous étiez inscrit(e) aux communications FAST CASH Genève.<br><u>Se désinscrire</u></div></div></div></body>`;
}

export default function MarketingCampaigns({initialSubscribers,initialCampaigns,defaults}:{initialSubscribers:Subscriber[];initialCampaigns:Campaign[];defaults:Draft}){
  const [subs,setSubs]=useState(initialSubscribers); const [campaigns,setCampaigns]=useState(initialCampaigns); const [draft,setDraft]=useState<Draft>(defaults);
  const [notice,setNotice]=useState(""); const [busy,setBusy]=useState(""); const [testEmail,setTestEmail]=useState("");
  const active=subs.filter(s=>s.subscribed).length; const unsub=subs.length-active;
  const patch=(key:keyof Draft,value:string)=>setDraft(d=>({...d,[key]:value}));

  async function importCsv(file:File){setBusy("import");setNotice("");const rows=csvRows(await file.text());const res=await fetch("/api/admin/marketing/subscribers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subscribers:rows})});const data=await res.json();setBusy("");if(!res.ok){setNotice(data.error||"Import impossible.");return;}setNotice(`${data.imported} contact(s) importé(s). Rechargez la page pour voir la liste à jour.`);}
  async function test(){setBusy("test");setNotice("");const res=await fetch("/api/admin/marketing/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...draft,to:testEmail})});const data=await res.json();setBusy("");setNotice(res.ok?`Email test envoyé à ${testEmail}.`:data.error||"Envoi impossible.");}
  async function createAndSend(){if(!confirm(`Envoyer cette campagne aux ${active} abonnés actifs ?`))return;setBusy("send");setNotice("Création de la campagne…");const create=await fetch("/api/admin/marketing/campaigns",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(draft)});const c=await create.json();if(!create.ok){setBusy("");setNotice(c.error||"Création impossible.");return;}let pending=1,sent=0,failed=0;while(pending>0){const r=await fetch("/api/admin/marketing/campaigns/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignId:c.campaign.id})});const x=await r.json();if(!r.ok){setBusy("");setNotice(x.error||"Envoi interrompu.");return;}pending=x.pending;sent+=x.sent;failed+=x.failed;setNotice(`Envoi en cours : ${sent} envoyé(s), ${failed} échec(s), ${pending} restant(s)…`);}setBusy("");setNotice(`Campagne terminée : ${sent} envoyé(s), ${failed} échec(s).`);setCampaigns(v=>[{id:c.campaign.id,name:draft.name,subject:draft.subject,status:"SENT",sentAt:new Date().toISOString(),createdAt:new Date().toISOString(),recipients:sent+failed},...v]);}

  return <div className={styles.emailMarketingPage}>
    <header className={styles.emailMarketingHeader}><div><Link href="/admin" className={styles.emailBack}>← Retour au Back Office</Link><p>Marketing · Email</p><h1>Campagnes email</h1><span>Importez vos abonnés, prévisualisez le message, envoyez un test puis lancez la campagne.</span></div><div className={styles.emailStats}><div><small>Contacts</small><strong>{subs.length}</strong></div><div><small>Actifs</small><strong>{active}</strong></div><div><small>Désinscrits</small><strong>{unsub}</strong></div></div></header>

    {notice?<div className={styles.emailNotice}>{notice}</div>:null}

    <section className={styles.emailGrid}>
      <div className={styles.emailPanel}>
        <div className={styles.emailPanelHead}><span>01</span><div><strong>Audience</strong><small>CSV PrestaShop newsletter</small></div></div>
        <label className={styles.emailDrop}><input type="file" accept=".csv,text/csv" onChange={e=>e.target.files?.[0]&&importCsv(e.target.files[0])}/><strong>{busy==="import"?"Import en cours…":"Importer un CSV"}</strong><span>Colonnes reconnues : firstname, lastname, email</span></label>
        <div className={styles.emailAudienceList}>{subs.slice(0,8).map(s=><div key={s.id}><span>{(s.firstName||"").slice(0,1).toUpperCase()||"@"}</span><div><strong>{[s.firstName,s.lastName].filter(Boolean).join(" ")||s.email}</strong><small>{s.email}</small></div><i data-on={s.subscribed}>{s.subscribed?"Actif":"Désinscrit"}</i></div>)}{subs.length>8?<p>+ {subs.length-8} autres contacts</p>:null}</div>

        <div className={styles.emailPanelHead}><span>02</span><div><strong>Campagne</strong><small>Template FAST CASH noir & or</small></div></div>
        <label className={styles.emailField}><span>Nom interne</span><input value={draft.name} onChange={e=>patch("name",e.target.value)}/></label>
        <label className={styles.emailField}><span>Objet</span><input value={draft.subject} onChange={e=>patch("subject",e.target.value)}/></label>
        <label className={styles.emailField}><span>Pré-header</span><input value={draft.preheader} onChange={e=>patch("preheader",e.target.value)}/></label>
        <div className={styles.emailFields2}><label className={styles.emailField}><span>Badge</span><input value={draft.eyebrow} onChange={e=>patch("eyebrow",e.target.value)}/></label><label className={styles.emailField}><span>Titre</span><input value={draft.title} onChange={e=>patch("title",e.target.value)}/></label></div>
        <label className={styles.emailField}><span>Introduction</span><textarea rows={2} value={draft.intro} onChange={e=>patch("intro",e.target.value)}/></label>
        <label className={styles.emailField}><span>Message</span><textarea rows={8} value={draft.body} onChange={e=>patch("body",e.target.value)}/></label>
        <div className={styles.emailFields2}><label className={styles.emailField}><span>Bouton</span><input value={draft.ctaLabel} onChange={e=>patch("ctaLabel",e.target.value)}/></label><label className={styles.emailField}><span>URL</span><input value={draft.ctaUrl} onChange={e=>patch("ctaUrl",e.target.value)}/></label></div>
      </div>

      <div className={styles.emailPanel}>
        <div className={styles.emailPanelHead}><span>03</span><div><strong>Aperçu</strong><small>Rendu proche de l’email final</small></div></div>
        <div className={styles.emailPreview}><iframe title="Aperçu email" srcDoc={previewHtml(draft)}/></div>
        <div className={styles.emailTestBar}><input type="email" placeholder="Votre email pour le test" value={testEmail} onChange={e=>setTestEmail(e.target.value)}/><button onClick={test} disabled={busy!==""||!testEmail}>{busy==="test"?"Envoi…":"Envoyer un test"}</button></div>
        <button className={styles.emailSendButton} onClick={createAndSend} disabled={busy!==""||active===0}>{busy==="send"?"Envoi de la campagne…":`Envoyer aux ${active} abonnés actifs`}</button>
        <p className={styles.emailCompliance}>Chaque email contient un lien de désinscription individuel. Les contacts désinscrits sont automatiquement exclus des prochains envois.</p>

        <div className={styles.emailPanelHead}><span>04</span><div><strong>Historique</strong><small>Dernières campagnes</small></div></div>
        <div className={styles.emailHistory}>{campaigns.length?campaigns.map(c=><div key={c.id}><div><strong>{c.name}</strong><small>{c.subject}</small></div><span>{c.status}</span></div>):<p>Aucune campagne envoyée pour le moment.</p>}</div>
      </div>
    </section>
  </div>;
}
