import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";

const DURUMLAR = ["bekliyor", "satildi", "gelmedi", "iptal"] as const;

// Admin/rezervasyonlar sayfasindaki AYNI filtreleri (durum/magazaId/q) kabul
// eder, sonucu CSV olarak indirir. Excel'de Turkce karakterler dogru
// gorunsun diye UTF-8 BOM eklenir (Excel'in klasik davranisi).
function csvHucre(deger: string): string {
  if (deger.includes(",") || deger.includes('"') || deger.includes("\n")) {
    return `"${deger.replace(/"/g, '""')}"`;
  }
  return deger;
}

export async function GET(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return new Response("yetkisiz", { status: 403 });
  }

  const url = new URL(request.url);
  const durum = url.searchParams.get("durum");
  const magazaId = url.searchParams.get("magazaId");
  const q = url.searchParams.get("q")?.trim();

  const gecerliDurum = durum && (DURUMLAR as readonly string[]).includes(durum) ? (durum as (typeof DURUMLAR)[number]) : undefined;

  const where = {
    ...(gecerliDurum ? { durum: gecerliDurum } : {}),
    ...(magazaId ? { urun: { magazaId } } : {}),
    ...(q
      ? {
          OR: [
            { rezervKodu: { contains: q, mode: "insensitive" as const } },
            { alici: { ad: { contains: q, mode: "insensitive" as const } } },
            { alici: { telefon: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const rezervasyonlar = await prisma.rezervasyon.findMany({
    where,
    include: {
      alici: { select: { ad: true, telefon: true } },
      urun: { select: { baslik: true, magaza: { select: { ad: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const basliklar = ["Kod", "Ürün", "Mağaza", "Alıcı", "Telefon", "Tip", "Sıra", "Durum", "Tarih"];
  const satirlar = rezervasyonlar.map((r) =>
    [
      r.rezervKodu,
      r.urun.baslik,
      r.urun.magaza.ad,
      r.alici.ad,
      r.alici.telefon ?? "",
      r.tip,
      String(r.siraNo),
      r.durum,
      r.createdAt.toISOString(),
    ]
      .map(csvHucre)
      .join(","),
  );
  const csv = [basliklar.join(","), ...satirlar].join("\n");

  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rezervasyonlar.csv"`,
    },
  });
}
