import { SiteHeader } from "@/components/SiteHeader";
import { RezervasyonumIcerik } from "./RezervasyonumIcerik";

export default function RezervasyonumSayfasi() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-6">
        <RezervasyonumIcerik />
      </main>
    </div>
  );
}
