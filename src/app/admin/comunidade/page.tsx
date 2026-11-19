"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PendingPost={id:string;body:string;mediaUrl:string;mediaType:string;visibility:string;createdAt:string;authorId:string;artist:string;municipality:string};
type Report={id:number;reporterId:string;targetType:string;targetId:string;reason:string;status:string;createdAt:string;reporter:string};

export default function CommunityModerationPage(){
  const [posts,setPosts]=useState<PendingPost[]>([]);
  const [reports,setReports]=useState<Report[]>([]);
  const [authorized,setAuthorized]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  const load=useCallback(async()=>{
    const response=await fetch("/api/admin/community-moderation",{credentials:"same-origin",cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error??"Inicia sessão no painel administrativo.");
    setPosts(data.posts??[]);setReports(data.reports??[]);setAuthorized(true);
  },[]);
  useEffect(()=>{let active=true;load().catch(error=>{if(active)setMessage(error instanceof Error?error.message:"Acesso não autorizado.")}).finally(()=>{if(active)setLoaded(true)});return()=>{active=false}},[load]);

  async function decide(type:"post"|"report",id:string,status:string){
    setBusy(true);
    try{
      const response=await fetch("/api/admin/community-moderation",{method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({type,id,status})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Não foi possível guardar a decisão.");
      await load();setMessage("Decisão guardada.");
    }catch(error){setMessage(error instanceof Error?error.message:"Erro de moderação.");}
    finally{setBusy(false);}
  }

  return <main className="admin-publish-page">
    <Link className="admin-back-link" href="/admin/publicar">← Voltar à administração</Link>
    <div className="admin-publish-heading"><span className="section-kicker">ADMINISTRAÇÃO / COMUNIDADE</span><h1>Moderação <em>da comunidade.</em></h1><p>Revê as publicações dos artistas e trata das denúncias antes de o conteúdo permanecer visível.</p></div>
    {!loaded?<p className="admin-security-note">A verificar sessão…</p>:!authorized?<div className="admin-publish-form"><h2>Sessão administrativa necessária</h2><p className="admin-security-note">{message||"Entra no painel principal e depois regressa a esta página."}</p><Link className="button button-light" href="/admin/publicar">Abrir painel administrativo ↗</Link></div>:<>
      <section className="admin-publication-list">
        <div className="admin-list-heading"><h2>Publicações por aprovar</h2><span>{posts.length} pendentes</span></div>
        {posts.length===0?<p className="admin-security-note">Não há publicações pendentes.</p>:posts.map(post=><article className="admin-publication-item community-moderation-item" key={post.id}>
          <div><span>{post.visibility==="followers"?"SÓ SEGUIDORES":"PÚBLICO"} · {post.municipality}</span><h3>{post.artist}</h3>{post.body&&<p>{post.body}</p>}{post.mediaUrl&&<a className="download-link" href={post.mediaUrl} target="_blank" rel="noreferrer">Pré-visualizar anexo ↗</a>}</div>
          <div className="admin-item-actions"><button className="admin-edit" type="button" disabled={busy} onClick={()=>decide("post",post.id,"approved")}>Aprovar</button><button className="admin-delete" type="button" disabled={busy} onClick={()=>decide("post",post.id,"rejected")}>Rejeitar</button></div>
        </article>)}
      </section>
      <section className="admin-publication-list">
        <div className="admin-list-heading"><h2>Denúncias recebidas</h2><span>{reports.length} pendentes</span></div>
        {reports.length===0?<p className="admin-security-note">Não há denúncias por rever.</p>:reports.map(report=><article className="admin-publication-item community-moderation-item" key={report.id}>
          <div><span>{report.targetType.toUpperCase()} · {report.reporter}</span><h3>Alvo: {report.targetId}</h3><p>{report.reason}</p></div>
          <div className="admin-item-actions"><button className="admin-edit" type="button" disabled={busy} onClick={()=>decide("report",String(report.id),"reviewing")}>Em análise</button><button className="admin-edit" type="button" disabled={busy} onClick={()=>decide("report",String(report.id),"resolved")}>Resolver</button><button className="admin-delete" type="button" disabled={busy} onClick={()=>decide("report",String(report.id),"dismissed")}>Arquivar</button></div>
        </article>)}
      </section>
    </>}
    {message&&<p className="admin-form-message" role="status">{message}</p>}
  </main>;
}
