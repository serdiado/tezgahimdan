import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const ad = typeof body.ad === "string" ? body.ad.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!ad || !email || !password) {
    return NextResponse.json({ hata: "ad, email ve password zorunlu" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ hata: "sifre en az 8 karakter olmali" }, { status: 400 });
  }

  // Zaten var olan (Google'dan gelmis dahil) bir kayda sessizce sifre eklemiyoruz -
  // aksi halde birisi baskasinin Google'la olusturdugu hesaba kendi sifresini
  // dayatabilir. Var olan e-posta = net "zaten kayitli" hatasi.
  const mevcut = await prisma.kullanici.findUnique({ where: { email } });
  if (mevcut) {
    return NextResponse.json({ hata: "bu e-posta zaten kayitli" }, { status: 409 });
  }

  const sifreHash = await bcrypt.hash(password, 10);
  const kullanici = await prisma.kullanici.create({
    data: { ad, email, sifreHash, rol: "alici" },
  });

  return NextResponse.json({ id: kullanici.id, email: kullanici.email }, { status: 201 });
}
