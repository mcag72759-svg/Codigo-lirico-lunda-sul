"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

type RegistrationResult = { phone: string; message: string };

export default function ArtistRegistrationPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [activationBusy, setActivationBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<RegistrationResult | null>(null);

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      const response = await fetch("/api/artist/apply", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível guardar o cadastro.");
      setResult(data as RegistrationResult);
      setMessage(data.message ?? "Cadastro recebido.");
      form.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocorreu um erro ao guardar o cadastro.");
    } finally {
      setBusy(false);
    }
  }

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setActivationBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/artist/activate", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível actualizar a conta.");
      setMessage("Acesso actualizado com sucesso. A abrir o teu estúdio…");
      router.push("/artista");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível actualizar a conta.");
    } finally {
      setActivationBusy(false);
    }
  }

  return (
    <main className="artist-studio-page">
      <Link className="admin-back-link" href="/artista">← Voltar ao estúdio do artista</Link>
      <header className="artist-studio-heading">
        <span className="section-kicker">REGISTO DE CRIADORES · CÓDIGO LÍRICO</span>
        <h1>A tua voz merece<br /><em>um espaço.</em></h1>
        <p>Cria a tua conta com o número de telefone e a palavra-passe. Os dados do perfil são opcionais e podem ser preenchidos agora ou mais tarde.</p>
      </header>

      <form className="admin-publish-form" onSubmit={apply}>
        <h2>1 / Criar conta</h2>
        <label>Número de telefone<input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={40} placeholder="+244 9XX XXX XXX" required /></label>
        <label>Criar palavra-passe<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
        <p className="admin-security-note">Estes são os únicos dois campos obrigatórios. A palavra-passe é guardada com hash seguro, nunca em texto simples.</p>

        <details className="artist-registration-legacy">
          <summary>Adicionar dados do perfil (opcional)</summary>
          <label>Nome artístico<input name="stageName" maxLength={100} autoComplete="nickname" placeholder="Como queres ser apresentado?" /></label>
          <label>Nome completo<input name="fullName" maxLength={140} autoComplete="name" /></label>
          <div className="admin-form-row">
            <label>Município<input name="municipality" maxLength={100} placeholder="Ex.: Saurimo" /></label>
            <label>Género artístico<input name="genre" maxLength={80} placeholder="Ex.: Rap, R&B, poesia" /></label>
          </div>
          <label>E-mail (opcional)<input name="email" type="email" maxLength={254} autoComplete="email" /></label>
          <label>Apresentação<textarea name="bio" rows={5} maxLength={1800} placeholder="Conta à comunidade o que crias e o que gostarias de partilhar…" /></label>
          <label>Portefólio ou rede social<input name="link" type="url" maxLength={2048} placeholder="https://…" /></label>
        </details>

        <button className="button button-light admin-submit" type="submit" disabled={busy}>{busy ? "A guardar…" : "Criar conta ↗"}</button>
        <p className="admin-security-note">O cadastro fica pendente até à aprovação da equipa. Depois da aprovação, podes entrar no estúdio com o mesmo telefone e a mesma palavra-passe.</p>
      </form>

      {result && (
        <section className="artist-registration-code" aria-live="polite">
          <span>Cadastro guardado</span>
          <strong>{result.phone}</strong>
          <p>{result.message}</p>
          <p>Guarda o número e a palavra-passe. O cadastro e o perfil ficam guardados na base de dados, mesmo depois de terminares a sessão.</p>
        </section>
      )}

      <details className="artist-registration-legacy" id="ativacao-antiga">
        <summary>Já tens um código privado de activação ou recuperação da administração?</summary>
        <p className="admin-security-note">Introduz o mesmo número de telefone associado à conta e o código de utilização única recebido da administração.</p>
        <form className="admin-publish-form artist-registration-form" onSubmit={activate}>
          <label>Número de telefone<input name="phone" type="tel" inputMode="tel" autoComplete="tel" required /></label>
          <label>Código privado de acesso<input name="activationCode" inputMode="text" autoComplete="one-time-code" minLength={48} maxLength={48} placeholder="48 caracteres" required /></label>
          <label>Nova palavra-passe<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
          <button className="button button-light admin-submit" type="submit" disabled={activationBusy}>{activationBusy ? "A verificar…" : "Activar / recuperar acesso ↗"}</button>
        </form>
      </details>

      {message && <p className="admin-form-message" role="status">{message}</p>}
      <p className="artist-register-prompt">Já tens uma conta aprovada? <Link href="/artista">Entrar no estúdio ↗</Link></p>
    </main>
  );
}
