import Link from "next/link";
import LatestContent from "./latest-content";

const areas = [
  {
    number: "01",
    title: "Vozes e artistas",
    description: "Descobre criadores, conhece os seus percursos e acompanha os projectos que nascem na nossa terra.",
    tag: "TALENTO LOCAL",
    href: "#artistas",
  },
  {
    number: "02",
    title: "Comunidade viva",
    description: "Um ponto de encontro para partilhar ideias, lançamentos, novidades e conversas sobre cultura.",
    tag: "PARTILHA",
    href: "#comunidade",
  },
  {
    number: "03",
    title: "Oportunidades",
    description: "Eventos, chamadas, parcerias e caminhos para levar a criatividade mais longe.",
    tag: "NOVOS CAMINHOS",
    href: "#oportunidades",
  },
];

export default function HomePage() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Código Lírico — página inicial">
          <span className="brand-symbol" aria-hidden="true"><span>CL</span></span>
          <span className="brand-wordmark">CÓDIGO <b>LÍRICO</b></span>
        </Link>
        <nav className="main-nav" aria-label="Navegação principal">
          <a href="#sobre">A plataforma</a>
          <a href="#areas">Explorar</a>
          <a href="#oportunidades">Oportunidades</a>
        </nav>
        <div className="header-account-links"><Link className="header-cta" href="/artistas/entrar">Entrar <span aria-hidden="true">↗</span></Link><Link className="header-register" href="/artistas/cadastro">Criar conta</Link></div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> CULTURA INDEPENDENTE · LUNDA SUL</p>
          <h1 id="hero-title">A cultura tem voz.<br /><em>A nossa também.</em></h1>
          <p className="hero-description">
            Um espaço feito para aproximar artistas, ideias e oportunidades.
            Da Lunda Sul para Angola — e de Angola para o mundo.
          </p>
          <div className="hero-actions">
            <a className="button button-light" href="#areas">Descobrir a plataforma <span aria-hidden="true">↗</span></a>
            <a className="text-link" href="#sobre">Conhecer o projecto <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-footnote"><span className="live-dot" /> UM PALCO DIGITAL PARA A CRIATIVIDADE ANGOLANA</div>
        </div>

        <div className="hero-art" aria-label="Composição gráfica Código Lírico">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-grain" />
          <div className="art-index">EST. LUNDA SUL <span>·</span> ANGOLA</div>
          <div className="art-monogram">CL<span>.</span></div>
          <div className="art-side-label">CULTURA<br />SEM FRONTEIRAS</div>
          <div className="art-bottom"><span>IDEIAS QUE ECOAM.</span><span>01 / 04</span></div>
        </div>
      </section>

      <div className="ticker" aria-label="Áreas da comunidade">
        <div className="ticker-track">
          <span>MÚSICA</span><i>✳</i><span>POESIA</span><i>✳</i><span>ARTE</span><i>✳</i><span>COMUNIDADE</span><i>✳</i><span>OPORTUNIDADES</span><i>✳</i>
          <span>MÚSICA</span><i>✳</i><span>POESIA</span><i>✳</i><span>ARTE</span><i>✳</i><span>COMUNIDADE</span><i>✳</i><span>OPORTUNIDADES</span><i>✳</i>
        </div>
      </div>

      <section className="intro-section section-wrap" id="sobre">
        <div className="section-kicker">01 / SOBRE O PROJECTO</div>
        <div className="intro-content">
          <h2>Mais do que uma plataforma.<br /><span>Um lugar para a expressão.</span></h2>
          <div className="intro-aside">
            <p>O Código Lírico nasce para dar visibilidade à criatividade angolana e criar pontes entre quem faz cultura, quem a apoia e quem quer descobrir algo novo.</p>
            <a className="underlined-link" href="#areas">Ver o que podes encontrar <span>↗</span></a>
          </div>
        </div>
      </section>

      <section className="areas-section section-wrap" id="areas">
        <div className="section-heading">
          <div><div className="section-kicker">02 / EXPLORA</div><h2>Um espaço.<br /><em>Muitas possibilidades.</em></h2></div>
          <p>Talento, ligação e movimento.<br />Tudo começa com uma voz.</p>
        </div>
        <div className="area-grid">
          {areas.map((area) => (
            <a className="area-card" href={area.href} key={area.number}>
              <div className="area-card-top"><span>{area.number}</span><span className="area-arrow">↗</span></div>
              <div className="area-card-body">
                <span className="area-tag">{area.tag}</span>
                <h3>{area.title}</h3>
                <p>{area.description}</p>
              </div>
              <div className="area-card-line" />
            </a>
          ))}
        </div>
      </section>

      <section className="community-band" id="comunidade">
        <div className="community-inner">
          <div className="section-kicker">03 / A NOSSA IDENTIDADE</div>
          <h2>As boas ideias<br />não ficam <em>em silêncio.</em></h2>
          <p>Celebramos quem cria, quem experimenta e quem transforma vivências em expressão. A cultura cresce quando circula.</p>
          <a className="button button-dark" href="#oportunidades">Fazer parte deste movimento <span>↗</span></a>
          <div className="community-stamp" aria-hidden="true">CL<span>✳</span></div>
        </div>
      </section>

      <section className="opportunities-section section-wrap" id="oportunidades">
        <div className="section-kicker">04 / O PRÓXIMO CAPÍTULO</div>
        <div className="opportunity-content">
          <h2>Há sempre um<br /><em>próximo passo.</em></h2>
          <div>
            <p>Descobre iniciativas culturais, encontra novas colaborações e acompanha o que está a acontecer na comunidade.</p>
            <a className="underlined-link" href="#areas">Explorar áreas da plataforma <span>↗</span></a>
          </div>
        </div>
      </section>

      <LatestContent />

      <section className="creator-section section-wrap" id="criador">
        <div className="section-kicker">05 / QUEM ESTÁ POR TRÁS</div>
        <div className="creator-card">
          <div className="creator-monogram" aria-hidden="true">AG<span>.</span></div>
          <div className="creator-copy">
            <span className="creator-label">IDEIA, VISÃO E CRIAÇÃO</span>
            <h2>Aguinaldo Alves Fernando<br /><em>MC AG EIGI</em></h2>
            <p>Sou MC AG EIGI, músico independente e estudante de Informática, natural da Lunda Sul. Acredito na força da cultura, da tecnologia e das palavras para aproximar pessoas e abrir caminhos. Criei o Código Lírico para dar mais espaço aos artistas, às histórias e aos talentos que merecem ser descobertos.</p>
            <p className="creator-signature">Coração de prata. Visão sem fronteiras.</p>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-main">
          <Link className="footer-brand" href="/"><span className="footer-mark">CL</span><span>CÓDIGO LÍRICO</span></Link>
          <p>Uma plataforma para a cultura independente angolana.</p>
        </div>
        <div className="footer-socials" aria-label="Redes sociais do criador">
          <span className="footer-social-title">ACOMPANHA MC AG EIGI</span>
          {[
            { label: "Facebook", account: "Aguinaldo AG Eigi", mark: "f", href: "https://www.facebook.com/search/top?q=Aguinaldo%20AG%20Eigi" },
            { label: "YouTube", account: "MC AG EIGI", mark: "▶", href: "https://www.youtube.com/results?search_query=MC+AG+EIGI" },
            { label: "TikTok", account: "MC AG EIGI", mark: "♪", href: "https://www.tiktok.com/search?q=MC%20AG%20EIGI" },
            { label: "X / Twitter", account: "MC AG", mark: "𝕏", href: "https://x.com/search?q=MC%20AG" },
            { label: "Instagram", account: "Aguinaldo AG mudico", mark: "◎", href: "https://www.instagram.com/explore/search/keyword/?q=Aguinaldo%20AG%20mudico" },
          ].map((social) => (
            <a className="social-link" href={social.href} key={social.label} target="_blank" rel="noopener noreferrer" aria-label={`Procurar ${social.label}: ${social.account}`} title={`Procurar ${social.account} no ${social.label}`}>
              <span aria-hidden="true">{social.mark}</span><span className="social-copy"><b>{social.label}</b><small>{social.account}</small></span>
            </a>
          ))}
        </div>
        <div className="footer-meta"><span>CRIADO POR MC AG EIGI</span><span>© {new Date().getFullYear()} · LUNDA SUL, ANGOLA</span></div>
      </footer>
    </main>
  );
}
