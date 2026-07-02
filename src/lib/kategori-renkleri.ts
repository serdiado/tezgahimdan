import { Gem, Shirt, Cookie, Sparkles, type LucideIcon } from "lucide-react";

// Kategori etiketleri icin sabit, kucuk bir renk paleti. Marka rengi (primary,
// bkz. globals.css) sadece ana CTA/aksiyonlar icin; kategoriler PLAN.md'nin
// dedigi gibi kendi (serin tonlu da dahil) renklerini korur, bu yuzden burada
// Tailwind'in kendi hazir pink/green/yellow/purple/blue skalalarini kullaniyoruz -
// yeniden tanimlamaya gerek yok, sadece badge icin bg/text/border eslemesi.
export type KategoriRenk = {
  bg: string;
  text: string;
  border: string;
};

const KATEGORI_PALETI: readonly KategoriRenk[] = [
  { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
  { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" },
  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
];

// Kategori listesinin sirasina (index'e) gore degil, kategorinin kendi id'sine
// gore secim yapariz - liste filtrelenip/siralanip yeniden render edilse bile
// ayni kategori her zaman ayni rengi alsin diye.
function basitHash(metin: string): number {
  let h = 0;
  for (let i = 0; i < metin.length; i++) {
    h = (h * 31 + metin.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function kategoriRengiSec(kategoriId: string): KategoriRenk {
  return KATEGORI_PALETI[basitHash(kategoriId) % KATEGORI_PALETI.length];
}

// Kategoriler admin tarafindan sonradan eklenebildigi icin (bkz. PLAN.md SS2D)
// sabit bir enum degil - bilinen tohum kategoriler (prisma/seed.js) icin
// anlamli birer ikon, taninmayan/ileride eklenecek kategoriler icin genel bir
// ikona (Sparkles) dususuz.
const BILINEN_KATEGORI_IKONLARI: Record<string, LucideIcon> = {
  Taki: Gem,
  Orgu: Shirt,
  Recel: Cookie,
};

export function kategoriIkonuSec(kategoriAdi: string): LucideIcon {
  return BILINEN_KATEGORI_IKONLARI[kategoriAdi] ?? Sparkles;
}
