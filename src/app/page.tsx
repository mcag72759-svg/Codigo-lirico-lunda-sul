import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Código Lírico, início">
          <span className="brand-mark">CL</span>
          <span>CÓDIGO LÍRICO</span>
        </Link>
        <span className="topbar-note">LUNDA SUL · ANGOLA</span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">CULTURA · MÚSICA · COMUNIDADE</p>
        <h1 id="hero-title">As vozes da nossa terra merecem ser ouvidas.</h1>
        <p className="hero-copy">
          Um espaço para artistas independentes partilharem a sua música,
          encontrarem oportunidades e crescerem em comunidade.
        </p>
        <div className="hero-actions">
          <a className="primary-link" href="#sobre">Conhecer a plataforma</a>
          <span className="status-note">Nova estrutura em construção</span>
        </div>
      </section>

      <section className="feature-grid" id="sobre" aria-label="Áreas da plataforma">
        <article className="feature-card">
          <span className="feature-index">01</span>
          <h2>Artistas</h2>
          <p>Perfis, candidaturas e portefólios para talentos independentes.</p>
        </article>
        <article className="feature-card">
          <span className="feature-index">02</span>
          <h2>Comunidade</h2>
          <p>Publicações, seguidores, conversas e descoberta de novos sons.</p>
        </article>
        <article className="feature-card">
          <span className="feature-index">03</span>
          <h2>Oportunidades</h2>
          <p>Eventos, parcerias e oportunidades culturais relevantes.</p>
        </article>
      </section>

      <footer className="footer">
        <span>MC AG EIGI · CRIADOR</span>
        <span>© {new Date().getFullYear()} CÓDIGO LÍRICO</span>
      </footer>
    </main>
  );
}
