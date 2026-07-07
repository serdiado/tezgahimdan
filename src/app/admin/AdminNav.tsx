import Link from "next/link";

// Paylasilan admin alt-navigasyonu. Sadece yetki kontrolu basarili sayfalarda
// render edilir (gate her sayfanin kendi icinde, satici panel deseniyle ayni -
// bkz. src/app/panel/*).
const OGELER: { anahtar: string; etiket: string; href?: string }[] = [
  { anahtar: "panel", etiket: "Panel", href: "/admin" },
  { anahtar: "magazalar", etiket: "Mağazalar", href: "/admin/magazalar" },
  { anahtar: "kullanicilar", etiket: "Kullanıcılar", href: "/admin/kullanicilar" },
  { anahtar: "rezervasyonlar", etiket: "Rezervasyonlar", href: "/admin/rezervasyonlar" },
  { anahtar: "guvenilirlik", etiket: "Güvenilirlik", href: "/admin/guvenilirlik" },
  { anahtar: "pazarlar", etiket: "Pazarlar", href: "/admin/pazarlar" },
  { anahtar: "kategoriler", etiket: "Kategoriler", href: "/admin/kategoriler" },
  { anahtar: "sikayetler", etiket: "Şikayetler", href: "/admin/sikayetler" },
  { anahtar: "degerlendirmeler", etiket: "Değerlendirmeler", href: "/admin/degerlendirmeler" },
  { anahtar: "anlasmazliklar", etiket: "Anlaşmazlıklar", href: "/admin/anlasmazliklar" },
  { anahtar: "denetim-kaydi", etiket: "Denetim Kaydı", href: "/admin/denetim-kaydi" },
];

export function AdminNav({ aktif }: { aktif: string }) {
  return (
    <nav className="mt-3 flex flex-wrap gap-2 border-b border-neutral-200 pb-3 text-sm font-medium">
      {OGELER.map((oge) => {
        if (!oge.href) {
          return (
            <span
              key={oge.anahtar}
              className="cursor-not-allowed rounded-md px-3 py-1.5 text-neutral-300"
              title="Yakında"
            >
              {oge.etiket}
            </span>
          );
        }
        const secili = oge.anahtar === aktif;
        return (
          <Link
            key={oge.anahtar}
            href={oge.href}
            className={`rounded-md px-3 py-1.5 ${
              secili ? "bg-primary-50 text-primary-700" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {oge.etiket}
          </Link>
        );
      })}
    </nav>
  );
}
