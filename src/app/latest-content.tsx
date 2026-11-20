"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Publication = {
  id: string; type: string; title: string; artist: string; genre: string;
  description: string; link: string; audioUrl: string; imageUrl: string;
  ticketUrl?: string; ticketPrice?: string; location?: string; organizer?: string; eventStartsAt?: string | null;
  featured: boolean; createdAt: string;
  authorId: string | null; reactionCount: number; commentCount: number;
  myReaction: string | null; isFollowing: boolean; isMine: boolean; isAuthenticated: boolean;
};
type PublicComment = { id: string; body: string; createdAt: string; author: string; photoUrl: string };

const labels: Record<string, string> = {article:"Artigo",music:"Música",video:"Vídeo",announcement:"Anúncio",poetry:"Poesia",event:"Evento",opportunity:"Oportunidade",gallery:"Galeria",podcast:"Podcast",organization:"Organização",partnership:"Parceria",ticket:"Bilheteira",general:"Partilha"};
const filters = [["all","Tudo"],["text","Textos"],["music","Música"],["video","Vídeos"],["podcast","Podcasts"],["poetry","Poesia"],["document","Documentos"],["event","Eventos"],["article","Artigos"],["news","Notícias"],["opportunity","Oportunidades"],["announcement","Anúncios"],["gallery","Galeria"]];

function mediaKind(url: string, type: string): "audio" | "video" | "other" {
  const path = url.split(/[?#]/, 1)[0].toLowerCase();
  if (type === "video" || /\.(mp4|webm|mov|ogv)$/.test(path)) return "video";
  if (type === "music" || type === "podcast" || /\.(mp3|m4a|wav|ogg|oga|aac|flac)$/.test(path)) return "audio";
  return "other";
}

function commentDate(value: string) {
  return new Intl.DateTimeFormat("pt-AO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function LatestContent() {
  const [posts, setPosts] = useState<Publication[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, PublicComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/content", { signal: controller.signal, cache: "no-store" })
      .then(response => { if (!response.ok) throw new Error("Falha ao carregar"); return response.json() as Promise<Publication[]>; })
      .then(data => setPosts(data))
      .catch(() => setPosts([]))
      .finally(() => setLoaded(true));
    return () => controller.abort();
  }, []);

  const visiblePosts = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-AO");
    return posts.filter(p => {
      const media = mediaKind(p.audioUrl, p.type);
      const category = p.type === "announcement" && media === "audio" ? "music" : p.type === "announcement" && media === "video" ? "video" : p.type;
      const matches = filter === "all" || category === filter || (filter === "music" && category === "podcast");
      return matches && (!q || [p.title, p.artist, p.genre, p.description].join(" ").toLocaleLowerCase("pt-AO").includes(q));
    });
  }, [posts, filter, search]);

  function updatePost(postId: string, patch: Partial<Publication>) {
    setPosts(current => current.map(post => post.id === postId ? { ...post, ...patch } : post));
  }

  async function react(post: Publication) {
    if (!post.isAuthenticated) { setNotice("Para gostar de uma publicação, entra com a tua conta de artista aprovado na Comunidade."); return; }
    if (busyId) return;
    setBusyId(post.id); setNotice("");
    try {
      const response = await fetch("/api/community/react", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, reaction: "like" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível gostar desta publicação.");
      updatePost(post.id, {
        myReaction: data.active ? data.reaction : null,
        reactionCount: Math.max(0, post.reactionCount + (data.active ? 1 : -1)),
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível registar o gosto.");
    } finally { setBusyId(null); }
  }

  async function follow(post: Publication) {
    if (!post.isAuthenticated) { setNotice("Para seguir um artista, entra com a tua conta na Comunidade."); return; }
    if (!post.authorId || busyId) return;
    setBusyId(post.id); setNotice("");
    try {
      const response = await fetch("/api/community/follow", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: post.authorId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível actualizar o seguimento.");
      updatePost(post.id, { isFollowing: Boolean(data.following) });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível seguir este artista.");
    } finally { setBusyId(null); }
  }

  async function toggleComments(postId: string) {
    const next = !expandedComments[postId];
    setExpandedComments(current => ({ ...current, [postId]: next }));
    if (!next || comments[postId]) return;
    try {
      const response = await fetch("/api/community/comments?postId=" + encodeURIComponent(postId), { credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar os comentários.");
      setComments(current => ({ ...current, [postId]: data.comments ?? [] }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível carregar os comentários.");
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>, post: Publication) {
    event.preventDefault();
    const text = commentDrafts[post.id]?.trim() ?? "";
    if (!text) return;
    if (!post.isAuthenticated) { setNotice("Para comentar, entra com a tua conta de artista aprovado na Comunidade."); return; }
    if (busyId) return;
    setBusyId(post.id); setNotice("");
    try {
      const response = await fetch("/api/community/comments", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, body: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível publicar o comentário.");
      const latestResponse = await fetch("/api/community/comments?postId=" + encodeURIComponent(post.id), { credentials: "same-origin", cache: "no-store" });
      const latest = await latestResponse.json();
      if (!latestResponse.ok) throw new Error(latest.error ?? "O comentário foi enviado, mas não foi possível actualizar a lista.");
      setComments(current => ({ ...current, [post.id]: latest.comments ?? [] }));
      setCommentDrafts(current => ({ ...current, [post.id]: "" }));
      updatePost(post.id, { commentCount: post.commentCount + 1 });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível publicar o comentário.");
    } finally { setBusyId(null); }
  }

  if (!loaded || posts.length === 0) return null;

  return <section className="latest-section section-wrap" id="publicacoes">
    <div className="section-heading"><div><div className="section-kicker">ACTIVIDADE DA COMUNIDADE</div><h2>O que está a<br/><em>acontecer.</em></h2></div><p>Publicações editoriais da equipa<br/>e dos administradores do Código Lírico.</p></div>
    <div className="latest-controls"><label className="latest-search"><span className="sr-only">Pesquisar publicações</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar por título, artista ou tema…"/></label><div className="latest-filters" aria-label="Filtrar publicações">{filters.map(([v,l]) => <button className={filter === v ? "latest-filter active" : "latest-filter"} key={v} type="button" onClick={() => setFilter(v)} aria-pressed={filter === v}>{l}</button>)}</div></div>
    {notice && <p className="latest-social-notice" role="status">{notice} <Link href="/comunidade">Abrir Comunidade ↗</Link></p>}
    {visiblePosts.length === 0 ? <p className="latest-empty">Não encontrámos publicações com esse filtro. Experimenta outra pesquisa.</p> : <div className="latest-grid">{visiblePosts.map(p => <article className={p.featured ? "latest-card latest-card-featured" : "latest-card"} key={p.id}>
      <div className="latest-card-top"><span>{p.type === "announcement" && mediaKind(p.audioUrl,p.type) === "audio" ? "Música" : p.type === "announcement" && mediaKind(p.audioUrl,p.type) === "video" ? "Vídeo" : labels[p.type] ?? p.type.toUpperCase()}</span>{p.featured && <span className="latest-featured">EM DESTAQUE</span>}</div>
      {p.imageUrl && <Image className="latest-image" src={p.imageUrl} alt={p.title} width={960} height={540} unoptimized/>}
      <div className="latest-card-content"><span className="latest-category">{p.genre}</span><h3>{p.title}</h3><p className="latest-byline">Por {p.artist}</p><p className="latest-description">{p.description}</p>
      {mediaKind(p.audioUrl,p.type) === "video" && p.audioUrl && <video className="latest-video" controls preload="metadata" playsInline src={p.audioUrl}>O teu navegador não suporta vídeo.</video>}
      {mediaKind(p.audioUrl,p.type) === "audio" && p.audioUrl && <audio aria-label={"Reproduzir " + p.title} controls preload="metadata" src={p.audioUrl}>O teu navegador não suporta áudio.</audio>}
      {p.audioUrl && <a className="download-link" href={p.audioUrl + (p.audioUrl.includes("?") ? "&" : "?") + "download=1"} target="_blank" rel="noreferrer" download>Descarregar ficheiro ↗</a>}
      {p.imageUrl && <a className="download-link" href={p.imageUrl + (p.imageUrl.includes("?") ? "&" : "?") + "download=1"} target="_blank" rel="noreferrer" download>Descarregar capa ↗</a>}
      {p.eventStartsAt && <p className="latest-event-meta">{new Intl.DateTimeFormat("pt-AO",{dateStyle:"medium",timeStyle:"short"}).format(new Date(p.eventStartsAt))}{p.location ? " · " + p.location : ""}{p.organizer ? " · " + p.organizer : ""}</p>}
      {p.ticketPrice && <p className="latest-ticket-price">Bilhete: {p.ticketPrice}</p>}
      {(p.ticketUrl || p.link) && <a className="latest-ticket-link" href={p.ticketUrl || p.link} target="_blank" rel="noreferrer">Bilhetes / inscrição ↗</a>}
      <div className="latest-social-actions" aria-label="Acções da publicação">
        <button type="button" onClick={() => react(p)} disabled={busyId === p.id}>{p.myReaction ? "♥ Gostei" : "♡ Gostar"} · {p.reactionCount}</button>
        <button type="button" onClick={() => toggleComments(p.id)}>Comentar · {p.commentCount}</button>
        {p.authorId && !p.isMine && <>
          <button type="button" onClick={() => follow(p)} disabled={busyId === p.id}>{p.isFollowing ? "A seguir" : "Seguir"}</button>
          <Link href={"/comunidade?messageTo=" + encodeURIComponent(p.authorId)}>Enviar mensagem ↗</Link>
        </>}
        {!p.isAuthenticated && <Link href="/comunidade">Entrar para interagir ↗</Link>}
      </div>
      {expandedComments[p.id] && <div className="latest-social-comments">
        {(comments[p.id] ?? []).length === 0 ? <p className="community-no-comments">Ainda não há comentários.</p> : (comments[p.id] ?? []).map(comment => <div className="community-comment" key={comment.id}><strong>{comment.author}</strong><p>{comment.body}</p><small>{commentDate(comment.createdAt)}</small></div>)}
        {p.isAuthenticated ? <form className="community-comment-form" onSubmit={event => submitComment(event,p)}><input value={commentDrafts[p.id] ?? ""} onChange={event => setCommentDrafts(current => ({ ...current, [p.id]: event.target.value }))} maxLength={2000} placeholder="Escreve um comentário…" required/><button type="submit" disabled={busyId === p.id}>Enviar</button></form> : <p className="latest-social-login">Entra na <Link href="/comunidade">Comunidade</Link> com uma conta de artista aprovada para comentar.</p>}
      </div>}
      </div></article>)}</div>}
  </section>;
}
