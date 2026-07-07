import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { kullaniciSikayetleriGetir } from "@/lib/sikayet";

const DURUM_STIL: Record<string, { etiket: string; className: string }> = {
  bekliyor: { etiket: "Bekliyor", className: "bg-amber-100 text-amber-700" },
  inceleniyor: { etiket: "İnceleniyor", className: "bg-blue-100 text-blue-700" },
  cozuldu: { etiket: "Çözüldü", className: "bg-green-100 text-green-700" },
  reddedildi: { etiket: "Reddedildi", className: "bg-neutral-200 text-neutral-600" },
};

const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });

// (alici-panel) desenindeki diger sayfalarla ayni: girisli kullanicinin kendi
// listesi, girissiz login'e (donusle). Salt-okunur - alici burada bir eylem
// yapamaz, sadece durumu ve varsa admin yanitini gorur.
export default async function SikayetlerimSayfasi() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris?next=/sikayetlerim");
  }

  const sikayetler = await kullaniciSikayetleriGetir(session.user.id);

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Şikayetlerim</h1>

      {sikayetler.length === 0 ? (
        <p className="mt-4 text-neutral-600">Henüz bir şikayet göndermediniz.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {sikayetler.map((s) => {
            const stil = DURUM_STIL[s.durum] ?? { etiket: s.durum, className: "bg-neutral-200 text-neutral-600" };
            return (
              <div key={s.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-400">{s.hedefTuruEtiketi}</span>
                  {s.hedefLink ? (
                    <Link href={s.hedefLink} className="font-semibold text-primary-600 hover:underline">
                      {s.hedefAdi}
                    </Link>
                  ) : (
                    <span className="font-semibold text-neutral-900">{s.hedefAdi}</span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stil.className}`}>
                    {stil.etiket}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">{tarihFormat.format(s.createdAt)}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{s.sebep}</p>
                {s.yanit && (
                  <p className="mt-2 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-800">
                    <span className="font-semibold">Yanıtımız: </span>
                    {s.yanit}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
