"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Publication = {
  id: string;
  type: string;
  title: string;
  artist: string;
  genre: string;
  description: string;
  link: string;
  audioUrl: string;
  imageUrl: string;
  featured: boolean;
  createdAt: string;
};

const labels: Record<string, string> = {
  article: "Artigo",
  music: "Música",
  video: "Vídeo",
  announcement: "Comunicado",
  poetry: "Poesia",
  event: "Evento",
  opportunity: "Oportunidade",
  gallery: "Galeria",
  podcast: "Podcast",
};

const filters = [
  ["all", "Tudo"],
  ["music", "Música"],
  ["video", "Vídeos"],
  ["article", "Artigos"],
  ["event", "Eventos"],
  ["opportunity", "Oportunidades"],
  ["announcement", "Comunicados"],
  ["poetry", "Poesia"],
  ["gallery", "Galeria"],
];

export default function LatestContent() {
  const [posts, setPosts] = useState<Publication[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/content", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível carregar as publicações.");
        return response.json() as Promise<Publication[]>;
      })
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoaded(true));
    return () => controller.abort();
  }, []);

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-AO");
    return posts.filter((post) => {
      const matchesType = filter === "all" || post.type === filter || (filter === "music" && post.type === "podcast");
      const searchable = [post.title, post.artist, post.genre, post.description].join(" ").toLocaleLowerCase("pt-AO");
      return matchesType && (!query || searchable.includes(query));
    });
  }, [posts, filter, search]);

  if (!loaded || posts.length === 0) return null;

  return (
    <section className="latest-section section-wrap" id="publicacoes">
      <div className="section-heading">
        <div>
          <div className="section-kicker">ACTIVIDADE DA COMUNIDADE</div>
          <h2>O que está a<br /><em>acontecer.</em></h2>
        </div>
        <p>Publicações editoriais da equipa<br />e dos administradores do Código Lírico.</p>
      </div>
      <div className="latest-controls">
        <label className="latest-search">
          <span className="sr-only">Pesquisar publicações</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por título, artista ou tema..." />
        </label>
        <div className="latest-filters" aria-label="Filtrar publicações">
          {filters.map(([value, label]) => (
            <button className={filter === value ? "latest-filter active" : "latest-filter"} key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value}>{label}</button>
          ))}
        </div>
      </div>
      {visiblePosts.length === 0 ? (
        <p className="latest-empty">Não encontrámos publicações com esse filtro. Experimenta outra pesquisa.</p>
      ) : (
        <div className="latest-grid">
          {visiblePosts.map((post) => (
            <article className={post.featured ? "latest-card latest-card-featured" : "latest-card"} key={post.id}>
              <div className="latest-card-top">
                <span>{labels[post.type] ?? post.type.toUpperCase()}</span>
                {post.featured && <span className="latest-featured">EM DESTAQUE</span>}
              </div>
              {post.imageUrl && <Image className="latest-image" src={post.imageUrl} alt={post.title} width={960} height={540} unoptimized />}
              <div className="latest-card-content">
                <span className="latest-category">{post.genre}</span>
                <h3>{post.title}</h3>
                <p className="latest-byline">Por {post.artist}</p>
                <p className="latest-description">{post.description}</p>
                {post.type === "video" && post.audioUrl && (
                  <video className="latest-video" controls preload="none" playsInline src={post.audioUrl}>O teu navegador não suporta vídeo.</video>
                )}
                {(post.type === "music" || post.type === "podcast") && post.audioUrl && (
                  <audio controls preload="none" src={post.audioUrl}>O teu navegador não suporta áudio.</audio>
                )}
                {post.link && <a className="underlined-link" href={post.link} target="_blank" rel="noreferrer">Abrir publicação <span>↗</span></a>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
