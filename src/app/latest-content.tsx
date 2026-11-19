"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Publication = {
  id: string; type: string; title: string; artist: string; genre: string;
  description: string; link: string; audioUrl: string; imageUrl: string;
  ticketUrl?:string;ticketPrice?:string;location?:string;organizer?:string;eventStartsAt?:string|null;
  featured: boolean; createdAt: string;
};
const labels: Record<string,string> = {article:"Artigo",music:"Música",video:"Vídeo",announcement:"Anúncio",poetry:"Poesia",event:"Evento",opportunity:"Oportunidade",gallery:"Galeria",podcast:"Podcast",organization:"Organização",partnership:"Parceria",ticket:"Bilheteira",general:"Partilha"};
const filters = [["all","Tudo"],["music","Música"],["video","Vídeos"],["poetry","Poesia"],["event","Eventos"],["article","Artigos"],["partnership","Parcerias"],["organization","Organizações"],["opportunity","Oportunidades"],["announcement","Anúncios"],["gallery","Galeria"]];

function mediaKind(url:string,type:string):"audio"|"video"|"other"{
  const path=url.split(/[?#]/,1)[0].toLowerCase();
  if(type==="video"||/\.(mp4|webm|mov|ogv)$/.test(path))return "video";
  if(type==="music"||type==="podcast"||/\.(mp3|m4a|wav|ogg|oga|aac|flac)$/.test(path))return "audio";
  return "other";
}

export default function LatestContent() {
  const [posts,setPosts]=useState<Publication[]>([]),[loaded,setLoaded]=useState(false),[filter,setFilter]=useState("all"),[search,setSearch]=useState("");
  useEffect(()=>{const controller=new AbortController();fetch("/api/content",{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error("Falha ao carregar");return r.json() as Promise<Publication[]>}).then(setPosts).catch(()=>setPosts([])).finally(()=>setLoaded(true));return()=>controller.abort()},[]);
  const visiblePosts=useMemo(()=>{const q=search.trim().toLocaleLowerCase("pt-AO");return posts.filter(p=>{const media=mediaKind(p.audioUrl,p.type);const category=p.type==="announcement"&&media==="audio"?"music":p.type==="announcement"&&media==="video"?"video":p.type;const matches=filter==="all"||category===filter||(filter==="music"&&category==="podcast");return matches&&(!q||[p.title,p.artist,p.genre,p.description].join(" ").toLocaleLowerCase("pt-AO").includes(q))})},[posts,filter,search]);
  if(!loaded||posts.length===0)return null;
  return <section className="latest-section section-wrap" id="publicacoes">
    <div className="section-heading"><div><div className="section-kicker">ACTIVIDADE DA COMUNIDADE</div><h2>O que está a<br/><em>acontecer.</em></h2></div><p>Publicações editoriais da equipa<br/>e dos administradores do Código Lírico.</p></div>
    <div className="latest-controls"><label className="latest-search"><span className="sr-only">Pesquisar publicações</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar por título, artista ou tema…"/></label><div className="latest-filters" aria-label="Filtrar publicações">{filters.map(([v,l])=><button className={filter===v?"latest-filter active":"latest-filter"} key={v} type="button" onClick={()=>setFilter(v)} aria-pressed={filter===v}>{l}</button>)}</div></div>
    {visiblePosts.length===0?<p className="latest-empty">Não encontrámos publicações com esse filtro. Experimenta outra pesquisa.</p>:<div className="latest-grid">{visiblePosts.map(p=><article className={p.featured?"latest-card latest-card-featured":"latest-card"} key={p.id}>
      <div className="latest-card-top"><span>{p.type==="announcement"&&mediaKind(p.audioUrl,p.type)==="audio"?"Música":p.type==="announcement"&&mediaKind(p.audioUrl,p.type)==="video"?"Vídeo":labels[p.type]??p.type.toUpperCase()}</span>{p.featured&&<span className="latest-featured">EM DESTAQUE</span>}</div>
      {p.imageUrl&&<Image className="latest-image" src={p.imageUrl} alt={p.title} width={960} height={540} unoptimized/>}
      <div className="latest-card-content"><span className="latest-category">{p.genre}</span><h3>{p.title}</h3><p className="latest-byline">Por {p.artist}</p><p className="latest-description">{p.description}</p>
      {mediaKind(p.audioUrl,p.type)==="video"&&p.audioUrl&&<video className="latest-video" controls preload="metadata" playsInline src={p.audioUrl}>O teu navegador não suporta vídeo.</video>}
      {mediaKind(p.audioUrl,p.type)==="audio"&&p.audioUrl&&<audio aria-label={`Reproduzir ${p.title}`} controls preload="metadata" src={p.audioUrl}>O teu navegador não suporta áudio.</audio>}
      {p.audioUrl&&<a className="download-link" href={`${p.audioUrl}${p.audioUrl.includes("?")?"&":"?"}download=1`} target="_blank" rel="noreferrer" download>Descarregar ficheiro ↗</a>}
      {p.imageUrl&&<a className="download-link" href={`${p.imageUrl}${p.imageUrl.includes("?")?"&":"?"}download=1`} target="_blank" rel="noreferrer" download>Descarregar capa ↗</a>}
      {p.eventStartsAt&&<p className="latest-event-meta">{new Intl.DateTimeFormat("pt-AO",{dateStyle:"medium",timeStyle:"short"}).format(new Date(p.eventStartsAt))}{p.location?" · "+p.location:""}{p.organizer?" · "+p.organizer:""}</p>}
      {p.ticketPrice&&<p className="latest-ticket-price">Bilhete: {p.ticketPrice}</p>}
      {(p.ticketUrl||p.link)&&<a className="latest-ticket-link" href={p.ticketUrl||p.link} target="_blank" rel="noreferrer">Bilhetes / inscrição ↗</a>}
      </div></article>)}</div>}
  </section>;
}
