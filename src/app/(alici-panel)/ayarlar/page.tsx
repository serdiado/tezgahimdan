import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AyarlarForm } from "./AyarlarForm";
import { SifreDegistirForm } from "./SifreDegistirForm";

// v1 kapsami: ad/telefon/sifre degistirme (migration/email altyapisi
// gerektirmez). "Sifremi unuttum" ve "hesabimi sil" bilincli olarak Faz 2'ye
// birakildi (bkz. docs/mimari - email gonderme altyapisi yok, Kullanici'de
// silindiMi alani yok).
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

  const kullanici = await prisma.kullanici.findUnique({
    where: { id: session.user.id },
    select: { ad: true, telefon: true, email: true, sifreHash: true },
  });
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
    </>
  );
}
