import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications, communityPosts, artistMedia } from "@/lib/db/schema";
import { getAdminSession } from "@/lib/security/admin-session";
import { hasPermission } from "@/lib/security/permissions";
export const runtime="nodejs";
export async function GET(){
 const admin=await getAdminSession();if(!hasPermission(admin,"content.publish"))return NextResponse.json({error:"Sem autorização."},{status:403});
 const rows=await db.select({id:communityPosts.id,body:communityPosts.body,mediaUrl:communityPosts.mediaUrl,mediaType:communityPosts.mediaType,status:communityPosts.status,createdAt:communityPosts.createdAt,author:artistApplications.stageName})
 .from(communityPosts).innerJoin(artistApplications,eq(communityPosts.authorId,artistApplications.id)).orderBy(desc(communityPosts.createdAt)).limit(100);
 const media=await db.select({id:artistMedia.id,title:artistMedia.title,kind:artistMedia.kind,url:artistMedia.mediaUrl,status:artistMedia.status,createdAt:artistMedia.createdAt,artist:artistApplications.stageName}).from(artistMedia).innerJoin(artistApplications,eq(artistMedia.applicationId,artistApplications.id)).orderBy(desc(artistMedia.createdAt)).limit(100);
 return NextResponse.json({posts:rows,media});
}
export async function PATCH(request:Request){
 const admin=await getAdminSession();if(!hasPermission(admin,"content.publish"))return NextResponse.json({error:"Sem autorização."},{status:403});
 let body:Record<string,unknown>;try{body=await request.json()}catch{return NextResponse.json({error:"Pedido inválido."},{status:400})}
 const id=typeof body.id==="string"?body.id:"",status=body.status,kind=body.kind;
 if(!id||!(status==="approved"||status==="rejected"))return NextResponse.json({error:"Estado inválido."},{status:400});
 if(kind==="media") await db.update(artistMedia).set({status,reviewedAt:new Date()}).where(eq(artistMedia.id,id));
 else await db.update(communityPosts).set({status,updatedAt:new Date()}).where(eq(communityPosts.id,id));
 return NextResponse.json({ok:true});
}
