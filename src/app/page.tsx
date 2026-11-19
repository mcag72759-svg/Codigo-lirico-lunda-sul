import Link from "next/link";
import LatestContent from "./latest-content";
import DiscoverySections from "./discovery-sections";

const areas = [
  { number: "01", title: "Música e artistas", description: "Descobre vozes, lançamentos e percursos de criadores independentes.", tag: "TALENTO ANGOLANO", href: "#conteudos" },
  { number: "02", title: "Cultura e comunidade", description: "Notícias, ideias, poesia, conversas e histórias que merecem circular.", tag: "EXPRESSÃO", href: "#sobre" },
  { number: "03", title: "Eventos e oportunidades", description: "Encontra chamadas, encontros, parcerias e novas possibilidades.", tag: "MOVIMENTO", href: "#eventos" },
];

export default function HomePage() {
  return <main className="site-shell">
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Código Lírico — início"><span className="brand-symbol">CL</span><span className="brand-wordmark">CÓDIGO <b>LÍRICO</b></span></Link>
      <nav className="main-nav" aria-label="Navegação principal">
        <a href="#sobre">Sobre</a><a href="#areas">Explorar</a><a href="#conteudos">Publicações</a><Link href="/downloads">Downloads</Link><a href="#artistas">Artistas</a><a href="#eventos">Eventos</a><Link href="/artista">Estúdio</Link>
      </nav>
      <Link className="header-cta" href="/admin/publicar">Área administrativa <span>↗</span></Link>
    </header>
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-line"/> CULTURA INDEPENDENTE · LUNDA SUL</p>
        <h1>A cultura tem voz.<br/><em>A nossa também.</em></h1>
        <p className="hero-description">Um espaço independente para aproximar artistas, música, ideias e oportunidades. Da Lunda Sul para Angola — e de Angola para o mundo.</p>
        <div className="hero-actions"><a className="button button-light" href="#areas">Explorar a plataforma <span>↗</span></a><a className="text-link" href="#sobre">Conhecer o projecto ↓</a></div>
        <div className="hero-footnote"><span className="live-dot"/> UM PALCO DIGITAL PARA A CRIATIVIDADE ANGOLANA</div>
      </div>
      <div className="hero-art" role="img" aria-label="Identidade visual Código Lírico, cultura independente da Lunda Sul">
        <span className="art-index">EST. LUNDA SUL · ANGOLA</span><div className="art-monogram">CL<span>.</span></div><span className="art-side-label">CULTURA SEM FRONTEIRAS</span><div className="art-bottom"><span>IDEIAS QUE ECOAM.</span><span>01 / 04</span></div>
      </div>
    </section>
    <div className="ticker"><div className="ticker-track"><span>MÚSICA</span><i>✳</i><span>POESIA</span><i>✳</i><span>ARTE</span><i>✳</i><span>COMUNIDADE</span><i>✳</i><span>OPORTUNIDADES</span><i>✳</i></div></div>
    <section className="intro-section section-wrap" id="sobre"><div className="section-kicker">01 / SOBRE O PROJECTO</div><div className="intro-content"><h2>Uma plataforma.<br/><span>Uma cultura em movimento.</span></h2><div className="intro-aside"><p>O Código Lírico dá espaço à criatividade angolana, aproxima quem cria de quem descobre e transforma talento local em novas ligações.</p><a className="underlined-link" href="#areas">Descobrir as áreas <span>↗</span></a></div></div></section>
    <section className="areas-section section-wrap" id="areas"><div className="section-heading"><div><div className="section-kicker">02 / EXPLORA</div><h2>O que nos move.<br/><em>O que nos liga.</em></h2></div><p>Vozes, ideias e iniciativas.<br/>Tudo começa com expressão.</p></div><div className="area-grid">{areas.map(a=><a className="area-card" href={a.href} key={a.number}><div className="area-card-top"><span>{a.number}</span><span className="area-arrow">↗</span></div><div><span className="area-tag">{a.tag}</span><h3>{a.title}</h3><p>{a.description}</p></div><div className="area-card-line"/></a>)}</div></section>
    <section className="community-band"><div className="community-inner"><div className="section-kicker">03 / IDENTIDADE</div><h2>As boas ideias<br/>não ficam <em>em silêncio.</em></h2><p>Celebramos quem cria, quem experimenta e quem transforma vivências em expressão. A cultura cresce quando circula.</p><a className="button button-dark" href="#conteudos">Ver publicações <span>↗</span></a><div className="community-stamp">CL<span>✳</span></div></div></section>
    <section className="opportunities-section section-wrap" id="proximo-capitulo"><div className="section-kicker">04 / O PRÓXIMO CAPÍTULO</div><div className="opportunity-content"><h2>Há sempre um<br/><em>próximo passo.</em></h2><div><p>Descobre iniciativas culturais, eventos, chamadas e oportunidades para levar a criatividade mais longe.</p><a className="underlined-link" href="#conteudos">Explorar conteúdos <span>↗</span></a></div></div></section>
    <DiscoverySections/><div id="conteudos"><LatestContent/></div>
    <section className="creator-section section-wrap"><div className="section-kicker">06 / QUEM ESTÁ POR TRÁS</div><div className="creator-card"><div className="creator-monogram">AG<span>.</span></div><div className="creator-copy"><span className="creator-label">IDEIA, VISÃO E CRIAÇÃO</span><h2>Aguinaldo Alves Fernando<br/><em>MC AG EIGI</em></h2><p>Músico independente e estudante de Informática, natural da Lunda Sul. Criei o Código Lírico para dar mais espaço aos artistas, às histórias e aos talentos que merecem ser descobertos, ligando cultura e tecnologia.</p><p className="creator-signature">Coração de prata. Visão sem fronteiras.</p></div></div></section>
    <footer className="site-footer"><div className="footer-main"><Link className="footer-brand" href="/"><span className="footer-mark">CL</span><span>CÓDIGO LÍRICO</span></Link><p>Uma plataforma para a cultura independente angolana.</p></div><div className="footer-socials"><span className="footer-social-title">ACOMPANHA MC AG EIGI</span><a className="social-link" href="https://www.facebook.com/search/top?q=Aguinaldo%20AG%20Eigi" target="_blank" rel="noreferrer"><span>f</span><span className="social-copy"><b>Facebook</b><small>Aguinaldo AG Eigi</small></span></a><a className="social-link" href="https://www.youtube.com/results?search_query=MC+AG+EIGI" target="_blank" rel="noreferrer"><span>▶</span><span className="social-copy"><b>YouTube</b><small>MC AG EIGI</small></span></a><a className="social-link" href="https://www.tiktok.com/search?q=MC%20AG%20EIGI" target="_blank" rel="noreferrer"><span>♪</span><span className="social-copy"><b>TikTok</b><small>MC AG EIGI</small></span></a><a className="social-link" href="https://x.com/search?q=MC%20AG" target="_blank" rel="noreferrer"><span>𝕏</span><span className="social-copy"><b>X</b><small>MC AG</small></span></a></div><div className="footer-meta"><span>CRIADO POR MC AG EIGI</span><span>© {new Date().getFullYear()} · LUNDA SUL, ANGOLA</span></div></footer>
  </main>;
}
