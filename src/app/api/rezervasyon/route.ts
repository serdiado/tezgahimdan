import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { p2002Mi, prisma } from "@/lib/prisma";
import { rezervasyonOlustur } from "@/lib/rezervasyon";
import { telefonNormallestir } from "@/lib/telefon";
import { bildirimGonderKullaniciya, bildirimGonderTakipcilere } from "@/lib/bildirim";

// Gelmedi yasagi bitisini kullaniciya soylerken: "17 Temmuz 14:30" (yil yok -
// yasak en fazla 30 gun, yil bilgisi gurultu olur).
const yasakTarihFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export async function POST(request: Request) {
  // KP-1: rezervasyon icin giris zorunlu. Vitrin/kesif girissiz acik, yalniz bu
  // eylem kimlik ister. girissizse istemci login'e yonlendirir (girisGerekli).
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { hata: "rezervasyon için giriş yapmalısınız", girisGerekli: true },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const urunId = typeof body?.urunId === "string" ? body.urunId : "";
  if (!urunId) {
    return NextResponse.json({ hata: "urunId zorunlu" }, { status: 400 });
  }

  // Telefon: kullanicinin kayitli numarasi yoksa ilk rezervasyonda bir kerelik
  // istenir ve Kullanici.telefon'a yazilir; varsa hic sorulmaz/degistirilmez.
  const kullanici = await prisma.kullanici.findUnique({
    where: { id: session.user.id },
    select: { telefon: true },
  });
  if (!kullanici) {
    return NextResponse.json({ hata: "kullanıcı bulunamadı" }, { status: 401 });
  }
  if (!kullanici.telefon) {
    const telefonHam = typeof body?.telefon === "string" ? body.telefon.trim() : "";
    if (!telefonHam) {
      return NextResponse.json(
        { hata: "rezervasyon için telefon numarası gerekli", telefonGerekli: true },
        { status: 400 },
      );
    }
    const telefon = telefonNormallestir(telefonHam);
    if (!telefon) {
      return NextResponse.json(
        { hata: "geçersiz telefon (ör. 05XX XXX XX XX biçimini deneyin)", telefonGerekli: true },
        { status: 400 },
      );
    }
    try {
      await prisma.kullanici.update({ where: { id: session.user.id }, data: { telefon } });
    } catch (err) {
      // Kullanici.telefon @unique: numara baska bir hesaba kayitliysa DB reddeder.
      if (p2002Mi(err)) {
        return NextResponse.json(
          { hata: "bu telefon numarası başka bir hesaba kayıtlı", telefonGerekli: true },
          { status: 409 },
        );
      }
      throw err;
    }
  }

  const sonuc = await rezervasyonOlustur({ urunId, aliciId: session.user.id });

  switch (sonuc.tur) {
    case "olusturuldu":
      // Favori/takip bildirimi: SADECE aktif-tier (yedek hareketleri kullanici
      // karariyla bildirim kapsami disinda, bkz. plan dosyasi). Motor cagrisi
      // (kilit/transaction) coktan tamamlandi - bildirim onun DISINDA gonderilir.
      if (sonuc.tip === "aktif") {
        const urun = await prisma.urun.findUnique({
          where: { id: urunId },
          select: { baslik: true, magaza: { select: { id: true, sahipId: true } } },
        });
        if (urun) {
          await bildirimGonderTakipcilere({
            urunId,
            mesaj: `Takip ettiğiniz "${urun.baslik}" için yeni bir rezervasyon alındı.`,
            haricKullaniciIdler: [session.user.id],
          });
          // Satici bildirimi: kendine bildirim gitmesin diye eylemi yapan
          // kullanicinin magaza sahibi olup olmadigi kontrol edilir.
          if (session.user.id !== urun.magaza.sahipId) {
            await bildirimGonderKullaniciya({
              kullaniciId: urun.magaza.sahipId,
              mesaj: `"${urun.baslik}" için yeni bir rezervasyon aldın.`,
              hedefYolu: "/panel/rezervasyonlar",
            });
          }
        }
      }
      return NextResponse.json(
        { tip: sonuc.tip, siraNo: sonuc.siraNo, rezervKodu: sonuc.rezervKodu },
        { status: 201 },
      );
    case "zaten-var":
      return NextResponse.json(
        {
          hata: "bu ürün için zaten bekleyen rezervasyonunuz var",
          tip: sonuc.tip,
          siraNo: sonuc.siraNo,
          rezervKodu: sonuc.rezervKodu,
        },
        { status: 409 },
      );
    case "dolu":
      return NextResponse.json({ hata: "kapasite dolu" }, { status: 409 });
    case "magaza-gizli":
      return NextResponse.json(
        { hata: "Bu tezgah şu anda aktif değil, rezervasyon alınamıyor." },
        { status: 409 },
      );
    case "magaza-duraklatilmis":
      return NextResponse.json(
        { hata: "Bu tezgah şu an ara verdi, rezervasyon alınamıyor." },
        { status: 409 },
      );
    case "satista-degil":
      return NextResponse.json({ hata: "ürün satışta değil" }, { status: 409 });
    case "urun-yok":
      return NextResponse.json({ hata: "ürün bulunamadı" }, { status: 404 });
    case "gelmedi-yasagi":
      // Suresi belli, kendiliginden biten kisit - admin bani ("yasakli", 403)
      // ile ayni HTTP kodu: ikisi de "hesap su an bu eylemi yapamaz" sinifi.
      return NextResponse.json(
        {
          hata: `Üst üste teslim alınmayan rezervasyonların nedeniyle ${yasakTarihFormat.format(
            sonuc.bitis,
          )} tarihine kadar yeni rezervasyon yapamazsın.`,
        },
        { status: 403 },
      );
    case "yasakli":
      return NextResponse.json(
        { hata: "Hesabınız kısıtlandığı için yeni rezervasyon oluşturamazsınız." },
        { status: 403 },
      );
  }
}
