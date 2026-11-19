"use client";

import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type AdminUser = { displayName:string; email:string; role:string };
type Publication = {
  id:string; type:string; title:string; author:string; category:string; description:string;
  externalUrl:string; mediaUrl:string; imageUrl:string; featured:boolean; status:string; createdAt:string;
};
type ArtistMedia = {
  id:string; title:string; description:string; kind:string; genre:string; mediaUrl:string;
  mimeType:string; sizeBytes:number; downloadAllowed:boolean; status:string; createdAt:string; artist:string;
};
type ArtistApplication = {
  id:string; stageName:string; fullName:string; municipality:string; genre:string; email:string;
  phone:string; bio:string; link:string; status:string; createdAt:string;
};
const types = [["article","Artigo / notícia"],["music","Música"],["video","Vídeo"],["announcement","Comunicado"],["poetry","Poesia / literatura"],["event","Evento"],["opportunity","Oportunidade"],["gallery","Galeria"]];
const statusLabels:Record<string,string>={pending:"A aguardar revisão",approved:"Aprovado e público",rejected:"Não aprovado"};
const applicationStatusLabels:Record<string,string>={pending:"Candidatura pendente",approved:"Aprovada · pode activar a conta",rejected:"Não aprovada"};

export default function AdminPublishPage() {
  const [admin,setAdmin]=useState<AdminUser|null>(null);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [items,setItems]=useState<Publication[]>([]);
  const [artistMediaItems,setArtistMediaItems]=useState<ArtistMedia[]>([]);
  const [artistApplications,setArtistApplications]=useState<ArtistApplication[]>([]);
  const [editing,setEditing]=useState<Publication|null>(null);
  const [featured,setFeatured]=useState(false);
  const [mediaFile,setMediaFile]=useState<File|null>(null);
  const [coverFile,setCoverFile]=useState<File|null>(null);

  const loadItems=useCallback(async()=>{
    const [contentResponse,mediaResponse,applicationsResponse]=await Promise.all([
      fetch("/api/admin/content",{credentials:"same-origin",cache:"no-store"}),
      fetch("/api/admin/artist-media",{credentials:"same-origin",cache:"no-store"}),
      fetch("/api/admin/artist-applications",{credentials:"same-origin",cache:"no-store"})
    ]);
    const [contentData,mediaData,applicationsData]=await Promise.all([contentResponse.json(),mediaResponse.json(),applicationsResponse.json()]);
    if(!contentResponse.ok)throw new Error(contentData.error??"Não foi possível carregar as publicações.");
    if(!mediaResponse.ok)throw new Error(mediaData.error??"Não foi possível carregar os envios dos artistas.");
    if(!applicationsResponse.ok)throw new Error(applicationsData.error??"Não foi possível carregar as candidaturas.");
    setItems(contentData.items??[]);
    setArtistMediaItems(mediaData.items??[]);
    setArtistApplications(applicationsData.items??[]);
  },[]);

  useEffect(()=>{
    let active=true;
    fetch("/api/admin/session",{credentials:"same-origin",cache:"no-store"})
      .then(r=>r.json()).then(async j=>{
        if(!active||!j.authenticated)return;
        setAdmin(j.admin);
        try{await loadItems()}catch(e){setMessage(e instanceof Error?e.message:"Erro ao carregar dados administrativos.")}
      }).catch(()=>{if(active)setMessage("Não foi possível verificar a sessão.")});
    return()=>{active=false};
  },[loadItems]);

  async function login(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMessage("");
    try{
      const r=await fetch("/api/admin/login",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const j=await r.json();if(!r.ok)throw new Error(j.error??"Não foi possível iniciar sessão.");
      setAdmin(j.admin);setPassword("");await loadItems();setMessage("Sessão iniciada.");
    }catch(e){setMessage(e instanceof Error?e.message:"Erro ao iniciar sessão.");}
    finally{setBusy(false);}
  }

  async function logout(){
    setBusy(true);
    try{await fetch("/api/admin/session",{method:"DELETE",credentials:"same-origin"});}
    finally{setAdmin(null);setItems([]);setArtistMediaItems([]);setArtistApplications([]);setEditing(null);setBusy(false);setMessage("Sessão terminada.");}
  }

  async function sendFile(file:File,kind:"media"|"cover"){
    const max=200*1024*1024;
    if(file.size>max)throw new Error("O ficheiro excede o limite de 200 MB.");
    const allowed=kind==="cover"?["image/jpeg","image/png","image/webp"]:["audio/mpeg","audio/mp4","audio/wav","audio/x-wav","video/mp4","video/webm","application/pdf","image/jpeg","image/png","image/webp"];
    if(!allowed.includes(file.type))throw new Error("Formato não permitido para este campo.");
    const blob=await upload(file.name,file,{access:"public",handleUploadUrl:"/api/admin/upload"});
    return blob.url;
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=e.currentTarget;
    setBusy(true);setMessage("A preparar a publicação…");
    const data=new FormData(form);
    try{
      let mediaUrl=String(data.get("mediaUrl")??"");
      let imageUrl=String(data.get("imageUrl")??"");
      if(coverFile){setMessage("A enviar a capa…");imageUrl=await sendFile(coverFile,"cover");}
      if(mediaFile){setMessage("A enviar o ficheiro…");mediaUrl=await sendFile(mediaFile,"media");}
      const payload={
        ...(editing?{id:editing.id}:{}),
        type:String(data.get("type")),title:String(data.get("title")),
        artist:String(data.get("artist")??""),genre:String(data.get("genre")??""),
        description:String(data.get("description")),link:String(data.get("link")??""),
        mediaUrl,imageUrl,featured,status:String(data.get("status")??"published")
      };
      const r=await fetch("/api/admin/content",{method:editing?"PUT":"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const j=await r.json();if(!r.ok)throw new Error(j.error??"Não foi possível guardar a publicação.");
      form.reset();setMediaFile(null);setCoverFile(null);setFeatured(false);setEditing(null);
      await loadItems();setMessage(editing?"Publicação actualizada.":"Publicação criada e disponível na plataforma.");
    }catch(e){setMessage(e instanceof Error?e.message:"Ocorreu um erro ao guardar.");}
    finally{setBusy(false);}
  }

  function startEditing(item:Publication){
    setEditing(item);setFeatured(item.featured);setMediaFile(null);setCoverFile(null);
    setMessage("A editar: "+item.title);
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function removePublication(id:string){
    if(!window.confirm("Queres mesmo apagar esta publicação?"))return;
    setBusy(true);
    try{
      const r=await fetch("/api/admin/content",{method:"DELETE",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
      const j=await r.json();if(!r.ok)throw new Error(j.error??"Não foi possível apagar.");
      if(editing?.id===id)setEditing(null);
      await loadItems();setMessage("Publicação apagada.");
    }catch(e){setMessage(e instanceof Error?e.message:"Erro ao apagar.");}
    finally{setBusy(false);}
  }

  async function reviewArtistFile(id:string,status:"approved"|"rejected"){
    setBusy(true);setMessage(status==="approved"?"A aprovar ficheiro…":"A rejeitar ficheiro…");
    try{
      const r=await fetch("/api/admin/artist-media",{method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})});
      const j=await r.json();if(!r.ok)throw new Error(j.error??"Não foi possível rever o ficheiro.");
      await loadItems();setMessage(status==="approved"?"Ficheiro aprovado e disponível ao público.":"Ficheiro rejeitado.");
    }catch(e){setMessage(e instanceof Error?e.message:"Erro na revisão.");}
    finally{setBusy(false);}
  }

  async function reviewArtistApplication(id:string,status:"approved"|"rejected"){
    setBusy(true);setMessage(status==="approved"?"A aprovar candidatura…":"A rejeitar candidatura…");
    try{
      const r=await fetch("/api/admin/artist-applications",{method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})});
      const j=await r.json();if(!r.ok)throw new Error(j.error??"Não foi possível rever a candidatura.");
      await loadItems();setMessage(status==="approved"?"Candidatura aprovada. O artista já pode activar a sua conta com o código que recebeu.":"Candidatura rejeitada.");
    }catch(e){setMessage(e instanceof Error?e.message:"Erro ao rever a candidatura.");}
    finally{setBusy(false);}
  }

  return <main className="admin-publish-page">
    <Link className="admin-back-link" href="/">← Voltar ao Código Lírico</Link>
    <div className="admin-publish-heading"><span className="section-kicker">CENTRO DE ADMINISTRAÇÃO / CONTEÚDO</span><h1>Gestão do <em>Código Lírico.</em></h1><p>Publica a partir do teu dispositivo, actualiza conteúdos e revê os trabalhos enviados pelos artistas.</p></div>
    {!admin?<form className="admin-publish-form admin-login-form" onSubmit={login}>
      <h2>Iniciar sessão administrativa</h2>
      <label>E-mail<input name="email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <label>Palavra-passe<input name="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} required/></label>
      <button className="button button-light admin-submit" type="submit" disabled={busy}>{busy?"A verificar…":"Entrar no painel ↗"}</button>
      <p className="admin-security-note">Acesso reservado a administradores autorizados.</p>
    </form>:<>
      <div className="admin-session-bar"><div><strong>{admin.displayName}</strong><span>{admin.email} · {admin.role}</span></div><Link className="admin-edit" href="/admin/comunidade">Moderação da comunidade ↗</Link><button className="button button-light" type="button" onClick={logout} disabled={busy}>Terminar sessão</button></div>
      <form key={editing?.id??"new-publication"} className="admin-publish-form" onSubmit={submit}>
        <h2>{editing?"Editar publicação":"Nova publicação"}</h2>
        <div className="admin-form-row">
          <label>Tipo de publicação<select name="type" defaultValue={editing?.type??"announcement"} required>{types.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <label>Título<input name="title" maxLength={160} placeholder="Título da publicação" defaultValue={editing?.title??""} required/></label>
        </div>
        <div className="admin-form-row">
          <label>Autor / artista<input name="artist" maxLength={120} placeholder="Nome do autor ou artista" defaultValue={editing?.author??""}/></label>
          <label>Categoria / género<input name="genre" maxLength={80} placeholder="Ex.: Hip-hop, Cultura, Notícias" defaultValue={editing?.category??""}/></label>
        </div>
        <label>Descrição / conteúdo<textarea name="description" maxLength={12000} rows={7} placeholder="Escreve aqui o conteúdo da publicação…" defaultValue={editing?.description??""} required/></label>
        <div className="admin-form-row">
          <label>Ficheiro principal (áudio, vídeo, PDF ou imagem)<div className="admin-file-field"><input type="file" accept="audio/*,video/mp4,video/webm,application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setMediaFile(e.target.files?.[0]??null)}/><span className="admin-file-note">{mediaFile?mediaFile.name:editing?.mediaUrl?"Ficheiro actual mantido se não escolheres outro.":"Escolhe um ficheiro guardado no teu telemóvel ou computador."} · Máximo 200 MB</span></div></label>
          <label>Capa / imagem<div className="admin-file-field"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setCoverFile(e.target.files?.[0]??null)}/><span className="admin-file-note">{coverFile?coverFile.name:editing?.imageUrl?"Capa actual mantida se não escolheres outra.":"Selecciona uma imagem JPG, PNG ou WebP."}</span></div></label>
        </div>
        <div className="admin-form-row">
          <label>Link externo (opcional)<input name="link" type="url" placeholder="https://…" defaultValue={editing?.externalUrl??""}/></label>
          <label>Link de áudio/vídeo já alojado (opcional)<input name="mediaUrl" type="url" placeholder="https://…" defaultValue={editing?.mediaUrl??""}/></label>
        </div>
        <label>Estado<select name="status" defaultValue={editing?.status??"published"}><option value="published">Publicado</option><option value="draft">Rascunho</option><option value="archived">Arquivado</option></select></label>
        <label className="admin-featured-option"><input type="checkbox" checked={featured} onChange={e=>setFeatured(e.target.checked)}/> Destacar esta publicação na plataforma</label>
        <div className="admin-form-actions"><button className="button button-light admin-submit" type="submit" disabled={busy}>{busy?"A processar…":editing?"Guardar alterações ↗":"Publicar conteúdo ↗"}</button>{editing&&<button className="admin-cancel" type="button" onClick={()=>{setEditing(null);setFeatured(false);setMediaFile(null);setCoverFile(null);setMessage("Edição cancelada.")}}>Cancelar edição</button>}</div>
        <p className="admin-security-note">Os ficheiros são enviados para armazenamento na nuvem. Os links de download ficam disponíveis aos visitantes conforme o estado publicado.</p>
      </form>

      <section className="admin-publication-list">
        <div className="admin-list-heading"><h2>Publicações recentes</h2><span>{items.length} registos</span></div>
        {items.length===0?<p className="admin-security-note">Ainda não existem publicações nesta área.</p>:items.map(item=><article className="admin-publication-item" key={item.id}>
          <div><span>{item.type.toUpperCase()} · {item.status.toUpperCase()}</span><h3>{item.title}</h3><p>{item.author} · {item.category}</p></div>
          <div className="admin-item-actions"><button className="admin-edit" type="button" onClick={()=>startEditing(item)} disabled={busy}>Editar</button><button className="admin-delete" type="button" onClick={()=>removePublication(item.id)} disabled={busy}>Apagar</button></div>
        </article>)}
      </section>

      <section className="admin-publication-list">
        <div className="admin-list-heading"><h2>Ficheiros enviados pelos artistas</h2><span>{artistMediaItems.length} registos</span></div>
        {artistMediaItems.length===0?<p className="admin-security-note">Ainda não há ficheiros submetidos por artistas.</p>:artistMediaItems.map(item=><article className="admin-publication-item" key={item.id}>
          <div><span>{item.kind.toUpperCase()} · {statusLabels[item.status]??item.status}</span><h3>{item.title}</h3><p>{item.artist} · {item.genre} · {(item.sizeBytes/1048576).toFixed(1)} MB</p><a className="download-link" href={item.mediaUrl} target="_blank" rel="noreferrer">Pré-visualizar ficheiro ↗</a></div>
          {item.status==="pending"&&<div className="admin-item-actions"><button className="admin-edit" type="button" onClick={()=>reviewArtistFile(item.id,"approved")} disabled={busy}>Aprovar</button><button className="admin-delete" type="button" onClick={()=>reviewArtistFile(item.id,"rejected")} disabled={busy}>Rejeitar</button></div>}
        </article>)}
      </section>

      <section className="admin-publication-list">
        <div className="admin-list-heading"><h2>Candidaturas de artistas</h2><span>{artistApplications.length} registos</span></div>
        {artistApplications.length===0?<p className="admin-security-note">Ainda não existem candidaturas. Os novos artistas podem candidatar-se em /artista/cadastro.</p>:artistApplications.map(item=><article className="admin-publication-item" key={item.id}>
          <div>
            <span>{applicationStatusLabels[item.status]??item.status} · {new Date(item.createdAt).toLocaleDateString("pt-AO")}</span>
            <h3>{item.stageName}</h3>
            <p>{item.fullName} · {item.municipality} · {item.genre}</p>
            <p>{item.email} · {item.phone}</p>
            <p>{item.bio}</p>
            {item.link&&<a className="download-link" href={item.link} target="_blank" rel="noreferrer">Ver portefólio ↗</a>}
          </div>
          {item.status==="pending"&&<div className="admin-item-actions"><button className="admin-edit" type="button" onClick={()=>reviewArtistApplication(item.id,"approved")} disabled={busy}>Aprovar</button><button className="admin-delete" type="button" onClick={()=>reviewArtistApplication(item.id,"rejected")} disabled={busy}>Rejeitar</button></div>}
        </article>)}
        <p className="admin-security-note">A aprovação não cria uma palavra-passe. O artista activa a própria conta com o código privado recebido ao candidatar-se.</p>
      </section>
    </>}
    {message&&<p className="admin-form-message" role="status">{message}</p>}
  </main>;
}
