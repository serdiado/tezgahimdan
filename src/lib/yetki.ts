import { auth } from "@/auth";

// Ortak "bu istek satici olarak giris yapmis mi" kontrolu. Sadece kontrolu paylasir;
// basarisiz durumda ne yapilacagina (redirect / 403 JSON / mesaj) cagiran karar verir,
// cunku sayfa, Server Action ve API route'ta bu farkli olmak zorunda. `session` null ise
// hic giris yapilmamis; `yetkili` false ise giris yapilmis ama rol satici degil.
export async function getSaticiSession() {
  const session = await auth();
  const yetkili = !!session?.user && session.user.rol === "satici";
  return { session, yetkili };
}
