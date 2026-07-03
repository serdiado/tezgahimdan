import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Ortak "bu istek satici olarak giris yapmis mi" kontrolu. Sadece kontrolu paylasir;
// basarisiz durumda ne yapilacagina (redirect / 403 JSON / mesaj) cagiran karar verir,
// cunku sayfa, Server Action ve API route'ta bu farkli olmak zorunda. `session` null ise
// hic giris yapilmamis; `yetkili` false ise giris yapilmis ama rol satici degil.
//
// ONEMLI: rol JWT icinde tasiniyor (bkz. auth.ts). Self-servis onboarding'de kullanici
// AYNI oturumda alici -> satici'ya terfi ediyor; JWT o an bayat kalir (yeniden giris
// yapana kadar eski rol). Bu yuzden yetki karari icin rolu her istekte DB'den okuyoruz -
// tek nokta, tum panel/API cagrilari otomatik dogru olur, +1 hafif sorgu bu olcekte
// onemsiz. (Alternatif: JWT'yi mid-session yenilemek - trigger:"update" karmasasi; kacinildi.)
export async function getSaticiSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return { session, yetkili: false };
  }
  const kullanici = await prisma.kullanici.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });
  const yetkili = kullanici?.rol === "satici";
  return { session, yetkili };
}
