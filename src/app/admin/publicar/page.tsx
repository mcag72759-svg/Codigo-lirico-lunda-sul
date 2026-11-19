"use client";

import { useState } from "react";
import type { FormEvent } from "react";

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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [featured, setFeatured] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.featured = featured ? "true" : "false";

    try {
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível publicar.");
      event.currentTarget.reset();
      setFeatured(false);
      setMessage("Publicação criada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocorreu um erro ao publicar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-publish-page">
      <a className="admin-back-link" href="/">← Voltar ao Código Lírico</a>
      <div className="admin-publish-heading">
        <span className="section-kicker">CENTRO DE ADMINISTRAÇÃO / CONTEÚDO</span>
        <h1>Publicar no <em>Código Lírico.</em></h1>
        <p>O administrador pode publicar comunicados, artigos, música, vídeos, poesia, eventos, oportunidades e galerias.</p>
      </div>
      <form className="admin-publish-form" onSubmit={submit}>
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
          <label>Link do áudio (opcional)
            <input name="audioUrl" type="url" placeholder="https://..." />
          </label>
          <label>Link da imagem (opcional)
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
        {message && <p className="admin-form-message" role="status">{message}</p>}
        <p className="admin-security-note">A publicação exige uma sessão administrativa válida e a permissão <code>content.publish</code>. Os links externos aceitam apenas HTTPS.</p>
      </form>
    </main>
  );
}
