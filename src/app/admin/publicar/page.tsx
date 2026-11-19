"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type AdminUser = { displayName: string; email: string; role: string };
type Publication = {
  id: string;
  type: string;
  title: string;
  author: string;
  category: string;
  description: string;
  externalUrl: string;
  mediaUrl: string;
  imageUrl: string;
  featured: boolean;
  status: string;
  createdAt: string;
};

const types = [
  ["article", "Artigo / notícia"],
  ["music", "Música"],
  ["video", "Vídeo"],
  ["announcement", "Comunicado"],
  ["poetry", "Poesia / literatura"],
  ["event", "Evento"],
  ["opportunity", "Oportunidade"],
  ["gallery", "Galeria"],
];

export default function AdminPublishPage() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<Publication[]>([]);
  const [featured, setFeatured] = useState(false);

  const loadItems = useCallback(async () => {
    const response = await fetch("/api/admin/content", { credentials: "same-origin", cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar as publicações.");
    setItems(result.items ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.json())
      .then(async (result) => {
        if (!active || !result.authenticated) return;
        setAdmin(result.admin);
        try { await loadItems(); } catch (error) {
          setMessage(error instanceof Error ? error.message : "Erro ao carregar publicações.");
        }
      })
      .catch(() => {
        if (active) setMessage("Não foi possível verificar a sessão administrativa.");
      });
    return () => { active = false; };
  }, [loadItems]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível iniciar sessão.");
      setAdmin(result.admin);
      setPassword("");
      setMessage("Sessão iniciada com segurança.");
      await loadItems();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao iniciar sessão.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/admin/session", { method: "DELETE", credentials: "same-origin" });
    } finally {
      setAdmin(null);
      setItems([]);
      setBusy(false);
      setMessage("Sessão terminada.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload: Record<string, string | boolean> = Object.fromEntries(form.entries()) as Record<string, string>;
    payload.featured = featured;

    try {
      const response = await fetch("/api/admin/content", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível publicar.");
      formElement.reset();
      setFeatured(false);
      await loadItems();
      setMessage("Publicação criada e disponível na página inicial.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocorreu um erro ao publicar.");
    } finally {
      setBusy(false);
    }
  }

  async function removePublication(id: string) {
    if (!window.confirm("Queres mesmo apagar esta publicação?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/content", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível apagar.");
      await loadItems();
      setMessage("Publicação apagada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao apagar publicação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-publish-page">
      <Link className="admin-back-link" href="/">← Voltar ao Código Lírico</Link>
      <div className="admin-publish-heading">
        <span className="section-kicker">CENTRO DE ADMINISTRAÇÃO / CONTEÚDO</span>
        <h1>Gestão do <em>Código Lírico.</em></h1>
        <p>Publica e gere música, vídeos, artigos, comunicados, poesia, eventos, oportunidades e galerias.</p>
      </div>

      {!admin ? (
        <form className="admin-publish-form admin-login-form" onSubmit={login}>
          <h2>Iniciar sessão administrativa</h2>
          <label>E-mail
            <input name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>Palavra-passe
            <input name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} required />
          </label>
          <button className="button button-light admin-submit" type="submit" disabled={busy}>{busy ? "A verificar..." : "Entrar no painel ↗"}</button>
          <p className="admin-security-note">A sessão é protegida por cookie HttpOnly, expira ao fim de 7 dias e tem limite de tentativas de acesso.</p>
        </form>
      ) : (
        <>
          <div className="admin-session-bar">
            <div><strong>{admin.displayName}</strong><span>{admin.email} · {admin.role}</span></div>
            <button className="button button-light admin-logout" type="button" onClick={logout} disabled={busy}>Terminar sessão</button>
          </div>
          <form className="admin-publish-form" onSubmit={submit}>
            <h2>Nova publicação</h2>
            <label>Tipo de publicação
              <select name="type" defaultValue="announcement" required>
                {types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>Título
              <input name="title" maxLength={160} placeholder="Título da publicação" required />
            </label>
            <div className="admin-form-row">
              <label>Autor / artista
                <input name="artist" maxLength={120} placeholder="Por omissão, usa o nome do administrador" />
              </label>
              <label>Categoria / género
                <input name="genre" maxLength={80} placeholder="Ex.: Hip-hop, Cultura, Notícias" />
              </label>
            </div>
            <label>Descrição / conteúdo
              <textarea name="description" maxLength={12000} rows={7} placeholder="Escreve aqui o conteúdo da publicação..." required />
            </label>
            <label>Link externo (opcional)
              <input name="link" type="url" placeholder="https://..." />
            </label>
            <div className="admin-form-row">
              <label>Link do áudio ou vídeo (opcional)
                <input name="mediaUrl" type="url" placeholder="https://..." />
              </label>
              <label>Link da imagem / capa (opcional)
                <input name="imageUrl" type="url" placeholder="https://..." />
              </label>
            </div>
            <label className="admin-featured-option">
              <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
              Destacar esta publicação na plataforma
            </label>
            <button className="button button-light admin-submit" type="submit" disabled={busy}>
              {busy ? "A publicar..." : "Publicar conteúdo ↗"}
            </button>
            <p className="admin-security-note">Os ficheiros são apresentados através de links HTTPS. O armazenamento de ficheiros será ligado após a rotação do token de armazenamento actualmente sinalizado pela Vercel.</p>
          </form>

          <section className="admin-publication-list">
            <div className="admin-list-heading"><h2>Publicações recentes</h2><span>{items.length} registos</span></div>
            {items.length === 0 ? <p className="admin-security-note">Ainda não existem publicações nesta área.</p> : items.map((item) => (
              <article className="admin-publication-item" key={item.id}>
                <div><span>{item.type.toUpperCase()} · {item.status.toUpperCase()}</span><h3>{item.title}</h3><p>{item.author} · {item.category}</p></div>
                <button className="admin-delete" type="button" onClick={() => removePublication(item.id)} disabled={busy}>Apagar</button>
              </article>
            ))}
          </section>
        </>
      )}
      {message && <p className="admin-form-message" role="status">{message}</p>}
    </main>
  );
}
