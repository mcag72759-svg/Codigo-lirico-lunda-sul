"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

type ApplicationResult = { email:string; activationCode:string; message:string };

export default function ArtistRegistrationPage() {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [result,setResult]=useState<ApplicationResult|null>(null);

  async function apply(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=event.currentTarget;
    const values=Object.fromEntries(new FormData(form).entries());
    setBusy(true);setMessage("");setResult(null);
    try {
      const response=await fetch("/api/artist/apply",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error??"Não foi possível enviar a candidatura.");
      setResult(data as ApplicationResult);
      setMessage(data.message??"Candidatura recebida.");
      form.reset();
    } catch(error) {
      setMessage(error instanceof Error?error.message:"Ocorreu um erro ao enviar a candidatura.");
    } finally {
      setBusy(false);
    }
  }

  async function activate(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values=Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);setMessage("");
    try {
      const response=await fetch("/api/artist/activate",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error??"Não foi possível activar a conta.");
      setMessage("Conta criada com sucesso. A abrir o teu estúdio…");
      window.location.assign("/artista");
    } catch(error) {
      setMessage(error instanceof Error?error.message:"Não foi possível activar a conta.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="artist-studio-page">
    <Link className="admin-back-link" href="/artista">← Voltar ao estúdio do artista</Link>
    <header className="artist-studio-heading">
      <span className="section-kicker">REGISTO DE CRIADORES · CÓDIGO LÍRICO</span>
      <h1>A tua voz merece<br/><em>um espaço.</em></h1>
      <p>Apresenta o teu trabalho à equipa do Código Lírico. Depois da aprovação, poderás criar a tua palavra-passe e entrar no estúdio privado.</p>
    </header>

    <form className="admin-publish-form" onSubmit={apply}>
      <h2>1 / Candidatura de artista</h2>
      <label>Nome artístico<input name="stageName" maxLength={100} autoComplete="nickname" placeholder="Como queres ser apresentado?" required/></label>
      <label>Nome completo<input name="fullName" maxLength={140} autoComplete="name" required/></label>
      <div className="admin-form-row">
        <label>Município<input name="municipality" maxLength={100} placeholder="Ex.: Saurimo" required/></label>
        <label>Género musical / artístico<input name="genre" maxLength={80} placeholder="Ex.: Rap, R&B, poesia" required/></label>
      </div>
      <div className="admin-form-row">
        <label>E-mail<input name="email" type="email" maxLength={254} autoComplete="email" required/></label>
        <label>Telefone<input name="phone" type="tel" maxLength={40} autoComplete="tel" required/></label>
      </div>
      <label>Apresentação<textarea name="bio" rows={5} minLength={20} maxLength={1800} placeholder="Conta à equipa quem és, o que crias e o que gostarias de partilhar…" required/></label>
      <label>Portefólio ou rede social (opcional)<input name="link" type="url" maxLength={2048} placeholder="https://…"/></label>
      <button className="button button-light admin-submit" type="submit" disabled={busy}>{busy?"A enviar…":"Enviar candidatura ↗"}</button>
      <p className="admin-security-note">A candidatura fica pendente até à revisão da equipa. O código de activação é privado e não deve ser partilhado.</p>
    </form>

    {result&&<section className="artist-registration-code" aria-live="polite">
      <span>Código privado de activação</span>
      <strong>{result.activationCode}</strong>
      <p>Guarda este código juntamente com o e-mail {result.email}. Depois da aprovação, usa-o na secção seguinte para criares a tua palavra-passe. O código só pode ser utilizado uma vez.</p>
    </section>}

    <form className="admin-publish-form artist-registration-form" onSubmit={activate}>
      <h2>2 / Activar conta aprovada</h2>
      <label>E-mail usado na candidatura<input name="email" type="email" maxLength={254} autoComplete="email" required/></label>
      <label>Código privado de activação<input name="activationCode" inputMode="text" autoComplete="one-time-code" minLength={48} maxLength={48} placeholder="48 caracteres" required/></label>
      <label>Criar palavra-passe<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required/></label>
      <button className="button button-light admin-submit" type="submit" disabled={busy}>{busy?"A verificar…":"Criar conta e entrar ↗"}</button>
      <p className="admin-security-note">Esta etapa só funciona quando a equipa aprovar a tua candidatura. Se ainda estiver pendente, o site informa-te.</p>
    </form>

    {message&&<p className="admin-form-message" role="status">{message}</p>}
    <p className="artist-register-prompt">Já tens uma conta aprovada? <Link href="/artista">Entrar no estúdio ↗</Link></p>
  </main>;
}
