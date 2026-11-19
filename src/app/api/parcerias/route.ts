import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { partnerRequests } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ ok: true });
  const contactName = typeof body.contactName === "string" ? body.contactName.trim() : "";
  const organization = typeof body.organization === "string" ? body.organization.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const proposal = typeof body.proposal === "string" ? body.proposal.trim() : "";
  if (contactName.length < 2 || contactName.length > 120 || organization.length < 2 || organization.length > 160 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      phone.length > 40 || proposal.length < 20 || proposal.length > 5000) {
    return NextResponse.json({ error: "Confirma os dados e escreve uma proposta com pelo menos 20 caracteres." }, { status: 400 });
  }
  await db.insert(partnerRequests).values({
    id: randomUUID(), contactName, organization, email, phone, proposal,
    status: "pending", createdAt: new Date(), reviewedBy: null, decisionNote: "", updatedAt: new Date(),
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
