import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getSaticiSession } from "@/lib/yetki";
import { varsayilanPazariGetirVeyaOlustur } from "@/lib/magaza";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function magazaOlustur(formData: FormData) {
  "use server";

  // Sayfa zaten kontrol etti ama bu bir Server Action - dogrudan cagrilabilir,
  // bu yuzden yetki kontrolunu burada da tekrarliyoruz.
  const { session, yetkili } = await getSaticiSession();
  if (!yetkili || !session) {
    redirect("/giris");
  }

  const ad = typeof formData.get("ad") === "string" ? (formData.get("ad") as string).trim() : "";
  const slug =
    typeof formData.get("slug") === "string"
      ? (formData.get("slug") as string).trim().toLowerCase()
      : "";

  if (!ad || !slug) {
    redirect(`/panel/urun-ekle?hata=${encodeURIComponent("ad ve slug zorunlu")}`);
  }
  if (!SLUG_REGEX.test(slug)) {
    redirect(
      `/panel/urun-ekle?hata=${encodeURIComponent("slug sadece kucuk harf, rakam ve tire icerebilir")}`,
    );
  }

  const pazar = await varsayilanPazariGetirVeyaOlustur();

  try {
    await prisma.magaza.create({
      data: {
        sahipId: session.user.id,
        ad,
        slug,
        pazarId: pazar.id,
      },
    });
  } catch (err) {
    // findUnique-sonra-create arasinda baska bir istek ayni slug'i veya (partial
    // unique index sayesinde) ayni saticiya ikinci bir aktif magazayi
    // olusturmus olabilir (TOCTOU). DB'nin kendisi engeller, biz sadece
    // kullaniciya anlasilir bir mesaj gosteririz.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const hedef = String(err.meta?.target ?? "");
      if (hedef.includes("slug")) {
        redirect(`/panel/urun-ekle?hata=${encodeURIComponent("bu slug zaten kullaniliyor")}`);
      }
      redirect(`/panel/urun-ekle?hata=${encodeURIComponent("zaten bir magazan var")}`);
    }
    throw err;
  }

  redirect("/panel/urun-ekle");
}

export function MagazaOlusturForm() {
  return (
    <form action={magazaOlustur}>
      <div>
        <label>
          Mağaza Adı
          <input name="ad" type="text" required />
        </label>
      </div>
      <div>
        <label>
          Slug (link için, örn: ayse-nin-tezgahi)
          <input name="slug" type="text" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        </label>
      </div>
      <button type="submit">Mağazayı Oluştur</button>
    </form>
  );
}
