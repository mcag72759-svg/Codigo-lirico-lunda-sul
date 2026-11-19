"use client";
import Link from "next/link";
import {useEffect,useState,type FormEvent} from "react";
type Comment={id:string;body:string;author:string;createdAt:string};
export default function CommentsPage({params}:{params:Promise<{id:string}>}){
 const [id,setId]=useState(""),[comments,setComments]=useState<Comment[]>([]),[body,setBody]=useState(""),[message,setMessage]=useState("");
 useEffect(()=>{params.then(p=>setId(p.id))},[params]);
 useEffect(()=>{if(!id)return;fetch(`/api/comunidade/publicacoes/${id}/comentarios`).then(r=>r.json()).then(d=>setComments(d.comments||[])).catch(()=>setMessage("Não foi possível carregar comentários."))},[id]);
 async function submit(e:FormEvent){e.preventDefault();const r=await fetch(`/api/comunidade/publicacoes/${id}/comentarios`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body})});const d=await r.json();if(!r.ok){setMessage(d.error);return}setBody("");const next=await fetch(`/api/comunidade/publicacoes/${id}/comentarios`).then(x=>x.json());setComments(next.comments||[])}
 return <main className="artist-auth-page"><Link href="/comunidade" className="admin-back-link">← Comunidade</Link><p className="section-kicker">CONVERSA DA COMUNIDADE</p><h1>Comentários.</h1><form className="admin-publish-form" onSubmit={submit}><label>Escreve um comentário<textarea rows={3} maxLength={2000} value={body} onChange={e=>setBody(e.target.value)} required/></label><button className="button button-light admin-submit">Enviar comentário</button></form>{message&&<p role="status">{message}</p>}<section className="community-feed">{comments.map(c=><article className="community-post" key={c.id}><strong>{c.author}</strong><p>{c.body}</p><time>{new Date(c.createdAt).toLocaleString("pt-PT")}</time></article>)}</section></main>
}
