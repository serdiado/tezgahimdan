import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { gercekDosyaTuruDogrula } from "@/lib/dosya";
import { IZINLI_TIPLER, MAX_BOYUT_BYTE, MAX_FOTOGRAF } from "@/lib/urun-sabitleri";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "urunler");

export type UrunEkleSonucu =
  | { tur: "eklendi"; urun: { id: string; fotograflar: string[] } }
  | { tur: "gecersiz-kategori" }
  | { tur: "gecersiz-baslik" }
  | { tur: "gecersiz-fiyat" }
  | { tur: "gecersiz-stok" }
  | { tur: "gecersiz-fotograf"; mesaj: string };

// src/app/api/panel/urun-ekle/route.ts'ten cikarildi - hem satici kendi
// magazasina hem admin bir saticinin adina urun eklerken (magazaId farkli
// kaynaklardan gelir: oturum vs admin secimi) AYNI dogrulama/yukleme/olusturma
// mantigini kullansin diye. magazaAc()'teki "userId'yi disaridan al" deseninin
// urun tarafindaki esdegeri.
export async function urunEkle(params: {
  magazaId: string;
  kategoriId: string;
  baslik: string;
  aciklama?: string | null;
  fiyat: string;
  stokAdedi: number;
  dosyalar: File[];
}): Promise<UrunEkleSonucu> {
  const baslik = params.baslik.trim();
  if (!baslik || baslik.length > 200) return { tur: "gecersiz-baslik" };

  const fiyatSayisal = Number.parseFloat(params.fiyat);
  if (!params.fiyat || !Number.isFinite(fiyatSayisal) || fiyatSayisal <= 0) {
    return { tur: "gecersiz-fiyat" };
  }

  if (!Number.isInteger(params.stokAdedi) || params.stokAdedi < 1) {
    return { tur: "gecersiz-stok" };
  }

  if (params.dosyalar.length < 1 || params.dosyalar.length > MAX_FOTOGRAF) {
    return { tur: "gecersiz-fotograf", mesaj: `en az 1, en fazla ${MAX_FOTOGRAF} fotograf yuklenmeli` };
  }

  // Once tum dosyalari bellekte oku (bir kez), hem MIME/boyut kontrolu hem de
  // gercek bayt imzasi (magic number) dogrulamasi icin - istemcinin gonderdigi
  // Content-Type'a guvenmiyoruz, aksi halde sahte bir uzantiyla rastgele icerik
  // public/uploads altina yazilip sunulabilirdi.
  const okunanDosyalar: { buffer: Buffer; uzanti: string }[] = [];
  for (const dosya of params.dosyalar) {
    if (!IZINLI_TIPLER[dosya.type]) {
      return { tur: "gecersiz-fotograf", mesaj: `desteklenmeyen dosya turu: ${dosya.type || "bilinmiyor"}` };
    }
    if (dosya.size > MAX_BOYUT_BYTE) {
      return { tur: "gecersiz-fotograf", mesaj: "her fotograf en fazla 5MB olabilir" };
    }
    const buffer = Buffer.from(await dosya.arrayBuffer());
    if (!gercekDosyaTuruDogrula(buffer, dosya.type)) {
      return { tur: "gecersiz-fotograf", mesaj: "dosya icerigi beyan edilen turle eslesmiyor" };
    }
    okunanDosyalar.push({ buffer, uzanti: IZINLI_TIPLER[dosya.type] });
  }

  // silindiMi kontrolu: kategori tam bu istekle ayni anda kaldirilmis olabilir
  // (TOCTOU) - kalan milisaniyelik pencere kabul edilebilir (bkz. docs/MIMARI.md
  // "Bilinen kisitlar"), ama en azindan formda hic gorunmeyen bir kategoriyle
  // dogrudan API cagrisi net bir sonucla reddedilir.
  const kategori = await prisma.kategori.findUnique({ where: { id: params.kategoriId } });
  if (!kategori || kategori.silindiMi) return { tur: "gecersiz-kategori" };

  await mkdir(UPLOAD_DIR, { recursive: true });

  const yazilanYollar: string[] = [];
  for (const { buffer, uzanti } of okunanDosyalar) {
    // Orijinal dosya adina asla guvenilmez (path traversal riski); rastgele ad ureteriz.
    const dosyaAdi = `${randomUUID()}.${uzanti}`;
    await writeFile(path.join(UPLOAD_DIR, dosyaAdi), buffer);
    yazilanYollar.push(dosyaAdi);
  }

  try {
    const urun = await prisma.urun.create({
      data: {
        magazaId: params.magazaId,
        kategoriId: params.kategoriId,
        baslik,
        aciklama: params.aciklama?.trim() || null,
        fiyat: params.fiyat,
        stokAdedi: params.stokAdedi,
        fotograflar: yazilanYollar.map((ad) => `/uploads/urunler/${ad}`),
        durum: "sergide",
      },
    });
    return { tur: "eklendi", urun: { id: urun.id, fotograflar: urun.fotograflar } };
  } catch (err) {
    // urun.create basarisiz olursa (or. kategori bu istek sirasinda silindiyse)
    // diske yazilmis ama hicbir kayda baglanmamis dosyalari yetim birakmayalim.
    await Promise.all(
      yazilanYollar.map((ad) => unlink(path.join(UPLOAD_DIR, ad)).catch(() => undefined)),
    );
    throw err;
  }
}

type SiraOge = { tur: "mevcut"; yol: string } | { tur: "yeni"; index: number };

export type UrunGuncelleSonucu =
  | {
      tur: "guncellendi";
      urun: { id: string; magazaId: string; baslik: string; fiyat: number; fotograflar: string[] };
      eskiFiyat: number;
    }
  | { tur: "bulunamadi" }
  | { tur: "gecersiz-kategori" }
  | { tur: "gecersiz-baslik" }
  | { tur: "gecersiz-fiyat" }
  | { tur: "gecersiz-stok" }
  | { tur: "gecersiz-fotograf"; mesaj: string }
  | { tur: "stok-yetersiz"; minStok: number };

// src/app/api/panel/urun-duzenle/route.ts'ten cikarildi - urunEkle() ile ayni
// gerekce: hem satici kendi urununu hem admin (moderasyon amacli) baska bir
// saticinin urununu duzenlerken AYNI kilit/stok-invariant/fotograf mantigini
// kullansin. Sahiplik kontrolu (satici: magazaId eslesmesi) BURADA degil,
// cagiran route'ta yapilir - bu fonksiyon "hangi urun" sorusunu degil "nasil
// guncellenir" sorusunu cozer.
export async function urunGuncelle(params: {
  id: string;
  kategoriId: string;
  baslik: string;
  aciklama?: string | null;
  fiyat: string;
  stokAdedi: number;
  siralamaRaw: string;
  yeniDosyalar: File[];
}): Promise<UrunGuncelleSonucu> {
  const mevcutUrun = await prisma.urun.findUnique({ where: { id: params.id } });
  if (!mevcutUrun) return { tur: "bulunamadi" };

  const baslik = params.baslik.trim();
  if (!baslik || baslik.length > 200) return { tur: "gecersiz-baslik" };

  const fiyatSayisal = Number.parseFloat(params.fiyat);
  if (!params.fiyat || !Number.isFinite(fiyatSayisal) || fiyatSayisal <= 0) {
    return { tur: "gecersiz-fiyat" };
  }

  if (!Number.isInteger(params.stokAdedi) || params.stokAdedi < 1) {
    return { tur: "gecersiz-stok" };
  }

  // Nihai foto sirasi istemciden "siralama" token dizisiyle gelir: her oge ya
  // {tur:"mevcut", yol} (var olan foto) ya {tur:"yeni", index} (bu istekte
  // yuklenen dosyanin sirasi). Guvenlik: "mevcut" yollar mevcutUrun.fotograflar
  // ile dogrulanir (uydurma yol enjekte edilemez), "yeni" index'ler
  // yeniDosyalar sinirinda tutulur.
  let siralama: SiraOge[] = [];
  try {
    const parsed = params.siralamaRaw ? JSON.parse(params.siralamaRaw) : [];
    if (Array.isArray(parsed)) {
      siralama = parsed.filter(
        (t): t is SiraOge =>
          !!t &&
          ((t.tur === "mevcut" && typeof t.yol === "string" && mevcutUrun.fotograflar.includes(t.yol)) ||
            (t.tur === "yeni" &&
              Number.isInteger(t.index) &&
              t.index >= 0 &&
              t.index < params.yeniDosyalar.length)),
      );
    }
  } catch {
    // gecersiz JSON -> bos say; asagidaki sayim kontrolu yakalar.
  }

  if (siralama.length < 1 || siralama.length > MAX_FOTOGRAF) {
    return { tur: "gecersiz-fotograf", mesaj: `en az 1, en fazla ${MAX_FOTOGRAF} fotograf olmali` };
  }

  // silindiMi kontrolu: admin bu kategoriyi tam bu istekle ayni anda kaldirmis
  // olabilir (TOCTOU) - kalan milisaniyelik pencere kabul edilebilir (bkz.
  // docs/MIMARI.md "Bilinen kisitlar").
  const kategori = await prisma.kategori.findUnique({ where: { id: params.kategoriId } });
  if (!kategori || kategori.silindiMi) return { tur: "gecersiz-kategori" };

  // Yeni dosyalari bellekte oku + dogrula (magic number), istemcinin
  // Content-Type beyanina guvenilmez.
  const okunanDosyalar: { buffer: Buffer; uzanti: string }[] = [];
  for (const dosya of params.yeniDosyalar) {
    if (!IZINLI_TIPLER[dosya.type]) {
      return { tur: "gecersiz-fotograf", mesaj: `desteklenmeyen dosya turu: ${dosya.type || "bilinmiyor"}` };
    }
    if (dosya.size > MAX_BOYUT_BYTE) {
      return { tur: "gecersiz-fotograf", mesaj: "her fotograf en fazla 5MB olabilir" };
    }
    const buffer = Buffer.from(await dosya.arrayBuffer());
    if (!gercekDosyaTuruDogrula(buffer, dosya.type)) {
      return { tur: "gecersiz-fotograf", mesaj: "dosya icerigi beyan edilen turle eslesmiyor" };
    }
    okunanDosyalar.push({ buffer, uzanti: IZINLI_TIPLER[dosya.type] });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const yazilanYollar: string[] = [];
  for (const { buffer, uzanti } of okunanDosyalar) {
    const dosyaAdi = `${randomUUID()}.${uzanti}`;
    await writeFile(path.join(UPLOAD_DIR, dosyaAdi), buffer);
    yazilanYollar.push(`/uploads/urunler/${dosyaAdi}`);
  }

  // Nihai dizi: siralama sirasinda "mevcut" yollar + "yeni" yazilan yollar
  // (index hizali; yazilanYollar, yeniDosyalar ile ayni sirada). Kapak = [0].
  const yeniFotograflar = siralama.map((t) => (t.tur === "mevcut" ? t.yol : yazilanYollar[t.index]));
  const kaldirilanFotograflar = mevcutUrun.fotograflar.filter((f) => !yeniFotograflar.includes(f));
  // Bu istekte yazilip nihai diziye girmeyen (siralamada gecmeyen) dosyalar yetim kalmasin.
  const kullanilmayanYeni = yazilanYollar.filter((y) => !yeniFotograflar.includes(y));

  try {
    // Ayni kilit stratejisi (urun satirinda FOR UPDATE) rezervasyon motoruyla
    // paylasilir: stok dogrulamasi + guncelleme ayni kilit altinda, es zamanli
    // bir rezervasyon olusturma/sonuclandirma ile yarisa girmez.
    const sonuc = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Urun" WHERE "id" = ${params.id} FOR UPDATE`;

        // INVARIANT (docs/mimari/rezervasyon-motoru.md): aktif <= stok - satildi.
        // Stok dusurulurken bu hep korunmali, yoksa mevcut aktif hak sahipleri
        // fazla-satis durumuna duser.
        const aktifSayisi = await tx.rezervasyon.count({
          where: { urunId: params.id, durum: "bekliyor", tip: "aktif" },
        });
        const satildiSayisi = await tx.rezervasyon.count({
          where: { urunId: params.id, durum: "satildi" },
        });
        const minStok = aktifSayisi + satildiSayisi;
        if (params.stokAdedi < minStok) {
          return { tur: "stok-yetersiz" as const, minStok };
        }

        const guncellenen = await tx.urun.update({
          where: { id: params.id },
          data: {
            kategoriId: params.kategoriId,
            baslik,
            aciklama: params.aciklama?.trim() || null,
            fiyat: params.fiyat,
            stokAdedi: params.stokAdedi,
            fotograflar: yeniFotograflar,
          },
        });
        return { tur: "guncellendi" as const, urun: guncellenen };
      },
      { maxWait: 5000, timeout: 15000 },
    );

    if (sonuc.tur === "stok-yetersiz") {
      // DB guncellenmedi; diske yazilmis yeni fotograflari yetim birakma.
      await Promise.all(
        yazilanYollar.map((yol) => unlink(path.join(process.cwd(), "public", yol)).catch(() => undefined)),
      );
      return { tur: "stok-yetersiz", minStok: sonuc.minStok };
    }

    // Basarili guncelleme sonrasi artik kullanilmayan eski fotolari + siralamada
    // yer almayan yeni yazilan dosyalari sil.
    await Promise.all(
      [...kaldirilanFotograflar, ...kullanilmayanYeni].map((yol) =>
        unlink(path.join(process.cwd(), "public", yol)).catch(() => undefined),
      ),
    );

    return {
      tur: "guncellendi",
      urun: {
        id: sonuc.urun.id,
        magazaId: sonuc.urun.magazaId,
        baslik: sonuc.urun.baslik,
        fiyat: Number(sonuc.urun.fiyat),
        fotograflar: sonuc.urun.fotograflar,
      },
      eskiFiyat: Number(mevcutUrun.fiyat),
    };
  } catch (err) {
    await Promise.all(
      yazilanYollar.map((yol) => unlink(path.join(process.cwd(), "public", yol)).catch(() => undefined)),
    );
    throw err;
  }
}

export type UrunGeriGetirSonucu = { tur: "geri-getirildi" } | { tur: "bulunamadi" };

// src/app/api/panel/urun-geri-getir/route.ts'ten cikarildi - urunGuncelle/
// urunKaldir ile AYNI gerekce. Kilit gerekmiyor (kapasite kontrolu yok, sadece
// bayrak geri aliniyor - urunKaldir zaten bekleyen rezervasyon varsa kaldirmayi
// engelledigi icin geri getirmede yeniden kontrol gerekmez).
export async function urunGeriGetir(params: { id: string }): Promise<UrunGeriGetirSonucu> {
  const urun = await prisma.urun.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!urun) return { tur: "bulunamadi" };

  await prisma.urun.update({ where: { id: params.id }, data: { silindiMi: false } });
  return { tur: "geri-getirildi" };
}

export type UrunKaldirSonucu = { tur: "kaldirildi" } | { tur: "bulunamadi" } | { tur: "bekleyen-var"; sayi: number };

// src/app/api/panel/urun-kaldir/route.ts'ten cikarildi - urunGuncelle() ile
// ayni gerekce (satici + admin AYNI kilit/kontrol mantigini kullansin).
// Sahiplik kontrolu cagiran route'ta kalir.
export async function urunKaldir(params: { id: string }): Promise<UrunKaldirSonucu> {
  const urun = await prisma.urun.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!urun) return { tur: "bulunamadi" };

  // Ayni kilit stratejisi (urun satirinda FOR UPDATE): kaldirma ile es zamanli
  // gelen bir rezervasyon/vazgec/sonuclandirma kuyrugu bu esnada degistiremesin.
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Urun" WHERE "id" = ${params.id} FOR UPDATE`;

      const bekleyenSayisi = await tx.rezervasyon.count({
        where: { urunId: params.id, durum: "bekliyor" },
      });
      if (bekleyenSayisi > 0) {
        return { tur: "bekleyen-var" as const, sayi: bekleyenSayisi };
      }

      await tx.urun.update({ where: { id: params.id }, data: { silindiMi: true } });
      return { tur: "kaldirildi" as const };
    },
    { maxWait: 5000, timeout: 15000 },
  );
}
