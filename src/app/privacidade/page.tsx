import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade — Código Lírico",
  description: "Como o Código Lírico recolhe, utiliza e protege os dados das contas e publicações.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacyPage() {
  return <main className="site-shell legal-shell">
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Código Lírico — início"><span className="brand-symbol">CL</span><span className="brand-wordmark">CÓDIGO <b>LÍRICO</b></span></Link>
      <nav className="main-nav" aria-label="Navegação principal"><Link href="/">Início</Link><Link href="/comunidade">Comunidade</Link><Link href="/artista">Estúdio</Link></nav>
      <Link className="header-cta" href="/artista/cadastro">Criar conta <span>↗</span></Link>
    </header>

    <section className="legal-page section-wrap">
      <div className="section-kicker">INFORMAÇÃO E TRANSPARÊNCIA</div>
      <h1>Política de <em>privacidade.</em></h1>
      <p className="legal-updated">Actualizada em 23 de Novembro de 2026</p>
      <p>Esta página explica, em linguagem simples, que dados o Código Lírico — Lunda Sul utiliza para gerir contas de artistas, publicações e funcionalidades da comunidade. É uma informação operacional da plataforma e deve ser revista juridicamente antes de ser tratada como parecer de conformidade legal.</p>

      <h2>1. Dados que podemos tratar</h2>
      <ul>
        <li><strong>Conta:</strong> número de telefone, hash e salt da palavra-passe e dados técnicos necessários à sessão.</li>
        <li><strong>Perfil:</strong> nome artístico, nome completo, município, género artístico, e-mail, apresentação, fotografia e ligações, quando fornecidos.</li>
        <li><strong>Actividade:</strong> músicas, vídeos, imagens, textos, comentários, gostos, seguimentos, denúncias e mensagens enviadas através da comunidade.</li>
        <li><strong>Segurança:</strong> identificadores de sessão guardados por hash e hashes de endereços IP usados para limitar tentativas de cadastro e login. A plataforma não precisa de guardar o endereço IP em texto simples para essa limitação.</li>
      </ul>

      <h2>2. Para que servem os dados</h2>
      <p>Os dados são utilizados para criar e proteger contas, apresentar perfis e conteúdos autorizados, permitir interacções entre artistas, moderar publicações, responder a denúncias, prevenir abuso e manter a segurança e funcionamento técnico do serviço.</p>

      <h2>3. Palavra-passe e sessões</h2>
      <p>As palavras-passe são armazenadas através de um hash criptográfico com salt individual; não são guardadas em texto simples. Os cookies de sessão são protegidos com as opções HttpOnly e SameSite e usam Secure em produção. Nunca partilhes a tua palavra-passe nem códigos privados de recuperação.</p>

      <h2>4. Conteúdos públicos e mensagens</h2>
      <p>Os dados do perfil e as publicações aprovadas podem aparecer publicamente conforme a visibilidade escolhida e as regras da plataforma. Conteúdos submetidos por artistas ficam pendentes até revisão administrativa. Mensagens privadas não aparecem no feed público; ainda assim, a plataforma não declara oferecer encriptação ponta a ponta, pelo que não deves enviar palavras-passe, documentos financeiros ou informação altamente sensível.</p>

      <h2>5. Serviços utilizados</h2>
      <p>A aplicação utiliza serviços de alojamento e entrega da Vercel, armazenamento de ficheiros Vercel Blob e base de dados PostgreSQL fornecida pela Neon. Estes fornecedores processam dados necessários para alojar a plataforma, guardar registos e entregar ficheiros. A localização e os termos de tratamento dependem das configurações e condições desses fornecedores.</p>

      <h2>6. Conservação, cópias e eliminação</h2>
      <p>Os dados de conta e conteúdo permanecem na base de dados enquanto a conta e os registos associados existirem, salvo remoção autorizada pela administração. As tentativas de autenticação usadas para controlo de abuso são limpas após 24 horas; sessões expiram e são removidas durante operações de autenticação.</p>
      <p><strong>Limite importante:</strong> o projecto Neon actualmente associado ao site está num plano que permite apenas 6 horas de recuperação temporal e não permite programar snapshots automáticos. Foi criado um snapshot manual antes das alterações técnicas recentes, mas isso não é uma garantia de conservação eterna nem substitui cópias independentes regulares. A plataforma não promete armazenamento permanente de todos os ficheiros ou dados.</p>

      <h2>7. Acesso, correcção ou remoção</h2>
      <p>Para pedir acesso, correcção ou remoção de dados da conta, contacta a equipa através dos canais oficiais publicados pelo Código Lírico. A remoção definitiva de uma conta é uma operação administrativa e pode remover também publicações, comentários, ficheiros e interacções associadas.</p>

      <h2>8. Alterações a esta política</h2>
      <p>Esta informação pode ser actualizada quando as funcionalidades, fornecedores ou práticas de tratamento mudarem. A data no início da página indica a revisão mais recente.</p>

      <div className="legal-nav"><Link href="/termos">Ler os Termos de utilização ↗</Link><Link href="/">Voltar ao Código Lírico ↗</Link></div>
    </section>
    <footer className="site-footer"><div className="footer-main"><Link className="footer-brand" href="/"><span className="footer-mark">CL</span><span>CÓDIGO LÍRICO</span></Link><p>Uma plataforma para a cultura independente angolana.</p></div><div className="footer-meta"><Link href="/termos">Termos de utilização</Link><span>© {new Date().getFullYear()} · LUNDA SUL, ANGOLA</span></div></footer>
  </main>;
}
