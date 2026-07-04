"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { SikayetModal } from "@/components/SikayetModal";

// Magaza sayfasindaki minimal "Sikayet Et" tetikleyici. Girissiz kullanici
// KP-1'deki rezerveTikla deseniyle ayni sekilde once /giris'e (redirect-back
// ile) yonlendirilir, modal hic acilmaz.
export function MagazaSikayetButonu({
  girisli,
  magazaId,
  magazaAd,
}: {
  girisli: boolean;
  magazaId: string;
  magazaAd: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [modalAcik, setModalAcik] = useState(false);

  function tikla() {
    if (!girisli) {
      router.push(`/giris?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setModalAcik(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={tikla}
        className="mt-2 flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-neutral-600"
      >
        <Flag className="h-3.5 w-3.5" strokeWidth={2} />
        Bu mağazayı şikayet et
      </button>
      {modalAcik && (
        <SikayetModal
          hedefTuru="magaza"
          hedefId={magazaId}
          hedefAdi={magazaAd}
          onClose={() => setModalAcik(false)}
        />
      )}
    </>
  );
}
