import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

// Next.js standalone/Turbopack sunucusu public/ altindaki statik dosya
// listesini konteyner ACILIRKEN sabitliyor - bind-mount edilmis
// public/uploads/ dizinine CALISMA ANINDA (yeni bir yukleme ile) eklenen
// dosyalar bu yuzden statik olarak taninmiyor, 404'e dusup onbellege
// aliniyor (konteyner yeniden baslatilana kadar duzelmiyor - canli
// dogrulandi). Bu route /uploads/* icin dinamik bir fallback: her istekte
// diski taze okur, restart bagimliligini tamamen kaldirir. DB'deki
// /uploads/<altDizin>/<dosya> yollari degismeden calismaya devam eder -
// eski (konteyner acilmadan once var olan) dosyalar zaten Next'in hizli
// statik yoluyla servis ediliyor, bu route sadece onun taniyamadigi
// (yeni) dosyalar icin devreye giriyor.

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const IZINLI_ALT_DIZINLER = new Set(["urunler", "magaza-kroki", "site-icerik", "pazar", "duyuru"]);
const UZANTI_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dosyaYolu: string[] }> },
) {
  const { dosyaYolu } = await params;

  if (dosyaYolu.length !== 2) {
    return new NextResponse(null, { status: 404 });
  }
  const [altDizin, dosyaAdi] = dosyaYolu;

  if (!IZINLI_ALT_DIZINLER.has(altDizin) || dosyaAdi.includes("..") || dosyaAdi.includes("/")) {
    return new NextResponse(null, { status: 404 });
  }

  const uzanti = dosyaAdi.split(".").pop()?.toLowerCase() ?? "";
  const contentType = UZANTI_CONTENT_TYPE[uzanti];
  if (!contentType) {
    return new NextResponse(null, { status: 404 });
  }

  const tamYol = path.join(UPLOAD_ROOT, altDizin, dosyaAdi);
  // Path traversal son savunma hatti: cozumlenmis yol UPLOAD_ROOT disina cikmamali.
  if (!tamYol.startsWith(UPLOAD_ROOT + path.sep)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const [buffer, bilgi] = await Promise.all([readFile(tamYol), stat(tamYol)]);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bilgi.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Last-Modified": bilgi.mtime.toUTCString(),
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
