import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de utilização — Código Lírico",
  description: "Regras para criar conta, publicar conteúdos e participar na comunidade Código Lírico.",
  alternates: { canonical: "/termos" },
};

export default function TermsPage() {
  return <main className="site-shell legal-shell">
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Código Lírico — início"><span className="brand-symbol">CL</span><span className="brand-wordmark">CÓDIGO <b>LÍRICO</b></span></Link>
      <nav className="main-nav" aria-label="Navegação principal"><Link href="/">Início</Link><Link href="/downloads">Downloads</Link><Link href="/comunidade">Comunidade</Link></nav>
      <Link className="header-cta" href="/artista/cadastro">Criar conta <span>↗</span></Link>
    </header>

    <section className="legal-page section-wrap">
      <div className="section-kicker">REGRAS DE PARTICIPAÇÃO</div>
      <h1>Termos de <em>utilização.</em></h1>
      <p className="legal-updated">Actualizados em 23 de Novembro de 2026</p>
      <p>Ao criar uma conta ou utilizar o Código Lírico — Lunda Sul, concordas com estas regras de utilização. Se não concordares, não deves criar conta nem enviar conteúdos.</p>

      <h2>1. Contas de artistas</h2>
      <p>O cadastro exige um número de telefone e uma palavra-passe. Os dados adicionais do perfil são opcionais. Cada número de telefone identifica uma conta; não uses o número de outra pessoa sem autorização. Uma nova conta fica pendente e só pode aceder ao estúdio depois da aprovação administrativa.</p>
      <p>És responsável por manter a palavra-passe confidencial e por comunicar à equipa qualquer suspeita de acesso indevido. A administração pode suspender ou rejeitar contas que violem estes termos ou coloquem a comunidade em risco.</p>

      <h2>2. Publicações e propriedade intelectual</h2>
      <p>Publica apenas músicas, fotografias, vídeos, textos e outros materiais que criaste ou para os quais tens autorização suficiente. Ao submeter conteúdo, autorizas o Código Lírico a alojá-lo, reproduzi-lo e apresentá-lo dentro da plataforma para cumprir as funcionalidades de publicação, divulgação e partilha que escolheste. Esta autorização não transfere a propriedade da tua obra para a plataforma.</p>
      <p>Não envies conteúdos que violem direitos de autor, marcas, privacidade ou outros direitos de terceiros. És responsável por confirmar que tens autorização para utilizar instrumentais, imagens, gravações, samples e materiais de outras pessoas.</p>

      <h2>3. Revisão e visibilidade</h2>
      <p>As publicações submetidas por artistas entram em estado pendente e só ficam públicas depois da aprovação. A administração pode aprovar, rejeitar, suspender, reabrir ou remover conteúdos e contas, de acordo com as ferramentas e permissões disponíveis. O agendamento não substitui a aprovação.</p>

      <h2>4. Comportamento permitido</h2>
      <p>Não uses a plataforma para assediar, ameaçar, discriminar, impersonar terceiros, divulgar dados privados sem autorização, espalhar malware, praticar fraude ou organizar actividades ilegais. Não publiques material sexual explícito, conteúdo de exploração ou qualquer material que coloque menores em risco.</p>
      <p>Não tentes contornar controlos de acesso, limites de utilização, moderação ou mecanismos de segurança. Não envies ficheiros maliciosos nem tentes aceder a contas ou conteúdos de outros utilizadores.</p>

      <h2>5. Ficheiros e limites técnicos</h2>
      <p>Os uploads estão sujeitos aos formatos e limites técnicos apresentados no formulário, incluindo o limite configurado de até 200 MB por ficheiro. A reprodução e o descarregamento dependem da disponibilidade do serviço de armazenamento e da autorização definida para cada conteúdo.</p>

      <h2>6. Comunidade e mensagens</h2>
      <p>Comentários, gostos, seguimentos, denúncias e mensagens devem respeitar as outras pessoas. As mensagens privadas não são publicações públicas; não partilhes nelas palavras-passe, códigos de recuperação ou informação financeira. A plataforma não promete disponibilidade ininterrupta nem encriptação ponta a ponta das mensagens.</p>

      <h2>7. Moderação e encerramento de contas</h2>
      <p>A equipa pode limitar a visibilidade, rejeitar publicações, suspender acessos ou remover contas quando necessário para proteger a plataforma. A remoção definitiva de uma conta pode eliminar os conteúdos, comentários, ficheiros e interacções associados. Contacta a equipa através dos canais oficiais para pedidos de revisão ou remoção.</p>

      <h2>8. Disponibilidade e conservação</h2>
      <p>O Código Lírico é um projecto independente. Funcionalidades, limites e disponibilidade podem mudar; não há garantia de que uma publicação, ficheiro ou conta fique armazenado para sempre. Mantém cópias originais dos teus trabalhos e não uses a plataforma como único arquivo dos teus materiais.</p>

      <h2>9. Alterações aos termos</h2>
      <p>Estes termos podem ser actualizados quando a plataforma evoluir. A data no início da página indica a revisão mais recente. A utilização continuada após uma actualização significa que deves consultar e aceitar a versão publicada.</p>

      <div className="legal-nav"><Link href="/privacidade">Ler a Política de privacidade ↗</Link><Link href="/">Voltar ao Código Lírico ↗</Link></div>
    </section>
    <footer className="site-footer"><div className="footer-main"><Link className="footer-brand" href="/"><span className="footer-mark">CL</span><span>CÓDIGO LÍRICO</span></Link><p>Uma plataforma para a cultura independente angolana.</p></div><div className="footer-meta"><Link href="/privacidade">Política de privacidade</Link><span>© {new Date().getFullYear()} · LUNDA SUL, ANGOLA</span></div></footer>
  </main>;
}
