"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Publication = {
  id: string; type: string; title: string; artist: string; genre: string;
  description: string; link: string; audioUrl: string; imageUrl: string;
  featured: boolean; createdAt: string;
};
const labels: Record<string,string> = {article:"Artigo",music:"Música",video:"Vídeo",announcement:"Comunicado",poetry:"Poesia",event:"Evento",opportunity:"Oportunidade",gallery:"Galeria",podcast:"Podcast"};
const filters = [["all","Tudo"],["music","Música"],["video","Vídeos"],["article","Artigos"],["event","Eventos"],["opportunity","Oportunidades"],["announcement","Comunicados"],["poetry","Poesia"],["gallery","Galeria"]];

export default function LatestContent() {
  const [posts,setPosts]=useState<Publication[]>([]),[loaded,setLoaded]=useState(false),[filter,setFilter]=useState("all"),[search,setSearch]=useState("");
  useEffect(()=>{const controller=new AbortController();fetch("/api/content",{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error("Falha ao carregar");return r.json() as Promise<Publication[]>}).then(setPosts).catch(()=>setPosts([])).finally(()=>setLoaded(true));return()=>controller.abort()},[]);
  const visiblePosts=useMemo(()=>{const q=search.trim().toLocaleLowerCase("pt-AO");return posts.filter(p=>{const type=filter==="all"||p.type===filter||(filter==="music"&&p.type==="podcast");return type&&(!q||[p.title,p.artist,p.genre,p.description].join(" ").toLocaleLowerCase("pt-AO").includes(q))})},[posts,filter,search]);
  if(!loaded||posts.length===0)return null;
  return <section className="latest-section section-wrap" id="publicacoes">
    <div className="section-heading"><div><div className="section-kicker">ACTIVIDADE DA COMUNIDADE</div><h2>O que está a<br/><em>acontecer.</em></h2></div><p>Publicações editoriais da equipa<br/>e dos administradores do Código Lírico.</p></div>
    <div className="latest-controls"><label className="latest-search"><span className="sr-only">Pesquisar publicações</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar por título, artista ou tema…"/></label><div className="latest-filters" aria-label="Filtrar publicações">{filters.map(([v,l])=><button className={filter===v?"latest-filter active":"latest-filter"} key={v} type="button" onClick={()=>setFilter(v)} aria-pressed={filter===v}>{l}</button>)}</div></div>
    {visiblePosts.length===0?<p className="latest-empty">Não encontrámos publicações com esse filtro. Experimenta outra pesquisa.</p>:<div className="latest-grid">{visiblePosts.map(p=><article className={p.featured?"latest-card latest-card-featured":"latest-card"} key={p.id}>
      <div className="latest-card-top"><span>{labels[p.type]??p.type.toUpperCase()}</span>{p.featured&&<span className="latest-featured">EM DESTAQUE</span>}</div>
      {p.imageUrl&&<Image className="latest-image" src={p.imageUrl} alt={p.title} width={960} height={540} unoptimized/>}
      <div className="latest-card-content"><span className="latest-category">{p.genre}</span><h3>{p.title}</h3><p className="latest-byline">Por {p.artist}</p><p className="latest-description">{p.description}</p>
      {p.type==="video"&&p.audioUrl&&<video className="latest-video" controls preload="none" playsInline src={p.audioUrl}>O teu navegador não suporta vídeo.</video>}
      {(p.type==="music"||p.type==="podcast")&&p.audioUrl&&<audio controls preload="none" src={p.audioUrl}>O teu navegador não suporta áudio.</audio>}
      {p.audioUrl&&<a className="download-link" href={p.audioUrl} target="_blank" rel="noreferrer" download>Descarregar ficheiro ↗</a>}
      {p.imageUrl&&<a className="download-link" href={p.imageUrl} target="_blank" rel="noreferrer" download>Descarregar capa ↗</a>}
      {p.link&&<a className="underlined-link" href={p.link} target="_blank" rel="noreferrer">Abrir ligação externa <span>↗</span></a>}
      </div></article>)}</div>}
  </section>;
}
