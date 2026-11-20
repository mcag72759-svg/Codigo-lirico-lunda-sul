"use client";

import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type AdminUser = { id:string; displayName:string; email:string; role:string; permissions:string[] };
type AdminRecord = { id:string; displayName:string; email:string; role:string; permissions:string[]; active:boolean; createdAt:string };
type Publication = {
  id:string; type:string; title:string; author:string; category:string; description:string;
  externalUrl:string; mediaUrl:string; imageUrl:string; featured:boolean; status:string; createdAt:string;
  scheduledAt:string|null;eventStartsAt:string|null;location:string;organizer:string;ticketPrice:string;ticketUrl:string;
};
type PlatformPostMetric={id:string;title:string;contentType:string;status:string;createdAt:string;author:string;likes:number;comments:number;views:number};
type PlatformAnalytics={artists:number;publications:number;pending:number;likes:number;comments:number;views:number;follows:number;topPosts:PlatformPostMetric[]};
type ArtistMedia = {
  id:string; title:string; description:string; kind:string; genre:string; mediaUrl:string;
  mimeType:string; sizeBytes:number; downloadAllowed:boolean; status:string; createdAt:string; artist:string;
};
type ArtistApplication = {
  id:string; stageName:string; fullName:string; municipality:string; genre:string; email:string;
  phone:string; bio:string; link:string; status:string; createdAt:string;
};
const types = [["text","Texto simples"],["article","Artigo / notícia"],["news","Notícia"],["music","Música"],["video","Vídeo"],["podcast","Podcast"],["announcement","Anúncio"],["poetry","Poesia / literatura"],["event","Evento"],["opportunity","Oportunidade"],["gallery","Galeria"],["organization","Organização"],["partnership","Parceria"],["ticket","Bilheteira"],["document","Documento / PDF"],["course","Formação"],["livestream","Transmissão em directo"],["press_release","Comunicado"],["call_for_artists","Chamada para artistas"],["resource","Recurso"]];
const statusLabels:Record<string,string>={pending:"A aguardar revisão",approved:"Aprovado e público",rejected:"Não aprovado"};
const applicationStatusLabels:Record<string,string>={pending:"Candidatura pendente",approved:"Conta activa",rejected:"Conta suspensa / rejeitada"};
const permissionOptions=[["content.view","Consultar publicações"],["content.publish","Criar e publicar conteúdo"],["content.manage","Editar e remover conteúdo"],["artists.view","Consultar contas de artistas"],["artists.review","Aprovar e rejeitar artistas e ficheiros"],["artists.manage","Suspender e remover contas"],["community.moderate","Moderar, retirar e remover publicações"],["analytics.view","Consultar estatísticas"],["administrators.manage","Gerir administradores e permissões"]];
const rolePresets:Record<string,string[]>={publisher:["content.view","content.publish"],editor:["content.view","content.publish","content.manage"],artist_moderator:["artists.view","artists.review","artists.manage"],community_moderator:["community.moderate"],analyst:["analytics.view"],platform_manager:["content.view","content.publish","content.manage","artists.view","artists.review","artists.manage","community.moderate","analytics.view"]};
const roleLabels:Record<string,string>={publisher:"Publicador",editor:"Editor de conteúdo",artist_moderator:"Gestor de artistas",community_moderator:"Moderador da comunidade",analyst:"Analista",platform_manager:"Gestor da plataforma"};

export default function AdminPublishPage() {
  const [admin,setAdmin]=useState<AdminUser|null>(null);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [items,setItems]=useState<Publication[]>([]);
  const [artistMediaItems,setArtistMediaItems]=useState<ArtistMedia[]>([]);
  const [artistApplications,setArtistApplications]=useState<ArtistApplication[]>([]);
  const [administrators,setAdministrators]=useState<AdminRecord[]>([]);
  const [newAdminName,setNewAdminName]=useState("");
  const [newAdminEmail,setNewAdminEmail]=useState("");
  const [newAdminRole,setNewAdminRole]=useState("publisher");
  const [newAdminPermissions,setNewAdminPermissions]=useState<string[]>(rolePresets.publisher);
  const [createdAdminSecret,setCreatedAdminSecret]=useState<{email:string;password:string}|null>(null);
  const [analytics,setAnalytics]=useState<PlatformAnalytics|null>(null);
  const [editing,setEditing]=useState<Publication|null>(null);
  const [featured,setFeatured]=useState(false);
  const [mediaFile,setMediaFile]=useState<File|null>(null);
  const [coverFile,setCoverFile]=useState<File|null>(null);

  const loadItems=useCallback(async()=>{
    const [contentResponse,mediaResponse,applicationsResponse,analyticsResponse,administratorsResponse]=await Promise.all([
      fetch("/api/admin/content",{credentials:"same-origin",cache:"no-store"}),
      fetch("/api/admin/artist-media",{credentials:"same-origin",cache:"no-store"}),
      fetch("/api/admin/artist-applications",{credentials:"same-origin",cache:"no-store"}),
      fetch("/api/admin/analytics",{credentials:"same-origin",cache:"no-store"}),
      fetch("/api/admin/administrators",{credentials:"same-origin",cache:"no-store"})
    ]);
    const [contentData,mediaData,applicationsData,analyticsData]=await Promise.all([contentResponse.json(),mediaResponse.json(),applicationsResponse.json(),analyticsResponse.json()]);
    setItems(contentResponse.ok?(contentData.items??[]):[]);
    setArtistMediaItems(mediaResponse.ok?(mediaData.items??[]):[]);
    setArtistApplications(applicationsResponse.ok?(applicationsData.items??[]):[]);
    setAnalytics(analyticsResponse.ok?analyticsData:null);
    setAdministrators(administratorsResponse.ok?(await administratorsResponse.json()).items??[]:[]);
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
    finally{setAdmin(null);setItems([]);setArtistMediaItems([]);setArtistApplications([]);setAdministrators([]);setAnalytics(null);setEditing(null);setCreatedAdminSecret(null);setBusy(false);setMessage("Sessão terminada.");}
  }

  async function sendFile(file:File,kind:"media"|"cover"){
    const max=200*1024*1024;
    if(file.size>max)throw new Error("O ficheiro excede o limite de 200 MB.");
    const allowed=kind==="cover"?["image/jpeg","image/png","image/webp"]:["audio/mpeg","audio/mp4","audio/wav","audio/x-wav","video/mp4","video/webm","application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","image/jpeg","image/png","image/webp"];
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
        mediaUrl,imageUrl,featured,status:String(data.get("status")??"published"),
        scheduledAt:data.get("scheduledAt")?new Date(String(data.get("scheduledAt"))).toISOString():"",eventStartsAt:data.get("eventStartsAt")?new Date(String(data.get("eventStartsAt"))).toISOString():"",
        location:String(data.get("location")??""),organizer:String(data.get("organizer")??""),
        ticketPrice:String(data.get("ticketPrice")??""),ticketUrl:String(data.get("ticketUrl")??"")
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

  async function reviewArtistApplication(id:string,status:"approved"|"rejected"|"pending"){
    setBusy(true);setMessage(status==="approved"?"A aprovar conta…":status==="pending"?"A devolver para revisão…":"A suspender conta…");
    try{
      const r=await fetch("/api/admin/artist-applications",{method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})});
      const j=await r.json();if(!r.ok)throw new Error(j.error??"Não foi possível rever a candidatura.");
      await loadItems();setMessage(status==="approved"?"Conta aprovada. O artista pode entrar novamente.":status==="pending"?"Conta devolvida para revisão.":"Conta suspensa; as sessões existentes foram invalidadas.");
    }catch(e){setMessage(e instanceof Error?e.message:"Erro ao rever a candidatura.");}
    finally{setBusy(false);}
  }

  async function removeArtistApplication(item:ArtistApplication){
    if(!window.confirm("Remover permanentemente a conta de "+item.stageName+"? Os ficheiros, publicações, comentários e conversas ligados a esta conta também serão removidos."))return;
    setBusy(true);
    try{
      const r=await fetch("/api/admin/artist-applications",{method:"DELETE",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id})});
      const j=await r.json();if(!r.ok)throw new Error(j.error??"Não foi possível remover a conta.");
      await loadItems();setMessage("Conta de artista removida.");
    }catch(e){setMessage(e instanceof Error?e.message:"Erro ao remover a conta.");}
    finally{setBusy(false);}
  }

  async function removeArtistMedia(id:string){
    if(!window.confirm("Remover permanentemente este ficheiro enviado pelo artista?"))return;
    setBusy(true);
    try{
      const r=await fetch("/api/admin/artist-media",{method:"DELETE",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
      const j=await r.json();if(!r.ok)throw new Error(j.error??"Não foi possível remover o ficheiro.");
      await loadItems();setMessage("Ficheiro removido.");
    }catch(e){setMessage(e instanceof Error?e.message:"Erro ao remover o ficheiro.");}
    finally{setBusy(false);}
  }

  async function createAdministrator(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage("");setCreatedAdminSecret(null);
    try{
      const r=await fetch("/api/admin/administrators",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({displayName:newAdminName,email:newAdminEmail,role:newAdminRole,permissions:newAdminPermissions})});
      const j=await r.json();if(!r.ok)throw new Error(j.error??"Não foi possível criar o administrador.");
      setCreatedAdminSecret({email:j.administrator.email,password:j.temporaryPassword});
      setNewAdminName("");setNewAdminEmail("");
      await loadItems();setMessage("Administrador criado. Guarda a palavra-passe temporária apresentada abaixo.");
    }catch(e){setMessage(e instanceof Error?e.message:"Erro ao criar administrador.");}
    finally{setBusy(false);}
  }

  async function updateAdministrator(item:AdminRecord,patch:{role?:string;permissions?:string[];active?:boolean}){
    setBusy(true);
    try{
      const r=await fetch("/api/admin/administrators",{method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,...patch})});
      const j=await r.json();if(!r.ok)throw new Error(j.error??"Não foi possível actualizar o administrador.");
      await loadItems();setMessage("Permissões do administrador actualizadas.");
    }catch(e){setMessage(e instanceof Error?e.message:"Erro ao actualizar administrador.");}
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
      <div className="admin-session-bar"><div><strong>{admin.displayName}</strong><span>{admin.email} · {admin.role}</span></div>{(admin.permissions.includes("*")||admin.permissions.includes("community.moderate")||admin.permissions.includes("content.manage"))&&<Link className="admin-edit" href="/admin/comunidade">Moderação da comunidade ↗</Link>}<button className="button button-light" type="button" onClick={logout} disabled={busy}>Terminar sessão</button></div>
      {analytics&&(admin.permissions.includes("*")||admin.permissions.includes("analytics.view")||admin.permissions.includes("content.manage"))&&<section className="admin-engagement-overview"><div><span>ARTISTAS</span><strong>{analytics.artists}</strong></div><div><span>PUBLICAÇÕES</span><strong>{analytics.publications}</strong></div><div><span>GOSTOS</span><strong>{analytics.likes}</strong></div><div><span>COMENTÁRIOS</span><strong>{analytics.comments}</strong></div><div><span>VISUALIZAÇÕES ÚNICAS</span><strong>{analytics.views}</strong></div><div><span>SEGUIMENTOS</span><strong>{analytics.follows}</strong></div><div><span>POR APROVAR</span><strong>{analytics.pending}</strong></div></section>}
      {analytics&&(admin.permissions.includes("*")||admin.permissions.includes("analytics.view")||admin.permissions.includes("content.manage"))&&<section className="admin-publication-list admin-engagement-list">
        <div className="admin-list-heading"><h2>Desempenho das publicações dos artistas</h2><span>Últimas {analytics.topPosts.length}</span></div>
        {analytics.topPosts.length===0?<p className="admin-security-note">Ainda não há publicações de artistas para analisar.</p>:analytics.topPosts.map(post=><article className="admin-publication-item" key={post.id}>
          <div><span>{post.contentType.toUpperCase()} · {post.status.toUpperCase()}</span><h3>{post.title||"Publicação sem título"}</h3><p>Por {post.author} · {new Date(post.createdAt).toLocaleDateString("pt-AO")}</p></div>
          <div className="admin-engagement-metrics"><span>♡ {post.likes}</span><span>◌ {post.comments}</span><span>◉ {post.views}</span></div>
        </article>)}
      </section>}
      {(admin.permissions.includes("*")||admin.permissions.includes("content.publish")||admin.permissions.includes("content.manage"))&&<form key={editing?.id??"new-publication"} className="admin-publish-form" onSubmit={submit}>
        <h2>{editing?"Editar publicação":"Nova publicação"}</h2>
        <div className="admin-form-row">
          <label>Tipo de publicação<select name="type" defaultValue={editing?.type??"announcement"} required>{types.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <label>Título<input name="title" maxLength={160} placeholder="Título da publicação (opcional em texto simples)" defaultValue={editing?.title??""}/></label>
        </div>
        <div className="admin-form-row">
          <label>Autor / artista<input name="artist" maxLength={120} placeholder="Nome do autor ou artista" defaultValue={editing?.author??""}/></label>
          <label>Categoria / género<input name="genre" maxLength={80} placeholder="Ex.: Hip-hop, Cultura, Notícias" defaultValue={editing?.category??""}/></label>
        </div>
        <label>Descrição / conteúdo<textarea name="description" maxLength={12000} rows={7} placeholder="Escreve aqui o conteúdo da publicação…" defaultValue={editing?.description??""} required/></label>
        <div className="admin-form-row">
          <label>Ficheiro principal (áudio, vídeo, imagem ou documento)<div className="admin-file-field"><input type="file" accept="audio/*,video/mp4,video/webm,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/jpeg,image/png,image/webp" onChange={e=>setMediaFile(e.target.files?.[0]??null)}/><span className="admin-file-note">{mediaFile?mediaFile.name:editing?.mediaUrl?"Ficheiro actual mantido se não escolheres outro.":"Escolhe um ficheiro do telemóvel: áudio, vídeo, imagem, PDF ou documento."} · Máximo 200 MB</span></div></label>
          <label>Capa / imagem<div className="admin-file-field"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setCoverFile(e.target.files?.[0]??null)}/><span className="admin-file-note">{coverFile?coverFile.name:editing?.imageUrl?"Capa actual mantida se não escolheres outra.":"Selecciona uma imagem JPG, PNG ou WebP."}</span></div></label>
        </div>
        <div className="admin-form-row">
          <label>Link externo (opcional)<input name="link" type="url" placeholder="https://…" defaultValue={editing?.externalUrl??""}/></label>
          <label>Link de áudio/vídeo já alojado (opcional)<input name="mediaUrl" type="url" placeholder="https://…" defaultValue={editing?.mediaUrl??""}/></label>
        </div>
        <div className="admin-form-row">
          <label>Data e hora do evento<input name="eventStartsAt" type="datetime-local" defaultValue={editing?.eventStartsAt?new Date(editing.eventStartsAt).toISOString().slice(0,16):""}/></label>
          <label>Local / recinto<input name="location" maxLength={180} placeholder="Cidade ou espaço" defaultValue={editing?.location??""}/></label>
        </div>
        <div className="admin-form-row">
          <label>Organização responsável<input name="organizer" maxLength={160} defaultValue={editing?.organizer??""} placeholder="Organizador / parceiro"/></label>
          <label>Preço do bilhete<input name="ticketPrice" maxLength={60} defaultValue={editing?.ticketPrice??""} placeholder="Ex.: 2.500 Kz ou Gratuito"/></label>
        </div>
        <label>Ligação para bilhetes / vendas (HTTPS)<input name="ticketUrl" type="url" placeholder="https://…" defaultValue={editing?.ticketUrl??""}/></label>
        <div className="admin-form-row">
          <label>Agendar publicação<input name="scheduledAt" type="datetime-local" defaultValue={editing?.scheduledAt?new Date(editing.scheduledAt).toISOString().slice(0,16):""}/></label>
          <label>Estado<select name="status" defaultValue={editing?.status??"published"}><option value="published">Publicar agora</option><option value="scheduled">Agendar publicação</option><option value="draft">Rascunho</option><option value="archived">Arquivado</option></select></label>
        </div>
        <label className="admin-featured-option"><input type="checkbox" checked={featured} onChange={e=>setFeatured(e.target.checked)}/> Destacar esta publicação na plataforma</label>
        <div className="admin-form-actions"><button className="button button-light admin-submit" type="submit" disabled={busy}>{busy?"A processar…":editing?"Guardar alterações ↗":"Publicar conteúdo ↗"}</button>{editing&&<button className="admin-cancel" type="button" onClick={()=>{setEditing(null);setFeatured(false);setMediaFile(null);setCoverFile(null);setMessage("Edição cancelada.")}}>Cancelar edição</button>}</div>
        <p className="admin-security-note">Os ficheiros são enviados para armazenamento na nuvem. Os links de download ficam disponíveis aos visitantes conforme o estado publicado.</p>
      </form>}

      {(admin.permissions.includes("*")||admin.permissions.includes("content.view")||admin.permissions.includes("content.manage"))&&<section className="admin-publication-list">
        <div className="admin-list-heading"><h2>Publicações recentes</h2><span>{items.length} registos</span></div>
        {items.length===0?<p className="admin-security-note">Ainda não existem publicações nesta área.</p>:items.map(item=><article className="admin-publication-item" key={item.id}>
          <div><span>{item.type.toUpperCase()} · {item.status.toUpperCase()}</span><h3>{item.title}</h3><p>{item.author} · {item.category}</p>{item.status==="scheduled"&&item.scheduledAt&&<p>Agendado para {new Date(item.scheduledAt).toLocaleString("pt-AO")}</p>}{item.ticketPrice&&<p>Bilhete: {item.ticketPrice}</p>}</div>
          <div className="admin-item-actions">{(admin.permissions.includes("*")||admin.permissions.includes("content.manage"))&&<><button className="admin-edit" type="button" onClick={()=>startEditing(item)} disabled={busy}>Editar</button><button className="admin-delete" type="button" onClick={()=>removePublication(item.id)} disabled={busy}>Apagar</button></>}</div>
        </article>)}
      </section>}

      {(admin.permissions.includes("*")||admin.permissions.includes("artists.view")||admin.permissions.includes("artists.review")||admin.permissions.includes("artists.manage")||admin.permissions.includes("content.manage"))&&<section className="admin-publication-list">
        <div className="admin-list-heading"><h2>Ficheiros enviados pelos artistas</h2><span>{artistMediaItems.length} registos</span></div>
        {artistMediaItems.length===0?<p className="admin-security-note">Ainda não há ficheiros submetidos por artistas.</p>:artistMediaItems.map(item=><article className="admin-publication-item" key={item.id}>
          <div><span>{item.kind.toUpperCase()} · {statusLabels[item.status]??item.status}</span><h3>{item.title}</h3><p>{item.artist} · {item.genre} · {(item.sizeBytes/1048576).toFixed(1)} MB</p><a className="download-link" href={item.mediaUrl} target="_blank" rel="noreferrer">Pré-visualizar ficheiro ↗</a></div>
          <div className="admin-item-actions">{(admin.permissions.includes("*")||admin.permissions.includes("artists.review")||admin.permissions.includes("artists.manage")||admin.permissions.includes("content.manage"))&&<>{item.status!=="approved"&&<button className="admin-edit" type="button" onClick={()=>reviewArtistFile(item.id,"approved")} disabled={busy}>Aprovar / restaurar</button>}{item.status==="approved"&&<button className="admin-delete" type="button" onClick={()=>reviewArtistFile(item.id,"rejected")} disabled={busy}>Retirar</button>}</>}{(admin.permissions.includes("*")||admin.permissions.includes("artists.manage")||admin.permissions.includes("content.manage"))&&<button className="admin-delete" type="button" onClick={()=>removeArtistMedia(item.id)} disabled={busy}>Apagar</button>}</div>
        </article>)}
      </section>}

      {(admin.permissions.includes("*")||admin.permissions.includes("artists.view")||admin.permissions.includes("artists.review")||admin.permissions.includes("artists.manage")||admin.permissions.includes("content.manage"))&&<section className="admin-publication-list">
        <div className="admin-list-heading"><h2>Contas e candidaturas de artistas</h2><span>{artistApplications.length} registos</span></div>
        {artistApplications.length===0?<p className="admin-security-note">Ainda não existem candidaturas. Os novos artistas podem candidatar-se em /artista/cadastro.</p>:artistApplications.map(item=><article className="admin-publication-item" key={item.id}>
          <div>
            <span>{applicationStatusLabels[item.status]??item.status} · {new Date(item.createdAt).toLocaleDateString("pt-AO")}</span>
            <h3>{item.stageName}</h3>
            <p>{item.fullName} · {item.municipality} · {item.genre}</p>
            <p>{item.email} · {item.phone}</p>
            <p>{item.bio}</p>
            {item.link&&<a className="download-link" href={item.link} target="_blank" rel="noreferrer">Ver portefólio ↗</a>}
          </div>
          <div className="admin-item-actions">{(admin.permissions.includes("*")||admin.permissions.includes("artists.review")||admin.permissions.includes("artists.manage")||admin.permissions.includes("content.manage"))&&<>{item.status!=="approved"&&<button className="admin-edit" type="button" onClick={()=>reviewArtistApplication(item.id,"approved")} disabled={busy}>Aprovar / reactivar</button>}{item.status==="pending"&&<button className="admin-delete" type="button" onClick={()=>reviewArtistApplication(item.id,"rejected")} disabled={busy}>Rejeitar</button>}{item.status==="approved"&&<button className="admin-delete" type="button" onClick={()=>reviewArtistApplication(item.id,"rejected")} disabled={busy}>Suspender</button>}{item.status==="rejected"&&<button className="admin-edit" type="button" onClick={()=>reviewArtistApplication(item.id,"pending")} disabled={busy}>Devolver à revisão</button>}</>}{(admin.permissions.includes("*")||admin.permissions.includes("artists.manage")||admin.permissions.includes("content.manage"))&&<button className="admin-delete" type="button" onClick={()=>removeArtistApplication(item)} disabled={busy}>Remover conta</button>}</div>
        </article>)}
        <p className="admin-security-note">A aprovação não cria uma palavra-passe. O artista activa a própria conta com o código privado recebido ao candidatar-se.</p>
      </section>}

      {(admin.permissions.includes("*")||admin.permissions.includes("administrators.manage"))&&<section className="admin-publication-list">
        <div className="admin-list-heading"><h2>Administradores e permissões</h2><span>{administrators.length} contas</span></div>
        <p className="admin-security-note">Cria contas de equipa com permissões específicas. A palavra-passe temporária só aparece uma vez; entrega-a directamente à pessoa autorizada.</p>
        <form className="admin-publish-form" onSubmit={createAdministrator}>
          <h3>Novo administrador</h3>
          <div className="admin-form-row"><label>Nome<input value={newAdminName} onChange={e=>setNewAdminName(e.target.value)} maxLength={100} required/></label><label>E-mail<input type="email" value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} maxLength={254} required/></label></div>
          <label>Função<select value={newAdminRole} onChange={e=>{setNewAdminRole(e.target.value);setNewAdminPermissions(rolePresets[e.target.value]??[])}}>{Object.entries(roleLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <div><strong>Permissões específicas</strong><div className="admin-permission-grid">{permissionOptions.map(([value,label])=><label className="admin-permission-option" key={value}><input type="checkbox" checked={newAdminPermissions.includes(value)} onChange={e=>setNewAdminPermissions(current=>e.target.checked?[...current,value]:current.filter(item=>item!==value))}/><span>{label}</span></label>)}</div></div>
          <button className="button button-light admin-submit" type="submit" disabled={busy||newAdminPermissions.length===0}>Criar conta administrativa ↗</button>
        </form>
        {createdAdminSecret&&<div className="admin-created-secret"><strong>Credenciais temporárias — guardar agora</strong><p>{createdAdminSecret.email}</p><code>{createdAdminSecret.password}</code><button className="admin-edit" type="button" onClick={()=>navigator.clipboard?.writeText(createdAdminSecret.password)}>Copiar palavra-passe</button></div>}
        {administrators.map(item=><article className="admin-publication-item" key={item.id}><div><span>{item.active?"ACTIVO":"SUSPENSO"} · {roleLabels[item.role]??item.role}</span><h3>{item.displayName}</h3><p>{item.email}</p><div className="admin-account-permissions">{item.permissions.map(permission=><span key={permission}>{permission==="*"?"ACESSO TOTAL":permission}</span>)}</div></div><div className="admin-item-actions">{item.id!==admin.id&&!item.permissions.includes("*")&&<><select aria-label={"Função de "+item.displayName} value={item.role} onChange={e=>updateAdministrator(item,{role:e.target.value,permissions:rolePresets[e.target.value]??[]})}>{Object.entries(roleLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><button className={item.active?"admin-delete":"admin-edit"} type="button" disabled={busy} onClick={()=>updateAdministrator(item,{active:!item.active})}>{item.active?"Suspender acesso":"Reactivar acesso"}</button></>}</div></article>)}
      </section>}
    </>}
    {message&&<p className="admin-form-message" role="status">{message}</p>}
  </main>;
}
