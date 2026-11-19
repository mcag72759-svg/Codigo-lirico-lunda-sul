import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistMedia } from "@/lib/db/schema";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const [item]=await db.select({url:artistMedia.mediaUrl,title:artistMedia.title,mime:artistMedia.mimeType,allowed:artistMedia.downloadAllowed})
 .from(artistMedia).where(and(eq(artistMedia.id,id),eq(artistMedia.status,"approved"),eq(artistMedia.downloadAllowed,true))).limit(1);
 if(!item)return NextResponse.json({error:"Ficheiro indisponível para download."},{status:404});
 try {
  const source=await fetch(item.url,{cache:"no-store"});
  if(!source.ok||!source.body)return NextResponse.json({error:"Não foi possível obter o ficheiro."},{status:502});
  const safeName=item.title.replace(/[\r\n"]/g,"").slice(0,140)||"ficheiro";
  return new Response(source.body,{headers:{"Content-Type":item.mime||"application/octet-stream","Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,"Cache-Control":"public, max-age=3600","X-Content-Type-Options":"nosniff"}});
 }catch{return NextResponse.json({error:"Falha no download."},{status:502});}
}
