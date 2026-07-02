import { NextResponse } from "next/server";
import { rezervasyonSorgula } from "@/lib/rezervasyon";
import { telefonNormallestir } from "@/lib/telefon";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rezervKodu =
    typeof body?.rezervKodu === "string" ? body.rezervKodu.trim().toUpperCase() : "";
  const telefonHam = typeof body?.telefon === "string" ? body.telefon.trim() : "";

  if (!rezervKodu || !telefonHam) {
    return NextResponse.json({ hata: "rezervKodu ve telefon zorunlu" }, { status: 400 });
  }
  const telefon = telefonNormallestir(telefonHam);
  if (!telefon) {
    return NextResponse.json({ hata: "gecersiz telefon" }, { status: 400 });
  }

  const rez = await rezervasyonSorgula({ rezervKodu, telefon });
  if (!rez) {
    return NextResponse.json({ hata: "rezervasyon bulunamadi" }, { status: 404 });
  }
  return NextResponse.json(rez);
}
