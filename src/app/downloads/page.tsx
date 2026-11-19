"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Item = { id:string; type:string; title:string; artist:string; genre:string; description:string; audioUrl:string; imageUrl:string; createdAt:string };
const labels:Record<string,string>={music:"Música",video:"Vídeo",podcast:"Podcast",gallery:"Galeria",article:"Documento",poetry:"Poesia",event:"Evento"};

function downloadUrl(url:string){return `${url}${url.includes("?")?"&":"?"}download=1`;}
function mediaKind(url:string,type:string):"audio"|"video"|"other"{
  const path=url.split(/[?#]/,1)[0].toLowerCase();
  if(type==="video"||/\.(mp4|webm|mov|ogv)$/.test(path))return "video";
  if(type==="music"||type==="podcast"||/\.(mp3|m4a|wav|ogg|oga|aac|flac)$/.test(path))return "audio";
  return "other";
}
function displayType(item:Item){const kind=mediaKind(item.audioUrl,item.type);return kind==="audio"?(item.type==="podcast"?"podcast":"music"):kind==="video"?"video":item.type;}

export default function DownloadsPage(){
  const [items,setItems]=useState<Item[]>([]),[loaded,setLoaded]=useState(false),[filter,setFilter]=useState("all"),[query,setQuery]=useState("");
  useEffect(()=>{const controller=new AbortController();fetch("/api/content",{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error("Não foi possível carregar os ficheiros.");return r.json() as Promise<Item[]>}).then(setItems).catch(()=>setItems([])).finally(()=>setLoaded(true));return()=>controller.abort()},[]);
  const files=useMemo(()=>items.filter(i=>i.audioUrl||i.imageUrl).filter(i=>filter==="all"||displayType(i)===filter).filter(i=>!query.trim()||[i.title,i.artist,i.genre].join(" ").toLocaleLowerCase("pt-AO").includes(query.trim().toLocaleLowerCase("pt-AO"))),[items,filter,query]);
  return <main className="downloads-page">
    <header className="downloads-header"><Link href="/" className="admin-back-link">← Código Lírico</Link><div className="section-kicker">ARQUIVO PÚBLICO · LUNDA SUL</div><h1>Biblioteca de <em>downloads.</em></h1><p>Ficheiros publicados pela plataforma, disponíveis para ouvir, consultar e descarregar.</p></header>
    <div className="downloads-toolbar"><input aria-label="Pesquisar ficheiros" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar por título, artista ou categoria…"/><div className="latest-filters">{[["all","Todos"],["music","Música"],["video","Vídeos"],["podcast","Podcasts"],["gallery","Imagens"],["article","Documentos"]].map(([v,l])=><button key={v} type="button" className={filter===v?"latest-filter active":"latest-filter"} onClick={()=>setFilter(v)}>{l}</button>)}</div></div>
    {!loaded?<p className="downloads-empty">A carregar ficheiros…</p>:files.length===0?<p className="downloads-empty">Ainda não há ficheiros publicados nesta categoria.</p>:<div className="downloads-grid">{files.map(item=><article className="download-card" key={item.id}>
      <span className="latest-category">{labels[displayType(item)]??displayType(item).toUpperCase()} · {item.genre}</span><h2>{item.title}</h2><p>Por {item.artist}</p>{item.description&&<p className="download-description">{item.description}</p>}
      {mediaKind(item.audioUrl,item.type)==="video"&&item.audioUrl&&<video controls preload="metadata" playsInline src={item.audioUrl}/>}
      {mediaKind(item.audioUrl,item.type)==="audio"&&item.audioUrl&&<audio aria-label={`Reproduzir ${item.title}`} controls preload="metadata" src={item.audioUrl}/>}
      <div className="download-actions">{item.audioUrl&&<a className="button button-light" href={downloadUrl(item.audioUrl)} target="_blank" rel="noreferrer">Descarregar ficheiro ↓</a>}{item.imageUrl&&<a className="download-link" href={downloadUrl(item.imageUrl)} target="_blank" rel="noreferrer">Descarregar capa ↗</a>}</div>
    </article>)}</div>}
    <footer className="downloads-footer"><Link href="/">Voltar à página inicial</Link></footer>
  </main>;
}
