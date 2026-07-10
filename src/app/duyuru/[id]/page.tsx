import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { DuyuruMarkdown } from "@/components/DuyuruMarkdown";

const tarihFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

// Duyuru turune gore kucuk etiket (kutsal kural admin'de gecerli degil ama
// bu sayfa ALICI/SATICIYA gorunur - yeni aksan rengi eklemeden mevcut paletle).
const TUR_ETIKETI: Record<string, { etiket: string; sinif: string }> = {
  bilgi: { etiket: "Bilgi", sinif: "bg-neutral-100 text-neutral-600" },
  egitim: { etiket: "Eğitim", sinif: "bg-primary-50 text-primary-700" },
  uyari: { etiket: "Uyarı", sinif: "bg-amber-100 text-amber-800" },
};

// Bildirim pointer'i (/duyuru/[id]) buraya getirir. Sadece YAYINLANMIS +
// silinmemis duyuru gorunur (taslak/kaldirilmis -> 404). Giris zorunlu (her
// rol) - duyuru linki zaten yalnizca hedef kitleye Bildirim ile dagitilir,
// ama URL paylasilirsa da en azindan giris ister.
export default async function DuyuruDetaySayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/giris?next=/duyuru/${id}`);
  }

  const duyuru = await prisma.duyuru.findFirst({
    where: { id, silindiMi: false, yayinlandiMi: true },
    select: {
      baslik: true,
      govde: true,
      gorselUrl: true,
      tur: true,
      yayinTarihi: true,
      baglantiUrl: true,
      baglantiMetni: true,
    },
  });
  if (!duyuru) {
    notFound();
  }

  const tur = TUR_ETIKETI[duyuru.tur] ?? TUR_ETIKETI.bilgi;

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/bildirimlerim" className="text-sm text-primary-600 hover:underline">
          ← Bildirimlerim
        </Link>
        <article className="mt-3 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tur.sinif}`}>{tur.etiket}</span>
            {duyuru.yayinTarihi && (
              <span className="text-xs text-neutral-400">{tarihFormat.format(duyuru.yayinTarihi)}</span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold text-neutral-900">{duyuru.baslik}</h1>
          {duyuru.gorselUrl && (
            <img
              src={duyuru.gorselUrl}
              alt={duyuru.baslik}
              className="mt-4 w-full rounded-xl object-cover"
            />
          )}
          <div className="mt-4">
            <DuyuruMarkdown govde={duyuru.govde} />
          </div>
          {duyuru.baglantiUrl && (
            <a
              href={duyuru.baglantiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              {duyuru.baglantiMetni?.trim() || "Bağlantıya Git"}
            </a>
          )}
        </article>
      </main>
    </div>
  );
}
