"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BellRing } from "lucide-react";

// TakipButonu.tsx'in (kompakt=false, pill+ikon) birebir deseni - magaza
// sayfasinda MagazaSikayetButonu ile ayni satirda. Girissiz kullanici ayni
// sekilde /giris?next=... ile redirect-back'e ugrar (MagazaSikayetButonu ile
// ayni desen: pathname zaten magaza sayfasi, ek query param gerekmez).
export function MagazaTakipButonu({
  girisli,
  magazaId,
  benimTakibimVar,
}: {
  girisli: boolean;
  magazaId: string;
  benimTakibimVar: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [takipEdiliyor, setTakipEdiliyor] = useState(benimTakibimVar);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function tikla() {
    if (!girisli) {
      router.push(`/giris?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (gonderiliyor) return;
    const onceki = takipEdiliyor;
    setTakipEdiliyor(!onceki);
    setGonderiliyor(true);
    try {
      const res = await fetch("/api/magaza-takip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magazaId }),
      });
      if (!res.ok) throw new Error("basarisiz");
      const data = await res.json();
      setTakipEdiliyor(data.takipMi);
      router.refresh();
    } catch {
      setTakipEdiliyor(onceki);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <button
      type="button"
      onClick={tikla}
      disabled={gonderiliyor}
      className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
        takipEdiliyor
          ? "border-primary-200 bg-primary-50 text-primary-700"
          : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"
      }`}
    >
      {takipEdiliyor ? (
        <>
          <BellRing className="h-3.5 w-3.5" strokeWidth={2} />
          Mağaza Takip Ediliyor
        </>
      ) : (
        <>
          <Bell className="h-3.5 w-3.5" strokeWidth={2} />
          Mağazayı Takip Et
        </>
      )}
    </button>
  );
}
