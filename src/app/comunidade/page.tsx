"use client";

import Link from "next/link";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

type Artist={stageName:string;applicationId:string};
type AdminViewer={id:string;displayName:string;role:string};
type Post={
  id:string;authorId:string;title:string;contentType:string;body:string;mediaUrl:string;mediaType:string;
  location:string;organizer:string;eventStartsAt:string|null;ticketPrice:string;ticketUrl:string;
  scheduledAt:string|null;visibility:string;status:string;createdAt:string;
  author:string;municipality:string;genre:string;photoUrl:string;
  reactionCount:number;commentCount:number;viewCount:number;myReaction:string|null;isMine:boolean;isFollowing:boolean;
};
type Comment={id:string;body:string;createdAt:string;authorId:string;author:string;photoUrl:string};
type Conversation={id:string;artist:{id:string;stageName:string;municipality:string;photoUrl:string};updatedAt:string;latestMessage:{body:string;createdAt:string;senderId:string;isMine:boolean}|null;unreadCount:number};
type DirectMessage={id:number;body:string;createdAt:string;senderId:string;sender:string;isMine:boolean;readAt:string|null};
const dateLabel=(raw:string)=>new Intl.DateTimeFormat("pt-AO",{dateStyle:"medium",timeStyle:"short"}).format(new Date(raw));
const categoryLabels:Record<string,string>={music:"Música",video:"Vídeo",poetry:"Poesia",event:"Evento",organization:"Organização",partnership:"Parceria",announcement:"Anúncio",article:"Artigo",gallery:"Galeria",general:"Partilha"};

function PostViewTracker({postId,onViewed}:{postId:string;onViewed:(id:string,total:number)=>void}){
  const marker=useRef<HTMLSpanElement|null>(null);
  useEffect(()=>{
    const element=marker.current;
    if(!element||typeof IntersectionObserver==="undefined")return;
    let sent=false;
    const observer=new IntersectionObserver(entries=>{
      if(sent||!entries.some(entry=>entry.isIntersecting))return;
      sent=true;observer.disconnect();
      fetch("/api/community/views",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({postId})})
        .then(response=>response.json()).then(data=>{if(typeof data.viewCount==="number")onViewed(postId,data.viewCount);})
        .catch(()=>{});
    },{threshold:0.5});
    observer.observe(element);
    return()=>observer.disconnect();
  },[postId,onViewed]);
  return <span ref={marker} className="community-view-sentinel" aria-hidden="true"/>;
}

export default function CommunityPage(){
  const [artist,setArtist]=useState<Artist|null>(null);
  const [adminViewer,setAdminViewer]=useState<AdminViewer|null>(null);
  const [posts,setPosts]=useState<Post[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [postTitle,setPostTitle]=useState("");
  const [body,setBody]=useState("");
  const [visibility,setVisibility]=useState("public");
  const [file,setFile]=useState<File|null>(null);
  const [comments,setComments]=useState<Record<string,Comment[]>>({});
  const [commentDrafts,setCommentDrafts]=useState<Record<string,string>>({});
  const [expanded,setExpanded]=useState<Record<string,boolean>>({});
  const [inboxOpen,setInboxOpen]=useState(false);
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [activeThread,setActiveThread]=useState<Conversation["artist"]|null>(null);
  const [directMessages,setDirectMessages]=useState<DirectMessage[]>([]);
  const [directDraft,setDirectDraft]=useState("");
  const [busy,setBusy]=useState(false);
  const messageTargetOpened = useRef<string | null>(null);
  const [message,setMessage]=useState("");

  const refresh=useCallback(async()=>{
    const response=await fetch("/api/community/feed",{credentials:"same-origin",cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error??"Não foi possível carregar a comunidade.");
    setArtist(data.artist??null);setAdminViewer(data.admin??null);setPosts(data.posts??[]);
  },[]);

  const refreshInbox=useCallback(async()=>{
    const response=await fetch("/api/community/messages",{credentials:"same-origin",cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error??"Não foi possível carregar as mensagens.");
    setConversations(data.conversations??[]);
  },[]);

  const updatePostViews=useCallback((id:string,total:number)=>{
    setPosts(current=>current.map(post=>post.id===id?{...post,viewCount:total}:post));
  },[]);

  useEffect(()=>{
    let active=true;
    fetch("/api/community/feed",{credentials:"same-origin",cache:"no-store"})
      .then(response=>response.json().then(data=>({response,data})))
      .then(({response,data})=>{
        if(!active)return;
        if(!response.ok)throw new Error(data.error??"Não foi possível carregar a comunidade.");
        setArtist(data.artist??null);setPosts(data.posts??[]);
        if(data.artist)refreshInbox().catch(()=>{});
      })
      .catch(error=>{if(active)setMessage(error instanceof Error?error.message:"Erro ao carregar a comunidade.");})
      .finally(()=>{if(active)setLoaded(true);});
    return()=>{active=false;};
  },[refreshInbox]);

  useEffect(()=>{
    if(!artist&&!adminViewer)return;
    const targetId=new URLSearchParams(window.location.search).get("messageTo")?.trim()??"";
    if(!targetId||messageTargetOpened.current===targetId)return;
    messageTargetOpened.current=targetId;
    fetch("/api/community/messages?artistId="+encodeURIComponent(targetId),{credentials:"same-origin",cache:"no-store"})
      .then(async response=>{
        const data=await response.json();
        if(!response.ok)throw new Error(data.error??"Não foi possível abrir esta conversa.");
        if(!data.conversation)throw new Error("O perfil deste autor não está disponível para mensagens.");
        setActiveThread(data.conversation.artist);
        setDirectMessages(data.messages??[]);
        setInboxOpen(true);
        refreshInbox().catch(()=>{});
      })
      .catch(error=>setMessage(error instanceof Error?error.message:"Não foi possível abrir a conversa."));
  },[artist,adminViewer,refreshInbox]);

  async function login(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/artist/login",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Não foi possível iniciar sessão.");
      setPassword("");await refresh();await refreshInbox();setMessage("Sessão iniciada. Já podes participar na comunidade.");
    }catch(error){setMessage(error instanceof Error?error.message:"Erro ao entrar.");}
    finally{setBusy(false);}
  }

  async function logout(){
    setBusy(true);
    try{
      await fetch(artist?"/api/artist/session":"/api/admin/session",{method:"DELETE",credentials:"same-origin"});
      setArtist(null);setAdminViewer(null);messageTargetOpened.current=null;setComments({});setConversations([]);setActiveThread(null);setDirectMessages([]);setInboxOpen(false);
      setMessage("Sessão terminada.");
    }finally{setBusy(false);}
    await refresh().catch(()=>{});
  }

  async function submitPost(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!body.trim()&&!file){setMessage("Escreve uma mensagem ou escolhe um ficheiro.");return;}
    setBusy(true);setMessage("A preparar a publicação…");
    try{
      let mediaUrl="";let mediaType="none";let sizeBytes=0;
      if(file){
        const allowed=["image/jpeg","image/png","image/webp","audio/mpeg","audio/mp4","audio/wav","audio/x-wav","audio/ogg","video/mp4","video/webm"];
        if(!allowed.includes(file.type))throw new Error("Formato não permitido. Usa imagem, áudio ou vídeo.");
        if(file.size>200*1024*1024)throw new Error("O ficheiro ultrapassa 200 MB.");
        const blob=await upload(file.name,file,{access:"public",handleUploadUrl:"/api/artist/upload"});
        mediaUrl=blob.url;mediaType=file.type;sizeBytes=file.size;
      }
      const title=postTitle.trim()||body.trim().slice(0,90)||"Partilha da comunidade";
      const response=await fetch("/api/community/posts",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,contentType:"general",body:body.trim(),mediaUrl,mediaType,sizeBytes,visibility})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Não foi possível enviar a publicação.");
      setPostTitle("");setBody("");setFile(null);setVisibility("public");
      (event.currentTarget as HTMLFormElement).reset();
      await refresh();setMessage("Publicação enviada para revisão. Aparecerá no feed depois da aprovação.");
    }catch(error){setMessage(error instanceof Error?error.message:"O envio falhou.");}
    finally{setBusy(false);}
  }

  async function react(postId:string){
    if(!artist&&!adminViewer){setMessage("Inicia sessão para reagir a publicações.");return;}
    setBusy(true);
    try{
      const response=await fetch("/api/community/react",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({postId,reaction:"like"})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Não foi possível reagir.");
      await refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"A reacção falhou.");}
    finally{setBusy(false);}
  }

  async function follow(artistId:string){
    if(!artist&&!adminViewer){setMessage("Inicia sessão para seguir perfis.");return;}
    setBusy(true);
    try{
      const response=await fetch("/api/community/follow",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({artistId})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Não foi possível actualizar o seguimento.");
      await refresh();setMessage(data.following?"Agora estás a seguir este artista.":"Deixaste de seguir este artista.");
    }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível seguir o perfil.");}
    finally{setBusy(false);}
  }

  async function openInbox(){
    if(!artist&&!adminViewer){setMessage("Inicia sessão para consultar as mensagens.");return;}
    setInboxOpen(true);setActiveThread(null);setDirectMessages([]);
    try{await refreshInbox();}catch(error){setMessage(error instanceof Error?error.message:"Não foi possível carregar as mensagens.");}
  }

  async function openThread(person:{id:string;stageName:string;municipality?:string;photoUrl?:string}){
    if(!artist&&!adminViewer)return;
    setBusy(true);
    try{
      const response=await fetch("/api/community/messages?artistId="+encodeURIComponent(person.id),{credentials:"same-origin",cache:"no-store"});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Não foi possível abrir a conversa.");
      setActiveThread(data.conversation.artist);setDirectMessages(data.messages??[]);setInboxOpen(true);
      await refreshInbox();
    }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível abrir a conversa.");}
    finally{setBusy(false);}
  }

  async function sendDirectMessage(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const text=directDraft.trim();
    if(!activeThread||!text)return;
    setBusy(true);
    try{
      const response=await fetch("/api/community/messages",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({artistId:activeThread.id,body:text})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Não foi possível enviar a mensagem.");
      const thread=await fetch("/api/community/messages?artistId="+encodeURIComponent(activeThread.id),{credentials:"same-origin",cache:"no-store"}).then(r=>r.json());
      if(!thread.conversation)throw new Error("A conversa já não está disponível.");
      setDirectMessages(thread.messages??[]);setDirectDraft("");await refreshInbox();
    }catch(error){setMessage(error instanceof Error?error.message:"A mensagem não foi enviada.");}
    finally{setBusy(false);}
  }

  async function toggleComments(postId:string){
    const next=!expanded[postId];setExpanded(current=>({...current,[postId]:next}));
    if(next&&!comments[postId]){
      try{
        const response=await fetch("/api/community/comments?postId="+encodeURIComponent(postId),{credentials:"same-origin",cache:"no-store"});
        const data=await response.json();if(!response.ok)throw new Error(data.error??"Comentários indisponíveis.");
        setComments(current=>({...current,[postId]:data.comments??[]}));
      }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível carregar comentários.");}
    }
  }

  async function submitComment(event:FormEvent<HTMLFormElement>,postId:string){
    event.preventDefault();
    const text=commentDrafts[postId]?.trim()??"";
    if(!text)return;
    setBusy(true);
    try{
      const response=await fetch("/api/community/comments",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({postId,body:text})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Não foi possível comentar.");
      setCommentDrafts(current=>({...current,[postId]:""}));
      const latest=await fetch("/api/community/comments?postId="+encodeURIComponent(postId),{credentials:"same-origin",cache:"no-store"}).then(r=>r.json());
      setComments(current=>({...current,[postId]:latest.comments??[]}));await refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"O comentário falhou.");}
    finally{setBusy(false);}
  }

  async function report(postId:string){
    if(!artist){setMessage("Inicia sessão para denunciar uma publicação.");return;}
    setBusy(true);
    try{
      const response=await fetch("/api/community/report",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({targetType:"post",targetId:postId,reason:"Conteúdo que merece revisão pela equipa."})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Não foi possível enviar a denúncia.");
      setMessage("Denúncia enviada à equipa de moderação.");
    }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível denunciar.");}
    finally{setBusy(false);}
  }

  return <main className="community-page">
    <header className="community-header">
      <Link className="admin-back-link" href="/">← Código Lírico</Link>
      <div className="section-kicker">08 / COMUNIDADE CRIATIVA · LUNDA SUL</div>
      <h1>As vozes encontram-se.<br/><em>As ideias circulam.</em></h1>
      <p>Um espaço de partilha para artistas aprovados: publicações, comentários, reacções, mensagens e ligações entre criadores.</p>
    </header>

    {(artist||adminViewer)?<div className="community-account-bar"><span>Sessão activa: <strong>{artist?.stageName??adminViewer?.displayName}</strong>{adminViewer?" · Administração":""}</span><div><button type="button" onClick={openInbox} disabled={busy}>Mensagens privadas · {conversations.reduce((sum,item)=>sum+item.unreadCount,0)} novas</button><button type="button" onClick={logout} disabled={busy}>Terminar sessão</button></div></div>:<form className="community-login" onSubmit={login}>
      <div><strong>Participa na comunidade</strong><p>Artistas aprovados e administradores autorizados podem interagir. A administração entra pelo painel administrativo.</p></div>
      <label>E-mail<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <label>Palavra-passe<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/></label>
      <button className="button button-light" type="submit" disabled={busy}>{busy?"A verificar…":"Entrar"}</button>
    </form>}

    {inboxOpen&&artist&&<section className="community-messages">
      <div className="community-messages-heading"><div><span className="section-kicker">ESPAÇO PRIVADO</span><h2>Mensagens</h2></div><button type="button" onClick={()=>setInboxOpen(false)}>Fechar ×</button></div>
      <div className="community-messages-layout">
        <aside className="community-inbox-list">
          <h3>Conversas recentes</h3>
          {conversations.length===0?<p className="community-no-comments">Ainda não tens conversas. Abre um perfil e escolhe «Mensagem».</p>:conversations.map(conversation=><button type="button" className={activeThread?.id===conversation.artist.id?"community-inbox-item active":"community-inbox-item"} key={conversation.id} onClick={()=>openThread(conversation.artist)}>
            <strong>{conversation.artist.stageName}</strong><span>{conversation.latestMessage?.body??"Nova conversa"}</span>{conversation.unreadCount>0&&<small>{conversation.unreadCount} por ler</small>}
          </button>)}
        </aside>
        <div className="community-thread">
          {!activeThread?<div className="community-thread-empty">Selecciona uma conversa para começar.</div>:<>
            <div className="community-thread-heading"><strong>{activeThread.stageName}</strong><span>{activeThread.municipality??"Artista aprovado"}</span></div>
            <div className="community-thread-messages">
              {directMessages.length===0?<p className="community-no-comments">Esta conversa ainda não tem mensagens.</p>:directMessages.map(item=><div className={item.isMine?"community-bubble mine":"community-bubble"} key={item.id}><p>{item.body}</p><small>{dateLabel(item.createdAt)}</small></div>)}
            </div>
            <form className="community-thread-form" onSubmit={sendDirectMessage}><input value={directDraft} onChange={e=>setDirectDraft(e.target.value)} maxLength={2000} placeholder="Escreve uma mensagem privada…" required/><button type="submit" disabled={busy}>Enviar ↗</button></form>
          </>}
        </div>
      </div>
    </section>}

    {artist&&<form className="community-composer" onSubmit={submitPost}>
      <div className="section-kicker">PARTILHA COM A COMUNIDADE</div>
      <label>Título<input value={postTitle} onChange={e=>setPostTitle(e.target.value)} maxLength={160} placeholder="Título da tua partilha"/></label>
      <textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={5000} rows={4} placeholder="O que estás a criar ou a pensar?"/>
      <div className="community-composer-tools">
        <label className="community-file-label">Anexar imagem, áudio ou vídeo<input type="file" accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/ogg,video/mp4,video/webm" onChange={e=>setFile(e.target.files?.[0]??null)}/><span>{file?file.name:"Escolher ficheiro · até 200 MB"}</span></label>
        <label className="community-visibility">Visibilidade<select value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="public">Público</option><option value="followers">Só seguidores</option></select></label>
      </div>
      <div className="community-composer-bottom"><small>As publicações passam por revisão antes de aparecerem no feed.</small><button className="button button-light" type="submit" disabled={busy}>{busy?"A enviar…":"Enviar para revisão ↗"}</button></div>
    </form>}

    <section className="community-feed">
      <div className="community-feed-heading"><div className="section-kicker">FEED DA COMUNIDADE</div><h2>Últimas partilhas</h2><p>{artist?"Também vês aqui os teus envios que aguardam revisão.":"Podes consultar as publicações públicas sem iniciar sessão."}</p></div>
      {!loaded?<p className="latest-empty">A carregar publicações…</p>:posts.length===0?<p className="latest-empty">Ainda não há publicações. Os artistas aprovados podem começar a partilhar.</p>:posts.map(post=><article className="community-post" key={post.id}>
        <PostViewTracker postId={post.id} onViewed={updatePostViews}/>
        <div className="community-post-head"><div className="community-avatar">{post.author.slice(0,2).toUpperCase()}</div><div className="community-author"><strong>{post.author}</strong><span>{post.municipality} · {post.genre}</span><small>{dateLabel(post.createdAt)} · {post.visibility==="followers"?"Seguidores":"Público"}</small></div>
          {post.status!=="approved"?<span className="community-status">{post.status==="pending"?"A aguardar revisão":post.scheduledAt?"Agendado":"Não aprovado"}</span>:(artist||adminViewer)&&!post.isMine&&<div className="community-post-author-actions"><button className="community-follow" type="button" onClick={()=>follow(post.authorId)} disabled={busy}>{post.isFollowing?"A seguir":"Seguir"}</button><button className="community-follow" type="button" onClick={()=>openThread({id:post.authorId,stageName:post.author,municipality:post.municipality,photoUrl:post.photoUrl})} disabled={busy}>Mensagem</button></div>}
        </div>
        <div className="community-content-label">{categoryLabels[post.contentType]??post.contentType}</div>
        {post.title&&<h3 className="community-post-title">{post.title}</h3>}
        {post.body&&<p className="community-post-body">{post.body}</p>}
        {post.location&&<p className="community-event-meta">{post.eventStartsAt?dateLabel(post.eventStartsAt)+" · ":""}{post.location}{post.organizer?" · "+post.organizer:""}</p>}
        {post.mediaUrl&&post.mediaType.startsWith("image/")&&<Image className="community-post-image" src={post.mediaUrl} alt={"Imagem partilhada por "+post.author} width={1200} height={900} unoptimized/>}
        {post.mediaUrl&&post.mediaType.startsWith("video/")&&<video className="community-post-video" src={post.mediaUrl} controls playsInline preload="metadata"/>}
        {post.mediaUrl&&post.mediaType.startsWith("audio/")&&<audio className="community-post-audio" src={post.mediaUrl} controls preload="metadata"/>}
        {post.ticketPrice&&<p className="community-ticket-price">Bilhete: {post.ticketPrice}</p>}
        {post.ticketUrl&&<a className="community-ticket-link" href={post.ticketUrl} target="_blank" rel="noreferrer">Bilhetes / inscrição ↗</a>}
        {post.mediaUrl&&post.status==="approved"&&<a className="download-link community-download" href={`${post.mediaUrl}${post.mediaUrl.includes("?")?"&":"?"}download=1`} target="_blank" rel="noreferrer">Descarregar anexo ↓</a>}
        {post.status==="approved"&&<div className="community-post-actions">
          <button type="button" onClick={()=>react(post.id)} disabled={busy}>{post.myReaction?"♥ Gostei":"♡ Gostar"} · {post.reactionCount}</button>
          <button type="button" onClick={()=>toggleComments(post.id)}>Comentários · {post.commentCount}</button>
          <span className="community-post-views">Visualizações · {post.viewCount}</span>
          {artist&&!post.isMine&&<button type="button" onClick={()=>report(post.id)} disabled={busy}>Denunciar</button>}
        </div>}
        {expanded[post.id]&&<div className="community-comments">
          {(comments[post.id]??[]).length===0?<p className="community-no-comments">Ainda não há comentários.</p>:(comments[post.id]??[]).map(comment=><div className="community-comment" key={comment.id}><strong>{comment.author}</strong><p>{comment.body}</p><small>{dateLabel(comment.createdAt)}</small></div>)}
          {(artist||adminViewer)&&<form className="community-comment-form" onSubmit={e=>submitComment(e,post.id)}><input value={commentDrafts[post.id]??""} onChange={e=>setCommentDrafts(current=>({...current,[post.id]:e.target.value}))} maxLength={2000} placeholder="Escreve um comentário…" required/><button type="submit" disabled={busy}>Enviar</button></form>}
        </div>}
      </article>)}
    </section>
    {message&&<p className="community-message" role="status">{message}</p>}
    <footer className="community-footer"><Link href="/">Voltar à página inicial</Link><span>Conteúdo moderado · Respeito entre criadores</span></footer>
  </main>;
}
