"use client";

import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type Artist={stageName:string;email:string;municipality:string;genre:string;bio:string;photoUrl:string};
type MetricPost={
  id:string;title:string;contentType:string;status:string;createdAt:string;scheduledAt:string|null;
  likes:number;comments:number;views:number;
};
type Analytics={
  totals:{posts:number;likes:number;comments:number;views:number;followers:number};
  posts:MetricPost[];
};
type Tab="overview"|"publish"|"analytics";

const categories=[
  ["music","Música"],["video","Vídeo"],["poetry","Poesia"],["event","Evento"],
  ["organization","Organização"],["partnership","Parceria"],["announcement","Anúncio"],
  ["article","Artigo"],["gallery","Galeria"],["general","Outra publicação"],
];
const categoryLabels=Object.fromEntries(categories);
const statusLabels:Record<string,string>={pending:"A aguardar aprovação",approved:"Publicado",rejected:"Não aprovado"};

function fileAccept(category:string){
  if(category==="music")return "audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/ogg";
  if(category==="video")return "video/mp4,video/webm";
  return "image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/ogg,video/mp4,video/webm";
}
function dateLabel(value:string){
  return new Intl.DateTimeFormat("pt-AO",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
}

export default function ArtistStudioPage(){
  const [artist,setArtist]=useState<Artist|null>(null);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [analytics,setAnalytics]=useState<Analytics|null>(null);
  const [tab,setTab]=useState<Tab>("overview");
  const [category,setCategory]=useState("music");
  const [title,setTitle]=useState("");
  const [body,setBody]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [visibility,setVisibility]=useState("public");
  const [scheduledAt,setScheduledAt]=useState("");
  const [location,setLocation]=useState("");
  const [organizer,setOrganizer]=useState("");
  const [eventStartsAt,setEventStartsAt]=useState("");
  const [ticketPrice,setTicketPrice]=useState("");
  const [ticketUrl,setTicketUrl]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  const loadAnalytics=useCallback(async()=>{
    const response=await fetch("/api/artist/analytics",{credentials:"same-origin",cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error??"Não foi possível carregar as estatísticas.");
    setAnalytics(data);
  },[]);

  useEffect(()=>{
    let active=true;
    fetch("/api/artist/session",{credentials:"same-origin",cache:"no-store"})
      .then(response=>response.json()).then(async data=>{
        if(!active||!data.authenticated)return;
        setArtist(data.artist);
        try{await loadAnalytics();}catch(error){if(active)setMessage(error instanceof Error?error.message:"Erro ao carregar o estúdio.");}
      }).catch(()=>{if(active)setMessage("Não foi possível verificar a sessão.");});
    return()=>{active=false;};
  },[loadAnalytics]);

  async function login(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/artist/login",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error??"Não foi possível entrar.");
      setArtist(data.artist);setPassword("");await loadAnalytics();setMessage("Sessão iniciada.");
    }catch(error){setMessage(error instanceof Error?error.message:"Erro ao iniciar sessão.");}
    finally{setBusy(false);}
  }

  async function logout(){
    setBusy(true);
    try{await fetch("/api/artist/session",{method:"DELETE",credentials:"same-origin"});}
    finally{setArtist(null);setAnalytics(null);setBusy(false);setMessage("Sessão terminada.");}
  }

  async function publish(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!title.trim()){setMessage("Indica o título do conteúdo.");return;}
    if(!body.trim()&&!file){setMessage("Escreve uma descrição ou selecciona um ficheiro.");return;}
    if(category==="music"&&(!file||!file.type.startsWith("audio/"))){setMessage("Para publicar música, selecciona um ficheiro de áudio.");return;}
    if(category==="video"&&(!file||!file.type.startsWith("video/"))){setMessage("Para publicar vídeo, selecciona um ficheiro de vídeo.");return;}
    if(category==="event"&&(!eventStartsAt||!location.trim()||!organizer.trim())){setMessage("Completa a data, o local e a organização do evento.");return;}
    if(ticketUrl.trim()&&!/^https:\/\//i.test(ticketUrl.trim())){setMessage("A ligação para bilhetes deve começar por HTTPS.");return;}

    setBusy(true);setMessage("A preparar a publicação…");
    try{
      let mediaUrl="";let mediaType="none";let sizeBytes=0;
      if(file){
        if(file.size>200*1024*1024)throw new Error("O ficheiro ultrapassa 200 MB.");
        const allowed=["image/jpeg","image/png","image/webp","audio/mpeg","audio/mp4","audio/wav","audio/x-wav","audio/ogg","video/mp4","video/webm"];
        if(!allowed.includes(file.type))throw new Error("Formato de ficheiro não permitido.");
        const blob=await upload(file.name,file,{access:"public",handleUploadUrl:"/api/artist/upload"});
        mediaUrl=blob.url;mediaType=file.type;sizeBytes=file.size;
      }
      const response=await fetch("/api/community/posts",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        title:title.trim(),contentType:category,body:body.trim(),mediaUrl,mediaType,sizeBytes,visibility,
        scheduledAt:scheduledAt||null,location:location.trim(),organizer:organizer.trim(),
        eventStartsAt:eventStartsAt||null,ticketPrice:ticketPrice.trim(),ticketUrl:ticketUrl.trim(),
      })});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error??"Não foi possível enviar a publicação.");
      setTitle("");setBody("");setFile(null);setVisibility("public");setScheduledAt("");
      setLocation("");setOrganizer("");setEventStartsAt("");setTicketPrice("");setTicketUrl("");
      (event.currentTarget as HTMLFormElement).reset();
      await loadAnalytics();
      setTab("analytics");
      setMessage(data.scheduledAt?"Conteúdo enviado para aprovação com data de agendamento.":"Conteúdo enviado para aprovação.");
    }catch(error){setMessage(error instanceof Error?error.message:"O envio falhou.");}
    finally{setBusy(false);}
  }

  const totals=analytics?.totals??{posts:0,likes:0,comments:0,views:0,followers:0};

  return <main className="artist-console">
    <nav className="artist-console-top">
      <Link href="/" className="artist-console-brand"><span className="artist-console-mark">CL</span><span>CÓDIGO <strong>LÍRICO</strong></span></Link>
      <div className="artist-console-nav"><Link href="/comunidade">Comunidade ↗</Link><Link href="/">Página pública ↗</Link></div>
    </nav>
    {!artist?<section className="artist-console-login">
      <div className="artist-console-kicker">ESTÚDIO DE ARTISTA · ACESSO PRIVADO</div>
      <h1>A tua criação.<br/><em>O teu espaço.</em></h1>
      <p>Gere as tuas publicações, acompanha a audiência e apresenta os teus projectos ao público.</p>
      <form className="artist-console-card artist-console-login-form" onSubmit={login}>
        <h2>Entrar no estúdio</h2>
        <label>E-mail da conta aprovada<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
        <label>Palavra-passe<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} required/></label>
        <button className="artist-console-primary" type="submit" disabled={busy}>{busy?"A verificar…":"Entrar no estúdio ↗"}</button>
        <p className="admin-security-note">O acesso está reservado a artistas aprovados.</p>
        <p className="artist-register-prompt">Ainda não tens conta? <Link href="/artista/cadastro">Candidatar-me como artista ↗</Link></p>
      </form>
    </section>:<>
      <header className="artist-console-hero">
        <div><span className="artist-console-kicker">ESTÚDIO PRIVADO · {artist.municipality.toUpperCase()}</span>
          <h1>Olá, <em>{artist.stageName}.</em></h1>
          <p>O teu espaço de criação, publicação e acompanhamento de audiência.</p>
        </div>
        <div className="artist-console-hero-actions"><span className="artist-console-account">CONTA DE ARTISTA APROVADA</span><button type="button" onClick={logout} disabled={busy}>Terminar sessão</button></div>
      </header>

      <section className="artist-console-stats" aria-label="Estatísticas do artista">
        <article><span>VISUALIZAÇÕES</span><strong>{totals.views.toLocaleString("pt-AO")}</strong><small>Leitores únicos por publicação</small></article>
        <article><span>GOSTOS</span><strong>{totals.likes.toLocaleString("pt-AO")}</strong><small>Reacções recebidas</small></article>
        <article><span>COMENTÁRIOS</span><strong>{totals.comments.toLocaleString("pt-AO")}</strong><small>Conversas nas publicações</small></article>
        <article><span>SEGUIDORES</span><strong>{totals.followers.toLocaleString("pt-AO")}</strong><small>Pessoas que seguem o perfil</small></article>
      </section>

      <div className="artist-console-tabs" role="tablist" aria-label="Secções do estúdio">
        <button type="button" className={tab==="overview"?"active":""} onClick={()=>setTab("overview")}>Visão geral</button>
        <button type="button" className={tab==="publish"?"active":""} onClick={()=>setTab("publish")}>Criar publicação</button>
        <button type="button" className={tab==="analytics"?"active":""} onClick={()=>setTab("analytics")}>Desempenho</button>
      </div>

      {tab==="overview"&&<section className="artist-console-overview">
        <div className="artist-console-welcome artist-console-card">
          <div><span className="artist-console-kicker">PAINEL DO CRIADOR</span><h2>Transforma ideias<br/><em>em movimento.</em></h2><p>Publica música, vídeo, poesia, eventos, parcerias e anúncios. A equipa faz a revisão antes da publicação.</p></div>
          <div className="artist-console-actions"><button type="button" className="artist-console-primary" onClick={()=>setTab("publish")}>Criar conteúdo ↗</button><Link href="/comunidade">Abrir comunidade ↗</Link></div>
        </div>
        <div className="artist-console-card artist-console-recent">
          <div className="artist-console-section-heading"><div><span className="artist-console-kicker">ACTIVIDADE RECENTE</span><h2>As tuas publicações</h2></div><button type="button" onClick={()=>setTab("analytics")}>Ver estatísticas ↗</button></div>
          {!analytics?<p className="admin-security-note">A carregar estatísticas…</p>:analytics.posts.length===0?<p className="admin-security-note">Ainda não publicaste conteúdo. Começa pela opção «Criar publicação».</p>:analytics.posts.slice(0,5).map(post=><article className="artist-console-post-row" key={post.id}>
            <div><span>{categoryLabels[post.contentType]??post.contentType} · {statusLabels[post.status]??post.status}</span><strong>{post.title||"Publicação sem título"}</strong><small>{dateLabel(post.createdAt)}</small></div>
            <div className="artist-console-mini-metrics"><span>♡ {post.likes}</span><span>◌ {post.comments}</span><span>◉ {post.views}</span></div>
          </article>)}
        </div>
      </section>}

      {tab==="publish"&&<section className="artist-console-publish">
        <div className="artist-console-card artist-console-form-card">
          <span className="artist-console-kicker">PUBLICAÇÃO · ESCOLHE O FORMATO</span>
          <h2>O que vais partilhar?</h2>
          <p>Selecciona a categoria. O formulário adapta o ficheiro e os detalhes necessários.</p>
          <form onSubmit={publish}>
            <label>Tipo de conteúdo<select value={category} onChange={e=>{setCategory(e.target.value);setFile(null);}}>{categories.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
            <label>Título<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={160} placeholder="Dá um título ao teu conteúdo" required/></label>
            <label>Descrição / texto<textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={5000} rows={6} placeholder={category==="poetry"?"Escreve a tua poesia ou apresentação…":"Explica ao público o que estás a partilhar…"} /></label>
            <label>Ficheiro {category==="music"?"de áudio":category==="video"?"de vídeo":"(opcional)"}
              <div className="artist-console-file"><input type="file" accept={fileAccept(category)} onChange={e=>setFile(e.target.files?.[0]??null)}/><span>{file?file.name:category==="music"?"Selecciona um áudio MP3, M4A, WAV ou OGG.":category==="video"?"Selecciona um vídeo MP4 ou WebM.":"Podes anexar uma imagem, áudio ou vídeo até 200 MB."}</span></div>
            </label>
            {category==="event"&&<div className="artist-console-event-fields">
              <span className="artist-console-kicker">DETALHES DO EVENTO</span>
              <div className="artist-console-form-grid">
                <label>Data e hora<input type="datetime-local" value={eventStartsAt} onChange={e=>setEventStartsAt(e.target.value)} required/></label>
                <label>Local / recinto<input value={location} onChange={e=>setLocation(e.target.value)} maxLength={180} placeholder="Cidade, espaço ou endereço" required/></label>
              </div>
              <label>Organização responsável<input value={organizer} onChange={e=>setOrganizer(e.target.value)} maxLength={160} placeholder="Nome do organizador" required/></label>
              <div className="artist-console-form-grid">
                <label>Preço do bilhete<input value={ticketPrice} onChange={e=>setTicketPrice(e.target.value)} maxLength={60} placeholder="Ex.: 2.500 Kz ou Gratuito"/></label>
                <label>Ligação de bilhetes / vendas<input type="url" value={ticketUrl} onChange={e=>setTicketUrl(e.target.value)} maxLength={2048} placeholder="https://…"/></label>
              </div>
              <p className="admin-security-note">A plataforma apresenta o preço e encaminha para a página segura do organizador. Não recolhe dados de cartões nem processa pagamentos directamente.</p>
            </div>}
            <div className="artist-console-form-grid">
              <label>Visibilidade<select value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="public">Público</option><option value="followers">Só seguidores</option></select></label>
              <label>Agendar publicação<input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)}/></label>
            </div>
            <button className="artist-console-primary" type="submit" disabled={busy}>{busy?"A enviar…":"Enviar para aprovação ↗"}</button>
            <p className="admin-security-note">A publicação passa por revisão administrativa. Se agendares, só fica visível depois da aprovação e na data escolhida.</p>
          </form>
        </div>
        <aside className="artist-console-publish-aside">
          <div className="artist-console-card"><span className="artist-console-kicker">FORMATOS DISPONÍVEIS</span><h3>Música, vídeo e muito mais.</h3><ul><li>Áudio e videoclipes</li><li>Poesia e literatura</li><li>Eventos e bilheteira</li><li>Organizações e projectos</li><li>Parcerias e colaborações</li><li>Anúncios e artigos</li><li>Galerias e outras partilhas</li></ul></div>
          <div className="artist-console-card"><span className="artist-console-kicker">AGENDAMENTO</span><h3>Publica na hora certa.</h3><p>Escolhe uma data futura. A equipa aprova o conteúdo e o site mostra-o automaticamente quando chegar o momento.</p></div>
        </aside>
      </section>}

      {tab==="analytics"&&<section className="artist-console-card artist-console-analytics">
        <div className="artist-console-section-heading"><div><span className="artist-console-kicker">DESEMPENHO DO PERFIL</span><h2>Os números do teu trabalho.</h2></div><button type="button" onClick={()=>loadAnalytics().catch(e=>setMessage(e.message))}>Actualizar ↻</button></div>
        <div className="artist-console-stats artist-console-stats-inner">
          <article><span>PUBLICAÇÕES</span><strong>{totals.posts}</strong></article>
          <article><span>VISUALIZAÇÕES</span><strong>{totals.views}</strong></article>
          <article><span>GOSTOS</span><strong>{totals.likes}</strong></article>
          <article><span>COMENTÁRIOS</span><strong>{totals.comments}</strong></article>
        </div>
        {analytics?.posts.map(post=><article className="artist-console-post-row artist-console-post-detail" key={post.id}>
          <div><span>{categoryLabels[post.contentType]??post.contentType} · {statusLabels[post.status]??post.status}</span><strong>{post.title||"Publicação sem título"}</strong><small>{dateLabel(post.createdAt)}{post.scheduledAt?" · Agendado para "+dateLabel(post.scheduledAt):""}</small></div>
          <div className="artist-console-mini-metrics"><span>♡ {post.likes}</span><span>◌ {post.comments}</span><span>◉ {post.views}</span></div>
        </article>)}
        {analytics?.posts.length===0&&<p className="admin-security-note">Ainda não existem publicações para analisar.</p>}
      </section>}
    </>}

    {message&&<p className="artist-console-message" role="status">{message}</p>}
    <footer className="artist-console-footer"><Link href="/">Código Lírico</Link><span>Estúdio privado · Lunda Sul</span></footer>
  </main>;
}
