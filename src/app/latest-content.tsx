"use client";

import { useEffect, useState } from "react";

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

export default function LatestContent() {
  const [posts, setPosts] = useState<Publication[]>([]);
  const [loaded, setLoaded] = useState(false);

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

  if (!loaded || posts.length === 0) return null;

  return (
    <section className="latest-section section-wrap" id="publicacoes">
      <div className="section-heading">
        <div>
          <div className="section-kicker">ACTIVIDADE DA COMUNIDADE</div>
          <h2>O que está a<br /><em>acontecer.</em></h2>
        </div>
        <p>Conteúdos publicados pela equipa<br />e pelos administradores do Código Lírico.</p>
      </div>
      <div className="latest-grid">
        {posts.map((post) => (
          <article className={post.featured ? "latest-card latest-card-featured" : "latest-card"} key={post.id}>
            <div className="latest-card-top">
              <span>{labels[post.type] ?? post.type.toUpperCase()}</span>
              {post.featured && <span className="latest-featured">EM DESTAQUE</span>}
            </div>
            {post.imageUrl && (
              // External media links are validated as HTTPS by the server before storage.
              <img className="latest-image" src={post.imageUrl} alt={post.title} loading="lazy" />
            )}
            <div className="latest-card-content">
              <span className="latest-category">{post.genre}</span>
              <h3>{post.title}</h3>
              <p className="latest-byline">Por {post.artist}</p>
              <p className="latest-description">{post.description}</p>
              {post.type === "video" && post.audioUrl && (
                <video className="latest-video" controls preload="none" playsInline src={post.audioUrl}>
                  O teu navegador não suporta vídeo.
                </video>
              )}
              {(post.type === "music" || post.type === "podcast") && post.audioUrl && (
                <audio controls preload="none" src={post.audioUrl}>O teu navegador não suporta áudio.</audio>
              )}
              {post.link && <a className="underlined-link" href={post.link} target="_blank" rel="noreferrer">Abrir publicação <span>↗</span></a>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
