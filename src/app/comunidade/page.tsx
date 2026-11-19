"use client";

import Link from "next/link";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type Artist={stageName:string;applicationId:string};
type Post={
  id:string;authorId:string;body:string;mediaUrl:string;mediaType:string;visibility:string;
  status:string;createdAt:string;author:string;municipality:string;genre:string;photoUrl:string;
  reactionCount:number;commentCount:number;myReaction:string|null;isMine:boolean;isFollowing:boolean;
};
type Comment={id:string;body:string;createdAt:string;authorId:string;author:string;photoUrl:string};
const dateLabel=(raw:string)=>new Intl.DateTimeFormat("pt-AO",{dateStyle:"medium",timeStyle:"short"}).format(new Date(raw));

export default function CommunityPage(){
  const [artist,setArtist]=useState<Artist|null>(null);
  const [posts,setPosts]=useState<Post[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [body,setBody]=useState("");
  const [visibility,setVisibility]=useState("public");
  const [file,setFile]=useState<File|null>(null);
  const [comments,setComments]=useState<Record<string,Comment[]>>({});
  const [commentDrafts,setCommentDrafts]=useState<Record<string,string>>({});
  const [expanded,setExpanded]=useState<Record<string,boolean>>({});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  const refresh=useCallback(async()=>{
    const response=await fetch("/api/community/feed",{credentials:"same-origin",cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error??"Não foi possível carregar a comunidade.");
    setArtist(data.artist??null);
    setPosts(data.posts??[]);
  },[]);

  useEffect(()=>{
    let active=true;
    fetch("/api/community/feed",{credentials:"same-origin",cache:"no-store"})
      .then(response=>response.json().then(data=>({response,data})))
      .then(({response,data})=>{
        if(!active)return;
        if(!response.ok)throw new Error(data.error??"Não foi possível carregar a comunidade.");
        setArtist(data.artist??null);setPosts(data.posts??[]);
      })
      .catch(error=>{if(active)setMessage(error instanceof Error?error.message:"Erro ao carregar a comunidade.")})
      .finally(()=>{if(active)setLoaded(true)});
    return()=>{active=false};
  },[]);

  async function login(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/artist/login",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Não foi possível iniciar sessão.");
      setPassword("");await refresh();setMessage("Sessão iniciada. Já podes participar na comunidade.");
    }catch(error){setMessage(error instanceof Error?error.message:"Erro ao entrar.")}
    finally{setBusy(false);}
  }

  async function logout(){
    setBusy(true);
    try{await fetch("/api/artist/session",{method:"DELETE",credentials:"same-origin"});setArtist(null);setComments({});setMessage("Sessão terminada.");}
    finally{setBusy(false);}
    await refresh().catch(()=>{});
  }

  async function submitPost(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!body.trim()&&!file){setMessage("Escreve uma mensagem ou escolhe um ficheiro.");return;}
    setBusy(true);setMessage("A preparar a publicação…");
    try{
      let mediaUrl="";let mediaType="none";let sizeBytes=0;
      if(file){
        const allowed=["image/jpeg","image/png","image/webp","audio/mpeg","audio/mp4","audio/wav","audio/x-wav","video/mp4","video/webm"];
        if(!allowed.includes(file.type))throw new Error("Formato não permitido. Usa imagem, áudio ou vídeo.");
        if(file.size>200*1024*1024)throw new Error("O ficheiro ultrapassa 200 MB.");
        const blob=await upload(file.name,file,{access:"public",handleUploadUrl:"/api/artist/upload"});
        mediaUrl=blob.url;mediaType=file.type;sizeBytes=file.size;
      }
      const response=await fetch("/api/community/posts",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:body.trim(),mediaUrl,mediaType,sizeBytes,visibility})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Não foi possível enviar a publicação.");
      setBody("");setFile(null);setVisibility("public");
      const form=event.currentTarget;form.reset();
      await refresh();setMessage("Publicação enviada para revisão. Aparecerá no feed depois da aprovação.");
    }catch(error){setMessage(error instanceof Error?error.message:"O envio falhou.");}
    finally{setBusy(false);}
  }

  async function react(postId:string){
    if(!artist){setMessage("Inicia sessão como artista aprovado para reagir.");return;}
    setBusy(true);
    try{
      const response=await fetch("/api/community/react",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({postId,reaction:"like"})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Não foi possível reagir.");
      await refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"A reacção falhou.");}
    finally{setBusy(false);}
  }

  async function follow(artistId:string){
    if(!artist){setMessage("Inicia sessão como artista aprovado para seguir perfis.");return;}
    setBusy(true);
    try{
      const response=await fetch("/api/community/follow",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({artistId})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Não foi possível actualizar o seguimento.");
      await refresh();setMessage(data.following?"Agora estás a seguir este artista.":"Deixaste de seguir este artista.");
    }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível seguir o perfil.");}
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
      setComments(current=>({...current,[postId]:latest.comments??[]}));
      await refresh();
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
      <p>Um espaço de partilha para artistas aprovados: publicações, comentários, reacções e ligações entre criadores.</p>
    </header>

    {artist?<div className="community-account-bar"><span>Sessão activa: <strong>{artist.stageName}</strong></span><button type="button" onClick={logout} disabled={busy}>Terminar sessão</button></div>:<form className="community-login" onSubmit={login}>
      <div><strong>Participa na comunidade</strong><p>O acesso é reservado a contas de artista já aprovadas.</p></div>
      <label>E-mail<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <label>Palavra-passe<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/></label>
      <button className="button button-light" type="submit" disabled={busy}>{busy?"A verificar…":"Entrar"}</button>
    </form>}

    {artist&&<form className="community-composer" onSubmit={submitPost}>
      <div className="section-kicker">PARTILHA COM A COMUNIDADE</div>
      <textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={3000} rows={4} placeholder="O que estás a criar ou a pensar?"/>
      <div className="community-composer-tools">
        <label className="community-file-label">Anexar imagem, áudio ou vídeo<input type="file" accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,video/mp4,video/webm" onChange={e=>setFile(e.target.files?.[0]??null)}/><span>{file?file.name:"Escolher ficheiro · até 200 MB"}</span></label>
        <label className="community-visibility">Visibilidade<select value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="public">Público</option><option value="followers">Só seguidores</option></select></label>
      </div>
      <div className="community-composer-bottom"><small>As publicações passam por revisão antes de aparecerem no feed.</small><button className="button button-light" type="submit" disabled={busy}>{busy?"A enviar…":"Enviar para revisão ↗"}</button></div>
    </form>}

    <section className="community-feed">
      <div className="community-feed-heading"><div className="section-kicker">FEED DA COMUNIDADE</div><h2>Últimas partilhas</h2><p>{artist?"Também vês aqui os teus envios que aguardam revisão.":"Podes consultar as publicações públicas sem iniciar sessão."}</p></div>
      {!loaded?<p className="latest-empty">A carregar publicações…</p>:posts.length===0?<p className="latest-empty">Ainda não há publicações. Os artistas aprovados podem começar a partilhar.</p>:posts.map(post=><article className="community-post" key={post.id}>
        <div className="community-post-head"><div className="community-avatar">{post.author.slice(0,2).toUpperCase()}</div><div className="community-author"><strong>{post.author}</strong><span>{post.municipality} · {post.genre}</span><small>{dateLabel(post.createdAt)} · {post.visibility==="followers"?"Seguidores":"Público"}</small></div>
          {post.status!=="approved"?<span className="community-status">{post.status==="pending"?"A aguardar revisão":"Não aprovado"}</span>:artist&&!post.isMine&&<button className="community-follow" type="button" onClick={()=>follow(post.authorId)} disabled={busy}>{post.isFollowing?"A seguir":"Seguir"}</button>}
        </div>
        {post.body&&<p className="community-post-body">{post.body}</p>}
        {post.mediaUrl&&post.mediaType.startsWith("image/")&&<Image className="community-post-image" src={post.mediaUrl} alt={"Imagem partilhada por "+post.author} width={1200} height={900} unoptimized/>}
        {post.mediaUrl&&post.mediaType.startsWith("video/")&&<video className="community-post-video" src={post.mediaUrl} controls playsInline preload="metadata"/>}
        {post.mediaUrl&&post.mediaType.startsWith("audio/")&&<audio className="community-post-audio" src={post.mediaUrl} controls preload="none"/>}
        {post.mediaUrl&&post.status==="approved"&&<a className="download-link community-download" href={`${post.mediaUrl}${post.mediaUrl.includes("?")?"&":"?"}download=1`} target="_blank" rel="noreferrer">Descarregar anexo ↓</a>}
        {post.status==="approved"&&<div className="community-post-actions">
          <button type="button" onClick={()=>react(post.id)} disabled={busy}>{post.myReaction?"♥ Gostei":"♡ Gostar"} · {post.reactionCount}</button>
          <button type="button" onClick={()=>toggleComments(post.id)}>Comentários · {post.commentCount}</button>
          {artist&&!post.isMine&&<button type="button" onClick={()=>report(post.id)} disabled={busy}>Denunciar</button>}
        </div>}
        {expanded[post.id]&&<div className="community-comments">
          {(comments[post.id]??[]).length===0?<p className="community-no-comments">Ainda não há comentários.</p>:(comments[post.id]??[]).map(comment=><div className="community-comment" key={comment.id}><strong>{comment.author}</strong><p>{comment.body}</p><small>{dateLabel(comment.createdAt)}</small></div>)}
          {artist&&<form className="community-comment-form" onSubmit={e=>submitComment(e,post.id)}><input value={commentDrafts[post.id]??""} onChange={e=>setCommentDrafts(current=>({...current,[post.id]:e.target.value}))} maxLength={2000} placeholder="Escreve um comentário…" required/><button type="submit" disabled={busy}>Enviar</button></form>}
        </div>}
      </article>)}
    </section>
    {message&&<p className="community-message" role="status">{message}</p>}
    <footer className="community-footer"><Link href="/">Voltar à página inicial</Link><span>Conteúdo moderado · Respeito entre criadores</span></footer>
  </main>;
}
