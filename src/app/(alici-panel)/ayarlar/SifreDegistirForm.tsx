import { redirect } from "next/navigation";
import bcrypt from "bcrypt";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SIFRE_MIN_UZUNLUK = 8;

// auth.ts (Credentials provider) ve api/register/route.ts ile AYNI bcrypt
// kutuphanesi/round sayisi (10). Mevcut sifreyi bilerek degistirme - email
// gondermeden yapilabilen tek sifre-degisikligi turu (bkz. "Sifremi unuttum"
// Faz 2 notu, page.tsx).
async function sifreDegistir(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }

  const mevcutSifre = typeof formData.get("mevcutSifre") === "string" ? (formData.get("mevcutSifre") as string) : "";
  const yeniSifre = typeof formData.get("yeniSifre") === "string" ? (formData.get("yeniSifre") as string) : "";
  const yeniSifreTekrar =
    typeof formData.get("yeniSifreTekrar") === "string" ? (formData.get("yeniSifreTekrar") as string) : "";

  if (yeniSifre.length < SIFRE_MIN_UZUNLUK) {
    redirect(`/ayarlar?sifreHata=${encodeURIComponent(`yeni şifre en az ${SIFRE_MIN_UZUNLUK} karakter olmalı`)}`);
  }
  if (yeniSifre !== yeniSifreTekrar) {
    redirect(`/ayarlar?sifreHata=${encodeURIComponent("yeni şifreler eşleşmiyor")}`);
  }

  const kullanici = await prisma.kullanici.findUnique({
    where: { id: session.user.id },
    select: { sifreHash: true },
  });
  if (!kullanici?.sifreHash) {
    redirect(`/ayarlar?sifreHata=${encodeURIComponent("bu hesabın şifresi yok")}`);
  }

  const dogruMu = await bcrypt.compare(mevcutSifre, kullanici.sifreHash);
  if (!dogruMu) {
    redirect(`/ayarlar?sifreHata=${encodeURIComponent("mevcut şifre yanlış")}`);
  }

  const yeniSifreHash = await bcrypt.hash(yeniSifre, 10);
  await prisma.kullanici.update({ where: { id: session.user.id }, data: { sifreHash: yeniSifreHash } });

  redirect("/ayarlar?sifreBasarili=1");
}

export function SifreDegistirForm() {
  return (
    <form action={sifreDegistir} className="mt-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Mevcut Şifre
          <input
            name="mevcutSifre"
            type="password"
            required
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Yeni Şifre
          <input
            name="yeniSifre"
            type="password"
            required
            minLength={SIFRE_MIN_UZUNLUK}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Yeni Şifre (Tekrar)
          <input
            name="yeniSifreTekrar"
            type="password"
            required
            minLength={SIFRE_MIN_UZUNLUK}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <button
        type="submit"
        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
      >
        Şifreyi Güncelle
      </button>
    </form>
  );
}
