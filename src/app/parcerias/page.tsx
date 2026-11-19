"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function PartnershipsPage() {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form=event.currentTarget;
    const payload=Object.fromEntries(new FormData(form).entries());
    try {
      const response=await fetch("/api/parcerias",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error || "Não foi possível enviar a proposta.");
      form.reset();
      setMessage("Proposta recebida. A equipa do Código Lírico irá analisá-la.");
    } catch(error) { setMessage(error instanceof Error?error.message:"Falha no envio."); }
    finally { setBusy(false); }
  }
  return <main className="artist-auth-page">
    <Link href="/" className="admin-back-link">← Código Lírico</Link>
    <p className="section-kicker">PARCERIAS · CULTURA · IMPACTO</p>
    <h1>Vamos criar<br/><em>em conjunto.</em></h1>
    <p className="artist-auth-intro">Empresas, marcas, instituições, produtoras e organizações podem propor apoios, patrocínios, eventos, formação, divulgação ou projectos culturais.</p>
    <form className="admin-publish-form" onSubmit={submit}>
      <h2>Apresentar uma parceria</h2>
      <label>Nome do responsável<input name="contactName" autoComplete="name" maxLength={120} required/></label>
      <label>Empresa / instituição<input name="organization" maxLength={160} required/></label>
      <label>E-mail profissional<input name="email" type="email" autoComplete="email" maxLength={254} required/></label>
      <label>Telefone (opcional)<input name="phone" type="tel" autoComplete="tel" maxLength={40}/></label>
      <label>Proposta e objectivo<textarea name="proposal" rows={7} minLength={20} maxLength={5000} placeholder="Conta-nos o que pretendes construir com o Código Lírico..." required/></label>
      <label className="sr-only" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
      <button className="button button-light admin-submit" disabled={busy}>{busy?"A enviar...":"Enviar proposta ↗"}</button>
      <p className="admin-security-note">Os dados serão usados apenas para avaliar e responder a esta proposta.</p>
    </form>
    {message&&<p className="admin-form-message" role="status">{message}</p>}
  </main>;
}
