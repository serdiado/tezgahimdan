import type { ComponentType } from "react";
import { InstagramIkon, FacebookIkon, TiktokIkon } from "@/components/SosyalMedyaIkonlari";

// Sabit 3 platform (2026-07-10 kullanici karari: serbest liste degil, sabit
// secenekler + "ekle" akisi). Hem MagazaAyarlariForm (satici formu) hem
// MagazaHero (vitrin) AYNI listeyi kullanir - platform eklenirse (ör. YouTube)
// TEK yerden buraya eklenir, iki yerde ayri ayri guncellenmez. `anahtar`
// degerleri Magaza modelindeki kolon adlariyla BIREBIR ayni olmali.
export type SosyalPlatformAnahtari = "instagramUrl" | "facebookUrl" | "tiktokUrl";

export const SOSYAL_PLATFORMLAR: {
  anahtar: SosyalPlatformAnahtari;
  etiket: string;
  placeholder: string;
  Ikon: ComponentType<{ className?: string }>;
}[] = [
  { anahtar: "instagramUrl", etiket: "Instagram", placeholder: "https://instagram.com/kullaniciadi", Ikon: InstagramIkon },
  { anahtar: "facebookUrl", etiket: "Facebook", placeholder: "https://facebook.com/sayfaadi", Ikon: FacebookIkon },
  { anahtar: "tiktokUrl", etiket: "TikTok", placeholder: "https://tiktok.com/@kullaniciadi", Ikon: TiktokIkon },
];
