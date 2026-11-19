"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DiscoveryData = {
  artists: { id:string; stageName:string; municipality:string; genre:string; bio:string; link:string; photoUrl:string }[];
  events: { id:string; title:string; category:string; municipality:string; venue:string; startsAt:string|null; endsAt:string|null; organizer:string; description:string; registrationUrl:string; sourceUrl:string }[];
  opportunities: { id:string; title:string; category:string; location:string; deadline:string|null; eligibility:string; description:string; applicationUrl:string; sourceUrl:string }[];
};
const dateLabel=(value:string|null)=>value?new Intl.DateTimeFormat("pt-AO",{dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Luanda"}).format(new Date(value)):"Data a confirmar";
const safeLink=(value:string)=>{try{const u=new URL(value);return u.protocol==="https:"?u.toString():""}catch{return ""}};

export default function DiscoverySections(){
  const [data,setData]=useState<DiscoveryData|null>(null);
  const [error,setError]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/discovery",{signal:controller.signal})
      .then(r=>{if(!r.ok)throw new Error("Falha");return r.json() as Promise<DiscoveryData>})
      .then(setData).catch(()=>{if(!controller.signal.aborted)setError(true)});
    return()=>controller.abort();
  },[]);
  if(error)return <section className="discovery-section section-wrap"><p className="latest-empty">Não foi possível carregar os conteúdos públicos neste momento.</p></section>;
  if(!data)return <section className="discovery-section section-wrap"><p className="latest-empty">A carregar artistas, eventos e oportunidades…</p></section>;
  return <div className="discovery-wrap">
    <section className="discovery-section section-wrap" id="artistas">
      <div className="section-heading"><div><div className="section-kicker">05 / ARTISTAS</div><h2>Quem cria.<br/><em>Quem inspira.</em></h2></div><p>Perfis aprovados pela equipa<br/>do Código Lírico.</p></div>
      {data.artists.length===0?<p className="latest-empty">Ainda não há perfis públicos de artistas.</p>:<div className="discovery-grid">{data.artists.map(a=><article className="discovery-card artist-discovery-card" key={a.id}>
        <div className="artist-avatar">{a.stageName.slice(0,2).toUpperCase()}</div><span className="latest-category">{a.municipality} · {a.genre}</span><h3>{a.stageName}</h3><p>{a.bio}</p>{safeLink(a.link)&&<a className="download-link" href={safeLink(a.link)} target="_blank" rel="noreferrer">Perfil / portefólio ↗</a>}
      </article>)}</div>}
      <p className="discovery-footnote">És artista com conta aprovada? <Link href="/artista">Entra no teu estúdio privado ↗</Link></p>
    </section>
    <section className="discovery-section section-wrap" id="eventos">
      <div className="section-heading"><div><div className="section-kicker">06 / AGENDA CULTURAL</div><h2>Eventos em<br/><em>movimento.</em></h2></div><p>Agenda pública da cultura<br/>e da comunidade.</p></div>
      {data.events.length===0?<p className="latest-empty">Não há eventos publicados para as próximas datas.</p>:<div className="discovery-grid">{data.events.map(e=><article className="discovery-card" key={e.id}>
        <span className="latest-category">{e.category} · {e.municipality}</span><h3>{e.title}</h3><p className="discovery-date">{dateLabel(e.startsAt)}{e.endsAt?" — "+dateLabel(e.endsAt):""}</p><p>{e.description}</p><small>{e.organizer}{e.venue?" · "+e.venue:""}</small>
        <div className="discovery-links">{safeLink(e.registrationUrl)&&<a className="download-link" href={safeLink(e.registrationUrl)} target="_blank" rel="noreferrer">Inscrição / bilhetes ↗</a>}{safeLink(e.sourceUrl)&&<a className="download-link" href={safeLink(e.sourceUrl)} target="_blank" rel="noreferrer">Fonte oficial ↗</a>}</div>
      </article>)}</div>}
    </section>
    <section className="discovery-section section-wrap" id="oportunidades">
      <div className="section-heading"><div><div className="section-kicker">07 / OPORTUNIDADES</div><h2>Novas portas.<br/><em>Novos caminhos.</em></h2></div><p>Programas e chamadas<br/>com informação e fonte.</p></div>
      {data.opportunities.length===0?<p className="latest-empty">Não há oportunidades activas publicadas.</p>:<div className="discovery-grid">{data.opportunities.map(o=><article className="discovery-card" key={o.id}>
        <span className="latest-category">{o.category} · {o.location}</span><h3>{o.title}</h3><p>{o.description}</p>{o.deadline&&<p className="discovery-date">Prazo: {dateLabel(o.deadline)}</p>}{o.eligibility&&<small>Requisitos: {o.eligibility}</small>}
        <div className="discovery-links">{safeLink(o.applicationUrl)&&<a className="download-link" href={safeLink(o.applicationUrl)} target="_blank" rel="noreferrer">Candidatura ↗</a>}{safeLink(o.sourceUrl)&&<a className="download-link" href={safeLink(o.sourceUrl)} target="_blank" rel="noreferrer">Consultar fonte ↗</a>}</div>
      </article>)}</div>}
    </section>
  </div>;
}
