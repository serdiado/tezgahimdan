import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Store,
  Landmark,
  Tags,
  MessageSquareWarning,
  ShieldAlert,
  History,
  Users,
  Star,
  ShoppingBag,
  ShieldQuestion,
  Settings,
  Megaphone,
  LayoutTemplate,
  PanelsTopLeft,
} from "lucide-react";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";

const YEDI_GUN_MS = 7 * 24 * 60 * 60 * 1000;

// react-hooks/purity: Date.now() dogrudan bilesen govdesinde "impure call" olarak
// isaretleniyor (React Compiler kurali, async Server Component'i ayirt etmiyor).
// Yardimci fonksiyona tasimak yeterli - kural sadece bilesenin kendi govdesini tarar.
function yediGunOncesi(): Date {
  return new Date(Date.now() - YEDI_GUN_MS);
}

export default async function AdminSayfasi() {
  const { session, yetkili } = await getAdminSession();
  if (!session) {
    redirect("/giris");
  }

  let icerik;
  if (!yetkili) {
    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Yetkisiz Erişim</h1>
        <p className="mt-1 text-neutral-600">Bu sayfaya sadece yönetici hesapları erişebilir.</p>
      </>
    );
  } else {
    const yediGunOnce = yediGunOncesi();
    const [
      toplamMagaza,
      yeniMagaza,
      bekleyenSikayet,
      anlasmazlikSayisi,
      haftalikRezervasyon,
      haftalikSatis,
      enCokUrunluMagazalar,
    ] = await Promise.all([
      prisma.magaza.count({ where: { silindiMi: false } }),
      prisma.magaza.count({ where: { silindiMi: false, createdAt: { gte: yediGunOnce } } }),
      prisma.sikayet.count({ where: { durum: "bekliyor" } }),
      prisma.durumGecmisi.count({ where: { olay: { startsWith: "geri_alma_reddedildi:" } } }),
      prisma.rezervasyon.count({ where: { createdAt: { gte: yediGunOnce } } }),
      prisma.rezervasyon.count({ where: { durum: "satildi", createdAt: { gte: yediGunOnce } } }),
      prisma.$queryRaw<{ id: string; ad: string; slug: string; rezervasyonSayisi: bigint }[]>`
        SELECT m.id, m.ad, m.slug, COUNT(r.id) AS "rezervasyonSayisi"
        FROM "Magaza" m
        JOIN "Urun" u ON u."magazaId" = m.id
        JOIN "Rezervasyon" r ON r."urunId" = u.id
        WHERE m."silindiMi" = false
        GROUP BY m.id, m.ad, m.slug
        ORDER BY "rezervasyonSayisi" DESC
        LIMIT 5
      `,
    ]);

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Yönetim Paneli</h1>
        <p className="mt-1 text-neutral-600">Merhaba {session.user.name}.</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <IstatistikKarti
            baslik="Aktif Mağaza"
            deger={toplamMagaza}
            altYazi={`${yeniMagaza} yeni (son 7 gün)`}
          />
          <IstatistikKarti
            baslik="Bekleyen Şikayet"
            deger={bekleyenSikayet}
            altYazi="Henüz incelenmedi"
          />
          <IstatistikKarti
            baslik="Anlaşmazlık Kaydı"
            deger={anlasmazlikSayisi}
            altYazi="Reddedilen geri alma talepleri (bilgi amaçlı)"
          />
          <IstatistikKarti
            baslik="Rezervasyon (son 7 gün)"
            deger={haftalikRezervasyon}
            altYazi="Yeni oluşturulan"
          />
          <IstatistikKarti
            baslik="Satış (son 7 gün)"
            deger={haftalikSatis}
            altYazi="Durum: satıldı"
          />
        </div>

        {enCokUrunluMagazalar.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-neutral-900">En Aktif Mağazalar</h2>
            <p className="text-xs text-neutral-400">Toplam rezervasyon sayısına göre</p>
            <ul className="mt-2 space-y-1 text-sm">
              {enCokUrunluMagazalar.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <Link href={`/admin/magazalar/${m.id}`} className="text-primary-600 hover:underline">
                    {m.ad}
                  </Link>
                  <span className="text-neutral-500">{Number(m.rezervasyonSayisi)} rezervasyon</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AdminKart
            href="/admin/magazalar"
            ikon={Store}
            baslik="Mağazalar"
            aciklama="Görünürlük, moderasyon"
          />
          <AdminKart
            href="/admin/kullanicilar"
            ikon={Users}
            baslik="Kullanıcılar"
            aciklama="Listele, ara, incele"
          />
          <AdminKart
            href="/admin/rezervasyonlar"
            ikon={ShoppingBag}
            baslik="Rezervasyonlar"
            aciklama="Platform geneli arama (salt okunur)"
          />
          <AdminKart
            href="/admin/guvenilirlik"
            ikon={ShieldQuestion}
            baslik="Güvenilirlik"
            aciklama="Kısıtlı kullanıcılar, sıfırlama"
          />
          <AdminKart
            href="/admin/ayarlar"
            ikon={Settings}
            baslik="Platform Ayarları"
            aciklama="Güvenilirlik eşiği, yedek kuyruk"
          />
          <AdminKart
            href="/admin/duyuru"
            ikon={Megaphone}
            baslik="Duyuru Gönder"
            aciklama="Toplu site-içi bildirim"
          />
          <AdminKart
            href="/admin/anasayfa"
            ikon={LayoutTemplate}
            baslik="Anasayfa Görünümü"
            aciklama="Hero, modül sırası ve ayarları"
          />
          <AdminKart
            href="/admin/magaza-sablonu"
            ikon={PanelsTopLeft}
            baslik="Mağaza Şablonu"
            aciklama="Hero bileşen sırası (tüm mağazalar)"
          />
          <AdminKart
            href="/admin/pazarlar"
            ikon={Landmark}
            baslik="Pazarlar"
            aciklama="Gün, saat, sıfırlama"
          />
          <AdminKart
            href="/admin/kategoriler"
            ikon={Tags}
            baslik="Kategoriler"
            aciklama="Ekle, düzenle, kaldır"
          />
          <AdminKart
            href="/admin/sikayetler"
            ikon={MessageSquareWarning}
            baslik="Şikayetler"
            aciklama="Moderasyon"
          />
          <AdminKart
            href="/admin/degerlendirmeler"
            ikon={Star}
            baslik="Değerlendirmeler"
            aciklama="Yorum moderasyonu"
          />
          <AdminKart
            href="/admin/anlasmazliklar"
            ikon={ShieldAlert}
            baslik="Anlaşmazlıklar"
            aciklama="Salt okunur triyaj"
          />
          <AdminKart
            href="/admin/denetim-kaydi"
            ikon={History}
            baslik="Denetim Kaydı"
            aciklama="Kim, ne zaman, ne yaptı"
          />
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">{icerik}</main>
    </div>
  );
}

function IstatistikKarti({
  baslik,
  deger,
  altYazi,
}: {
  baslik: string;
  deger: number;
  altYazi: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm text-neutral-500">{baslik}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-900">{deger}</p>
      <p className="mt-1 text-xs text-neutral-400">{altYazi}</p>
    </div>
  );
}

function AdminKart({
  href,
  ikon: Ikon,
  baslik,
  aciklama,
}: {
  href?: string;
  ikon: LucideIcon;
  baslik: string;
  aciklama: string;
}) {
  const devreDisi = !href;
  const govde = (
    <>
      <Ikon className={`h-8 w-8 ${devreDisi ? "text-neutral-300" : "text-primary-600"}`} strokeWidth={1.75} />
      <div>
        <p className={`font-semibold ${devreDisi ? "text-neutral-400" : "text-neutral-900"}`}>{baslik}</p>
        <p className="text-sm text-neutral-400">{aciklama}</p>
      </div>
    </>
  );
  if (devreDisi) {
    return (
      <div className="flex cursor-not-allowed items-center gap-3 rounded-2xl bg-white p-4 opacity-60 shadow-sm">
        {govde}
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      {govde}
    </Link>
  );
}
