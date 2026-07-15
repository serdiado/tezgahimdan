"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";

// Vitrin listelerinde "Daha Fazla Göster" (2026-07-15). Sunsuz kaydirma ya da
// sayfa numaralari YERINE bilincli tercih (bkz. docs/mimari/vitrin-sayfalama.md):
// hedef kitle teknolojiyle arasi iyi olmayan yerel aliciler - kontrol onlarda
// kalmali, footer erisilebilir olmali, "nerede kaldim" kaybolmamali.
//
// Neden <Link> (buton + fetch degil): URL parametresi yaklasimi geri tusunu,
// paylasilabilirligi ve JS'siz calismayi bedavaya veriyor; sunucu bileseni
// mevcut tum toplama mantigini (begeni/kuyruk/yorum haritalari) aynen yeniden
// kullaniyor, yeni API yazilmiyor.
//
// scroll={false} SART: yeni kartlar listenin ALTINA eklendigi icin kullanici
// yerinde kalmali, sayfa basa firlamamali.
//
// prefetch={false}: bu link her zaman DAHA BUYUK bir sorgu tetikler; gorunur
// olur olmaz onu on-yuklemek her ziyaretciye bosuna maliyet cikarir. Ayrica
// projede prefetch kaynakli oturum sorunu yasandi (bkz. hafiza:
// oturum-dongusu-prefetch-teshis).

function ButonIcerik({ etiket }: { etiket: string }) {
  // useLinkStatus SADECE bir <Link>'in child'inda calisir - navigasyon
  // beklerken "pending" doner. Bu olmadan kullanici tikladiktan sonra sessiz
  // bir bekleme yasar ve tekrar tiklar.
  const { pending } = useLinkStatus();
  return (
    <>
      {pending && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-600"
        />
      )}
      {pending ? "Yükleniyor…" : etiket}
    </>
  );
}

export function DahaFazlaButonu({
  href,
  etiket = "Daha Fazla Göster",
}: {
  href: string;
  etiket?: string;
}) {
  return (
    <div className="mt-6 flex justify-center">
      <Link
        href={href}
        scroll={false}
        prefetch={false}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-neutral-700 ring-1 ring-inset ring-neutral-200 transition-colors hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <ButonIcerik etiket={etiket} />
      </Link>
    </div>
  );
}
