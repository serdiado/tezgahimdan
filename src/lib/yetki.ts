import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Ortak yardimci: oturumdaki kullanicinin GUNCEL rolunu DB'den okur. Rol JWT
// icinde tasiniyor (bkz. auth.ts) ama self-servis onboarding'de kullanici AYNI
// oturumda alici -> satici'ya terfi edebiliyor; JWT o an bayat kalir (yeniden
// giris yapana kadar eski rol). Bu yuzden yetki karari icin rolu her istekte
// DB'den okuyoruz - tek nokta, tum panel/admin/API cagrilari otomatik dogru
// olur, +1 hafif sorgu bu olcekte onemsiz. (Alternatif: JWT'yi mid-session
// yenilemek - trigger:"update" karmasasi; kacinildi.)
//
// getSaticiSession/getAdminSession ayni bu yardimciyi kullanir; SiteHeader de
// (satici/admin/alici navigasyon dallanmasi icin) dogrudan cagirir - boylece
// tek istekte tek DB sorgusu, kopya yok.
export async function oturumRolOku() {
  const session = await auth();
  if (!session?.user?.id) {
    return { session, rol: null as string | null };
  }
  const kullanici = await prisma.kullanici.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });
  return { session, rol: kullanici?.rol ?? null };
}

// Ortak "bu istek satici olarak giris yapmis mi" kontrolu. Sadece kontrolu paylasir;
// basarisiz durumda ne yapilacagina (redirect / 403 JSON / mesaj) cagiran karar verir,
// cunku sayfa, Server Action ve API route'ta bu farkli olmak zorunda. `session` null ise
// hic giris yapilmamis; `yetkili` false ise giris yapilmis ama rol satici degil.
export async function getSaticiSession() {
  const { session, rol } = await oturumRolOku();
  return { session, yetkili: rol === "satici" };
}

// Admin geciti - saticidan TAMAMEN AYRI (PLAN SS4: /panel satici, /admin ayri).
// Ayni DB-okuma gerekcesi gecerli. Admin rolu hicbir giris akisinda (kayit,
// Google, self-servis onboarding) otomatik ATANMAZ - sadece elle DB'den verilir
// (bkz. docs/mimari/satici-onboarding.md "acil durumda DB'den set edilebilir").
// Rol tekil deger oldugu icin satici === admin ayni anda true olamaz.
export async function getAdminSession() {
  const { session, rol } = await oturumRolOku();
  return { session, yetkili: rol === "admin" };
}
