import { NextResponse } from "next/server";
import { pazarHatirlatmalariGonder, pazarlariSifirla, saticiIhmalUyarilariGonder } from "@/lib/rezervasyon";

// Harici cron (Docker/VPS) her ~5 dk cagirir:
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
//        https://.../api/cron/pazar-sifirlama
// Zamana degil DURUMA bakar (kapanis vakti gecmis + hala bekleyen) - restart'ta
// kacmaz, cift tetiklemede idempotent (kilit + durum kontrolu).
//
// 2026-07-09 karari sonrasi (bkz. rezervasyon.ts urunSifirla yorumu): pazar
// baslangicinda aktif + isaretlenmemis rezervasyonlar ARTIK otomatik "gelmedi"
// olmuyor - satici bizzat isaretleyene kadar "bekliyor" kalir (panel/layout.tsx
// zorunlu ekrani). Bu yuzden burada eskiden olan "otomatik gelmedi ozeti
// saticiya + takipcilere bildirim" bloklari TAMAMEN KALDIRILDI (dead code
// olurlardi - pazarlariSifirla artik hic no-show uretmiyor). Yerine 3-gunluk
// admin uyarisi eklendi (saticiIhmalUyarilariGonder).
export async function POST(request: Request) {
  const gizli = process.env.CRON_SECRET;
  if (!gizli) {
    return NextResponse.json({ hata: "CRON_SECRET tanimli degil" }, { status: 500 });
  }
  const authz = request.headers.get("authorization");
  if (authz !== `Bearer ${gizli}`) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 401 });
  }

  const hatirlatmaSonucu = await pazarHatirlatmalariGonder();
  const sonuc = await pazarlariSifirla();
  const ihmalSonucu = await saticiIhmalUyarilariGonder();

  return NextResponse.json({ ...sonuc, hatirlatma: hatirlatmaSonucu, ihmalUyarisi: ihmalSonucu });
}
