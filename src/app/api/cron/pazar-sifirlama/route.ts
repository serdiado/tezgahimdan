import { NextResponse } from "next/server";
import { pazarlariSifirla } from "@/lib/rezervasyon";

// Harici cron (Docker/VPS) her ~5 dk cagirir:
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
//        https://.../api/cron/pazar-sifirlama
// Zamana degil DURUMA bakar (kapanis vakti gecmis + hala bekleyen) - restart'ta
// kacmaz, cift tetiklemede idempotent (kilit + durum kontrolu).
export async function POST(request: Request) {
  const gizli = process.env.CRON_SECRET;
  if (!gizli) {
    return NextResponse.json({ hata: "CRON_SECRET tanimli degil" }, { status: 500 });
  }
  const authz = request.headers.get("authorization");
  if (authz !== `Bearer ${gizli}`) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 401 });
  }

  const sonuc = await pazarlariSifirla();
  return NextResponse.json({ ...sonuc });
}
