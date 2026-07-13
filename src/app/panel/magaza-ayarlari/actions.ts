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
  // Kurulum modu (tezgah acilisindan hemen sonra): hata donuslerinde mod
  // kaybolmasin, basarili kayitta ise ilk-urun-ekleme adimina gecilsin.
  const kurulumModu = formData.get("kurulum") === "1";
  const hataUrl = (mesaj: string) =>
    `/panel/magaza-ayarlari?${kurulumModu ? "kurulum=1&" : ""}hata=${encodeURIComponent(mesaj)}`;

  if (!ad) {
    redirect(hataUrl("tezgah adı zorunlu"));
  }

  // WhatsApp ZORUNLU (2026-07-11 karari, magaza-ac ile ayni kural): platformun
  // ana iletisim vaadi bu - tezgah WhatsApp'siz kalamaz.
  if (!whatsappHam) {
    redirect(hataUrl("WhatsApp numarası zorunlu — alıcılar sana buradan ulaşacak"));
  }
  const whatsappNo = telefonNormallestir(whatsappHam);
  if (!whatsappNo) {
    redirect(hataUrl("geçersiz WhatsApp numarası (ör. 05XX XXX XX XX biçimini deneyin)"));
  }

  if (tezgahBilgisiHam.length > TEZGAH_BILGISI_MAX) {
    redirect(hataUrl(`tezgah bilgisi en fazla ${TEZGAH_BILGISI_MAX} karakter olabilir`));
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
      redirect(hataUrl(`${platform.etiket} bağlantısı geçerli bir link (http/https) olmalı`));
    }
    sosyalMedyaVerisi[platform.anahtar] = deger;
  }

  await prisma.magaza.update({
    where: { id: magaza.id },
    data: { ad, aciklama, whatsappNo, tezgahBilgisi, ...sosyalMedyaVerisi },
  });

  // Kurulumda kayit = tanitim tamam -> sirada ilk urun. Normal kullanimda
  // ayni sayfada kalinir.
  redirect(kurulumModu ? "/panel/urun-ekle" : "/panel/magaza-ayarlari?basarili=1");
}
