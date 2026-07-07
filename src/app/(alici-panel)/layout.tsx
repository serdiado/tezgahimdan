import { SiteHeader } from "@/components/SiteHeader";
import { AliciPanelMenu } from "./AliciPanelMenu";

// (alici-panel) bir ROUTE GROUP - URL'e yansimaz, sadece bu sayfalara ortak
// SiteHeader+sol menu iskeleti kazandirir. Auth kontrolu BILEREK burada
// YAPILMAZ - her page.tsx kendi redirect("/giris?next=/tam/yolu") kontrolunu
// korur (degismez): layout server component olarak hangi ALT rotanin aktif
// oldugunu (next= icin) guvenilir sekilde bilemez (Next.js layout'lari
// pathname'i prop olarak almaz), bu yuzden next= dogrulugunu bozmamak icin
// tekrar burada TEKRARLANMAZ, sayfa seviyesinde birakilir (projede zaten
// yerlesik "birden fazla katmanda yetki kontrolu" alaskanligiyla tutarli,
// bkz. magazaGuncelle server action yorumu).
export default function AliciPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6 md:flex md:items-start md:gap-8">
        <AliciPanelMenu />
        <div className="min-w-0 flex-1">{children}</div>
      </main>
    </div>
  );
}
