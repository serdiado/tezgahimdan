import Link from "next/link";
import { Pencil, MapPin } from "lucide-react";
import { GUN_ETIKETI, saatMetnineCevir } from "./pazar-yardimcilari";

export type PazarAdminVeri = {
  id: string;
  ad: string;
  il: string;
  ilce: string;
  semt: string | null;
  googleHaritaLinki: string;
  baslangicGunu: string;
  baslangicSaati: string;
  sifirlamaGunu: string;
  sifirlamaSaati: string;
  saatDilimi: string;
  aktifMi: boolean;
  magazaSayisi: number;
};

export function PazarKartAdmin({ pazar }: { pazar: PazarAdminVeri }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-neutral-900">{pazar.ad}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                pazar.aktifMi ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-600"
              }`}
            >
              {pazar.aktifMi ? "Aktif" : "Pasif"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            {pazar.ilce}, {pazar.il}
            {pazar.semt ? ` (${pazar.semt})` : ""} · {pazar.magazaSayisi} mağaza ·{" "}
            {pazar.saatDilimi}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Başlangıç: {GUN_ETIKETI[pazar.baslangicGunu] ?? pazar.baslangicGunu}{" "}
            {saatMetnineCevir(pazar.baslangicSaati)} · Sıfırlama:{" "}
            {GUN_ETIKETI[pazar.sifirlamaGunu] ?? pazar.sifirlamaGunu} {saatMetnineCevir(pazar.sifirlamaSaati)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={pazar.googleHaritaLinki}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
            Haritada Aç
          </a>
          <Link
            href={`/admin/pazarlar/${pazar.id}/duzenle`}
            className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            Düzenle
          </Link>
        </div>
      </div>
    </div>
  );
}
