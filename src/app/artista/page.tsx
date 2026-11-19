"use client";

import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type Artist = { stageName: string; email: string; municipality: string; genre: string; bio: string; photoUrl: string };
type Media = { id: string; title: string; description: string; kind: string; genre: string; mediaUrl: string; mimeType: string; sizeBytes: number; status: string; createdAt: string };
const statusLabels: Record<string,string> = { pending: "A aguardar revisão", approved: "Aprovado e público", rejected: "Não aprovado" };

export default function ArtistStudioPage() {
  const [artist,setArtist]=useState<Artist|null>(null);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [items,setItems]=useState<Media[]>([]);
  const [title,setTitle]=useState("");
  const [genre,setGenre]=useState("");
  const [description,setDescription]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  const loadMedia=useCallback(async()=>{
    const response=await fetch("/api/artist/media",{credentials:"same-origin",cache:"no-store"});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error??"Não foi possível carregar os teus ficheiros.");
    setItems(data.items??[]);
  },[]);

  useEffect(()=>{
    let active=true;
    fetch("/api/artist/session",{credentials:"same-origin",cache:"no-store"})
      .then(r=>r.json()).then(async data=>{
        if(!active||!data.authenticated)return;
        setArtist(data.artist);
        try{await loadMedia()}catch(error){setMessage(error instanceof Error?error.message:"Erro ao carregar ficheiros.")}
      }).catch(()=>active&&setMessage("Não foi possível verificar a sessão."));
    return()=>{active=false};
  },[loadMedia]);

  async function login(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/artist/login",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error??"Não foi possível entrar.");
      setArtist(data.artist);setPassword("");await loadMedia();setMessage("Sessão iniciada.");
    }catch(error){setMessage(error instanceof Error?error.message:"Erro ao iniciar sessão.");}
    finally{setBusy(false);}
  }

  async function logout(){
    setBusy(true);
    try{await fetch("/api/artist/session",{method:"DELETE",credentials:"same-origin"});}
    finally{setArtist(null);setItems([]);setBusy(false);setMessage("Sessão terminada.");}
  }

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form = event.currentTarget;
    if(!file){setMessage("Escolhe primeiro um áudio ou vídeo no teu dispositivo.");return;}
    setBusy(true);setMessage("A enviar o ficheiro para armazenamento…");
    try{
      const blob=await upload(file.name,file,{access:"public",handleUploadUrl:"/api/artist/upload"});
      const response=await fetch("/api/artist/media",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        title,genre,description,mediaUrl:blob.url,mimeType:file.type,sizeBytes:file.size
      })});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error??"Não foi possível submeter o ficheiro.");
      setTitle("");setGenre("");setDescription("");setFile(null);
      form.reset();
      await loadMedia();setMessage("Ficheiro enviado. Ficará público depois da aprovação administrativa.");
    }catch(error){setMessage(error instanceof Error?error.message:"O envio falhou.");}
    finally{setBusy(false);}
  }

  async function cancelUpload(id:string){
    setBusy(true);
    try{
      const response=await fetch("/api/artist/media",{method:"DELETE",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Não foi possível cancelar.");
      await loadMedia();setMessage("Envio pendente cancelado.");
    }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível cancelar.")}
    finally{setBusy(false);}
  }

  return <main className="artist-studio-page">
    <Link className="admin-back-link" href="/">← Voltar ao Código Lírico</Link>
    <header className="artist-studio-heading"><span className="section-kicker">ESPAÇO PRIVADO DO CRIADOR</span><h1>O teu estúdio.<br/><em>A tua voz.</em></h1><p>Envia música e vídeos a partir do telemóvel ou computador. A equipa revê cada ficheiro antes de o tornar público.</p></header>
    {!artist?<form className="admin-publish-form admin-login-form" onSubmit={login}>
      <h2>Entrar como artista</h2>
      <label>E-mail da conta aprovada<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <label>Palavra-passe<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} required/></label>
      <button className="button button-light admin-submit" type="submit" disabled={busy}>{busy?"A verificar…":"Entrar no estúdio ↗"}</button>
      <p className="admin-security-note">O acesso é reservado a contas de artista aprovadas e já registadas na plataforma.</p>
    </form>:<>
      <div className="admin-session-bar"><div><strong>{artist.stageName}</strong><span>{artist.email} · {artist.municipality} · {artist.genre}</span></div><button className="button button-light" type="button" onClick={logout} disabled={busy}>Terminar sessão</button></div>
      <form className="admin-publish-form" onSubmit={submit}>
        <h2>Enviar novo trabalho</h2>
        <label>Título<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={160} required/></label>
        <label>Género / categoria<input value={genre} onChange={e=>setGenre(e.target.value)} maxLength={80} placeholder="Ex.: Rap, Trap, R&B"/></label>
        <label>Descrição<textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={4000} rows={4}/></label>
        <label>Ficheiro de áudio ou vídeo<div className="admin-file-field"><input type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/x-wav,video/mp4,video/webm" onChange={e=>setFile(e.target.files?.[0]??null)} required/><span className="admin-file-note">{file?file.name:"Escolhe um ficheiro do teu dispositivo. Máximo 200 MB."}</span></div></label>
        <button className="button button-light admin-submit" type="submit" disabled={busy}>{busy?"A processar…":"Enviar para revisão ↗"}</button>
        <p className="admin-security-note">Os ficheiros enviados ficam privados do público enquanto aguardam aprovação. Depois de aprovados, todos poderão ouvir e descarregar.</p>
      </form>
      <section className="artist-media-list"><div className="admin-list-heading"><h2>Os meus envios</h2><span>{items.length} ficheiros</span></div>
        {items.length===0?<p className="admin-security-note">Ainda não enviaste nenhum trabalho.</p>:items.map(item=><article className="admin-publication-item" key={item.id}>
          <div><span>{item.kind.toUpperCase()} · {statusLabels[item.status]??item.status}</span><h3>{item.title}</h3><p>{item.genre} · {(item.sizeBytes/1048576).toFixed(1)} MB</p></div>
          {item.status==="pending"&&<button className="admin-delete" type="button" onClick={()=>cancelUpload(item.id)} disabled={busy}>Cancelar</button>}
        </article>)}
      </section>
    </>}
    {message&&<p className="admin-form-message" role="status">{message}</p>}
  </main>;
}
