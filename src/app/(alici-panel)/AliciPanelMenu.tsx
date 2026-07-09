"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Heart, Store, Star, MessageSquare, Bell, Settings, Flag } from "lucide-react";

// Tek bilesen, CSS breakpoint ile iki gorunum (drawer/off-canvas YOK):
// mobilde (<md) ustte yatay kaydirilabilir sekme cubugu, masaustunde (md:)
// sol sabit dikey liste. Aktif link usePathname() ile belirlenir - bu bilesen
// (alici-panel)/layout.tsx icinde render edildigi icin (TUM alt sayfalarda
// ortak), route-ozel bir "aktif" prop'u alacak yeri yok (AdminNav.tsx'teki
// prop-bazli desenin aksine, bkz. plan notu).
const OGELER = [
  { etiket: "Rezervasyonlarım", href: "/rezervasyonum", ikon: ShoppingBag },
  { etiket: "Favorilerim", href: "/favorilerim", ikon: Heart },
  { etiket: "Takip Ettiğim Tezgahlar", href: "/takip-ettigim-magazalar", ikon: Store },
  { etiket: "Ürün Değerlendirmelerim", href: "/degerlendirmelerim/urunler", ikon: Star },
  { etiket: "Tezgah Değerlendirmelerim", href: "/degerlendirmelerim/magazalar", ikon: MessageSquare },
  { etiket: "Şikayetlerim", href: "/sikayetlerim", ikon: Flag },
  { etiket: "Bildirimlerim", href: "/bildirimlerim", ikon: Bell },
  { etiket: "Ayarlar", href: "/ayarlar", ikon: Settings },
];

export function AliciPanelMenu() {
  const pathname = usePathname();
  const aktifRef = useRef<HTMLAnchorElement>(null);

  // Mobilde yatay kaydirmali seritte aktif oge her zaman en solda/gorunur
  // alanda baslasin - aksi halde kullanici "Favorilerim"e tiklayinca sonraki
  // ogeleri gormek icin manuel kaydirmaya devam etmek zorunda kalirdi.
  // "start" hem yatay (mobil) hem dikey (masaustu) eksende ogeyi konteynerin
  // basina hizalar, ikisinde de dogru davranir.
  useEffect(() => {
    aktifRef.current?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, [pathname]);

  return (
    <nav className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:mb-0 md:w-56 md:shrink-0 md:flex-col md:overflow-visible md:px-0 md:pb-0">
      {OGELER.map((oge) => {
        const secili = pathname === oge.href || pathname.startsWith(`${oge.href}/`);
        const Ikon = oge.ikon;
        return (
          <Link
            key={oge.href}
            ref={secili ? aktifRef : undefined}
            href={oge.href}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
              secili ? "bg-primary-50 text-primary-700" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <Ikon className="h-4 w-4" strokeWidth={2} />
            {oge.etiket}
          </Link>
        );
      })}
    </nav>
  );
}
