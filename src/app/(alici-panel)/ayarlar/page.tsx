import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hesapSilmeTalebiBekliyorMu } from "@/lib/hesap-silme";
import { HesapSilmeTalebiButonu } from "@/components/HesapSilmeTalebiButonu";
import { AyarlarForm } from "./AyarlarForm";
import { SifreDegistirForm } from "./SifreDegistirForm";

// v1 kapsami: ad/telefon/sifre degistirme (migration/email altyapisi
// gerektirmez). "Sifremi unuttum" hala Faz 2 (email altyapisi yok). "Hesabimi
// sil" 2026-07-13'te admin-basvurulu TALEP olarak eklendi (bkz. lib/hesap-silme.ts)
// - self-servis silme degil, gercek silme email/migration ihtiyacini korur.
export default async function AyarlarSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; basarili?: string; sifreHata?: string; sifreBasarili?: string }>;
}) {
  const { hata, basarili, sifreHata, sifreBasarili } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris?next=/ayarlar");
  }

  const [kullanici, talepBekliyorMu] = await Promise.all([
    prisma.kullanici.findUnique({
      where: { id: session.user.id },
      select: { ad: true, telefon: true, email: true, sifreHash: true },
    }),
    hesapSilmeTalebiBekliyorMu(session.user.id),
  ]);
  if (!kullanici) {
    redirect("/giris?next=/ayarlar");
  }

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Ayarlar</h1>

      {hata && <p className="mt-2 text-sm text-red-600">{hata}</p>}
      {basarili && <p className="mt-2 text-sm text-green-600">Bilgileriniz kaydedildi.</p>}
      <AyarlarForm kullanici={{ ad: kullanici.ad, telefon: kullanici.telefon, email: kullanici.email }} />

      <div className="mt-8 border-t border-neutral-200 pt-6">
        <h2 className="font-semibold text-neutral-900">Şifre</h2>
        {sifreHata && <p className="mt-2 text-sm text-red-600">{sifreHata}</p>}
        {sifreBasarili && <p className="mt-2 text-sm text-green-600">Şifreniz güncellendi.</p>}
        {kullanici.sifreHash ? (
          <SifreDegistirForm />
        ) : (
          <p className="mt-2 text-sm text-neutral-500">
            Bu hesap Google ile açılmış, şifre değiştirilemez.
          </p>
        )}
      </div>

      <div className="mt-8 border-t border-neutral-200 pt-6">
        <h2 className="font-semibold text-neutral-900">Hesabımı Sil</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Hesabını ve kişisel verilerini kalıcı olarak kaldırmak istersen, talebini
          yöneticimize iletebilirsin.
        </p>
        <div className="mt-3">
          <HesapSilmeTalebiButonu talepBekliyorMu={talepBekliyorMu} />
        </div>
      </div>
    </>
  );
}
