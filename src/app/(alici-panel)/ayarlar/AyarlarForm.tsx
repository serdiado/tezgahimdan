import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma, p2002Mi } from "@/lib/prisma";
import { telefonNormallestir } from "@/lib/telefon";

// MagazaAyarlariForm.tsx (src/app/panel/magaza-ayarlari/MagazaAyarlariForm.tsx)
// ile BIREBIR ayni desen: "use server", formData.get, hata/basari redirect
// query param. Telefon unique oldugu icin (Kullanici.telefon @unique)
// carpisma p2002Mi ile yakalanip dostca hataya cevrilir (magazaAc()'teki
// ayni yardimci fonksiyon).
async function ayarlariGuncelle(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }

  const ad = typeof formData.get("ad") === "string" ? (formData.get("ad") as string).trim() : "";
  const telefonRaw = formData.get("telefon");
  const telefonHam = typeof telefonRaw === "string" ? telefonRaw.trim() : "";

  if (!ad) {
    redirect(`/ayarlar?hata=${encodeURIComponent("ad zorunlu")}`);
  }

  let telefon: string | null = null;
  if (telefonHam) {
    telefon = telefonNormallestir(telefonHam);
    if (!telefon) {
      redirect(
        `/ayarlar?hata=${encodeURIComponent("gecersiz telefon numarasi (or. 05XX XXX XX XX bicimini deneyin)")}`,
      );
    }
  }

  try {
    await prisma.kullanici.update({
      where: { id: session.user.id },
      data: { ad, telefon },
    });
  } catch (err) {
    if (p2002Mi(err)) {
      redirect(`/ayarlar?hata=${encodeURIComponent("bu telefon numarası başka bir hesapta kayıtlı")}`);
    }
    throw err;
  }

  redirect("/ayarlar?basarili=1");
}

export function AyarlarForm({
  kullanici,
}: {
  kullanici: { ad: string; telefon: string | null; email: string | null };
}) {
  return (
    <form action={ayarlariGuncelle} className="mt-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Ad Soyad
          <input
            name="ad"
            type="text"
            required
            defaultValue={kullanici.ad}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Telefon (opsiyonel)
          <input
            name="telefon"
            type="text"
            placeholder="05XX XXX XX XX"
            defaultValue={kullanici.telefon ?? ""}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      {kullanici.email && (
        <div>
          <span className="block text-sm font-medium text-neutral-700">E-posta</span>
          <p className="mt-1 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-500">{kullanici.email}</p>
          <p className="mt-1 text-xs text-neutral-400">E-posta değiştirilemez.</p>
        </div>
      )}
      <button
        type="submit"
        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
      >
        Kaydet
      </button>
    </form>
  );
}
