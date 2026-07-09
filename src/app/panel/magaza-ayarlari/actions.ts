"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { telefonNormallestir } from "@/lib/telefon";
import { TEZGAH_BILGISI_MAX } from "@/lib/magaza-sabitleri";
import { gecerliUrlMi } from "@/lib/url";
import { SOSYAL_PLATFORMLAR } from "@/lib/sosyal-medya";

// MagazaAyarlariForm.tsx artik dirty-state takibi icin "use client" - server
// action'lar client component dosyasinin ICINDE tanimlanamaz (bu, Next.js'in
// "use server" kuraliyla celisir), bu yuzden AYRI bir dosyaya tasindi.
export async function magazaGuncelle(formData: FormData) {
  // Sayfa zaten kontrol etti ama bu bir Server Action - dogrudan cagrilabilir,
  // bu yuzden yetki kontrolunu burada da tekrarliyoruz.
  const { session, yetkili } = await getSaticiSession();
  if (!yetkili || !session) {
    redirect("/giris");
  }

  const magaza = await getOwnMagaza(session.user.id);
  if (!magaza) {
    redirect("/panel/urun-ekle");
  }

  const ad = typeof formData.get("ad") === "string" ? (formData.get("ad") as string).trim() : "";
  const aciklamaRaw = formData.get("aciklama");
  const aciklama = typeof aciklamaRaw === "string" && aciklamaRaw.trim() ? aciklamaRaw.trim() : null;
  const whatsappRaw = formData.get("whatsappNo");
  const whatsappHam = typeof whatsappRaw === "string" ? whatsappRaw.trim() : "";
  const tezgahBilgisiRaw = formData.get("tezgahBilgisi");
  const tezgahBilgisiHam = typeof tezgahBilgisiRaw === "string" ? tezgahBilgisiRaw.trim() : "";

  if (!ad) {
    redirect(`/panel/magaza-ayarlari?hata=${encodeURIComponent("magaza adi zorunlu")}`);
  }

  let whatsappNo: string | null = null;
  if (whatsappHam) {
    whatsappNo = telefonNormallestir(whatsappHam);
    if (!whatsappNo) {
      redirect(
        `/panel/magaza-ayarlari?hata=${encodeURIComponent("gecersiz whatsapp numarasi (or. 05XX XXX XX XX bicimini deneyin)")}`,
      );
    }
  }

  if (tezgahBilgisiHam.length > TEZGAH_BILGISI_MAX) {
    redirect(
      `/panel/magaza-ayarlari?hata=${encodeURIComponent(`tezgah bilgisi en fazla ${TEZGAH_BILGISI_MAX} karakter olabilir`)}`,
    );
  }
  const tezgahBilgisi = tezgahBilgisiHam || null;

  // Sosyal medya: SOSYAL_PLATFORMLAR (instagramUrl/facebookUrl/tiktokUrl)
  // uzerinde donguyle - formdan hicbir alan gelmiyorsa (satici o platformu
  // hic eklememis/kaldirmis) null yazilir, boylece "kaldir" akisi da bu
  // ayni yoldan calisir (input DOM'dan silinince FormData'da hic gorunmez).
  const sosyalMedyaVerisi: Record<string, string | null> = {};
  for (const platform of SOSYAL_PLATFORMLAR) {
    const ham = formData.get(platform.anahtar);
    const deger = typeof ham === "string" ? ham.trim() : "";
    if (!deger) {
      sosyalMedyaVerisi[platform.anahtar] = null;
      continue;
    }
    if (!gecerliUrlMi(deger)) {
      redirect(
        `/panel/magaza-ayarlari?hata=${encodeURIComponent(`${platform.etiket} bağlantısı geçerli bir link (http/https) olmalı`)}`,
      );
    }
    sosyalMedyaVerisi[platform.anahtar] = deger;
  }

  await prisma.magaza.update({
    where: { id: magaza.id },
    data: { ad, aciklama, whatsappNo, tezgahBilgisi, ...sosyalMedyaVerisi },
  });

  redirect("/panel/magaza-ayarlari?basarili=1");
}
