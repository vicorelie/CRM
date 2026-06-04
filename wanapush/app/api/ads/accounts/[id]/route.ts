import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const acc = await prisma.adAccount.findFirst({
    where: { id: params.id, user: { email: session.user.email } },
  });
  if (!acc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await prisma.adAccount.delete({ where: { id: acc.id } });
  revalidatePath("/ads");
  return NextResponse.json({ ok: true });
}
